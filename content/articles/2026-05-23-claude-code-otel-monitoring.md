---
title: "Monitoring Claude Code with OpenTelemetry and Grafana"
subtitle: "Claude Code ships a built-in OTel exporter. Here is how to wire it to a self-hosted Prometheus and Loki stack."
description: "Wire Claude Code's built-in OTel exporter to Prometheus, Loki, and Grafana to track cost, token usage, and session events on a self-hosted Docker stack."
date: 2026-05-23
lastmod: 2026-05-23
categories: [ai, homelab]
tags: [claude-code, opentelemetry, grafana, prometheus, loki, docker, monitoring]
slug: "claude-code-otel-monitoring"
canonical_url: "https://buildtestrun.com/claude-code-otel-monitoring"
schema_type: TechArticle
---

Claude Code has built-in OpenTelemetry (OTel) export that most users never touch. It ships disabled by default, requires no extra plugins, and works on most plans, including Pro. Once wired up, you get cost tracking, token usage, session counts, and a full event stream of every tool call, edit, and API request flowing into Grafana.

This post covers setting it up on a self-hosted Grafana + Loki + Prometheus stack using docker-compose. If you run multiple machines, the same collector handles them all; each machine just sends to the same endpoint with a different `host.name` label.

![Claude Code OTel monitoring dashboard in Grafana showing cost, token usage, and session metrics](/assets/img/posts/2026-05-23-claude-code-otel-monitoring/claude-code-otel-dashboard.png)

## Prerequisites

This post assumes you already have:

- A running Grafana + Loki + Prometheus stack (Docker, on the same Docker network as the collector)
- Claude Code installed and authenticated with a Claude account (Pro, Max, Teams)
- Docker Compose

The examples use `ai-agent-net` as the shared Docker network name. Substitute your own.

## Architecture

Claude Code runs as a host process, not inside Docker. It pushes telemetry over OTLP (gRPC) to a collector container, which fans out to two backends:

```
Claude Code (host process)
  │  OTLP gRPC → localhost:4317
  ▼
OTel Collector (Docker, ai-agent-net)
  ├── prometheus exporter :8889 ← Prometheus scrapes
  └── OTLP HTTP → Loki :3100    (native OTLP ingest, Loki 3.x+)
```

Prometheus handles the time-series metrics. Loki captures the event stream: tool calls, permission changes, auth events, API requests, as structured logs.

> The host running Claude Code and the container stack in this post is the same box. You may need to expose ports and consider network security in your own environment if these are different machines.

## Step 1: OTel Collector Config

Create `config/otelcol/config.yml` inside your monitoring stack directory:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1000

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    resource_to_telemetry_conversion:
      enabled: true  # promotes host.name, service.name to Prometheus labels
  otlp_http/loki:
    endpoint: http://loki:3100/otlp  # Loki 3.x native OTLP; collector appends /v1/logs
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp_http/loki]
```

> **Loki version note:** Native OTLP log ingestion requires Loki 3.0+. If you're on 2.x, you'll need to add the `loki` exporter via Grafana Alloy as a sidecar instead. Check with `docker exec <loki-container> loki --version`.

> **otelcol-contrib version note:** The `loki` exporter was removed from `otel/opentelemetry-collector-contrib` in recent versions (confirmed missing in 0.152.1). Use the `otlp_http/loki` pattern above; it goes directly to Loki's built-in OTLP endpoint and needs no exporter plugin.

## Step 2: Add the Collector to Docker Compose

Add this service to your monitoring `docker-compose.yml`. The ports bind to `127.0.0.1` only; Claude Code runs on the same host, so there's no reason to expose these to the network:

```yaml
  otelcol:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: monitoring-otelcol
    hostname: monitoring-otelcol
    restart: unless-stopped
    userns_mode: "host"
    security_opt:
      - no-new-privileges:true
    command: ["--config=/etc/otelcol/config.yml"]
    volumes:
      - ./config/otelcol/config.yml:/etc/otelcol/config.yml:ro
    ports:
      - "127.0.0.1:4317:4317"   # OTLP gRPC
      - "127.0.0.1:4318:4318"   # OTLP HTTP
    networks:
      - ai
```

> **`userns_mode: "host"` note:** If your Docker daemon runs with `userns-remap` (remapped user namespaces), add `userns_mode: "host"` as shown. If your daemon doesn't use userns-remap, omit it.

Start the container:

```bash
docker compose up -d otelcol
```

Verify it started cleanly; look for `Everything is ready. Begin running and processing data.` with no error lines:

```bash
docker logs monitoring-otelcol --tail 10
```

## Step 3: Add a Prometheus Scrape Job

Add to `config/prometheus.yml` under `scrape_configs`:

```yaml
  - job_name: claude-code
    static_configs:
      - targets: ['monitoring-otelcol:8889']
    relabel_configs:
      - target_label: instance
        replacement: node1
```

Reload Prometheus without a full restart:

```bash
docker exec monitoring-prometheus kill -HUP 1
```

> **Reload gotcha:** The `kill -HUP` reload can silently succeed (exit 0) while the new scrape job is never picked up. Verify immediately with Grafana Explore, Prometheus, `up{job="claude-code"}`. If the target is missing, do a full restart:
>
> ```bash
> cd /opt/monitoring && docker compose restart prometheus
> ```
>
> The restart takes a few seconds and causes a short scrape gap, but is the reliable path.

## Step 4: Configure Claude Code

Two separate things need configuring: the Claude Code telemetry toggle, and the standard OTel SDK environment variables. They go in different places.

**Enable Claude Code telemetry** in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1"
  }
}
```

`CLAUDE_CODE_ENABLE_TELEMETRY` is special-cased by Claude Code; it reads it from `settings.json` directly and applies it at startup. The other `OTEL_*` variables are **not** special-cased. If you add them to `settings.json`'s `env` block, they get passed to hook subprocesses but not to the Claude Code process itself, so the OTel SDK never sees them. The result: telemetry is enabled but nothing is exported anywhere.

**Configure the OTel exporter** in `~/.zshenv` (create it if it doesn't exist):

```bash
# OpenTelemetry export for Claude Code
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_RESOURCE_ATTRIBUTES="host.name=node1,service.name=claude-code"
```

`~/.zshenv` is sourced for all zsh sessions, interactive and non-interactive, so these are present when Claude Code launches.

Set `host.name` to whatever identifies this machine. The `OTEL_RESOURCE_ATTRIBUTES` value must not contain spaces (OTel spec restriction).

These settings take effect in the **next** Claude Code session; the current one won't pick them up.

## Step 5: Grafana Dashboard

The OTel Collector exposes metrics at `:8889/metrics`. Once Prometheus scrapes it and Claude Code runs a session, you'll see metrics prefixed `claude_code_`. Key ones:

### Community dashboard

There is a community dashboard on Grafana.com: [Claude Code (ID 25052)](https://grafana.com/grafana/dashboards/25052-claude-code/). It covers the same metrics with a polished layout, including cost trends, token breakdowns by type and model, session activity, and tool usage. Worth reviewing as a reference.

**It will not import as-is if your stack uses Prometheus and Loki.** The dashboard was built against Azure Monitor (Application Insights / Log Analytics). Every panel query uses Azure Log Analytics syntax (Kusto), and the datasource is `grafana-azure-monitor-datasource`. To adapt it for a Prometheus + Loki stack:

1. Remove the `__inputs` and `__requires` blocks at the top of the JSON before importing (Grafana 11 rejects dashboards that leave these in after import).
2. Replace the datasource on every panel: swap `grafana-azure-monitor-datasource` for your Prometheus datasource UID, and use your Loki datasource UID for log panels.
3. Rewrite all queries. Azure Log Analytics queries look like:
   ```kusto
   customMetrics
   | where name == "claude_code.cost.usage"
   | project timestamp, cost = value
   ```
   The Prometheus equivalents use PromQL:
   ```promql
   sum(increase(claude_code_cost_usage_USD_total{job="claude-code"}[$__range]))
   ```
   Note the metric name conversion: OTel dot notation (`claude_code.cost.usage`) becomes underscore notation with a `_total` suffix in Prometheus (`claude_code_cost_usage_USD_total`).
4. Event log panels in the Azure version query the `traces` table in Log Analytics. In Loki, use:
   ```logql
   {service_name="claude-code"}
   ```

If you want to avoid building from scratch, adapt the community dashboard JSON using the query mapping approach above rather than rewriting panel by panel.

| Metric | Description |
|---|---|
| `claude_code_cost_usage_total` | Accumulated USD spend |
| `claude_code_session_count_total` | Sessions started |
| `claude_code_token_usage_total` | Tokens (labeled by `type`: input, output, cache_read, cache_creation) |
| `claude_code_lines_of_code_count_total` | Lines added/removed |
| `claude_code_api_request_duration_milliseconds` | LLM round-trip latency (histogram) |
| `claude_code_active_time_total` | Active time in seconds |

> **Metric name note:** OTel metric names use dots; the Prometheus exporter converts them to underscores. Counters (monotonic sums) get a `_total` suffix. If a metric doesn't appear as expected, run a `{job="claude-code"}` query in Prometheus Explore on the first scrape to see the exact names the collector emits, then adjust your dashboard PromQL.

Useful PromQL starters:

```promql
# Cost this week
sum(increase(claude_code_cost_usage_total[$__range]))

# Cost rate by machine (multi-machine setup)
sum by (host_name) (rate(claude_code_cost_usage_total[$__rate_interval]))

# Token breakdown by type
sum by (type) (rate(claude_code_token_usage_total[$__rate_interval]))

# API latency p99
histogram_quantile(0.99, sum by (le) (rate(claude_code_api_request_duration_milliseconds_bucket[$__rate_interval])))
```

For the event log (Loki), Claude Code emits structured events as OTLP logs. Loki 3.x maps the `service.name` resource attribute to the `service_name` stream label automatically. Basic query:

```logql
{service_name="claude-code"}
```

Filter to specific event types (tool calls, permission changes, API requests):

```logql
{service_name="claude-code"} | json | event_name=`tool_result`
```

## Plugin Metrics (Caveman, Context-Mode, jCodeMunch, etc.)

Plugin hooks that emit custom metrics don't appear as Prometheus time-series; they arrive as OTLP **log events** in Loki. Each firing produces a `hook_plugin_metrics` event with attributes:

```
event.name:  hook_plugin_metrics
plugin_id:   context-mode@context-mode   (or caveman@caveman, etc.)
hook_event:  PostToolUse
<key>:       <number or bool>            (up to 20 custom metric keys)
```

Query in Loki Explore to discover what a plugin actually emits:

```logql
{service_name="claude-code"} | json | event_name=`hook_plugin_metrics`
```

Once you know the key names, extract them as metrics in Grafana using `unwrap`:

```logql
sum_over_time(
  {service_name="claude-code"}
  | json
  | event_name=`hook_plugin_metrics`
  | plugin_id=`context-mode@context-mode`
  | unwrap tokens_saved [$__rate_interval]
)
```

The key names (`tokens_saved`, etc.) are plugin-defined; check the first session's Loki events to see what each of your plugins reports before building panels.

## Multi-Machine Setup

For a second machine (e.g., `otherhost01`), the only change is in `~/.claude/settings.json` on that machine:

```json
"OTEL_RESOURCE_ATTRIBUTES": "host.name=otherhost01,service.name=claude-code",
"OTEL_EXPORTER_OTLP_ENDPOINT": "http://<otlp-endpoint-ip>:4317"
```

The collector needs its gRPC port reachable from the other machine. Change the port binding in `docker-compose.yml` from `127.0.0.1:4317:4317` to `0.0.0.0:4317:4317` (or your LAN IP), and restrict access at the firewall to trusted hosts only.

Grafana panels using `sum by (host_name)` will then split the data per machine automatically.

## What You Don't Get (Without Teams)

OTel telemetry works on all plan tiers. The `organization.id` attribute in telemetry is only populated on Teams/Enterprise plans. For a personal or small-team Pro setup, per-user data is still available via `user.email` (included when logged in via OAuth) and per-machine via `host.name`.

SSO via Entra ID (or any SAML/OIDC provider) requires a Teams or Enterprise plan. Pro uses standard claude.ai OAuth.

## References

- [Claude Code: Monitoring usage](https://code.claude.com/docs/en/monitoring-usage): Anthropic's reference for the `CLAUDE_CODE_ENABLE_TELEMETRY` flag, supported OTel SDK variables, and what data is emitted
- [Monitor apps using OpenTelemetry and Application Insights with Azure Managed Grafana](https://learn.microsoft.com/en-us/azure/managed-grafana/grafana-opentelemetry-app-insights): Microsoft's article covering OTel + Grafana + Application Insights; the Azure Monitor approach that inspired the community dashboard (ID 25052)
- [Grafana community dashboard: Claude Code (ID 25052)](https://grafana.com/grafana/dashboards/25052-claude-code/): community dashboard for Claude Code metrics; built for Azure Monitor, see Step 5 for Prometheus adaptation notes
- [OpenTelemetry Collector Contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib): the `otel/opentelemetry-collector-contrib` image used in this setup
- [claude-monitor by drshliapa](https://github.com/drshliapa/claude-monitor): community project using the same OTel pipeline approach; includes a self-contained stack and Grafana dashboard for Claude Code metrics
