---

title: "Deploying Claude Safely: A Business Runbook for Data Privacy and Governance"
description: "A practical runbook for IT leads and business owners rolling out Claude to staff: plan tiers, data handling, admin configuration, usage policy, and MCP supply chain controls."
date: 2026-05-16
lastmod: 2026-05-16
categories: [security, ai]
tags: [security, AI, claude, privacy, governance, enterprise, runbook]
slug: "deploying-claude-safely-business-runbook"
canonical_url: "https://buildtestrun.com/deploying-claude-safely-business-runbook"
schema_type: TechArticle
---

> **Who this is for:** IT leads, operations managers, and business owners preparing to roll out Claude (claude.ai, Claude Code, or the API) to staff. This is a practical runbook, not legal advice. Involve your legal and compliance teams for obligations specific to your industry. Once decisions are made, see [Part 2: Deploying Claude to Your Team -- A Sysadmin Checklist](https://buildtestrun.com/deploying-claude-to-your-team-sysadmin-guide) for the technical execution guide.

---

## TL;DR

- **Free and Pro plans**: your conversations can be used to train Anthropic's models by default. You can opt out, but you have to do it manually.
- **Team and Enterprise plans**: training on your data is off by default. Team adds admin controls and SSO. Enterprise adds data retention settings, audit logging, and expanded context.
- **API and Claude Code**: no training by default. Zero data retention is available on request.
- Anthropic employees can access conversation data for safety and trust purposes -- it is not fully siloed from human review at any tier.
- The highest risk for businesses is staff pasting confidential data (client lists, credentials, contracts, PII) into the wrong plan tier before controls are in place.
- Before rollout: choose the right plan, configure admin settings, write a usage policy, and brief the people below.
- For Claude Code specifically: MCP servers are the biggest supply chain risk. Treat them like third-party software -- vet before installing.

---

## Introduction

Claude is one of the most capable AI assistants available right now, and the pressure to adopt it is real. Staff are already using it -- often on personal accounts, on the Free plan, without any guidance from IT. That's the gap this runbook addresses.

The goal is not to block adoption. It's to bring it under control before something goes wrong: a client contract pasted into a Free plan conversation, a developer installing an unvetted MCP server that exfiltrates code, or confidential HR data used in a prompt that ends up in a training dataset.

This document walks through Anthropic's data practices, what they mean for your business, and the concrete steps to deploy Claude safely across your organisation.

---

## Section 1: How Claude Uses Your Data -- By Plan

Understanding data handling starts with knowing which product your staff are using and under which plan. These are materially different.

### Claude.ai -- Free and Pro

On the Free and Pro tiers, Anthropic's default position is that conversations **may be used to improve their models**. This includes being reviewed by Anthropic staff and contractors. Users can opt out via:

`Settings -> Privacy -> "Improve Anthropic's products for everyone" -> toggle off`

The opt-out applies per-account. It does not apply retroactively to past conversations. If staff are already using Free or Pro without this opt-out enabled, those conversations may already be in Anthropic's training pipeline.

> **Key risk for businesses:** there is no centralised admin opt-out on Free or Pro. You cannot enforce this setting across your team -- you rely on each individual having done it themselves.

Reference: [Anthropic Privacy Policy](https://www.anthropic.com/privacy)

### Claude.ai -- Team

The Team plan is designed for business use. Key differences from Free/Pro:

- **Training on your conversations is off by default.** You do not need to opt out individually.
- Admin controls for the workspace are available -- admins can manage members and billing centrally.
- **SSO/SAML** -- integrate with your existing identity provider (Entra ID, Okta, etc.).
- 200K context window per user.
- Usage is still subject to Anthropic's trust and safety review (see Section 3).

This is the minimum recommended tier for any business use involving internal data.

Reference: [Claude Team](https://claude.com/pricing/team)

### Claude.ai -- Enterprise

Enterprise is the highest-assurance tier for the claude.ai web product. Key features:

- **No training on your data, ever** -- contractually committed.
- **Data retention controls** -- configure how long conversation data is retained.
- **SSO/SAML** -- integrate with your existing identity provider (Entra ID, Okta, etc.).
- **Admin dashboard** -- visibility and management across all users in your organisation.
- **Expanded context window** (500K tokens).
- Custom system prompts and domain verification.

Enterprise requires a direct agreement with Anthropic and is priced per organisation. For businesses handling regulated data (health, finance, legal), this is the tier to be on.

Reference: [Claude Enterprise](https://www.anthropic.com/enterprise)

### Anthropic API and Claude Code

When accessing Claude via the API directly -- including through Claude Code (the CLI and IDE tool) -- the data handling is different again:

- **No model training on API inputs/outputs by default.**
- Anthropic may retain prompts and completions for up to 30 days for trust and safety purposes, then delete them.
- **Zero data retention** is available for eligible API customers -- inputs and outputs are not stored at all after the response is returned. Contact Anthropic to enable this.
- Claude Code runs locally and sends your prompts (including any file context it reads) to the Anthropic API. Everything that goes to the API follows API data handling rules.

Reference: [Anthropic API Privacy FAQ](https://support.anthropic.com/en/articles/7996866-how-long-does-anthropic-retain-my-api-data)

---

## Section 2: Training Data -- What Actually Gets Used?

Anthropic is transparent about this in their privacy policy. Key points:

- On consumer tiers (Free, Pro) without opt-out: conversations can be used for safety research, model evaluation, and fine-tuning.
- Human reviewers may read conversations as part of safety and quality processes.
- Opt-out removes your conversations from training datasets, but does not prevent safety review.
- Team, Enterprise, and API customers are excluded from training by default.

**What "training" means in practice:** your prompts, Claude's responses, and any feedback (thumbs up/down) can be used to teach the model. If a staff member pastes a client contract into a Free plan conversation, that text is a candidate for training data unless they have opted out.

The opt-out is per-account, not per-conversation. There is no way to flag individual conversations after the fact.

---

## Section 3: Who at Anthropic Can Access Your Conversations?

This is the question most businesses do not ask until something goes wrong.

Anthropic's privacy policy and trust documentation state that:

- Anthropic employees with appropriate access levels can review conversations for safety, policy compliance, and model improvement purposes.
- Access is role-based and controlled internally -- not every employee can browse your conversations.
- Third-party contractors may be involved in data labelling and quality review, subject to confidentiality agreements.
- Anthropic will comply with valid legal process (subpoenas, court orders) which could compel disclosure of conversation data.

**The honest answer:** Claude is not a sealed vault. At no tier is conversation data completely inaccessible to Anthropic personnel. Enterprise and API customers get stronger contractual protections and reduced retention windows, but human review for trust and safety purposes is retained at all tiers.

If your business handles data that cannot be disclosed to a third party under any circumstances -- attorney-client privileged communications, certain health records, classified government information -- do not put it in Claude regardless of tier.

Reference: [Anthropic Trust & Safety](https://trust.anthropic.com/)

---

## Section 4: The Risk of Inputting Confidential Information

The practical risk is not that Anthropic will misuse your data. It is that your staff will treat Claude like a secure internal tool when it is not.

Common scenarios that create exposure:

- **Client data in prompts**: "Summarise this contract for client Acme Corp, their ABN is..." -- now that ABN and client relationship is in a conversation that may be reviewed by Anthropic staff.
- **Credentials and keys**: developers pasting API keys, database connection strings, or `.env` files into Claude for debugging.
- **HR and payroll data**: "Help me write a termination letter for [Employee Name], their salary is $X..."
- **Unreleased financial information**: asking Claude to help write investor communications containing material non-public information.
- **Health and medical records**: clinical notes, patient identifiers, anything covered by privacy legislation in your jurisdiction.

The risk is compounded on Free and Pro plans where training opt-out may not be set. Even on Enterprise, if you input data and then face a legal hold, Anthropic's data is within scope of discovery.

---

## Section 5: Business Configuration Checklist

Before rolling Claude out to staff, work through this checklist. It is structured so you can assign owners and track completion.

> **Note:** This is not an exhaustive list. Every environment is different -- review each item for relevance to your organisation's size, industry, regulatory context, and existing tooling. Skip items that do not apply, and add controls specific to your situation.

### Step 1 -- Choose the Right Plan

Anthropic's [pricing page](https://claude.com/pricing#team-&-enterprise) includes a plan quiz to help identify the right tier for your use case.

| Scenario | Recommended Tier |
|---|---|
| Individual staff productivity, no sensitive data | Pro (with opt-out enforced) |
| Team collaboration, internal data | Team minimum |
| Regulated data, SSO needed | Team minimum |
| Regulated data, audit trail, data retention controls, 500K context | Enterprise |
| Developers building on Claude / Claude Code | API with zero retention if available |

### Step 2 -- Configure Admin Controls

**For Team/Enterprise:**
- [ ] Set up the workspace and verify your domain
- [ ] Integrate SSO (Entra ID/Okta) -- available on Team and Enterprise, prevents staff using personal accounts
- [ ] Review default data retention settings
- [ ] Enable audit logging if available on your tier
- [ ] Assign admin roles -- at minimum one primary and one backup admin
- [ ] Disable or restrict features not relevant to your use case (e.g., image generation if not needed)

**For API/Claude Code deployments:**
- [ ] Create an Anthropic API organisation account
- [ ] Issue API keys per team or per service -- not per individual developer
- [ ] Rotate keys on a schedule and on staff departure
- [ ] Store API keys in a secrets manager (not in `.env` files committed to repos)
- [ ] Set spending limits on API keys to prevent runaway costs

### Step 3 -- Write a Usage Policy

Your staff need to know what they can and cannot put into Claude before they start. A one-page policy should cover:

- Which plan/product they are authorised to use (and which they are not)
- Data classifications that must never enter Claude (PII, credentials, client confidential, regulated data)
- What to do if they accidentally paste something sensitive (report immediately, so you can assess retention risk)
- Acceptable use: what Claude is and is not approved for in their role
- MCP and plugin policy for developers (see Section 8)

Keep the policy short and practical. A five-page document no one reads is worse than a one-pager everyone understands.

### Step 4 -- Identity and Access

- [ ] Staff must use work accounts, not personal accounts -- SSO enforces this on Team and Enterprise
- [ ] Personal use of Claude (personal accounts) is at their own risk and outside your policy's scope -- be explicit about this
- [ ] Offboarding process: remove staff from the Claude workspace on the same day as other system access

---

## Section 6: Deployment Runbook -- Who Needs to Be Involved

Rolling out Claude to staff is not just an IT project. The following stakeholders should be involved, even briefly.

| Role | Responsibility | When |
|---|---|---|
| **IT Lead / SysAdmin** | Plan selection, SSO integration, API key management, MCP vetting | Before rollout |
| **Business Owner / MD** | Policy sign-off, budget approval, risk acceptance | Before rollout |
| **Legal / Compliance** | Review data handling for your regulatory context (GDPR, Privacy Act, HIPAA, etc.) | Before rollout |
| **HR / People** | Include AI tool policy in employment agreements and onboarding | Before rollout |
| **Team Leads / Managers** | Communicate usage policy, field questions, flag misuse | At rollout |
| **Finance** | API cost monitoring, billing alerts | Ongoing |
| **Security Lead (if you have one)** | MCP vetting process, incident response plan for data exposure | Before rollout and ongoing |

For very small businesses without dedicated roles: the business owner and the most technical person on the team should cover this together, and get at least a brief consultation with your legal advisor if you handle regulated data.

---

## Section 7: Claude Code -- Specific Risks for Developer Teams

Claude Code is the CLI tool and IDE extension that gives Claude direct access to your codebase. It is significantly more powerful than the web interface -- and carries different risks.

**What Claude Code can access:**
- Your local file system (any path you permit it)
- Terminal/shell commands (in agentic mode)
- Git history, `.env` files, secrets if they are in the working directory
- The Anthropic API (all file context goes to the API)

**Developer-specific risks:**
- Secrets in code context: if a developer runs Claude Code in a directory containing `.env`, database configs, or private keys, that content can be sent to the Anthropic API as part of the prompt
- Code IP: your proprietary source code is sent to Anthropic's API. On the standard API this is subject to 30-day retention. With zero retention enabled, it is not stored.
- Agentic mode: Claude Code can execute commands. A misunderstood instruction or a malicious prompt injection can result in file deletion, code execution, or network calls.

**Mitigations:**
- Add `.env`, `*.key`, `*.pem`, `secrets/` to `.gitignore` and keep them out of working directories when using Claude Code
- Use zero data retention if your codebase is sensitive
- Review what Claude Code is doing before approving agentic operations -- the default `--print` mode (non-interactive) is safer for CI/CD
- Restrict Claude Code to specific project directories, not your entire home directory

---

## Section 8: Preventing Malicious MCP Servers and Plugins

MCP (Model Context Protocol) is an open standard that lets Claude connect to external tools -- databases, APIs, file systems, web browsers, and more. Claude Code supports MCP servers, and the ecosystem is growing fast.

This is also the highest-risk extension point for Claude deployments.

**Why MCP is a supply chain risk:**

An MCP server is code that runs on the user's machine with the permissions of the user running it. A malicious or compromised MCP server can:
- Exfiltrate files, environment variables, and credentials
- Execute arbitrary commands
- Intercept and manipulate Claude's inputs and outputs (prompt injection via tool responses)
- Persist on the system beyond the Claude session

MCP servers are not vetted by Anthropic before publication. Anyone can publish one.

**Governance controls for MCP:**

- [ ] **Approved list only**: maintain a list of vetted MCP servers that developers are permitted to install. Anything not on the list requires IT review.
- [ ] **Review the source**: MCP servers should be open source and reviewed before installation. Do not install from unknown authors or unverified repositories.
- [ ] **Check permissions**: what does the MCP server request access to? A Slack integration should not need file system access. Question scope creep.
- [ ] **Pin versions**: install specific versions of MCP servers and update deliberately, not automatically.
- [ ] **Isolate sensitive workloads**: developers working on sensitive code should not run MCP servers that have outbound network access unless explicitly required.
- [ ] **Audit installed servers**: periodically review what MCP servers are installed across developer machines.

For a detailed breakdown of the attack categories -- prompt injection via MCP, supply chain compromise, insecure plugin design -- see: [OWASP Top 10 for LLM Applications 2025](https://buildtestrun.com/owasp-top-10-for-llm-applications-2025)

---

## Section 9: Governance Framework

Deploying Claude is an ongoing commitment, not a one-time configuration. The following framework helps keep it under control.

### Policies (set once, review annually)
- AI acceptable use policy
- Data classification policy (what data can go where)
- MCP/plugin approval process
- Incident response: what to do if sensitive data is accidentally submitted

### Controls (ongoing)
- SSO enforcement -- no personal accounts for work use
- API key rotation schedule
- Spending alerts on API usage
- Offboarding checklist includes Claude workspace access removal

### Monitoring (ongoing)
- Review API usage logs for anomalies (sudden spikes in token usage can indicate misuse or a runaway process)
- Periodic review of approved MCP server list
- Feedback channel for staff to report unexpected Claude behaviour

### Review Triggers (ad hoc)
- New Anthropic product release or significant policy change
- Staff departure from a role with elevated Claude access
- Security incident involving AI tooling anywhere in your industry
- New regulatory guidance on AI in your jurisdiction

---

## A Note on Jurisdiction and Regulation

Anthropic is a US company. Your data, depending on tier and configuration, may be processed on US infrastructure. If you operate under GDPR, the Australian Privacy Act, HIPAA, or other frameworks, you need to assess this with legal counsel before deploying Claude to process personal data.

Anthropic publishes information about their data sub-processors and international transfer mechanisms. Review their privacy policy and, for Enterprise customers, the Data Processing Agreement (DPA) they offer. Anthropic also maintains a [regional compliance page](https://claude.com/regional-compliance) covering jurisdiction-specific considerations.

Reference: [Anthropic Privacy Policy](https://www.anthropic.com/privacy)

---

## Summary: What to Do This Week

If you are reading this and your staff are already using Claude without controls in place, here is the minimum viable response:

1. **Today**: send staff a note -- do not paste client data, credentials, or confidential information into Claude until IT has configured it.
2. **This week**: decide on your plan tier. If Team or Enterprise is in scope, start the procurement process.
3. **This week**: draft a one-page usage policy. It does not need to be perfect -- it needs to exist.
4. **Next two weeks**: configure SSO if on Team or Enterprise, set up API key management if developers are using Claude Code, establish the MCP approved list.
5. **Before full rollout**: brief team leads, add the policy to onboarding, set up API spend alerts.

---

## References

- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- [Anthropic Trust & Safety](https://trust.anthropic.com/)
- [Claude Enterprise](https://www.anthropic.com/enterprise)
- [Claude Team](https://claude.com/pricing/team)
- [Anthropic API Data Retention FAQ](https://support.anthropic.com/en/articles/7996866-how-long-does-anthropic-retain-my-api-data)
- [Anthropic Usage Policy](https://www.anthropic.com/legal/aup)
- [Anthropic Regional Compliance](https://claude.com/regional-compliance)
- [Model Context Protocol (MCP) -- Anthropic](https://www.anthropic.com/news/model-context-protocol)
- [OWASP Top 10 for LLM Applications 2025](https://buildtestrun.com/owasp-top-10-for-llm-applications-2025) -- companion post
