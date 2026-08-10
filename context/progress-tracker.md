# Progress Tracker

**Read this first, every session.** Current state, why things are the way they are, and what
happened last time.

---

## Current state

| | |
|---|---|
| **Current phase** | **Phase 0 — Foundation & CI** ([spec](./planning/PHASE-0.md)) |
| **Phase status** | Not started |
| **Last updated** | 2026-08-09 |
| **Application code** | None. The repository contains context files only. |
| **Repository** | Git initialised, branch `main`, context set committed. **No remote yet** — Phase 0 criterion 12 needs one |

### Phase status

| Phase | Status |
|---|---|
| 0 — Foundation & CI | Not started ← **current** |
| 1 — Data layer | Not started |
| 2 — Authentication | Not started — moved up by **D23/D31** |
| 3 — Media providers | Not started |
| 4 — API surface | Not started |
| 5 — Create & share UX | Not started |
| 6 — Public page & OG cards | Not started |
| 7 — List import | Not started — new |
| 8 — Dashboard | Not started |

### Immediate next steps

1. Scaffold Next 16 + Bun per [`planning/PHASE-0.md`](./planning/PHASE-0.md).
2. Confirm the Tailwind 4 / HeroUI 3 CSS-first setup actually loads `@heroui/styles` —
   Phase 0 exit criterion 7, the one that catches a silently-unstyled page. Install all five
   `react-aria` peers; they are not optional (**D37**).
3. **Create a GitHub remote and push `main`.** Phase 0 criterion 12 cannot be observed
   without one, and it is the only external thing this phase needs.
4. Phase 1 is unblocked: `.env` holds working pooler and direct connection strings.
5. **Register three OAuth apps before Phase 2** — AniList, MyAnimeList, Google. The owner
   will supply the credentials. Start the MAL one early: it is the fiddliest, and its
   `plain`-only PKCE (**D30**) is the most likely source of an unplanned day.

---

## Decision log

Decisions keep their reasoning so they are not relitigated. Amendments are recorded as
amendments, with the condition that would justify revisiting them.

### D1 — Tailwind 4 + DaisyUI 5, no `tailwind.config.ts`
> ⚠️ **Half superseded by [D37](#d37--heroui-replaces-daisyui), 2026-08-09.** DaisyUI is
> gone. **Tailwind 4 and the absence of `tailwind.config.ts` survive** — HeroUI 3 requires
> Tailwind ≥4 as a hard peer, so the library change reached the same conclusion by a
> different route. The half that mattered held.

*Amendment to the client brief (requirement 2 and execution step 2).*

The brief specifies `plugins: [require('daisyui')]` in `tailwind.config.ts`. Verification on
2026-08-09 confirmed **DaisyUI 5 requires Tailwind 4, where `tailwind.config.js` is
deprecated and should not be used** — configuration moved into CSS via `@plugin`. The brief's
instruction is not implementable on current versions. The alternative was pinning
`tailwindcss@3.4.19` + `daisyui@4.12.24`, which starts a greenfield project on a superseded
line.

**Chosen:** Tailwind 4 + DaisyUI 5, configured in `src/app/globals.css`.
**Revisit if:** a required dependency turns out to hard-depend on Tailwind 3.

### D2 — Next.js 16.3
The brief says "Next.js 14+". The 16 line is current (exact version in
[`tech-stack.md`](./tech-stack.md)) and Better-Auth's peer range explicitly accepts `^16`.
Next 16 brings Turbopack by default, removes `next lint`, renames middleware to `proxy`, and
makes `params` a Promise everywhere including `opengraph-image`.

**Chosen:** the Next 16 line, accepting the async-params and lint-tooling consequences.
**Revisit if:** an integration proves incompatible in a way that cannot be worked around —
in which case pinning 15.5 is the fallback.

### D3 — Hybrid search: typeahead in the browser, resolution on the server
*Amendment to the client brief (requirement 4).*

The brief puts all searching in `src/server/services/media.ts`. A live call on 2026-08-09
returned **`x-ratelimit-limit: 30`** — AniList permits 30 requests per minute per IP. Vercel
functions egress from a small shared pool of addresses, so a server-side typeahead proxy
would place *every user of the product* into a single 30/min bucket, and search would fail
under trivial load.

AniList sends `access-control-allow-origin: *`, so the browser can call it directly and each
user spends their own quota.

**Chosen:** typeahead runs browser-side; the server resolves the single selected title at
creation time, cached.
**Superseded in part by D14 (2026-08-09):** the browser path now covers *both* providers,
not just AniList — Jikan also sends `Access-Control-Allow-Origin: *`. The clause about
falling back to Jikan at resolve time was **wrong** and was removed by D15.
**Revisit if:** AniList introduces authenticated higher limits, which would make a
server-side proxy viable again.

### D4 — Auth tables ship in Phase 1 ~~and auth is deferred to last~~
> ⚠️ **Half superseded by [D23](#d23--creating-requires-an-account-viewing-never-does) and
> [D31](#d31--phases-reordered-auth-moves-to-third), 2026-08-09.** The deferral is gone: auth
> is now Phase 2 and creation requires it. The surviving half is the part that mattered.

Original reasoning: the 10-second promise forbade auth on the create path, and `userId` was
nullable, so anonymous creation was forced. That left only *when* sign-in landed.

**What still holds:** the Better-Auth tables are created in the **first migration**, before
anything reads them. That was right for the original plan and is right for this one — when
auth moved from Phase 6 to Phase 2, no schema work had to move with it. The reasoning
generalised better than the conclusion did.

### D5 — `next/og`, not `@vercel/og`
*Amendment to the client brief (tech stack and execution step 1).*

Next ships `ImageResponse` at `next/og`. `@vercel/og` is for non-Next runtimes; installing it
bundles a second copy of the same renderer. Next's own codemod migrates imports *toward*
`next/og`.

**Chosen:** `next/og`. `@vercel/og` is not a dependency.
**Revisit if:** OG rendering ever moves out of Next.

### D6 — Better-Auth mounts inside the Hono app
Verified against the Better-Auth Hono integration docs:
`app.on(["POST","GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))`. This avoids any
question of Next route precedence between a dedicated auth route and the
`/api/[[...route]]` catch-all, and keeps one middleware chain.

### D7 — CI calls ESLint directly
*Amendment to the client brief (requirement 7).*

`next lint` was **removed** in Next 16, and `next build` no longer lints. A pipeline built on
either would silently stop checking. CI runs `bun x tsc --noEmit` and `bun x eslint .` as
separate steps, with ESLint flat config.

### D8 — `prepare: false` on the Supabase transaction pooler
postgres.js is constructed with `{ prepare: false }` on the pooler (6543). Two connection
strings are needed: the pooler for the app, and a session-mode or direct connection (5432)
for `drizzle-kit`.

**Amended 2026-08-09 after testing the live project.** The original wording — "queries fail
without it" — is not what we observed: `prepare: true` succeeded on port 6543. The decision
stands anyway, because that test was weak (three sequential queries on a single pooled
connection never exercised the multiplexing failure mode, which appears under concurrency)
and because both Supabase and Drizzle document disabling it. Recorded so nobody later reads
a passing `prepare: true` as permission to remove the setting. Full reasoning in
[`tech-stack.md`](./tech-stack.md).
**Revisit if:** someone runs a genuine concurrency test — many parallel connections, forced
backend switching — and it holds up. That would be real evidence; three queries were not.

### D9 — Rate limiting degrades in development, fails in production
Requiring an Upstash account to run the homepage locally is friction with no benefit. If the
Upstash variables are absent, the limiter falls back to in-memory and logs it. In production
that fallback is not a weaker limiter but *no* limiter — serverless instances share no
memory — so the module throws at startup when `NODE_ENV=production` and the variables are
missing. *Decided during planning rather than asked; it is a reversible default.*

### D10 — Constraints are enforced in three layers
> ⚠️ **The rules changed with [D27](#d27--scores-are-optional-per-item) and
> [D28](#d28--scores-preserve-the-raters-own-scale), 2026-08-09; the principle did not.**
> "Score is an integer 1–10" is no longer one of them.

What is enforced in Zod, in the database column, **and** in the input control:

- comment ≤280, at group and item level
- `scoreRaw` and `scoreFormat` both set or both null
- `scoreRaw` within the range of its own format — per-format, not a single 1–10 rule

Duplicating a rule three times is deliberate: the database is the only layer that cannot be
bypassed, and the UI is the only layer the user experiences.

**One rule breaks the pattern.** Invariant 8 — a recommendation must carry at least one score
or comment — spans two tables and would need a trigger, so it lives only in Zod. Documented
in `planning/PHASE-1.md` so the gap reads as a decision rather than an oversight.

### D11 — Slugs are 12-character nanoid, with collision retry
The brief's schema says `varchar(12)`; its example URL shows 8 characters. The column wins.
Insert retries up to 3 times on a unique violation. "Statistically improbable" is not
"handled".

### D12 — View counting is fire-and-forget and excludes the OG route
The counter is issued without `await` and swallows its own errors — a page must render
against a degraded database. The OG image route does not count, because every unfurl by
every chat client would inflate the number past any human meaning.

### D13 — The server never trusts client-supplied media content
`POST /api/recs` accepts a `provider` and `externalId` and re-resolves the title and cover
art server-side. Accepting them from the request would let anyone render arbitrary text and
imagery on a Tsugi-branded social card.

### D14 — The user selects the search provider
*Clarification from the user, 2026-08-09. Amends the client brief (requirement 4).*

Users choose AniList or MyAnimeList explicitly rather than having a primary/fallback pair
chosen for them. Verified the same day: **Jikan also sends
`Access-Control-Allow-Origin: *`**, including on preflight, so both providers are callable
from the browser and the toggle costs nothing architecturally.

**Chosen:**
- A visible toggle, **pre-set to AniList**, persisted to `localStorage`. A forced choice
  would add a mandatory click to the 10-second path; a default keeps the promise intact
  while leaving the choice available.
- AniList is the default because Jikan fails roughly half the time — defaulting to the
  flakier source would make the product feel broken to anyone who never touches the toggle.
- On failure, the UI **offers** a one-tap switch to the other source and re-runs the query.
  Nothing switches silently.
- Switching the provider clears any current selection, because the ids do not transfer.

**Revisit if:** usage shows nobody ever changes the toggle, in which case the choice is
costing complexity for nothing.

### D15 — There is no cross-provider fallback, because it is not possible
*Correction to this plan's own media-provider phase — numbered 2 at the time, now **Phase
3** — and a withdrawal of the brief's requirement 4.*

An earlier version of that phase had `resolveMedia` fall through from AniList to Jikan. That was
a bug, not a simplification. Verified live on 2026-08-09:

```
AniList  "Sousou no Frieren"  → id 154587,  idMal 52991
Jikan    "Sousou no Frieren"  → mal_id 52991
AniList  Media(id: 52991)     → 404 Not Found
```

The id spaces are disjoint. A fallback keyed on `externalId` would look up **a different
anime** under the same number, or nothing, and store it on a user's card.

**Chosen:** media identity is the triple `(provider, mediaType, externalId)`. `provider` is a
not-null column, a required request field, and the leading segment of the cache key.
Resolution never crosses providers; if the issuing provider cannot answer, the request fails.
**Consequence:** the brief's "auto-fallback handling if the primary provider throws" is
withdrawn as unimplementable. D14's one-tap switch replaces it at the UI level, where the
user re-searches and picks a title with an id that actually belongs to the new provider.
**Revisit if:** never, for id-keyed fallback. AniList's `idMal` is the only legitimate
cross-walk, and using it would be a new feature with its own decision entry.

### D16 — `bun test`, from Phase 0, gating CI
Several exit criteria ("with the provider forced to fail", "assert no rejection") presupposed
a test harness that no phase created, and CI ran only typecheck and lint. Bun's runner is
built in, so this costs no dependency and no config file.

**Chosen:** `bun test`. CI gates on `tsc --noEmit` → `eslint .` → `bun test`. Adapters take
an injectable `fetch` so failures are testable without a runtime flag. Provider tests use
fixtures; live calls live in separate `*.contract.test.ts` files outside the CI gate.
**Scope limit:** no component rendering tests. Phase 5's UI criteria are browser
observations, and mocking React to assert on markup tests the mock.
**Revisit if:** the UI grows logic worth testing in isolation, at which point a DOM
environment is a considered addition rather than a default.

### D17 — Develop against a real Supabase project, not a local Postgres
`prepare: false` (**D8**) only matters against the transaction pooler. A local Postgres on
5432 has no pooler, so the one bug that option exists to prevent would go untested locally
and surface first in production.

**Chosen:** the existing Supabase project, app traffic over the pooler (6543) and
`drizzle-kit` over the direct connection (5432).
**Cost accepted:** development needs network, and free-tier projects pause after inactivity.
**Revisit if:** offline work becomes common, in which case the Supabase CLI's local stack
gives a pooler without the cloud dependency.

### D18 — Phase 1 creates a minimal `src/lib/auth.ts`
*Correction to this plan's own Phase 1.*

Phase 1 excluded all Better-Auth configuration while requiring the Better-Auth CLI to
generate the schema. Those are incompatible. The 1.5 release blog claims `--adapter` works
"without requiring a complete Better Auth configuration file", but
`packages/cli/src/commands/generate.ts` runs the config lookup *before* the adapter branch
and returns early when none is found. Source outranks documentation.

**Chosen:** Phase 1 creates the smallest config the generator accepts — the Drizzle adapter
and the one `additionalFields` entry the schema needs (**D32**). No providers, no secrets, no
mount. **Phase 2** extends it.
**Guarded by:** a Phase 1 exit criterion grepping `src/lib/auth.ts` for providers and
secrets, so the minimal config cannot quietly become real configuration early.

### D19 — Supabase MCP is writable; DDL through it is banned by convention
The hosted Supabase MCP server is configured in `.mcp.json` with the full feature set and
**write access** — the user's explicit choice, made with the alternatives on the table.

That creates two possible paths to a schema change, and only one of them (`drizzle-kit`)
leaves a migration file in git. A `CREATE TABLE` issued through the MCP would make the
database diverge from the repository silently, and surface later as an inexplicable
`drizzle-kit generate` diff.

**Chosen:** the permission stays broad; the discipline is written down instead. No DDL
through the MCP, ever — the rule lives in `AGENTS.md` where it is read every session.
Inspection, reads, logs, docs, and explicit data fixes are all fine.
**Revisit if:** a schema drift incident actually happens, at which point `read_only=true`
plus `features=docs,database,debugging,development` is the one-line fix. Note that
`project_ref` already makes the `account` feature group inert.

### D20 — RLS on every table, from the first migration
*Security. The most consequential finding of the pre-code review.*

Verified against the live project: PostgREST answers publicly at
`https://<ref>.supabase.co/rest/v1/`, and `pg_default_acl` grants the `anon` role
`arwdDxtm` — INSERT, SELECT, UPDATE, DELETE, TRUNCATE — on every table created by `postgres`
in `public`. Our migrations run as `postgres`. The anon key is public by design.

Left alone, `recommendation` would have been a **writable public API** that bypasses rate
limiting (D9), Zod validation, and the server-side resolution that exists specifically to
stop arbitrary content reaching a Tsugi-branded card (D13). Anyone could also `DELETE` every
row. From Phase 6 the Better-Auth `session` and `account` tables would expose tokens.

**Chosen:** RLS enabled on every table with **no policies** — default-deny. The `postgres`
role owns the tables and bypasses RLS, so the application is unaffected. It ships in the
first migration, because adding it later means a window where the data is public.
**Syntax, verified by reading the installed package:** `.enableRLS()` on
`drizzle-orm@0.45.2`. The docs site shows `pgTable.withRLS()` and calls `.enableRLS()`
deprecated — that is the **v1** API and does not exist in our pinned version.
**Guarded by:** Phase 1 criteria **22–25**, including one that runs the actual attack against
the public REST endpoint rather than just asserting the setting.
**Revisit if:** a feature ever needs genuine public read access, which would call for an
explicit `select` policy — never for disabling RLS.

### D21 — Node runtime everywhere the database is touched
*Amendment to the client brief (requirement 6).*

`postgres.js` ships only a `workerd` build for edge-like environments; Vercel's Edge Runtime
is not workerd and offers no TCP, so `node:net` / `node:tls` cannot resolve. The brief
specifies Edge for `opengraph-image`, but that route must read the recommendation from the
database.

**Chosen:** the Hono API, `/r/[slug]/page.tsx`, and `/r/[slug]/opengraph-image.tsx` all run
on Node. Invariant 15 forbids `runtime = "edge"` on any of them; **Phase 6 criterion 22**
greps for it.
**Revisit if:** the data layer ever moves to an HTTP-based driver, which would make Edge
possible — and would be a much larger decision than a runtime flag.

### D22 — Three test tiers; only the unit tier gates CI
Phase 1's tests need a live database and Phase 3's contract tests need live third-party APIs.
Putting either in the CI gate means builds go red for reasons unrelated to the change —
a paused free-tier project, a Jikan 504 — and a gate that is red for unrelated reasons is a
gate people stop reading.

**Chosen:** `*.test.ts` (unit, gates CI) · `*.db.test.ts` · `*.contract.test.ts`. Exclusion
is a **runtime skip** keyed on `process.env.DATABASE_URL`, not a CI filter argument — CI has
no credentials so those tiers skip themselves, and locally Bun loads `.env` so they just run.
Nothing to keep in sync, and no glob typo can silently drop a suite.
**Cost accepted:** the RLS guarantees (D20) are not regression-checked automatically. The
mitigation is a written rule — run the database tier before every deploy — recorded in
`code-standards.md` and Phase 1.
**Revisit if:** an RLS regression ever reaches production, at which point CI secrets plus a
main-only database job is the answer.

---

## The pivot — 2026-08-09

D23–D31 are a deliberate change of product, not corrections. They were requested after the
blueprint was complete and were applied together.

### D23 — Creating requires an account; viewing never does
*Reverses the original core mission.*

The owner does not want anonymous rows accumulating. Anonymous creation — previously the
product's defining feature and the reason for the 10-second promise — is removed.

**The concern I raised, and the owner's decision:** requiring AniList/MAL accounts does not
merely add friction, it narrows *who can use Tsugi at all* to people already holding an
account on another service. The stated audience was casual Discord conversation. The owner
accepted this and added a non-tracker way in for people without one — Discord and Google in
the first pass, then Google alone once Discord was dropped hours later (**D24**).

**Chosen:** every write path checks the session; `userId` is `NOT NULL` in the database so a
single missed check cannot create an orphan. `/r/[slug]` and its OG card stay fully open —
gating them would end the distribution loop the product depends on.
**The promise is restated, not abandoned:** under 10 seconds *for a signed-in user*.
**Revisit if:** sign-in conversion turns out to be the thing killing creation volume.

### D24 — Three providers, two tiers
*Amended 2026-08-09, later the same day: Discord dropped.*

**AniList** and **MyAnimeList** are the tracker accounts, and the only ones that unlock list
import. **Google** is the fallback of last resort — sign-in and nothing more.

GitHub, from the original brief, is gone: a developer's identity provider is an odd thing to
ask of someone sharing an anime recommendation. Discord was briefly included for audience
fit and then removed by the owner, on the reasoning that Tsugi should **push people toward a
tracker account**, with a single universal fallback rather than a menu of them. Every extra
sign-in button dilutes that push and adds an OAuth app to maintain.

**Chosen:** three providers. The sign-in screen puts AniList and MyAnimeList first and
visually primary, with Google separated below. A Google user can link a tracker later from
**account settings** and gain import then (**D25**) — so choosing Google is a deferral, not a
dead end.
**Note:** Discord remains a **share target** in the ShareModal. That is a different thing
entirely — a button that copies a formatted message for pasting into Discord — and removing
the OAuth provider does not touch it.
**Revisit if:** sign-in conversion shows people bouncing off the tracker requirement, which
would argue for making the fallback more prominent rather than adding another one.

### D25 — Synthesised emails, and no automatic account linking
Verified by introspection: **AniList's `User` type has no email field**, and MAL's
`/users/@me` does not return one either. Better-Auth wants a unique email, so tracker
sign-ins mint `anilist-<id>@users.tsugi.invalid` (`.invalid` is reserved by RFC 2606 and can
never route).

**Amended 2026-08-09 (pre-code audit):** the separator was `:`, which is not valid in an
unquoted local part under RFC 5322. Better-Auth's OAuth path does not validate it — the
package's `z.email()` calls are all on routes we do not use — so it would have worked until
something else touched the address. Changed to `-`, which is valid everywhere.

**Consequence:** Better-Auth links accounts by matching a *verified* email. Synthesised
addresses never match, so signing in with AniList and later Google produces **two separate
users**. That is expected behaviour, and a Phase 2 exit criterion asserts it so nobody
reports it as a bug. Linking is explicit only, via `linkSocial()` from an authenticated
session. Never enable `trustedProviders` for the trackers — it would link strangers who
happen to collide.

### D26 — One model: a recommendation holds 1..N items
> ⚠️ **Capped at 10 by [D36](#d36--ten-items-per-recommendation-four-at-a-time-eight-seconds-total),
> 2026-08-09.** The model is unchanged; only N is bounded, because each item costs a provider
> call on a shared rate-limit budget.
Replaces the old "one row, one title". Grouping (*"AoT and Vinland Saga is my masterpiece"*)
was explicitly out of scope before, on the grounds that lists are a different product. The
owner wants it, and the cheapest correct shape is one model where a single title is simply
the N=1 case — one code path, one page, one card renderer that adapts to item count.

**Chosen:** `recommendation` (group) + `recommendation_item` (1..N, ordered by `position`,
cascade delete). Comments exist at both levels.
**Revisit if:** the card design for large groups proves unworkable, which would argue for
capping N rather than splitting the model.

### D27 — Scores are optional per item
With grouping and list import, requiring a score on each of eight titles is real friction,
and a group comment often carries the whole meaning. Scores are nullable.

**The floor that replaces it:** a recommendation must carry **at least one score or one
comment**, at either level (invariant 8). An empty rec is not a recommendation. This spans
two tables, so it lives in Zod rather than a database constraint — a deliberate exception to
the three-layer rule, documented in Phase 1 so nobody "fixes" the missing constraint.

### D28 — Scores preserve the rater's own scale
*The owner chose the harder option here, knowingly.*

AniList exposes five score formats — `POINT_100`, `POINT_10_DECIMAL`, `POINT_10`, `POINT_5`,
`POINT_3` — read from `Viewer.mediaListOptions.scoreFormat`. MAL is always 10-point.

**Chosen:** store `(scoreRaw, scoreFormat)` exactly as rated. Both null or both set, enforced
by a `CHECK`. Never normalise on import.
**Why it matters that this was decided now:** normalisation is irreversible. An `87` coerced
to `9` cannot be restored, so this is not a choice that could have been deferred.
**Cost accepted:** every display surface — create screen, public page, **and the OG card** —
must render five formats, and `POINT_3` is smileys rather than a number. Invariant 6 was
rewritten around this.

### D29 — `provider` names the id space, not the API vendor
Was `anilist | jikan`; now `anilist | mal`. Jikan and the official MAL API v2 both return
**MAL** ids, so they are two transports for one id space. Naming the vendor would have meant
a title fetched via Jikan and the same title fetched via MAL v2 carrying different provider
values despite identical ids.

Surfaced by the MAL OAuth work, but it was latent in the original design.

### D30 — MAL needs a custom OAuth token exchange
MAL supports **only** `code_challenge_method=plain` for PKCE, where the challenge equals the
verifier. Better-Auth's `pkce: true` emits S256. The `genericOAuth` plugin explicitly
supports a custom `getToken`, which is the escape hatch.

Recorded because it is the single most likely thing in Phase 2 to consume an unplanned day,
and because "PKCE is standard" is exactly the assumption that would cause it to.

### D31 — Phases reordered; auth moves to third
Auth was Phase 6, deferred, because anonymous creation was the core. Under **D23** it becomes
a prerequisite for everything, so it moves to Phase 2. List import becomes Phase 7 and the
dashboard Phase 8 — the plan now runs Phase 0 through Phase 8, where it ran 0 through 6.

**Chosen:** the full schema still lands in Phase 1, before auth, so nothing migrates later.
List import ships *after* the share loop is validated, because that loop is the riskiest
untested assumption in the product and plain search is enough to prove it.

---

## The pre-code audit — 2026-08-09

D32–D36 came out of two audits of the blueprint against itself, run before any code was
written. They close gaps the pivot left rather than changing the product.

### D32 — The user's score format is a column on `user`, written at sign-in
*Closes a dependency the pivot created and nothing satisfied.*

**D28** made every surface render five score scales, and Phase 5's score input has to know
which one *this* user rates in before it can draw itself. The format lives at AniList's
`Viewer.mediaListOptions.scoreFormat` — which only Phase 7 was specified to read. So Phase 5
had a criterion (a `POINT_3` user sees smileys) that no earlier phase could satisfy, and the
obvious late fix — add the column in Phase 7 — is a migration against a populated `user`
table, which is the exact thing **D31** put the full schema in Phase 1 to avoid.

**Chosen:** `user.scoreFormat`, an `additionalFields` entry in `src/lib/auth.ts` so the
Better-Auth CLI emits it into the **first** migration (Phase 1), populated at sign-in
(Phase 2), read from the session (Phase 5), refreshed on every list fetch (Phase 7).
**Rejected:** fetching it live in Phase 5 — it puts a third-party call on the 10-second path
for a value that changes maybe twice a year.
**Default:** `POINT_10`, which is MAL's only scale and a reasonable guess for Google accounts
that have no tracker to ask.
**Revisit if:** a user links a second tracker whose format differs from the first — today
the most recent write wins, which is fine for one preference and would not be if it became
two.

### D33 — `/settings` ships minimal in Phase 2, expanded in Phase 8
Phase 2 required `linkSocial()` to work "from account settings" and Phase 8 owned the screen
— two phases apart, with no screen defined in `user-flow.md` at all. Left alone, Phase 2's
criterion 6 was unbuildable and a Google user could not reach a tracker until Phase 8, one
phase *after* list import shipped.

**Chosen:** Phase 2 builds `/settings` with exactly two capabilities — show linked providers,
link another. Phase 8 adds unlinking, the last-provider refusal, and the dashboard beside it.
**Why not defer it all:** D24 sells Google as "a deferral, not a dead end". Without a linking
screen it is a dead end, and the sign-in copy would be a lie.

### D34 — The create limiter keys on the user, not the IP
The 5/min limit was specified per IP back when creation was anonymous. Under **D23** every
`POST /api/recs` carries a session, so the accurate key is available and the IP key is now
wrong twice over: it throttles unrelated people behind one campus or carrier NAT, and it
means parsing a forwarded header whose leftmost value an attacker controls.

**Chosen:** `rec:create:${session.user.id}`, with the session check ordered before the
limiter so an anonymous request 401s rather than consuming a bucket. Account creation is
bounded by OAuth sign-up, not by this.
**Rejected:** a per-user *and* per-IP pair — two Upstash round-trips and two different 429s
to explain, for an abuse case that has to get past three OAuth providers first.
**Revisit if:** someone actually farms accounts to spam creation, which would argue for the
composite after all.

### D35 — `0` is "unrated", not a score
AniList and MAL both store `0` for every entry a user has not rated, so a plan-to-watch list
is mostly zeroes. Treating `0` as a rating would put `0/100` on the card of anyone importing
a backlog, and it makes invariant 8's "carries at least one score" a falsy-zero trap in Zod.

**Chosen:** every format floors at 1. An imported `0` stores as `(null, null)` — the item
still comes in, it just arrives unrated, which **D27** already allows. Enforced in Zod (per
format), by a `CHECK` on `scoreRaw > 0`, and by a score control with no zero position.
**Consequence worth noting:** no valid score is falsy, so `if (scoreRaw)` happens to be safe
— `code-standards.md` still requires `!= null`, because the next person will not know why.

### D36 — Ten items per recommendation, four at a time, eight seconds total
*Closes a capacity gap **D26** opened and nothing revisited.*

Grouping made server-side resolution fan out: one provider call per item, on a path where
**every user shares a single AniList bucket of 30/min**, because Vercel egresses from a small
pool of addresses. That is the constraint **D3** avoided for typeahead by running it in the
browser, and the create path cannot avoid it — **D13** requires the server to resolve, or
anyone could POST arbitrary text and imagery onto a Tsugi-branded card. Nothing capped N,
so one user's five allowed posts per minute could each have carried hundreds of items.

**Chosen:** 10 items maximum, 4 resolutions in flight, one 8-second deadline for the whole
request. Past the deadline: abort, **502**, write nothing — the same outcome the transaction
rule already defines, reached differently. Enforced in Zod (field-addressable 400) and in the
tray, which refuses an eleventh item rather than letting someone build a group the API will
reject.
**Why 10:** it covers "my top 10", which is the obvious thing to want to make, and a cold
10-item group is a third of the shared minute — survivable, and rare, because the 24-hour
resolution cache means popular titles cost no upstream call at all.
**Cost accepted:** a 25-title seasonal list is not expressible. That needs a progress state
rather than a spinner, and it is a different product surface.
**Revisit if:** real usage shows groups clustering at the cap, or if the cache hit rate makes
the shared bucket a non-issue in practice. Both are measurable once anything is deployed.

---

## The UI library change — 2026-08-09

### D37 — HeroUI replaces DaisyUI
*Requested by the owner, after the blueprint was closed a second time. Amends the client
brief's requirement 2 and execution step 2, and voids the DaisyUI half of **D1** and the
original answer to **Q3**.*

Verified before re-planning, by reading `@heroui/react@3.2.4` and `@heroui/styles@3.2.4`
from the published tarballs rather than the documentation site.

**What survives unchanged:** Tailwind 4, and the absence of `tailwind.config.ts` — HeroUI 3
declares `tailwindcss: >=4.0.0` as a hard peer, so **D1**'s conclusion was reached again by a
different route. The `night` decision (**Q3**) is void, because HeroUI has light and dark
rather than named themes; re-resolved to HeroUI's dark palette, unmodified, on the same
reasoning that picked `night` — no palette work on the critical path.

**What this actually costs.** DaisyUI is CSS classes on plain HTML: zero JavaScript, usable
inside Server Components. HeroUI is React Aria: 87 files carrying `"use client"`. The create
screen is the one timed surface in the product, so `code-standards.md`'s "Server Components
by default" moves from aspiration to load-bearing — a page that imports a `Button` at the top
level has become a client tree. **Phase 5 criterion 1 is what settles whether this is fine**,
and it is timed on every subsequent phase, so a regression cannot hide.

**What it buys, which is larger than it looks.** `ui-rules.md` previously hand-specified
`role="listbox"` with `aria-activedescendant`, radio-group arrow-key movement, modal focus
trapping and restoration, and live-region announcements. React Aria implements all of it.
Those rules survive as *requirements* rather than as instructions to build the mechanics, and
a requirement satisfied by the library is a requirement that stays true.

**Four findings from reading the package**, each of which would otherwise have cost time:
- **Five `react-aria` peers are not optional** — the package declares no
  `peerDependenciesMeta`, so all of them must be explicit dependencies or Phase 0's
  zero-peer-warnings criterion fails immediately.
- **No `@source` directive is needed**, contrary to every other Tailwind component library
  and to NextUI v2. HeroUI 3 emits semantic class names (`.button`, `data-slot`) and ships
  authored CSS resolved through `@apply` at import time — confirmed by grepping the compiled
  components for colour utilities and finding none. Adding a content path into
  `node_modules` would be cargo cult.
- **No provider component.** v3 dropped `HeroUIProvider`; the root export has none. The root
  layout stays a server component.
- **No `framer-motion`.** NextUI v2 required it. v3 does not, and adding it would be dead
  weight.

**The trap to expect:** DaisyUI class names emit **no CSS at all** under HeroUI rather than
erroring. `btn`, `bg-base-100`, and especially `bg-primary` — HeroUI's accent token is
`accent`, and there is no `primary` — all render unstyled elements while the build stays
green and the types stay clean. Named in `AGENTS.md`, and Phase 0 criterion 7 is what catches
it on the placeholder page.

**Revisit if:** the client bundle measurably threatens Phase 5 criterion 1, in which case
the answer is to shrink the client boundary rather than to change libraries again.

---

### D38 — Two HeroUI/Tailwind facts corrected against the installed package, Phase 0

*Found while implementing Phase 0, 2026-08-10 — not a product decision, a correction of two
unverified blueprint claims.*

**`Button` has no `color` prop.** `PHASE-0.md` criterion 7 specified `<Button
color="accent">`. Reading the installed `@heroui/react@3.2.4` (`button.d.ts`,
`button.styles.d.ts`) shows the prop is `variant`, with values `primary | secondary |
tertiary | outline | ghost | danger | danger-soft`. `variant="primary"` is the one that maps
`--button-bg` to `--accent` in `button.css` — it is a style-role name, not a colour name, and
it is the one that satisfies the criterion's intent. Corrected in code and in criterion 7.

**`@tailwindcss/postcss` and `postcss.config.mjs` were never in the version matrix or the
deliverables table, and Tailwind does not run without them.** `globals.css`'s one line —
`@import "@heroui/styles"`, which itself contains `@import "tailwindcss"` — compiled to a
**1-byte** stylesheet under Turbopack with no PostCSS plugin configured. `next build` and
`bun dev` both stayed green throughout, because nothing about a missing stylesheet is a type
or lint error. This is precisely the failure mode Phase 0's own risk table named ("Tailwind
4's CSS-first config is unfamiliar and silently produces an unstyled page") from a cause the
table never listed as a candidate.

**Chosen:** `@tailwindcss/postcss@4.3.3` as a dev dependency, `postcss.config.mjs` invoking
it. Verified fixed by refetching the built CSS chunk (415KB, real `--background`/`--accent`/
`--focus` declarations under `[data-theme="dark"]`) and by re-reading the served HTML for
`data-theme="dark"` and a `.button.button--primary` class on the placeholder button.
**Neither defect would have been caught by `tsc`, `eslint`, or `bun test`** — only a rendered
build inspected end to end catches a stylesheet that compiles to nothing. Recorded so a
future phase does not assume Phase 0's green CI proved the page is styled; criterion 7's
literal DOM/CSS inspection is what actually proved it.
**Revisit if:** never — this is closed by the fix, not a tradeoff with a condition to
reopen it.

## External prerequisites

| Needed by | Service | Status |
|---|---|---|
| Phase 0 | **GitHub remote** | ❌ criterion 12 observes CI running, which needs somewhere to push. The repository exists locally on `main`. |
| Phase 1 | Supabase project | ✅ **connected and verified** — PostgreSQL 17.6, `ap-southeast-2`. Both connection strings authenticate. `public` schema empty. |
| — | Supabase MCP server | ✅ authenticated, `.mcp.json` committed to the repo. See **D19**. |
| Phase 2 | **AniList OAuth app** | ❌ `anilist.co/settings/developer` |
| Phase 2 | **MyAnimeList OAuth app** | ❌ `myanimelist.net/apiconfig` — also supplies `X-MAL-CLIENT-ID` for Phase 7 |
| Phase 2 | **Google OAuth app** | ❌ — the fallback tier |
| Phase 4 | Upstash Redis | ❌ create before Phase 4 |
| Phase 6 | Vercel project | ❌ create before Phase 6 |

Phases 1, 3, 5, 7, and 8 need nothing external, and Phase 0 needs only a GitHub remote — a
five-minute job, not a blocker. **Phase 1 can run start to finish today; Phase 2 is the first
hard stop**, and it needs three OAuth registrations rather than one.

**Environment lives in `.env`, and only `.env`.** Not `.env.local` — Next.js loads that at
higher precedence, so having both means the file you edited can be silently overridden by
the one you forgot. `scripts/check-db-reachable.sh` warns if a second file appears.

## Open questions

| # | Question | Status |
|---|---|---|
| Q1 | Which external accounts exist? | ✅ **Resolved 2026-08-09** — Supabase only. See the table above. |
| Q2 | Is `tsugi.app` registered? | ✅ **Neutralised** — `NEXT_PUBLIC_APP_URL` is defined in Phase 0 and falls back to `VERCEL_URL`. Registering a domain is now a config change, not a code change. Still worth answering before Phase 6, where the link goes public. |
| Q3 | Custom palette or the library's own dark theme? | ✅ **Re-resolved 2026-08-09** — HeroUI's dark palette, unmodified. The original answer (DaisyUI `night`) was voided by **D37**; the reasoning was not, and it reached the same shape of answer. Single-token override syntax is recorded in `tech-stack.md`. |
| Q4 | Should the page and OG card show which source a rec came from? | ✅ **Resolved 2026-08-09** — page yes (credited and linked out), card no. |

**No open questions remain.** The blueprint is closed; Phase 0 can begin.

---

## Session log

Newest first. One entry per session: what changed, what was decided, what to pick up next.

### 2026-08-09 — Pre-code audit of the blueprint

Audited the whole context set against itself before Phase 0. **Re-verified every version
claim in `tech-stack.md` against the npm registry — all 15 packages match exactly**, and the
three load-bearing peer ranges hold (`better-auth` → `drizzle-orm ^0.45.2`, `drizzle-kit
>=0.31.4`, `next ^14||^15||^16`). All of `better-auth`'s peers are `optional: true`, so
Phase 0's zero-peer-warnings criterion is achievable.

Five defects that would have cost real time:

- **Phase 5 needed a score format nothing produced.** `POINT_3`-renders-as-smileys was a
  Phase 5 criterion, but the format was only read in Phase 7 and had no column anywhere. The
  late fix would have been a migration against a populated `user` table — the thing Phase 1
  exists to prevent. → **D32**
- **Nobody owned the Hono app.** Phase 2 mounted Better-Auth "inside the Hono app"; Phase 4
  created it, two phases later. → Phase 2 now builds it, with a criterion counting `route.ts`
  files.
- **Phase 2 criterion 11 was unsatisfiable** — it asserted `/r/[slug]` renders signed out,
  four phases before that route exists. → moved to Phase 6 criterion 25.
- **"A score is required to submit" survived the pivot in two places** (`PHASE-5.md`
  criterion 16, `ui-rules.md`), contradicting **D27**, invariant 8, and Phase 5's own
  criteria 6–7. → both corrected, with a risk row saying not to restore it.
- **`AGENTS.md` opened with the pre-pivot pitch** — "in under 10 seconds, without logging in"
  — nine lines above invariant 9. First thing read every session. → corrected.

Gaps closed: `/settings` had no owning phase (**D33**); the limiter still keyed on IP after
accounts became mandatory (**D34**); score `0` was undefined and both trackers use it for
*unrated* (**D35**); GitHub was an unlisted Phase 0 prerequisite; `/r/[slug]` was described
as cacheable while two criteria required per-request view counting.

Ten stale cross-references corrected from the D31 renumbering — D16, D18, D20 (said criteria
16–19, actually 22–25), D21 (said Phase 5, actually Phase 6), D22, plus `code-standards.md`,
`tech-stack.md`, `ui-registry.md`, and `PHASE-3.md`. `.env.example` had two wrong phase
headers and one surviving Discord mention. PostgreSQL's unique-violation code (`23505`) is
now recorded in Phase 1 where Phase 4 was told to find it.

**Next:** Phase 0, unchanged in shape. Add a GitHub remote first.

### 2026-08-09 — Second audit pass, against the packages rather than the documents

Re-ran the external verification instead of trusting the morning's dates, and read the
published tarballs of `drizzle-orm@0.45.2` and `better-auth@1.6.26` — `node_modules` does not
exist yet, so the "installed package outranks docs" rule had nothing to point at.

**Held up:** AniList `154587` / `idMal 52991`, `x-ratelimit-limit: 30`, CORS `*`; MAL v2
`403` without a client id and **no** `access-control-*` headers at all; `x.com/intent/post`
200 and `wa.me` 302; `.enableRLS()` present in 0.45.2 with `withRLS` absent.

**Three defects with source evidence:**

- **`numeric()` returns a string.** `pg-core/columns/numeric.d.ts` is generic over
  `'string' | 'number' | 'bigint'` and defaults to `'string'`. `scoreRaw` would have been
  `"87.0"` in TypeScript and in API JSON while Zod and `score.ts` expect a number — and it
  compiles either way. Now declared `numeric(4, 1, { mode: "number" })`, with Phase 1
  criterion 12 asserting `typeof === "number"`.
- **A repeat OAuth sign-in does not refresh the user row.** `dist/api/routes/callback.mjs`
  forwards `provider.options?.overrideUserInfoOnSignIn` and the update is gated on it. Phase
  2's criterion 12 (score format follows the user's preference) was unsatisfiable without
  `overrideUserInfo: true`; the flag is now named in the phase.
- **The Frieren assertion could not have passed.** AniList returns
  `Frieren: Beyond Journey’s End` with **U+2019**, not an ASCII apostrophe. Both phase files
  had the ASCII form, so a hand-typed test would fail and read as an adapter bug.

**Also:** Jikan re-measured at **6 consecutive 504s** — it fails in runs, not independently,
which makes D14's one-tap switch the primary path for MAL users and means fixture capture has
to be opportunistic. The synthesised email used `:`, invalid in an unquoted local part;
Better-Auth's OAuth path happens not to validate it (its `z.email()` calls are all on routes
we do not use), so it would have worked until anything else touched the address — changed to
`-` (**D25** amended). Sign-out had no home in any screen; it is now the one control at the
bottom of `/settings`. Two brief amendments were undocumented and re-proposable — the
per-user limiter key and view counting living in the page render — both now in PLAN.md.

**Decided:** **D36**, the item cap and resolution budget, which is the one thing here that
was a product question rather than a defect.

**Third pass — invariant coverage, links, and the brief.** Checked every invariant in
`AGENTS.md` for a phase criterion that actually verifies it. Thirteen of fifteen were
covered. Two were not:

- **Invariant 1 had no mechanical check anywhere.** "Database ids never appear in a URL, an
  API response, or rendered HTML" was stated once, as a note in a schema table, on a product
  whose read endpoint returns a row and its items to anonymous callers. A `select *` handed
  to `c.json()` would have leaked the group's `id` and the **owner's `userId`** to every
  reader of a shared link. Now Phase 4 criterion 18a (JSON shape) and Phase 6 criterion 19a
  (no uuid in the HTML).
- **The 120-character caption had no limit anywhere but the column.** Comments were enforced
  in all three layers; the caption only in Postgres. Added to Phase 4 criterion 15 and Phase
  5 criterion 15.

Also extended invariant 12's grep to `page.tsx` — it only ever checked `opengraph-image.tsx`,
though both take `params`. Verified every relative link across the 21 documents resolves,
every file in the read order exists, and `scripts/check-db-reachable.sh` does what the
tracker says. Re-read `ai-prompt.xml` in full and confirmed each of its seven requirements is
either implemented or has a decision withdrawing it.

**Fourth pass — the two largest phase specs, read end to end.** Three smaller things:
`ui-rules.md` required a confirmation for discarding the whole tray, a control no phase
builds — removed rather than invented, and `ConfirmDialog` is now delete-only. Four of Phase
5's criteria (4, 19, 21, 24) need Jikan to answer, which it often will not; they are now
marked as retryable rather than blocking, since a failure there is a finding about
MyAnimeList. And `rate_limited` had no UI treatment distinct from `unavailable`, though it is
the likeliest failure a heavy searcher meets and the *wrong* one to answer with "try the
other provider" — waiting fixes it, switching does not.

**The loop converged:** eleven findings in the first pass, seven in the second, three in the
third, three in the fourth, none of them structural. Remaining risk is concentrated where it
always was — MAL's `plain`-only PKCE (**D30**) and Satori's CSS subset — and neither is
knowable before the code exists.

**Next:** Phase 0. Still nothing blocking but the GitHub remote.

### 2026-08-09 — DaisyUI replaced by HeroUI

The owner changed the UI library outright. Verified `@heroui/react@3.2.4` and
`@heroui/styles@3.2.4` by reading the tarballs, then propagated through twelve files →
**D37**, with **D1** half-superseded and **Q3** re-resolved.

Tailwind 4 and the missing `tailwind.config.ts` both survived, since HeroUI hard-requires
Tailwind ≥4. What changed in kind rather than in name: every colour token
(`bg-base-100` → `bg-background`, and there is **no** `primary` — it is `accent`), the
composition rule (DaisyUI *classes* became HeroUI *components*), the accessibility section
(React Aria now provides the listbox, radio-group, and focus-management mechanics that were
previously specified by hand), and the RSC boundary (HeroUI components are client
components, so `"use client"` placement is now load-bearing).

Reading the package first paid for itself four times: the five `react-aria` peers are not
optional; no `@source` directive is needed, unlike every comparable library; there is no
provider in v3; and `framer-motion` is not a dependency. Each of those is a plausible wrong
assumption that would have cost a debugging session.

Phase 0's criteria 6 and 7 were rewritten around HeroUI, plus a new 7a for the focus ring —
the fastest signal that the stylesheet loaded. The OG card gained a warning that HeroUI's
palette is `oklch()`, which Satori cannot parse and renders as black.

**Next:** Phase 0, unchanged in shape. GitHub remote first.

### 2026-08-09 — Planning
- Read the client brief at `context/ai-prompt.xml`.
- Verified every proposed dependency against the npm registry, and called AniList and Jikan
  live. Findings recorded in [`tech-stack.md`](./tech-stack.md).
- Found four brief instructions that do not hold on current versions → decisions D1, D2, D5,
  D7. Found one that does not scale → D3.
- Resolved four forks with the user: Tailwind 4 + DaisyUI 5, Next 16.3, hybrid search, auth
  deferred with schema on day 1.
- Wrote `AGENTS.md`, `CLAUDE.md`, the `context/` set, and `planning/PLAN.md` +
  `PHASE-0`–`PHASE-6`.
- Indexed the repository into the codebase knowledge graph (33 nodes — essentially just the
  brief, since no source exists yet). **Re-index once Phase 0 lands.**

**Amendment later the same session — user clarified that the provider is user-selected:**
- Verified Jikan sends `Access-Control-Allow-Origin: *`, so both providers work from the
  browser → **D14** (toggle, default AniList, one-tap switch on failure).
- Verified the id spaces are disjoint (AniList 154587 / MAL 52991, and AniList 404s on
  52991) → **D15**. This **corrected a real bug in my own Phase 2 plan**, which had
  `resolveMedia` falling back across providers by id; it would have stored the wrong anime.
- Propagated through nine files: `AGENTS.md` (invariant 2), `tech-stack.md`,
  `architecture.md`, `functionality.md`, `user-flow.md`, `ui-registry.md`, `PHASE-1`
  (schema gains `provider`), `PHASE-2` (rewritten), `PHASE-3`, `PHASE-4`.

**Blueprint review before any code — same session:**
- Audited the plan for its own defects. Found six.
- **Contradiction:** Phase 1 required the Better-Auth CLI while excluding the config file it
  needs. Verified against the CLI's source (the docs assert the opposite) → **D18**.
- **Hole:** multiple exit criteria assumed a test harness that no phase created, and CI ran
  only two of three gates → **D16**.
- **Gap:** no local database plan → **D17**, develop against the real pooler.
- **Unverified claims closed:** DaisyUI custom-theme syntax (incl. the partial-override
  form), X and WhatsApp share intents. WhatsApp has **no `url` param** — the link must go
  inside `text`, and getting this wrong ships a share with no link in it.
- **Missing details pinned:** `NEXT_PUBLIC_APP_URL` defined in Phase 0 rather than
  discovered in Phase 5; the view counter specified as atomic SQL with a concurrency
  criterion; provider-toggle accessibility; the full environment contract table.
- Q1 and Q3 resolved, Q2 neutralised by the env var, Q4 still open.

**Supabase wired up — same session:**
- Supabase MCP added and authenticated → **D19** (writable, DDL banned by convention).
- Both connection strings authenticate: **PostgreSQL 17.6**, `ap-southeast-2`, `public`
  schema empty. Phase 1 is unblocked.
- Settled on **`.env` only**. A `.env` / `.env.local` pair briefly existed and the template
  placeholders were shadowing the real credentials — the check script now guards against it.
- Dropped `?pgbouncer=true` (a Prisma convention; postgres.js has no such option).
- **D8 amended.** `prepare: true` *succeeded* against port 6543. The decision stands, but
  the old justification ("queries fail without it") was wrong and is now corrected, so a
  future session doesn't read a passing test as licence to remove the setting.
- Recorded that Supabase's own `auth.*` tables exist and are unrelated to Better-Auth's
  `public.user`.
**Second pre-code review — deeper pass, same session:**
- **Found a security hole the brief never mentions.** Supabase's PostgREST is public, and
  `pg_default_acl` grants `anon` full write on every table created in `public`. The
  `recommendation` table would have been a writable public API bypassing rate limiting,
  validation, and D13's anti-defacement resolution — and later, Better-Auth's session
  tokens. → **D20**, RLS from the first migration, with a criterion that runs the actual
  attack rather than asserting the setting.
- Verified the RLS syntax against the installed package: `.enableRLS()` on 0.45.2. The docs
  site shows `pgTable.withRLS()`, which is **v1 only** and would not compile.
- **Edge runtime withdrawn** — `postgres.js` ships only a `workerd` build, and the OG route
  reads the database. Brief requirement 6 is not implementable. → **D21**
- `server-only` was mandated in `AGENTS.md` but missing from the dependency matrix; it is
  not a Next dependency, so every such import would have failed to resolve.
- Pinned the Hono adapter as `hono/vercel` (there is no `hono/next`).
- Test tiers settled → **D22**; Q4 resolved.
- **Next:** Phase 0. Nothing external blocks Phases 0–2, and no open questions remain.

**The pivot — same session, after the blueprint was closed:**
- The owner changed the product: accounts required, tracker-first sign-in (Discord was in
  this first pass and dropped hours later — see D24),
  grouped multi-title recommendations, list import, scores optional and preserved in the
  rater's own scale. → **D23–D31**.
- I pushed back once on required accounts — it narrows the audience to people who already
  hold a tracker account, not just adding friction — and the owner accepted that, adding
  Discord and Google as a way in. Recorded in D23 rather than left implicit.
- Verified before re-planning: Better-Auth's `genericOAuth` plugin; AniList OAuth endpoints
  and `MediaListCollection`; MAL v2's OAuth, `plain`-only PKCE, 1h/1mo token lifetimes,
  mandatory client id, and **complete absence of CORS**; the five AniList score formats; and
  that **neither tracker returns an email**, which forces synthesised addresses and manual
  account linking.
- Structural changes: 7 phases → 9, auth moved from last to third, `provider` renamed from
  the API vendor to the id space, invariants renumbered 11 → 15, schema split into
  `recommendation` + `recommendation_item`.
- **Amended within the same session:** Discord dropped as an OAuth provider, leaving
  AniList + MyAnimeList + Google (**D24**). Discord survives as a *share target* — a
  separate concern that was checked line by line before editing, since the word appears in
  both roles across nine files.
- Account linking confirmed as living in **profile/account settings**, which is what makes
  a Google sign-in a deferral rather than a dead end.
- **Next:** Phase 0 is unchanged and still ready. Phase 2 is the first hard stop.
