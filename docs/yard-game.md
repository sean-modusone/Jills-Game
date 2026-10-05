# Pony yard game — `game/horse-3d.html`

three.js **r152** as ES modules (import map), ~7,900 lines. The deepest of the games. Login and designer flow lives in `horse-game.html` and `index.html` + `account.js`.

## What's in it

- **Riding:** gaits W/S (halt/walk/trot/canter; trot = Walk anim ×1.9), Space to jump, knockable arena poles (4 faults, reset after 18 s), solid cross-country logs.
- **Care:** grooming kit, feeding carrots, muck-out chore, care hearts (fed/groomed/ridden) feeding turnout score.
- **Tack:** saddle, pads (LeMieux-style quilted pad bent over the barrel), bridle on the Head bone with live reins; Jill's untacking — swipe UP on girth buckles then the throatlash.
- **Shows:** practice arena; show arena far south; you load the pony into a drivable pickup + trailer and drive to the showground. Judge cycle every 30 min; turnout + riding scoring; rosettes and coins.
- **World:** woodland, river and hill trails; wild ponies; NPC riders; a barking dog that spooks the pony; trailhead parking; quests from the people already in the world (Poppy, Maya, Ella, Ruby, Sophie).
- **Shop:** 22 items in three sections (yard kit, for your pony, for you), one saddle/pad/rug/jacket/etc. worn at a time.
- **Yard planner:** 13 placeable items (jumps, poles, hay, troughs…), saved as `saveData.layout`.
- **Horses:** Quaternius pony (recolourable coats incl. dapple grey), a realistic rigged horse (`horsereal.glb`, CC-BY) with coat recolouring and build variation, a pony sales yard.
- **Social:** offline accounts, friend codes, visiting a friend's yard by code, ride-together peer-to-peer (see `multiplayer.md`).

Save: `localStorage["jillsHorseGame"]` `{player, horse, coat, rider{…}, coins, owned, equipped, rosettes, layout, questState, …}`.

## Asset loading (dual path)

`assetData(key)` returns an ArrayBuffer (or string for the three `.gltf`) for `GLTFLoader.parse`. Over http it fetches `ASSET_FILES`; from `file://` an inline script `document.write`s the `*-model.js` wrappers. `MUST_HAVE` lists essential assets — a missing optional model must never trigger the 32 MB fallback (that bug once doubled every web visit). `horsedapple.glb` (30.8 MB) lazy-loads only near the top paddock.

## Hard-won lessons (don't relearn these)

- **Rider pose:** `window.__pose` {legL,kneeL,legR,kneeR,arm,farm} and `window.__fit` are read every frame; bones bend relative to stored rest (`bone.userData.rest`). Tune live, then bake. Feet are IK targets parented to Root — `feetToStirrups()` reparents them while mounted.
- **Bone axes (measured):** horse `Neck1-3` +Y runs along the neck, +Z up out of the crest (offset ≈0.4); `Head` +Y to the muzzle; cannon bones +Y down the leg. Rider `LowerLeg` +Y down. Rider material names lie: legs are `Brown_02`.
- **Measuring rigged models:** `Box3.setFromObject` lies (bind pose, ignores skeleton scale). Use `trueBounds(obj)` (samples skinned vertices). Measure after adding to the scene and after rotating.
- **Off-centre origins** on downloaded models: wrap in a Group, recentre the child. Anchor tack by the part you care about (saddle horn, not dangling stirrups). Trust screenshots over tack-local arithmetic.
- **Raycasting the horse is unreliable** (SkinnedMesh).
- **Black screen:** read `window.__loadErr`. Usual causes: duplicate `const`, TDZ on a `let` assigned before its line, or reading `model` at module scope (it only exists inside the loader callback — use `window.__dbg.model`).
- **The `horsereal` animation** is one 60 s strip; `REAL_CUTS` slices it (Walk 29.6–32.4 s, Gallop 33.2–35.4 s). Plaits/boots need Quaternius bone names, so they're skipped on this horse. Markings are baked into its photo texture (blaze/socks the same on every recoloured horse).
- **Space bar in text boxes:** the global movement keydown used to `preventDefault` Space — `typingInABox(e)` guards it.
- **fps:** wait ~9 s after load before measuring (base64 decoding skews early readings).

## Sourcing more models

poly.pizza serves Quaternius CC0 as GLB (the URL appears in `performance.getEntriesByType("resource")`). Sketchfab ships `scene.gltf`+`.bin`+PNGs: shrink textures to ~1024 JPEG and pack to GLB. Licence check first: most popular free horses are **NoDerivs** (unusable) or **NonCommercial** (blocks app stores). A good CC-BY candidate already found: "Toon Horse with Saddle (Rigged, Animated)" by flairetic (4.1k tris, walk/trot/gallop, 5 coats).
