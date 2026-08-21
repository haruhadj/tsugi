# Phase 0 — Foundation & CI

> ⚠️ **Historical record. Superseded in part by [D41](../progress-tracker.md), 2026-08-11.**
> This phase was completed on HeroUI, which has since been replaced by shadcn/ui. Everything
> below about `@heroui/styles`, the five `react-aria` peers, the one-line `globals.css`, the
> forbidden `@import "tailwindcss"`, `data-theme="dark"`, and criterion 7's HeroUI `Button`
> describes what was built then, not what is true now. **Do not use this file to re-derive
> the current setup** — `../tech-stack.md` and `../ui-tokens.md` are authoritative.
>
> What survives verbatim: Tailwind 4, no `tailwind.config.ts`, and the
> `@tailwindcss/postcss` + `postcss.config.mjs` requirement, which is still the failure that
> silently produces a 1-byte stylesheet with a green build.

**Status:** not started
**User-visible output:** none, by design
**Prerequisites:** a **GitHub remote**, for criterion 12 only — CI cannot be observed running
without somewhere to push. Everything else in this phase is local.

This phase settles what every later phase inherits. It exists so that the Tailwind 4
configuration, the environment contract, and the CI gate are decided once, correctly, rather
than improvised six files into Phase 5.

## Scope

**In**
- Next 16 App Router scaffold with TypeScript, Bun as package manager
- Tailwind 4 + HeroUI 3 configured in CSS
- `next.config.ts` including `images.remotePatterns` for both provider CDNs
- ESLint flat config
- Environment variable contract: `.env.example` and a typed, validated accessor
- `.github/workflows/ci.yml` — typecheck, lint, and test on push and PR to `main`
- A GitHub remote and a pushed `main`, so CI can actually be observed running

**Explicitly out**
- Any database code — Phase 1
- Any component — Phase 5. A styled placeholder page is the *only* UI.
- Deployment to Vercel. CI proves the code is sound; shipping it is Phase 6's concern.
- A custom palette. HeroUI's dark theme, unmodified, is the Phase 0 answer (**D37**).

## Deliverables

| Artifact | Purpose |
|---|---|
| `package.json` | Bun scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `test`. Dependencies are exactly the version matrix in `../tech-stack.md` — including `server-only`, which Next does **not** provide, and **all five `react-aria` peers**, which HeroUI declares as required rather than optional. |
| `src/app/globals.css` | Exactly `@import "@heroui/styles";` — it pulls in Tailwind itself, so **do not** also import `tailwindcss` |
| `src/app/layout.tsx` | Root layout, `data-theme="dark"` on `<html>`. No provider — HeroUI 3 needs none |
| `src/app/page.tsx` | Placeholder proving the theme renders |
| `next.config.ts` | `images.remotePatterns` for `s4.anilist.co`, `cdn.myanimelist.net` |
| `postcss.config.mjs` | `{ plugins: { "@tailwindcss/postcss": {} } }` — **without this, `@import "@heroui/styles"` compiles to an empty stylesheet under Turbopack**, found during implementation; see `tech-stack.md` |
| `eslint.config.mjs` | Flat config — Next 16 defaults to it. `eslint-config-next@16.3.0` ships pre-flattened arrays (`eslint-config-next/core-web-vitals`); do not wrap it in `FlatCompat`, which is for legacy shareable configs and throws on an already-flat array |
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

Phase 0 defines and validates the first three. The rest are declared in `.env.example` with
a comment naming the phase that turns them on, so nobody has to guess whether a blank value
is a mistake.

## Key design decisions

**No `tailwind.config.ts` is created.** Tailwind 4 configures in CSS. Its absence is correct
and will look like an omission to anyone working from memory — hence its explicit mention in
`AGENTS.md` and `architecture.md`. (**D1**)

**HeroUI needs no content configuration, and that will feel wrong.** Every other Tailwind
component library requires a content path into `node_modules`, because they emit utility
strings the scanner has to find. HeroUI 3 emits semantic class names and ships its own
compiled CSS, so there is nothing to point at — verified, evidence in `../tech-stack.md`.
Do not add an `@source` directive to "fix" styling; if components render unstyled, the cause
is the import line, not the scanner. (**D37**)

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

**HeroUI's dark palette, unmodified.** A near-black ground (`oklch(12% 0.005 285.823)`) with
a saturated blue accent (`oklch(62.04% 0.195 253.83)`) — which satisfies the brief's "dark
theme with vibrant accents" without putting a palette on the critical path. This is the same
reasoning that previously chose DaisyUI's `night`, reaching the same answer through a
different library. Overriding a single token later is one line; the syntax is recorded in
`../tech-stack.md`. (**Q3**, re-resolved by **D37**)

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
   `../tech-stack.md`'s matrix is present at the stated version. HeroUI's five `react-aria`
   peers are the ones most likely to be missed — they are **not** optional, so a warning here
   is a real missing dependency and not noise to be waved through.
2. `bun x tsc --noEmit` exits 0.
3. `bun x eslint .` exits 0 with zero warnings.
4. `bun test` runs and reports at least one passing test.
5. `bun run build` exits 0.
6. `bun dev` serves `/`, and the page renders dark: computed `background-color` of `<body>`
   resolves from `--background`, a near-black value — **not** `#ffffff`. A white page means
   `data-theme="dark"` is missing from `<html>`.
7. A HeroUI `<Button variant="primary">` on the placeholder page renders **as a styled
   button** — filled, rounded, with a hover state — not as unstyled default-browser text.
   This proves `@heroui/styles` loaded, not merely that Tailwind did. Inspect it: the
   element should carry `.button` and `.button--primary` classes, and `.button--primary`
   should resolve `--button-bg` to `var(--accent)` in the cascade.
   > **Corrected during Phase 0 implementation, 2026-08-10:** the installed
   > `@heroui/react@3.2.4` `Button` has no `color` prop — verified by reading
   > `button.d.ts`/`button.styles.d.ts`. The accent-filled look is `variant="primary"`,
   > which maps `--button-bg` to `--accent` in `button.css`. The blueprint's `color="accent"`
   > was never checked against the package; this criterion is the corrected version.
7a. Keyboard-focus that button: it shows a visible focus ring drawn from `--focus`. React
   Aria supplies the behaviour, so a missing ring means the stylesheet did not load rather
   than that focus handling was forgotten.
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
13. `node_modules`, `.next`, and `.env*` (except `.env.example`) are ignored, confirmed with
    `git status --porcelain` after a build: nothing generated appears as untracked.

The repository itself already exists — `git init` was done ahead of this phase, the branch is
`main`, and the context set is committed. What Phase 0 adds is the remote and the workflow.

## Risks

| Risk | Mitigation |
|---|---|
| Tailwind 4's CSS-first config is unfamiliar and silently produces an unstyled page | Criterion 7 tests a *HeroUI component* specifically. A page can look fine with Tailwind loaded and `@heroui/styles` missing. |
| An agent "fixes" the missing `tailwind.config.ts` | Stated in three places: `AGENTS.md`, `architecture.md`, and criterion 8 |
| `@import "tailwindcss"` added alongside `@import "@heroui/styles"` | A double import that reorders the cascade. The deliverables table says "exactly" one line; criterion 7 is what would surface the damage |
| An `@source` directive added to make node_modules scanning work | Unnecessary here and stated as a design decision. HeroUI emits semantic classes, not utilities |
| DaisyUI class names surviving in a copied snippet — `btn`, `bg-base-100`, `bg-primary` | They emit **no CSS at all** rather than erroring, so the element renders unstyled and the build stays green. Criterion 7 catches it on the placeholder; `AGENTS.md` names the trap |
| Bun and Next 16 disagreeing on some binary under linux/aarch64 | Surfaces at criterion 5. If it does, record the finding in `tech-stack.md` before working around it. |
| CI passing because it silently skipped a step | Criterion 12 requires observing **two** failures — a type error and a failing test — not just a pass |

**Next:** [`PHASE-1.md`](./PHASE-1.md)
