# Phase 0 — Foundation & CI

**Status:** not started
**User-visible output:** none, by design
**Prerequisites:** none. Nothing external is required to complete this phase.

This phase settles what every later phase inherits. It exists so that the Tailwind 4
configuration, the environment contract, and the CI gate are decided once, correctly, rather
than improvised six files into Phase 5.

## Scope

**In**
- Next 16 App Router scaffold with TypeScript, Bun as package manager
- Tailwind 4 + DaisyUI 5 configured in CSS
- `next.config.ts` including `images.remotePatterns` for both provider CDNs
- ESLint flat config
- Environment variable contract: `.env.example` and a typed, validated accessor
- `.github/workflows/ci.yml` — typecheck and lint on push and PR to `main`
- `git init` and a first commit (the directory is not currently a repository)

**Explicitly out**
- Any database code — Phase 1
- Any component — Phase 5. A styled placeholder page is the *only* UI.
- Deployment to Vercel. CI proves the code is sound; shipping it is Phase 6's concern.
- A custom DaisyUI theme. The built-in `night` theme is the Phase 0 answer.

## Deliverables

| Artifact | Purpose |
|---|---|
| `package.json` | Bun scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `test`. Dependencies are exactly the version matrix in `../tech-stack.md` — including `server-only`, which Next does **not** provide and without which every `import "server-only"` fails to resolve. |
| `src/app/globals.css` | `@import "tailwindcss"` + `@plugin "daisyui"` |
| `src/app/layout.tsx` | Root layout, `data-theme="night"` on `<html>` |
| `src/app/page.tsx` | Placeholder proving the theme renders |
| `next.config.ts` | `images.remotePatterns` for `s4.anilist.co`, `cdn.myanimelist.net` |
| `eslint.config.mjs` | Flat config — Next 16 defaults to it |
| `tsconfig.json` | `strict`, `noUncheckedIndexedAccess`, `@/*` → `src/*` |
| `src/lib/env.ts` | Zod-validated environment access, fails loudly at startup |
| `src/lib/env.test.ts` | The first test — proves the harness runs in CI |
| `.env.example` | Every variable, documented, no values |
| `.github/workflows/ci.yml` | `oven-sh/setup-bun`, then typecheck → lint → test. **No database secrets** — the DB and contract tiers skip themselves when `DATABASE_URL` is absent (**D22**). |

### The environment contract

Naming these now, because later phases depend on them and discovering a missing variable in
Phase 6 means editing Phase 0's work.

| Variable | Needed by | Notes |
|---|---|---|
| `DATABASE_URL` | Phase 1 | Supabase **transaction pooler**, port 6543 |
| `DIRECT_URL` | Phase 1 | Supabase **direct** connection, port 5432 — `drizzle-kit` only |
| `NEXT_PUBLIC_APP_URL` | Phase 6 | Absolute base for `og:image`. Falls back to `VERCEL_URL`, then `http://localhost:3000` |
| `UPSTASH_REDIS_REST_URL` | Phase 4 | Optional in dev, required in production |
| `UPSTASH_REDIS_REST_TOKEN` | Phase 4 | Same |
| `BETTER_AUTH_SECRET` | Phase 2 | `openssl rand -base64 32` |
| `ANILIST_CLIENT_ID` / `_SECRET` | Phase 2 | `anilist.co/settings/developer` |
| `MAL_CLIENT_ID` / `_SECRET` | Phase 2 | `myanimelist.net/apiconfig`. The id is **also** sent as `X-MAL-CLIENT-ID` on every API v2 call in Phase 7 |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Phase 2 | |

Phase 0 defines and validates the first three. The rest are declared in `.env.example` with
a comment naming the phase that turns them on, so nobody has to guess whether a blank value
is a mistake.

## Key design decisions

**No `tailwind.config.ts` is created.** DaisyUI 5 deprecates it. Its absence is correct and
will look like an omission to anyone working from memory — hence its explicit mention in
`AGENTS.md` and `architecture.md`. (**D1**)

**CI calls ESLint directly.** `next lint` was removed in Next 16 and `next build` no longer
lints, so a pipeline that only builds would silently stop checking lint. (**D7**)

**Environment access is validated once, centrally.** `src/lib/env.ts` parses `process.env`
through Zod at module load. A missing `DATABASE_URL` should fail at startup with a readable
message, not at the first query with a driver error.

**Upstash is optional in development.** If `UPSTASH_REDIS_REST_URL` is absent, the limiter
falls back to an in-memory implementation and logs that it has done so. A contributor must
be able to run Tsugi locally with no third-party accounts; requiring a Redis signup to see
the homepage is friction the project does not need. The fallback is
**development-only** — Phase 4 makes its absence a hard failure when `NODE_ENV=production`.
(**D9**)

**`night` is the theme, unmodified.** Built-in, dark, saturated accent — it satisfies the
brief's "dark theme with vibrant accents" without putting a palette on the critical path.
Custom-theme syntax is verified and recorded in `../tech-stack.md` should that change.

**The test harness ships in Phase 0, before anything needs testing.** `bun test` is built
into Bun, so this costs one script line and one trivial test — but adding it later means
retrofitting a CI step and an injectable-fetch seam across code that was written without
one. The first test asserts that `src/lib/env.ts` rejects a missing variable, which is
worth having on its own. (**D16**)

**The base URL is an environment variable from day one.** `NEXT_PUBLIC_APP_URL` exists in
Phase 0 even though nothing reads it until Phase 6, because `og:image` must be absolute and
the domain is still unsettled (**Q2**). With the variable in place, registering a domain
later is a configuration change rather than a code change.

## Exit criteria

Each is a command with an unambiguous pass.

1. `bun install` completes with **zero peer-dependency warnings**, and every package in
   `../tech-stack.md`'s matrix is present at the stated version.
2. `bun x tsc --noEmit` exits 0.
3. `bun x eslint .` exits 0 with zero warnings.
4. `bun test` runs and reports at least one passing test.
5. `bun run build` exits 0.
6. `bun dev` serves `/`, and the page renders with `night` colours: computed
   `background-color` of `<body>` is a dark value, **not** `#ffffff`.
7. A `<button class="btn btn-primary">` on the placeholder page renders with DaisyUI's
   primary colour — proving the plugin loaded, not merely that Tailwind did.
8. **No file named `tailwind.config.*` exists**: `find . -name 'tailwind.config.*' -not -path './node_modules/*'` returns nothing.
9. Deleting `DATABASE_URL` from `.env` makes `bun run build` fail with a message naming
   `DATABASE_URL`.
10. `bun test` covers that same case — the env module rejects a missing variable — so the
    guarantee survives without anyone editing `.env` by hand.
11. `.env.example` lists **every** variable in the environment-contract table above,
    including the later-phase ones, each with a comment naming its phase.
12. CI runs on a pushed branch and passes, showing **three** gate steps. A commit
    introducing a deliberate type error fails it; so does one introducing a failing test.
    Confirm both once, then revert.
13. `git log` shows at least one commit; `node_modules`, `.next`, and `.env*` (except
    `.env.example`) are ignored.

## Risks

| Risk | Mitigation |
|---|---|
| Tailwind 4's CSS-first config is unfamiliar and silently produces an unstyled page | Criterion 7 tests a *DaisyUI* class specifically. A page can look fine with Tailwind loaded and DaisyUI missing. |
| An agent "fixes" the missing `tailwind.config.ts` | Stated in three places: `AGENTS.md`, `architecture.md`, and criterion 8 |
| Bun and Next 16 disagreeing on some binary under linux/aarch64 | Surfaces at criterion 5. If it does, record the finding in `tech-stack.md` before working around it. |
| CI passing because it silently skipped a step | Criterion 12 requires observing **two** failures — a type error and a failing test — not just a pass |

**Next:** [`PHASE-1.md`](./PHASE-1.md)
