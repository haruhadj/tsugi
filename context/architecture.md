# Architecture

Versions live in [`tech-stack.md`](./tech-stack.md). This file is about **shape**: where code
goes, what may import what, and how a request travels.

## Directory layout

```
tsugi/
├── .github/workflows/ci.yml
├── src/
│   ├── app/
│   │   ├── (auth)/sign-in/             Phase 2 — AniList · MAL · Google
│   │   ├── (settings)/settings/        Phase 2 — connections; expanded Phase 8
│   │   ├── (dashboard)/                Phase 8 — "my recs"
│   │   ├── api/[[...route]]/route.ts   Hono catch-all — created Phase 2, the ONLY route.ts
│   │   ├── r/[slug]/
│   │   │   ├── page.tsx                public recommendation page
│   │   │   └── opengraph-image.tsx     1200×630 PNG, next/og
│   │   ├── globals.css                 Tailwind import, palette, signature utilities
│   │   ├── layout.tsx                  fonts + <html className="dark">
│   │   └── page.tsx                    the create flow (session required)
│   ├── components/                     presentational + client interaction
│   │   └── ui/                         shadcn primitives — generated source, edited in place
│   ├── db/
│   │   ├── index.ts                    postgres.js client, prepare:false
│   │   └── schema.ts                   Drizzle tables
│   ├── lib/
│   │   ├── auth.ts                     Better-Auth: genericOAuth + social
│   │   ├── providers/
│   │   │   ├── index.ts                dispatch on the selected provider
│   │   │   ├── anilist-client.ts       browser-side typeahead
│   │   │   ├── jikan-client.ts         browser-side typeahead (MAL id space)
│   │   │   ├── log-provider-failure.ts shared by index.ts and server/services/media.ts —
│   │   │   │                           not in the original Phase 3 plan; added so the
│   │   │   │                           provider/reason/elapsed-ms log line (criterion 13)
│   │   │   │                           isn't duplicated at both dispatch points
│   │   │   └── __fixtures__/           recorded (AniList) and schema-built (Jikan) responses —
│   │   │                               see tech-stack.md's Jikan section for which is which
│   │   ├── score.ts                    the ONE score formatter — 5 formats
│   │   ├── types/media.ts              UnifiedMediaResult
│   │   └── validators/rec.ts           Zod schemas, shared client+server
│   └── server/
│       ├── hono/
│       │   ├── middleware.ts           rate limiting only — despite the name, it does not
│       │   │                           guard sessions; recs.ts calls auth.api.getSession()
│       │   │                           directly, session-before-limiter per PHASE-4.md
│       │   └── recs.ts                 POST/GET /api/recs — thin: session, rate limit,
│       │                               delegates everything else to services/recommendations.ts
│       ├── services/
│       │   ├── media.ts                server-side resolve, per provider (Phase 3)
│       │   ├── media-cache.ts          wraps media.ts — Redis, provider:mediaType:externalId,
│       │   │                           24h TTL, only caches ok:true (Phase 4)
│       │   ├── recommendations.ts      createRecommendation + getRecommendationBySlug — the
│       │   │                           create flow's core, independent of HTTP/session so it
│       │   │                           is testable against a directly-inserted test user
│       │   └── lists/                  Phase 7 — AniList + MAL v2, token-bearing
│       │       ├── anilist.ts
│       │       └── mal.ts
├── drizzle.config.ts
├── next.config.ts
└── package.json
```

**No `tailwind.config.ts`.** Tailwind 4 is configured in `globals.css`. Its absence is
correct — do not "restore" it.

## Layers and the dependency rule

```
   app/  ────────────────►  server/  ────────────►  db/
     │                         │
     │                         └──────────────────►  lib/
     ▼
  components/  ─────────────────────────────────►  lib/
```

Dependencies point **right and down only**. Concretely:

| Layer | May import | May **never** import |
|---|---|---|
| `app/` | everything | — |
| `components/` | `lib/` | `server/`, `db/` |
| `server/` | `db/`, `lib/` | `app/`, `components/` |
| `db/` | `lib/` (types only) | everything else |
| `lib/` | nothing internal | everything else |

`lib/` is the only isomorphic layer — it must run unchanged in a browser and on a server.
That is why the Zod validators and `UnifiedMediaResult` live there, and why nothing in
`lib/` may read a secret.

Every module under `server/` and `db/` begins with `import "server-only"`. This turns a
dependency-rule violation into a build error instead of a leaked connection string.

## Runtime: Node everywhere the database is involved

`postgres.js` needs TCP. Vercel's Edge Runtime has none — it ships only a `workerd` build for
Cloudflare Workers, which this is not. So the Hono API, `/r/[slug]/page.tsx`, and
`/r/[slug]/opengraph-image.tsx` all run on **Node**.

Never add `export const runtime = "edge"` to any of them. The brief asks for Edge on the OG
image; that is not implementable, because the image reads the recommendation from the
database (**D21**). Invariant 15.

## The API is one Hono app

Everything under `/api` is served by a single Hono instance mounted at
`src/app/api/[[...route]]/route.ts` via the `hono/vercel` adapter (`handle(app)` — there is
no `hono/next`). Better-Auth mounts *inside* that app, so there is no competing Next route
and no precedence question to reason about.

**Phase 2 creates this file**, because it is the first phase with something to mount. Every
later phase adds routes to the same app. There is exactly one `route.ts` under `src/app/api`,
and a second one is always a bug.

```
/api/[[...route]]  ──►  Hono
                         ├── ALL  /api/auth/*         Better-Auth handler   (Phase 2)
                         ├── POST /api/recs           create, session required
                         │                            (rate limited 5/min/user)
                         ├── GET  /api/recs/:slug     read — public
                         ├── GET  /api/recs           your recs, session     (Phase 8)
                         ├── DELETE /api/recs/:slug   yours only             (Phase 8)
                         └── GET  /api/lists/:provider  your AniList/MAL list (Phase 7)
```

Every route except `GET /api/recs/:slug` requires a session. That one exception is what
keeps shared links working for people who have never signed in (invariant 9).

## Request paths

### Typeahead — the browser talks to the provider the user chose

```
  ProviderToggle  ──►  "anilist" | "mal"       (default anilist, remembered)
     │
  keystroke
     │  debounce 250ms, min 2 chars
     ▼
  src/lib/providers/index.ts   ── dispatch on provider ──┐
                                                          │
     ┌────────────────────────────────────────────────────┤
     ▼                                                    ▼
  anilist-client.ts                                  jikan-client.ts
     └──► graphql.anilist.co                            └──► api.jikan.moe/v4
          (user's own 30/min quota)                          (user's own IP)
```

Both providers send `Access-Control-Allow-Origin: *`, so both are callable from the browser
and the toggle costs nothing architecturally.

This is decision **D3**, and it exists for one reason: AniList's limit is **30 requests per
minute per IP**. On Vercel every server request leaves from a small shared pool of egress
IPs, so a server-side proxy would put every user of the product into a single 30/min bucket.
Search would break under trivial load. Sending typeahead from the browser gives each user
their own quota.

**There is no automatic fallback between providers** (**D14**, **D15**). The user made a
choice, and the two id spaces are disjoint, so silently answering from the other provider
would both contradict the choice and return a different show. On failure the UI offers a
one-tap switch that flips the toggle and re-runs the same query.

### Creation — session required, server resolves per provider, one transaction

```
  "Generate Share Link"
     │  { caption?, comment?, items: [{ provider, externalId, mediaType,
     │                                  scoreRaw?, scoreFormat?, comment? }, …] }
     ▼
  POST /api/recs
     │
     ├─ session required  ── 401 if absent          (D23)
     ├─ rate limit (Upstash, 5/min, keyed on user id)   (D34)
     ├─ Zod validation  ── incl. "must say something" (invariant 8)
     ├─ for each item: src/server/services/media.ts
     │     ├─ cache hit on provider:mediaType:externalId ──► return
     │     └─ resolve against THAT provider only  (timeout, 1 retry)
     │           └─► UnifiedMediaResult
     ├─ nanoid slug, retry on unique violation
     └─ INSERT rec + items in ONE transaction ──► { slug }
```

Items are resolved and inserted **transactionally**. A partial group — three of five items
written, then a provider timeout — would produce a recommendation that misrepresents what the
user actually said.

Scores are the exception to server-side re-resolution: `scoreRaw` and `scoreFormat` come from
the client, because they are the *user's own* rating, not provider data. They are validated,
not re-fetched.

Resolution dispatches on the `provider` the client sent and **never crosses to the other
one**. An AniList id looked up on MyAnimeList resolves to a different anime — see the
verified id-space evidence in `tech-stack.md`. If the issuing provider cannot answer, the
request fails with 502; it does not guess.

The server never trusts the client's copy of the title or cover art — it re-resolves from
`externalId`. Otherwise anyone could POST a rec with arbitrary text and imagery and have
Tsugi render it on a branded card.

This path is low-volume and cacheable, which is what makes the shared 30/min budget
survivable here.

### Public read

```
  GET /r/[slug]                        ── dynamic, rendered per request
     ├─ read recommendation
     ├─ render page
     └─ increment views  ── fire-and-forget, never awaited, never fatal

  GET /r/[slug]/opengraph-image        ── cacheable
     └─ ImageResponse from next/og  —  does NOT increment views
```

The page cannot be cached: it counts views, and a cached render counts nothing. The image
can be, and should be — it counts nothing and is fetched by every chat client that sees the
link.

The OG route is excluded from view counting deliberately: every unfurl by every chat client
would otherwise inflate the counter far beyond actual human visits.

### List import — server-side, token-bearing (Phase 7)

```
  "My list"
     ▼
  GET /api/lists/:provider   ── session required
     │
     ├─ read the OAuth token from `account`   (never leaves the server)
     ├─ MAL: refresh if the 1h access token expired
     ▼
  anilist.ts  MediaListCollection      │  mal.ts  /users/@me/animelist
     └─ + Viewer.mediaListOptions      │     └─ + X-MAL-CLIENT-ID header
        .scoreFormat                   │        (format is always POINT_10)
```

This is server-side for two independent reasons: the OAuth token must not reach the browser
(invariant 10), and **MAL v2 sends no CORS headers at all** — the browser cannot call it even
if we wanted to. It does not reintroduce the D3 quota problem, because a list is fetched once
per user per session rather than once per keystroke.

## Many adapters, one type

Search adapters exist for AniList and Jikan, in browser and server flavours, and all emit
`UnifiedMediaResult` from `src/lib/types/media.ts`. That shared type is the contract.

`provider` is a **field on that type**, not a branch in the code that consumes it.
Downstream code reads it for two purposes only: as part of media identity, and as a label to
display. Any `if (provider === "anilist")` outside `src/lib/providers/` or
`src/server/services/` means normalisation failed, and the fix belongs in the adapter — not
at the call site.

Related: [`tech-stack.md`](./tech-stack.md) · [`user-flow.md`](./user-flow.md) ·
[`planning/PLAN.md`](./planning/PLAN.md)
