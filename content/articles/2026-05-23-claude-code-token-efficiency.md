---
title: "Claude Code Token Efficiency: Trim Context, Cut the Bill"
subtitle: "Your AI pair programmer runs on tokens. Here is how to stop burning them on noise."
description: "How to monitor and cut Claude Code token spend with per-project CLAUDE.md files, token-optimised proxies, sub-agent isolation, and rate limit hygiene."
date: 2026-05-23
lastmod: 2026-05-23
categories: [ai, tooling]
tags: [claude-code, tokens, context-window, ai, productivity, tooling]
slug: "claude-code-token-efficiency"
canonical_url: "https://buildtestrun.com/claude-code-token-efficiency"
schema_type: TechArticle
---

If you have spent any time with Claude Code, you have noticed that sessions have limits. Not limits on what the model can do (mostly), but limits on how much it can process before it hits the ceiling of your usage window. Hit it mid-task and you are waiting. Hit it repeatedly and you start thinking more carefully about where those tokens are going.

This post covers the mechanics of context windows, what actually burns through your allowance, and the practical measures that keep spend under control: per-project scoping, token-optimised tooling, and sub-agent workflows.

## What Is a Context Window

Every message you send to Claude Code does not go in isolation. The model receives the entire conversation history on every turn, from your first message to the most recent tool result. That accumulated history is the context window.

Context is measured in tokens. Roughly one token equals four characters of English text. A code block, a git diff, a stack trace: each costs tokens. The model processes all of it on every single turn.

The practical consequence: a session that started clean at turn one becomes progressively more expensive as the conversation grows. A 50-turn debugging session with verbose tool output can burn through far more of your allowance than the actual work warrants. This is not a bug in how you are using the tool. It is the default behaviour, and it compounds.

## The Token Economy: Cost of Living for Your Agents

Think of your token allowance as a household budget. You have a fixed amount per rolling window and a weekly cap. Tokens are your currency, and your agent spends them across three categories.

**Rent** is unavoidable: the system prompt, your CLAUDE.md files, memory injections, all load at session start before you type a single word. A global CLAUDE.md with 2,000 tokens of boilerplate costs the same on a one-line fix as on a full refactor.

**Groceries** scale with the work: each new message, each tool call result, each turn of back-and-forth.

**Impulse purchases** are where most of the waste lives: verbose git output, full file reads when you needed one function, unfiltered command results landing directly in the conversation and re-sending on every subsequent turn.

The rent is unavoidable. The groceries are proportional. The impulse purchases are where you get your money back.

## Understanding Your Usage Window

Claude Code operates within rolling usage windows. The specifics vary by plan: paid plans typically have a rolling hourly or multi-hour limit plus a weekly cap, and the exact ceiling is visible in your [Claude settings dashboard](https://claude.ai/settings). The `/stats` command shows your current position: how much of the window you have consumed and when the next reset fires.

Run `/stats` before starting heavy sessions. The session stops when the ceiling hits, not the task. An agent mid-refactor at the limit loses its thread. A quick check before you start is cheaper than discovering the limit at an inconvenient moment.

The output shows context usage (tokens consumed in the current conversation) and rate limit position (where you are against the rolling window). Both matter. Context usage affects cost per turn; rate limit position determines whether the session can continue.

### Plan limits at a glance

There is no separate daily cap. Usage is governed by the 5-hour rolling window plus a weekly Claude Code cap. Anthropic does not publish exact token counts per window; the table below uses published multipliers relative to Pro as the baseline.

> These figures are a point-in-time snapshot. Anthropic adjusts limits without notice. Verify current values at the [Claude pricing page](https://www.anthropic.com/pricing) and [plan documentation](https://support.anthropic.com/en/articles/11049762-choosing-a-claude-ai-plan) before making plan decisions.

| Plan | Price | Usage vs Pro | 5-hr rolling window | Weekly Claude Code cap | Context window |
| --- | --- | --- | --- | --- | --- |
| Free | Free | Below baseline | Limited | Yes | 200k |
| Pro | $20/mo | 1x baseline | Rolling | Yes | 200k |
| Max 5x | $100/mo | 5x Pro | Rolling | Yes | 200k |
| Max 20x | $200/mo | 20x Pro | Rolling | Yes | 200k |
| Team Standard | $30/seat/mo | 1.25x Pro | Rolling | Yes (all models) | 200k |
| Team Premium | Contact sales | 6.25x Pro | Rolling | Yes (all models; separate Sonnet cap) | 200k |
| Enterprise (seat-based) | Custom | Per seat type | Rolling | Varies by seat | 200k |
| Enterprise (usage-based) | Custom (API rates) | No per-seat cap | None | None | 200k |

Context window figures reflect Sonnet 4.6. Opus 4.7 supports a 1M token context window on plans that include it.

How urgently you need to manage context depends on plan headroom. On Pro, a bloated conversation compounds fast against a tight 5-hour window. On Max 20x or usage-based Enterprise the urgency is lower, but the principle holds: response quality degrades as context fills regardless of limit. See [/compact and /clear](#compact-and-clear).

## What Actually Burns Tokens

In rough order of impact:

**Verbose tool output entering the conversation directly.** Every `git status`, every file read, every command result that lands unfiltered in the conversation history gets re-sent to the model on every subsequent turn. A single `git log` returning 50 commits with full formatting costs hundreds of tokens, then costs them again on every follow-up.

**Full file reads when sliced reads would do.** Reading an entire 500-line config file to find one setting costs all 500 lines, re-sent on every turn thereafter. Purpose-built tools that slice to a line range cost a fraction.

**Long-running single-thread sessions.** The longer a conversation runs, the more each new turn costs. A session that was cheap at turn 5 is expensive at turn 40, even if the messages are short.

**Unscoped global context.** A monolithic global CLAUDE.md covering everything from Docker networking to SSH key management loads into every session, including sessions that never touch those subjects.

## Monitoring Your Spend

### /stats

The primary instrument. Check it at the start of heavy sessions and after long tool chains. Context usage creeping toward the window limit is a signal to `/compact` before the session degrades.

### RTK: Token Savings Analytics

[RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) is a transparent CLI proxy that intercepts git commands and rewrites their output to compact, agent-optimised format. The hook is invisible at the shell level: `git status` becomes `rtk git status` automatically with no workflow change.

Standard git output includes decorative headers, instructional text, and column padding that agents do not need. RTK strips them. Typical savings on git operations range from 60 to 90 percent. `git log` is the largest win, dropping from roughly 2,200 tokens for a 20-commit history to around 300. Over a session with frequent git calls, this compounds into thousands of tokens recovered.

```bash
rtk gain              # cumulative token savings for this project
rtk gain --history    # per-command breakdown
rtk discover          # scan Claude Code history for missed optimisation opportunities
```

The `discover` subcommand analyses your actual Claude Code session history and surfaces the highest-value commands you ran without RTK filtering. Useful for understanding where your spend is concentrated before you tune anything.

### nit: A Git Replacement Built for Agents

[nit](https://justfielding.com/blog/nit-replacing-git-with-zig) takes a different approach to the same problem. Rather than proxying git, it replaces it entirely: a native Zig implementation backed by libgit2 that defaults to compact, machine-readable output. Human-readable formatting requires the `-H` flag, inverting git's assumption.

Token savings are comparable to RTK on the same operations: `git log -20` drops from roughly 2,200 tokens to around 300, `git status` from 125 to 36. The libgit2 backend also skips subprocess overhead, making it 1.4-1.5x faster than standard git on equivalent commands.

If you prefer a drop-in replacement over a proxy layer, nit is worth evaluating. The two approaches solve the same problem differently.

### Context-Mode: Keep Raw Output Out of the Window

The [context-mode](https://github.com/mksglu/context-mode) MCP plugin provides tools that execute commands in a sandbox and index results separately, returning only structured summaries into the conversation. Instead of 300 lines of `docker ps` output landing in context, the agent gets back the specific information it queried.

The distinction matters because anything in the conversation re-sends on every subsequent turn. Raw output that enters context once keeps costing tokens until the session ends or you compact.

### jCodeMunch and jDocMunch: Targeted Lookups Over Full Reads

[jCodeMunch and jDocMunch](https://j.gravelle.us/jCodeMunch/index.php) are MCP tools for code and documentation navigation. Rather than reading an entire file to locate one function or section, they index the codebase and return targeted excerpts.

The token saving is structural: reading a 500-line file to find a 20-line function costs all 500 lines in context, re-sent on every subsequent turn. A targeted symbol lookup returns the 20 lines only. For sessions with heavy code exploration, the difference across a full session is significant.

### Caveman: Compress Agent Responses

[Caveman](https://github.com/JuliusBrussee/caveman) make Claude talk less. Keep brain good. No articles. No filler. No hedging. Fragment OK. Same technical substance, fewer tokens. Modest saving per turn. Compounds across long session. Faster to read. Ugh.

## Cutting the Bill

### Per-Project CLAUDE.md Files

The single highest-leverage change: give every project its own `CLAUDE.md` and move project-specific context out of the global file.

A global `CLAUDE.md` should contain only what applies universally: environment conventions, credential handling rules, coding style. Everything project-specific belongs in `~/projects/myproject/CLAUDE.md`, loaded automatically when you open a session in that directory.

Before this split, every session pays for the full global context. After: a session in the blog repo pays for blog context; a session in the monitoring repo pays for monitoring context. Rent drops for both, and neither session carries irrelevant context into every turn.

Keep each file tight. Every line that is not load-bearing is a tax on every turn in that project.

### Sub-Agent Workflows

Each sub-agent spawned by Claude Code gets a fresh, isolated context window. The parent session's history does not carry over. The sub-agent does its work, returns a summary, and the parent sees only the result.

For tasks with independent phases, this is structurally cheaper than running everything in one session. A research phase that reads ten files and a writing phase that produces output from those findings costs far less if the research is delegated to an agent that returns a 200-token summary, rather than carrying all ten files through the rest of the conversation.

Sub-agents are also correct for parallelism. Multiple independent tasks run simultaneously, each in its own context, with no one task's overhead bleeding into another.

The [superpowers](https://claude.com/plugins/superpowers) plugin adds structured dispatching on top of this: its `dispatching-parallel-agents` and `subagent-driven-development` skills provide workflows for decomposing a task into independent units and routing each to its own agent. The orchestration overhead is low; the context isolation benefit scales with task complexity.

A further lever: sub-agents do not need to use the same model as the parent session. Well-defined, low-complexity tasks such as file searches, format conversions, or grep-and-summarise operations are good candidates for a cheaper, faster model. Haiku costs a fraction of Opus. If the task is narrow and the brief is tight, you do not need the most capable model to complete it. Route expensive reasoning to the senior model; route mechanical work to the cheaper one.

The tradeoff: each sub-agent starts cold. The brief needs to be complete. "Look at the auth code and find the bug" will cause it to read files you have already read. "The expiry check is in `middleware/auth.go` around line 142, check whether the comparison operator is correct" directs it straight to the answer.

### /compact and /clear

`/compact` compresses the conversation history into a summary, reducing the token cost of prior turns without ending the session. Use it when a long exchange has resolved and you are moving to a different part of the task.

`/clear` wipes the conversation entirely and starts fresh. Use it when the session has drifted, you are switching task domains, or the accumulated context is no longer relevant. A clean session costs rent but nothing else.

The instinct to keep a session running because you have already spent tokens on it is backwards. A bloated context costs more per turn than a fresh session costs at start.

### Ask for Specific Things

No tooling required. "Read the auth middleware and tell me why token expiry uses `<` instead of `<=`" costs far fewer tokens than "look at the auth code and find any bugs."

Broad exploration requests cause the agent to read multiple files, chain tool calls, and accumulate context it may not use. Specific requests scope the work and scope the cost.

## A Note on Third-Party Tools

The tools listed above are third-party projects, not Anthropic products. Before adding any MCP plugin, CLI proxy, or shell hook to a Claude Code session, review what it does, what it has access to, and whether you trust the supply chain.

MCP tools run with the same permissions as your agent session. A malicious or poorly written plugin can read files, exfiltrate context, or inject instructions into the conversation. This is not hypothetical: it is [LLM03 in the OWASP Top 10 for LLM Applications](https://buildtestrun.com/owasp-top-10-for-llm-applications-2025/#llm03--supply-chain).

Do your own research before installing anything. Check the source, review recent commits, and understand what access you are granting. The token savings are real; so is the risk surface.

## Summary

Tokens are the currency your agents spend. The waste is predictable: verbose tool output in the conversation, full file reads when sliced reads would suffice, global context that does not apply to the task, and sessions that run long on a single thread.

The mitigations are equally predictable: per-project CLAUDE.md files to scope rent, token-optimised git tooling (RTK, nit), context-mode to keep raw output out of the window, jCodeMunch and jDocMunch for targeted code lookups, Caveman to compress response verbosity, and sub-agent workflows to isolate expensive phases from each other.

Check `/stats` before you start heavy work. Consult `rtk gain` to see what you have recovered. Use `/compact` before the session gets unwieldy. Delegate to sub-agents when task phases are genuinely independent.

Your allowance is fixed. What you get out of it is not.
