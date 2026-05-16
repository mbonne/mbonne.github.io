# Build Test Run

Personal technical blog at [buildtestrun.com](https://buildtestrun.com).

Built with Hugo and a hand-written custom theme. Dracula colour scheme, CaskaydiaCove/Mono NF fonts, and a Claude Code content pipeline.

## Stack

| Layer | What |
|---|---|
| Generator | Hugo (extended), `hugo --minify` |
| Theme | Custom `btr` theme — no external theme dependency |
| Host | GitHub Pages (GitHub Actions on push to `main`) |
| CDN / proxy | Cloudflare (custom domain, security headers, analytics) |
| Custom domain | buildtestrun.com via `static/CNAME` |

## Codebase map

### Configuration

| File | Purpose |
|---|---|
| `hugo.toml` | Site config: baseURL, theme, taxonomies, permalinks, menus, output formats, syntax highlighting, lastmod priority |
| `.github/workflows/deploy.yml` | GitHub Actions: checkout → hugo --minify → upload artifact → deploy to Pages |
| `static/CNAME` | Custom domain declaration for GitHub Pages |
| `static/robots.txt` | Search engine crawl rules |
| `.gitignore` | Excludes `_drafts/`, `docs/`, `.claude/`, `public/`, `resources/` |

### Theme templates (`themes/btr/layouts/`)

All HTML lives here. Hugo's lookup order: type-specific → `_default`.

| File | Purpose |
|---|---|
| `_default/baseof.html` | Base shell: `<html>`, head partial, header partial, `{{ block "main" }}`, footer partial |
| `partials/head.html` | `<head>`: meta, fonts (jsDelivr), main.css, syntax.css, schema partial, back-to-top.js, post-enhancements.js (articles only), CF analytics |
| `partials/header.html` | Sticky navbar, mobile toggle, active link detection |
| `partials/footer.html` | Footer: author, GitHub link |
| `partials/schema.html` | JSON-LD structured data for articles (Article/HowTo/TechArticle via `schema_type` frontmatter) |
| `index.html` | Home page: recent articles list |
| `articles/single.html` | Individual post layout: title, subtitle, date, tags, `.blog-post` content wrapper |
| `articles/list.html` | `/articles/` listing |
| `ai/list.html` | `/ai/` listing: filters all articles where `categories` contains "ai" |
| `_default/projects.html` | Projects page: content block + project-tagged posts + github-repos.js |
| `_default/single.html` | Fallback single template for non-article pages |
| `_default/list.html` | Fallback list template |
| `404.html` | Custom 404 page (standalone, includes partials directly) |

### Styles and scripts (`static/assets/`)

| File | Purpose |
|---|---|
| `css/main.css` | All CSS: Dracula variables, layout, navbar, typography, heading colours, code blocks, copy button, TOC sidebar, repo cards, tables |
| `css/syntax.css` | Chroma syntax highlighting (dracula style, `.chroma` prefix). Regenerate: `hugo gen chromastyles --style=dracula > static/assets/css/syntax.css` |
| `js/post-enhancements.js` | Loaded on articles only: TOC generation and sticky sidebar (>=3 headings, >=1400px), copy button on code blocks, scroll spy |
| `js/back-to-top.js` | Back-to-top button, loaded on all pages |
| `js/github-repos.js` | Projects page: GitHub API fetch, localStorage cache 24hr (`btr_v1_github_repos`), repo card rendering, excludes `mbonne.github.io` |

### Content (`content/`)

| Path | Purpose |
|---|---|
| `_index.md` | Home page frontmatter/content |
| `articles/` | Published articles. Filename: `YYYY-MM-DD-slug.md`. Permalink: `/:slug/` |
| `articles/_index.md` | Articles section index |
| `ai/_index.md` | AI section index (no posts here — the list template queries all articles by category) |
| `about.md` | About page |
| `projects.md` | Projects page (`layout: projects`, contains `<div id="github-repos-container">`) |

### Other

| Path | Purpose |
|---|---|
| `_drafts/` | Symlink → `/opt/obsidian-vault/_Post_ideas_and_drafts_/`. Gitignored, never published |
| `archetypes/default.md` | Hugo new content template |
| `.well-known/security.txt` | RFC 9116 security contact |
| `SECURITY.md` | Vulnerability reporting policy |
| `CLAUDE.md` | Claude Code context: writing style, colour palette, design patterns, workflow (gitignored) |
| `docs/backlog.md` | Feature backlog (gitignored) |
| `docs/published-log.md` | Draft and publish history (gitignored) |
| `docs/superpowers/` | Implementation plans from Claude Code sessions (gitignored) |
| `.claude/commands/` | Custom slash commands: `/draft-post`, `/seo-audit` (gitignored) |

## Where to make common changes

| Task | File(s) |
|---|---|
| Change nav links | `hugo.toml` — `[[menus.main]]` blocks |
| Add/change a colour | `static/assets/css/main.css` — `:root` CSS variables |
| Change heading colours | `static/assets/css/main.css` — `.blog-post h1/h2/h3/h4` selectors |
| Change page layout/structure | `themes/btr/layouts/` — find the matching template |
| Change `<head>` content | `themes/btr/layouts/partials/head.html` |
| Change footer | `themes/btr/layouts/partials/footer.html` |
| Change post metadata display | `themes/btr/layouts/articles/single.html` |
| Change TOC or copy button behaviour | `static/assets/js/post-enhancements.js` |
| Change structured data (JSON-LD) | `themes/btr/layouts/partials/schema.html` |
| Change syntax highlighting style | Regenerate `syntax.css` — see above |
| Change site metadata | `hugo.toml` — `[params]` block |

## Article frontmatter

```yaml
---
title: "Title"
date: YYYY-MM-DD
slug: "url-slug"
description: "One sentence for SEO and listings."
categories: [homelab]      # use "ai" to appear on /ai/
tags: [tag1, tag2]
schema_type: Article       # Article | HowTo | TechArticle
---
```

Optional: `subtitle`, `lastmod`, `canonical_url`

## Content workflow

1. Notes live in Obsidian vault at `/opt/obsidian-vault/`
2. `/draft-post` command browses the vault and generates a structured draft
3. Draft lands in `_drafts/` (gitignored, symlink to vault drafts dir)
4. Review and edit
5. Move to `content/articles/YYYY-MM-DD-slug.md` and push
6. GitHub Actions builds and deploys automatically

## Running locally

```bash
/home/boss/bin/hugo server --buildDrafts
```

Site runs at `http://localhost:1313`. Requires Hugo extended (v0.161.0+).
