---
title: "Website Monitoring with Grafana and AbuseIPDB Reporting"
subtitle: "Closing the loop from WAF block to IP report to dynamic blocklist"
description: "Track Cloudflare WAF blocks in Grafana, automatically report persistent bad actors to AbuseIPDB, and close the loop with a dynamic IP blocklist."
date: 2026-05-23
lastmod: 2026-05-23
categories: [homelab, security]
tags: [cloudflare, grafana, abuseipdb, waf, security, monitoring]
slug: "cloudflare-waf-grafana-abuseipdb"
canonical_url: "https://buildtestrun.com/cloudflare-waf-grafana-abuseipdb"
schema_type: TechArticle
---

> **TL;DR:** Built a Grafana dashboard to monitor this site and found the majority of traffic is automated scanners probing for vulnerabilities that do not exist here. Set up five Cloudflare WAF rules to block the worst of it, then wrote a script that pulls WAF block data, reports persistent offenders to AbuseIPDB automatically, and maintains a dynamic IP blocklist within Cloudflare's free-tier rule limits.

I set up a Grafana dashboard to monitor traffic to this site. The intent was straightforward: see who is visiting, identify any performance issues, and get a feel for how the Cloudflare layer is performing.

What I found instead was a fairly stark reminder of what the web actually looks like from the outside. The "Unique Visitors" panel showed modest numbers, as expected for a niche technical blog. The "Threats" panel, tracking firewall events and blocked requests, was running significantly higher. When you zoom out to a week, the gap between legitimate visitors and automated traffic becomes difficult to ignore.

This is one of the more practical illustrations of the dead internet theory: not the conspiratorial version, but the quieter observation that a large proportion of web traffic is bots, scrapers, scanners, and crawlers, and your content may be hitting automated systems far more often than human eyes. If you are writing for an audience, some of that audience is infrastructure.

The more concerning finding was not the volume. It was the paths being probed: `/.env`, `/wp-login.php`, `/xmlrpc.php`, `/aws_access_key_id`, and variations on that theme. This site is a Hugo-generated static site. None of those paths exist. The bots do not know that, or do not care. They are running automated scans looking for anything exploitable.

That raised an obvious question: if these IPs are actively scanning for vulnerabilities, should they be reported so other operators can benefit from that signal? And if yes, should that reporting be manual or automated?

The answer, predictably, was automated. Bot vs. bot.

This post covers the Grafana dashboard, the Cloudflare WAF rules driving the data, and the reporter script that automatically files AbuseIPDB reports and maintains a dynamic IP blocklist. The goal is to give you a concrete starting point if you want to build something similar.

## What the Dashboard Shows

![Cloudflare Analytics dashboard in Grafana showing Threats Over Time vs Unique Visitors Over Time, with a world map of traffic origins and top countries by request volume](/assets/img/posts/2026-05-23-cloudflare-waf-grafana-abuseipdb/2026-05-23-cloudflare-waf-grafana-abuseipdb-1.png)

The top-left panel, "Threats Over Time," tracks firewall events: requests that hit a WAF rule and were blocked or challenged. The spike visible around 22 May was a short campaign from a small number of IPs that triggered the bot fight mode and country block rules in rapid succession.

"Unique Visitors Over Time" sits at the top right. The contrast between the two panels is the point. Threat events routinely exceed visitor counts, sometimes significantly.

The world map shows traffic origin by volume (blue, allowed) and firewall events (red, blocked). The top countries panel on the right reflects total request volume, which is dominated by US, Canadian, and Southeast Asian infrastructure. Much of that is CDN and bot traffic, not humans.

![Grafana panel showing Firewall Actions Over Time, Top Offending IPs with AbuseIPDB status, Top Attacked Paths, and Top Firing WAF Rules](/assets/img/posts/2026-05-23-cloudflare-waf-grafana-abuseipdb/2026-05-23-cloudflare-waf-grafana-abuseipdb-2.png)

The second dashboard section breaks down the data further. Key panels:

- **Firewall Actions Over Time:** stacked bar chart showing blocks, managed challenges, and bot fight mode events by day. Useful for spotting when a campaign started and which rule caught it.
- **Top Offending IPs:** ranked by event count, with an AbuseIPDB column showing whether the IP has been reported. The "Reported" label is written back by the reporter script after a successful submission.
- **Top Attacked Paths:** confirms what kind of scanning is happening. `/.env`, `/sitemap.xml`, `/robots.txt`, and `/` dominate. The presence of `/.env` and the credential-adjacent paths confirms automated vulnerability scanning rather than misdirected human traffic.
- **Top Firing WAF Rules:** bot fight mode leads, followed by link maze (Cloudflare's bot trap), then managed challenge.

The top blocked user agent visible in the traffic fingerprinting section was a convincing Chrome UA string: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`. Spoofed headers are standard for anything trying to blend in.

The dashboard has additional panels beyond what is shown here. Cloudflare's audit logs surface more signal than most operators bother to pull: request fingerprints, TLS version distribution, ASN-level breakdowns, and more. Worth exploring if you want to go deeper than block counts.

## The WAF Rule Set

Cloudflare's free tier gives you five WAF custom rules. These are the five in use here, in processing order:

| # | Name | Match | Action |
|---|---|---|---|
| 1 | Block all countries | Country in: RU, CN, IL, NG, KP, IR | Block |
| 2 | AI Crawl Control | User-agent contains GPTBot, ClaudeBot, anthropic-ai, Bytespider, CCBot, Google-Extended, PerplexityBot, Amazonbot, Diffbot, ImagesiftBot, omgili, meta-externalfetcher, MistralAI-User (unless path is /robots.txt) | Block |
| 3 | Block unwanted probes | URI paths ending in .php, .env, .yml, .sql, .bak, .key, .pem, .conf and known credential/admin paths | Block |
| 4 | Block unused HTTP methods | POST, PUT, DELETE, PATCH, CONNECT, TRACE | Block |
| 5 | Dynamic IP blocklist | `ip.src in { ... }` | Block |

Rules 1 through 4 are static. Rule 5 is maintained programmatically.

### Country blocks

This is the bluntest rule in the set. Cloudflare's country block works on IP geolocation, which any half-competent bot operator routes around with a VPS in an unblocked country. The dashboard confirms this: the top offending IPs are frequently hosted on US, European, and Japanese infrastructure regardless of where the operator actually is.

That said, it is not useless. It cuts a measurable volume of low-effort scan traffic from regions with no legitimate audience, with zero ongoing maintenance. It just should not be mistaken for real protection. Think of it as reducing noise rather than blocking threats.

### AI crawler rule

Rule 2 carves out `/robots.txt` from the block. This site's robots.txt explicitly disallows all AI crawlers. A bot that reads robots.txt and still crawls gets blocked by the path rules anyway. The carve-out handles the rare case of a compliant bot checking permissions first and then stopping, which costs nothing to allow.

Reference: [Cloudflare WAF custom rules](https://developers.cloudflare.com/waf/custom-rules/)

### Blocking unused HTTP methods

A Hugo static site served via GitHub Pages has no endpoints accepting POST, PUT, DELETE, or PATCH. Any request using those methods is a scanner probing for a CMS, API, or form handler. Blocking them at the WAF costs nothing and removes a class of noise from the data entirely.

### Rule 5 and the five-rule ceiling

The free tier caps you at five custom rules. Rule 5 is a single rule with an IP list expression rather than one rule per IP. Cloudflare evaluates `ip.src in {ip1 ip2 ip3 ...}` as a single expression, so adding IPs does not consume additional rules. The constraint is expression length, not rule count. More on that below.

## The AbuseIPDB Reporter Script

The reporter is a scheduled script (cron, running on node1) that automates the decision of whether a blocked IP should be reported to AbuseIPDB and added to the dynamic blocklist.

It runs in three steps:

1. Pull WAF block data for the past 24 hours from the Cloudflare GraphQL Analytics API
2. For each IP exceeding a block count threshold, check its AbuseIPDB record
3. If not reported within the cooldown window: file a report, then add the IP to rule 5

The Cloudflare GraphQL API exposes WAF event data via the `firewallEventsAdaptiveGroups` node:

```python
query = """
{
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      firewallEventsAdaptiveGroups(
        filter: { datetime_geq: $start, datetime_leq: $end }
        limit: 10000
        orderBy: [count_DESC]
      ) {
        count
        dimensions {
          action
          ruleId
          clientIP
          userAgent
          clientCountryName
        }
      }
    }
  }
}
"""
```

Reference: [Cloudflare GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/)

### Reporting logic

The AbuseIPDB API returns a `lastReportedAt` timestamp and a `confidenceOfAbuse` score for any IP you query. The reporter uses both to decide whether to file:

```python
def should_report(ip, last_reported_at, block_count):
    if block_count < BLOCK_THRESHOLD:
        return False
    if last_reported_at and days_since(last_reported_at) < COOLDOWN_DAYS:
        return False
    return True
```

`BLOCK_THRESHOLD` filters out one-off hits, keeping reports focused on IPs actively scanning rather than anything that triggered a rule once. `COOLDOWN_DAYS` avoids filing repeat reports for the same persistent IP, since AbuseIPDB's value comes from aggregated signals across many reporters, not repeated submissions from one.

When a report is filed, the script writes a "Reported" label back into the dashboard data (visible in the Top Offending IPs panel), so you can see at a glance which IPs have been actioned.

### Rule bloat management

Rule 5 is an expression: `ip.src in {1.2.3.4 5.6.7.8 ...}`. Cloudflare enforces a maximum expression length. Add enough IPs and the rule update fails.

The reporter handles this by treating the list as a sliding window. When a new IP would push the expression over the length limit, the oldest entry is evicted first:

```python
def add_ip_to_blocklist(new_ip, current_list, max_expression_length):
    candidate = current_list + [new_ip]
    expression = build_expression(candidate)
    while len(expression) > max_expression_length and candidate:
        candidate.pop(0)  # drop oldest
        expression = build_expression(candidate)
    return candidate
```

IPs evicted from the list either stopped scanning (acceptable, the block is no longer needed) or are still active, in which case the next reporter run will add them back. IPs already caught by country blocks or probe path rules are redundant in the list anyway, which limits the practical cost of eviction.

The result is a blocklist that stays within Cloudflare's limits, does not require manual pruning, and does not consume additional custom rules.

## AbuseIPDB Contributor Badge

Active AbuseIPDB reporters get a contributor badge showing total reports, days active, and a reputation score. It updates live via an SVG embed.

The badge is on the [About page](/about/) of this site:

<div style="text-align: center; margin: 2rem 0;">
  <a href="https://www.abuseipdb.com/user/305460" title="AbuseIPDB is an IP address blacklist for webmasters and sysadmins to report IP addresses engaging in abusive behavior on their networks" target="_blank" rel="noopener noreferrer">
    <img src="https://www.abuseipdb.com/contributor/305460.svg" alt="AbuseIPDB Contributor Badge" style="width: 254px; border-radius: 5px; border-top: 5px solid #bd93f9; border-right: 5px solid #44475a; border-bottom: 5px solid #44475a; border-left: 5px solid #bd93f9; padding: 5px; background: #282a36 linear-gradient(rgba(255,255,255,0), rgba(255,255,255,.05) 50%, rgba(0,0,0,.15) 51%, rgba(0,0,0,0)); box-shadow: 2px 2px 1px 1px rgba(0,0,0,.4);">
  </a>
</div>

Your contributor badge SVG is at `https://www.abuseipdb.com/contributor/<your-id>.svg`. The contributor ID appears in your AbuseIPDB profile URL.

The badge is a minor addition, but it represents something real: the data produced by the reporter script feeds back into the shared blocklist that other operators query. The loop runs in both directions.

## Summary

The three components that make this work together:

1. **Grafana dashboard:** pulls WAF event data from the Cloudflare GraphQL API, visualises blocks by rule, flags top offending IPs, and surfaces the attacked paths. Seven-day default range makes scan campaigns visible.
2. **WAF rules:** five static rules for country blocks, AI crawlers, probe paths, and unused HTTP methods, plus the fifth slot used for the dynamic IP list maintained by the script.
3. **Reporter script:** scheduled job that reads WAF data, filters by block threshold, checks AbuseIPDB for recent reports, files new ones where appropriate, and updates the dynamic blocklist with sliding-window eviction to stay within expression length limits.

If most of your traffic is bots and your content is sitting in the void, you might as well make the bots work for it.
