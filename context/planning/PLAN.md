# Tsugi — Build Plan

The phase map and the reasoning behind its shape. Versions live in
[`../tech-stack.md`](../tech-stack.md); scope lives in
[`../functionality.md`](../functionality.md). Neither is repeated here.

## Shape of the build

```
  Phase 0  Foundation & CI ────────── no user-visible output
     │
  Phase 1  Data layer ─────────────── full schema, day one
     │
  Phase 2  Authentication ─────────── creation now requires it
     │
  Phase 3  Media providers ────────── the riskiest third-party work
     │
  Phase 4  API surface
     │
  Phase 5  Create & share UX ──────── first time the product is usable
     │
  Phase 6  Public page & OG cards ─── first time it is shareable
     │
  Phase 7  List import ────────────── the payoff for requiring accounts
     │
  Phase 8  Dashboard
```

| Phase | Delivers | External prerequisite |
|---|---|---|
| [0](./PHASE-0.md) | Scaffold, Tailwind 4 + DaisyUI 5, test harness, CI | GitHub remote ❌ |
| [1](./PHASE-1.md) | Schema: groups, items, score pairs, auth tables, RLS | Supabase ✅ |
| [2](./PHASE-2.md) | AniList · MAL · Google sign-in, the Hono app, `/settings` | 3 OAuth apps ❌ |
| [3](./PHASE-3.md) | `UnifiedMediaResult`, both search adapters | — |
| [4](./PHASE-4.md) | Hono, rate limiting, create + read | Upstash ❌ |
| [5](./PHASE-5.md) | Create screen, item tray, share modal | — |
| [6](./PHASE-6.md) | `/r/[slug]`, OG card, view counting | Vercel ❌ |
| [7](./PHASE-7.md) | Import from your AniList / MAL list | — |
| [8](./PHASE-8.md) | Your recommendations, connections, delete | — |

## Why this order

**Phase 1 carries the full schema, including things nothing reads until Phase 7.** Multi-item
groups, `(scoreRaw, scoreFormat)` pairs, and the OAuth token columns all ship in the first
migration. Adding any of them later means migrating tables that already hold real
recommendations — and in the score case, data that *cannot be reconstructed*, because a bare
`8` has already lost whether it meant 8/10 or 8/100.

**Phase 2 moved from last to third.** In the original plan auth was optional polish, deferred
behind everything. Requiring accounts (**D23**) inverts that: creation cannot be built or
tested without a session, so every later phase depends on it.

That move pulled two things forward with it. The **Hono app** is created in Phase 2 rather
than Phase 4, because Better-Auth mounts inside it (**D6**) and so the app has to exist
first. And **`/settings`** ships there in minimal form, because `linkSocial()` needs a
caller and a Google user with no way to link a tracker is a dead end (**D33**).

**Phase 3 still sits before any UI.** The media providers are the only part of the system
whose behaviour we do not control, and verification found both wanting — AniList allows 30
requests per minute per IP, and Jikan returned HTTP 504 on roughly half of all live calls.
The riskiest integration goes early, where a surprise is cheap.

**Phase 5 before Phase 6.** Phase 5 makes the product *usable*; Phase 6 makes it
*shareable*. That reads backwards for a product whose distribution is the share card — but a
card cannot be evaluated without real recommendations behind it, and Phase 5 produces them.

**Phase 7 after the loop closes.** List import is the reason people were asked to sign in,
but it is not the reason the product works. The share loop is the riskiest untested
assumption in the whole build, so it gets validated first with plain search.

## What every phase file contains

Scope (including what is explicitly *out*) · deliverables · key design decisions · **exit
criteria** · risks.

Exit criteria are mechanically checkable — a command to run or an observation to make, with
an unambiguous pass. "Search works" is not a criterion. "Searching `frieren` returns
`Sousou no Frieren` as the first result within 500 ms" is. If finishing a phase is a
judgement call, it will be judged done early.

**Criteria that can be tests are written as `bun test` cases in the phase that introduces
them** (**D16**). Three tiers, only one of which gates CI — see
[`../code-standards.md`](../code-standards.md) (**D22**).

## Amendments to the client brief

`context/ai-prompt.xml` is a historical record. Verification found several of its
instructions unimplementable, and the product has since been deliberately re-scoped. Full
reasoning is the decision log in [`../progress-tracker.md`](../progress-tracker.md).

**Unimplementable as written:**
- DaisyUI 5 requires Tailwind 4, where `tailwind.config.ts` no longer exists (**D1**)
- Next 16 removed `next lint` and made `params` a Promise (**D2**)
- `@vercel/og` is redundant — `next/og` ships with the framework (**D5**)
- Auto-fallback between providers resolves a *different title* — the id spaces are disjoint
  (**D15**)
- Edge runtime for the OG image — `postgres.js` cannot run there (**D21**)

**Deliberately re-scoped by the user:**
- Anonymous creation removed; accounts required (**D23**)
- GitHub replaced by AniList, MyAnimeList, and Google (**D24**)
- One title per recommendation replaced by 1..N grouped items (**D26**)
- Scores optional, and preserved in the rater's own scale rather than normalised
  (**D27**, **D28**)
- List import added as a first-class feature (**Phase 7**)

The brief is silent on Supabase's public REST exposure, which remains the single biggest
risk in the build. See **D20**.

## Rhythm

One phase at a time. A phase is done when every exit criterion passes, not when the code
looks finished. At that point: update the tracker, then start the next phase file.

Work outside the current phase is raised, not absorbed.
