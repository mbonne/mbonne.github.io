# Portfolio Site Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert mbonne.github.io from a full Beautiful Jekyll fork to a clean remote-gem-based personal portfolio site with Dracula theming and Claude Code scaffolding for article generation.

**Architecture:** Remove all theme source files and switch to `remote_theme: daattali/beautiful-jekyll`. Content (posts, pages, config, one CSS override file) lives in the repo. All Claude Code tooling (CLAUDE.md, docs/, .claude/, _drafts/) is gitignored and never published.

**Tech Stack:** Jekyll, Beautiful Jekyll remote gem, GitHub Pages, Ruby/Bundler (for local build verification), Dracula colour scheme.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `.gitignore` | Modify | Keep tooling off public repo |
| `Gemfile` | Rewrite | Remote theme dep only |
| `Gemfile.lock` | Regenerate | Locked deps after bundle install |
| `_config.yml` | Rewrite | All site config, Dracula palette |
| `index.html` | Modify | Update subtitle |
| `aboutme.md` | Rewrite | Minimal About page |
| `assets/css/custom.css` | Create | Dracula overrides beyond config vars |
| `CLAUDE.md` | Create (gitignored) | Claude Code context file |
| `.claude/commands/draft-post.md` | Create (gitignored) | /draft-post command prompt |
| `docs/backlog.md` | Create (gitignored) | Site feature backlog |
| `docs/published-log.md` | Create (gitignored) | Article pipeline tracker |
| `_layouts/` | Delete | Provided by gem |
| `_includes/` | Delete | Provided by gem |
| `_data/` | Delete | Provided by gem |
| `assets/css/*.css` (theme files) | Delete | Provided by gem |
| `assets/js/*.js` (theme files) | Delete | Provided by gem |
| `assets/img/` (except avatar-icon.png) | Delete | Demo images, not needed |
| `_posts/*.md` (placeholder) | Delete | Demo content |
| `beautiful-jekyll-theme.gemspec` | Delete | No longer a fork |
| `screenshot.png`, `staticman.yml`, `feed.xml`, `Appraisals` | Delete | Stray files |

---

## Task 1: Privacy and Git Setup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Check current .gitignore contents**

```bash
cat /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/.gitignore
```

Expected: File may not exist or may be sparse. Note current contents.

- [ ] **Step 2: Add private entries to .gitignore**

Append the following to `.gitignore` (create the file if it does not exist):

```
# Claude Code tooling — keep off public repo
CLAUDE.md
docs/
.claude/
_drafts/
```

- [ ] **Step 3: Verify .gitignore is correct**

```bash
cat /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/.gitignore
```

Expected: All four entries present.

- [ ] **Step 4: Commit**

```bash
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io add .gitignore
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io commit -m "chore: add gitignore for Claude Code tooling

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Remove Theme Source Files and Placeholder Content

**Files:**
- Delete: `_layouts/`, `_includes/`, `_data/`, `assets/css/` (theme files), `assets/js/` (theme files), `assets/img/` (demo images except avatar-icon.png), `_posts/` (placeholder posts), `beautiful-jekyll-theme.gemspec`, `screenshot.png`, `staticman.yml`, `feed.xml`, `Appraisals`

- [ ] **Step 1: Remove theme directories**

```bash
rm -rf /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/_layouts
rm -rf /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/_includes
rm -rf /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/_data
```

- [ ] **Step 2: Remove theme CSS and JS files**

```bash
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/css/beautifuljekyll-minimal.css
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/css/beautifuljekyll.css
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/css/bootstrap-social.css
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/css/pygment_highlights.css
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/css/staticman.css
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/js/beautifuljekyll.js
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/js/staticman.js
```

- [ ] **Step 3: Remove demo images (keep avatar-icon.png)**

```bash
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/img/404-this-is-not-a-page.jpg
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/img/bgimage.png
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/img/crepe.jpg
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/img/path.jpg
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/assets/img/thumb.png
```

- [ ] **Step 4: Remove placeholder posts**

```bash
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/_posts/2020-02-26-flake-it-till-you-make-it.md
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/_posts/2020-02-28-sample-markdown.md
```

- [ ] **Step 5: Remove stray and fork-specific files**

```bash
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/beautiful-jekyll-theme.gemspec
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/screenshot.png
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/staticman.yml
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/feed.xml
rm /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/Appraisals
```

- [ ] **Step 6: Verify what remains**

```bash
find /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io -not -path '*/.git/*' -type f | sort
```

Expected files remaining: `.gitignore`, `404.html`, `CHANGELOG.md`, `CNAME`, `Gemfile`, `LICENSE`, `README.md`, `_config.yml`, `aboutme.md`, `assets/img/avatar-icon.png`, `index.html`, `tags.html`

- [ ] **Step 7: Stage and commit deletions**

```bash
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io add -A
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io commit -m "chore: remove theme source files, demo content, stray files

Switching to remote gem theme. All layouts, includes, theme CSS/JS,
placeholder posts, and fork-specific files removed.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Rewrite Gemfile and Regenerate Lock File

**Files:**
- Rewrite: `Gemfile`
- Regenerate: `Gemfile.lock`

- [ ] **Step 1: Rewrite Gemfile**

Replace the entire contents of `Gemfile` with:

```ruby
source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins
gem "jekyll-remote-theme"
```

- [ ] **Step 2: Run bundle install**

```bash
cd /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io && bundle install
```

Expected: Bundler resolves dependencies and writes `Gemfile.lock`. If Ruby/Bundler is not installed locally, skip this step — GitHub Pages will resolve deps on deploy. Note the skip in the commit message.

- [ ] **Step 3: Commit Gemfile and lock file**

```bash
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io add Gemfile Gemfile.lock
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io commit -m "chore: rewrite Gemfile for remote theme

Switch from gemspec to github-pages + jekyll-remote-theme.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Rewrite _config.yml

**Files:**
- Rewrite: `_config.yml`

- [ ] **Step 1: Replace _config.yml with the target config**

Replace the entire contents of `_config.yml` with:

```yaml
###########################################################
# Build Test Run — buildtestrun.com
# Beautiful Jekyll remote theme configuration
###########################################################

title: Build Test Run
author: mbonne

remote_theme: daattali/beautiful-jekyll

############################
# Navigation
############################

navbar-links:
  About Me: "aboutme"

############################
# Identity
############################

avatar: "/assets/img/avatar-icon.png"
round-avatar: true

############################
# Social links (footer)
############################

social-network-links:
  email: "mbonne@buildtestrun.com"
  github: mbonne

############################
# General options
############################

url-pretty: "buildtestrun.com"
title-on-all-pages: true
excerpt_length: 50 # words
feed_show_excerpt: true
feed_show_tags: true
post_search: true
edit_page_button: false

share-links-active:
  twitter: false
  facebook: false
  linkedin: false
  vk: false

############################
# Dracula colour palette
# https://draculatheme.com/contribute
############################

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

############################
# Build settings
############################

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

- [ ] **Step 2: Commit**

```bash
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io add _config.yml
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io commit -m "feat: rewrite config with remote theme and Dracula palette

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Update Content Files

**Files:**
- Modify: `index.html`
- Rewrite: `aboutme.md`

- [ ] **Step 1: Update index.html subtitle**

Replace the subtitle line in `index.html`:

Current:
```yaml
subtitle: Some personal projects hosted on GitHub
```

New:
```yaml
subtitle: Infrastructure. Security. Leadership.
```

Full `index.html` should be:

```html
---
layout: home
title: Build Test Run
subtitle: Infrastructure. Security. Leadership.
---
```

- [ ] **Step 2: Rewrite aboutme.md**

Replace the entire contents of `aboutme.md` with:

```markdown
---
layout: page
title: About
---

Senior IT professional. Background in systems engineering and infrastructure. Currently focused on technology leadership.

**Areas of focus:**

- Infrastructure & systems engineering
- Networking & security
- Tooling & automation
- Technology leadership

[GitHub](https://github.com/mbonne)
```

- [ ] **Step 3: Commit**

```bash
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io add index.html aboutme.md
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io commit -m "feat: update home subtitle and rewrite About page

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Create Custom CSS (Dracula Overrides)

**Files:**
- Create: `assets/css/custom.css`

Beautiful Jekyll's `_config.yml` colour vars handle navbar, footer, links, and page background. The following elements are not covered by config vars and need explicit overrides: inline code, code blocks (Rouge output), blockquotes, search input, and tag labels.

- [ ] **Step 1: Create assets/css/custom.css**

```css
/*
 * Dracula theme overrides for Build Test Run
 * Extends Beautiful Jekyll _config.yml colour vars
 * https://draculatheme.com/contribute
 *
 * Dracula palette reference:
 *   Background:   #282a36
 *   Current Line: #44475a
 *   Foreground:   #f8f8f2
 *   Comment:      #6272a4
 *   Cyan:         #8be9fd
 *   Green:        #50fa7b
 *   Orange:       #ffb86c
 *   Pink:         #ff79c6
 *   Purple:       #bd93f9
 *   Red:          #ff5555
 *   Yellow:       #f1fa8c
 */

/* Inline code */
code {
  background-color: #44475a;
  color: #f8f8f2;
  border: none;
  padding: 2px 5px;
  border-radius: 3px;
}

/* Code blocks */
pre {
  background-color: #44475a;
  border: 1px solid #6272a4;
  border-radius: 4px;
}

pre code {
  background-color: transparent;
  padding: 0;
}

/* Rouge syntax highlighting wrapper */
.highlight {
  background-color: #44475a;
  border-radius: 4px;
}

/* Blockquotes */
blockquote {
  background-color: #44475a;
  border-left: 4px solid #bd93f9;
  color: #f8f8f2;
  padding: 10px 20px;
  margin: 20px 0;
}

/* Search input in navbar */
#nav-search-input {
  background-color: #44475a;
  color: #f8f8f2;
  border-color: #6272a4;
}

#nav-search-input::placeholder {
  color: #6272a4;
}

/* Tag labels */
.blog-tags a {
  background-color: #44475a;
  color: #bd93f9;
  border-color: #44475a;
  border-radius: 3px;
  padding: 2px 8px;
  text-decoration: none;
}

.blog-tags a:hover {
  background-color: #6272a4;
  color: #f8f8f2;
  text-decoration: none;
}

/* Post preview cards — ensure no white bleed from Bootstrap */
.post-preview {
  background-color: #282a36;
  border-bottom: 1px solid #44475a;
}

/* Horizontal rules */
hr {
  border-color: #44475a;
}

/* Table borders */
table th,
table td {
  border-color: #44475a;
}

table th {
  background-color: #44475a;
  color: #f8f8f2;
}

table tr:nth-child(even) {
  background-color: #313342;
}
```

- [ ] **Step 2: Register the custom CSS in _config.yml**

Add the following to `_config.yml` under the general options section (after `edit_page_button: false`):

```yaml
site-css:
  - "/assets/css/custom.css"
```

- [ ] **Step 3: Commit**

```bash
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io add assets/css/custom.css _config.yml
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io commit -m "feat: add Dracula CSS overrides for code, blockquotes, tags, tables

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Create Claude Code Scaffolding

**Files:**
- Create: `CLAUDE.md` (gitignored)
- Create: `.claude/commands/draft-post.md` (gitignored)
- Create: `docs/backlog.md` (gitignored)
- Create: `docs/published-log.md` (gitignored)

Note: None of these files will be committed to the public repo — they are covered by `.gitignore`. They are committed to the local git history only if desired; otherwise they exist as untracked local files. The spec does not require committing them. Create them as working files only.

- [ ] **Step 1: Create CLAUDE.md**

Create `/mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/CLAUDE.md`:

```markdown
# Build Test Run — Claude Code Context

## Site Overview

- URL: buildtestrun.com (GitHub Pages via mbonne.github.io)
- Theme: Beautiful Jekyll (remote gem, daattali/beautiful-jekyll)
- Generator: Jekyll
- Deploy: push to main branch triggers GitHub Pages build automatically
- Git access: collaborator account — push permitted, not the repo owner

## Directory Structure

- `_posts/` — published articles (committed, public)
- `_drafts/` — work in progress (gitignored, never published)
- `assets/css/custom.css` — Dracula CSS overrides only, not theme source
- `docs/` — all planning, specs, backlog (gitignored)
- `.claude/commands/` — custom Claude Code commands (gitignored)

## Article Generation Workflow

Source material lives in the Obsidian vault at `../ObsidianVault` relative to this repo.
Use `/draft-post` to browse the vault and generate article drafts.
All drafts go to `_drafts/` and are reviewed before being moved to `_posts/`.
Track all drafts and published posts in `docs/published-log.md`.

Post filename format: `_posts/YYYY-MM-DD-slug.md`

## Writing Style Guide

**Tone:** Factual, concise, technically credible. Senior/leadership level — not dumbed down, not unnecessarily academic.

**Humour:** Deadpan and dry. Used sparingly, never forced. If it needs to be labelled as a joke, cut it.

**Rules:**
- No em dashes
- No excessive exclamation marks
- No corporate jargon or filler phrases ("In today's fast-paced world...", "It's worth noting that...")
- Technical claims cite vendor documentation

**Article types:**

| Type | Length | When to use |
|---|---|---|
| Deep dive | 1000–2000 words | Setup guides, architecture decisions, technical comparisons |
| Short take | 300–600 words | Code snippets, script shares, quick how-tos, GitHub repo links |

Deep dives: structured headings, code blocks, links to vendor docs.
Short takes: example use case, repo link, minimal prose.

## Site Feature Backlog

Feature requests are tracked in `docs/backlog.md`. When asked to work on a site feature:
1. Check `docs/backlog.md` for existing items
2. Invoke the `writing-plans` skill to create an implementation plan before touching code
3. All theme/layout changes use Beautiful Jekyll override patterns — never edit gem source files

## Colour Scheme

Dracula theme. Reference: https://draculatheme.com/contribute

| Token | Hex |
|---|---|
| Background | #282a36 |
| Current Line | #44475a |
| Foreground | #f8f8f2 |
| Comment | #6272a4 |
| Purple (links) | #bd93f9 |
| Pink (hover) | #ff79c6 |
| Green | #50fa7b |
| Orange | #ffb86c |
| Cyan | #8be9fd |
| Red | #ff5555 |
| Yellow | #f1fa8c |
```

- [ ] **Step 2: Create .claude/commands/ directory and draft-post command**

```bash
mkdir -p /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/.claude/commands
```

Create `/mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/.claude/commands/draft-post.md`:

```markdown
Browse the Obsidian vault at ../ObsidianVault (relative to the repo root) and identify notes suitable for publishing as blog posts on buildtestrun.com.

Steps:
1. List all markdown files in ../ObsidianVault. Ignore any files in folders named "templates", "attachments", or starting with "_".
2. Read candidate notes and assess each for: publishable content, technical specificity, and fit with the site's focus areas (infrastructure, networking, security, tooling, leadership).
3. Present the top 3 candidates in this format:
   - **Note:** [filename]
   - **Summary:** [one sentence]
   - **Suggested type:** Deep dive | Short take
   - **Reason:** [why this note is ready to publish]
4. Wait for the user to select a note (by number or name).
5. Draft the article following the writing style guide in CLAUDE.md:
   - Use the appropriate format for the article type
   - Deep dive: structured headings, code blocks where relevant, cite vendor docs
   - Short take: concise prose, example use case, repo or reference links
   - No em dashes, no corporate jargon, no filler phrases
   - Dry humour only if it lands naturally — otherwise leave it out
6. Save the draft to _drafts/YYYY-MM-DD-slug.md using today's date and a short kebab-case slug.
   Jekyll front matter format:
   ---
   layout: post
   title: "Post Title"
   tags: [tag1, tag2]
   ---
7. Add a row to docs/published-log.md:
   | [source note filename] | [draft filename] | [today's date] | — | draft |
8. Tell the user the draft is saved and ready to review. When satisfied, they move it from _drafts/ to _posts/ and push.
```

- [ ] **Step 3: Create docs/backlog.md**

Create `/mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/docs/backlog.md`:

```markdown
# Site Feature Backlog

Items are roughly prioritised — top of list is highest priority.

## Pending

- [ ] RSS feed — verify feed works correctly via remote theme
- [ ] Colour scheme — evaluate Nord as an alternative to current Dracula palette
- [ ] LinkedIn social link — add when ready to make it public
- [ ] Comments — evaluate giscus (GitHub Discussions-backed, no third-party service)
- [ ] Analytics — Cloudflare Analytics preferred (account already exists)
- [ ] Projects page — links to GitHub repos with short descriptions
- [ ] Dark/light mode toggle

## Done

<!-- Move items here when complete, with date -->
```

- [ ] **Step 4: Create docs/published-log.md**

Create `/mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/docs/published-log.md`:

```markdown
# Published Log

Tracks all articles drafted from the Obsidian vault.

| Source Note | Post File | Date Drafted | Date Published | Status |
|---|---|---|---|---|
```

- [ ] **Step 5: Verify .gitignore is working correctly**

```bash
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io status
```

Expected: `CLAUDE.md`, `.claude/`, and `docs/` should NOT appear in the untracked files list. If they do appear, the `.gitignore` is not working — check that the entries were saved correctly in Task 1.

---

## Task 8: Verify Build and Push

- [ ] **Step 1: Attempt local build (optional — requires Ruby/Bundler)**

```bash
cd /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io && bundle exec jekyll build
```

Expected: `Destination: ./_site` with no errors. If Ruby is not installed locally, skip to Step 3.

Common issues:
- `Could not find gem 'github-pages'` — run `bundle install` first
- `Remote theme not found` — check `remote_theme: daattali/beautiful-jekyll` spelling in `_config.yml`
- `Pagination` error — verify `jekyll-paginate` is in plugins list

- [ ] **Step 2: Spot-check local build output (if build ran)**

```bash
ls /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io/_site/
```

Expected: `index.html`, `aboutme/`, `tags/`, `404.html`, `assets/`, `feed.xml`, `sitemap.xml`. No `docs/` directory should be present.

- [ ] **Step 3: Push to main**

```bash
git -C /mnt/c/Users/mbonne/ClaudeProjects/mbonne.github.io push origin main
```

Expected: Push succeeds. If authentication is required, use the collaborator account credentials.

- [ ] **Step 4: Verify GitHub Pages build**

In the browser, check: `https://github.com/mbonne/mbonne.github.io/actions`

Expected: A Pages build action triggered by the push. Wait for green checkmark (typically 1-3 minutes).

- [ ] **Step 5: Verify live site**

Open `https://buildtestrun.com` in a browser.

Check:
- Page background is `#282a36` (dark)
- Navbar is `#1e1f29`
- Links are purple `#bd93f9`
- About page renders correctly with three sections
- Home page shows empty feed (no posts) — this is correct
- No placeholder content visible

- [ ] **Step 6: Check for visual issues and note any CSS overrides needed**

Elements to inspect:
- Inline code rendering (dark background, light text)
- Any Bootstrap-default white panels bleeding through
- Navbar search box styling
- Footer text readability

Any issues found that are not covered by `custom.css` should be added to `docs/backlog.md` as CSS fix items, not fixed inline during this task.

---

## Notes for Implementer

**No unit tests:** This is a static site. Verification is via Jekyll build output and visual browser inspection. The equivalent of a passing test is a clean `bundle exec jekyll build` with no errors and correct rendering on the live site.

**Custom CSS iteration:** The `custom.css` provided in Task 6 is a solid starting point but may not cover every element. Treat it as v1 — visual inspection after deploy will reveal any remaining light-theme bleed. Additional overrides go in the same file.

**Dracula Rouge theme:** The built-in `rouge` highlighter does not use Dracula colours by default — it uses whatever CSS is loaded. Beautiful Jekyll's default `pygment_highlights.css` has been removed. The `custom.css` sets a dark background for `.highlight` blocks which will make code readable, but for full Dracula syntax token colours, a separate Rouge CSS theme file would be needed. This is a backlog item if desired.

**Gemfile.lock:** If Ruby is not available locally, push without a `Gemfile.lock`. GitHub Pages manages its own gem resolution. The lock file is optional for GitHub Pages deployments.
