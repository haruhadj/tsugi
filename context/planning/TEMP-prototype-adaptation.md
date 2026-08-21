# Adapt the AI Studio prototype's builder page and UI system into Tsugi

> **This is a living, tickable tracker**, not a phase spec. Every `[ ]` below is checked off in
> the same commit as the work it describes, so the file always states what is actually done.
>
> The `TEMP-` prefix marks it as scaffolding: it is **deleted** once Part 7 (docs) lands and the
> decisions live in `progress-tracker.md`, which is the permanent record. It is deliberately
> **not** added to `AGENTS.md`'s read order — a temp file that outlives its task becomes a
> second, stale spec, which is exactly what that read order exists to prevent.
>
> Created 2026-08-18. Owner-approved; see the answers table below for the calls that shaped it.

## Context

`reference/ai-studio-prototype/` is a Vite/React app generated in AI Studio. **D45** already
adopted its *palette* — the zinc/rose "Curation Desk" tokens in `src/app/globals.css` are the
prototype's colours, authored properly as semantic tokens. What was never adopted is its
**composition**: panel cards, section headers, count chips, toolbars, filmstrips, and a far
denser builder workspace. Tsugi's components are roughly a third the size of their prototype
counterparts and read as a plainer product.

The owner asked to (a) adapt the prototype's **builder page**, (b) render usernames on the
rundown as `u/{username}`, and (c) adapt the prototype's UI components broadly rather than
selectively. Conflicts were raised before planning and resolved by the owner:

| Question | Answer |
|---|---|
| Search UI shape | Adopt the prototype's inline panel fully |
| Builder features absent from Tsugi's model | Build all four (social card preview, draft/publish split, score format, category + genres) |
| Author attribution | Rundown + rec page, plain mono `u/{username}`, no avatar |
| Other surfaces | Feed, rec page, dashboard, settings + sign-in |
| Scoring | **Typed scores are always 10/10; imported scores keep their source format** |
| Category vocabulary | Fixed Postgres enum |
| Authors with no handle | **Forced to choose one; legacy nulls gated at next sign-in** |

Comments stay out — **D46** removed them and nothing here revives `CommentSection`.

**Intended outcome:** Tsugi looks and works like the prototype while every rule in `AGENTS.md`,
`context/ui-rules.md`, and `context/ui-tokens.md` still holds — tokens not hex, Radix semantics
not hand-rolled click handlers, `(raw, format)` score pairs, RLS on new tables, validation at
the Hono boundary.

---

## The rule that shapes every UI decision here

`ui-rules.md` § Accessibility: *"Do not strip Radix's built-in behaviour to match a mockup. If
the visual has to change, change the visual."* The prototype is `div`s with `onClick`, raw
`<input>`s, and hand-rolled dropdowns. **Every adaptation keeps the primitive and restyles it:**

| Prototype | Tsugi implementation |
|---|---|
| Persistent results `div` under a raw input | `Command` (cmdk) rendered **inline**, not in a `Popover` — same look, keeps listbox semantics and keyboard nav |
| Provider / media-type segmented buttons | `RadioGroup` (it selects a data source, never `Tabs`), styled as a segmented control |
| Density / view switchers | `role="group"` + `aria-pressed` pill groups (the existing shared shape) |
| `<select>` for category | shadcn `Select` — present in `src/components/ui/`, currently unused |
| `bg-zinc-900/80 border-zinc-800` | `bg-card/60 border-border`; `rose` → `primary`; `emerald` → `success`; `amber` → `highlight` |
| Fixed-overlay modals | shadcn `Dialog`, bottom sheet under `sm` |

`Select` and `Alert` get their first real uses here (`Alert` is the tier `ui-rules.md`
prescribes for recoverable failures and nothing currently implements). `Card`/`Badge` stay
unused — the hand-composed panel plus `.tint` is the established idiom; swapping it now is
churn, not adaptation.

---

## Part 0 — Data layer (lands first, in this order)

### 0a. Scoring: typed scores standardise on 10/10

**No `list.scoreFormat` column, and no per-list picker.** Everything typed inside Tsugi is
`POINT_10`. Scores **imported** from AniList/MAL keep the format they were rated in, so an
87/100 still reads 87/100 and a `POINT_3` smiley is never turned into a number.
**No migration, no conversion, no data loss.**

- [x] `ScoreInput` in the builder hard-set to `POINT_10` instead of `session.user.scoreFormat`
- [x] `MyListPicker`/`ListBuilder` stop nulling imported scores whose format differs
      (`entry.scoreFormat === scoreFormat ? entry.scoreRaw : null`) — keep `(raw, format)`
      verbatim. A bug fix that falls out of the decision.
- [x] Confirm `ScoreBadge` / `scoreTier` / `tierBandFor` need no change (they already normalise
      per format, so mixed-format lists keep working)
- [x] `user.scoreFormat` keeps its real job — interpreting tracker responses (**D32**'s actual
      purpose). It is no longer read to draw the builder's input.

### 0b. Genres

Genres are never fetched today.

- [x] `anilist-client.ts`: `genres` added to `SEARCH_QUERY`, `RESOLVE_QUERY`, `AniListMedia`,
      `toUnifiedMediaResult`
- [x] `jikan-client.ts`: `genres: { name: string }[]` on `JikanEntry`, mapped via
      `entry.genres.map(g => g.name)`. `themes`/`demographics` deliberately **not** folded in.
- [x] `src/lib/types/media.ts`: `genres: string[]` on `UnifiedMediaResult` — always an array,
      never `undefined`
- [x] `list_item.genres`: `text("genres").array().notNull().default(sql`'{}'::text[]`)` plus
      `index("list_item_genres_gin_idx").using("gin", table.genres)`. Native `text[]`, not
      jsonb, because the feed filters on it. Constant default ⇒ metadata-only, no rewrite.
- [x] Read-time aggregation (`unnest` + count, frequency desc then name asc, mirroring the
      prototype's `getListAggregatedGenres`) exposed as
      `ListView.genres: { name: string; count: number }[]` in `getListBySlug`. **Not** added to
      `listListsForUser` — the dashboard needs no aggregate per row.
- [x] `listPublishedFeed` gains `genre?: string`, implemented as a correlated `EXISTS`
      subquery — **not** a join; this file already documents the row-multiplication bug that
      joining `list_item` causes
- [x] `listFeedGenres()` alongside `listFeedCategories()`, capped at 20 to match
- [x] **Known gap, state it plainly:** existing items keep `{}` until re-saved — old lists show
      an empty genre cloud

### 0c. Category, split from `name`

`name` stays the free-text **title**; a new `category` column carries the fixed vocabulary.
Renaming `name` → `title` is pure churn across routes, services, UI, and tests for a label.

- [x] `src/db/enums.ts` exports one `LIST_CATEGORIES` array — the prototype's
      `POPULAR_CATEGORIES` **minus `'All'`** (a UI-only pseudo-category that must never be
      stored) plus `"Other"`. Both `pgEnum("list_category", …)` and the Zod schema consume it;
      two hand-maintained copies would drift.
- [x] **Before writing the backfill:** run read-only
      `SELECT name, count(*) FROM list GROUP BY name ORDER BY 2 DESC` via the Supabase MCP so
      the `'Other'` rate is known rather than assumed
- [x] `list.category` NOT NULL, added nullable → backfilled (case-insensitive match against the
      vocabulary, else `'Other'`) → set NOT NULL — the pattern migration `0003` established
- [x] `listPublishedFeed`: `eq(list.name, category)` → `eq(list.category, category)`;
      `listFeedCategories` groups on the new column. **Feed grouping visibly changes** — that is
      the point of the split.
- [x] `renameListSchema` widens into `updateListSchema` (`name` and/or `category`, refined to
      require at least one) rather than a second single-field endpoint
- [x] Fix the now-stale "User-chosen category title" comment on `list.name` in `schema.ts`
- [x] Trade-off accepted and recorded: a new category later needs `ALTER TYPE … ADD VALUE`

### 0d. Author attribution + the handle gate

No schema change — `user.username` already exists (nullable, unique lower-index,
`^[a-zA-Z0-9_]{3,20}$`).

- [x] `listPublishedFeed` + `getListBySlug` gain an `innerJoin` on `user` (safe: `list.userId`
      is NOT NULL and FK'd) selecting `user.username` into `FeedEntry.authorUsername` /
      `ListView.authorUsername`, typed `string | null`
- [x] `listListsForUser` deliberately unchanged — the viewer is always the author
- [x] **The gate:** a signed-in user with no username is redirected to a blocking "Choose your
      handle" step before any authenticated screen (`/`, `/dashboard`, `/settings`), reusing
      `UsernameField`'s client-side Zod mirror of the DB check constraint
- [x] Public routes (`/feed`, `/r/[slug]`, the OG image) are **never** gated — invariant 9
- [x] Legacy published lists whose author has no handle render **no author line** until that
      author claims one. No backfill, no invented handles.

### 0e. Draft / publish

- [x] `createListSchema` gains `publish: z.boolean().optional()`
- [x] `createList` sets `published`/`publishedAt` **inside its existing transaction** — one
      round-trip instead of create-then-publish, which can otherwise fail halfway and strand a
      list as an unintended draft
- [x] `POST /api/lists/:slug/publish` stays, for publishing a draft later from the dashboard

- [x] Migration generated with `bun x drizzle-kit generate` + `migrate` against `DIRECT_URL` —
      never DDL through the Supabase MCP

---

## Part 1 — `ListBuilder` (the headline change)

Rewrite `src/components/ListBuilder.tsx` to the prototype's two-column workspace.

- [x] **Toolbar header**: panel card with the `次` gradient mark, the live title (falling back to
      "Create Curated List"), the mono `/r/{slug}` once known, and three actions — "Social Card"
      toggle, "Save Draft" (`variant="outline"`), "Publish List" (`bg-primary`). One primary
      action per screen.
- [x] **Left column** (`lg:col-span-5`): section header, title `Input`, category `Select`, the
      auto-aggregated genre cloud with the prototype's footnote, caption `Textarea` with a live
      `n/280` counter
- [x] **The prototype's rating-scale tiles are deliberately not built** — typed scores are 10/10
      (0a), so the control would offer a choice that no longer exists
- [x] **Right column** (`lg:col-span-7`): search panel (Part 2) above the item tray (Part 3),
      with a "Curated Items" header carrying the count chip
- [x] **Social card preview**: the toggle reveals a 1200×630 preview from the existing
      `src/lib/canvasExport.ts`, with a comment noting this is the *canvas* renderer, not the
      Satori OG route — two implementations of one design that must change together
- [x] Kept: the invariant-8 pre-check, the 429/401/502 branches, `ShareModal` opening over the
      new URL rather than navigating, `MyListPicker`'s tracker-linked gating
- [x] Added: validation through shadcn `Alert` inside the form; saved-draft confirmation in a
      `role="status"` region
- [x] Dropped: `canvas-confetti` (not in `tech-stack.md`; the share modal already marks the
      moment) and the "Drag to reorder" hint (the tray is keyboard-only by rule — the prototype
      claims drag works and it does not)

## Part 2 — `MediaSearchInput` → the inline search panel

- [x] Header row: `Plus` roundel, "Add Titles to List", "Live Search" chip
- [x] Bar containing the provider `RadioGroup` **and** a new media-type `RadioGroup`
      (All / Anime / Manga — `searchMedia` already supports manga end-to-end and the builder
      currently hard-codes `MEDIA_TYPE = "anime"`)
- [x] Always-open results list of rich rows: cover, format/year chips, genre chips,
      average-score chip, per-row **Add** that becomes a `success`-tinted "Added" without
      closing the list, so several titles go in at once
- [x] Built as `Command` + `CommandList` + `CommandItem` **inline**, no `Popover`
- [x] Keeps the 250ms debounce, the 2-char floor, and both provider-error sentences
      (unavailable → offer the switch; rate-limited → different sentence, no switch)
- [x] `/` and Cmd+K focus shortcut from the prototype; autofocus-on-mount stays the product's
      one sanctioned autofocus
- [x] `ProviderToggle` absorbed into the bar, keeping `localStorage` persistence and its
      `fieldset`/`legend` "Search source" grouping — only the container changes
- [x] `MyListPicker` becomes a third mode in the same panel instead of a sibling block

## Part 3 — `ItemTray`

- [x] Row card: `#n` rank tile, cover, format/year/source chips, title with native title beneath
- [x] Divided lower half: `ScoreInput` ("Your Rating") and a note `Textarea` ("Curator Note")
      with a live counter that turns `text-destructive` at 280
- [x] Move/remove controls grouped into a bordered cluster
- [x] The prototype's **empty state** — a dashed panel explaining what the search bar is for
      (today the tray renders a bare "Items (0)")
- [x] `ScoreInput` keeps its `RadioGroup` mechanics; with typed scores fixed at `POINT_10` it
      renders one shape — ten targets that wrap at ≥44px, never shrink, never scroll
      horizontally. Other format shapes stay for **display of imported scores**, and `POINT_3`
      must still never render a numeral.

## Part 4 — The rundown (`/feed` + `FeedList`)

- [x] `u/{username}` in every row's eyebrow, mono, beside the category chip and `/r/{slug}`, in
      all three densities. No avatar. Omitted when the author has no handle (0d).
- [x] Clickable genre chips per row, filtering via the new `?genre=` param
- [x] Sidebar genre directory with live counts, beside the category directory; stat tiles
- [x] Filmstrip treatment (rank badge + `ScoreBadge` per cover); fanned cover stack in grid
- [x] Active-filter chip bar with "Clear all"
- [x] Density stays client state, never a URL param; sort pills and category sidebar keep their
      shapes — already the prototype's idiom

## Part 5 — The artifact (`/r/[slug]`, `RecView`, `ListItemViews`)

- [x] Author line: `u/{username}` beside the existing date/views meta
- [x] "Genre Spectrum" panel in the header, its chips filtering the item list below
- [x] Quick copy-link and download-card actions beside `ShareListButton` — both already exist in
      `ShareModal` / `canvasExport.ts`; surface them, do not reimplement
- [x] `ListItemViews`: richer ranked rows (curator-commentary box with the rose left rule,
      format/year chips, `SourceLink` row), coloured tier band panels, gallery scrim + badge
- [x] The artifact keeps `rounded-3xl` + `shadow-xl` + the brand-gradient top rule — the only
      surface allowed them, and that hierarchy over the rundown must survive this pass

## Part 6 — Dashboard, settings, sign-in

- [x] **Dashboard**: banner (`u/{username}'s Curation Desk`), stat tiles with per-metric tinted
      icons, rows gaining the category chip, `Live`/`Draft` pill, grouped action cluster.
      Two-press delete stays — no confirm dialog.
- [x] **Settings**: titled panel cards with icon + mono uppercase headers; `UsernameField` gets
      the `@`-prefixed framed input and is now **required** (it is also what the handle gate
      renders); `ProviderConnections` gets provider-glyph rows in the `anilist`/`mal` tokens,
      keeping "Linked" signalled three ways
- [x] **No score-format picker in settings** — the prototype has one, but with typed scores at
      10/10 it would misrepresent what `user.scoreFormat` does. Show the detected tracker scale
      as read-only context instead.
- [x] **Sign-in**: `SignInButtons` adopts the per-provider chrome (glyph chip, provider tokens,
      footer reassurance line).

## Part 7 — Docs (not optional)

- [x] **D47** — typed scores standardise on `POINT_10`; imported scores keep their source
      format. Amends **D28**/**D32** rather than reversing them: the column still interprets
      imports, it just no longer draws the input. Records that collapsing imports to 10/10 was
      considered and rejected as lossy. `Revisit if:` a tracker adds a scale users type in.
- [x] **D48** — `category` splits from `name` as a fixed enum; genres stored per item. Changes
      what the feed groups by. Records the owner's confirmation and the `'Other'` backfill.
- [x] **D49** — a username is mandatory for authors; legacy nulls gated at next sign-in rather
      than backfilled.
- [x] `context/ui-registry.md` — rows for every changed component, in the same change
- [x] `context/ui-rules.md` / `ui-tokens.md` — the panel and density idioms now system-wide, and
      the inline-`Command` pattern, so the next agent does not "restore" the Popover
- [x] `context/functionality.md` — genres, categories, mandatory handles, manga search
- [x] `context/architecture.md` — the stale `validators/rec.ts` / `services/recommendations.ts`
      paths noticed during exploration
- [x] `context/tech-stack.md` — only if a dependency is added; this plan adds none
- [ ] Delete `context/planning/TEMP-prototype-adaptation.md` once the above are done
      **and the owner has walked the builder in a browser** — nothing here has had human hands on it yet

---

## Verification

- [x] `bun x tsc --noEmit` · `bun x eslint .` · `bun test --conditions=react-server` — the gate,
      in that order
- [x] Unit tests: genre aggregation ordering (frequency desc, name asc); AniList/Jikan genre
      mapping including a missing-`genres` fixture mapping to `[]`; `LIST_CATEGORIES` and the Zod
      enum staying in sync; `createListSchema` accepting `publish` and rejecting a bad category
- [x] `*.db.test.ts` (explicit per-test timeouts): create with category + `publish: true`; feed
      filtering by genre and by category; the author-username join returning the right value,
      `null` for a handle-less owner, and **no duplicated rows**
- [ ] `bun dev` walkthrough (smoke-tested by curl; a human still needs to click through): create across both providers and both media types; multi-add
      without the results closing; import a tracker score and confirm it still shows its original
      scale; save a draft; publish; confirm `u/{username}` on `/feed` and `/r/[slug]`; confirm
      the handle gate fires for a user with no username; confirm the OG image still renders
- [x] Confirm the two hand-copied palettes did not drift:
      `src/app/r/[slug]/opengraph-image.tsx` and `src/lib/canvasExport.ts`
- [ ] Keyboard pass on the builder: tab to search, arrow through results, Enter to add, arrow
      through the score radio group, move and remove an item without a mouse

## Risks worth stating up front

- **The genre cloud is empty for every existing list** until its items are re-saved. Nothing
  breaks; it just looks unfinished on old lists.
- **Feed grouping changes visibly** the moment `category` replaces `name` in the filter.
- **The handle gate is a new interruption** for existing signed-in users without a username.
- This is a large surface. Parts 0 → 3 are the spine; **4–6 can ship as a follow-up** if you
  want the builder landed and verified first.
