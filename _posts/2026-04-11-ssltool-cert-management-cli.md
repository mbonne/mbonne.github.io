---
layout: post
title: "ssltool: CSR Generation and Key Validation Without Remembering the Commands"
description: "ssltool is a macOS shell script that generates CSRs and validates certificate and key hash matching using the built-in openssl binary. No data leaves your machine."
date: 2026-04-11
last_modified_at: 2026-04-11
categories: [tooling, security]
tags: [ssl, openssl, certificates, pki, shell, macos, project]
slug: "ssltool-cert-management-cli"
canonical_url: "https://buildtestrun.com/ssltool-cert-management-cli"
schema_type: HowTo
---

Creating a CSR or checking whether a certificate and private key belong together means remembering a handful of OpenSSL flags you probably last ran six months ago. Most web-based tools that offer to do this require pasting your private key into a form field, which is not a good idea.

[ssltool](https://github.com/mbonne/ssltool){:target="_blank" rel="noopener noreferrer"} is a menu-driven shell script that handles CSR generation and key/certificate hash validation using the `openssl` binary that ships with macOS. No external dependencies, no network calls.

## What it does

Two workflows cover the common cert management tasks.

**CSR generation** prompts for subject fields (common name, organisation, country, state, locality), generates a new private key and CSR, and stores the output under `$HOME/.conf/sslTool`. If you already have a private key you want to reuse, it can generate the CSR from that instead.

**Hash validation** computes the MD5 hash of your certificate, CSR, and private key and displays them side by side. If the hashes match, the files belong to the same keypair and the cert will work with the key. If they do not match, you have the wrong files and now you know before deploying.

The tool also includes options to display the full details of a CSR and to check the SSL certificate on a remote host, useful for a quick sanity check without opening a browser.

## Why local-only matters

Certificate private keys should not leave the machine they were generated on. ssltool runs entirely against the `openssl` binary included with macOS. Nothing is sent over the network at any point, no third-party service is involved, and no account is required. It works air-gapped.

## Requirements

- macOS
- `openssl` (included with macOS, no additional install required)

## Installation

Clone the repo and put the script somewhere in your `$PATH`:

```bash
git clone https://github.com/mbonne/ssltool.git
cp ssltool/ssltools ~/bin/ssltools
chmod +x ~/bin/ssltools
```

Then run:

```bash
ssltools
```

> Pro Tip: add `~/bin` to your `$PATH` if it isn't already — a good place to collect personal scripts.

The repo is at [github.com/mbonne/ssltool](https://github.com/mbonne/ssltool){:target="_blank" rel="noopener noreferrer"}.
