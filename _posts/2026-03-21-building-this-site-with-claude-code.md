---
layout: post
title: "Building This Site With Claude Code"
subtitle: "Transparent about the tooling from day one"
description: "How buildtestrun.com was built and maintained using Claude Code, with an Obsidian-based content pipeline and Beautiful Jekyll theme."
date: 2026-03-21
last_modified_at: 2026-03-21
tags: [meta, claude, obsidian, tooling]
schema_type: Article
---

This site was built with Claude Code. That is not a footnote. It is the point.

## What it is

Build Test Run runs on [Beautiful Jekyll](https://beautifuljekyll.com), a GitHub Pages-compatible theme originally created by Dean Attali. The visual foundation, dark theme, layout, post structure, comes from that base, adapted to a Dracula colour palette and stripped of anything that is not needed.

The content pipeline is purpose-built: notes live in an Obsidian vault, and a Claude Code workflow pulls from that vault to draft articles. The workflow browses the vault, selects relevant material, and produces a structured post draft for review before anything goes public. Nothing is published raw.

Claude Code also handled the initial setup: `_config.yml`, CSS overrides, `.gitignore`, About page, the whole thing. Not generated once and left alone. It is an active part of how the site gets maintained.

## Why be transparent about it

AI-assisted work is common enough now that pretending otherwise is just noise. This site is about technical credibility. Starting with a hidden dependency would be a poor choice.

The tooling is Claude Code. The decisions, direction, and anything that goes out under this name are mine.

## The Obsidian pipeline

Notes in the vault do not go straight to the site. The workflow is:

1. Draft is generated from vault content using a Claude Code custom command
2. Draft lands in `_drafts/` - never committed, never public
3. Review and edit before it moves to `_posts/`
4. Commit and push triggers the GitHub Pages build

The goal is to reduce friction from "I have something worth writing about" to "there is a readable draft in front of me" without sacrificing editorial control. It is working.

## What's next

More posts. The pipeline exists, now it needs material flowing through it. Vault content covering networking, security tooling, and infrastructure operations is the immediate backlog.

The site itself is functional. Future changes will be incremental.
