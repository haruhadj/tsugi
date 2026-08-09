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
  far down the tree as possible. **HeroUI made this rule load-bearing rather than aspirational
  (D37):** its components are client components, so importing one into a page turns that page
  into a client tree. Fetch above the boundary, pass plain data across it.
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
### Three tiers

| Tier | Filename | Hits | Runs in CI |
|---|---|---|---|
| Unit | `*.test.ts` | nothing external | **yes** — the gate |
| Database | `*.db.test.ts` | live Supabase | no |
| Contract | `*.contract.test.ts` | live AniList / Jikan / MAL v2 | no |

Only the unit tier gates CI. The other two need credentials or third-party availability, and
a gate that goes red because a free-tier database paused overnight is a gate people learn to
ignore. (**D22**)

**Exclusion is by runtime skip, not by CI configuration:**

```ts
const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
describeDb("recommendation constraints", () => { … });
```

CI has no `DATABASE_URL`, so these skip automatically. Locally Bun loads `.env`, so they run
without anyone remembering a flag. No filter arguments to keep in sync, and no way for a
test to be silently dropped by a typo'd glob.

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
