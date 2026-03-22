---
layout: post
title: "SSH SOCKS Proxy on macOS Without the Manual Steps"
description: "ssshp is a shell script that creates an SSH SOCKS proxy on macOS, configures your network interface automatically, and verifies the tunnel is working."
date: 2026-03-22
last_modified_at: 2026-03-22
categories: [tooling, networking]
tags: [ssh, macos, proxy, shell, project]
slug: "ssh-socks-proxy-macos-script"
canonical_url: "https://buildtestrun.com/ssh-socks-proxy-macos-script"
schema_type: HowTo
---

Setting up a SOCKS proxy over SSH on macOS involves more than one command. You need to background the tunnel, configure the active network interface to route traffic through it, and then verify the connection actually works. Do it often enough and you start wanting a script.

[ssshp](https://github.com/mbonne/ssshp){:target="_blank" rel="noopener noreferrer"} (SOCKS SSH Proxy) automates that sequence. It handles the tunnel, the `networksetup` call to enable SOCKS on your NIC, and shows your WAN IP through the proxy so you can confirm traffic is routing correctly, all from a single interactive menu.

Tested on macOS 12.6.1, 15.1, 26.3.1(a)

## What it does

At its core, ssshp runs this:

```bash
ssh -f -N -M -S /tmp/sshtunnel -D 1080 $sshTarget
```

The flags:

| Flag | Purpose |
|---|---|
| `-f` | Fork to background after authentication |
| `-N` | Don't execute a remote command |
| `-M` | Enable connection sharing (master mode) |
| `-S /tmp/sshtunnel` | Set the control socket path |
| `-D 1080` | Dynamic port forwarding on localhost:1080 |

After the tunnel is up, it calls `networksetup` to enable SOCKS proxy on your active interface pointing at `127.0.0.1:1080`. Then it fetches your WAN IP through the proxy and displays it. A quick sanity check that traffic is actually leaving through the remote host.

## Requirements

- macOS (tested on Monterey, Sequoia, Tahoe)
- `sudo`, required for modifying network interface settings via `networksetup`
- `jq`, for reading and writing saved tunnel configurations
- An SSH host you can reach

## Installation

Clone the repo and put the script somewhere in your `$PATH`:

```bash
git clone https://github.com/mbonne/ssshp.git
sudo cp ssshp/ssshp /usr/local/bin/ssshp
sudo chmod +x /usr/local/bin/ssshp
```

Then run it:

```bash
sudo ssshp
```
> Pro Tip: make a custom ~/bin folder for all the custom scripts, and add that to your path.

## Menu options

**Make SSH Tunnel** prompts for a host, port, and SSH user, establishes the tunnel, and enables the proxy. From there you can close the tunnel cleanly, save the settings for later, or exit and leave the tunnel running.

**Select SSH Tunnel** loads a previously saved configuration from `~/.ssh/sshpHosts.json` and reconnects without re-entering the details. Useful when you have a handful of jump hosts you rotate between.

The script manages two files: `~/.ssh/config` (for SSH itself) and `~/.ssh/sshpHosts.json` (for saved tunnel profiles). These can drift out of sync if you edit `~/.ssh/config` by hand. Keep this in mind if you manage SSH config entries manually.

## When to use this

A SOCKS proxy over SSH routes your browser or application traffic through a remote host rather than your local network connection. Three scenarios where that's genuinely useful:

**Reaching a device's admin interface through a bastion host.** A router, NAS, or internal server sits on a private LAN. You have SSH access to a machine on that network, but the device's web interface isn't reachable from outside. With ssshp proxying through the bastion, your browser can hit the device's private IP directly. No VPN required, no port forwarding to configure on the device.

**Securing traffic on an untrusted network.** Working from a hotel or conference WiFi where you don't trust the local network. Routing browser traffic through an SSH connection to a VPS or home server means your traffic leaves the local network encrypted, rather than sitting on whatever the hotel's switch is doing.

**Verifying how your infrastructure looks from a specific egress point.** You need to confirm a geo-restriction is working, check what a service returns from a particular network, or reproduce a connectivity issue a colleague in another location is reporting. Proxying through an SSH host in that location gives you their network perspective without needing physical access.

It's not a VPN replacement. A VPN tunnels all traffic at the OS level. A SOCKS proxy is browser or application-specific, which is either a limitation or a feature depending on what you're doing. For targeted access where you don't want to re-route everything, it's less overhead.

If you're already doing this manually via `ssh -D`, ssshp removes the `networksetup` step and adds saved profiles. For occasional use that's enough.

The repo is at [github.com/mbonne/ssshp](https://github.com/mbonne/ssshp){:target="_blank" rel="noopener noreferrer"}.
