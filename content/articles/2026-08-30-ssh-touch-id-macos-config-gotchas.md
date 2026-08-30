---
title: "SSH with Touch ID on macOS: Configuration and Gotchas"
subtitle: "Stop typing your SSH passphrase, and the one PATH issue that silently breaks it"
description: "Configure Touch ID for SSH key authentication on macOS, tune ~/.ssh/config for speed, and avoid the Homebrew OpenSSH gotcha that silently breaks it."
date: 2026-08-30
lastmod: 2026-08-30
categories: [tooling]
tags: [ssh, macos, touch-id, shell]
slug: "ssh-touch-id-macos-config-gotchas"
canonical_url: "https://buildtestrun.com/ssh-touch-id-macos-config-gotchas"
schema_type: HowTo
---

macOS's OpenSSH fork can unlock an SSH key with Touch ID instead of a typed passphrase, but the integration lives in Apple's modified `ssh-add`, not the one Homebrew installs. Get the PATH order wrong and Touch ID stops working with no error, just a plain passphrase prompt again. This covers the whole lifecycle: generating the key, getting it onto a server, enabling Touch ID, the `~/.ssh/config` options worth having, and that PATH gotcha specifically.

## Generate the key pair

If you do not already have one, generate an Ed25519 key rather than RSA. Ed25519 signatures are shorter, verify faster, and the key itself is immune to the timing-attack classes that have shown up in some RSA implementations over the years:

```zsh
ssh-keygen -t ed25519 -C "your-email@example.com"
```

The `-C` comment is cosmetic, it just labels the key in `authorized_keys` files so you can tell whose key is whose on a shared server later. Accept the default file location (`~/.ssh/id_ed25519`) unless you are deliberately managing multiple keys, and **set a real passphrase when prompted**. 

>Touch ID is what makes that passphrase invisible day to day, covered below, it is not a reason to leave it blank.

## Get the public key onto a server

`ssh-copy-id` is the fastest path for a server you can already reach with a password:

```zsh
ssh-copy-id -i ~/.ssh/id_ed25519.pub myuser@192.168.1.100
```

It appends the public key to `~/.ssh/authorized_keys` on the remote host over an existing password-authenticated connection. Without `ssh-copy-id` available, the manual equivalent is piping the public key into the same file:

```zsh
ssh myuser@192.168.1.100 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys" < ~/.ssh/id_ed25519.pub
```

The very first connection to a new host, either way, shows a host key fingerprint and asks you to confirm it. That prompt exists to catch a man-in-the-middle substituting their own server for the real one; confirm it against a fingerprint you already have from the server itself (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` run on the server) rather than reflexively typing yes, at least the first time you connect to something that actually matters.

## Enable Touch ID for an SSH key

Add this to `~/.ssh/config` first:

```
Host *
  UseKeychain yes
  AddKeysToAgent yes
```

`AddKeysToAgent yes` loads the key into the running `ssh-agent` on first use so you are not re-entering anything mid-session. `UseKeychain yes` is what ties the stored passphrase to Keychain, which is what Touch ID actually unlocks.

Then add the key once with the `--apple-use-keychain` flag:

```zsh
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

That flag stores the passphrase in Keychain, gated by Touch ID or your Apple Watch. From then on, the first SSH connection each session triggers a Touch ID prompt instead of a passphrase field.

## What actually happens day to day

The whole point of `UseKeychain` is that you run `ssh-add --apple-use-keychain` exactly once per key, not once per reboot or login. After that, `AddKeysToAgent yes` means the first `ssh` connection in a new session pulls the passphrase back out of Keychain automatically, prompting Touch ID rather than asking you to run `ssh-add` again. If you find yourself re-running `ssh-add --apple-use-keychain` after every restart, something did not stick, usually the Homebrew PATH issue below, or a `~/.ssh/config` that is missing `UseKeychain yes` under the `Host` block actually matching that connection.

A few commands worth knowing for the day-to-day:

```zsh
ssh-add -l          # list keys currently loaded in the agent, with fingerprints
ssh-add -D          # remove all keys from the running agent (does not touch Keychain or disk)
ssh myserver         # connect using the Host alias from ~/.ssh/config, no need to retype user/hostname/port
```

`ssh-add -D` is the one to reach for if you ever need to force a fresh Touch ID prompt mid-session, for example after switching to a different key for the same host. It clears the agent's loaded keys without deleting anything from Keychain or disk, so the next connection just reloads and re-prompts.

If you replace a key entirely, revoke the old one on the server side by removing its line from that server's `~/.ssh/authorized_keys`, and separately remove the stale entry from local Keychain (Keychain Access.app, search for the key's service name, usually `SSH: <hostname>` or similar) so an old, no-longer-valid passphrase is not sitting there indefinitely.

## The Homebrew PATH gotcha

Touch ID support is built into Apple's own fork of OpenSSH, shipped at `/usr/bin/ssh-add` and `/usr/bin/ssh`. `brew install openssh` puts a vanilla upstream build ahead of it on `PATH` for most default shell configs, and vanilla OpenSSH has no Keychain integration at all. Run `ssh-add --apple-use-keychain` against that binary and it fails with an unrecognised-option error, obviously wrong. Run plain `ssh-add` against it, though, and it succeeds silently, adds the key to the agent, and just never talks to Keychain. Touch ID never fires, and there is nothing in the output to say why.

Check which binary you are actually running before troubleshooting further:

```zsh
which ssh-add
# should print /usr/bin/ssh-add
```

If it prints a Homebrew path instead (`/opt/homebrew/bin/ssh-add` or similar), the targeted fix is aliasing just these two commands to the system binaries in `~/.zshrc`, rather than reordering `PATH` globally and risking every other Homebrew tool you actually wanted ahead of `/usr/bin`:

```zsh
# ~/.zshrc
alias ssh-add='/usr/bin/ssh-add'
alias ssh='/usr/bin/ssh'
```

Reload the shell (`source ~/.zshrc` or open a new terminal) and re-check with `which ssh-add`, note that `which` resolves aliases too, so this confirms the fix the same way. If you deliberately want `/usr/bin` ahead of Homebrew for everything, not just these two commands, prepend it to `PATH` instead in the same file:

```zsh
export PATH="/usr/bin:$PATH"
```

> CAUTION: That is the blunter option: it affects every command on `PATH`, not just SSH, so anything else you have intentionally overridden via Homebrew (a newer `git`, `curl`, or similar) reverts to the system version too.

## Tuning `~/.ssh/config` beyond Touch ID

A few options that are worth having in any macOS SSH config, Touch ID aside:

```
Host myserver
  Hostname 192.168.1.100
  User myuser
  Port 2222
  IdentityFile ~/.ssh/id_ed25519
  AddKeysToAgent yes
  UseKeychain yes
```

**Connection reuse** avoids paying the TCP and auth handshake cost on every new session to the same host:

```
Host *
  ControlMaster auto
  ControlPath ~/.ssh/control/%r@%h:%p
  ControlPersist 1h
```

Requires the control directory to exist first: `mkdir -p ~/.ssh/control`.

**Keepalive** stops idle connections dropping behind a NAT or firewall with an aggressive idle timeout:

```
Host *
  ServerAliveInterval 60
```

**Agent forwarding** lets a remote host use your local keys without copying them there, useful for a bastion host you SSH through to reach something else. It is also the one setting here with a real downside: a compromised bastion can use your forwarded agent to authenticate elsewhere as you, for as long as the session is open. Scope it to specific bastion hosts, never `Host *`:

```
Host bastion-host
  ForwardAgent yes
```

## Key security basics

Touch ID removes the friction of typing a passphrase, it does not replace having one. 
**A private key with no passphrase at all is a plaintext credential sitting on disk**; Touch ID's Keychain integration is what makes a real passphrase invisible day to day, not a reason to skip setting one.

```zsh
chmod 600 ~/.ssh/id_ed25519
```

Public keys can stay at the default `644`. On the server side, disable password authentication entirely once key-based access is confirmed working (`PasswordAuthentication no` in `sshd_config`), so a leaked or guessed password is not a second way in alongside the keys.

For anything beyond a personal workstation, a hardware security key (a YubiKey or similar FIDO2 device) using `ssh-keygen -t ed25519-sk` keeps the private key material off the disk entirely, in a tamper-resistant module. Touch ID protects a key stored in software; a hardware key means there is no software copy to protect in the first place.

## PowerShell on macOS

PowerShell on macOS shells out to the same system `ssh` and `ssh-add` binaries `zsh` does, so everything above works identically from a `pwsh` session, including the Touch ID prompt, provided the PATH gotcha above is sorted first. The one difference worth knowing: PowerShell's own `$env:PATH` is built from your shell profile the same way zsh's is, so if you hit the Homebrew shadowing issue in zsh, check `pwsh`'s PATH separately rather than assuming fixing one fixes both.

```powershell
ssh myserver
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
ssh-add -L
```
