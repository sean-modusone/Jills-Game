# Shared kit

The things every game shares — coins, the character, owned items, saved places — live in one set of files under `game/shared/`. Each game keeps its own drawing code; the kit holds the **data**. A new game starts from the kit and gets all of it for free.

## Decided (Sean, 5 Oct 2026)

- **One coin across all games.** Game-specific prizes (rosettes) stay in their own game.
- **New games use three.js r152** (ES modules, import map). The town moves to r152 in Phase 2.
- **New games go through the weekly pick** like any other new idea.
- **Cloud saves are wanted.** Service choice is in "Cloud saves" below; the kit is local-first so it can sync later without the games changing.

## Rules

- Games never read or write `localStorage` for shared things. They call `JillProfile` / `JillWallet` (and later `JillCharacter`, `JillItems`, `JillPlaces`).
- The kit never depends on three.js, so the r128 town and r152 yard can both load it.
- Plain classic scripts exposing `window.Jill*` (same pattern as `account.js`). They load from `file://` too, which ES modules don't.
- The kit never writes `jillsAccount`.
- Every way to earn coins is listed in `PAY` in `wallet.js`. A game can't pay coins from a source that isn't listed.
- Changing the save shape means raising `VERSION` in `profile.js` and adding an upgrade step. Old saves are backed up first (`jillsProfile-backup-vN`).

Load order in a page:

```html
<script src="shared/profile.js"></script>
<script src="shared/wallet.js"></script>
```

Tests: `node tests/shared-kit.test.js`.

## Pieces

| File | Status | What it holds |
| --- | --- | --- |
| `profile.js` → `JillProfile` | Built | The one save (`jillsProfile`): coins, log, character, owned, unlocks. Versioned, backed up before upgrades, damaged saves kept aside, other tabs kept in step. |
| `wallet.js` → `JillWallet` | Built | `balance()`, `earn(source, amount?)`, `spend(price, item)`, `onChange()`, `importOld(game, coins)`. Pay table with optional daily caps. Last 50 earns/spends logged. |
| `character.js` → `JillCharacter` | Next | The character **recipe**: skin, hair style + colour, top, bottoms, boots, helmet… plus the catalogue of parts. Each game has a small adapter that turns the recipe into its own model (town: `biped()`; yard: recolour the rigged rider). A shared 2D portrait for menus and friend cards. |
| `items.js` → `JillItems` | Later | One catalogue: id, name, icon, price, which games can use it. Owned items in the profile. |
| `places.js` → `JillPlaces` | Later | One save format for rooms/worlds: `{id, kind, size, objects:[{type,x,z,rot,colour}]}` and a shared object catalogue. The town's furniture `build()` functions move here (they're already self-contained). |
| `template.html` | Later | Starter game: account gate, profile, coin pill, character, three.js r152 scene. Jill copies it to start a new idea. |

## Moving the existing games over

Nothing uses the kit yet. Order:

1. **The new game** uses `JillProfile` + `JillWallet` from day one.
2. **Yard wallet.** Replace the six `coins += …` lines in `horse-3d.html` with `JillWallet.earn(...)` and shop purchases with `spend()`. Copy the old balance in once with `importOld("yard", saveData.coins)`.
3. **Town wallet.** Town coins are saved per world (`jills-worlds-v1`), so there are several balances. Plan: import the largest one once.
4. **Character**, then **places** when the town's code is split into modules (Phase 2).

### Balance problem to settle before step 2

Jill's yard save holds **10,000,000 coins** (she asked for them; `horse-3d.html` pays them once, flag `bigWin`). With one coin, importing that balance makes every price in every game meaningless. Options:

- **Fresh start:** the shared wallet starts at a small amount; old balances aren't imported. Talk it through with Jill first.
- **Import, but capped** (e.g. up to 500), and turn her ten million into something she keeps — a trophy or a "millionaire" title in the yard.
- **Import everything** and accept that coins don't matter for her until prices change.

Recommended: the capped import + trophy. It honours what she asked for without breaking the new game's shop.

Also: the town pays 1 coin per tile placed, which can be farmed by painting tiles. Give `town:build-tile` a daily cap when the town moves over.

## Cloud saves

The kit is local-first: the game always reads and writes the local profile, and a sync layer copies it up and down. This keeps the games working offline and from `file://`.

**What's needed:** a sign-in, a database, and rules so each family can only read its own saves. No server code of our own is required with the recommended option.

| Option | What it is | Fits because | Watch out |
| --- | --- | --- | --- |
| **Supabase** (recommended) | Hosted Postgres + sign-in + row-level security, called straight from the page | One `profiles` table (JSON per child profile), rules enforced by the database, EU region available, free tier to start | A second company alongside Netlify; free projects pause when unused for a while |
| Firebase | Google's equivalent (Firestore + Auth) | Mature, generous free tier, good offline support | Google account/data; rules language to learn |
| Netlify Functions + Blobs | Our own small save API on the host we already use | One provider, one bill | We write and maintain the sign-in and access checks ourselves — the riskiest part to get wrong |

**Accounts:** sign-in should belong to the **parent** (email magic link, no password), with child profiles underneath it. The child still picks a game name, never their real name. This is the normal shape for children's apps in the app stores and for UK/Irish rules on children's data (Ireland's age of digital consent is 16, so a parent account is needed anyway). The current offline name + passcode stays as the profile picker on a device.

**Sync:** last-writer-wins per section (character, places, owned), but coins merge by the log of earns/spends so two devices can't overwrite each other's coins. Store a stable id on every log entry before sync is built.

**Sean to decide:** which service; signing up for it (and any cost); a privacy note for the site. Nothing about other children is stored until friends go online — that's a separate decision (`docs/multiplayer.md`).
