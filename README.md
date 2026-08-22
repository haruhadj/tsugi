# Tsugi (次)

Fast anime/manga recommendation sharing. Sign in, pick one title or several, score them, and
get a shareable link with a rich social preview — in under 10 seconds. Anyone can open that
link; only creating needs an account.

Live at [tsugi-lyart.vercel.app](https://tsugi-lyart.vercel.app).

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **Hono** for the `/api` surface, validated with `@hono/zod-validator` + **Zod 4**
- **Drizzle ORM** + **Postgres** (Supabase), accessed only from `src/db` and `src/server`
- **Better-Auth**, with AniList and MAL as OAuth providers
- **shadcn/ui** + **Radix** + **Tailwind CSS 4**
- **Upstash Redis** for rate limiting and list caching
- Media pulled from **AniList** (GraphQL) and **MyAnimeList** (Jikan + official API v2)

## Getting started

```bash
bun install
cp .env.example .env   # fill in the values — see comments in the file for where each comes from
bun x drizzle-kit migrate
bun dev
```

Requires a Supabase Postgres database and, for full functionality, AniList/MAL OAuth apps and
an Upstash Redis instance. `.env.example` documents every variable and which phase of the
build introduced it.

## Scripts

| Command | What it does |
|---|---|
| `bun dev` | Dev server on port 3000 |
| `bun run build` | Production build |
| `bun run start` | Serve a production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun test` | Full test suite (`--conditions=react-server`) |

## Project docs

This repo is documented for both humans and agents working in it. Start at
**[AGENTS.md](./AGENTS.md)** — it's the entry point into `context/`, which holds the
architecture, tech stack, UI system, phase specs, and decision log behind the product as it
actually is today.
