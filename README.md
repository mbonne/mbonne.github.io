# Build Test Run

Personal technical blog at [buildtestrun.com](https://buildtestrun.com).

Built on [Beautiful Jekyll](https://beautifuljekyll.com) by [Dean Attali](https://deanattali.com), adapted with a Dracula colour palette, custom JavaScript, and a Claude Code content pipeline.

## Stack

- **Theme:** Beautiful Jekyll (remote gem, no local copy)
- **Generator:** Jekyll
- **Host:** GitHub Pages (deploys on push to `main`)
- **CDN / proxy:** Cloudflare (custom domain, security headers, analytics)
- **Custom domain:** buildtestrun.com via `CNAME`

## Codebase map

### Configuration

| File | Purpose |
|---|---|
| `_config.yml` | Jekyll config: site metadata, navbar links, theme settings, plugin list, post defaults |
| `Gemfile` | Ruby gem dependencies: Beautiful Jekyll, jekyll-feed, jekyll-sitemap, jekyll-seo-tag, jekyll-last-modified-at |
| `CNAME` | Custom domain declaration for GitHub Pages |
| `robots.txt` | Search engine crawl rules, sitemap reference |
| `.gitignore` | Excludes `_drafts/`, `docs/`, `.claude/`, `_site/`, gem lock files |

### Pages

| File | Purpose |
|---|---|
| `index.html` | Home page (post list, handled by Beautiful Jekyll) |
| `aboutme.md` | About page |
| `articles.md` | All articles listing page |
| `projects.html` | Projects page: dynamic GitHub repos (client-side JS) + Liquid project posts |
| `tags.html` | Tag index page |
| `404.html` | Custom 404 page |

### Content

| Path | Purpose |
|---|---|
| `_posts/` | Published articles. Filename format: `YYYY-MM-DD-slug.md` |
| `_drafts/` | Work in progress. Gitignored, never published. Includes `post-template.md` |

### Theme overrides (`_includes/`)

Beautiful Jekyll loads these automatically. Edit these to customise the theme without touching gem source files.

| File | Purpose |
|---|---|
| `_includes/head-extra.html` | Injected into `<head>`: Cascadia font CSS (jsDelivr), Cloudflare Analytics beacon, JSON-LD schema include, preconnect hints |
| `_includes/footer-ip.html` | Footer IP/location widget: fetches ipapi.co, caches in localStorage 24hr |
| `_includes/schema.html` | JSON-LD structured data for posts (Article/HowTo), rendered via `page.schema_type` front matter |

### Assets

| Path | Purpose |
|---|---|
| `assets/css/custom.css` | All CSS overrides: Dracula palette, fonts, code blocks, copy button, TOC sidebar, repo cards, search, navbar, tables, pagination |
| `assets/js/post-enhancements.js` | Loaded on all posts via `_config.yml` defaults: TOC generation, copy button, scroll spy |
| `assets/js/github-repos.js` | Loaded on projects page only via front matter: GitHub API fetch, localStorage cache (24hr, key `btr_v1_github_repos`), repo card rendering |
| `assets/img/avatar-icon.png` | Avatar image used in navbar and about page |

### Other

| Path | Purpose |
|---|---|
| `.well-known/security.txt` | RFC 9116 security contact file |
| `SECURITY.md` | Vulnerability reporting policy |
| `CLAUDE.md` | Claude Code context: writing style, colour palette, design patterns, workflow |
| `docs/backlog.md` | Feature backlog (gitignored) |
| `docs/published-log.md` | Draft and publish history (gitignored) |
| `docs/superpowers/` | Implementation specs and plans from Claude Code sessions (gitignored) |
| `.claude/commands/` | Custom Claude Code slash commands: `/draft-post`, `/seo-audit` (gitignored) |

## Content workflow

1. Notes live in an Obsidian vault at `../ObsidianVault` (relative to this repo)
2. `/draft-post` command browses the vault and generates a structured draft
3. Draft lands in `_drafts/` (gitignored, never committed)
4. Review and edit the draft
5. Move to `_posts/YYYY-MM-DD-slug.md` and push
6. GitHub Pages builds and deploys automatically

## Running locally

```bash
bundle install
bundle exec jekyll serve --drafts
```

Requires Ruby and Bundler. The site runs at `http://localhost:4000`.

## Key customisations

- **Dracula palette** applied via `custom.css` and `_config.yml` colour tokens
- **Fonts:** CaskaydiaCove NF (body) and CaskaydiaMono NF (code) via jsDelivr CDN
- **Security headers** injected by Cloudflare Transform Rules (not in repo)
- **Post defaults** in `_config.yml` auto-load `post-enhancements.js` on every post
- **Projects page** fetches GitHub repos client-side, excludes `mbonne.github.io`, caches 24hr in localStorage
