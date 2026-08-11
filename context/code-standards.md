# Code Standards

Project-specific rules. General TypeScript style is assumed, not restated.

## TypeScript

- `strict: true`. Also `noUncheckedIndexedAccess` — array and record access returns
  `T | undefined`, which is correct for provider payloads where fields go missing.
- No `any`. When a provider response is genuinely unknown, type it `unknown` and narrow it
  with a Zod schema. `any` in an adapter is how provider JSON leaks past the boundary.
- No `!` non-null assertions and no `@ts-ignore`. If the compiler is wrong, prove it with a
  type guard, not a suppression.
- Prefer `type` over `interface` unless declaration merging is actually needed.
- Exported functions carry explicit return types. Inference is fine internally; it is not
  fine across a module boundary where a change silently alters a contract.

## Module boundaries

- Every file under `src/server/**` and `src/db/**` starts with:
  ```ts
  import "server-only";
  ```
  **Except `src/db/schema.ts`, `src/db/auth-schema.ts`, and `src/db/enums.ts`.** Found in
  Phase 1: the `server-only` package throws unconditionally on a plain Node `require` — it
  is not a no-op that only activates under a bundler, as its name suggests. `drizzle-kit`
  loads schema files directly via Node to diff and generate migrations, so the guard makes
  `bun x drizzle-kit generate` fail every time, not just once. These three files are inert
  table/enum metadata with no secrets and no live connection, so the guard has nothing to
  protect there anyway. `src/db/index.ts` — the file that actually holds `DATABASE_URL` and
  opens a connection — keeps it; that is the one that matters.
- Imports use the `@/` alias for anything outside the current directory. No `../../..`.
- A module that both queries the database and renders JSX is always wrong. Split it.

## Validation

- One Zod schema per concept, in `src/lib/validators/`, imported by both the client form and
  the Hono route. Two schemas for the same payload will diverge, and the divergence will be
  a 400 the user cannot explain.
- Hono routes validate with `zValidator("json", schema)` — never `await c.req.json()`
  followed by manual checks.
- Parse at the edge, then trust the type inside. Do not re-validate in the service layer.

## Errors

- Adapters return a discriminated result, they do not throw for expected failures:
  ```ts
  type ProviderResult<T> =
    | { ok: true; data: T }
    | { ok: false; reason: "timeout" | "rate_limited" | "unavailable" | "not_found" };
  ```
  A Jikan 504 is an expected failure. Throwing for it means every caller needs a try/catch,
  and one missing catch takes down the create flow.
- Throw only for programmer error — a violated invariant, an impossible branch.
- Never surface a provider's error text to the user. Map to a project message.
- Log the provider, the reason, and the elapsed time on every provider failure and retry.
  Silent failures make "search feels slow" impossible to diagnose, and Jikan fails often
  enough that the log is the only way to tell its outages from ours.

## Async and network

- Every outbound `fetch` passes an `AbortSignal.timeout(ms)`. No exceptions — invariant 11.
- No unbounded `Promise.all` over user-supplied arrays.
- Fire-and-forget writes (the view counter) catch and swallow their own errors explicitly,
  with a comment saying why. An unhandled rejection there would crash a render.

## Database

- Query through Drizzle only. No raw SQL unless there is a comment explaining what Drizzle
  could not express.
- **A score is `(scoreRaw, scoreFormat)`, never a bare number.** `numeric(4, 1, { mode:
  "number" })` plus the format enum, both null or both set. Never store a normalised copy alongside them — a
  derived column drifts, and the whole point of **D28** is that the rater's own scale is the
  truth. Compute a comparable value when you actually need one.
- **`scoreRaw` is declared `numeric(4, 1, { mode: "number" })`.** Drizzle's `numeric()`
  defaults to `'string'` mode, which would make every score a string in TypeScript and in
  API JSON while Zod and `score.ts` expect a number. Verified against the installed package;
  detail in `tech-stack.md`.
- **`0` is not a score, it is "unrated".** Both trackers use it that way, so every format
  floors at 1 and a `0` arriving from an import stores as `(null, null)` (**D35**). Because
  no valid score is falsy, `if (scoreRaw)` is safe — but write `!= null` anyway; the next
  person will not know why it was safe.
- Format a score through **one** shared helper. Five formats × three surfaces is fifteen
  chances to print `2/3` for a smiley rating if each surface does its own thing.
- Timestamps are `timestamp` columns written by the database default, not by application
  clocks.
- Migrations are generated (`drizzle-kit generate`) and committed. Never edit a generated
  migration that has been applied anywhere.

## React and components

- Server Components by default. `"use client"` only where interaction actually lives, and as
  far down the tree as possible. Fetch above the boundary, pass plain data across it.
  **This got cheap again under shadcn (D41):** its primitives are plain functions, so using
  `Button` never forces a page into the client tree the way HeroUI (D37) did — `/sign-in`
  still prerenders as fully static proof of this. `/` itself moved to server-rendered-per-
  request on 2026-08-11 for an unrelated reason (it reads the session cookie to show
  "Settings" instead of "Sign in" — see the progress tracker), which is a **data-freshness**
  cost, not a client-JS one. Do not cite `/`'s route type as evidence either way about
  component-library client-boundary cost; `/sign-in` is the clean example now.
- No data fetching inside Client Components on the create path except the AniList typeahead,
  which is deliberate (see `architecture.md`).
- Component files: one component per file, named the same as the file.
- Props are explicit. No `{...rest}` spreading onto a DOM node without a stated reason.

## Tests

`bun test`, Bun's built-in runner. No framework dependency, no config file. (**D16**)

- Test files sit beside their subject as `*.test.ts`. There is no `__tests__` directory.
- **Scope: pure logic and API behaviour.** Adapters, normalisation, validators, slug
  generation, and route responses. Component rendering is not unit-tested — the UI criteria
  in Phase 5 are browser observations, and mocking React to assert on markup would test the
  mock.
### Four tiers

| Tier | Filename | Hits | Runs in CI |
|---|---|---|---|
| Unit | `*.test.ts` | nothing external | **yes** — the gate |
| Database | `*.db.test.ts` | live Supabase | no |
| Redis | `*.redis.test.ts` | live Upstash | no |
| Contract | `*.contract.test.ts` | live AniList / Jikan / MAL v2 | no |

Only the unit tier gates CI. The other three need credentials or third-party availability, and
a gate that goes red because a free-tier database paused overnight is a gate people learn to
ignore. (**D22**)

**The Redis tier, added Phase 4**, is the same shape as the db tier — gated on
`Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)`, a
plain `if` around the `describe()` call, never `describe.skip` — but named separately rather
than folded into `*.db.test.ts`, because "live Supabase" in that row is specific and Upstash
is a different kind of external dependency with its own credential pair and its own outage
mode. Rate limiting and caching (D9, and Phase 4's cache) are what live here.

**Exclusion is by runtime skip, not by CI configuration:**

```ts
const hasDb = Boolean(process.env.DATABASE_URL);
if (hasDb) {
  describe("recommendation constraints", () => { … });
}
```

CI has no `DATABASE_URL`, so these skip automatically. Locally Bun loads `.env`, so they run
without anyone remembering a flag. No filter arguments to keep in sync, and no way for a
test to be silently dropped by a typo'd glob.

**Use a plain `if`, not `describe.skip` — corrected in Phase 1 after it broke CI.** The
original form was `const describeDb = process.env.DATABASE_URL ? describe : describe.skip`.
Verified against Bun 1.3.14: `describe.skip` still **executes the block's
`beforeAll`/`afterAll`** — it only skips the `test()` bodies. Any db/contract-tier file whose
setup does something environment-sensitive (this project's does: a dynamic import of
`src/db/index.ts`, which carries `import "server-only"` and throws under a plain Bun require)
runs that setup anyway, even "skipped", which broke CI's plain `bun test` the first time this
tier was written. A plain `if` around the whole `describe(...)` call never registers the
block at all when there is nothing to connect to, which is the only thing that actually
prevents the setup from running.

- **Never call a live provider from a unit test.** AniList's 30/min budget is shared with the
  developer's own browser, and Jikan fails half the time — a suite that hits either is flaky
  by construction. Provider unit tests use recorded fixtures.
- Contract tests exist to check whether our *assumptions* still hold. When one fails, the fix
  is usually an update to `tech-stack.md`, not to the code.
- **Run the database tier before every deploy.** It carries the RLS guarantees (D20), and
  those are the ones with a security consequence if a later migration breaks them.

### The failure seam

Adapters take an injectable `fetch` defaulting to the global one:

```ts
export function createAniListClient(fetchImpl: typeof fetch = fetch) { … }
```

This is what makes "with the provider forced to fail" a test rather than a manual
experiment. It is a constructor parameter, never a runtime flag or an environment variable —
a production code path that can be told to fail is a production code path that eventually
will.

## Naming

- Slug variables are `slug`, never `id`. The distinction is an invariant and the naming
  should make a violation visible in review.
- Provider identifiers are `externalId` plus the `mediaType` that scopes it — an AniList id
  and a MAL id can collide numerically.

## Comments

- Comment the *why*, never the *what*. A comment restating the code is noise that will
  eventually contradict it.
- Every deviation from a rule in this file gets a one-line comment naming the reason.

Related: [`architecture.md`](./architecture.md) · [`tech-stack.md`](./tech-stack.md)
