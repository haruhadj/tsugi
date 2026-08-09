# Phase 7 — List import

**Status:** not started
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
- Caching of a fetched list per user

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
