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
- `src/app/api/[[...route]]/route.ts` — **the Hono catch-all itself**, created here because
  this is the first phase with anything to mount. Phase 4 adds routes to it, not a second app
- `src/lib/auth.ts` — extended from Phase 1's minimal config
- AniList and MyAnimeList via Better-Auth's `genericOAuth` plugin
- Google via the built-in `socialProviders`
- The auth handler mounted inside that Hono app
- `src/app/(auth)/sign-in` — one screen, three buttons
- `src/app/(settings)/settings` — **a minimal connections screen**: which providers are
  linked, and a button to link another
- Capturing `user.scoreFormat` at sign-in (**D32**)
- Session helpers for server components and Hono routes
- Explicit account linking via `linkSocial` from that settings screen

**Explicitly out**
- Fetching anyone's list. Tokens are stored here; **using** them is Phase 7.
- The dashboard, and everything else on the settings screen — unlinking, the last-provider
  guard, the recommendation list. Phase 8.
- Any Hono route other than `/api/auth/*`. The app exists; `/api/recs` is Phase 4.
- Email/password, magic links, and any provider beyond the three above.
- Automatic account linking. It cannot work here; see below.

## Key design decisions

**Three providers, two tiers, and the tiers are the point.** AniList and MyAnimeList are
the tracker accounts, and the only ones that unlock list import in Phase 7. Google is the
fallback of last resort — sign-in and nothing more — so that lacking a tracker is not a
hard wall.

The sign-in screen is arranged to push people toward a tracker: AniList and MyAnimeList
first and visually primary, Google separated below. A Google user can link a tracker later
from `/settings` and gain import then. (**D24**)

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
first, then link a second provider from `/settings` via `linkSocial()`. Do not enable
`trustedProviders` for the trackers — it would link strangers who happen to collide. (**D25**)

**The Hono app is born here, not in Phase 4.** Better-Auth mounts *inside* it (**D6**), so
the catch-all has to exist before the auth handler does. Phase 4 was written as though it
created the app; it does not — it adds `/api/recs` to the one this phase stood up. Two Next
routes under `/api` would reintroduce exactly the precedence question D6 exists to avoid.

**A settings screen ships here in minimal form.** Criterion 6 requires `linkSocial()` to
work, and `linkSocial()` needs somewhere to be called from. Deferring the whole screen to
Phase 8 would leave a Google user with no route to a tracker, which is the exact promise
D24 makes to justify offering Google at all. So: linked providers, a link button, nothing
else. Unlinking and the last-provider guard are Phase 8's, because they need decisions this
phase does not have. (**D33**)

**The user's score format is read at sign-in.** AniList's
`Viewer.mediaListOptions.scoreFormat` comes back from the same token exchange that creates
the account, so writing it to `user.scoreFormat` costs one extra field on a query already
being made. MAL is always `POINT_10`; Google keeps the `POINT_10` default. Without this,
Phase 5 has no way to know whether to render smileys or a 1–10 strip, and Phase 7 would be
the first phase that could tell — one phase too late. (**D32**)

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
6. From an authenticated session, `linkSocial()` on `/settings` attaches a second provider
   to the **same** user — `account` gains a row, `user` does not. A Google-only user who
   links AniList this way gains list import in Phase 7.
7. `GET /api/auth/*` is served through the Hono app, not a competing Next route.
   `find src/app/api -name 'route.ts'` returns **exactly one** file — the catch-all.
8. A server component can read the session; an unauthenticated read returns null rather than
   throwing.
9. **No token is ever sent to the client.** `grep -rn "accessToken\|refreshToken" src/app
   src/components` returns nothing. Invariant 10.
10. Signing out clears the session cookie and `session` row.
11. **An AniList user who rates in `POINT_5` has `user.scoreFormat = "POINT_5"` after
    sign-in** — read the row, do not infer it. A MAL sign-in stores `POINT_10`; a Google
    sign-in keeps the default. This is what makes Phase 5's criterion 8 reachable (**D32**).
12. Changing the score format on AniList and signing in again updates the stored value. It
    is a preference, not a fact about the account.
13. `/settings` while signed out redirects to sign-in and does not 500.
14. `bun x tsc --noEmit`, `bun x eslint .`, and `bun test` all exit 0.

The old criterion 11 — "`/r/[slug]` renders while signed out" — has moved to
[`PHASE-6.md`](./PHASE-6.md), which is the phase that builds that route. It was
unsatisfiable here.

## Risks

| Risk | Mitigation |
|---|---|
| **MAL's `plain` PKCE fighting Better-Auth's S256** | Budget for a custom `getToken`. The plugin supports it; criterion 1 proves it end to end |
| Someone "fixing" the two-account behaviour by enabling automatic linking | Criterion 5 makes it expected behaviour. Auto-linking on synthesised emails would merge unrelated strangers |
| A synthesised email colliding with a real one | `.invalid` is unroutable by RFC and cannot be registered |
| MAL client registration being slower than expected | It is a prerequisite, listed at the top. Start it before the phase, not during |
| Auth creeping onto the view path | Nothing public exists to protect yet; PHASE-6 criterion 25 checks it once `/r/[slug]` is real |
| Tokens leaking into a client bundle or a log line | Criterion 9, plus invariant 10 |
| A second Next route added under `/api`, splitting the middleware chain | Criterion 7 counts `route.ts` files. There is one app, and Phase 4 adds to it |
| `scoreFormat` skipped as "Phase 7's problem", leaving Phase 5 unable to render smileys | Criteria 11 and 12. The column exists from Phase 1 specifically so this phase can fill it |
| The settings screen growing into the dashboard early | Scope names exactly three things: list linked providers, link one, nothing else |

**Next:** [`PHASE-3.md`](./PHASE-3.md)
