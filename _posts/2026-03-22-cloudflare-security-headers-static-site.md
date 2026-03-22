---
layout: post
title: "Hardening a Static Site with Cloudflare Security Headers"
description: "How to add HTTP security headers to a GitHub Pages site using Cloudflare Transform Rules, including what each header does and how to verify they're working."
date: 2026-03-22
last_modified_at: 2026-03-22
categories: [security, infrastructure]
tags: [cloudflare, security, github-pages, http-headers]
slug: "cloudflare-security-headers-static-site"
canonical_url: "https://buildtestrun.com/cloudflare-security-headers-static-site"
schema_type: HowTo
---

GitHub Pages is a capable static host, but it gives you no control over HTTP response headers. You can't set `Strict-Transport-Security`, `X-Frame-Options`, or `Content-Security-Policy` through GitHub alone. The platform doesn't expose that configuration. If your domain is proxied through Cloudflare, you can add these headers at the edge without touching your repo.

This post covers the exact steps to add security headers to a GitHub Pages site using Cloudflare Transform Rules, what the built-in Cloudflare security toggles do, and how to verify everything is working with `curl`.

Tested with Cloudflare's free plan on a GitHub Pages site with a custom domain, March 2026.

## Why security headers matter on a static site

A static site has no server-side code, no database, and no login form. You might reasonably wonder whether security headers are worth the effort. A few reasons they still are:

- **Clickjacking:** without `X-Frame-Options`, your site can be embedded in an iframe on another domain and overlaid with invisible UI to trick visitors
- **MIME sniffing:** without `X-Content-Type-Options: nosniff`, some browsers will guess at content types, which can execute scripts from files that weren't intended as scripts
- **Protocol downgrade:** without `Strict-Transport-Security`, a user who types your domain directly could be intercepted on HTTP before the redirect kicks in
- **Referrer leakage:** without a `Referrer-Policy`, navigation to external links leaks your full URL in the `Referer` header

None of these are catastrophic on a read-only blog, but they're easy to fix and audited by tools like [Mozilla Observatory](https://observatory.mozilla.org){:target="_blank" rel="noopener noreferrer"} and [securityheaders.com](https://securityheaders.com){:target="_blank" rel="noopener noreferrer"}, which score your site publicly. Worth having them right.

## How Cloudflare header injection works

Cloudflare operates as a reverse proxy in front of GitHub Pages. Requests reach Cloudflare first, Cloudflare fetches from GitHub Pages, and then returns the response to the visitor with any modifications you've configured applied in transit.

[Response Header Transform Rules](https://developers.cloudflare.com/rules/transform/response-header-modification/){:target="_blank" rel="noopener noreferrer"} let you add, modify, or remove headers on responses before they leave Cloudflare's edge. They run on every matching request, require no code changes to your site, and don't affect caching behavior.

The free plan includes 10 active Transform Rules.

## Step 1: Enable the built-in security toggles

Cloudflare's Rules section has a Settings page with managed toggles that handle some headers automatically. Navigate to **your domain > Rules > Settings** and enable:

- **Add security headers:** adds `X-Content-Type-Options: nosniff` and `X-XSS-Protection: 1; mode=block` to all responses
- **Remove "X-Powered-By" headers:** strips the `X-Powered-By` response header, which can reveal server software versions

These come from Cloudflare's Managed Transforms. They're worth enabling because they handle the low-risk, universally-safe headers without requiring you to configure them manually.

## Step 2: Create a custom response header rule

The built-in toggles don't cover everything. For the remaining headers, create a custom rule under **Rules > Overview > Create rule > Modify response header**.

Configure the rule:

- **Rule name:** something like `GitHubSecurityHeaders`
- **When:** set the expression to match your domain, for example `(http.host eq "yourdomain.com")`
- **Then:** add headers (select "Set" for each)

Add these headers:

| Header name | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |

**`Strict-Transport-Security`** tells browsers to only use HTTPS for your domain for one year (`max-age=31536000`). `includeSubDomains` extends this to any subdomains. Don't add `preload` until you're certain your entire domain is HTTPS-only. Once you submit to the preload list, removal takes months.

**`X-Frame-Options: SAMEORIGIN`** prevents your pages from being embedded in iframes on other domains. If you never embed your own site in an iframe, `DENY` is stricter, but `SAMEORIGIN` is the safe default.

**`Referrer-Policy: strict-origin-when-cross-origin`** sends the full URL as referrer for same-origin requests, but only the origin (no path or query string) for cross-origin requests. This is the browser default in modern versions but worth setting explicitly.

**`Permissions-Policy`** declares that this site doesn't use geolocation, microphone, or camera. Browsers use this to block feature access even if JavaScript tries to request it.

Save and deploy the rule.

## Step 3: Add Content-Security-Policy

CSP is the most powerful header and the most likely to break things. It defines exactly which origins are allowed to load scripts, styles, fonts, and other resources. Anything not on the list gets blocked.

Before writing the policy, audit what your site actually loads. A quick way is `curl -s https://yourdomain.com | grep -E '(script src|link rel)'`. On this site, that revealed:

- Scripts from `unpkg.com` (search), `code.jquery.com`, `cdn.jsdelivr.net` (Popper), `stackpath.bootstrapcdn.com` (Bootstrap), and `static.cloudflareinsights.com` (analytics beacon)
- Stylesheets from `cdn.jsdelivr.net` (custom fonts), `cdnjs.cloudflare.com` (Font Awesome), and `stackpath.bootstrapcdn.com` (Bootstrap CSS)
- API calls to `api.github.com` and `ipapi.co`

Depending on some of the other settings for your domain, Cloudflare can also injects its own inline scripts: Rocket Loader, email obfuscation, and bot management. This means `'unsafe-inline'` is unavoidable while those features are enabled. A policy without it would break Cloudflare's own tooling.

The resulting CSP for this site:

```
default-src 'self';
script-src 'self' 'unsafe-inline' unpkg.com code.jquery.com cdn.jsdelivr.net stackpath.bootstrapcdn.com static.cloudflareinsights.com;
style-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com stackpath.bootstrapcdn.com;
font-src 'self' cdn.jsdelivr.net cdnjs.cloudflare.com;
connect-src 'self' api.github.com ipapi.co cloudflareinsights.com;
img-src 'self' data:;
frame-src 'self'
```

Note that `stackpath.bootstrapcdn.com` appears in both `script-src` and `style-src`. Bootstrap loads both a JS file and a stylesheet from that origin. Missing either one breaks the layout. The curl audit catches script tags but not all stylesheet links, so always verify in DevTools after deploying CSP.

Add this as a single line `Content-Security-Policy` header in the same Transform Rule as your other headers.

After deploying, open the site in a browser and check the DevTools console for CSP violation errors. Any blocked resource will appear there with the directive that blocked it and the source URL that needs whitelisting.

## Step 4: Verify with curl

Once the rule is deployed, verify what browsers actually receive:

```bash
curl -sI https://yourdomain.com | grep -iE '(strict-transport|x-frame|x-content|referrer|permissions|content-security)'
```

Expected output on this site:

```
referrer-policy: strict-origin-when-cross-origin
permissions-policy: geolocation=(), microphone=(),camera=()
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
strict-transport-security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'; script-src ...
```

You may see some headers duplicated. For example, `X-Frame-Options` appears in both the GitHub Pages response and your Cloudflare rule. Browsers handle duplicate headers by using the last value, and since both values are identical (`SAMEORIGIN`), there's no functional issue.

## A note on overlapping headers

Running `curl` revealed that GitHub Pages already sends some security headers: `X-Frame-Options`, `X-Content-Type-Options`, and an older `Referrer-Policy: same-origin`, which creates duplicates with the Cloudflare-injected versions. This is harmless, but if tidiness matters, you can use a Cloudflare rule to remove the GitHub-supplied headers before your rule sets them.

The built-in "Add security headers" toggle and a custom rule also overlap on `X-Content-Type-Options`. Again, harmless. Both set `nosniff`. Pick one or the other if you want a clean header list.

## Summary

| Header | Where to configure |
|---|---|
| `X-Content-Type-Options` | Rules > Settings > "Add security headers" |
| `X-XSS-Protection` | Rules > Settings > "Add security headers" |
| `Strict-Transport-Security` | Custom Transform Rule |
| `X-Frame-Options` | Custom Transform Rule |
| `Referrer-Policy` | Custom Transform Rule |
| `Permissions-Policy` | Custom Transform Rule |
| `Content-Security-Policy` | Custom Transform Rule |
| `X-Powered-By` removal | Rules > Settings > "Remove X-Powered-By" |

The full Cloudflare documentation for Transform Rules is at [developers.cloudflare.com/rules/transform](https://developers.cloudflare.com/rules/transform/){:target="_blank" rel="noopener noreferrer"} and the response header modification reference is at [developers.cloudflare.com/rules/transform/response-header-modification](https://developers.cloudflare.com/rules/transform/response-header-modification/){:target="_blank" rel="noopener noreferrer"}.
