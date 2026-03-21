---
layout: post
title: "Cloudflare Web Analytics on GitHub Pages"
subtitle: "Privacy-respecting analytics with zero code changes"
tags: [cloudflare, github-pages, analytics, infrastructure]
---

If your GitHub Pages site runs behind a Cloudflare proxy, you can have page-level analytics running in about two minutes without touching a single line of code. No cookies, no fingerprinting, no third-party trackers.

This is a quick walkthrough of the setup for buildtestrun.com.

## What Cloudflare Web Analytics gives you

Before getting into the steps, it is worth being clear on what this product is and is not.

Cloudflare Web Analytics is a separate product from the per-domain traffic graphs under Analytics & Logs. That tab shows network-level data: requests, bandwidth, threats. Useful, but it does not tell you which pages people are reading.

Web Analytics gives you:

- Page views and unique visitors
- Top pages by traffic
- Referrer sources
- Country breakdown
- Device, browser, and OS split
- Core Web Vitals (load performance per page)

What it does not do: track individuals, set cookies, or build profiles. It is privacy-respecting by design and [GDPR-compliant without a cookie banner](https://www.cloudflare.com/web-analytics/).

## Prerequisites

- Domain is proxied through Cloudflare (orange cloud icon in DNS settings, not grey)
- Access to the Cloudflare account that manages the domain

If your domain shows grey cloud (DNS-only), automatic injection will not work. You would need to add a JS beacon to your site instead.

## Setup

**1. Open the Web Analytics section**

Log into [dash.cloudflare.com](https://dash.cloudflare.com). From the main account screen, find "Web Analytics" in the left sidebar. This is at the account level, not inside a specific domain.

**2. Add your site**

Click "Add a site". Enter your domain (e.g. `buildtestrun.com`). Cloudflare will detect that the domain is already on your account.

**3. Choose automatic setup**

When prompted for setup method, select "Automatic". Because the site is proxied, Cloudflare injects the analytics beacon at the edge without any changes to your HTML. You do not need to touch your site's code.

If you see a JS snippet instead of an automatic option, your domain is likely DNS-only rather than proxied.

**4. Confirm and finish**

Review the summary and confirm. That is it.

## What happens next

Data starts appearing in the Web Analytics dashboard within 24 hours, usually sooner. The interface shows a 24-hour view by default. Give it a day before expecting meaningful numbers.

The dashboard is at dash.cloudflare.com under Web Analytics. Your site will appear in the list with a live view of traffic.

## What you do not get

Worth setting expectations correctly:

- No session recording
- No heatmaps
- No conversion funnels
- No individual user journeys

Cloudflare Web Analytics is not a replacement for Google Analytics if you need that level of detail. For a technical blog where you want to know which articles get read and where readers come from, it is more than enough.

## Summary

| Step | Where |
|---|---|
| Navigate to Web Analytics | dash.cloudflare.com, account-level sidebar |
| Add site | Enter domain, select automatic setup |
| Confirm | No code changes required |
| View data | Web Analytics dashboard, live within 24h |

---

For sites not behind Cloudflare proxy, the manual JS beacon approach is straightforward - Cloudflare provides a one-line script tag to drop into your page `<head>`. That is a five-minute job if you ever need it for a different project.
