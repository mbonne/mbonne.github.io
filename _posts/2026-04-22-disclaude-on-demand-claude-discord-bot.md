---
layout: post
title: "From Always-On to On-Demand: Running Claude Code as a Discord Bot Without Burning Your Rate Limits"
description: "How I replaced an always-on Claude Code Discord session with a lightweight gateway that spawns Claude only when a message arrives, eliminating idle rate-limit burn."
date: 2026-04-22
last_modified_at: 2026-04-22
categories: [homelab, ai]
tags: [claude, discord, python, mcp, automation, homelab, project]
slug: "disclaude-on-demand-claude-discord-bot"
canonical_url: "https://buildtestrun.com/disclaude-on-demand-claude-discord-bot"
schema_type: TechArticle
---

Claude Code's Discord plugin is one of those things that works exactly as advertised and then bites you in a way you didn't expect. You set it up, you can message your homelab assistant from your phone, everything is great. Then you leave for a quiet weekend, come back on Monday, and your weekly rate limit is sitting at 86%.

The session was alive the whole time. Claude was thinking. Nothing was happening.

This is the story of fixing that, and the three things that silently broke along the way.

## The problem: idle sessions cost budget

Claude Code's `plugin:discord` turns the editor into a Discord bot. You run `claude --channels plugin:discord@claude-plugins-official` inside a tmux session managed by systemd, and it stays alive indefinitely. Messages from Discord arrive as injected prompts; Claude replies using the `reply` MCP tool.

The issue is that an active Claude Code session is not free to keep alive. Cache refreshes happen every five minutes. There are background prefetches, context keepalives, and session management that add up whether or not anyone is talking to the bot. After two quiet days, I had burned through most of my weekly budget on a session that processed zero useful messages.

The fix is obvious in hindsight: Claude should only run when there is something to do.

## The obvious fix and why it breaks

"Just kill the session when it's been idle for a while" runs into an immediate problem: the Discord bot only exists inside the Claude session. The `plugin:discord` MCP server is a process that Claude spawns. When Claude is not running, the MCP server is not running, and nobody is listening to Discord.

You can't receive the message that would tell you to wake up if you've already gone to sleep.

The solution is to split the problem into two processes with different lifetimes.

## The two-process architecture

```
Discord ──► gateway.py (always-on, ~32MB) ──► tmux disclaude session (on-demand)
                                                   └─ claude --mcp-config mcp_config.json
                                                              └─ discord_mcp.py (REST tools)
```

**Gateway** (`gateway.py`): a lightweight discord.py bot that runs permanently as a systemd service. It does one job: watch for Discord messages, check an allowlist, and manage the Claude session. When a message arrives and no Claude session is running, it spawns one. After ten minutes of silence, it kills it. The gateway itself costs essentially nothing — no API calls, no LLM, just a Discord WebSocket connection.

**Discord MCP server** (`discord_mcp.py`): a minimal MCP stdio server that gives Claude its outbound tools: `reply`, `react`, `edit_message`, `fetch_messages`, `download_attachment`. These all go via Discord's REST API. No WebSocket connection, no persistent process — it starts when Claude needs it and stops when Claude stops.

Claude is launched with `--mcp-config` pointing at the MCP server configuration, and `--strict-mcp-config` to ensure nothing else loads.

## The dual-WebSocket trap

My first instinct was to keep `plugin:discord` loaded alongside the gateway and just have the gateway handle the lifecycle. This doesn't work.

A Discord bot token can only maintain one active WebSocket gateway connection at a time. If the gateway bot is connected and Claude starts up with `plugin:discord`, the plugin opens a second connection with the same token. Discord immediately closes the first one. The gateway drops offline.

The fix is to stop loading `plugin:discord` entirely in the Claude session. The gateway is the Discord bot. Claude only needs outbound tools, which the REST-only MCP server provides without opening any WebSocket connection. The `--strict-mcp-config` flag prevents Claude from loading the globally-enabled `plugin:discord` plugin, which would otherwise connect automatically.

## Three things that silently broke

### 1. `tmux send-keys` doesn't submit on a single call

The gateway injects messages into Claude by formatting them as `<channel source="discord" ...>` tags and sending them via tmux:

```bash
tmux send-keys -t disclaude "<channel ...>message</channel>" Enter
```

This looks correct and it almost works. The text appears in Claude's input buffer. The Enter key is sent. But Claude doesn't process it. The session just sits there with the message sitting in the prompt, waiting.

The fix is to send them separately:

```python
subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, channel_tag])
subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, "Enter"])
```

Combining the text and the Enter key into one `send-keys` call doesn't give Claude's readline enough time between the input and the submission signal. Two calls, half a context switch apart, works reliably.

### 2. discord.py 2.x renamed `username`

In discord.py 1.x, `message.author.username` gives you the sender's username. In discord.py 2.x, it's `message.author.name`. The attribute `username` simply does not exist.

The error message — `AttributeError: 'User' object has no attribute 'username'` — is clear enough once you see it, but it's buried in an async exception handler and only shows up in the systemd journal. The first message the bot received after launch disappeared silently.

### 3. The MCP `call_tool` handler signature

The Python `mcp` library's `@server.call_tool()` decorator does not pass a request object to your handler. It calls your function with two positional arguments: the tool name and the arguments dict.

```python
# Wrong — one positional arg
@server.call_tool()
async def call_tool(request: CallToolRequest) -> CallToolResult:
    args = request.params.arguments

# Correct — two positional args
@server.call_tool()
async def call_tool(tool_name: str, arguments: dict) -> list[TextContent]:
    ...
```

The error from getting this wrong is `call_tool() takes 1 positional argument but 2 were given`, which surfaces as a tool error in Claude's session. Claude will try the tool, see it fail, and report back to Discord that it couldn't reply. The MCP server itself keeps running — the failure is per-call, not fatal.

## Result

Idle rate-limit burn is gone. The gateway sits at around 32MB of memory and makes no API calls while Discord is quiet. When a message arrives, Claude spins up in roughly twelve seconds — acceptable for an async Discord conversation.

The bot behaviour from the Discord side is identical to before. Messages come in, Claude processes them, replies appear. The only observable difference is a cold-start delay on the first message after a period of silence.

The weekly rate limit has room again.

## Code

The implementation is on GitHub: **[isithuman-2026/disclaude](https://github.com/isithuman-2026/disclaude)**

The repository includes `gateway.py`, `discord_mcp.py`, `setup.sh` (generates `mcp_config.json` for your install), and setup notes. The bot token and allowlist live in `~/.claude/channels/discord/` and are not committed.

To adapt this for your own setup you will need a Discord bot token with message content intent enabled, Claude Code installed, and Python 3.12+ with a virtualenv for the `discord.py` and `aiohttp` dependencies.
