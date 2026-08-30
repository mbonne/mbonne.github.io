---
title: "Fix the CARTO Basemap Watermark in Self-Hosted Grafana"
subtitle: "A free API key, a container-friendly storage pattern, and the config field that doesn't work"
description: "Get a free CARTO Basemaps API key and wire it into a containerised Grafana stack to remove the geomap panel watermark, including the gotchas."
date: 2026-08-29
lastmod: 2026-08-29
categories: [monitoring, homelab]
tags: [grafana, geomap, carto, docker-compose, self-hosted]
slug: "fix-carto-basemap-watermark-grafana"
canonical_url: "https://buildtestrun.com/fix-carto-basemap-watermark-grafana"
schema_type: HowTo
---

Grafana's Geomap panel started showing a diagonal "API key required" watermark over its default basemap, because CARTO now requires a free API key for its raster tile service. If you run Grafana in Docker with dashboards under provisioning, the fix is a five-minute signup plus two small config changes, but one of Grafana's own basemap options silently does not work. This covers getting the key, storing it safely in a containerised stack, and the gotcha that will burn an hour if you don't know about it.

## Why this started happening

CARTO's basemap tiles (the light "Voyager" and dark "Dark Matter" styles that ship as Grafana's default Geomap background) moved to a metered, key-gated tier. Unauthenticated raster tile requests now render with a watermark instead of a hard block, so existing dashboards degrade visually rather than break outright. CARTO's own [basemap terms](https://carto.com/legal/basemap-terms) and [attribution requirements](https://carto.com/attributions) apply to the free tier.

## Get the free key

1. Go to [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey) and sign up with a team or shared mailbox address, not a personal one. This is infrastructure credential, not a personal account.
2. Verify the email CARTO sends.
3. A follow-up email titled "Your CARTO Basemaps API key" arrives with the key and two integration notes: the raster tile service (the one showing the watermark) needs the key today, vector basemaps don't yet but will.

The free tier covers 5,000,000 tile requests a calendar month across both services. For a homelab dashboard refreshed every few minutes, that ceiling isn't a practical concern.

![CARTO signup page requesting an email address for the free basemaps API key](/assets/img/posts/2026-08-29-fix-carto-basemap-watermark-grafana/carto-signup.png)

## Storing the key in a containerised Grafana stack

Treat it like any other stack credential: `.env` file, never committed, never typed into a dashboard JSON file that lives in a git repo.

```bash
# .env (not committed)
CARTO_BASEMAPS_API_KEY=your_key_here
```

Grafana supports environment-variable overrides for `grafana.ini` sections using the pattern `GF_<SECTION>_<KEY>`. The Geomap panel exposes a server-wide default basemap under `[geomap] default_baselayer_config`, documented on the [Geomap panel reference](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/geomap/#configure-the-default-base-layer-with-provisioning). Setting this once fixes every dashboard that hasn't explicitly overridden its basemap, current and future.

```yaml
# docker-compose.yml
services:
  grafana:
    image: grafana/grafana:12
    env_file:
      - .env
    environment:
      - "GF_GEOMAP_DEFAULT_BASELAYER_CONFIG={\"type\":\"xyz\",\"name\":\"Basemap\",\"config\":{\"attribution\":\"© CARTO © OpenStreetMap contributors\",\"url\":\"https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_BASEMAPS_API_KEY}\"}}"
      - GF_GEOMAP_ENABLE_CUSTOM_BASELAYERS=true
```

`docker compose` interpolates `${CARTO_BASEMAPS_API_KEY}` from `.env` at compose-parse time, so the literal key never appears in a version-controlled file. Run `docker compose config` to confirm the substitution resolved before recreating the container.

> **Pro tip:** don't lean on `.env` alone for anything you'd call a credential rather than a config value. A `.env` file sits in the project directory, one misconfigured `.gitignore`, one `git add -A`, one copy into a support ticket, and it is now in a commit history or a paste. Keep actual secrets (API keys, tokens, passwords) in a separate directory outside the repo tree entirely, permissioned `700`/`600`, and have `.env` or `docker-compose.yml` reference them from there instead of holding the value itself. It costs one extra `cat` or `$(< path)` at deploy time and removes an entire class of "oops, that was in the diff" incidents. A secrets manager (Vault, SOPS, Docker secrets) is the step up from that if you need rotation or multi-host distribution, but a plain, non-repo `.secrets/` directory is most of the benefit for a single-host homelab stack.

For a dashboard that was provisioned with an explicit basemap already baked into its JSON (rather than relying on the server default), the same key goes into that panel's `options.basemap` block:

```json
"basemap": {
  "type": "xyz",
  "name": "Basemap",
  "config": {
    "attribution": "© CARTO © OpenStreetMap contributors",
    "url": "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=your_key_here"
  }
}
```

Recreate the container so the env var and mounted provisioning files are re-read:

```bash
docker compose up -d grafana
```

![Grafana Geomap panel showing the dark basemap style with no watermark](/assets/img/posts/2026-08-29-fix-carto-basemap-watermark-grafana/geomap-fixed.png)

## The gotcha: Grafana's built-in `carto` type doesn't take a key

The obvious first move is to set the basemap type to `carto` (the built-in option matching CARTO's tiles) and add an `apiKey` field to its config, because that's the field name CARTO's onboarding email implies you'd use. It doesn't work.

Grafana's `carto` basemap type only exposes three settings: theme (`auto`/`light`/`dark`), `showLabels`, and opacity, per the [official basemap layer reference](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/geomap/#carto-basemap-layer). There is no key field in that schema. Add one anyway and Grafana accepts the JSON without complaint, saves it, and silently ignores the unknown property. The watermark stays, with no error in the UI or the logs to explain why.

The fix that actually works, also confirmed independently on the [Grafana community forum](https://community.grafana.com/t/geomap-carto-map-api-key-required-watermark/164268), is to stop using the `carto` type entirely and use the `xyz` (generic tile layer) type instead, with the key appended directly to the tile URL as a query parameter, exactly as CARTO's own setup instructions describe. `xyz` is a plain URL template plus an attribution string, so there's no schema mismatch to hit.

## Other things worth knowing

- **Tile caching hides success and failure.** Both your browser and CARTO's CDN cache tiles. After changing the key or URL, force-refresh the dashboard before concluding the fix didn't take.
- **Attribution is a licence condition, not decoration.** CARTO's free tier requires keeping CARTO and OpenStreetMap attribution visible, because CARTO's basemap tiles are rendered from OpenStreetMap data underneath. Seeing an OpenStreetMap credit on a CARTO-tiled map is expected, not a sign the provider silently changed.
- **Style names are part of the URL, not a config toggle.** Switching between light and dark basemap looks is done by changing the path segment in the tile URL (`voyager` for light, `dark_all` for dark), listed in [CARTO's basemap-styles repo](https://github.com/cartodb/basemap-styles), not by any panel setting once you're on the `xyz` type.
- **The key is tied to one project.** CARTO's terms ask that you not share or reuse the key across unrelated projects. If several unrelated dashboards need CARTO tiles, register separate keys.
- **Raster is being phased out.** CARTO's documentation flags vector basemaps as the long-term path, sharper at any zoom and restyleable client-side. Vector doesn't require a key yet, but the same key already covers it once that requirement lands.

## Summary

| Item | Detail |
|---|---|
| Root cause | CARTO now requires an API key for raster basemap tiles; unauthenticated requests get a watermark, not a hard failure |
| Free tier limit | 5,000,000 tile requests/month across raster and vector |
| Where the key lives | `.env`, referenced via `${CARTO_BASEMAPS_API_KEY}` in `docker-compose.yml`, never committed |
| Server-wide fix | `GF_GEOMAP_DEFAULT_BASELAYER_CONFIG` env var, covers every panel without an explicit basemap override |
| Per-panel fix | `options.basemap` in the dashboard's provisioned JSON, for panels with an existing explicit basemap |
| Broken approach | `"type": "carto"` with an `apiKey` config field: accepted, saved, silently ignored |
| Working approach | `"type": "xyz"` with the key embedded in the tile URL query string |
