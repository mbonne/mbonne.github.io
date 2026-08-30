---
title: "Docker Security Beyond the Checklist: Homelab Practices"
subtitle: "The daemon-scoping, image, and secret patterns that hold up in production"
description: "Docker security beyond generic advice: daemon scoping, socket-proxy, non-root hardening, hardened images, secret hygiene, and forking critical dependencies"
date: 2026-08-30
lastmod: 2026-08-30
categories: [homelab, security]
tags: [docker, docker-compose, hardening, self-hosted]
slug: "docker-security-homelab-hardening"
canonical_url: "https://buildtestrun.com/docker-security-homelab-hardening"
schema_type: TechArticle
---

"Keep your images updated" and "use trusted sources" are the advice everyone repeats and nobody operationalises. This is what actually runs across every stack in my homelab: how the daemon itself is scoped down, what a hardened service definition looks like line by line, and the one supply-chain decision worth making before you self-host something you actually depend on.

## Scope the daemon before you scope the container

The single highest-leverage decision is never mounting `/var/run/docker.sock` into an application container. A raw socket mount is root-equivalent access to the host, full stop, regardless of what capabilities or user namespace the container itself runs under. Traefik, a monitoring exporter, anything that claims it "just needs the socket to discover containers" is asking for the ability to create a privileged container that mounts `/` and walks away with the box.

The fix is a socket-proxy: one dedicated container that mounts the real socket and exposes a deliberately restricted, read-only subset of the Docker API over the network. Nothing else in the stack touches the socket directly.

```yaml
# /opt/infra/docker-compose.yml
services:
  socket-proxy:
    image: dhi.io/tecnativa/docker-socket-proxy:latest
    container_name: socket-proxy
    hostname: socket-proxy
    restart: unless-stopped
    userns_mode: "host"
    security_opt:
      - no-new-privileges:true
    environment:
      CONTAINERS: 1
      NETWORKS: 1
      SERVICES: 1
      TASKS: 1
      POST: 0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - ai

networks:
  ai:
    external: true
    name: ai-agent-net
```

`POST: 0` is the load-bearing line: no writes to the daemon, only the read endpoints a service actually needs to discover containers. Everything else in the stack points at it over the network instead of a volume mount:

```yaml
# traefik's provider config, no socket volume at all
providers:
  docker:
    endpoint: "tcp://socket-proxy:2375"
    exposedByDefault: false
```

This is also why `userns_mode: "host"` shows up on socket-proxy specifically and nowhere else if you can help it. Docker's `userns-remap` maps container UIDs to an unprivileged range on the host, which breaks direct socket access unless the container opts back out with `userns_mode: "host"`. Confining that opt-out to one purpose-built container, rather than every service that thinks it needs the socket, is the actual security boundary.

## Every other service: least privilege, not root by default

Once the daemon itself is scoped, the same three controls go on every application container, not just the sensitive ones:

```yaml
services:
  my-app:
    image: dhi.io/some-vendor/some-app:1.4.2
    container_name: my-app
    hostname: my-app
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE   # only if the app binds a port below 1024
    user: "65532:65532"    # drop to non-root if the image supports it
    env_file:
      - .env
    volumes:
      - ./config/my-app:/etc/my-app:ro
      - ./data/my-app:/data
    networks:
      - ai
```

`no-new-privileges:true` stops a process inside the container from gaining privileges it did not start with, closing off setuid-binary escalation even if something inside the container is compromised. `cap_drop: ALL` followed by adding back only the specific capability the app needs (`NET_BIND_SERVICE` for binding a low port, nothing for most web apps) means a container breakout has a much smaller Linux capability set to work with. `user: "65532:65532"` runs the process as an actual unprivileged UID rather than the container default of root, so a code execution bug in the app doesn't hand the attacker root inside the container as a starting point.

None of these are exotic. They just need to be on every service definition, not retrofitted onto the ones that get audited after something goes wrong.

## No direct port exposure, ever

```yaml
# WRONG: binds to the host, bypasses the reverse proxy entirely
ports:
  - "8080:8080"

# CORRECT: no ports: key, reachable only via Traefik on ai-agent-net
```

Every service sits behind Traefik as the sole ingress point, fronted by Authelia's forward-auth middleware unless the app has its own real authentication (Grafana with OIDC, for example). A service with no `ports:` mapping cannot be reached by anything on the LAN that isn't already on `ai-agent-net` and routed through the reverse proxy, which means the reverse proxy's auth and TLS termination are not optional extras, they are the only door in.

"It's not HTTP, so it has to be a raw port" is the excuse that lets a database, an MQTT broker, or an SSH bastion end up with a `ports:` mapping anyway. Traefik routes TCP and UDP too, not just HTTP, so most of that exposure still doesn't need to land on the application container itself. Only Traefik's own container gets a `ports:` entry, one per protocol it fronts, and the app stays internal on `ai-agent-net` regardless of what protocol it speaks:

```yaml
# traefik.yml: one dedicated entrypoint for the non-HTTP protocol
entryPoints:
  websecure:
    address: ":443"
  postgres:
    address: ":5432"
```

```yaml
# config/traefik/dynamic/postgres.yml
tcp:
  routers:
    postgres-app:
      rule: "HostSNI(`*`)"
      entrypoints:
        - postgres
      service: postgres-app
      tls:
        passthrough: true
  services:
    postgres-app:
      loadBalancer:
        servers:
          - address: "postgres-app:5432"
```

The database container itself carries no `ports:` key at all, exactly like every HTTP service, it is only reachable via Traefik's `postgres` entrypoint. For anything that genuinely needs to stay open to specific source networks rather than the whole internet, an `IPAllowList` middleware on the same router restricts by source IP the same way Authelia restricts by identity, so "not HTTP" stops being a reason to skip access control entirely:

```yaml
tcp:
  routers:
    postgres-app:
      rule: "HostSNI(`*`)"
      entrypoints:
        - postgres
      service: postgres-app
      middlewares:
        - "postgres-allowlist"
      tls:
        passthrough: true
  middlewares:
    postgres-allowlist:
      ipAllowList:
        sourceRange:
          - "10.0.0.0/8"
```

Authelia itself doesn't extend to this router. Forward-auth works by intercepting an HTTP request and redirecting it to a login page before it reaches the backend, which only makes sense for HTTP traffic; a raw Postgres wire-protocol connection has no request to intercept or redirect. IP allowlisting is the actual applicable control for a TCP passthrough router, not a downgrade from Authelia, a different tool for a protocol Authelia was never built to sit in front of. Where the same service also exposes an HTTP admin UI (a database's web console, a broker's management API), that HTTP router gets the normal `chain-authelia@file` treatment like everything else, the TCP data-plane router and the HTTP admin-plane router are two separate routers with two different access controls, not one router trying to do both jobs.

The number of things left that genuinely cannot go through Traefik at all, a raw UDP game server protocol with no SNI-equivalent, something that needs a real host-network binding, is smaller than it looks once TCP and UDP routers are actually considered instead of reached past by default.

## Don't forget to secure the thing doing the securing

Traefik's own dashboard is the gap people miss, because it is the tool protecting everything else, not one of the things it protects. The dashboard and API run on Traefik's `--api` flag, and the well-known footgun is `--api.insecure=true`: it puts the dashboard on port 8080 with no authentication at all, and it shows up on Shodan scans regularly, fully browsable, listing every router, service, and backend address in the stack. That is reconnaissance handed to an attacker for free, before they have found a single actual vulnerability.

My own Traefik service doesn't pass an `--api.insecure` or `--api.dashboard` flag at all, which means the API and dashboard are disabled by default. That's a deliberate choice: unless something specifically needs the dashboard, the safest posture is off.

If you do want it, enable the API explicitly and route the dashboard through Traefik itself like any other protected service, rather than exposing it unauthenticated:

```yaml
# traefik.yml
api:
  dashboard: true
  insecure: false
```

```yaml
# config/traefik/dynamic/dashboard.yml
http:
  routers:
    traefik-dashboard:
      rule: "Host(`traefik.example.com`)"
      entrypoints:
        - websecure
      tls: true
      service: "api@internal"
      middlewares:
        - "chain-authelia@file"
```

`service: api@internal` points the router at Traefik's own built-in API service rather than a container, and the same Authelia middleware chain protecting every other subdomain in the stack now sits in front of the one dashboard that can see all of them. No port 8080 binding, no `ports:` entry, no dashboard reachable by anything that hasn't already cleared the same auth gate as everything else.

## Prefer hardened base images over vanilla upstream

Where available, pull from a hardened image registry (Docker Hardened Images, `dhi.io`, is the one I use) rather than the vendor's default Docker Hub image. A hardened image build strips unnecessary packages, runs distroless or minimal-base where possible, and gets security patches on a maintained cadence independent of the upstream project's own release schedule, which matters for a project that only patches CVEs when someone opens an issue about it. When the image you need isn't available hardened, fall back to the official upstream image and note that explicitly in the stack's own documentation, so migrating to a hardened build later is a known, tracked gap rather than something someone has to rediscover.

## Secrets: two tiers, not one

A `.env` file and a secrets manager solve different problems, and conflating them is how a password ends up readable in `docker inspect` with no audit trail.

* **`.env` (stack-local, never committed):** non-sensitive config: ports, hostnames, feature flags, log levels.
* **`~/.secrets/<file>` (600 permissions):** the actual credentials: passwords, API tokens, keys. This is the source of truth.

The practical catch: `env_file:` in Compose does not do shell expansion, so `MY_PASS=$(<~/.secrets/my_pass)` inside a `.env` file is passed to the container literally, as that string, not the file's contents. The credential still has to land in `.env` as a literal value for the container to see it, which means it is visible via `docker inspect` on that host regardless. Accepting that, and mitigating it with socket-proxy's restricted API (no unrestricted inspect access from anything but the daemon itself) and least-privilege service accounts, is more honest than pretending a `.env` file is a secrets vault when Compose's own `env_file:` mechanism doesn't support one.

```bash
# .env (not committed)
MY_APP_API_KEY=the-actual-key-value

# ~/.secrets/my_app_api_key (600 perms) holds the same value as source of truth
```

New integrations get a scoped, read-only account wherever the upstream service supports one, not the admin credential, so a leaked key from `docker inspect` is a contained problem rather than a full takeover.

## Docker Compose's own `secrets:` closes the `docker inspect` gap

The `.env` approach above still leaves a credential sitting in the container's environment, visible to anything with `docker inspect` access. Compose's native `secrets:` key avoids that entirely, and it works in plain Compose, no Swarm mode required, contrary to the assumption that file-based secrets are a Swarm-only feature:

```yaml
secrets:
  my_app_api_key:
    file: ./secrets/my_app_api_key.txt

services:
  my-app:
    image: dhi.io/some-vendor/some-app:1.4.2
    secrets:
      - my_app_api_key
```

Instead of an environment variable, the value is mounted as a file at `/run/secrets/my_app_api_key` inside the container, readable only by the process that opens it, and absent from the `Env` array `docker inspect` prints. The catch is that the application itself has to actually read the secret from a file rather than expecting an env var. Many official images (Postgres, MySQL, and others that grew up around Docker's own Swarm secrets support) honour a `_FILE`-suffixed variant of their usual env var (`POSTGRES_PASSWORD_FILE=/run/secrets/my_app_api_key` instead of `POSTGRES_PASSWORD=...`) specifically for this. An app with neither option needs a small entrypoint wrapper that reads the file and exports it as an env var inside the container's own process, at which point it is still invisible from outside the container via `docker inspect`, just not from within it.

This is worth the extra setup for the credentials that would actually hurt if leaked, an API token with wide account access, a database admin password, rather than every single value across every stack. The `.env` and `~/.secrets/` pattern above is the reasonable default; native `secrets:` is the upgrade for the handful of credentials where `docker inspect` visibility is a real risk, not a theoretical one.

Likely out of scope for a homelab not operating on actual customer data. But you be the judge of that.

## Healthchecks are a dependency-ordering control, not just a status light

`depends_on` alone only waits for a container to *start*, not for the service inside it to actually be ready to accept connections. Without a healthcheck, a dependent service can come up, fail its first few connection attempts against a database that's still initialising, and either crash-loop or silently misbehave depending on how badly it handles that.

```yaml
services:
  database:
    # ...
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "5432"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s

  app:
    # ...
    depends_on:
      database:
        condition: service_healthy
```

`condition: service_healthy` makes `depends_on` actually mean what it sounds like it means. This is a reliability control more than a security one directly, but a service that starts serving requests against a backend that isn't ready is exactly the kind of undefined-behaviour window that turns into a security bug, not just a flaky restart.

## Fork the open-source projects you actually depend on

The one supply-chain decision worth making deliberately: if you are self-hosting an open-source project that something else in your setup actually depends on, not a throwaway tool you could swap out in an afternoon, maintain your own fork of it rather than pulling the upstream repo directly.

A private fork gives you three things upstream doesn't guarantee: you control exactly when you take a new upstream release, after reviewing the diff, instead of an automated update pulling in a change that breaks your config or introduces a regression; you can carry your own patches (a security fix upstream hasn't merged yet, a feature you need that isn't accepted upstream) without losing them on the next `git pull`; and you are insulated from the project changing license terms, going commercial, or being abandoned entirely, since you already have the full history and can keep running and patching your own copy regardless of what upstream does next.

This is proportionate to how critical the thing is. A private fork of a project handling actual financial data, for example, is worth maintaining properly: pull upstream into a tracked branch, review the diff before merging, keep your own patches rebased on top. A disposable dashboard tool nobody would notice going down for an afternoon doesn't need this. The decision point is whether losing upstream, suddenly or gradually, would actually hurt.

## Summary

| Practice | Why it matters |
|---|---|
| No direct `docker.sock` mounts | A raw socket mount is root-equivalent host access regardless of container hardening |
| socket-proxy with `POST: 0` | Restricts daemon access to a read-only subset instead of full API |
| `no-new-privileges`, `cap_drop: ALL`, non-root `user` | Shrinks what a compromised container can actually do |
| No `ports:` mappings, reverse proxy as sole ingress | Auth and TLS termination stop being optional |
| TCP/UDP routers for non-HTTP protocols, not raw `ports:` | "It's not HTTP" stops being an excuse to skip the reverse proxy |
| Traefik dashboard off by default, or behind the same auth chain | `--api.insecure=true` hands an attacker a full map of the stack, unauthenticated |
| Hardened image registry where available | Patch cadence independent of upstream's own release discipline |
| `.env` + `~/.secrets/` two-tier model | Separates non-sensitive config from actual credentials, source of truth stays in one place |
| Native Compose `secrets:` for high-value credentials | File-mounted, absent from `docker inspect`'s Env array, no Swarm required |
| Healthchecks with `condition: service_healthy` | Dependency ordering that reflects actual readiness, not just container start |
| Fork critical open-source dependencies | Control upgrade timing, keep your own patches, survive upstream abandonment |
