# Phase 2 — Authentication

**Status:** not started
**User-visible output:** sign-in works; nothing else is reachable yet
**Prerequisites:** three OAuth applications — **none exist yet** (2026-08-09):
AniList (`anilist.co/settings/developer`), MyAnimeList (`myanimelist.net/apiconfig`), and
Google. The owner will supply the credentials.

Auth moved from last place to third. It is no longer optional polish — **creating a
recommendation requires a session** (**D23**), so nothing downstream can be built or tested
without it.

## Scope

**In**
- `src/lib/auth.ts` — extended from Phase 1's minimal config
- AniList and MyAnimeList via Better-Auth's `genericOAuth` plugin
- Google via the built-in `socialProviders`
- The auth handler mounted inside the Hono app
- `src/app/(auth)/sign-in` — one screen, three buttons
- Session helpers for server components and Hono routes
- Explicit account linking from **account settings** (`linkSocial`)

**Explicitly out**
- Fetching anyone's list. Tokens are stored here; **using** them is Phase 7.
- The dashboard — Phase 8.
- Email/password, magic links, and any provider beyond the three above.
- Automatic account linking. It cannot work here; see below.

## Key design decisions

**Three providers, two tiers, and the tiers are the point.** AniList and MyAnimeList are
the tracker accounts, and the only ones that unlock list import in Phase 7. Google is the
fallback of last resort — sign-in and nothing more — so that lacking a tracker is not a
hard wall.

The sign-in screen is arranged to push people toward a tracker: AniList and MyAnimeList
first and visually primary, Google separated below. A Google user can link a tracker later
from account settings and gain import then. (**D24**)

**AniList and MAL need `genericOAuth`.** Neither is a built-in Better-Auth provider. The
plugin takes `authorizationUrl`, `tokenUrl`, and a custom `getUserInfo` — verified against
the plugin's documented config interface.

**MAL requires a custom token exchange.** MAL supports **only** `code_challenge_method=plain`
for PKCE, where the challenge equals the verifier. Better-Auth's `pkce: true` emits S256.
Expect to supply a custom `getToken`, which the plugin explicitly supports. This is the most
likely thing in this phase to consume a day. (**D30**)

**Neither tracker returns an email, so emails are synthesised.** AniList's `User` type has no
email field at all — verified by introspection — and MAL's `/users/@me` does not return one
either. Better-Auth wants a unique email, so mint a deterministic placeholder:

```
anilist:12345@users.tsugi.invalid
mal:67890@users.tsugi.invalid
```

`.invalid` is reserved by RFC 2606 and can never be routed, so a placeholder can never
accidentally receive mail. (**D25**)

**Automatic account linking is therefore off.** Better-Auth links accounts by matching a
*verified* email. Synthesised addresses never match, so a user signing in with AniList and
later with Google would silently get **two accounts**. Linking must be explicit: sign in
first, then link a second provider from account settings via `linkSocial()`. Do not enable
`trustedProviders` for the trackers — it would link strangers who happen to collide. (**D25**)

**Tokens are stored, never exposed.** Better-Auth writes provider access and refresh tokens
into the `account` table. MAL access tokens live **one hour** and refresh tokens **one
month**, so Phase 7 must refresh rather than assume. Those columns are exactly why RLS on the
`account` table (**D20**) is not paperwork. Invariant 10.

**Sign-in is a screen, not an interstitial.** It is reached deliberately from the create
screen's call to action. No modal that appears mid-flow, and no redirect loop where an
expired session dumps someone on a login page having lost a draft.

## Exit criteria

1. Signing in with **each of the three providers** creates rows in `user`, `session`, and
   `account`. Three separate runs; no provider is assumed to work because another did.
2. The AniList and MAL `account` rows contain a non-empty `accessToken`.
3. The MAL row also contains a `refreshToken` — without it Phase 7 breaks after an hour.
4. `user.email` for tracker sign-ins matches `^(anilist|mal):\d+@users\.tsugi\.invalid$`.
5. Signing in with AniList and then Google (same person, separate flows) produces **two
   distinct users**. This is expected, and the criterion exists so nobody later reports it
   as a bug: automatic linking cannot work without verified emails.
6. From an authenticated session, `linkSocial()` in account settings attaches a second
   provider to the **same** user — `account` gains a row, `user` does not. A Google-only
   user who links AniList this way gains list import in Phase 7.
7. `GET /api/auth/*` is served through the Hono app, not a competing Next route.
8. A server component can read the session; an unauthenticated read returns null rather than
   throwing.
9. **No token is ever sent to the client.** `grep -rn "accessToken\|refreshToken" src/app
   src/components` returns nothing. Invariant 10.
10. Signing out clears the session cookie and `session` row.
11. `/r/[slug]` — even a hand-inserted row — renders **while signed out**. Invariant 9. If
    this fails, the product has no distribution.
12. `bun x tsc --noEmit`, `bun x eslint .`, and `bun test` all exit 0.

## Risks

| Risk | Mitigation |
|---|---|
| **MAL's `plain` PKCE fighting Better-Auth's S256** | Budget for a custom `getToken`. The plugin supports it; criterion 1 proves it end to end |
| Someone "fixing" the two-account behaviour by enabling automatic linking | Criterion 5 makes it expected behaviour. Auto-linking on synthesised emails would merge unrelated strangers |
| A synthesised email colliding with a real one | `.invalid` is unroutable by RFC and cannot be registered |
| MAL client registration being slower than expected | It is a prerequisite, listed at the top. Start it before the phase, not during |
| Auth creeping onto the view path | Criterion 11. Viewing must never require a session |
| Tokens leaking into a client bundle or a log line | Criterion 9, plus invariant 10 |

**Next:** [`PHASE-3.md`](./PHASE-3.md)
