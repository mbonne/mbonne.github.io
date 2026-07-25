---
title: "Entra ID Passkeys by Default: SMS/Voice Retirement"
subtitle: "Microsoft's fixed timeline for moving Entra ID off SMS and voice MFA, through February 2027"
description: "Entra ID is switching to passkeys by default and retiring SMS and voice MFA on a fixed schedule through February 2027. Key dates and what to check now."
date: 2026-07-25
lastmod: 2026-07-25
categories: [security]
tags: [m365, entra, conditional-access, security, passkeys, mfa]
slug: "entra-passkey-default-sms-voice-retirement"
canonical_url: "https://buildtestrun.com/entra-passkey-default-sms-voice-retirement"
schema_type: TechArticle
---

Source: [a YouTube walkthrough](https://youtu.be/a9942fdapZg) of Microsoft's announcement, checked against Microsoft Learn.

Microsoft Entra ID is retiring native SMS and voice as MFA methods and switching the default sign-in experience to passkeys, on a fixed schedule with no opt-out past February 2027.

## Timeline

| Date | What happens |
|---|---|
| **1 Sept 2026** | Passkeys become the default sign-in experience. Any user currently enabled for SMS or voice is auto-enrolled into a passkey profile, and the Registration Campaign switches to Microsoft-managed for that group, meaning Microsoft nudges them to register a passkey at their next MFA sign-in. Snoozing is unlimited at this point, so it is a nudge, not a block. |
| **18 Sept 2026** | Microsoft publishes details on customer-managed telecom providers (Microsoft Security Store) for organisations that still need SMS/voice for a genuine regulatory or operational reason. |
| **30 Oct 2026** | Telecom provider options go live in the Security Store. You can select and configure a third-party provider to keep SMS/voice working past retirement. |
| **1 Feb 2027** | Microsoft-provided SMS and voice delivery is fully retired. If you have not configured a customer-managed provider, those methods stop working for MFA and SSPR. Users whose *only* MFA method is SMS/voice get a **blocking** passkey registration prompt: no skip option, no opt-out, enforced for every tenant. |

A temporary opt-out from the Sept 2026 to Feb 2027 auto-enrollment is available for tenants that need time to run their own migration or stand up a telecom provider. API support for that opt-out lands 1 Aug 2026.

Full retirement table and FAQ in Microsoft's own doc: [Passkeys by default and retirement of Microsoft-provided SMS and voice authentication](https://learn.microsoft.com/entra/identity/authentication/concept-sms-voice-retirement).

## Passkey types in Entra

Entra supports two passkey types, covered in detail in [What are passkeys?](https://learn.microsoft.com/entra/identity/authentication/concept-authentication-passkeys-fido2)

- **Device-bound.** Created and stored on one device: hardware security keys, Passkey in Microsoft Authenticator, Entra passkey on Windows (Windows Hello). Not portable between devices.
- **Synced.** Stored in a platform credential manager and synced across a user's devices: iCloud Keychain, Google Password Manager, or a password manager such as Bitwarden, Keeper, or 1Password.

**Mac and Touch ID.** There is a device-bound option for macOS beyond iCloud Keychain sync: [Platform SSO with Secure Enclave](https://learn.microsoft.com/entra/identity/devices/macos-psso#passwordless-authentication). With the Secure Enclave authentication method and [`UserSecureEnclaveKeyBiometricPolicy`](https://learn.microsoft.com/entra/identity/devices/macos-psso#microsoft-platform-sso-usersecureenclavekeybiometricpolicy) enabled, the resulting key can be used as a WebAuthn passkey and Touch ID is required to access it. Requirements per [Intune's Platform SSO guide](https://learn.microsoft.com/intune/device-configuration/settings-catalog/configure-platform-sso-macos): macOS 13 or later for Secure Enclave generally, macOS 14.6 or later for the Touch ID biometric policy specifically, and a Touch ID-capable Mac.

Microsoft documents the full Secure Enclave and Touch ID configuration only through Intune's Settings Catalog. Their [MDM walkthrough](https://learn.microsoft.com/intune/device-configuration/templates/configure-enterprise-sso-plugin-macos) covers just the SSO app extension (redirect SSO for M365 app sign-in), not the Secure Enclave passkey scenario. Platform SSO is Apple's native `ExtensibleSSO` MDM payload rather than an Intune-only mechanism.

**Trade-offs.** Device-bound keys are the stronger phishing-resistant option, since the private key never leaves hardware, but they are painful if a device is lost and the user has no second registered method. Synced passkeys are more convenient for users who already live in a password manager, and easier to recover, but they widen the trust boundary to whatever secures that sync account: Apple ID, Google account, or vault master password.

For most small business tenants, a mixed approach makes sense: device-bound (Authenticator or Windows Hello) as the primary for anyone on a managed device (or a Global Administrator user), synced passkeys via an existing password manager as a fallback or for BYOD users. Deployment steps for either type are in [Plan a passkey deployment in Microsoft Entra ID](https://learn.microsoft.com/entra/identity/authentication/how-to-deploy-phishing-resistant-passwordless-authentication) and [Enable passkeys (FIDO2) for your organisation](https://learn.microsoft.com/entra/identity/authentication/how-to-authentication-passkeys-fido2).

## Other things this affects

- **SSPR.** Self-service password reset also loses native SMS/voice as a method on the same schedule. If SSPR is part of your recovery flow, it needs the same review as MFA.
- **B2B and guest users.** Passkey support for B2B and guest users is planned by end of 2026, and they are in scope for the SMS/voice retirement too. OTP via email might also be a viable option.
- **Legacy MFA/SSPR policy.** If you have not already migrated off the legacy per-user MFA and SSPR policies into the Authentication Methods Policy, that migration deadline (30 Sept 2025) has already passed. Do that before touching anything above. Details: [Configure Microsoft Entra multifactor authentication settings](https://learn.microsoft.com/entra/identity/authentication/howto-mfa-mfasettings#mfa-service-settings).

## Finding who is affected in your tenant

Before planning anything, find out how exposed you are. In the Entra admin centre: **Entra ID > Authentication methods > User registration details** shows registered methods and each user's default MFA method.

For a proper report, Microsoft publishes a PowerShell script for exactly this: [microsoft/entra-sms-voice-usage-analyzer](https://github.com/microsoft/entra-sms-voice-usage-analyzer). Run it with Global Reader, Authentication Policy Administrator, or Security Reader. Any non-zero result means you are in scope and need a plan before September.

## Registration campaign

Rather than waiting for Microsoft to flip the Registration Campaign to Microsoft-managed on 1 Sept, turn it on now for your SMS/voice population: **Entra ID > Authentication methods > Registration campaign**, set state to Microsoft Managed, target the security group of SMS/voice users. It is the lowest-effort way to move users at scale without a help desk spike, and running it early gives you runway before the campaign becomes mandatory.

Have a short KB article ready for end users before flipping this on. Passkey registration is straightforward for most people, but "why is Microsoft asking me to set up something on my phone" will still generate tickets the first week. A one-page walkthrough per platform (Windows Hello, iOS, Android) heads most of that off.

## Wrap-up

1. Know your SMS/voice MFA population.
2. Decide per persona: passkey migration versus customer-managed telecom provider (Security Store, available from 30 Oct 2026).
3. Turn on the registration campaign early for in-scope users; do not wait for the Microsoft-managed default.
4. Write the KB article before user-facing prompts start.
5. If any group needs more runway, note the opt-out API lands 1 Aug 2026; plan the exception before 1 Sept, not after.
