# Portfolio Site Redesign — Design Spec

**Date:** 2026-03-21
**Site:** buildtestrun.com (mbonne.github.io)
**Status:** Approved

---

## Overview

Redesign and re-scaffold the personal portfolio/blog site at buildtestrun.com. The site is a GitHub Pages Jekyll site currently using a full fork of the Beautiful Jekyll theme by Dean Attali. The goal is to convert it to a clean, minimal, content-first personal site with a proper Claude Code workflow for article generation and site feature development.

---

## 1. Site Structure

### Theme Approach

Convert the repo from a full Beautiful Jekyll fork to using Beautiful Jekyll as a **remote gem theme**. All theme source files (layouts, includes, default assets) are removed from the repo. The gem provides the theme; the repo contains only content, config, and targeted overrides.

Custom CSS overrides live in `assets/css/custom.css`.

### Pages

| Page | Purpose |
|---|---|
| Home (`index.html`) | Post feed, paginated |
| About (`aboutme.md`) | Minimal personal/professional profile |
| Tags (`tags.html`) | Tag-based discovery |
| 404 (`404.html`) | Standard 404 |

No additional pages until there is a clear reason for them.

### Navigation

- About (page link)
- GitHub (social icon in footer)
- No dropdowns, no external resource links

### Colour Palette (initial)

Dark, minimal. Subject to future update — Dracula and Nord are noted candidates.

| Token | Value |
|---|---|
| Background | `#1a1a1a` |
| Text | `#e0e0e0` |
| Accent (links/hover) | `#4a9eff` |
| Navbar/Footer | `#111111` |

System fonts only. No web font loading.

### Content Tags

Initial tag set: `infrastructure`, `networking`, `security`, `tooling`, `leadership`

---

## 2. Files: Nuke and Pave

| File/Dir | Action |
|---|---|
| `_layouts/` | Remove — provided by gem |
| `_includes/` | Remove — provided by gem |
| `_data/` | Remove — provided by gem |
| `assets/` | Remove defaults; keep `assets/img/avatar-icon.png` if present; add `assets/css/custom.css` |
| `_posts/` | Remove all placeholder posts |
| `beautiful-jekyll-theme.gemspec` | Remove — no longer forking |
| `screenshot.png` | Remove |
| `staticman.yml` | Remove |
| `_config.yml` | Rewrite — clean config, remote theme, personal details |
| `Gemfile` | Rewrite — remote theme only |
| `aboutme.md` | Rewrite — minimal, leadership tone |
| `index.html` | Update subtitle only |
| `CNAME` | Keep |
| `tags.html` | Keep |
| `404.html` | Keep |

---

## 3. About Page

Three parts only:

1. **One-line identity** — senior IT professional, infrastructure and systems background, moving into technology leadership roles
2. **Focus areas** (bullet list) — infrastructure, networking & security, tooling & automation, technology leadership
3. **GitHub link** — repo link only, no biography

No employment history. No timeline. No "passionate about" language.

---

## 4. Claude Code Setup

### CLAUDE.md (repo root)

Covers:
- Site overview: Jekyll, Beautiful Jekyll remote gem, GitHub Pages, buildtestrun.com
- Writing style guide (see Section 5)
- Vault workflow: location of Obsidian vault (`../ObsidianVault`), browsing approach
- Article types: deep dive vs short take
- Site feature backlog: how to add and pick up backlog items
- Git/deploy notes: collaborator account access, push to `main` triggers GitHub Pages build

### .gitignore Additions

All Claude Code tooling is kept off the public repo:

```
docs/
.claude/
_drafts/
```

### docs/ Structure (local only, gitignored)

```
docs/
  superpowers/
    specs/          # Design documents
    plans/          # Implementation plans
  backlog.md        # Site feature backlog, prioritised
  published-log.md  # Article pipeline log
```

### /draft-post Command

Located at `.claude/commands/draft-post.md`. Workflow:

1. Browse `../ObsidianVault`, identify candidate notes
2. Present top 3 candidates with one-line summary of each
3. User selects a note
4. Claude drafts a post in `_drafts/` following the writing style guide
5. Post filename uses Jekyll convention: `YYYY-MM-DD-slug.md`
6. Record entry in `docs/published-log.md`: source note | output file | date | status

User reviews draft, moves to `_posts/` when ready, commits and pushes.

### Published Log (docs/published-log.md)

Simple markdown table:

| Source Note | Post File | Date Drafted | Status |
|---|---|---|---|

---

## 5. Writing Style Guide

To be encoded verbatim in CLAUDE.md for all article generation.

**Tone:** Factual, concise, technically credible. Written at a senior/leadership level — not dumbed down, not unnecessarily academic.

**Humour:** Deadpan and dry. Used sparingly, never forced. If it needs to be labelled as a joke, it isn't one.

**Format rules:**
- No em dashes
- No excessive exclamation marks
- No fluff or corporate jargon
- No filler phrases ("In today's fast-paced world...", "It's worth noting that...")
- Vendor documentation cited as reference for technical claims and best practices

**Article types:**

| Type | Length | When to use |
|---|---|---|
| Deep dive | 1000–2000 words | Setup guides, architecture decisions, technical comparisons |
| Short take | 300–600 words | Code snippets, script shares, quick how-tos, GitHub repo links |

Deep dives include: structured headings, code blocks where relevant, links to vendor docs.
Short takes include: example use case, link to repo or relevant resource, minimal prose.

---

## 6. Site Feature Backlog (initial items)

To be tracked in `docs/backlog.md`:

- [ ] Colour scheme update — evaluate Dracula or Nord theme
- [ ] LinkedIn social link (when ready to add)
- [ ] RSS feed — enable and test
- [ ] Comments — evaluate giscus (GitHub Discussions-backed)
- [ ] Projects page — links to GitHub repos with short descriptions

---

## Out of Scope (this iteration)

- Comments system (backlog)
- Analytics (backlog)
- Dark/light mode toggle (backlog)
- Projects page (backlog)
- Custom domain email beyond what's already configured
