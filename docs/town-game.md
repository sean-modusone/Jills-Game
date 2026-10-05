# Town game — `game/jills-town-builder.html`

Jill calls this "the roleplay game" or "the rp game". three.js **r128** (global script), one big IIFE, ~3,300 lines. Two screens: a **plan** grid (place tiles bought with coins from packs) and **3D play**.

Most features were added on 3 Oct 2026 as commented blocks near the end of the script, each wrapping earlier functions (`const _f=f; f=function(){…}`). The blocks, in order, and what they own:

| Block | What it does | Key names |
| --- | --- | --- |
| `ROLE-PLAY UPGRADE` | Autosave; enterable buildings; furniture that works; pets; carry items | `playSnapshot`/`loadPlayData`, `showPlace`, `INTERIORS`, `ACT_OF`, `STOCK`, `CARRY`, `USE`, `PETS`, `window.__rp` |
| `PAINTER` | Canvas patterns (brick, roof tiles, wood, wallpaper, tarmac, grass, quilt) applied by a material's original hex | `PAT`, `patTex`, `paintMesh`, `WALLPAT`, `ROOMPAT`, `roadTile` |
| `REAL-LOOKING FOOD` | Printed packet labels and textured food | `FOOD`, `T`, `lbox`, `lcyl` |
| `DECORATE MODE` | Toca-style drag-and-drop decorating, recolour, copy, bin, wallpaper/floors | `startDesign`, `CATALOGUE`, `decorByKey`, `adoptedKeys`, `roomStyle`, `applyCol` |
| `REAL PETS` | Pug, rabbit, realistic horse, pig, sheep models (lazy-loaded GLTFLoader) | `PET_MODELS`, `realPet` |
| `TOGETHER` | Followers; friends come through doors and into cars | `buddiesOf`, `SEATS`, `glassUp` |
| `BIG HOUSE` | 32×24 house with hallway and six rooms, solid inside walls, chooser (empty / furnished / keep old) | `buildBigHouse`, `bigHouse`, `inWalls`, `BIG_ROOMS` |
| `EIGHT NEW PACKS` | Stables, salon, clothes shop, café, cinema, pool (swimming), police (drivable car), Christmas (snow, presents) | `shopFront`, `DRIVE`, `swimRects` |
| `SALON HAIRSTYLES + ROOM-BY-ROOM` | Salon-only hairstyles and accessories; per-room wallpaper/floor | `SALON_STYLES`, `addHairAcc`, `openSalon` |
| `FRIDGE & BIG SHOP` | Fridge stock, trolley, paying, shopping bag, unpacking | `fridgeStock`, `avatar.trolley`, `avatar.bagItems` |
| `EVERYDAY STUFF` | ~58 more carry items, wearable clothes, microwave/kettle/washer/bin | `WEAR`, `fridgeMagnets` |
| `LOOK-AND-FEEL POLISH` | Sky dome, clouds, hills; buildings fade when blocking the view; framed windows, curtains, skirting, door frames; skirts; eyebrows | `buildSky`, `tickFade`, `dressRoom`, `winSets` |
| `DAY & NIGHT · SMOOTHER PEOPLE · BUSY TOWN` | Day/night cycle and button; rounder people; walking townsfolk, birds, flowers | `dayT`, `applyDayNight`, `smoothPerson`, `walkers` |
| `🌦️ WEATHER` | Sunny / cloudy / rainy / storm / snowy | `weather`, `tickSnow`, `lightning` |
| `BEDS` | Pillows, duvet, blanket; messy after sleeping; "Make the bed" | `messyBeds`, `MESS` |
| `👥 PEOPLE PICKER` | Switch opens a named list of your people | `openPeople`, `NAMES` |

## Saves

`localStorage["jills-worlds-v1"]` maps world name → `{grid, coins, owned, savedAt, play}`. `play` holds actors (id, dress opts, position, where, held item, bag, name, follow), pet, decor/loose items/toggles per building key `"r,c"`, car positions, adopted/styles/bighouse/fridges/magnets/beds, weather and `dayT`. Saves on every change (debounced), every 5 s and on pagehide; reopening mid-play goes straight back into play. Town tiles build through `seeded()` so random looks stay put.

## Gotchas specific to this file

- Insert new blocks before the last two lines (`buildDecorBar();` / `initThumbs();…`). Normalise CRLF first.
- Buttons bound by reference at load skip later wrappers: `useBtn`, `actBtn`, `backBtn` were all rebound with arrows. Do the same for any new wrapper of a bound function.
- `nearAct` is recomputed each frame in `scanActs` (wrapped several times: followers yield to furniture; pickups win only when right on top).
- Dropped items land via a downward raycast (`floorAt`); it must set `_rc.camera` because room signs are sprites.
- Testing in the in-app browser: front the tab first; `__rp.act(plat)` and `__rp.stand()` drive furniture directly.

## Known gaps / ideas parked

- Cat, hamster and bird pets are still code-built (no approved model).
- Coins come from placing tiles — to be replaced by earning (jobs, shows) when the core loop work starts.
- The 28 packs are breadth without purpose; Phase 1 decides which serve the game.
