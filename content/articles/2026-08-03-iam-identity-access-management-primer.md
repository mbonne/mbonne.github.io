---
title: "IAM Primer: Authentication, Authorization, Lifecycle"
subtitle: "A field reference to the protocols and models behind modern access control"
description: "A practical survey of OAuth 2.0, OIDC, SAML, passkeys, RBAC/ABAC/ReBAC/PBAC, SCIM, and Zero Trust for engineers who need the map, not the whitepaper."
date: 2026-08-03
lastmod: 2026-08-03
categories: [security]
tags: [iam, oauth, oidc, saml, passkeys, rbac, abac, zero-trust, scim]
slug: "iam-identity-access-management-primer"
canonical_url: "https://buildtestrun.com/iam-identity-access-management-primer"
schema_type: TechArticle
---

Identity and access management gets treated as one topic when it is really four: proving who you are, deciding what you can do, managing your account over time, and the trust model wrapping all three. Vendors blur these together in marketing decks, which is how "OAuth" ends up used as a synonym for "login" in half the READMEs on GitHub. This is a field map: what each piece actually does, where it fits, and which one you reach for when.

## Authentication: proving who you are

### OAuth 2.0: delegated authorisation, not authentication

OAuth 2.0 solves one problem: letting an application act on a user's behalf against a resource it does not control, without handing over the user's password. A calendar app requesting read access to your Google Drive is the canonical case. The output is an access token scoped to specific permissions, nothing more.

The access token carries no reliable claim about who the user is, only what the token bearer is allowed to do. Treating an OAuth access token as proof of login is the most common IAM mistake in application code, and it is why the [IETF RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) spec itself never uses the word "authentication."

### OIDC: the authentication layer on top of OAuth 2.0

OpenID Connect closes that gap by adding an `id_token`, a signed JWT carrying identity claims (subject, name, email, issuer) alongside the OAuth access token. Under the hood it is still an OAuth 2.0 flow with an extra `openid` scope and a defined token format, standardised by the [OpenID Foundation](https://openid.net/specs/openid-connect-core-1_0.html).

Practically: if a login flow issues an `id_token` and validates it against the issuer's JWKS endpoint, that is OIDC. If it only issues an `access_token` and calls a userinfo-style API to guess identity, that is OAuth doing a job it was not built for.

### SAML: XML-based SSO, enterprise legacy

SAML 2.0 predates OAuth by years and solves a narrower problem within the enterprise SSO space: an identity provider (IdP) asserts a user's identity to a service provider (SP) via a signed XML assertion, typically over a browser redirect. It remains the default in large enterprise environments (Okta, Azure AD/Entra ID, Ping) because it was there first and swapping SSO integrations across hundreds of SaaS vendors is expensive.

Compared to OIDC, SAML assertions are verbose XML rather than compact JWTs, there is no native mobile-app story (it is a browser-redirect protocol), and tooling skews toward enterprise IT rather than developer-first SDKs. New builds default to OIDC; SAML support exists because a customer's IdP demands it, per [OASIS's SAML 2.0 technical overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html).

### Passkeys / WebAuthn: passwordless FIDO2

Passkeys implement the [FIDO2/WebAuthn](https://www.w3.org/TR/webauthn-3/) standard: a public/private key pair generated on the device, with the private key never leaving secure hardware (TPM, Secure Enclave, or a hardware key). The server stores only the public key and a challenge-response check replaces password entry.

This eliminates phishing at the credential layer, since there is no shared secret to type into a fake login page, and it eliminates credential-stuffing since there is no reusable password to leak from a breach elsewhere. Two variants exist: device-bound passkeys, where the private key is pinned to a single piece of secure hardware and never leaves it, and synced passkeys, where platform ecosystems (iCloud Keychain, Google Password Manager) sync the private key across a user's devices via an encrypted vault. Synced passkeys trade some of that hardware-binding guarantee for recovery convenience, which matters when evaluating them against a phishing-resistant Conditional Access requirement, see [Entra ID Passkeys by Default](/entra-passkey-default-sms-voice-retirement) for how that plays out against Microsoft's SMS/voice retirement timeline. The trade-off is device/platform dependency and recovery flow complexity when a user loses their only enrolled device, which most passkey rollouts solve with a fallback second factor during a transition period.

## Authorization: deciding what you can do

Authentication answers "who." Authorization answers "what are they allowed to do now that we know." These four models cover most of what you will encounter, in increasing order of flexibility and implementation cost.

### RBAC: role-based, simple and rigid

Users are assigned roles (`admin`, `editor`, `viewer`); roles carry permission sets. It is the default for a reason: easy to reason about, easy to audit, cheap to implement. It breaks down when access needs depend on context the role can't express, like "editors can edit their own team's documents but not other teams'." That usually forces role explosion (`editor-team-a`, `editor-team-b`, ...) until the role table becomes unmanageable.

### ABAC: attribute-based, flexible and complex

Access decisions evaluate attributes of the user, resource, and environment at request time: `user.department == resource.department AND time.hour BETWEEN 9 AND 17`. [NIST SP 800-162](https://csrc.nist.gov/pubs/sp/800/162/final) is the reference definition. ABAC solves the context problem RBAC can't, at the cost of policies that are harder to audit and reason about at a glance, since "who can access X" now requires evaluating a rule engine rather than reading a role table.

### ReBAC: relationship-based, Zanzibar-style

Access is derived from relationships in a graph: "can view" because you are a `member` of a `group` that has `viewer` on a `folder`. This is the model behind Google's internal Zanzibar system, described in Google's [Zanzibar paper](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/), and now available as open implementations like [SpiceDB](https://authzed.com/spicedb) and [OpenFGA](https://openfga.dev/). ReBAC is the natural fit for consumer-scale sharing models (Google Docs, Slack channels, GitHub repos) where permissions nest through ownership and membership chains rather than static roles.

### PBAC: policy-based, OPA-driven

Authorization logic is externalised into a dedicated policy engine, most commonly [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) using the Rego language, so policy changes ship independently of application code and get evaluated consistently across services. PBAC is less a distinct data model than an architectural choice: you can implement RBAC, ABAC, or ReBAC-style logic inside a policy engine. The value is centralising and versioning the decision logic rather than scattering `if user.role == 'admin'` checks through a codebase.

## Identity lifecycle: managing accounts over time

Authentication and authorization are point-in-time checks. Lifecycle is what keeps the underlying account data correct as people join, move teams, and leave.

### SCIM: cross-domain identity provisioning

The [SCIM 2.0](https://datatracker.ietf.org/doc/html/rfc7644) protocol standardises how an identity provider pushes user create/update/deactivate events to downstream applications over a REST API. Without SCIM, deprovisioning a leaver means manually visiting every connected SaaS app; with it, disabling the user in the IdP cascades automatically. This is the control that closes the single biggest access-review gap in most organisations: the ex-employee who still has an active session three SaaS tools away from HR's system of record.

### JIT Provisioning: create user at first login

Just-in-time provisioning creates the local account record on first successful authentication rather than pre-provisioning it, using claims from the OIDC/SAML assertion to populate the profile. It reduces provisioning overhead for large user bases but means the account does not exist to audit until someone has already logged in, which is worth flagging in an access review process.

### Access Certification: periodic recertify entitlements

Also called access review or attestation: on a schedule (quarterly is common), a manager or resource owner confirms that each user's current access is still needed. This is largely a compliance control (SOC 2, ISO 27001 both require it) and it is the step most likely to be rubber-stamped rather than genuinely reviewed if the tooling makes it tedious. Entitlement lists scoped to what actually changed since the last review, rather than a full re-attestation of everything, tend to get better real scrutiny.

### Least Privilege: minimum access needed

The organising principle behind all of the above: grant the minimum access required for the current task, no more. It is easy to state and hard to operationalise, because the failure mode is invisible. Over-provisioned access does not show up as an incident until it is the blast radius of one. Access certification and JIT provisioning are both mechanisms for enforcing least privilege over time rather than only at initial grant.

## Security models: the trust architecture wrapping all of this

### Zero Trust: never trust, always verify

Zero Trust replaces the "trusted internal network, untrusted external network" perimeter model with per-request verification regardless of network location. Every request is authenticated and authorized on its own merits, not because it originated inside a VPN or office network. [NIST SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final) is the formal reference architecture.

### BeyondCorp: Google's Zero Trust implementation

BeyondCorp is Google's production implementation of Zero Trust principles, documented in a series of papers starting with [Google's original BeyondCorp paper](https://research.google/pubs/beyondcorp-a-new-approach-to-enterprise-security/). It predates the NIST formalisation and is often cited as the origin case study: access decisions based on device state and user identity, not network location, with no VPN in the trust path.

### NIST 800-207: the US government Zero Trust reference

NIST SP 800-207 generalises Zero Trust into a vendor-neutral reference architecture: policy decision points, policy enforcement points, and continuous evaluation of trust signals. It is the document federal agencies cite when implementing Zero Trust under [OMB M-22-09](https://www.whitehouse.gov/wp-content/uploads/2022/01/M-22-09.pdf), and it is a useful checklist even outside government contexts because it separates the architectural components cleanly from any specific vendor's product.

## Summary

| Category | Concept | One-line summary |
|---|---|---|
| Authentication | OAuth 2.0 | Delegated authorisation; not identity by itself |
| Authentication | OIDC | Adds signed identity token on top of OAuth 2.0 |
| Authentication | SAML | XML-based enterprise SSO, browser-redirect only |
| Authentication | Passkeys/WebAuthn | Passwordless FIDO2 public-key auth |
| Authorization | RBAC | Role-to-permission mapping; simple, breaks at scale |
| Authorization | ABAC | Attribute-evaluated rules; flexible, harder to audit |
| Authorization | ReBAC | Graph-relationship derived access; Zanzibar-style |
| Authorization | PBAC | Externalised policy engine (OPA/Rego); architecture, not a model |
| Lifecycle | SCIM | Automated cross-app provisioning/deprovisioning |
| Lifecycle | JIT Provisioning | Account created at first login |
| Lifecycle | Access Certification | Periodic recertification of entitlements |
| Lifecycle | Least Privilege | Minimum access needed, enforced continuously |
| Security Model | Zero Trust | Per-request verification, no implicit network trust |
| Security Model | BeyondCorp | Google's production Zero Trust implementation |
| Security Model | NIST 800-207 | Vendor-neutral Zero Trust reference architecture |
