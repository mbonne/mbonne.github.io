---
layout: post
title: "Hardening Your Cloudflare Account"
subtitle: "Account security basics and zone-level hardening for a solid starting position"
description: "A practical guide to locking down your Cloudflare account: 2FA, API tokens, DNSSEC, SSL/TLS Full Strict, security headers via Transform Rules, and audit logging."
date: 2026-03-21
last_modified_at: 2026-03-21
tags: [cloudflare, security, dns, hardening]
schema_type: Article
---

Cloudflare sits in front of your traffic, manages your DNS, and holds API credentials that can modify both. That makes the account itself a meaningful target. This post covers the fundamentals of locking it down properly, starting at the account level and working down to zone configuration.

All references link to [Cloudflare's documentation](https://developers.cloudflare.com/).

---

## Account Security

### Two-Factor Authentication

Enable it first, before anything else. Cloudflare supports TOTP authenticator apps and hardware security keys.

**Dashboard > My Profile > Authentication > Two-Factor Authentication**

Hardware keys (FIDO2/WebAuthn) are the stronger option. Authenticator apps are acceptable. SMS is not available as an option, which removes one of the more common weak points in 2FA implementations.

If you manage an organisation account with multiple members, enforce 2FA at the account level. Members who have not enabled it should not have access.

### API Tokens, Not Global API Keys

Cloudflare has two mechanisms for API access: the Global API Key and API Tokens.

The Global API Key is the legacy method. It has access to everything your account can touch, cannot be scoped, cannot be expired, and cannot be restricted by IP. Per [Cloudflare's own documentation](https://developers.cloudflare.com/fundamentals/api/get-started/keys/), it is not recommended for new customers, and existing use should be migrated off it.

API Tokens are the correct approach. When creating a token:

- Scope it to the minimum permissions required (read vs edit, specific zones vs all zones)
- Set an expiration date for tokens used in automation pipelines
- Add client IP filtering if the token will only be used from known infrastructure

**Dashboard > My Profile > API Tokens > Create Token**

Cloudflare provides templates for common use cases (DNS editing, zone read-only, etc.) as a starting point. The token secret is shown once. Treat it like a private key.

If you suspect a token has been compromised, revoke it immediately from the same page and issue a replacement. Rotation should be routine for any long-lived token.

### Audit Logs

Every login, configuration change, and zone modification is recorded in the audit log and retained for 18 months. This is available on all plan types.

**Dashboard > Manage Account > Audit Log**

You can filter by user email, zone, and date range. Check this periodically, and specifically after any access review or suspected incident. If you are running multiple team members on the account, this is how you establish what changed and when.

Enterprise accounts can push audit logs to external storage via Logpush. For individual accounts, periodic manual review is the minimum bar.

### Session Management

Cloudflare's dashboard sessions time out after 72 hours of inactivity. You can view all active sessions and revoke any of them except your current one.

**Dashboard > My Profile > Sessions**

Sessions show device type, browser, IP address, and last activity. If you see a session you do not recognise, revoke it and change your password.

---

## Zone Hardening

### SSL/TLS: Full (Strict)

**Dashboard > [your zone] > SSL/TLS > Overview**

The default setting is Flexible, which encrypts traffic between the visitor and Cloudflare but sends it to your origin unencrypted. That is not acceptable if you have any control over your origin configuration.

Set it to **Full (Strict)**. This requires a valid certificate on the origin. For GitHub Pages, Cloudflare's own origin certificate or Let's Encrypt both satisfy this. Full (Strict) verifies the certificate chain, which prevents Cloudflare from silently accepting a misconfigured or substituted origin.

Reference: [Cloudflare SSL/TLS encryption modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)

### DNSSEC

**Dashboard > [your zone] > DNS > Settings**

DNSSEC signs your zone's DNS records so resolvers can verify they have not been tampered with in transit. Without it, DNS responses are unauthenticated and susceptible to cache poisoning.

Enable DNSSEC in the Cloudflare dashboard, then add the DS record Cloudflare provides to your registrar. The dashboard walks through this. Once the DS record propagates, DNSSEC is active.

Reference: [Enable DNSSEC](https://developers.cloudflare.com/dns/dnssec/)

### Minimum TLS Version

**Dashboard > [your zone] > SSL/TLS > Edge Certificates**

Set the minimum TLS version to 1.2. TLS 1.0 and 1.1 have known weaknesses and no current browser requires them. TLS 1.3 is supported by Cloudflare and negotiated automatically where the client supports it.

### Opportunistic Encryption and Automatic HTTPS Rewrites

Both are under **SSL/TLS > Edge Certificates**.

- **Opportunistic Encryption** advertises HTTPS support via DNS so supporting clients can upgrade automatically
- **Automatic HTTPS Rewrites** rewrites `http://` links in your HTML to `https://` at the edge, reducing mixed content issues

Enable both. Neither has meaningful downside for a site already serving HTTPS.

### Security Headers via Transform Rules

HTTP security headers are not set by default. Adding them via Cloudflare Transform Rules means they apply without touching your origin.

Useful headers for a static site:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Dashboard > [your zone] > Rules > Transform Rules > Modify Response Header**

Create a rule matching all requests (`true` expression) and add the headers as static values.

Reference: [Transform Rules](https://developers.cloudflare.com/rules/transform/)

### Notifications

**Dashboard > Notifications**

Set up alerts for events relevant to your account: zone changes, DDoS alerts, certificate expiry, and security events. Free accounts have access to a subset of notifications; the ones covering certificate expiry and zone changes are available at no cost.

---

## Summary

| Area | Action |
|---|---|
| Account | Enable 2FA with authenticator app or hardware key |
| API access | Use scoped API Tokens, not the Global API Key |
| Audit logs | Review periodically; baseline is monthly |
| Sessions | Check for unrecognised sessions after any incident |
| SSL/TLS | Set to Full (Strict) |
| DNSSEC | Enable and add DS record at registrar |
| TLS version | Minimum 1.2 |
| Security headers | Add via Transform Rules |
| Notifications | Enable certificate expiry and zone change alerts |

None of this is exotic. It is the baseline a Cloudflare account should be at before you rely on it for anything production.
