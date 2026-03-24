---
layout: post
title: "Tailscale Home Lab VPN: Always-On Split Tunnel on Your Phone"
description: "Set up Tailscale on your home lab and configure an always-on split tunnel VPN on your phone for secure remote access, ad-blocking DNS, and CGNAT bypass."
date: 2026-03-24
last_modified_at: 2026-03-24
categories: [networking, homelab]
tags: [tailscale, vpn, pihole, cgnat, networking, self-hosted]
schema_type: HowTo
---

If you run a home lab, at some point you want to access it from outside. Maybe you want your phone to use your home DNS when you're on mobile data for network-wide ad-blocking. Maybe you have a Synology NAS or a Home Assistant instance you want to reach from anywhere. Maybe your ISP uses CGNAT and port forwarding simply does not work for you.

Tailscale solves all of this with minimal configuration. This post covers why it is worth your time and how to set up an always-on split tunnel VPN on your phone so that home network traffic routes through your lab while everything else goes out normally.

---

## The Problem: CGNAT and Why Port Forwarding Fails

Traditional remote access relies on port forwarding: open a port on your router, point it at a server, access it from the internet using your public IP. This works if your ISP gives you a real public IP.

Many residential ISPs no longer do. Carrier Grade NAT (CGNAT) means multiple customers share a single public IPv4 address at the ISP edge. Your router gets an address in the 100.64.0.0/10 range (RFC 6598), not a real public IP. Port forwards go nowhere because the outer NAT is controlled by your ISP, not you.

Even without CGNAT, running a traditional VPN server at home means exposing a port, keeping it patched, and managing certificates or PSKs. It works, but there is ongoing overhead.

Tailscale takes a different approach: every device makes an outbound connection to coordinate through Tailscale's control plane, then establishes direct peer-to-peer tunnels using NAT traversal. No inbound ports required. Works through CGNAT.

---

## Split Tunnel and Exit Nodes

A full-tunnel VPN routes all your traffic through the VPN, including regular internet browsing. That adds latency and routes all your internet traffic through your home connection.

Split tunnel means only traffic destined for your tailnet and advertised subnets routes through Tailscale. Everything else goes out normally through whatever network you are on. Your phone uses your home DNS resolver for all lookups (so ad-blocking and custom DNS apply everywhere), but a webpage loads direct from the internet without touching your home connection.

Tailscale also supports **exit nodes**: a device on your tailnet that handles all outbound internet traffic on behalf of other devices. This is the full-tunnel equivalent. You would use an exit node if you want all your traffic to appear to originate from your home IP, for example when travelling and using untrusted Wi-Fi, or to access geo-restricted content available on your home connection. Exit nodes are configured separately and are not required for the always-on split tunnel setup described here. See the [Tailscale exit nodes documentation](https://tailscale.com/kb/1103/exit-nodes) for how to set one up if you need it.

The split tunnel setup is the one worth running always-on. The overhead is negligible and you get persistent access to your home network with DNS-level filtering on all your mobile traffic.

---

## What You Need

- A Tailscale account (the free personal tier supports up to 100 devices)
- At least one always-on device on your home network to act as a subnet router. Tailscale runs on Linux, macOS, Windows, FreeBSD, and several NAS platforms. See the [Tailscale download page](https://tailscale.com/download) for all supported platforms
- A DNS resolver on your home network for ad-blocking and custom DNS. Pi-hole and AdGuard Home are common choices, but any internally hosted DNS will work
- Your phone: iOS or Android

---

## Step 1: Install Tailscale on Your Home Server

Tailscale provides up-to-date installation instructions for all supported platforms in their [getting started guide](https://tailscale.com/kb/1017/install). Follow the guide for your platform and authenticate the device to your tailnet.

Once the node is online, you need to advertise your LAN subnet so that other tailnet devices can reach everything on your home network, not just the Tailscale node itself. The [subnet router documentation](https://tailscale.com/kb/1019/subnets) covers the exact steps, including enabling IP forwarding and approving the route in the admin console.

### Verify connectivity

Once the subnet route is approved, confirm from your phone (on mobile data, with Tailscale connected) that you can reach a device on your home LAN:

```bash
ping 192.168.1.1
```

Replace `192.168.1.1` with an address on your LAN. A response confirms the subnet route is working.

---

## Step 2: Configure Your DNS Resolver

If you run Pi-hole, AdGuard Home, or another DNS resolver on your home network, you can use it as the DNS resolver for your entire tailnet. Every tailnet device, including your phone, will use it for DNS regardless of what network they are on. Ad-blocking and any custom DNS records follow you off the home network.

Tailscale's [DNS configuration documentation](https://tailscale.com/kb/1054/dns) covers how to set a global nameserver and enable override mode in the admin console.

One gotcha: if Tailscale is also running on the same device as your DNS resolver, you need to prevent that node from using itself as its own upstream. Without this, queries loop back through Tailscale DNS to the resolver, then back again:

```bash
sudo tailscale up --accept-dns=false
```

This tells that node to ignore the tailnet DNS config and use its own system resolver instead.

### Verify DNS is working

From your phone on mobile data with Tailscale connected, check which DNS server is being used:

```bash
nslookup buildtestrun.com
```

The response should show your home DNS resolver's Tailscale IP (`100.x.x.x`) as the server. If you have a custom local DNS record set up, resolve that instead to confirm the full path is working.

---

## Step 3: Configure Your Phone

Install the Tailscale app from the App Store or Google Play and sign in with the same account.

### Enable always-on connection

On iOS, open the Tailscale app, go to Settings and enable "Use On Demand". This keeps Tailscale connected automatically. Under the On Demand settings you can configure it to connect on any network except specific Wi-Fi networks. Add your home Wi-Fi SSID here so that Tailscale does not activate when you are already on your home network, where it is unnecessary.

On Android, open Settings, then Network and Internet, then VPN, tap the gear icon next to Tailscale, and enable "Always-on VPN".

### Confirm split tunnel behaviour

With Tailscale connected and no exit node configured, only traffic for tailnet addresses and your advertised subnets routes through Tailscale. Regular internet traffic goes direct. You can confirm this by checking your public IP from your phone while Tailscale is connected:

```bash
curl ifconfig.me
```

If the result is your mobile carrier's IP (not your home IP), split tunnel is working correctly. If you want all traffic routed through home, configure an exit node instead as described in the [exit nodes documentation](https://tailscale.com/kb/1103/exit-nodes).

---

## What You Get

With this setup in place:

**Access to home network resources from anywhere.** Anything on your LAN is reachable via its local IP or via MagicDNS hostname (e.g., `my-server` instead of `100.x.x.x`). MagicDNS automatically registers device names and is enabled from the admin console. See the [MagicDNS documentation](https://tailscale.com/kb/1081/magicdns).

**Ad-blocking and custom DNS on mobile.** Your home DNS resolver handles all lookups for tailnet devices. Ads and trackers blocked at home are also blocked on your phone when you are out.

**No open ports.** Nothing is exposed to the internet. Tailscale uses outbound-only connections, so CGNAT is not a problem and your firewall rules do not need to change.

**Low overhead.** Split tunnel means only home-bound traffic uses the VPN. Latency on regular browsing is unaffected.

---

## Running Tailscale in Docker

If your server already runs containers, the official Tailscale image works well as an alternative to installing directly on the host:

```yaml
services:
  tailscale:
    image: tailscale/tailscale
    restart: unless-stopped
    network_mode: host
    privileged: true
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}
      - TS_STATE_DIR=/var/lib/tailscale
    volumes:
      - ./tailscale/state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
```

Set `TS_AUTHKEY` in a `.env` file. Generate an auth key from the Tailscale admin console under Settings, then Keys. Use a reusable key if you plan to redeploy the container. `network_mode: host` is required for subnet routing to work correctly. See the [Tailscale Docker documentation](https://tailscale.com/kb/1282/docker) for full details.

---

## Securing Your Tailnet

Your tailnet is only as secure as the account it sits behind. A few low-effort steps significantly reduce the attack surface.

### Secure your identity provider

Tailscale delegates authentication to an identity provider: Google, Microsoft, GitHub, or others. It does not manage passwords itself. That means your tailnet's security depends on your IdP account. Enable MFA on whatever account you use to log in to Tailscale. If that account is compromised, an attacker can authenticate new devices to your tailnet.

### Require device authorisation

By default on personal accounts, any device that authenticates with your credentials joins the tailnet immediately. You can require explicit admin approval for each new device instead. Enable this under Settings in the admin console. With it on, new nodes appear in a pending state until you approve them. You will notice if something unexpected tries to join.

See the [device authorisation documentation](https://tailscale.com/kb/1099/device-authorization) for setup steps.

### Audit and remove devices you do not recognise

Check the [Machines page](https://login.tailscale.com/admin/machines) in the admin console periodically. Every device that has ever authenticated appears there. Remove anything you do not recognise or no longer use. Old devices with valid keys are a risk you do not need to carry.

### Understand key expiry

By default, Tailscale node keys expire after 180 days. When a key expires, the device is kicked off the tailnet until it re-authenticates. This is intentional: it ensures devices periodically re-verify they are still authorised.

For servers and always-on devices, re-authentication can be disruptive. You can disable key expiry on a per-device basis from the Machines page. Do this selectively for infrastructure nodes. Leave key expiry enabled on personal devices, including phones, so that lost or decommissioned devices eventually fall off the tailnet automatically.

See the [key expiry documentation](https://tailscale.com/kb/1028/key-expiry) for details.

### Use ACLs to restrict access between devices

By default, all devices on your tailnet can reach all other devices. For a personal home lab this is usually fine, but Tailscale's access control lists (ACLs) let you restrict which devices can talk to which. For example, you could allow your phone to reach home network resources while preventing lab servers from initiating connections back to your phone.

ACLs are defined in a JSON policy file in the admin console. The [ACL documentation](https://tailscale.com/kb/1018/acls) has examples to get started. For a simple personal tailnet the default open policy is acceptable, but if you add untrusted or shared devices, ACLs are worth the small configuration effort.

---

## Summary

Tailscale removes most of the friction from home lab remote access. Install it on one always-on machine, advertise your LAN subnet, point your tailnet at your home DNS resolver, and enable always-on VPN on your phone. You get persistent access to your self-hosted services and DNS-level filtering on mobile, and it works regardless of whether your ISP uses CGNAT.

The free tier covers personal use with up to 100 devices. Configuration lives in the admin console and there is no VPN server to maintain.
