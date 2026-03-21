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

Convert the repo from a full Beautiful Jekyll fork to using Beautiful Jekyll as a **remote gem theme** via `remote_theme: daattali/beautiful-jekyll` in `_config.yml`. All theme source files (layouts, includes, default assets) are removed from the repo. The gem provides the theme; the repo contains only content, config, and targeted overrides.

GitHub Pages requires `jekyll-remote-theme` in the plugins list for `remote_theme` to work. The `theme:` key must NOT be used — it does not work on GitHub Pages for third-party themes.

Custom overrides: use `_config.yml` colour variables for the dark palette where Beautiful Jekyll supports them. Use `assets/css/custom.css` only for overrides that the config variables cannot reach.

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

Target `navbar-links` in `_config.yml`:

```yaml
navbar-links:
  About Me: "aboutme"
```

### Colour Palette (initial)

Official Dracula theme (https://draculatheme.com/contribute). Purple as the primary accent, with green, orange, pink available for future use in custom CSS (code blocks, tags, etc.).

| Dracula token | Hex | Usage |
|---|---|---|
| Background | `#282a36` | Page background |
| Current Line | `#44475a` | Navbar/footer border |
| Foreground | `#f8f8f2` | Body text, nav text |
| Comment | `#6272a4` | Footer text (muted) |
| Purple | `#bd93f9` | Links, accents |
| Pink | `#ff79c6` | Hover states |

Set via `_config.yml` colour variables:

```yaml
page-col: "#282a36"
text-col: "#f8f8f2"
link-col: "#bd93f9"
hover-col: "#ff79c6"
navbar-col: "#1e1f29"
navbar-text-col: "#f8f8f2"
navbar-border-col: "#44475a"
footer-col: "#1e1f29"
footer-text-col: "#6272a4"
footer-link-col: "#f8f8f2"
footer-hover-col: "#bd93f9"
```

Other Dracula colours (`#50fa7b` green, `#ffb86c` orange, `#8be9fd` cyan, `#ff5555` red, `#f1fa8c` yellow) are available in `assets/css/custom.css` for code blocks, tag labels, and other decorative elements.

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
| `feed.xml` | Remove — feed is provided by the `jekyll-feed` plugin via the gem |
| `Appraisals` | Remove — stray file from existing repo, no longer needed |
| `_config.yml` | Rewrite — see Section 3 |
| `Gemfile` | Rewrite — see Section 3 |
| `aboutme.md` | Rewrite — see Section 5 |
| `index.html` | Update subtitle only |
| `CNAME` | Keep |
| `tags.html` | Keep |
| `404.html` | Keep |

---

## 3. Config File Targets

### Gemfile

```ruby
source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins
gem "jekyll-remote-theme"
```

Reference: [Beautiful Jekyll remote theme setup](https://github.com/daattali/beautiful-jekyll#remote-theme)

### _config.yml (key sections)

```yaml
title: Build Test Run
author: mbonne

remote_theme: daattali/beautiful-jekyll

navbar-links:
  About Me: "aboutme"

avatar: "/assets/img/avatar-icon.png"
round-avatar: true

social-network-links:
  email: "mbonne@buildtestrun.com"
  github: mbonne

url-pretty: "buildtestrun.com"
title-on-all-pages: true
excerpt_length: 50 # words
feed_show_excerpt: true
feed_show_tags: true
post_search: true
edit_page_button: false

page-col: "#282a36"
text-col: "#f8f8f2"
link-col: "#bd93f9"
hover-col: "#ff79c6"
navbar-col: "#1e1f29"
navbar-text-col: "#f8f8f2"
navbar-border-col: "#44475a"
footer-col: "#1e1f29"
footer-text-col: "#6272a4"
footer-link-col: "#f8f8f2"
footer-hover-col: "#bd93f9"

timezone: "Australia/Sydney"
markdown: kramdown
highlighter: rouge
permalink: /:year-:month-:day-:title/
paginate: 5 # number of posts per page
paginate_path: "/page:num/"

kramdown:
  input: GFM

defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
      comments: false
      social-share: false
  - scope:
      path: ""
    values:
      layout: "page"

exclude:
  - CHANGELOG.md
  - Gemfile
  - Gemfile.lock
  - LICENSE
  - README.md
  - docs/

plugins:
  - jekyll-paginate
  - jekyll-sitemap
  - jekyll-remote-theme
```

---

## 4. Git and Privacy Setup

### .gitignore

The following must be added to `.gitignore`. This keeps all Claude Code tooling, drafts, and planning documents off the public repo. Note that `docs/` also appears in `_config.yml` under `exclude:` — that prevents Jekyll from building it into the site. Both entries are required for different reasons: `exclude:` stops the build; `.gitignore` stops the commit.

```
# Claude Code tooling — keep off public repo
CLAUDE.md
docs/
.claude/
_drafts/
```

### Git Access

The repo is owned by a personal GitHub account. Claude Code operates via a collaborator account with push access. All commits and pushes use the collaborator account credentials. Pushing to `main` triggers the GitHub Pages build automatically.

---

## 5. About Page

File: `aboutme.md`

Three parts only:

1. **One-line identity** — senior IT professional with a background in systems and infrastructure, focused on technology leadership
2. **Focus areas** (bullet list):
   - Infrastructure & systems engineering
   - Networking & security
   - Tooling & automation
   - Technology leadership
3. **GitHub link** — `https://github.com/mbonne` (repos only, no further detail)

No employment history. No timeline. No "passionate about" language. No personal disclosure beyond professional focus areas.

---

## 6. Claude Code Setup

### CLAUDE.md (repo root, gitignored)

`CLAUDE.md` must be added to `.gitignore`. It is the primary context file for all Claude Code work on this repo.

Skeleton content for `CLAUDE.md`:

```markdown
# Build Test Run — Claude Code Context

## Site Overview

- URL: buildtestrun.com (GitHub Pages via mbonne.github.io)
- Theme: Beautiful Jekyll (remote gem, daattali/beautiful-jekyll)
- Generator: Jekyll
- Deploy: push to main branch triggers GitHub Pages build
- Git access: collaborator account — push permitted, not the repo owner

## Directory Structure

- _posts/ — published articles (committed, public)
- _drafts/ — work in progress (gitignored)
- assets/css/custom.css — CSS overrides only
- docs/ — all planning, specs, backlog (gitignored)
- .claude/commands/ — custom Claude Code commands (gitignored)

## Article Generation Workflow

Source material lives in the Obsidian vault at ../ObsidianVault relative to this repo.
Use the /draft-post command to browse the vault and generate article drafts.
All drafts go to _drafts/ and are reviewed before being moved to _posts/.
Track all drafts and published posts in docs/published-log.md.

## Writing Style Guide

- Tone: factual, concise, technically credible. Senior/leadership level — not dumbed down.
- Humour: deadpan, dry, used sparingly. If it needs explaining, cut it.
- No em dashes. No excessive exclamation marks. No corporate jargon or filler phrases.
- Technical claims reference vendor documentation.
- Article types:
  - Deep dive (1000–2000 words): setup guides, architecture, technical comparisons.
    Include structured headings, code blocks, links to vendor docs.
  - Short take (300–600 words): scripts, snippets, GitHub repo shares, quick how-tos.
    Include example use case, repo link, minimal prose.

## Site Feature Backlog

Feature requests are tracked in docs/backlog.md. When asked to work on a site feature:
1. Check docs/backlog.md for existing items
2. Follow the writing-plans skill to create an implementation plan before touching code
3. All theme/layout changes use Beautiful Jekyll override patterns — never edit gem source
```

### /draft-post Command

File: `.claude/commands/draft-post.md` (gitignored via `.claude/`)

The command file must contain a prompt that instructs Claude to:

1. Browse `../ObsidianVault` and identify candidate notes suitable for publishing
2. Present the top 3 candidates with: note title, one-line summary, suggested article type (deep dive or short take)
3. Wait for user to select a note
4. Draft the article in `_drafts/YYYY-MM-DD-slug.md` following the writing style guide in `CLAUDE.md`
5. Add an entry to `docs/published-log.md`

The implementer writes this prompt file as part of the implementation plan.

### Published Log

File: `docs/published-log.md` (gitignored)

```markdown
# Published Log

| Source Note | Post File | Date Drafted | Date Published | Status |
|---|---|---|---|---|
```

---

## 7. Site Feature Backlog (initial items)

File: `docs/backlog.md` (gitignored)

- [ ] Colour scheme — evaluate Nord as an alternative to current Dracula palette
- [ ] LinkedIn social link — add when ready
- [ ] RSS feed — verify feed works correctly via remote theme
- [ ] Comments — evaluate giscus (GitHub Discussions-backed)
- [ ] Analytics — evaluate lightweight option (Cloudflare Analytics preferred, already have account)
- [ ] Projects page — links to GitHub repos with short descriptions
- [ ] Dark/light mode toggle

---

## Out of Scope (this iteration)

- Comments system (backlog)
- Analytics (backlog)
- Dark/light mode toggle (backlog)
- Projects page (backlog)
- Custom domain email beyond what is already configured
