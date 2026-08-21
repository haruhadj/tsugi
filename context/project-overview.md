# Project Overview

## What Tsugi is

Tsugi (次, "next") turns "you should watch this" into a link worth clicking. A signed-in user
picks one title or several, adds their scores and a take, and gets a short URL that unfurls
into a rich card anywhere they paste it.

Titles come from **AniList** or **MyAnimeList** — searched, or picked straight out of the
user's own list on whichever service they signed in with.

## Who it is for

People who track what they watch and read, and who recommend things to friends in a chat
window — Discord, WhatsApp, X.

That audience is narrower than "anyone who watches anime", and deliberately so. Creating
requires an account (**D23**), and the accounts that matter are AniList and MyAnimeList.
Tsugi is built for people who already keep a list, and the sign-in screen is arranged to
say so.

## What success means

The product's promise, restated after the pivot to required accounts:

> **From the create screen to a share link on the clipboard, in under 10 seconds, for a
> signed-in user.**

Sign-in is a one-time cost, paid before the clock starts. What must never regress is the
distance between *having an opinion* and *having a link*. Every design decision defers to
that: a feature that adds a second to this path has to justify itself against the attention
it costs.

The second promise carries the first:

> **Every generated link renders a social preview good enough that the recipient clicks it
> without being asked to.**

An unfurled card is the product's entire distribution mechanism. A link that previews as a
bare URL has failed even if the page behind it is perfect. This is also why **viewing never
requires an account** (invariant 9) — gating the card would end the loop that makes Tsugi
spread at all.

## What it is not

Not a tracker, not a social network, not an AniList or MAL competitor. Tsugi does not want to
own a user's watch history — it *reads* the history they already keep somewhere else, and
never writes back to it. See [`functionality.md`](./functionality.md) for the enforced
boundary and the reasoning behind each exclusion.

## Current state

Greenfield. As of 2026-08-09 the repository contains this context set, environment
configuration, and no application code. The Supabase project is connected and verified.

Related: [`functionality.md`](./functionality.md) · [`user-flow.md`](./user-flow.md) ·
[`planning/PLAN.md`](./planning/PLAN.md)
