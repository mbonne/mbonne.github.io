---
title: "Deploying Claude to Your Team: A Sysadmin Checklist"
description: "Part 2 of the Claude deployment series. The business decisions are made and the plan is active. This is the technical execution guide: SSO, MCP controls, app deployment by OS, MDM, server-managed settings, persona access, and SharePoint readiness."
date: 2026-05-17
lastmod: 2026-05-17
categories: [security, ai]
tags: [claude, sysadmin, SSO, MCP, MDM, deployment, enterprise, security, checklist]
slug: "deploying-claude-to-your-team-sysadmin-guide"
canonical_url: "https://buildtestrun.com/deploying-claude-to-your-team-sysadmin-guide"
schema_type: TechArticle
---

> **This is Part 2 of a two-part series.** [Part 1](https://buildtestrun.com/deploying-claude-safely-business-runbook) covers plan selection, data handling, usage policy, and the governance framework. This article assumes those decisions are made, your Team or Enterprise plan is active, and you are now executing the rollout.

## TL;DR

- Enable SSO via the Anthropic admin console and choose a provisioning mode (Invite only or JIT). Enforce it before users start signing up with personal accounts.
- For Claude Code: use server-managed settings to push policy without MDM. No endpoint infrastructure required on Teams or Enterprise.
- For Claude Desktop: deploy via MDM on macOS and Windows. Non-admin users cannot self-install on macOS; on Windows they can unless you block it.
- Linux users: Claude Desktop does not exist. Claude Code installs via apt, dnf, or apk.
- Gate Claude Code access by not issuing API keys or workspace Claude Code roles to roles that do not need it.
- Vet every MCP server before approving it. Treat it like a third-party software install.
- Do not give developers API keys with the Developer role when the Claude Code role is sufficient.

---

## Quick Start: Minimum Viable Secure Deployment

If you need to get Claude deployed quickly with a defensible security baseline, do these steps in order. Everything else in this article is additional hardening.

1. **Verify your domain** in the Anthropic admin console (`claude.ai/admin-settings/organization`). This is required before SSO can be configured.
2. **Enable SSO** with your existing IdP (Entra ID or Okta). Use JIT provisioning so that only users assigned to the Anthropic app in your IdP can access the workspace.
3. **Enable SSO enforcement** so users cannot bypass SSO with email/password login.
4. **Set up server-managed settings** (Teams/Enterprise) with a minimal policy: disable any features your team does not need, and set an MCP `permissions.deny` baseline for known-risky server types.
5. **Deploy Claude Desktop** via MDM to the approved user group. Do not distribute to roles that should be browser-only.
6. **Issue Claude Code access** only to developers: use the `Claude Code` API key role, not `Developer`, unless broader API access is explicitly needed.
7. **Communicate the usage policy** from Part 1 before users get access.

That covers identity, policy delivery, access tiering, and communication. The rest of this article covers each area in detail.

---

This guide covers two distinct products that may be in scope for your deployment:

- **Claude Desktop** -- the GUI application for chat, cowork, and day-to-day productivity use
- **Claude Code** -- the CLI and IDE tool for developers with direct codebase access

The deployment and policy mechanisms are different for each. Read the sections relevant to your environment.

---

## Prerequisites

- [ ] Team or Enterprise plan purchased and workspace provisioned
- [ ] Domain verified in the Anthropic admin console
- [ ] At least two admin accounts assigned (primary and backup)
- [ ] List of intended users and their roles ready
- [ ] Usage policy from Part 1 drafted and signed off

---

## SSO Configuration

SSO via SAML 2.0 ties Claude workspace access to your existing identity provider. Users authenticate through your IdP, no separate Claude credentials are needed, and deprovisioning is automatic when you remove a user from the IdP.

**Supported providers:** Microsoft Entra ID (formerly Azure AD), Okta, Google SAML, and any SAML 2.0-compliant provider. IdP-specific setup guides are linked from the SSO configuration screen.

**Configuration steps:**

1. Navigate to [claude.ai/admin-settings/organization](https://claude.ai/admin-settings/organization)
2. Under the **Authentication** section, click **Setup SSO** (or **Manage SSO**)
3. Follow the setup guide for your Identity Provider
4. Test with a non-admin account before proceeding
5. Once validated, navigate back to **Organization and access** settings to configure user provisioning

**User provisioning options (Step 5):**

- **Invite only** (default): users are added and removed manually in your Claude settings. Recommended if you want explicit control over who is provisioned.
- **Just-in-Time (JIT)**: users are automatically provisioned on first login. New users receive the User role by default. Simplest option for larger teams.
- **SCIM**: full directory sync for automatic provisioning and deprovisioning based on IdP group membership. See [Set up JIT or SCIM provisioning](https://support.claude.com/en/articles/13133195-setting-up-jit-or-scim-provisioning) for configuration.

Full walkthrough: [Set up single sign-on (SSO)](https://support.claude.com/en/articles/13132885-set-up-single-sign-on-sso)

> **Callout:** Once SSO enforcement is on, users cannot authenticate with email and password. Confirm your IdP is stable and tested before enabling enforcement. Document at least one break-glass admin account in the event of an IdP outage.

---

## Claude Code: Policy and Settings Enforcement

Claude Code (the CLI and IDE tool) has a structured settings hierarchy that controls how policy is delivered to developer machines. This section covers how to configure and enforce settings centrally.

### Settings delivery mechanisms

| Mechanism | How it's delivered | Priority | Platforms |
|---|---|---|---|
| **Server-managed** | Claude.ai admin console | Highest | All |
| **plist / registry policy** | macOS plist, Windows HKLM registry | High | macOS, Windows |
| **File-based managed** | Managed settings file deployed to device | Medium | All |
| **Windows user registry** | HKCU registry | Lowest | Windows only |

Settings from higher-priority sources override lower ones. Array settings (such as `permissions.allow` and `permissions.deny`) merge across sources -- developers can extend managed lists but cannot remove entries set by policy.

### Server-managed settings (recommended for Teams and Enterprise)

Server-managed settings are the recommended approach for Teams and Enterprise customers. They are configured through the Claude.ai admin console and delivered to Claude Code clients at authentication time, refreshing hourly during active sessions. **No MDM or endpoint management infrastructure is required.**

Requirements:
- Claude for Teams or Enterprise plan
- Claude Code v2.1.38 or later (Teams), v2.1.30 or later (Enterprise)
- Network access to `api.anthropic.com`

Settings take effect without a restart (except OpenTelemetry configuration, which requires a full restart).

**Fail-closed option:** If you need to ensure Claude Code cannot run without managed policy applied, set `forceRemoteSettingsRefresh: true` in your managed settings. With this enabled, Claude Code blocks at startup until settings are freshly fetched -- if the fetch fails, it exits rather than running unpolicied.

Full reference: [Configure server-managed settings](https://code.claude.com/docs/en/server-managed-settings)

### Endpoint-based policy (for orgs with MDM or mixed providers)

For organisations with existing MDM infrastructure, or where some users are on providers other than Claude.ai (Bedrock, Vertex), use endpoint-managed settings:

- **macOS:** managed preferences plist at `com.anthropic.claudecode`
- **Windows:** `HKLM\SOFTWARE\Policies\ClaudeCode` (requires admin to write -- tamper-resistant)
- **File-based (all platforms):**
  - macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`
  - Linux and WSL: `/etc/claude-code/managed-settings.json`
  - Windows: `C:\Program Files\ClaudeCode\managed-settings.json`

> **Windows gotcha:** `HKCU\SOFTWARE\Policies\ClaudeCode` (the user-scoped registry path) is writable without elevation. Do not rely on it as an enforcement channel -- use `HKLM` instead.

Full reference: [Set up Claude Code for your organisation](https://code.claude.com/docs/en/admin-setup)

### MCP governance via settings

MCP server permissions are enforced through the `permissions.allow` and `permissions.deny` keys in managed settings. Configure your approved list centrally so developers cannot add unapproved MCP servers. For vetting criteria, see the [MCP vetting table](#mcp-vetting) below.

---

## MCP Controls and Vetting

Before approving any MCP server for your organisation, assess it against these criteria:

<a id="mcp-vetting"></a>

| Check | What to look for |
|---|---|
| **Source** | Open source with inspectable code preferred. Closed or binary distributions require higher scrutiny. |
| **Publisher** | Known vendor (Microsoft, Atlassian, Anthropic) versus unknown author. Check GitHub profile age and other published work. |
| **Permission scope** | Does what it requests match what it claims to do? A Slack MCP requesting filesystem access is a red flag. |
| **Outbound network access** | Does it require internet access, and to which endpoints? Review or firewall outbound calls accordingly. |
| **Version pinning** | Can you lock to a specific release? Is there a changelog and active maintenance? Avoid `@latest` in production. |
| **Community signal** | GitHub stars, open issues, recent commits, known CVEs. A stale repo with no recent activity is a risk. |
| **Anthropic registry** | MCP servers listed in Anthropic's official registry have passed a baseline review. Third-party sources require more scrutiny. |

> **Treat every MCP server as a third-party software install.** It runs locally with the permissions of the user running it. A malicious or compromised MCP server can exfiltrate files, read environment variables, and intercept Claude's inputs and outputs. See [Section 8 of Part 1](https://buildtestrun.com/deploying-claude-safely-business-runbook/#section-8-preventing-malicious-mcp-servers-and-plugins) for the governance policy framework this vetting feeds into.

---

## Persona Access Matrix

The matrix below is a guide, not a mandate. Some organisations will choose to give everyone access to all Claude products. Use this to structure the conversation between IT and business owners about what makes sense for each role.

| Persona | Claude.ai Chat | Claude Code | Claude for Work | Claude Design |
|---|---|---|---|---|
| Developer / Engineer | Yes | Yes | Optional | No |
| Knowledge Worker | Yes | No | Yes | No |
| Designer / Creative | Yes | No | Optional | Yes |
| Executive / Leadership | Yes | No | Yes | No |
| IT / Sysadmin | Yes | Yes | Yes | No |

**How to enforce access tiers:**

- **Claude Code** requires API key access or a Claude.ai subscription. For Teams/Enterprise users, authentication uses subscription OAuth -- users log in with their workspace credentials. To restrict Claude Code to specific roles, issue API keys only to approved roles via the Anthropic Console, and use the `Claude Code` role (limits key creation to Claude Code API keys only) rather than `Developer` (allows any API key type).
- **Workspace features** can be restricted at the admin console level on Enterprise. Team has coarser controls.
- On **Team**, the primary enforcement mechanism is workspace membership. Control who is provisioned into the workspace via SSO group mapping.

> **Team tier note:** Fine-grained per-feature access controls are an Enterprise capability. On Team, if a feature is available to the workspace, it is generally available to all workspace members. Factor this into your plan selection if role-based feature restriction is a hard requirement.

---

## App Deployment by OS

### Claude Desktop

Claude Desktop is the GUI application for chat, cowork, and productivity. It targets knowledge workers, executives, and any role that does not need CLI access.

#### macOS

**Standard install:** Download from [claude.ai/download](https://claude.ai/download). Requires macOS 12 or later.

**MDM deployment (Jamf, Mosyle, Kandji, Intune):**
- Distribute the PKG or DMG via your MDM software catalogue
- Scope the deployment policy to your approved security group

> **Non-admin gotcha:** Claude Desktop installs to `/Applications`, which requires admin rights on macOS. Non-admin users cannot self-install. Use MDM to push the install, which runs as root and handles this transparently. Without MDM, IT must perform a manual install or offer a self-service portal (Jamf Self Service, etc.).

#### Windows

**Standard install:** Download from [claude.ai/download](https://claude.ai/download). Requires Windows 10 or later.

**MDM/GPO deployment (Intune, SCCM):**
- Package and distribute via Intune (MSIX or EXE wrapper) or SCCM
- Scope deployment to the approved Entra ID or AD security group

> **Non-admin gotcha:** The default Windows installer writes to `%LOCALAPPDATA%` (a user-scoped path), which does not require admin rights. Users can self-install without IT involvement if they can reach the download page. To control deployment: use AppLocker or Windows Defender Application Control (WDAC) to block execution from `%LOCALAPPDATA%\AnthropicClaude\`, then deploy the system-wide install to `%ProgramFiles%` via MDM (which requires elevation).

#### Linux

No native Claude Desktop application on Linux. Users access Claude via the browser at [claude.ai](https://claude.ai).

---

### Claude Code

Claude Code is the CLI and IDE tool for developers. See the [Advanced setup documentation](https://code.claude.com/docs/en/setup) for full installation details.

#### macOS

Install via native installer or Homebrew:

```bash
# Homebrew (stable channel)
brew install --cask claude-code

# Homebrew (latest channel)
brew install --cask claude-code@latest
```

Homebrew installations do not auto-update. Run `brew upgrade claude-code` periodically.

#### Windows

Install via native installer or WinGet:

```powershell
winget install Anthropic.ClaudeCode
```

WinGet installations do not auto-update. Run `winget upgrade Anthropic.ClaudeCode` periodically.

#### Linux

Claude Code has full native Linux support via system package managers. This is the recommended install method for managed Linux environments:

```bash
# Debian / Ubuntu
sudo install -d -m 0755 /etc/apt/keyrings
sudo curl -fsSL https://downloads.claude.ai/keys/claude-code.asc \
  -o /etc/apt/keyrings/claude-code.asc
echo "deb [signed-by=/etc/apt/keyrings/claude-code.asc] https://downloads.claude.ai/claude-code/apt/stable stable main" \
  | sudo tee /etc/apt/sources.list.d/claude-code.list
sudo apt update && sudo apt install claude-code

# Fedora / RHEL
sudo tee /etc/yum.repos.d/claude-code.repo <<'EOF'
[claude-code]
name=Claude Code
baseurl=https://downloads.claude.ai/claude-code/rpm/stable
enabled=1
gpgcheck=1
gpgkey=https://downloads.claude.ai/keys/claude-code.asc
EOF
sudo dnf install claude-code
```

Both apt and dnf verify package signatures automatically. Verify the GPG fingerprint before trusting: `31DD DE24 DDFA B679 F42D 7BD2 BAA9 29FF 1A7E CACE`.

For CI environments or where a package manager is not available, install via npm (requires Node.js 18 or later):

```bash
npm install -g @anthropic-ai/claude-code
```

Full installation reference: [Advanced setup](https://code.claude.com/docs/en/setup)

#### Claude Code authentication

For Teams and Enterprise users, Claude Code authenticates using subscription OAuth -- users run `claude login` and authenticate through the browser with their workspace credentials. No separate API key is needed for standard use.

For CI pipelines and non-interactive environments, generate a long-lived token with `claude setup-token`. See [Authentication](https://code.claude.com/docs/en/authentication) for the full credential hierarchy.

---

## SharePoint MCP: Pre-Flight Checklist

The official Microsoft SharePoint MCP connector lets Claude read and interact with SharePoint content on behalf of the signed-in user. Before enabling it, run through this checklist. A full setup and governance guide for this integration warrants its own post.

- [ ] **Microsoft 365 licence:** Users need a licence that includes SharePoint (M365 Business Standard or above). Verify before connecting.
- [ ] **App consent policy:** Your tenant must permit the Claude connector app to be granted OAuth consent. Check Entra admin centre under **Enterprise Applications > Consent and Permissions**.
- [ ] **Delegated permissions model:** The MCP connector accesses SharePoint as the signed-in user, not as a service account. Users can only reach content they already have SharePoint permission to access.
- [ ] **Conditional Access:** If you have Conditional Access policies restricting third-party app access to M365 data, verify whether the Claude connector is in scope or needs to be explicitly excluded.
- [ ] **Content scope review:** Before connecting, identify any SharePoint sites containing content that should not be reachable via an AI tool (HR records, legal holds, board materials). Restrict SharePoint permissions at the site level before connecting.
- [ ] **Test with a non-sensitive site first:** Connect to a low-risk site, verify what the MCP can and cannot reach, then confirm behaviour before rolling out broadly.

---

## References

- [Set up single sign-on (SSO)](https://support.claude.com/en/articles/13132885-set-up-single-sign-on-sso)
- [Set up JIT or SCIM provisioning](https://support.claude.com/en/articles/13133195-setting-up-jit-or-scim-provisioning)
- [Set up Claude Code for your organisation](https://code.claude.com/docs/en/admin-setup)
- [Configure server-managed settings](https://code.claude.com/docs/en/server-managed-settings)
- [Claude Code authentication](https://code.claude.com/docs/en/authentication)
- [Claude Code advanced setup](https://code.claude.com/docs/en/setup)
- [Claude Desktop download](https://claude.ai/download)
- [Model Context Protocol overview](https://www.anthropic.com/news/model-context-protocol)
- [Claude Team pricing](https://claude.com/pricing/team)
- [Claude Enterprise](https://www.anthropic.com/enterprise)
- [Deploying Claude Safely: A Business Runbook](https://buildtestrun.com/deploying-claude-safely-business-runbook) -- Part 1
