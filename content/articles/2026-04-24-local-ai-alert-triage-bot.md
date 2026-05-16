---

title: "Local AI Alert Triage: Stop Reading Your Own Monitoring Noise"
description: "A self-hosted Discord bot that watches your alerts channel, triages every automated alert with a local LLM, and tells you severity, likely cause, and next step — without sending your infrastructure data to a cloud API."
date: 2026-04-24
lastmod: 2026-04-24
categories: [homelab, ai]
tags: [python, discord, llm, monitoring, self-hosted, automation, homelab, privacy, project]
slug: "local-ai-alert-triage-bot"
canonical_url: "https://buildtestrun.com/local-ai-alert-triage-bot"
schema_type: TechArticle
---

Every homelab monitoring setup eventually produces the same problem: a chat channel full of alerts that someone has to read, assess, and decide whether to act on. At 2am. For an alert that turns out to be disk usage that went to 94% and came back down on its own.

The usual fix is to tune thresholds until alerts only fire when they matter. That helps, but you're still doing the triage manually — reading the alert, matching it against your knowledge of the system, deciding if it's urgent.

This is exactly the kind of pattern matching a local LLM is well-suited for.

## What I built

A lightweight Discord bot that watches a designated alerts channel. When any monitoring tool posts there — Watchtower, a custom script, whatever — the bot immediately analyses the message and replies with three things:

1. **Severity** — critical / high / medium / low
2. **Likely cause** — one sentence
3. **Recommended next step** — one sentence

No essays. No hedging. Just the triage a competent sysadmin would give you at a glance.

You can also @mention the bot to ask follow-up questions about a specific alert.

The whole thing is under 300 lines of Python. Source: [github.com/isithuman-2026/localai-bot](https://github.com/isithuman-2026/localai-bot)

## Why local matters here

The obvious question is why not just use the OpenAI API or Groq. They're fast, capable, and cheap.

The problem is what's in your alerts. Hostnames. Internal IPs. Container names. Stack traces. Sometimes environment variables that got logged. Infrastructure error messages are a snapshot of your system's internal state, and sending that to a third-party API is a data leak you may not have thought about.

A 14B parameter model running on a local GPU handles alert triage well enough. The task is structured pattern matching on short text — you don't need GPT-4 for that. Qwen 2.5 14B, proxied through a local LiteLLM instance, gives consistent, useful triage responses and never phones home.

## Architecture

```
Monitoring tool (script, Watchtower, etc.)
        │
        ▼
  Discord alerts channel
        │  new bot/webhook message
        ▼
   localai-bot (discord.py)
        │
        ▼
  LiteLLM proxy → local LLM (Qwen 2.5 14B)
        │
        ▼
  Triage reply in alerts channel
```

Three components:

- **`llm.py`** — async HTTP client to any OpenAI-compatible endpoint. Swap the URL for Ollama, vLLM, llama.cpp, or a hosted provider if you want.
- **`cogs/chat.py`** — handles @mention in any channel, maintains per-channel conversation history
- **`cogs/alerts.py`** — watches the alerts channel, auto-triages bot/webhook messages, responds to @mentions there

The bot is written for Discord but the triage logic is platform-agnostic. The `on_message` listeners are the only Discord-specific code — porting to Slack or Microsoft Teams is a matter of swapping those out.

## Setup

Full instructions in the repo, but the short version:

```bash
git clone https://github.com/isithuman-2026/localai-bot
cd localai-bot
cp .env.example .env
# fill in DISCORD_BOT_TOKEN, ALERTS_CHANNEL_ID, LITELLM_URL
docker compose up -d
```

You need:
- A Discord bot with **Message Content Intent** enabled
- A LiteLLM-compatible endpoint (local or hosted)
- Docker

The container joins whatever Docker network your LiteLLM instance is on. If you're running everything locally, point `LITELLM_URL` at `http://your-litellm-container:4000/v1/chat/completions`.

## What a triage looks like

Alert from `homelab-scripts`:
```
ERROR: disk usage on /dev/sda1 at 94% (threshold: 90%). Host: server01.
```

Bot reply:
```
Severity: high
Likely cause: log accumulation or large file growth on /dev/sda1
Next step: run df -h and du -sh /* | sort -rh | head -20 to identify the source
```

That's the output. You glance at it, decide if you need to act now or can deal with it in the morning. The LLM does the first-pass read so you don't have to.

## One gotcha worth knowing

The first version of AlertsCog fetched the last 5 messages from the channel before triaging each alert, thinking that conversation context would help. It didn't — it caused the bot to triage its own triage responses when they appeared in the history, and the LLM got confused by the mix of human messages and prior bot output.

The fix was to make triage stateless: each alert is assessed in isolation with only the alert text and the triage prompt. No history. Each alert stands alone. Simpler and more reliable.

The @mention path (for follow-up questions) also drops conversation history for the same reason — the alerts channel isn't a general chat, and maintaining state there creates more problems than it solves.

## Where this goes next

A few ideas I haven't implemented yet:

**Ticketing integration.** After triage, automatically open a ticket in Jira, Linear, or a shared inbox. The ticket gets the alert text, severity, cause, and next step. The chat reply is the fast human-readable version; the ticket is the audit trail.

**Email and webhook relay.** Route alerts through a shared mailbox or webhook endpoint so monitoring tools that can't post to Discord natively can still trigger triage. SendGrid or AWS SES for inbound email processing, forward the payload to the bot, triage as normal.

**Auto-resolution detection.** When a follow-up alert arrives suggesting the issue resolved — "disk usage back to 61%", "service restarted successfully" — match it against open tickets by service name and host, post a resolution note, close the ticket. Full incident lifecycle without human involvement for self-healing systems.

**Alert deduplication.** Suppress repeated alerts for the same issue within a window. Group related alerts from the same host into a thread rather than flooding the channel.

All of this is achievable with the same local LLM — no cloud dependency required at any point in the pipeline.

## The broader point

A homelab monitoring setup that pages you for everything is almost as useless as one that pages you for nothing. The missing piece is a first-pass triage layer that reads alerts so you don't have to, flags the ones that matter, and suggests what to look at.

That layer used to require either a human or a complex rules engine. A local LLM is a better fit: it understands natural language error messages, can reason about likely causes without hardcoded rules, and runs entirely on hardware you already own.

The code is at [github.com/isithuman-2026/localai-bot](https://github.com/isithuman-2026/localai-bot). MIT licensed.
