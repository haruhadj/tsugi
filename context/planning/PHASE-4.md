# Phase 4 — API surface

**Status:** not started
**User-visible output:** none — but the product is functional via `curl` at the end of it
**Prerequisites:** an **Upstash Redis database — does not exist yet** (as of 2026-08-09).
Create it before starting. Phase 0's in-memory limiter keeps local development working, but
criteria 16, 17, and 21–23 cannot be satisfied without the real thing.

## Scope

**In**
- `src/app/api/[[...route]]/route.ts` — the Hono catch-all
- `src/server/hono/middleware.ts` — Upstash rate limiting
- `src/lib/validators/rec.ts` — Zod schemas shared with the Phase 5 form
- `POST /api/recs` — validate, rate limit, resolve, generate slug, insert
- `GET /api/recs/:slug` — read
- Redis caching of `resolveMedia`, deferred here from Phase 3

**Explicitly out**
- `/api/auth/*` — Phase 2, though the mount point is documented now
- View counting. It belongs to the page render, not the API. Phase 6.
- Delete — Phase 8, once ownership is provable. Editing stays out permanently per `../functionality.md`.
- Pagination or listing endpoints. Nothing lists recommendations until Phase 8.

## Deliverables

```
POST /api/recs                          ← session required
  body   { caption?:  string ≤120,
           comment?:  string ≤280,
           items: [ { provider: "anilist"|"mal",
                      externalId: number,
                      mediaType: "anime"|"manga",
                      scoreRaw?:    number,
                      scoreFormat?: "POINT_100"|"POINT_10_DECIMAL"
                                   |"POINT_10"|"POINT_5"|"POINT_3",
                      comment?:  string ≤280 } , … ]   1..N }
  201    { slug: string }
  400    Zod error, field-addressable (incl. "must say something")
  401    no session
  429    { retryAfter: number }
  502    a provider could not resolve one of the ids

GET /api/recs/:slug                     ← public, no session
  200    the recommendation and its items, in position order
  404    unknown slug
```

## Key design decisions

**The client sends ids, never content.** `title` and `coverImage` are re-resolved server-side
from `externalId`. Accepting them from the request would let anyone POST arbitrary text and
imagery and have Tsugi render it on a branded social card — a defacement vector, and the card
is the product's entire public surface.

**Scores are the one exception**, because they are the *user's own rating* rather than
provider data. `scoreRaw` and `scoreFormat` are validated — the pair must be complete, and
the value must fall inside its format's range — but never re-fetched.

**The whole group is one transaction.** All items resolve, then rec and items insert
together, or nothing is written. A partially-written group misrepresents what the user said,
and a five-item recommendation that silently became three is worse than an error.

**Creating requires a session; reading does not.** `POST` returns 401 without one, and
`userId` comes from the session — never from the body (**D23**). `GET /api/recs/:slug` stays
public, which is what keeps shared links working for people who have never signed in.

**"Must say something" is enforced here, not in the database.** At least one score or one
comment across the group and its items (invariant 8). The rule spans two tables, so Zod owns
it — the deliberate exception recorded in `PHASE-1.md`.

**Rate limiting is 5 per minute per IP on `POST /api/recs` only.** Reads are not limited;
a shared link going viral is the success case, and throttling it would be self-defeating.

**Missing Upstash configuration is fatal in production.** Phase 0's in-memory fallback exists
for local development. Serverless instances do not share memory, so an in-memory limiter in
production is not a weaker limiter — it is no limiter, silently. The module throws at startup
if `NODE_ENV=production` and the Upstash variables are absent. (**D9**)

**Slug generation retries on collision.** nanoid at 12 characters over a 64-symbol alphabet
makes collision vanishingly unlikely, but "unlikely" is not "handled". On a unique violation
— the error code recorded in `PHASE-1.md` — regenerate and retry, up to 3 times, then 500.
Never return a slug that was not actually inserted.

**Cache key is `provider:mediaType:externalId`, not the search query.** Resolution is by id,
so the key space is small and the hit rate is high — the same popular titles get recommended
repeatedly. TTL 24 h; cover art URLs change rarely, and a stale cover is a far cheaper
failure than a slow create.

**`provider` must lead the cache key.** Omitting it would let AniList id 154587 and MAL id
154587 collide on one entry and serve the wrong anime from cache — the same class of bug as
cross-provider fallback, arriving by a different route. (**D15**)

**Zod schemas are shared with the form.** One definition in `src/lib/validators/rec.ts`,
imported by both the Hono route and the Phase 5 client. Two schemas for one payload diverge,
and the divergence appears as a 400 the user cannot act on.

## Exit criteria

Run against a local dev server.

1. **`POST /api/recs` with no session returns 401** and writes nothing. This is the
   criterion that proves **D23** at the boundary rather than only in the schema.
2. With a session, a **one-item** POST — `items: [{ provider: "anilist", externalId: 154587,
   mediaType: "anime", scoreRaw: 9, scoreFormat: "POINT_10" }]` — returns **201** with a
   `slug` matching `/^[A-Za-z0-9_-]{12}$/`.
3. `GET /api/recs/<that slug>` returns **200**, **without a session**, with
   `title === "Frieren: Beyond Journey's End"` — proving the server resolved it rather than
   trusting the client, and that reads are public.
4. A **three-item** POST returns 201, and the read returns all three in `position` order.
5. A POST mixing `provider: "anilist"` and `provider: "mal"` items in one group succeeds,
   each item keeping its own provider.
6. The same POST with `{ provider: "mal", externalId: 52991 }` stores Frieren too — the same
   show through a different id space.
7. A POST with `{ provider: "mal", externalId: 154587 }` does **not** store Frieren. It
   either 502s or stores whatever MAL 154587 actually is.
8. An item omitting `provider` returns **400**. It is required, never defaulted — a default
   would be a guess at an id space.
9. A body containing `title: "totally made up"` is **ignored**: the stored title is the
   resolved one. `scoreRaw`/`scoreFormat`, by contrast, are honoured — they are the user's.
10. `scoreRaw` without `scoreFormat` returns **400**, and vice versa.
11. `scoreRaw: 87` with `scoreFormat: "POINT_10"` returns **400** — out of range for its
    format. Range validation is per-format, not a single 1–10 rule.
12. `scoreRaw: 87, scoreFormat: "POINT_100"` stores **87**, not 9. No normalisation
    (**D28**).
13. A POST with **no score and no comment anywhere** returns **400** (invariant 8).
    A POST with only a group comment succeeds.
14. `items: []` returns **400**. A recommendation needs at least one item.
15. A 281-character comment returns **400**, at group and item level alike.
16. The **6th** POST within one minute from the same IP returns **429**. The first five
    return 201. Verify with a loop, not by hand.
17. After the window elapses, a further POST returns 201 again.
18. `GET /api/recs/aaaaaaaaaaaa` returns **404** with a JSON body, not an HTML error page.
19. With a provider forced to fail on **the third of three items**, POST returns **502** and
    **neither the rec nor any item is written** — confirm both table counts are unchanged.
    This is the transaction criterion.
20. Two identical POSTs produce two recommendations with **different** slugs.
21. A second POST for the same `provider` + `externalId` does not call the provider —
    verified by a cache-hit log line.
22. A POST for the same `externalId` under the *other* `provider` **does** call that
    provider. A cache hit here would mean the key is missing its provider prefix.
23. Unsetting the Upstash variables with `NODE_ENV=production` makes the server fail to
    start, with a message naming the missing variable.
24. `grep -rn "c.req.json()" src/server` returns nothing — all input goes through
    `zValidator`. Invariant 4.
25. `userId` is never read from the request body:
    `grep -rn "userId" src/server/hono` shows it sourced from the session only.
26. `bun x tsc --noEmit`, `bun x eslint .`, and `bun test` all exit 0.

## Risks

| Risk | Mitigation |
|---|---|
| Rate limiting keyed off a spoofable header | Derive the IP from the platform-provided forwarded header and document which one in the middleware. Note that behind a proxy the leftmost value is attacker-controlled. |
| The in-memory dev limiter silently reaching production | Criterion 23 makes its absence a startup failure |
| A 502 leaving a partially-written group behind | Criterion 19 forces the failure on the third of three items and asserts both table counts |
| Hono's catch-all swallowing routes added later | The route table in `../architecture.md` is the reference; Phase 2 adds auth inside this app, not beside it |
| A missing session check on one write path | Criterion 1 tests it at the boundary; `userId NOT NULL` in Phase 1 is the backstop, and criterion 25 keeps it session-sourced |
| Score range validated as a single 1–10 rule, rejecting valid `POINT_100` values | Criterion 11. Range is per-format |
| Caching provider failures | Only cache `ok: true` results. Never cache a failure — a transient Jikan 504 would otherwise persist for 24 hours. |

**Next:** [`PHASE-5.md`](./PHASE-5.md)
