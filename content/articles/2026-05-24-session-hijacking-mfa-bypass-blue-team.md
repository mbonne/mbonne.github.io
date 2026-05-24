---
title: "Session Hijacking in the MFA Era: A Blue Team Playbook"
subtitle: AiTM phishing and infostealers don't break MFA. They route around it.
description: How AiTM phishing and infostealers bypass MFA, what to look for in auth logs, and practical mitigations for Entra, Okta, and Google Workspace.
date: 2026-05-24
lastmod: 2026-05-24
categories: [security]
tags:
  - security
  - mfa
  - entra
  - oidc
  - incident-response
  - phishing
slug: session-hijacking-mfa-bypass-blue-team
canonical_url: https://buildtestrun.com/session-hijacking-mfa-bypass-blue-team
schema_type: TechArticle
---

## TL;DR

- **AiTM** and **BitM** phishing tools proxy the real authentication flow: the victim completes MFA legitimately, the attacker captures the post-auth session cookie and replays it from a separate device
- **Infostealers** steal session cookies directly from browser storage on disk: no phishing, no proxy, authentication bypassed entirely
- **Passkeys** and **passwordless MFA** stop AiTM and BitM (origin-bound challenge, proxy gets nothing usable) but do not stop infostealers, which skip authentication altogether
- Key log signal: successful MFA from one IP, session activity from a different IP or ASN minutes later, no second authentication event
- If you suspect compromise: revoke all sessions immediately, audit for new Authenticators, OAuth grants, and sus email rules(could be forwarding or deleting email etc), then rotate any secrets the account could have touched.

---

## Why session hijacking is the growth attack of the MFA era

MFA adoption pushed attackers upstream. If they can no longer steal a password and log in cleanly, they steal the session that exists after the password and MFA challenge have already succeeded. The authentication event looks fine. That is the point.

The data reflects this shift. Microsoft detected [147,000 token replay attacks in 2023](https://www.microsoft.com/en-us/security/security-insider/microsoft-digital-defense-report-2023), a 111% increase year-over-year. SpyCloud's [2026 Annual Identity Exposure Report](https://spycloud.com/resource/report/spycloud-annual-identity-exposure-report-2026/) identified approximately 8.6 billion stolen session artifacts in circulation, the majority used to maintain persistent access to cloud services and bypass MFA.

---

## The two ways sessions get stolen

### AiTM and BitM: intercepted at auth time

Adversary-in-the-Middle (AiTM) phishing tools operate as reverse proxies between the victim and the real identity provider. The victim lands on a convincing login page, enters credentials, and completes MFA. All of this happens against the real IdP, relayed in real time through the attacker's proxy. The proxy captures the post-authentication session cookie. During the auth flow, the browser bar shows the proxy domain, not the real IdP. A careful user might notice, but most do not, particularly when the proxy domain is a convincing lookalike and the page is pixel-perfect. Once authentication completes, the victim is redirected to the real service. The attacker imports the cookie into their own browser and resumes the session.

Browser-in-the-Middle (BitM) removes the proxy entirely. The victim is tricked into remotely controlling the attacker's already-open browser session: the attacker hands the victim a keyboard for their own machine, lets them authenticate, then takes it back. Same outcome, different mechanism.

Standard TOTP and SMS MFA do not stop either technique. The victim completed the MFA challenge correctly. The proxy relayed it. Tools in this class are [publicly available and documented](https://github.com/kgretzky/evilginx2) ([quickstart](https://help.evilginx.com/community/getting-started/quickstart)); the technique is not limited to any single tool.

### Infostealers: stolen from disk

The second vector bypasses authentication entirely. Infostealer malware reads session cookies from browser storage on the endpoint. Modern browsers store cookies on disk, encrypted with OS-level keys. Malware running with user-level privileges can decrypt and exfiltrate them.

Stolen cookies are imported into the attacker's browser. The session resumes. No login prompt, no MFA challenge, nothing to detect at the identity layer.

Passkeys and phishing-resistant MFA stop AiTM and BitM. They do not stop infostealers. There is no authentication event to resist.

A compounding risk: browser profile sync. A user logs into a personal Google or Microsoft profile on a work device and enables sync. Their personal device picks up an infostealer infection. Corporate session cookies, now synced to the personal device, are stolen. EDR on the work device sees nothing, because the compromise happened elsewhere.

### OAuth consent phishing: persistent access without a stolen cookie

A third variant skips session cookies entirely. The victim is directed to a legitimate OAuth consent screen and grants permissions to a malicious app registered in Entra, Google Workspace, or Okta. The app receives delegated access that persists beyond session expiry, survives password resets, and does not require a session token to exercise.

Huntress tracks known malicious OAuth apps in M365: [Stealthware: The Rise of Malicious OAuth Apps in Microsoft 365](https://www.huntress.com/resources/stealthware-the-rise-of-malicious-oauth-apps-in-microsoft-365). The [RogueApps project](https://huntresslabs.github.io/rogueapps/) maintains a community catalogue of known rogue OAuth applications.

---

## How a campaign runs: delivery via trusted infrastructure

The kill chain for a modern AiTM campaign rarely starts with a suspicious email. Delivery is engineered to clear every perimeter control:

1. **Reconnaissance.** Attacker identifies the target organisation, maps the IdP in use, and finds email contacts via LinkedIn or OSINT.
2. **BEC delivery.** Email arrives from a compromised or convincingly spoofed address the victim recognises(DMARC/SPF/DKIM all look good). It contains a link to a document hosted on a legitimate provider: OneDrive, SharePoint, Google Drive, or Dropbox. The email gateway checks the body URL, finds a clean Microsoft or Google domain, and passes it. Safe Links scans the same URL and sees nothing suspicious.
3. **Link in the document.** The hosted document contains the AiTM proxy URL. Two legitimate hops before the victim sees anything suspicious. DNS filtering cannot block it: the document host is onedrive.live.com or docs.google.com.
4. **Victim authenticates through the proxy.** Convincing login page, matching the real IdP. Victim enters credentials and completes MFA. Proxy relays everything to the real IdP in real time.
5. **Session cookie captured.** Proxy intercepts the post-auth token. Victim reaches the real service and notices nothing unusual.
6. **Attacker replays the session.** Cookie imported from a different country or ASN. The session is live.

---

## What to look for in auth logs

The authentication event looks clean. That is not a coincidence. In an AiTM attack, the victim completed MFA correctly against the real IdP. The sign-in log shows a successful authentication, MFA passed, risk score clean. *If the proxy forwards the victim's IP in headers, even the originating IP looks legitimate.* Standard sign-in monitoring will not flag it. The anomaly is not in the authentication event. It is in what the session does immediately after.

Four indicators to monitor across all IdPs:

- **Impossible travel.** Session authenticated in one geography, then used from a distant location minutes later. New York to Singapore in under an hour is not a VPN issue, it is a stolen token.
- **Unusual account activity.** Actions outside normal working hours, email forwarding rules created or modified, security settings changed, bulk data downloads. These are post-compromise persistence moves, not authentication events.
- **User agent change mid-session.** Different browser or OS between the auth event and subsequent access on the same session token.
- **MFA gap.** Successful authentication event with no corresponding MFA event on subsequent session activity from a new IP.

**Entra ID**

In Sign-in logs: a successful MFA event followed by session activity from a different IP, country, or ASN within minutes, with no corresponding second MFA event. Check `ipAddress` and `location` across the `SignInLogs` table. Entra Identity Protection surfaces `unfamiliarFeatures` and `anonymizedIPAddress` risk signals on replayed sessions. In Conditional Access evaluation details, look for sessions where no compliant device appears on the second entry.

MFA method is also a signal. `mfaDetail.authMethod: PhoneAppOTP` (TOTP) or `PhoneAppNotification` in the initial event indicates a phishable factor was used. Phishing-resistant authentication shows `FIDO_U2F` or equivalent.

**Okta**

In the System Log: a `user.session.start` event from IP-A, followed by resource access or `app.oauth2.token.grant` from IP-B on the same session. Okta ThreatInsight flags anomalous session reuse. Filter for `user.authentication.auth_via_mfa` events and check the `factor` field: `TOKEN:SOFTWARE:TOTP` indicates a phishable factor was used.

**Google Workspace**

Admin SDK or your SIEM: login event from IP-A, then Drive or Gmail access from IP-B on the same session within minutes. Alert Centre surfaces impossible travel detections. Where DBSC (Device Bound Session Credentials) is deployed, a replayed cookie from a different device fails the binding check before it reaches the application.

**Cross-IdP universal signal**

The most reliable indicator across all IdPs: successful MFA from a known location, followed by session activity from a new location or ASN, with no second authentication event. A change in user agent string mid-session (different browser or OS between the auth event and subsequent access) is a secondary signal worth correlating.

---

## Mitigations

### Identity and IdP layer

**Phishing-resistant MFA first.** Passwordless Authenticator and FIDO2 are origin-bound: the authentication challenge is tied to the real IdP domain, and a proxy operating from a different domain receives a challenge it cannot satisfy. Entra: passwordless Microsoft Authenticator or a FIDO2 security key. Okta: Okta FastPass or FIDO2 WebAuthn. Google Workspace: passkeys or a Titan Security Key.

This stops AiTM and BitM. It does not stop infostealers.

**Conditional Access and adaptive policy.** Require compliant or registered devices. Restrict sign-in to named locations or trusted IP ranges where practical. Block legacy authentication protocols entirely. Entra: [Conditional Access policies](https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview). Okta: Adaptive MFA with ThreatInsight. Google Workspace: Context-Aware Access.

**Session and token binding.** Entra [Token Protection](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-token-protection) (Entra ID P2) cryptographically binds tokens to the device. Google's [Device Bound Session Credentials (DBSC)](https://blog.google/security/protecting-cookies-with-device-bound-session-credentials/) takes the same approach at the browser layer. Now in public availability on Chrome 146 for Windows (macOS expanding shortly), DBSC uses the TPM on Windows and Secure Enclave on macOS to generate a hardware-backed key pair that cannot be exported from the machine. New session cookies are only issued when Chrome proves possession of the private key. A stolen cookie expires and becomes useless to the attacker before they can use it. Google has observed a significant reduction in session theft for DBSC-protected sessions since launch. Okta participated in the origin trials. The standard was co-designed with Microsoft and is progressing through the W3C. Okta also offers session token binding via its global session policy configuration.

**Short session lifetimes.** Reducing session duration limits the window a stolen cookie remains useful. Configure session lifetime policies per IdP. This is depth-in-defence, not a primary control.

**OAuth app governance.** Review and restrict which third-party apps can receive access. Entra: configure [app consent policies](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent) and require admin consent for new grants. Okta: app access governance controls. Google Workspace: OAuth app allowlisting in the Admin Console. Cross-reference approved apps against the [RogueApps catalogue](https://huntresslabs.github.io/rogueapps/).

### Network and endpoint layer

| Control                                                                    | What it does                                                                                                                                                                                                                                                                                                                       | Stops AiTM/BitM                                                      | Stops infostealers                                                 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Email gateway / Safe Links                                                 | Rewrites and scans URLs at click time                                                                                                                                                                                                                                                                                              | Partial: misses the link-in-document delivery pattern                | No                                                                 |
| DNS filtering (Cloudflare Gateway, Cisco Umbrella, NextDNS)                | Blocks known phishing domains via threat intel feeds. (some block newly seen domains)                                                                                                                                                                                                                                              | Partial: zero-day proxy domains are not yet in feeds                 | No                                                                 |
| Browser isolation (Cloudflare RBI, Zscaler, Menlo)                         | Browsing runs in a cloud container; cookies never reach the endpoint                                                                                                                                                                                                                                                               | Yes                                                                  | Yes                                                                |
| ZTNA with device posture (Cloudflare Access, Zscaler, Tailscale, Netskope) | Re-evaluates device posture per request; replayed cookie from an unmanaged device fails(Certificate Pinning/SSL Inspection)                                                                                                                                                                                                        | Yes                                                                  | Partial                                                            |
| EDR                                                                        | Detects and blocks known infostealer malware                                                                                                                                                                                                                                                                                       | No                                                                   | Partial: custom malware evades; unmanaged devices are out of scope |
| BYOD controls / device enrollment                                          | Prevents unmanaged devices from accessing corporate apps                                                                                                                                                                                                                                                                           | No                                                                   | Yes                                                                |
| ITDR (Identity Threat Detection and Response)                              | Monitors the identity plane for anomalies: impossible travel, session replay from new IP/ASN, new OAuth grants, new MFA method registrations. Alerts and can trigger automated response: revoke session, require step-up auth. Examples: Microsoft Entra ID Protection, Okta ThreatInsight, Crowdstrike Falcon Identity, Vectra AI | Partial: detects post-auth session replay, not the auth event itself | Partial: detects anomalous session behaviour after cookie theft    |

The link-in-document delivery pattern defeats email gateways and Safe Links because the email body URL is legitimate, and the malicious link inside the document is never inspected at the email layer. DNS filtering cannot block the hosting domain. Browser isolation is the most complete network-layer prevention control: the session token never exists on the endpoint regardless of how the delivery was staged. 

ITDR sits in a different category: it does not prevent the initial compromise, but it is the most likely control to detect and contain an active session hijacking incident, particularly the post-auth replay pattern that no other layer sees.

---

## Breach remediation

If session hijacking is confirmed or suspected, the below are some typical steps you need to follow at a minimum:

1. **Revoke all active sessions** for the affected account. Entra: "Revoke sessions" in the user blade. Okta: "Revoke all sessions" in the user profile. Google: "Sign out all sessions" in the Admin Console.
2. **Audit for persistence** before doing anything else: new OAuth app consents, email forwarding rules, delegated mailbox access, newly registered MFA methods. These survive session revocation.
3. **Review sign-in logs** for lateral movement during the hijacked session window.
4. **Rotate any secrets** the account could have touched: API keys, client secrets, service account credentials.
5. **Notify affected users** and require re-authentication with phishing-resistant MFA before restoring access.
6. **Preserve logs** before they roll off retention windows.

For full IR process: [NIST SP 800-61](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf) and [Microsoft's incident response overview](https://learn.microsoft.com/en-us/security/operations/incident-response-overview).
