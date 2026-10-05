# Jill's Game

Browser games designed by Jill (11) and built with Claude Code, with Sean (Dad) approving what goes live.

**Live:** https://jills-game.netlify.app

| Game | File | What it is |
| --- | --- | --- |
| Pony yard (3D) | `game/horse-3d.html` | Look after, ride and show your pony; drive the horsebox; hack out; visit friends' yards |
| Town (3D roleplay) | `game/jills-town-builder.html` | Build a town, then live in it: houses, shops, decorating, pets, shopping, weather |
| Front door | `game/index.html` | Account gate + menu of games |

Direction (agreed 5 Oct 2026): **two games on a shared engine**, aiming for the app stores one day. See [`docs/roadmap.md`](docs/roadmap.md).

## Run it locally

No build step and nothing to install beyond a browser.

- Quickest: open `game/index.html` in a browser (saves work from `file://`, models load from the inlined `assets/*-model.js` copies).
- Proper (same as the live site): serve the `game/` folder over http, e.g.
  - Windows, nothing installed: `powershell -ExecutionPolicy Bypass -File server/static-server.ps1` → http://localhost:8765
  - With Node: `npx serve game`

## How we work

- `main` is what's live. Netlify deploys `main` (publish dir `game`, see `netlify.toml`).
- Jill builds on her own branch with Claude; every branch gets a Netlify preview link.
- Sean reviews the preview and merges.
- Everything Claude needs to know about the project is in [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs/).

Asset credits: [`game/assets/LICENSE.txt`](game/assets/LICENSE.txt) (CC0 and CC-BY models).
