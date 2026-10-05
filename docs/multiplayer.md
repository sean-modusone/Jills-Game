# Playing with friends

Status: **offline half built; live online play not hosted.** Hosting is Sean's decision (cost, responsibility, other children's data). See also `MULTIPLAYER-PLAN.md`.

## Built (August 2026)

- **Accounts** (`game/account.js`, exposed as `window.JillAccount`): name + passcode (6+ digits), neither changeable, gate on `index.html` before anything else. Jill's own wording stays: "Don't choose your real name", "Create at least a six digit passcode". Passcode is stored only as a hash (`scramble()`). Asked once per visit (`sessionStorage["jillsUnlocked"]`). Eye button on the passcode box.
- **Friends:** add by name; friend codes `NAME-XXXX` (checksum; carries the name so no lookup is needed). Yard NPC riders are labelled honestly ("on your yard"), never passed off as real friends. Deterministic canvas avatars from the name.
- **Visiting a friend's yard by code** (`window.JillYard`): export your save as base64, a friend visits it, "Go home" restores your own save byte-for-byte.
- **Ride together, peer-to-peer** (`window.JillLink`): WebRTC with codes swapped by hand, `iceServers: []` so no outside company is involved. Works on a shared wifi (a playdate), not reliably between houses.
- **LAN world server** (`server/jills-server.ps1`): zero-install WebSocket server in C# via PowerShell. Stores nothing. Relays positions and an opaque "look" blob (coat, clothes, tack). Client side `window.JillWorld`. An https page needs `wss://`.
- `server/server.js`: the same server for Node hosting, zero dependencies — **untested**. `server/HOSTING.md`: costs and setup notes.

## Before anything is hosted (Sean)

- It stops being free (~£5–7/month for an always-on server).
- It would hold other children's names and passcodes — real responsibility.
- Friend-code only, never open search. **No chat.** Riding together without typing is still brilliant fun.
- For app stores: kids' apps have extra rules (data collection, ads, accounts). Plan for that before adding accounts that leave the device.

## Lessons

- When Jill asks for a feature, build the part that can be built first and explain the gap afterwards. A plan is not a deliverable to an 11-year-old.
- Never call a PowerShell script block from a .NET background thread (kills the process); log inside C#.
- Remote players' yaw must be wrapped to ±π before lerping. Clone materials before recolouring a friend's pony.
