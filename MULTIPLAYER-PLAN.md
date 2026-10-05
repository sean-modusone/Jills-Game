# Playing with friends — Jill's design

Written down 4 August 2026. **Not being built yet** — Jill's own call: *"not now
since we have a long way to go."* This is the plan for when we are ready.

## What Jill asked for

**A "Create an account" button.**
- You type a **name** and a **passcode**
- Neither can be changed afterwards
- Under the name box it says: **"Don't choose your real name"**
- Under the passcode box it says: **"Create at least a six digit passcode"**

**Once you're logged in, an "Add friend" button.**
- Search for your friend's name
- Their profile picture comes up
- Press the **+** button
- Your friend can then join your server

## Jill's safety instinct, which is correct

She specified "don't choose your real name" herself, unprompted. That is exactly
the right rule and it should stay in, worded just as she wrote it. Worth telling
her that a professional would have written the same line.

## What this actually needs — it is a different kind of thing

Everything in the game so far runs **entirely inside the browser**. There is no
server. That is why it can be a single HTML file dragged onto Netlify, and why
it costs nothing to run.

Accounts and shared worlds cannot work that way. They need:

1. **A real server that stays running** — to hold accounts and pass players'
   positions between each other, many times a second.
2. **A database** — names, passcodes (stored hashed, never as plain text),
   friend lists.
3. **Someone responsible for it** — it costs money monthly, it needs updating,
   and it holds children's data.
4. **Sync code in the game** — every horse, rider and moved building would need
   to agree across machines. This is the hardest part and touches everything.

Rough shape: a small Node server with a websocket, something like Supabase or
Firebase for accounts, and a paid tier once more than a couple of people use it.

## Decisions for Dad before any of it starts

- **It stops being free.** A server that's always on costs money every month.
- **It holds other children's data.** Names and passcodes belong to Jill's
  friends, not just her. That carries real responsibility.
- **Who can join?** Friend-code only (you can only add someone whose exact name
  you already know) is far safer than an open search. Jill's "+ button after
  searching a name" is already close to this.
- **No chat** would avoid the biggest risk by a mile. Riding together without
  typing to each other is still brilliant fun.

## The much simpler middle step

Jill wants to show a friend on a playdate. She does not need multiplayer for
that — the game is already public at **jills-game.netlify.app**. Two people can
each play it on their own device today. What's missing is only *seeing each
other*, which is the expensive part.

A cheap in-between: **shareable yards**. Turn a saved layout into a code or a
link, so a friend can load Jill's exact yard and horses and look round it. No
server, no accounts, no live sync — but it is genuinely "showing my friend my
game".
