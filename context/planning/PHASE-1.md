# Phase 1 — Data layer

**Status:** Complete — 2026-08-10. Criterion 25 (Supabase advisor check) unverified, pending an MCP session — see [progress-tracker.md](../progress-tracker.md).
**User-visible output:** none
**Prerequisites:** Supabase project — **connected and verified** (2026-08-09), PostgreSQL
17.6, both connection strings authenticate, `public` schema empty.
**Before writing any schema:** load the `supabase-postgres-best-practices` skill. Schema,
migrations, and RLS are precisely its trigger.

## Scope

**In**
- `src/db/schema.ts` — `recommendation`, `recommendation_item`, and the Better-Auth tables
- `src/db/index.ts` — postgres.js client configured for the Supabase transaction pooler
- `src/lib/auth.ts` — **a minimal Better-Auth config**, required by the schema generator,
  carrying the one `additionalFields` entry the schema needs (**D32**)
- `drizzle.config.ts`
- **RLS enabled on every table**, including the four Better-Auth tables
- The first migration, generated and applied
- Tests covering the constraints, plus a script proving a row round-trips

The schema carries the **full** shape from day one — multi-item groups, preserved score
formats, and the token columns Phase 7 needs — even though nothing reads most of it until
Phase 5. That is the whole point of doing it now: none of it becomes a migration against
populated tables later.

**Explicitly out**
- Better-Auth *runtime* wiring: no providers, no Hono mount, no session handling, no client.
  Phase 2. (**D4**, **D18**)
- Query helpers and repository functions — they arrive with the routes that need them in
  Phase 4, where their shape is known.
- Seed data. There is nothing to seed; recommendations are user-generated.

## Deliverables

Two tables now, not one. A recommendation is a **container of 1..10 items** (**D26**, capped
by **D36**). The cap spans rows, so like invariant 8 it lives in Zod rather than a constraint.

`recommendation` — the group:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk, default random | Never exposed publicly — invariant 1 |
| `slug` | varchar(12), **unique, not null** | The only public identifier |
| `caption` | varchar(120), nullable | Optional name for a group |
| `comment` | varchar(280), nullable | The group-level take — *"AoT and Vinland Saga is my masterpiece"* |
| `views` | integer, not null, default 0 | |
| `userId` | text, **not null**, FK → `user.id` | **No longer nullable** — creation requires a session (**D23**) |
| `createdAt` | timestamp, not null, default now() | Database clock, never the application's |

`recommendation_item` — one row per title:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk, default random | |
| `recommendationId` | uuid, not null, FK → `recommendation.id` **on delete cascade** | |
| `position` | integer, not null | Explicit order; never rely on insertion order |
| `provider` | enum `anilist` \| `mal`, not null | The **id space**, not the API that answered (**D29**) |
| `externalId` | integer, not null | Meaningless without `provider`; the id spaces are disjoint |
| `mediaType` | enum `anime` \| `manga`, not null | |
| `title` | text, not null | Resolved server-side, never client-supplied |
| `coverImage` | text, nullable | Provider art is sometimes absent |
| `scoreRaw` | `numeric(4,1, { mode: "number" })`, **nullable** | The value as rated. Nullable — scores are optional (**D27**). The mode is not optional — see below |
| `scoreFormat` | enum, nullable | `POINT_100` \| `POINT_10_DECIMAL` \| `POINT_10` \| `POINT_5` \| `POINT_3` |
| `comment` | varchar(280), nullable | Per-item note |

Constraints that carry real meaning:

- `scoreRaw` and `scoreFormat` are **both null or both set**. A number without its scale is
  meaningless (invariant 6), so a `CHECK` enforces the pair.
- `scoreRaw > 0` when set. `0` is what both trackers store for *unrated*, so it is an
  absence, not a rating (**D35**). The per-format upper bound stays in Zod — it needs the
  format to evaluate — but the floor is cheap here and catches an import bug at the layer
  that cannot be bypassed.
- `unique (recommendationId, position)` — deterministic order.
- `unique (recommendationId, provider, externalId, mediaType)` — the same title cannot appear
  twice in one recommendation.
- `numeric(4, 1)` covers every scale: `100.0` down to `1.0`, with the one decimal place
  `POINT_10_DECIMAL` needs.
- **`{ mode: "number" }` is mandatory.** Verified by reading
  `drizzle-orm@0.45.2/pg-core/columns/numeric.d.ts`: `numeric()` is generic over
  `'string' | 'number' | 'bigint'` and **defaults to `'string'`**. Without the mode,
  `scoreRaw` is typed `string` — `"87.0"` in TypeScript, `"87.0"` in the API's JSON — while
  Zod validates a number and `src/lib/score.ts` formats one. The mismatch surfaces as a type
  error at best and a `"87.0"/100` on a social card at worst. `mode: "number"` is safe here
  because the whole range is 0.1–100.0 with one decimal, far inside float64's exact range.

**"A recommendation must say something"** (invariant 8) is *not* a database constraint. It
spans two tables and would need a trigger; Zod enforces it at the API boundary instead. This
is a deliberate exception to the three-layer rule, and the reason is written here so nobody
later "fixes" the missing constraint.

Indexes: unique on `slug`; index on `userId`; index on
`recommendation_item(provider, mediaType, externalId)` — the identity triple, in that order.

Auth tables — `user`, `session`, `account`, `verification` — are **generated by the
Better-Auth CLI**, not hand-written, then migrated with Drizzle Kit. `account` holds AniList
and MAL OAuth tokens from Phase 2, which is precisely why RLS on it is not paperwork.

`user` carries **one extra column beyond what Better-Auth generates by default**:

| Column | Type | Notes |
|---|---|---|
| `scoreFormat` | enum, not null, default `POINT_10` | The scale this user rates in. Declared as an `additionalFields` entry in `src/lib/auth.ts` so the CLI emits it (**D32**) |

It is unread until Phase 5 and unwritten until Phase 2, and it is here for the same reason
everything else is: adding it later means migrating a `user` table that already holds real
accounts. Syntax is recorded in `../tech-stack.md`.

## Key design decisions

**`prepare: false` is mandatory.** The Supabase transaction pooler on port 6543 does not
support prepared statements. Without this option queries fail in a way that reads like a
connection problem rather than a configuration one. Verified against Drizzle's Supabase
guide on 2026-08-09. (**D8**)

**Two connection strings.** The pooler (6543) serves the application; the direct connection
(5432) serves `drizzle-kit`, which needs session-level features the pooler does not provide.
`.env.example` documents both and says which is which.

**Auth tables land now, unused.** Phase 2 is one phase away, but generating them here keeps
schema work in the schema phase. (**D4**)

**`userId` is NOT NULL.** This is the single line where the pivot to required accounts
becomes structural: there is no anonymous path any more, and the database is what guarantees
it. A nullable `userId` would let one missing session check silently create orphan rows.
(**D23**)

**Scores are a pair, and the pair is enforced.** `scoreRaw` + `scoreFormat`, both null or
both set. Storing `8` without knowing whether the user rates out of 10 or out of 100 loses
the meaning irrecoverably, and no later migration can reconstruct it. (**D28**, invariant 6)

**A minimal `src/lib/auth.ts` is unavoidable here, and this corrects an earlier version of
this phase**, which excluded all Better-Auth configuration while requiring its CLI. The
CLI's own source aborts before it looks at `--adapter` if no config file exists — the
documentation claiming otherwise is wrong (evidence in `../tech-stack.md`). So this phase
creates the smallest config that satisfies the generator: the Drizzle adapter, the
`user.additionalFields` entry for `scoreFormat`, and nothing else. No providers, no secrets,
no mount. (**D18**, **D32**)

**The user's score format is a column, decided here rather than in Phase 5.** Phase 5 must
render a `POINT_3` user three smileys rather than a 1–10 strip, so it needs to know the
format *before* list import exists to fetch it. Nothing in Phases 1–5 would otherwise
produce that value. Storing it on `user` — written at sign-in in Phase 2, refreshed at
every list fetch in Phase 7 — is what keeps it off the create screen's critical path and out
of a later migration. (**D32**)

**Constraints are duplicated on purpose.** Comment length and the score pairing are enforced
in Zod, in the column, and in the UI. This contradicts DRY and is still correct: the database
is the only layer that cannot be bypassed, and the UI is the only layer the user experiences.
Invariants 6 and 7.

The one exception is invariant 8 — "a recommendation must say something" — which spans both
tables and lives only in Zod. Stated in the deliverables above so the gap is deliberate
rather than discovered.

**RLS goes on in the first migration, not later.** Supabase grants the public `anon` role
full read/write on every table created in `public` and serves it over PostgREST at a public
URL — evidence in `../tech-stack.md`. Without RLS, `recommendation` is a writable public API
that bypasses rate limiting, Zod validation, and server-side resolution, and the Better-Auth
tables would expose session tokens. Adding it later means shipping a window where the data
is public.

Use `.enableRLS()` — **not** `pgTable.withRLS()`, which is the v1 API and does not exist in
the version we are pinned to. No policies are defined: default-deny is exactly the intent,
and the `postgres` role owns the tables so the application bypasses RLS and is unaffected.
(**D20**)

**`id` is a uuid, and it never leaves the server.** A sequential integer id would leak the
total number of recommendations through any accidental exposure.

**`provider` is stored, and it is not decoration.** `externalId` alone cannot identify a
title: AniList's *Frieren* is `154587`, MyAnimeList's is `52991`, and each provider 404s on
the other's id. A row without `provider` cannot be re-resolved, and the wrong pairing would
render a different anime on someone's card. Invariant 2, decision **D15**.

## Exit criteria

1. `bun x drizzle-kit generate` produces a migration; the file is committed.
2. `bun x drizzle-kit migrate` applies cleanly against a fresh database.
3. Applying the migration **twice** is safe — the second run reports nothing to apply.
4. A script inserts a recommendation **with three items** and reads it back by `slug`, with
   every field matching, items in `position` order, `views` equal to `0`, and `createdAt`
   populated by the database.
5. A one-item recommendation round-trips identically. Single and group are the same model
   (**D26**).
6. Deleting a recommendation **cascades** to its items — no orphans remain.
7. Inserting a 281-character comment **fails** at the database, at both group and item level.
8. Inserting a duplicate `slug` fails with a unique-violation error the application can
   detect by code. **PostgreSQL raises `23505` (`unique_violation`)** — confirmed against the
   live database in `schema.db.test.ts`. **Corrected during implementation:** raw postgres.js
   surfaces it as `err.code`, but a query run through Drizzle's query builder or
   `db.execute()` throws a `DrizzleQueryError` wrapper — the real `PostgresError` and its
   `.code` live at **`err.cause.code`**, not `err.code` directly. Phase 4's slug-retry loop
   must match on `err.cause?.code === "23505"`, not `err.code`.
9. **Inserting with `userId = null` FAILS.** There is no anonymous path (**D23**). This
   criterion is the inverse of what it used to be; if it ever passes, the pivot has been
   silently undone.
10. `scoreRaw` set with `scoreFormat` null **fails**, and vice versa. Both or neither.
11. An item with **both** null inserts fine — scores are optional (**D27**).
12. `scoreRaw: 87, scoreFormat: POINT_100` and `scoreRaw: 8.7, scoreFormat:
    POINT_10_DECIMAL` both store exactly, with no rounding. The decimal survives, and the
    value read back is `typeof === "number"` — **not** the string `"87.0"`. That assertion is
    the one that catches a missing `{ mode: "number" }`.
13. The same `(provider, externalId, mediaType)` twice in **one** recommendation fails;
    in two different recommendations it succeeds.
14. Two items sharing `mediaType` and `externalId` but differing in `provider` both insert
    successfully. They are different titles, not a duplicate — nothing may treat the pair
    `(mediaType, externalId)` as unique.
15. Inserting a `provider` value outside `anilist` / `mal` fails at the database, and a
    `scoreFormat` outside the five AniList scales fails too.
16. `position` is unique within a recommendation — a duplicate fails.
17. The four Better-Auth tables exist after migration, verified by listing tables.
18. The Better-Auth CLI **runs to completion** — proving the minimal `src/lib/auth.ts` is
    sufficient. If it prints "No configuration file found", the config is the problem, not
    the flags.
19. `src/lib/auth.ts` references no provider and no secret:
    `grep -inE "anilist|myanimelist|clientId|secret" src/lib/auth.ts` returns
    nothing. Providers arrive in Phase 2.
20. `grep -rn "prepare" src/db/index.ts` shows `prepare: false`.
21. The connection actually goes through the pooler — `DATABASE_URL` contains `:6543`, and
    `DIRECT_URL` (used only by `drizzle.config.ts`) contains `:5432`.
22. **`rowsecurity` is true for every table we created**, verified by querying
    `pg_tables where schemaname = 'public'`. Not one exception — and `account` is the one
    that will hold AniList and MAL OAuth tokens. Invariant 14.
23. **The public REST endpoint cannot read the tables.** With the project's anon key:
    `curl "https://<ref>.supabase.co/rest/v1/recommendation?select=*" -H "apikey: <anon>"`
    returns an empty array or a permission error — **never** the row inserted in criterion 4.
    Repeat for `recommendation_item` and `account`. This is the criterion that proves the
    whole mitigation; `rowsecurity = true` alone is a proxy for it.
24. The same endpoint cannot **write**: a `POST` with an arbitrary payload does not create a
    row. Confirm the table count is unchanged.
25. Supabase's security advisors report no RLS findings after the migration
    (`get_advisors` with `type: "security"`).
26. **`scoreRaw: 0` fails**, at every format. `0` means unrated, not rated zero (**D35**).
27. **`user.scoreFormat` exists, is not null, and defaults to `POINT_10`** — insert a user
    without naming the column and read back `POINT_10`. A value outside the five scales
    fails. This is the column Phase 5 depends on (**D32**); if the CLI did not emit it, the
    `additionalFields` entry is missing from `src/lib/auth.ts`.
28. `bun x tsc --noEmit`, `bun x eslint .`, and `bun test` all exit 0.

Criteria 4–16, 22–25, and 26–27 are `bun test` cases against the live Supabase project,
written as `*.db.test.ts` so they skip themselves when `DATABASE_URL` is absent (**D22**).
They do not run in CI — **run them locally before every deploy**, because criteria 22–25
carry the RLS guarantees and a later migration is exactly what would break them.

Criterion 21 is what makes the rest meaningful: testing constraints through a direct
connection would not exercise `prepare: false`.

## Risks

| Risk | Mitigation |
|---|---|
| Missing `prepare: false`, discovered only under the pooler in production | Criteria 20 and 21 check it directly; development goes through the pooler URL, never a direct connection (**D17**) |
| Drizzle and Better-Auth version drift breaking the adapter's type inference | `tech-stack.md` records the peer-pinned pair. Do not upgrade one alone. |
| Hand-writing the auth tables and diverging from what Better-Auth expects | Criterion 17 checks existence; the tables must come from the CLI |
| Confusing Supabase's pre-existing `auth.users` with Better-Auth's `public.user` | Different systems, different schemas. Criterion 17 checks the **`public`** schema specifically. See `../tech-stack.md`. |
| The minimal auth config growing into real configuration ahead of Phase 2 | Criterion 19 greps for providers and secrets |
| A paused free-tier Supabase project making tests look like code failures | Wake the project first; noted in `../tech-stack.md` |
| **Shipping a table without RLS** — a writable public API bypassing every server-side guard | Criteria 22–25. Criterion 23 tests the actual attack rather than the setting |
| Using `pgTable.withRLS()` from the docs site, which does not exist in our pinned version | Criterion 28 catches it as a type error. The correct call is `.enableRLS()` |
| `user.scoreFormat` hand-added to the generated auth schema, then wiped by the next `generate` | It must be an `additionalFields` entry in `src/lib/auth.ts`, not an edit to the output. Criterion 27 checks the column; re-running the CLI is what would expose a hand-edit |
| `numeric()` left in its default string mode, making every score a string | Criterion 12 asserts `typeof === "number"`. The schema compiles either way, which is what makes this silent |
| RLS enabled but the app breaking because it cannot see its own rows | The `postgres` role owns the tables and bypasses RLS. Criterion 4 already proves a round-trip works |
| An enum change later requiring a painful Postgres migration | `mediaType` is closed at `anime`/`manga` by `functionality.md`. Widening it is a scope decision, not a schema tweak. |

**Next:** [`PHASE-2.md`](./PHASE-2.md)
