# Roadmap

Full review and reasoning: the "Jill's Game — Review & Way Forward" doc (Claude Docs, Sean's account).

## Decided (Sean, 5 Oct 2026)

- **Two games, shared engine:** the pony yard game and the town roleplay game. Over time they share one character (look, clothes, hair), one save/account and one code base.
- **Ambition:** app stores one day. Choose licences, data handling and performance with that in mind (CC0/CC-BY only; no NonCommercial assets; keep data on-device unless Sean decides otherwise).
- **Workflow:** Jill builds freely with Claude on her own branch; Sean reviews the preview and merges to `main` (which is live).
- **Shared kit (5 Oct 2026):** one coin across all games; new games use three.js r152; new games go through the weekly pick; cloud saves wanted (service not yet chosen). See `docs/shared-kit.md`.
- **Still open:** budget ceiling; date for Jill's pitch session.

## Pillars (the test for new ideas)

Care · Ride · Compete · Express. In the town game, read "care" as daily life (food, sleep, tidying, pets) and "compete/ride" as goals and outings. An idea that feeds none of these waits.

## Phases

| Phase | What | Status |
| --- | --- | --- |
| 0. Foundations | Repo; clutter kept out; `CLAUDE.md` + `docs/`; Netlify linked with branch previews; idea inbox | In progress (5 Oct 2026) |
| 1. Agree the games | Pitch session with Jill; one-sentence pitch per game; art direction; Playwright smoke tests + GitHub Actions | Next |
| 2. Shared engine | Vite + ES modules; one three.js version; shared character/save/asset modules; compress assets (glTF-Transform) | — |
| 3. Core loops | Yard: needs, bond, skills, show calendar, earning. Town: earning through jobs instead of tiles, daily goals | — |
| 4. Share | Yard/town visiting by code polished; decide cloud saves and any hosted multiplayer | — |

## The weekly loop

1. Jill playtests the latest preview, drops ideas/bugs in the inbox.
2. Jill + Sean pick one goal: a player-facing sentence + 3–5 checks.
3. Claude builds on a branch in loops: build → smoke tests → screenshots → fix, until the checks pass or a decision is needed.
4. Netlify preview link → Jill plays it → Sean merges.

Bugs and polish skip the queue; new features wait for the pick.
