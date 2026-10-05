# Putting the server on the internet — for Sean

Jill asked me to host the server so her friends can join from their own houses.
I haven't, and won't without you: it means signing up to a hosting company and
paying monthly, and I don't create accounts or spend money. **This is the
decision, and everything else is ready.**

## What's already done

| Thing | State |
|---|---|
| `jills-server.ps1` | Works. Windows, nothing installed, same-wifi only. **Running now.** |
| `server.js` | The same server for a hosting company. Node, **zero dependencies**, no `npm install`. Untested — Node isn't on this machine. |
| The game | Has a **🌍 The world** box for the address; already asks for `wss://` when the page is on https. |

## Before that — one thing blocking the *home* server right now

The home server runs, but **a friend's device on your wifi will currently be
refused.** Two reasons found 7 Aug: there's no inbound firewall rule for it, and
The home wifi network is classified **Public**, Windows' most restrictive profile.

My testing didn't catch this because I connected a second player on this same
machine, which never crosses the firewall. It would have failed on the day.

I can't fix it — firewall changes need an administrator and are a security
setting, so it's yours. In an **admin** PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Jill's Game server" -Direction Inbound -Protocol TCP -LocalPort 8787 -Action Allow -Profile Public -RemoteAddress LocalSubnet
```

`-RemoteAddress LocalSubnet` is deliberate: it opens the port **only to devices on
your own wifi**, not to the internet. To undo it:

```powershell
Remove-NetFirewallRule -DisplayName "Jill's Game server"
```

I'd leave the network set to Public and use this narrow rule, rather than
reclassifying the whole network as Private to fix one port.

## What it would cost

Roughly, for something this small:

- **Free tiers exist** (Render, Fly.io, Railway and similar all have one). They
  usually sleep after idle and take ~30 seconds to wake — annoying but survivable
  for two children.
- **~£5–7 a month** buys one that stays awake.
- Bandwidth is nothing: four numbers, ten times a second, per player.

## The two real decisions

**1. Anyone with the address can join.** There are no invitations. If the address
ever gets shared around, strangers can ride in Jill's world. Options, cheapest
first:

- Only start the server when they're actually playing. Costs nothing, solves most of it.
- Put a password in the address, e.g. `jills-world.onrender.com/?key=something`,
  and have the server refuse anyone without it. **About 20 lines. Say the word and
  I'll write it.**
- Full accounts on the server. Much more work, and it starts holding data.

**2. It deliberately stores nothing.** No names, no passcodes, no positions
written down — everything lives in memory and dies when it restarts. That's what
keeps this out of "holding other children's data" territory. I'd keep it that way,
and **I'd keep there being no chat**, which removes the biggest risk in any game
children can join.

## If you say yes

1. You make the account and pick the plan — that part has to be you.
2. Upload `server.js`. Start command is `node server.js`. Nothing else; it reads
   `PORT` from the host.
3. The host gives you an address like `jills-world.onrender.com`.
4. Jill types that into **Friends → 🌍 The world**. Her friends type the same.

The host provides https, so the game will use `wss://` automatically. Worth
knowing: **the published site at jills-game.netlify.app cannot talk to a plain
`ws://` server** — browsers block it. The game now says so rather than failing
silently.

## What I told Jill

That I can't put it on the internet because it costs money every month and needs
an account, and that's yours to decide — not that it's impossible or too hard.
She's been told the same about downloads all along and takes it fine.
