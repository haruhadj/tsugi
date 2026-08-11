# Tsugi (次) — Agent Entry Point

Fast anime/manga recommendation sharing. A signed-in user picks one title or several, scores
them, and gets a shareable link with a rich social preview — in under 10 seconds. **Anyone
can open that link; only creating needs an account** (**D23**).

**Read this file first, every session.** It is the index and the rulebook.

---

## 1. Read order

Read these in order at the start of a session. Stop when you have what the task needs.

| # | File | What it gives you |
|---|------|-------------------|
| 1 | `context/progress-tracker.md` | Current phase, decision log, session log. **Always read this.** |
| 2 | `context/planning/PHASE-N.md` | The spec for the phase named in the tracker. Only that one. |
| 3 | `context/functionality.md` | What is in scope and what is deliberately out, with reasons |
| 4 | `context/architecture.md` | Folders, layers, dependency rules, request paths |
| 5 | `context/tech-stack.md` | Versions, verification dates, per-library rules |
| 6 | `context/code-standards.md` | TypeScript and project code rules |
| 7 | `context/ui-registry.md` | What components already exist — read before building any UI |
| 8 | `context/ui-tokens.md` + `context/ui-rules.md` | Visual values and UI behaviour |
| 9 | `context/user-flow.md` | Every screen and the paths between them |
| 10 | `context/planning/PLAN.md` | Phase map and the reasoning behind the shape of the build |

`context/ai-prompt.xml` is the **original client brief**. It is a historical record, not a
specification. Several of its claims are factually wrong on current package versions — see
the amendments in `context/progress-tracker.md`. When the brief and this context set
disagree, **this context set wins.**

---

## 2. Invariants

These hold in every phase. A violation is a bug regardless of what you were working on.

1. **Slugs are the only public identifier.** Database ids never appear in a URL, an API
   response, or rendered HTML.
2. **Provider JSON never escapes its adapter, and the provider is part of identity.**
   Provider shapes convert to `UnifiedMediaResult` (`src/lib/types/media.ts`) at the
   boundary. Media is identified by the triple **`(provider, mediaType, externalId)`** —
   never by id alone. The id spaces are disjoint: AniList's *Frieren* is `154587`, MAL's is
   `52991`, and AniList returns 404 for `52991`. **Never resolve an id against a provider
   that did not issue it** — it returns a different title, or nothing.

   `provider` names the **id space** — `anilist` | `mal` — not the API that answered. Jikan
   and the official MAL API v2 both return MAL ids, so both are transports for `mal`.
3. **The ORM never escapes the server.** `src/db` may only be imported by `src/db/**` and
   `src/server/**`. A component importing Drizzle is always wrong.
4. **Every API input is validated at the Hono boundary** with `@hono/zod-validator` and a
   schema from `src/lib/validators/`. No hand-rolled `c.req.json()` parsing.
5. **Every visual value comes from a shadcn semantic token** (`bg-background`,
   `text-foreground`, `bg-primary`, `text-bloom`, …). No raw hex, no `rgb()`, no arbitrary
   values like `bg-[#0B0A14]` in components. The palette is authored **once**, in
   `src/app/globals.css`, and nowhere else (**D41**, which reversed **D37**). The accent is
   `primary`; `bloom` is the cyan punctuation and gets **one use per screen**. Note this is
   the inverse of the HeroUI-era rule — under HeroUI there was no `primary` token at all.
6. **A score is a `(raw, format)` pair, never a bare number.** The five AniList scales —
   `POINT_100`, `POINT_10_DECIMAL`, `POINT_10`, `POINT_5`, `POINT_3` — are preserved as the
   user rated them; MAL is `POINT_10`. A number without its format is meaningless: `5` could
   be 5/100, 5/10, or 5/5. Never render, compare, or store one alone. `POINT_3` is smileys,
   not a number — it has no numeric rendering. **`0` is not a score**: both trackers use it
   to mean *unrated*, so every format floors at 1 and an imported `0` stores as `(null,
   null)` (**D35**).

   The format a user rates in lives on `user.scoreFormat`, written at sign-in and refreshed
   on every list fetch. Read it from the session — never re-derive it per surface (**D32**).
7. **Comments are ≤280 characters**, at both group and item level. Enforced in three places
   — the Zod schema, the database column, and the input control. All three, every time.
8. **A recommendation must say something**: at least one score *or* one comment, at group or
   item level. An empty rec is not a recommendation.
9. **Creating requires a session. Viewing never does.** Every write path checks the session;
   `/r/[slug]` and its OG image must stay open to anonymous visitors, or the product has no
   distribution.
10. **Provider access tokens never reach the client.** AniList and MAL tokens live in the
    `account` table and are read server-side only. They are never returned by an API route,
    never embedded in HTML, never logged.
11. **Nothing without a timeout blocks the create flow.** Every outbound call to AniList,
    Jikan, or MAL v2 has an explicit timeout and a defined failure behaviour.
12. **`params` and `searchParams` are always `await`ed.** Next 16 removed synchronous
    access, including in `opengraph-image`.
13. **Public reads must not require the database to be writable.** View counting is
    fire-and-forget and may never block or fail a page render.
14. **Every table we create has RLS enabled.** Supabase grants the public `anon` role full
    `INSERT/SELECT/UPDATE/DELETE/TRUNCATE` on any table created in `public`, and exposes it
    through PostgREST at a public URL. A table without RLS is a writable public API that
    bypasses our rate limiting, validation, and server-side resolution entirely. No
    exceptions — the Better-Auth tables hold session **and OAuth provider** tokens.
15. **Anything that touches the database runs on the Node runtime.** `postgres.js` needs
    TCP; Vercel's Edge Runtime has none. Never add `export const runtime = "edge"` to a
    route that reads or writes the database — including `opengraph-image`.

---

## 3. Rules that never change

**Process**
- Never build ahead of the current phase. If a task is not in the current `PHASE-N.md`,
  raise it and let the user decide — do not absorb it. "While I'm in here" is how scope dies.
- Never state a version, API signature, or package fact from memory. Verify it
  (`npm view <pkg> version peerDependencies`, or read `node_modules/<pkg>`), then record the
  claim and the date in `context/tech-stack.md`.
- The installed package outranks any documentation site. Docs lag releases.
- When you discover a recorded fact is wrong, fix it **everywhere it was written** and note
  the correction in the decision log.

**Code**
- TypeScript strict. No `any`, no non-null `!` assertions, no `@ts-ignore`.
- Server-only modules start with `import "server-only"`.
- Every phase's mechanically-checkable exit criteria become `bun test` cases in that same
  phase. A criterion that could be a test and is left as a manual checklist item will stop
  being checked by phase 3.
- No secret is ever referenced outside `src/server/**` or `src/db/**`. Only
  `NEXT_PUBLIC_`-prefixed variables may appear in client code.

**UI**
- Check `context/ui-registry.md` before building a component. If it exists, use it.
- Register a new component in the same change that creates it. Not later.
- shadcn components first (`bun x shadcn add <name>` — do not hand-write one that the
  registry ships); Tailwind utilities for layout, spacing, and type.
- **shadcn components are ours once added.** They land as source in `src/components/ui/`
  and are edited in place, not wrapped to override them.
- Most shadcn primitives are plain function components and work inside Server Components.
  Only add `"use client"` where a hook or an event handler actually needs it — and to the
  smallest thing, or a page becomes a client tree by accident.

**Supabase skills are installed** in `.agents/skills/` (208K, committed). Load
`supabase-postgres-best-practices` **before** any schema, migration, RLS, or index work —
that is its stated trigger, and Phase 1 is exactly the case it exists for.

**The Supabase MCP**
- It is configured with **write access**. Treat it as read-only anyway.
- **Never issue DDL through it** — no `CREATE`, `ALTER`, or `DROP` on any table. Schema
  changes go through `drizzle-kit generate` + `migrate` so that a migration file lands in
  git. A schema change made through the MCP leaves no trace in the repository, and the next
  `drizzle-kit generate` will produce a diff nobody can explain.
- Use it for what it is good at: inspecting schema, reading rows, checking logs, and docs.
- Data writes (seeding, fixing a bad row) are fine when asked for. Say what you changed.

**Libraries**
- Do not add a dependency that is not in `context/tech-stack.md`. Propose it first,
  with what it replaces and why the platform cannot do it.
- `@vercel/og` is **not** a dependency of this project. Use `next/og`.
- There is **no `tailwind.config.ts`**. Tailwind 4 is configured in CSS.
- **Neither DaisyUI nor HeroUI is in this project.** DaisyUI was replaced by HeroUI
  (**D37**), and HeroUI by shadcn/ui (**D41**). `btn`, `bg-base-100`,
  `data-theme="night"` are DaisyUI leftovers; `@heroui/*` imports, `isPending`,
  `onPress`, `isDisabled`, and `bg-accent`-as-the-accent are HeroUI leftovers. Two dead
  stacks means two vocabularies that look plausible and render nothing.
- `globals.css` **does** `@import "tailwindcss"` now, and must — nothing else pulls Tailwind
  in since `@heroui/styles` left. Under HeroUI that same import was a double-import bug.
  The file is also the only place the palette exists.

---

## 4. Session workflow

**At the start**
1. Read `context/progress-tracker.md` → note the current phase.
2. Read that phase's `context/planning/PHASE-N.md` → note the exit criteria.
3. Read `context/ui-registry.md` if the task touches UI.

**While working**
- Work only toward the current phase's exit criteria.
- If you hit a decision that outlives this session, add it to the decision log with its
  reasoning and a `Revisit if:` condition.

**At the end — not optional, not "when convenient"**
1. Update `context/progress-tracker.md`: phase status, session log entry, any new decisions.
2. Update `context/ui-registry.md` if you added or changed a component.
3. Update `context/tech-stack.md` if you verified or changed a version.

A registry that is a week stale is worse than no registry, because it is trusted and wrong.

---

## 5. Commands

```bash
bun install
bun dev                  # Next 16 — Turbopack is the default, no flag needed
bun run build
bun x tsc --noEmit       # type gate
bun x eslint .           # `next lint` was REMOVED in Next 16 — call ESLint directly
bun test --conditions=react-server   # built into Bun — the CI gate; --conditions is load-bearing, see below
bun x drizzle-kit generate
bun x drizzle-kit migrate
```

**The gate is all three:** `tsc --noEmit`, `eslint .`, `bun test --conditions=react-server`.
CI runs them in that order. A phase is not finished until all three pass.

**Always run tests with `--conditions=react-server`, everywhere, every time.** Any module
carrying `import "server-only"` (`src/db/index.ts`, `src/lib/auth.ts`) throws unconditionally
under a plain Bun/Node require — that package only resolves to a no-op under the
`react-server` export condition, which Next's bundler sets automatically and Bun does not
unless told to. `bun test` bypasses `package.json` scripts entirely (it is a Bun subcommand,
not `bun run <script>`), so the flag has to be on the literal command line in CI, in
`package.json`'s `"test"` entry, and in anyone's fingers — there is no single place that
covers all invocations. The db tier's `describe(...)` calls also sit behind a plain
`if (hasDb)`, not `describe.skip` — see `code-standards.md` for why `describe.skip` does not
actually skip a Bun test block's setup.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
