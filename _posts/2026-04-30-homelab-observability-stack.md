---
layout: post
title: "Homelab Observability: One Stack to Watch Everything"
subtitle: ""
description: "A Prometheus, Grafana, and Loki stack covering containers, GPU, UniFi network, Tailscale, NAS health, AdGuard DNS, Claude API cost, and security events."
date: 2026-04-30
last_modified_at: 2026-04-30
categories: [homelab, monitoring]
tags: [prometheus, grafana, loki, monitoring, self-hosted, homelab, observability]
slug: "homelab-observability-stack"
canonical_url: "https://buildtestrun.com/homelab-observability-stack"
schema_type: TechArticle
---

Running a self-hosted stack across a single server, a NAS, and a UniFi network produces a lot of signals and no shortage of one-off tools that each show you one slice. I wanted a single pane of glass: container health, GPU utilisation under LLM inference load, network traffic, DNS, Tailscale mesh health, Claude API spend, and security events all in one place.

This is the observability layer that makes that possible. If you want to know how automated alert triage sits on top of it, that is covered in [Local AI Alert Triage: Stop Reading Your Own Monitoring Noise](https://buildtestrun.com/local-ai-alert-triage-bot).

## What I wanted to observe

- Container health and resource usage across the full Docker Compose stack
- Host and GPU metrics: Vulkan workload running Qwen 2.5-14B locally
- UniFi network: access points, switches, gateway, clients, and DPI
- Tailscale mesh health and exit node status
- Synology NAS health: disks, temperature, fan, power
- AdGuard DNS query volume and block rates (via SNMP)
- Claude API usage and estimated cost over time
- Security events: fail2ban bans, SSH brute force volume, Synology auth failures, UDR IDS threat blocks, Authelia failures

## The stack

| Container | Role |
|---|---|
| Prometheus | Metrics collection and TSDB storage (30-day retention) |
| Grafana | Visualisation, dashboard provisioning, and alerting |
| Loki | Log aggregation (structured and syslog ingestion via Vector) |
| node-exporter | Host metrics: CPU, memory, disk, network, GPU via DRM collector |
| cAdvisor | Per-container resource metrics from the Docker daemon |
| Glances | Real-time system overview (web UI, auth-gated) |
| SNMP exporter | Polls UniFi devices and AdGuard via SNMP |
| UnPoller | Pulls UniFi controller metrics into Prometheus |

All containers are on a shared Docker network (`ai-agent-net`) alongside the rest of the homelab stack.

## Dashboards

**UniFi network:** five dashboards (access points, switches, gateway, sites, clients) from the [UnPoller project](https://unpoller.com/). Drop-in provisioning with no customisation needed.

**Infrastructure:** Docker Environment, Synology Health, and Tailscale Network started as community Grafana templates and were adapted to fit the stack.

**Custom, built with Claude Code:**

- *node1 GPU:* Vulkan GPU utilisation, VRAM usage, and temperature. Useful when running inference continuously to spot thermal throttling.
- *Claude Usage:* API call volume, token counts, and rolling cost estimates. Helps keep tabs on spend without logging into the Anthropic console.
- *Security Logs:* fail2ban bans, SSH brute force volume, Synology auth failures, UDR IDS events, and Authelia failures in one view. This is what the alerting rules fire against.

Panel descriptions across all dashboards were written by Claude Code: each panel has a description field explaining what the metric measures, what normal looks like, and what to check if something looks off. It is static documentation, not a runtime AI dependency.

{% include post-image.html src="/assets/img/posts/observability-stack-security-logs.png" alt="Security Logs dashboard showing fail2ban ban activity, SSH brute force volume, and Synology auth failures" caption="Security Logs dashboard" %}

{% include post-image.html src="/assets/img/posts/observability-stack-gpu.png" alt="node1 GPU dashboard showing Vulkan GPU utilisation, VRAM usage, and temperature" caption="node1 GPU dashboard" %}

{% include post-image.html src="/assets/img/posts/observability-stack-claude-usage.png" alt="Claude Usage dashboard showing API call volume, token counts, and estimated cost" caption="Claude Usage dashboard" %}

{% include post-image.html src="/assets/img/posts/observability-stack-tailscale.png" alt="Tailscale Network dashboard showing mesh health and node status" caption="Tailscale Network dashboard" %}

## Alerting

Grafana alert rules watch for fail2ban ban spikes, SSH brute force volume, disk above 85%, container down events, and memory above 90%. Each rule posts to a Discord channel via webhook.

From there, a local LLM bot picks up every alert, pulls the relevant Loki logs, and replies with severity, likely cause, and next step before any human reads it. That setup is covered in [Local AI Alert Triage: Stop Reading Your Own Monitoring Noise](https://buildtestrun.com/local-ai-alert-triage-bot).