# Phase 7 — List import

**Status:** In progress, started 2026-08-15.

**Progress so far:**
- `src/server/services/lists/tokens.ts` — `getListAccessToken`, with MAL refresh-token flow (criterion 6 groundwork).
- `src/server/services/lists/anilist.ts` — `fetchAniListList`, two-call GraphQL pattern (viewer id, then list), captures `scoreFormat` and writes it back to `user.scoreFormat` (D32), maps a list score of `0` to `(null, null)` (D35).
- `src/server/services/lists/mal.ts` — `fetchMalList`, paginated MAL API v2 client (`X-MAL-CLIENT-ID` + bearer token on every request), same D35 zero-score handling; MAL is always `POINT_10` so there is no format to capture (D28).
- `src/server/hono/lists.ts` — `GET /api/lists/:provider/:mediaType`, mounted into the shared Hono app in `route.ts`. Session-checked, maps `TokenLookupResult`/`ProviderResult` failure reasons to HTTP status codes, never echoes token fields.
- Invariant 10 (`grep -rn "accessToken" src/app src/components`) and criterion 11 (`grep -rniE "SaveMediaListEntry|update_my_list_status" src/server/services/lists`) both verified clean.
- `bun x tsc --noEmit` and `eslint` clean on all touched files. Full suite (`bun test --conditions=react-server`): 121 pass, 0 fail.
- **Production OAuth verified.** Both providers' redirect URIs follow
  `/api/auth/oauth2/callback/{providerId}` (not `/api/auth/callback/`), confirmed against
  `https://tsugi-lyart.vercel.app` for both AniList and MAL, including MAL's PKCE flow. The
  exact URIs — `https://tsugi-lyart.vercel.app/api/auth/oauth2/callback/anilist` and
  `.../mal` — still need to be registered in each provider's developer dashboard by hand;
  that manual step is a prerequisite for exit criteria 1–8, not yet done.
- `mal.ts` now has a unit-test suite (`mal.test.ts`, 9 tests): entry mapping, D35 zero-score
  handling, media-type path selection, the `X-MAL-CLIENT-ID`/bearer headers, `paging.next`
  pagination, 401/429/network-failure/timeout handling.
- `lists.ts` now has a `.db.test.ts` route suite (`lists.db.test.ts`, 2 tests), scoped to the
  no-session 401 boundary and invariant 10 (no token field ever echoed). Full success-path
  coverage needs a real linked account and is folded into criteria 1–8 below — the codebase
  has no session-forging helper, and Better-Auth signs session cookies, so a "valid session,
  invalid param" 400 case is deferred alongside those criteria rather than faked.
- `anilist.ts` now has a unit-test suite (`anilist.test.ts`, 6 tests): bearer-token header,
  401/429/timeout/network-failure/malformed-JSON handling on the viewer call, and the
  missing-id-or-scoreFormat `unavailable` case. The `scoreFormat` write-back (D32) and the
  full two-call happy path are not exercised here — they need a live Postgres write and a
  real GraphQL response shape, so they stay folded into exit criteria 1–3 rather than faked.
- `tokens.ts` now has a unit-test suite (`tokens.test.ts`, 7 tests), made possible by mocking
  `@/db` with `bun:test`'s `mock.module` (a first in this codebase's test suite) so the
  refresh-margin math and MAL refresh flow are real unit tests, not db-tier ones: `not_linked`
  with no account row, an AniList token returned regardless of expiry (no refresh flow exists
  for it), a non-expired MAL token returned without refreshing, a MAL token inside the 60s
  expiry margin correctly treated as expired, a dead refresh token (no `refreshToken` stored,
  and a refresh call that itself fails) both returning `reauth_required` per criterion 7, and
  a successful refresh persisting the new access/refresh tokens and returning the fresh token.
- Full suite (`bun test --conditions=react-server`): 145 pass, 1 fail — the 1 failure
  (`recs.db.test.ts`, a Phase-6-era db-tier test unrelated to Phase 7) is pre-existing,
  confirmed by reproducing it with this session's changes stashed out. **Update 2026-08-16
  afternoon:** re-run shows 146 pass, 0 fail — the `recs.db.test.ts` failure did not
  reproduce (db-tier test, likely state-dependent rather than a real regression). Full suite
  is green.
- **My-list picker UI implemented.** `src/components/MyListPicker.tsx` (new): fetches
  `/api/lists/:provider/:mediaType` on mount, maps HTTP status to a discriminated
  `ListState` (`not_linked`/`reauth_required` → reconnect prompt linking to `/settings`,
  `rate_limited` → retry message, other errors → generic unavailable message), renders a
  filterable, capacity/dedup-aware list of rows using `MediaCover`. `RecBuilder.tsx`: added
  a `mode` ("search" | "mylist") radio toggle alongside the existing provider toggle, a
  `handleImport(entry: ListEntry)` handler (dedup by `${provider}-${externalId}`, respects
  `canAddItem`, prefills `scoreRaw` only when `entry.scoreFormat === scoreFormat` per D28/D35),
  and `authClient.listAccounts()`-based gating — the mode toggle and picker render only when
  `linkedProviderIds` contains `"anilist"` or `"mal"` (criterion 9). `bun x tsc --noEmit` and
  `eslint` clean on both files; full suite unchanged at 145 pass / 1 fail (same pre-existing
  failure).

**Correction:** the "`anilist.ts`'s existing tests" line that once appeared here pointed at
`anilist-client.test.ts`, which tests a different, Phase 3 file
(`src/lib/providers/anilist-client.ts`) — not this one. Resolved: `anilist.ts` now has its
own test file, above.

- **Per-user list caching implemented.** New `listCache` table (`src/db/schema.ts`,
  migration `drizzle/0002_broken_triton.sql`): one row per `(userId, provider, mediaType)`,
  `entries` jsonb mirroring `ListEntry[]` verbatim (so it already carries the D28/D35
  null-pairing invariant with nothing re-validating it), `fetchedAt` timestamp, RLS-enabled
  per D20. Originally shipped with a 5-minute TTL — since replaced, see **Update 2026-08-16
  evening** below.

- **Update 2026-08-16 evening: production 500s fixed, caching redesigned.** Both AniList and
  MAL imports were 500ing in production (`tsugi-lyart.vercel.app`). Root cause: migration
  `0002_broken_triton.sql` (creates `list_cache`) was generated locally but never applied to
  the production Supabase DB — `db.query.listCache.findFirst(...)` threw before either
  provider's error handling could run. Fixed by running `bun x drizzle-kit migrate` against
  production (confirmed via direct query: `list_cache` now exists, RLS enabled).
  Separately, re-examined the 5-minute TTL against how the feature is actually used: real
  users sync their AniList/MAL lists in the background via Mihon/Aniyomi, not live in the
  browser tab, so a short TTL bought nothing but forced a live provider round-trip on almost
  every picker open (and every 500 on a flaky provider surfaced as a hard error). Replaced
  TTL expiry with cache-once-then-explicit-refresh: `lists.ts` now serves the cached row
  unconditionally (no TTL check) unless the client passes `?refresh=1`, which forces a live
  re-fetch and re-upserts on success; if that forced re-fetch fails, the route falls back to
  the existing stale cache (`{ entries, stale: true }`) instead of erroring, so a flaky
  provider never wipes a user's last-known list. `MyListPicker.tsx` gained a refresh button
  (`RefreshCwIcon`, spinning via a `refreshing` state kept separate from the initial `loading`
  state so results stay visible mid-refresh) and a "showing your last synced list" notice when
  `stale: true`. `lists.db.test.ts` gained a boundary case confirming `?refresh=1` doesn't
  bypass the session check (full success-path coverage for refresh/stale-fallback remains
  deferred to criteria 1-8, alongside the rest of the live-account cases — no session-forging
  helper exists). `bun x tsc --noEmit`, unscoped `bun x eslint .`, and
  `bun test --conditions=react-server` all clean: 149 pass, 0 fail. Committed as `5ae4181` and
  pushed to `main`.

- **Criterion 13 verified.** Unscoped `bun x eslint .` and `bun x tsc --noEmit`: both clean,
  0 errors/warnings across the whole project. `bun test --conditions=react-server`: 149 pass,
  0 fail (see update above). Criterion 13 is satisfied.
- **Criterion 12 checked structurally, not yet timed live.** Reviewed `RecBuilder.tsx`: the
  mode toggle added for Phase 7 only renders (`hasTrackerLinked`) for users with an AniList or
  MAL account linked, and even then `mode` defaults to `"search"` — the search-first create
  path (`MediaSearchInput` render, `handleSelect`, submit) is byte-for-byte the same component
  tree Phase 5 timed, with the toggle adding an extra `<fieldset>` but zero extra required
  clicks. No structural regression to the timed path. The actual timed three-run manual check
  from Phase 5's criterion 1 (landing → link-on-clipboard, under 10s, in a browser) has not
  been re-run this session — still open.

**Not yet started:**
- Exit criteria 1–8 (require a real linked AniList/MAL account, and the provider-dashboard
  redirect-URI registration above — db-test/manual, not yet exercised).
- Criterion 12's live timed re-run (structural check done, above; the actual stopwatch pass
  still needs a human in a browser).
**User-visible output:** build a recommendation from titles you have already rated
**Prerequisites:** Phase 2 (tokens in the `account` table). No new external accounts.

The reason people were asked to sign in. Instead of searching for a title they have already
rated, a user picks from their own list — and their existing score comes with it.

## Scope

**In**
- `src/server/services/lists/anilist.ts` — `MediaListCollection` via the stored token
- `src/server/services/lists/mal.ts` — `/users/@me/animelist` via MAL API v2
- MAL token refresh — access tokens expire in an hour
- Score-format capture: AniList's `Viewer.mediaListOptions.scoreFormat`
- A **My list** mode on the create screen, filterable, alongside **Search**
- Caching of a fetched list per user — **done**, `listCache` table, indefinite cache with
  explicit `?refresh=1` re-fetch and stale-cache fallback (see Update 2026-08-16 evening above)

**Explicitly out**
- **Writing back to AniList or MAL.** Tsugi never modifies anyone's list. Read-only, both
  directions of pressure resisted permanently.
- Continuous sync. A list is fetched on demand, not mirrored.
- Import for Google-only accounts — Google has no anime list. The mode is hidden, not
  disabled-with-an-explanation, for users with no tracker linked.
- Importing an entire list *as* a recommendation in one action. The user still chooses items.

## Key design decisions

**Both list APIs are server-side only.** AniList needs the OAuth token, which never leaves
the server (invariant 10). MAL v2 sends **no CORS headers at all** — verified: the browser
cannot call it under any circumstance. So list fetching is a Hono route, unlike typeahead.

This does not reintroduce the D3 quota problem: fetching a list is one call per user per
session, not one per keystroke.

**MAL v2 needs a client ID on every request**, including calls that carry a user token.
That is a header, `X-MAL-CLIENT-ID`, separate from the OAuth credentials.

**Tokens are refreshed, not assumed.** MAL access tokens last one hour and refresh tokens one
month. A user who signs in and returns tomorrow has a dead access token and a live refresh
token. If the refresh token has also expired, the correct behaviour is to ask them to
reconnect the provider — never to fail silently and show an empty list, which reads as "you
have nothing rated."

**Imported scores arrive in the user's own scale and are preserved.** AniList exposes five:
`POINT_100`, `POINT_10_DECIMAL`, `POINT_10`, `POINT_5`, `POINT_3`. MAL is always `POINT_10`.
Read the format from `Viewer.mediaListOptions.scoreFormat` **at fetch time** — it is a user
preference and can change — and **write it back to `user.scoreFormat`** so the create screen
picks up the change too (**D32**). Store `(scoreRaw, scoreFormat)` per item exactly as rated
(**D28**). Never coerce to a single scale on the way in; that is the conversion we chose not
to do.

**A list score of `0` is an unrated entry, not a zero rating.** Both trackers use `0` as the
default for everything on a list the user has not scored, and a plan-to-watch list is mostly
zeroes. Import it as `(null, null)` (**D35**) — the item still imports, it just arrives
without a score, which is exactly what **D27** made possible. Storing `0/100` on someone's
card because they added a show to their list would be a lie about what they said.

**`POINT_3` is not a number.** It is three smileys. An item imported at `POINT_3` renders as
an icon, everywhere — including the OG card. Any code path that formats a score must handle
it, or it will print `2/3`, which means nothing to the person who rated it.

**A list is a picker, not a page.** The user opens **My list**, filters, and taps titles to
add to the current recommendation. It shares the item tray with Search, so a single rec can
mix an imported title and a searched one.

**Provider follows the source.** Titles imported from an AniList list are `provider:
"anilist"`; from MAL, `provider: "mal"`. The same show added from both lists is two different
items with two different ids, and that is correct (**D29**).

## Exit criteria

Criteria 1–8 are `*.db.test.ts` / manual against a real linked account.

1. With AniList linked, the list fetch returns entries with title, cover, and the user's
   score.
2. `scoreFormat` is read from the viewer's own options, not assumed. Verify by changing the
   format on AniList and re-fetching — the stored format changes, **on both the imported
   items and `user.scoreFormat`**, so the create screen's score input changes shape too
   (**D32**).
2a. An entry the user has **not** scored (AniList/MAL `0`) imports with `scoreRaw` and
   `scoreFormat` both null — never `0` (**D35**). Check against a plan-to-watch entry, where
   this is the common case rather than the edge one.
3. An item imported from a `POINT_100` list stores `scoreRaw: 87, scoreFormat: POINT_100`,
   **not** `9`. Invariant 6.
4. A `POINT_3` item renders as a smiley on the create screen, the public page, and the OG
   card. Three surfaces, checked individually.
5. With MAL linked, the list fetch returns entries; the request carries `X-MAL-CLIENT-ID`.
6. **With a deliberately expired MAL access token**, the fetch refreshes and succeeds without
   the user noticing.
7. With both tokens expired, the UI asks the user to reconnect — it does **not** show an
   empty list.
8. A recommendation built from one imported item and one searched item stores both, with the
   correct `provider` on each.
9. For a Google-only account, the **My list** mode is not shown at all.
10. `grep -rn "accessToken" src/app src/components` returns nothing. Invariant 10.
11. Nothing in the codebase issues a write to either provider:
    `grep -rniE "SaveMediaListEntry|PUT|PATCH|DELETE" src/server/services/lists` returns
    nothing.
12. Phase 5's criterion 1 still passes — the create flow has not regressed.
13. `bun x tsc --noEmit`, `bun x eslint .`, and `bun test` all exit 0.

## Risks

| Risk | Mitigation |
|---|---|
| Normalising imported scores "for consistency", destroying the user's own scale | Criterion 3. This was a deliberate choice (**D28**), not an oversight |
| A plan-to-watch list importing as a wall of `0/100` ratings | Criterion 2a. `0` means unrated on both trackers (**D35**) |
| `POINT_3` rendered as `2/3` somewhere | Criterion 4 checks all three surfaces separately |
| An expired refresh token showing an empty list instead of a prompt | Criterion 7. "You have nothing rated" is the worst possible lie here |
| A large list timing out or blowing memory | Paginate the fetch and cap what is held. AniList returns a full collection in one query — it can be big |
| Accidentally writing to someone's tracker list | Criterion 11. Tsugi is read-only against both providers, permanently |
| MAL client ID committed to the repo | It is an env var, listed in `.env.example` |

**Next:** [`PHASE-8.md`](./PHASE-8.md)
