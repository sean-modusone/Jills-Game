# CLAUDE.md — Jill's Game

Read this first. It replaces the per-PC Claude memory that used to hold this knowledge.
Deeper notes: `docs/town-game.md`, `docs/yard-game.md`, `docs/multiplayer.md`, `docs/working-with-jill.md`, `docs/roadmap.md`.

## Who's who

- **Jill (11)** is the designer and art director. She types fast with typos ("plats" = plaits). She knows real horsemanship — honour it.
- **Sean (Dad)** supervises and approves: anything that goes live, any download, any account, anything that costs money.
- Jill keeps "vibing" freely on her own branch; Sean reviews the Netlify preview and merges to `main`.
- When Sean says "Dad here" he wants detail. Jill wants short, plain replies (see `docs/working-with-jill.md`).

## Direction (agreed 5 Oct 2026)

Two games on a **shared engine**: the **pony yard** game and the **town** roleplay game, sharing character, save and code over time. Aim: app stores one day. The test for every new idea: does it feed **care, riding, competing or expressing**? Anything new waits for the weekly pick; bugs and polish don't. Full plan: `docs/roadmap.md`.

## Stack

- Plain HTML/CSS/vanilla JS, **no build step**. One HTML file per game.
- three.js from CDN: **r128 global script** in the town game, **r152 ES modules** (import map, unpkg) in the yard game. Unifying these is a Phase 2 job.
- Models: glTF/GLB, CC0 (Quaternius via poly.pizza) and CC-BY (Sketchfab, credited in `game/assets/LICENSE.txt`). Each model exists twice: `assets/x.glb` (used over http) and `assets/x-model.js` (base64, used from `file://`).
- Most town art is drawn in code: canvas textures, rounded boxes, WebAudio synth sounds.
- Saves: browser `localStorage`, per device. Keys: `jills-worlds-v1` / `jills-last-world` (town), `jillsHorseGame` (yard), `jillsAccount` (account — never clear it, the passcode can't be recovered).
- Hosting: Netlify site `jills-game` (id `da802f96-7304-4ba9-ac4b-e450d191ef6e`), publish dir `game/`.

## Layout

```
game/                 the published site (everything here goes live)
  index.html          front door: account gate (account.js) + game menu
  horse-3d.html       pony yard game (~7,900 lines)
  jills-town-builder.html  town roleplay game (~3,300 lines)
  horse-game.html     2D login/coat/rider designer feeding horse-3d
  account.js          offline accounts, friend codes, yard visits, ride-together UI
  assets/             models (.glb + *-model.js), LICENSE.txt
  character-*.html, dollhouse.html, map-to-town.html, jills-world-builder.html   early prototypes (to archive)
server/               LAN multiplayer server (PowerShell), untested Node version, static dev server
docs/                 project knowledge (this file's companions)
```

## Running and testing

- Dev server: `.claude/launch.json` config **"game"** runs `server/static-server.ps1` on http://localhost:8765 (Jill's PC). On Sean's Mac (no PowerShell) use **"game-mac"**: `python3 -m http.server` serving `game/` on the same port. Use http, not `file://`: the in-app browser disables localStorage on `file://`.
- **Syntax check before claiming done** (Node 24 is installed on Jill's PC): extract the town game's IIFE and run `node --check` on it. A comment once swallowed a line and blanked the page.
- **Screenshot every change before telling Jill it's done.** Sean's rule.
- Debug handles: town `window.__rp` (actors, avatar, plats(), enter(key), go(x,z), act(plat), stand(), snapshot()); yard `window.__dbg`, `__pose`, `__fit`, `__loadErr` (check this first on a black screen).
- In-app browser quirks: it only renders while its tab is fronted (`tabs_select` before screenshots or frames are stale); `location.reload()` may do nothing in the pane; `javascript_exec` runs against the last-bound tab.

## Deploying

- **Never deploy without Sean's explicit OK for that deploy.** Once Netlify is linked to the repo, merging to `main` deploys; until then the Netlify connector's `deploy-site` returns an `npx @netlify/mcp …` command — run it with the working directory **`game/`**, never the repo root.
- The live site's saves are separate from local ones; tell Jill that when shipping.

## Code conventions and traps (read before editing)

- **Town game is layered:** each feature is a commented block near the end of the IIFE (`ROLE-PLAY UPGRADE`, `PAINTER`, `DECORATE MODE`, `BIG HOUSE`, `WEATHER`, …) that wraps earlier functions with `const _f=f; f=function(){…}`. Consequences:
  - Anything bound **by reference at load** (`btn.onclick = fn`) skips later wrappers — bind with arrows `()=>fn()`.
  - Insert new blocks **before** the final `buildDecorBar();\ninitThumbs();` lines.
  - This layering is the main reason for the Phase 2 module rewrite. Don't add more layers than you must.
- `let`/`const` TDZ: assigning or reading a binding before its line black-screens the page with no visible error.
- Never write an empty `catch(e){}`; stash and `console.error` the error.
- Any `Raycaster` that may hit a `Sprite` needs `raycaster.camera` set.
- `Box3.setFromObject` lies for skinned/rigged models — measure bones or sample skinned vertices.
- Downloaded models often have off-centre origins: recentre an inner node, position the wrapper.
- Text inputs on pages with movement keys: guard keydown/keyup with `typingInABox(e)` or space never types.
- GLTFLoader shares materials between parses — `clone()` before recolouring.
- PowerShell writing files: `WriteAllLines` converts to CRLF; normalise before string-anchored edits. Write UTF-8 without BOM.

## Safety rules (keep these)

- No chat between players. Friend-code/name only, never open search. "Don't choose your real name" stays on the account screen.
- Nothing stores other children's data on a server without Sean's decision (see `docs/multiplayer.md`).
- Downloads and new asset licences: Sean approves. Check licences before using: CC0 or CC-BY only. NoDerivs is unusable. NonCommercial blocks the app-store goal.
