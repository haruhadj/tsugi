# Tech Stack

**This file is the only home for version facts.** Nothing else in the repository states a
version number. If you need one, link here.

## Verification status

All versions below were checked against the npm registry on **2026-08-09** with
`npm view <pkg> version peerDependencies`. Re-verify before starting a new phase, or any
time an install produces a peer-dependency warning. A version matrix without a date is a
rumour.

## Version matrix — verified 2026-08-09

| Package | Version | Notes |
|---|---|---|
| `next` | 16.3.0 | Turbopack default; requires Node ≥20.9, TypeScript ≥5.1 |
| `react` / `react-dom` | 19.2.8 | Next 16 App Router runs React 19.2 features |
| `typescript` | ^5 | 5.1 is the floor for Next 16 |
| `tailwindcss` | 4.3.3 | CSS-first config. **No `tailwind.config.ts` exists.** |
| `daisyui` | 5.7.16 | Requires Tailwind 4. Installed via `@plugin` in CSS. |
| `hono` | 4.13.1 | |
| `@hono/zod-validator` | 0.9.0 | peers: `hono >=4.11.2`, `zod ^3.25.0 \|\| ^4.0.0` |
| `zod` | 4.4.3 | v4 — accepted by the validator's peer range |
| `drizzle-orm` | 0.45.2 | Better-Auth peer-pins `^0.45.2`. Do not drift. |
| `drizzle-kit` | 0.31.10 | Better-Auth peer requires `>=0.31.4` |
| `postgres` | 3.4.9 | postgres.js driver |
| `better-auth` | 1.6.26 | peers accept `next ^14 \|\| ^15 \|\| ^16` |
| `nanoid` | 6.0.1 | **ESM-only** (`"type": "module"`) |
| `@upstash/ratelimit` | 2.0.8 | peer: `@upstash/redis ^1.34.3` |
| `@upstash/redis` | 1.38.2 | |
| `server-only` | 0.0.1 | **Not** a Next dependency — must be installed explicitly, or every `import "server-only"` fails to resolve |

**Local toolchain:** Bun 1.3.14, Node 24.14.0, linux/aarch64.

**Test runner:** `bun test`, built into Bun. Not a dependency and not in the matrix above —
there is nothing to version or upgrade. (**D16**)

## Explicitly not used

| Package | Why not |
|---|---|
| `@vercel/og` | Next ships `ImageResponse` at `next/og`. The separate package is for non-Next runtimes. Adding it duplicates the renderer. The client brief lists it — the brief is wrong. |
| `tailwind.config.ts` | Not a package, but worth stating: DaisyUI 5 deprecates it. Configuration lives in `src/app/globals.css`. |
| `next lint` | Removed in Next 16. `next build` no longer lints. CI calls `eslint` directly. |

## Per-library rules

### Next.js 16
- `params` and `searchParams` are **Promises**. Always `await`. This includes
  `opengraph-image` — a Next 16 breaking change.
- Turbopack is the default for `dev` and `build`. Do not add `--turbopack` flags.
- Never add a `webpack` config — it makes `next build` fail under Turbopack.
- The middleware convention is renamed to `proxy` and runs **Node-only**. We do not
  currently use it; if you need one, it is `proxy.ts`, not `middleware.ts`.
- `revalidateTag` requires a second `cacheLife` argument.
- Remote images need `images.remotePatterns` — we need `s4.anilist.co` and
  `cdn.myanimelist.net`. `images.domains` is deprecated.
- `images.qualities` now defaults to `[75]` only.

### Tailwind 4 + DaisyUI 5
- Configuration is CSS. In `src/app/globals.css`:
  ```css
  @import "tailwindcss";
  @plugin "daisyui" {
    themes: night --default;
  }
  ```
- Verified syntax: the `themes:` list with `--default` / `--prefersdark` modifiers.
- **Verified 2026-08-09** — the custom-theme block, should it ever be needed. Note the
  second form: redeclaring a *built-in* theme's name overrides only the tokens you list,
  which is the cheap way to tint `night` without authoring twenty colours.
  ```css
  @plugin "daisyui";
  @plugin "daisyui/theme" {
    name: "night";          /* same name as a built-in = partial override */
    default: true;
    --color-accent: oklch(72% 0.19 25);
  }
  ```
  Full custom themes take `name`, `default`, `prefersdark`, `color-scheme`, ~20
  `--color-*` tokens in OKLCH, plus `--radius-selector` / `--radius-field` /
  `--radius-box`, `--border`, `--depth`, `--noise`.
- **Tsugi uses unmodified `night`** (decision **Q3**, resolved). The above is recorded so a
  future change is a five-minute edit rather than a research task.

### Drizzle + Supabase
- **Live project: PostgreSQL 17.6**, region `ap-southeast-2`, both connections verified
  2026-08-09.
- Construct the client as `postgres(url, { prepare: false })` on the transaction pooler.

  **Do not "discover" that this is unnecessary and remove it.** A direct test on
  2026-08-09 — `prepare: true`, three sequential queries, `max: 1` — **succeeded** against
  port 6543. That is a weak test and does not clear the setting: with a single pooled
  connection the queries almost certainly stayed on one backend, so it never exercised the
  actual failure mode. That mode is transaction pooling multiplexing many clients onto few
  server connections, where a statement prepared on one backend is missing when a later
  query lands on another. It appears under concurrency, in production, intermittently.

  Supavisor may also genuinely support protocol-level named prepared statements now
  (PgBouncer gained this in 1.21.0). Either way, both Supabase's and Drizzle's documentation
  say to disable them, the cost of doing so is negligible, and the failure it prevents is
  the kind that only shows up under load. Keep it. (**D8**)
- **Development runs against a real Supabase project, not a local Postgres** (**D17**). The
  pooler is the only place `prepare: false` matters, so a local Postgres on 5432 would let
  that bug through to production untested.
- Free-tier projects pause after a period of inactivity. A first query after a pause can be
  slow or fail; wake the project before blaming the code.
- Keep `drizzle-orm` at exactly the version Better-Auth peer-pins. A mismatch breaks the
  adapter's type inference in ways that surface as confusing schema errors.
- **`numeric()` returns a string by default.** Verified by reading
  `pg-core/columns/numeric.d.ts` in 0.45.2 — the builder is generic over
  `'string' | 'number' | 'bigint'` and falls through to `'string'` when no mode is given.
  `scoreRaw` therefore declares `numeric(4, 1, { mode: "number" })`; see `planning/PHASE-1.md`.
  This is a silent trap: the schema compiles either way, and the string only becomes visible
  when a score renders as `"87.0"/100`.

### Supabase exposes every `public` table publicly — RLS is not optional

Verified against the live project on 2026-08-09. Three facts that combine badly:

1. **PostgREST is live and public.** `https://<ref>.supabase.co/rest/v1/<table>` answers
   `401` without a key — it is running and reachable from anywhere.
2. **Default privileges grant the `anon` role everything.** Querying `pg_default_acl` for
   schema `public` returns, for tables created by `postgres`:
   ```
   anon=arwdDxtm/postgres      a=INSERT r=SELECT w=UPDATE d=DELETE D=TRUNCATE
   authenticated=arwdDxtm/postgres
   ```
3. **Our migrations run as `postgres`** (confirmed: `current_user = postgres`), so every
   table Drizzle creates inherits exactly those grants.

The `anon` key is public by design — it ships in browser bundles. So a table without RLS is
a **writable public API**: anyone could `POST /rest/v1/recommendation` with arbitrary title
and cover art (defeating D13's anti-defacement resolution), `DELETE` every row, or read the
Better-Auth `session` table and its tokens.

**Mitigation:** enable RLS on every table and define no policies. Drizzle's docs describe
this as default-deny — nothing visible or modifiable. The `postgres` role owns the tables and
so bypasses RLS, meaning the application keeps working unchanged. (**D20**)

**Version trap — the syntax differs from the published docs.** On `drizzle-orm@0.45.2`,
verified by reading `node_modules/drizzle-orm/pg-core/table.d.ts`:

```ts
export const recommendation = pgTable("recommendation", { … }).enableRLS();  // ✅ 0.45.2
export const recommendation = pgTable.withRLS("recommendation", { … });      // ❌ v1 only
```

The docs site shows `pgTable.withRLS()` and calls `.enableRLS()` deprecated — that is the
**v1** API. `withRLS` does not exist in 0.45.2 and will not compile. We are pinned to 0.45.2
by Better-Auth's peer range, so `.enableRLS()` is correct here.

### Everything that touches the database runs on Node, not Edge

`postgres.js` ships only a `workerd` build for edge-like environments (Cloudflare Workers,
which expose `cloudflare:sockets`). Vercel's Edge Runtime is not workerd and provides no TCP,
so the default build's `node:net` / `node:tls` imports cannot resolve.

Consequence: the Hono API route, `/r/[slug]/page.tsx`, and `/r/[slug]/opengraph-image.tsx`
all run on the Node runtime. The client brief's requirement 6 specifies Edge for the OG
image; that is not implementable, because the image must read the recommendation from the
database. (**D21**)

### Hono ↔ Next.js

The adapter is `hono/vercel` — verified present in the package's exports. There is no
`hono/next`.

```ts
import { handle } from "hono/vercel";
export const GET = handle(app);
export const POST = handle(app);
```

### Better-Auth
- **Supabase's own auth is not used, and its tables are already there.** A fresh Supabase
  project ships ~23 tables in the `auth` schema (`auth.users`, `auth.sessions`, …) belonging
  to GoTrue, Supabase's authentication service. Tsugi uses **Better-Auth**, which creates
  its own `user` / `session` / `account` / `verification` tables in **`public`**.

  The two coexist without conflict, but `auth.users` and `public.user` are different tables
  from different systems. Never join them, never treat a Supabase auth user as a Tsugi user,
  and never "fix" the apparent duplication by pointing Better-Auth at the `auth` schema.
  Confirmed against the live project 2026-08-09: `public` is empty, `auth` is populated.
- Mounted **inside** the Hono app, not as a separate Next route:
  ```ts
  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
  ```
  This is why the catch-all at `/api/[[...route]]` does not collide with auth.
- Schema is generated by the Better-Auth CLI, then migrated with Drizzle Kit. Do not
  hand-write the auth tables.
- **The CLI requires a config file to exist, and the documentation says otherwise.** The
  1.5 release blog states `--adapter` works "without requiring a complete Better Auth
  configuration file". Reading `packages/cli/src/commands/generate.ts` shows the config
  lookup runs *before* the adapter branch and returns early when it finds nothing:

  > `No configuration file found. Add a \`auth.ts\` file to your project or pass the path to
  > the configuration file using the \`--config\` flag.`

  `--adapter` only removes the need for a configured *database* adapter. A minimal
  `src/lib/auth.ts` must exist before the CLI will run. This is why Phase 1 creates one.
  Source outranks docs — verified 2026-08-09.
- Default Drizzle output is `auth-schema.ts` at the project root. Pass `--output` to place
  it where the schema actually lives.
- **Extra columns on `user` come from `user.additionalFields` in the config**, and the CLI
  emits them into the generated schema. This is how `user.scoreFormat` lands in the first
  migration (**D32**) — hand-adding a column to the generated file would be undone by the
  next `generate` run.
  ```ts
  user: { additionalFields: { scoreFormat: { type: "string", required: true,
                                             defaultValue: "POINT_10", input: false } } }
  ```
  `input: false` keeps it out of any client-writable payload — it is set server-side from
  the provider, never by the user.
- The CLI emits PostgreSQL dates as `timestamp()` — no timezone. Be deliberate if you
  compare them to `timestamptz` columns.

### Zod 4
- Shared between client and server via `src/lib/validators/`. One schema, both sides.

### nanoid
- ESM-only. Fine inside Next's bundler; it will break any CommonJS script. If a plain Node
  script needs a slug, use `crypto.randomUUID()` there instead of reaching for a shim.

## External APIs — measured, not documented

Both were called live on **2026-08-09**. These numbers come from observed response headers
and status codes, not from documentation.

### AniList GraphQL — `https://graphql.anilist.co`
- **`x-ratelimit-limit: 30`** per minute, per IP. Older documentation claims 90; the live
  header says 30. Trust the header.
- `access-control-allow-origin: *` — callable directly from the browser. This is what makes
  the browser-side typeahead possible (decision **D3**).
- No authentication needed for public search.
- **Titles come back with typographic punctuation.** The English title of *Sousou no Frieren*
  is `Frieren: Beyond Journey’s End` — U+2019 RIGHT SINGLE QUOTATION MARK, not the ASCII
  `'`. Re-verified live 2026-08-09. Any test asserting a title equality must copy the
  string from a fixture rather than retype it; a hand-typed apostrophe fails a comparison
  that looks like an adapter bug.
- Cover images are served from `s4.anilist.co`.
- Returns **`idMal`** on media objects — the only sanctioned bridge between the two id
  spaces. See below.

### Jikan v4 — `https://api.jikan.moe/v4`
- **`Access-Control-Allow-Origin: *`** — also callable directly from the browser, including
  on preflight. Verified 2026-08-09. This is what lets the user-selected provider toggle
  work entirely client-side (**D14**).
- **Intermittently returns HTTP 504** (`"Jikan failed to connect to MyAnimeList"`). Roughly
  half of all live calls during the first verification failed this way, then retries
  succeeded. This is normal behaviour for this API, not an outage. Note the CORS header is
  present even on the 504, so a browser sees a real status rather than an opaque CORS error.
- **Re-measured 2026-08-09, later the same day: six consecutive calls, six 504s.** "About
  half" is the optimistic reading — it fails in runs, not independently, so a retry a second
  later frequently fails too. Two consequences: the one-tap switch to AniList (**D14**) is
  the *primary* path for MyAnimeList users, not an edge case; and **Phase 3's recorded
  fixtures have to be captured opportunistically**, because you cannot record a fixture from
  an API that is refusing. Capture them when Jikan answers and commit them; never make
  fixture capture a blocking step.
- **Consequence:** a user who selects MyAnimeList will hit failures regularly. Retry once,
  then offer the one-tap switch to AniList per **D14**. Never treat it as a crash.
- Documented limits are roughly 3 req/sec and 60 req/min; the API returns no rate-limit
  headers, so this cannot be verified from a response and must be respected client-side.
- Cover images are served from `cdn.myanimelist.net`.

### AniList OAuth + user lists — verified 2026-08-09

- Authorize: `https://anilist.co/api/v2/oauth/authorize` · Token:
  `https://anilist.co/api/v2/oauth/token`. Both live (401 / 400 without params).
- Register the client at `anilist.co/settings/developer`.
- The GraphQL schema exposes `Viewer`, `MediaList`, and `MediaListCollection` — a user's list
  is one authenticated query.
- **`User` has no `email` field.** Confirmed by introspecting the type: `id`, `name`,
  `about`, `avatar`, `bannerImage`, `options`, `mediaListOptions`, `favourites`,
  `statistics`, `siteUrl`, … and nothing resembling an email. This is what forces synthesised
  emails and manual account linking (**D25**).
- **Score format is a user preference**, at `Viewer.mediaListOptions.scoreFormat`, and takes
  one of five values:

  | Format | AniList range | Tsugi range | Notes |
  |---|---|---|---|
  | `POINT_100` | 0–100 | 1–100 | |
  | `POINT_10_DECIMAL` | 0.0–10.0 | 0.1–10.0 | needs one decimal place |
  | `POINT_10` | 0–10 | 1–10 | |
  | `POINT_5` | 0–5 | 1–5 | stars |
  | `POINT_3` | 1–3 | 1–3 | **smileys, not numbers** — never render as `2/3` |

  **AniList's `0` means "unrated", not "rated zero"** — it is the value every entry carries
  before the user scores it, and MAL's `0` means the same. Tsugi therefore floors every
  format at 1 and stores an incoming `0` as `(null, null)` (**D35**). This is why the Tsugi
  column differs from AniList's.

  Read the format at fetch time; users change it. Scores are stored as rated (**D28**).

### MyAnimeList official API v2 — verified 2026-08-09

Jikan is unofficial and read-only with no auth. Anything involving a *user* needs the
official API, which is a different service with different rules.

- Authorize: `https://myanimelist.net/v1/oauth2/authorize` · Token:
  `https://myanimelist.net/v1/oauth2/token`. Both live (400 / 411 without params).
- Register at `myanimelist.net/apiconfig` for a client id **and** secret.
- **PKCE: `plain` only.** The docs state it outright — the challenge equals the verifier.
  Better-Auth emits S256, so MAL needs a custom `getToken` (**D30**).
- **Access token: 1 hour. Refresh token: 1 month.** List import must refresh, not assume.
- **Every request needs a client id**, including public search:
  `api.myanimelist.net/v2/anime?q=…` returns `403 {"error":"forbidden"}` without
  `X-MAL-CLIENT-ID`. Jikan needs nothing.
- **No CORS headers at all** — verified with an `Origin` header, response carried no
  `access-control-*`. The browser cannot call MAL v2 under any circumstance, which is why
  Jikan remains the browser-side transport and MAL v2 is server-only.

### Better-Auth providers

- **Built in:** Google — configured under `socialProviders`, no plugin.
- **Not built in:** AniList and MyAnimeList — both go through the `genericOAuth` plugin,
  which takes `authorizationUrl`, `tokenUrl`, `pkce`, and custom `getToken` / `getUserInfo`.
- Account linking is enabled by default **but matches on verified email**, so it cannot work
  for the trackers. Use explicit `linkSocial()` (**D25**).
- **A repeat sign-in does not refresh the user row.** `getUserInfo` is re-applied only when
  the provider sets `overrideUserInfo: true` — verified by reading 1.6.26:
  `dist/api/routes/callback.mjs` forwards `provider.options?.overrideUserInfoOnSignIn`, and
  the update in `dist/oauth2/link-account.mjs` is gated on that flag. Both trackers set it,
  so `user.scoreFormat` tracks the user's actual preference (**D32**).
- The OAuth sign-in path does **not** run `z.email()` on the address returned by
  `getUserInfo`. Every `z.email()` in the package is on the password, magic-link, OTP, admin,
  or organization routes. That is why a synthesised address works at all — and why it should
  still be syntactically valid (**D25**).

### Share intent URLs — verified 2026-08-09

Checked by following redirects, not from memory.

| Target | URL | Notes |
|---|---|---|
| X | `https://x.com/intent/post?text=…&url=…` | Canonical — returns 200 directly |
| X (legacy) | `https://twitter.com/intent/tweet?…` | 301s to `x.com/intent/tweet`. Works, but use the canonical form. |
| WhatsApp | `https://wa.me/?text=…` | Redirects to `api.whatsapp.com/send/`. |

**WhatsApp has no separate `url` parameter** — the link must be URL-encoded *inside* `text`.
Passing a `url` param silently drops it, and the share arrives without the link, which is the
one thing the product exists to deliver.

Discord has no public web share intent. Its button copies a formatted message instead —
see `planning/PHASE-5.md`.

### The two id spaces are disjoint — verified, not assumed

This is the single most dangerous assumption available in this codebase.

```
AniList  "Sousou no Frieren"  → id 154587,  idMal 52991
Jikan    "Sousou no Frieren"  → mal_id 52991
AniList  Media(id: 52991)     → 404 Not Found
```

An id is meaningless without the provider that issued it. Resolving an AniList id against
MyAnimeList silently returns **a different anime**, or nothing — which is why cross-provider
fallback by id is impossible and was removed from the plan (**D15**).

`idMal` on an AniList result is the only legitimate cross-walk. It maps AniList → MAL only,
never the reverse, and it is `null` for titles MAL does not carry.

Related: [`architecture.md`](./architecture.md) · [`code-standards.md`](./code-standards.md)
