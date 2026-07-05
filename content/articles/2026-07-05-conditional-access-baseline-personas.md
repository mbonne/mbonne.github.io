---
title: "Conditional Access Baselines: Small Policies, Clear Personas"
subtitle: One policy, one job. Many small persona-targeted policies beat one mega policy.
description: How to build a Conditional Access baseline on Microsoft 365 Business Premium using small persona-targeted policies, what each layer defends against, and when Entra P2 is worth the upgrade.
date: 2026-07-05
lastmod: 2026-07-05
categories: [security]
tags:
  - security
  - m365
  - entra
  - conditional-access
  - identity
slug: conditional-access-baseline-personas
canonical_url: https://buildtestrun.com/conditional-access-baseline-personas
schema_type: TechArticle
---

Most small business tenants I look at have one of two Conditional Access setups: the security defaults toggle and nothing else, or a single "Require MFA for everyone" policy someone created in 2021 and never touched again. Both are better than nothing. Neither tells you what your tenant actually enforces, and neither survives the first exception request without turning into a mess.

This post covers the approach I use and roll out to customer tenants on Microsoft 365 Business Premium: a baseline of many small policies, each targeting one persona and enforcing one control.

## Why many small policies

A single policy that tries to do everything ends up with a conditions block nobody can reason about. Every exception gets bolted onto the same exclude list, and six months later you cannot answer the only question that matters during an incident: "what does this policy actually block, and for whom?"

Splitting the baseline into small policies gives you:

- **One policy, one job.** A policy named for a single control either applies or it does not. Troubleshooting a blocked sign-in in the logs takes seconds because the failing policy name tells you why it fired.
- **Safe changes.** Adjusting session lifetime for guests cannot accidentally break MFA for admins when those live in separate policies.
- **Honest reporting.** Report-only mode works per policy. You can pilot one control on a subset of users while the rest of the baseline stays enforced.
- **Reusability.** The same policy set, minus tenant-specific apps and locations, deploys to the next tenant unchanged.

The cost is policy count. A baseline/minimum set runs to around 47 policies. That sounds unmanageable until you add the second ingredient: a naming convention and personas.

## Personas and naming

Every policy follows the same pattern:

```
CA###-<Persona>-<App>-<Control>-<Platform>
```

The number gives ordering, the persona says who, and the rest says what. `CA100-Admins-AdminPortals-MFA-Enforced-AnyPlatform` needs no documentation to understand.

Personas split the user population into groups with genuinely different risk profiles:

| Persona | Who | Risk profile |
|---|---|---|
| Global | Everyone | Baseline floor: applies to all identities |
| Admins | Privileged role holders | Highest value target, strictest controls |
| Internals | Non-admin staff | Daily drivers, balance security with usability |
| GuestUsers | External collaborators | Least trust, shortest sessions |
| ServiceAccounts | Non-interactive identities | No MFA prompts possible, lock to locations |
| Agents | AI / workload identities (Entra Agent ID) | Deny by default until explicitly allowed |

## The baseline, and why each layer exists

A condensed view of a good starting base of CA Policy below.

### Global: the floor everyone stands on

| What                                                      | Why                                                                                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Require MFA for all users, block legacy authentication    | The non-negotiables. Legacy protocols cannot do MFA, so they are an open side door until blocked                                                                                                  |
| Phishing-resistant MFA (FIDO2 / Windows Hello / passkeys) | Push-notification MFA gets phished and fatigued. Auth strength policies move users to credentials that cannot be relayed                                                                          |
| Block device code flow and authentication transfer        | Both are actively abused phishing vectors. Almost nobody legitimately needs device code flow except admins on CLI tooling, or some other edge case devices. So block broadly and exclude narrowly |
| Country allow-list plus block unknown platforms           | Your staff sign in from a small, predictable set of countries and platforms. Everything else is noise you can refuse outright                                                                     |
| MFA to register a device or change security info          | Account takeover usually starts by registering the attacker's own MFA method. Gate the registration actions themselves                                                                            |
| Token protection on desktop clients                       | Binds tokens to the device so a stolen token replayed elsewhere fails                                                                                                                             |

> Token protection needs Entra ID P1, a Windows 10+ device that is Entra joined, hybrid joined, or registered (Server 2019+ hybrid joined also works), and a Primary Refresh Token, since bearer refresh tokens without a PRT get rejected outright. It only covers Teams, Exchange Online, and SharePoint Online today, on native Windows apps, not browser sign-ins unless you scope Client Apps to mobile apps and desktop clients. macOS 14+ and iOS/iPadOS 16+ are supported too, but still in preview: MDM-managed devices only, and they need the Microsoft Enterprise SSO plugin (or Platform SSO on macOS). Apple's native Mail and Calendar apps don't support it at all, so exclude them or users get blocked outright. Deploy in report-only mode first: [Microsoft's token protection deployment guide](https://learn.microsoft.com/entra/identity/conditional-access/deployment-guide-token-protection-windows) covers the rollout.

### Admins: assume they are being hunted

| What                                                                         | Why                                                                                                                                     |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| MFA and phishing-resistant auth strength for privileged roles                | Admin credentials are the jackpot; they get the strongest credential requirement, always                                                |
| Compliant device required for admin sign-in                                  | A phished admin password is useless without a managed machine (don't block your admin access though...)                                 |
| Short sign-in frequency, no persistent browser, continuous access evaluation | Admin sessions should die quickly and revoke near-instantly on risk events                                                              |
| Protected actions: step-up before CA policy changes                          | The baseline protects the tenant; this protects the baseline. Modifying Conditional Access itself requires fresh phishing-resistant MFA |

### Internals: secure defaults that stay usable

| What                                                                             | Why                                                                                                                    |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| App protection policies on iOS and Android                                       | BYOD reality: manage the app container, not the personal phone                                                         |
| Block admin and attacker tooling (Graph PowerShell, Azure CLI, Azure PowerShell) | Staff never legitimately run these, but post-phish attackers always do. Cheap to block, loud in the logs when it fires |
| Block Azure management plane                                                     | MFA-gating the Azure portal is not enough when staff have no business being there at all                               |
| Session limits on unmanaged devices                                              | Unmanaged browser sessions get shorter lifetimes and no "stay signed in"                                               |

### Guests, service accounts, agents

| What                                                                       | Why                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guests: MFA, short sessions, blocked from everything not explicitly shared | External identities get the least standing trust                                                                                                        |
| Service accounts: location-locked, inert until accounts exist              | Non-interactive identities cannot answer MFA prompts, so pin them to known egress IPs instead                                                           |
| Agents: block all AI agent identities by default                           | Entra Agent ID is new. Deny-by-default now beats retrofitting controls after agents appear in the tenant (Preview at the moment...new license incoming) |

One more structural rule: a single break-glass exclusion group referenced by every policy, containing one cloud-only emergency account. Not two groups, not per-policy excludes. One group, audited, with a passkey on the account. Do not be that admin on reddit...

## Watch these before you build

Inspiration and knowledge shared by these youtubers is immensely valuable. Worth while subscribing to their channels:

- [Step-by-Step Guide to Building Conditional Access Baselines](https://youtu.be/NSqfUZM7ql8) by Threatscape. The persona-based framework this post's approach borrows heavily from.
- [3 Conditional Access Policies Every Microsoft 365 Tenant Needs Day One](https://youtu.be/0sJtdDqiHwU) by Jonathan Edwards. If 47 policies sounds like too much, start here; these three cover the worst of it.
- [Microsoft Entra ID Conditional Access Updates & Best Practices 2025](https://youtu.be/w8nZ0TafX-A) by Andy Malone. Current-state features including auth strengths, token protection, and what changed recently.
- [Your Conditional Access Policies Suck](https://youtu.be/z6P5EDakUtE) by T-Minus365. Where common policy sets fall short against current attacks (token theft, AiTM) and how to close the gaps.

## The Business Premium caveat

Everything above runs on Microsoft 365 Business Premium, which includes Entra ID P1. That matters because plenty of CA guidance online quietly assumes Entra ID P2, and a chunk of it will not work on your license:

- **No risk-based Conditional Access.** Sign-in risk and user risk conditions need Identity Protection (P2). Imported template policies referencing risk conditions silently do nothing on P1; delete them rather than leaving dead policies in the tenant.
- **No Privileged Identity Management.** Admin roles are standing assignments, so the compensation is keeping standing assignments minimal and wrapping them in the strict admin persona controls above.
- **No Restricted Management Administrative Units, no access reviews.**

A P1 baseline compensates with static controls: geography, platform, device state, auth strength, session limits. It works, but it is deterministic; it cannot react to a sign-in that merely looks wrong.

## When Entra P2 starts earning its money

Reasons to consider stepping up from Business Premium's P1:

- **Risk-based policies.** "Block high-risk sign-ins" and "force password change on high user risk" catch credential compromise your static rules never see: impossible travel, leaked credential matches, token anomalies detected by Microsoft's signals.
- **PIM.** Just-in-time admin elevation with approval and time limits removes standing privileged access, which is the single biggest structural risk in most small tenants. All of the admin persona controls above become defense in depth rather than the only line.
- **Access reviews.** Guest sprawl and stale group memberships get an automated cleanup loop instead of an annual manual audit that never happens.
- **Restricted management AUs.** Protects your break-glass and security groups from helpdesk-tier role holders.

For a small business the honest calculus: P1 plus the baseline above covers the attacks that actually hit small tenants, which are phishing and legacy auth spraying. P2 becomes worth it when you have real admin headcount, meaningful guest collaboration, or compliance requirements that expect risk-based response. If the license budget appears, PIM and risk-based CA are the first two features to switch on.

## Audit the baseline after you build it

Deploying the policies is not the finish line. A baseline drifts the moment someone adds an exclusion during an incident and forgets to remove it, or a new app registration slips through without being scoped into the right persona.

- **Re-check report-only policies.** Anything left in report-only past the pilot window is not protecting anyone. Sweep for these on a schedule, not just at rollout.
- **Review exclusion lists.** Every exclusion added under pressure (a locked-out exec, a broken legacy integration) is a standing gap until someone removes it. Diff exclusion lists against a known-good baseline periodically.
- **Confirm break-glass accounts are still excluded correctly** and that their credentials and monitoring have not rotted since setup.
- **Run an automated benchmark.** [Maester](https://maester.dev/) checks your tenant's CA policies (and broader Entra config) against Microsoft and CISA security baselines and gives you a pass/fail score instead of a manual read-through of 47 policies.
- **Reconcile against sign-in logs.** Confirm policies are firing for the personas they target, not silently no-oping because of a scoping mistake or a licensing gap (see the P1 caveat above).

Treat this as a recurring task, not a one-time close-out step after the initial build.

## Wrap-up

Conditional Access is the closest thing Microsoft 365 has to a firewall ruleset for identity. Treat it like one: many small explicit rules, named consistently, targeting defined populations, with a documented emergency bypass. One mega policy is the identity equivalent of `allow any any` with a comment saying "TODO: tighten later".
