---

title: "Building This Site With Claude Code"
subtitle: "Transparent about the tooling from day one"
description: "How buildtestrun.com was built and maintained using Claude Code, with an Obsidian-based content pipeline and a custom Hugo theme."
date: 2026-03-21
lastmod: 2026-03-21
tags: [meta, claude, obsidian, tooling]
schema_type: Article
slug: "building-this-site-with-claude-code"
---

Full disclosure, This site was built with Claude Code. However the ideas and thoughts within are my own.
I wanted to see what was possible with a couple weekends experiementing with Claude Code/Cowork to see what I could do with some crude prompting to get the site running.

Over time I'll be making posts which use notes from my Obsidian vault. Often it'll be for some idea or information I've found useful or interesting while working in IT.

## What it is

Build Test Run runs on Hugo with a custom theme called `btr`. There is no external theme dependency. The visual foundation is a Dracula colour palette implemented from scratch: dark background, purple links, syntax highlighting via Chroma, and a layout stripped of anything not needed.

The content pipeline is purpose-built: notes live in an Obsidian vault, and a Claude Code workflow pulls from that vault to draft articles. The workflow browses the vault, selects relevant material, and produces a structured post draft for review before anything goes public. Nothing is published raw.

Claude Code also handled the initial setup: `hugo.toml`, CSS, `.gitignore`, About page, the whole thing. Not generated once and left alone. It is an active part of how the site gets maintained.

## Why be transparent about it

AI-assisted work is common enough now that pretending otherwise is just noise. This site is about technical credibility. Starting with a hidden dependency would be a poor choice.

The tooling is Claude Code. The decisions, direction, and anything that goes out under this name are mine.

## The Obsidian pipeline

Notes in the vault do not go straight to the site. The workflow is:

1. Draft is generated from vault content using a Claude Code custom command
2. Draft lands in `_drafts/` - never committed, never public
3. Review and edit before it moves to `content/articles/`
4. Commit and push triggers the GitHub Pages build

The goal is to reduce friction from "I have something worth writing about" to "there is a readable draft in front of me" without sacrificing editorial control. It is working.

## What's next

More posts. The pipeline exists, now it needs material flowing through it. Vault content covering networking, security tooling, and infrastructure operations is the immediate backlog.

The site itself is functional. Future changes will be incremental.
