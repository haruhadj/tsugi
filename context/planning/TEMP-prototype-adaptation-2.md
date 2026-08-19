# Prototype adaptation, part 2 — the reading surfaces

> **This is a living, tickable tracker**, not a phase spec. Every `[ ]` below is checked off in
> the same commit as the work it describes, so the file always states what is actually done.
>
> The `TEMP-` prefix marks it as scaffolding: it is **deleted** once Phase D (docs) lands and the
> decisions live in `progress-tracker.md`, which is the permanent record. It is deliberately
> **not** added to `AGENTS.md`'s read order — a temp file that outlives its task becomes a second,
> stale spec.
>
> Created 2026-08-18. Owner-approved; see the decisions table below.

## Context

D47/D48/D49 (2026-08-18) adapted the prototype's **builder** and data layer. What that pass did
*not* adapt is the prototype's **reading** surfaces: `FeedView.tsx` (1121 lines) was mined for
chips and densities but not for its actual composition, and `Header`, `MyListPicker`, and the
import flow were left as they were. The owner has walked `/feed` and found the gap concretely:

- sort tabs and nav have no icons; the feed has no hero eyebrow, no search, no media-format panel
- post cards respond to a click only on the title
- the decorative `01` rank under the vote pillar reads as noise
- picking **My list** in the builder dumps one flat, unfiltered list of titles

The owner's instruction is broader than the enumerated items: **bring the frontend to the
prototype's design, and find the remaining gaps in the prototype rather than waiting to be told.**

Constraints that do not move (AGENTS.md): tokens not hex, Radix primitives kept and restyled
(never `div` + `onClick` where a control belongs), `(raw, format)` score pairs, slugs as the only
public id, validation at the Hono boundary, registry updated in the same change.

| Question | Answer |
|---|---|
| "Media Format" sidebar panel | **Anime / Manga only** — no new `format` column, no migration |
| Card clickability | Whole card clickable in **compact + grid**; **stream stays partial** (title, filmstrip, "View list"), as the prototype does |
| My-lists breakdown | **All four**: watch status, anime/manga + provider, genre, sort + search-within |
| Delivery | **Phased, feed first**, gate green at each phase |

## Progress

| Phase | Status |
|---|---|
| A — The rundown (`/feed`) and the nav | Not started |
| B — The create page's "My list" mode | Not started |
| C — Sweep the remaining prototype gaps | Not started |
| D — Documentation | Not started |

---

## Phase A — The rundown (`/feed`) and the nav

### A1. Data layer: two new feed filters + search

`src/server/services/lists.ts` → `listPublishedFeed` gains `mediaType?: MediaType` and `q?: string`.
Both go into the existing `whereExpr` and must follow the pattern already documented in that
file: **correlated `EXISTS` against `list_item`, never a join** (a join multiplies against the
`list_vote` leftJoin and corrupts every aggregate — the comment at the `genre` filter explains it).

- [ ] Extract the shared predicate into one `feedWhere(params)` helper — it is about to be needed
      in three places, and three copies would drift
- [ ] `mediaType` → `exists (select 1 from list_item where list_id = list.id and media_type = $1)`
- [ ] `q` → `ILIKE` over `list.name`, `list.caption`, `list.category`, `user.username`, plus an
      `EXISTS` over `list_item.title`. Case-insensitive; trim and floor at 2 characters in the
      page, the way `MediaSearchInput` already does
- [ ] `listFeedCategories()` / `listFeedGenres()` take the same filters — otherwise the sidebar
      counts contradict the list the user is looking at
- [ ] New `listFeedMediaTypeCounts()` → `{ anime: number; manga: number; all: number }` for the
      format panel's count badges
- [ ] `FeedEntry.covers` widened from `(string | null)[]` to
      `{ coverImage: string | null; title: string; scoreRaw: number | null; scoreFormat: ScoreFormat | null }[]`
      — same query, more columns; needed by A4's filmstrip badges
- [ ] Validators: `q` and `mediaType` narrowed in the page the way `category` already is (an
      unknown value falls back to unfiltered, never an empty page)

**Tests** (`lists.db.test.ts`, explicit per-test timeouts):

- [ ] Search matches an item title but not an unrelated list
- [ ] `mediaType` filter excludes a manga-only list
- [ ] Sidebar counts respect the active filters
- [ ] **No duplicated rows** with both filters active

### A2. `/feed` page composition (`src/app/feed/page.tsx`)

- [ ] Read `?q=` and `?mediaType=`; extend `hrefFor` (keep its "explicit `undefined` clears,
      absent key keeps" semantics — do not rewrite it)
- [ ] Hero: eyebrow `CompassIcon` + **"Public Discovery Feed"** in `text-primary` mono uppercase,
      headline, description, "Create & share a list" primary button right-aligned at `md`. Keep
      the existing decorative glow
- [ ] Sidebar panel 1 — **Search curations**: a client `FeedSearch` leaf pushing `?q=`
      (debounced, `router.replace`), `Input` + `SearchIcon` + clear button, panel header in the
      established mono-uppercase idiom
- [ ] Sidebar panel 2 — **Media format**: `SegmentedRadioGroup` (already built; this is exactly
      the "selects a data source" case its notes describe) — All `SparklesIcon` / Anime `TvIcon` /
      Manga `BookOpenIcon`, with counts from A1, in a small client wrapper that `router.push`es
- [ ] Sidebar panels 3–5 — Categories, Genres, "Your rundown" CTA stay; the CTA gains the
      prototype's two-stat row (`totalPublished` curations · "AniList + MAL live sync")
- [ ] Filter bar gains a chip for the search query and for media format, reusing the existing
      chip markup
- [ ] Mobile: `FilterIcon` toggle in the toolbar with a count badge, revealing the sidebar under
      `lg` (it is `hidden lg:block` today)

### A3. Sort tabs + density, with icons

- [ ] Sort tabs take the prototype's icons: `top`→`FlameIcon`, `new`→`ClockIcon`,
      `views`→`EyeIcon`, `items`→`ListOrderedIcon`. Icon always renders; label hides under `sm`,
      as the density toggle already does
- [ ] Wrap the toolbar in the prototype's panel (`rounded-2xl bg-card/60 border-border p-2`) so
      sort tabs, filter toggle and density pills read as one bar

### A4. Cards (`src/components/FeedList.tsx`)

- [ ] **Remove the `01` slot number** from `StreamCard`, `CompactRow`, `GridCard`. It is
      `aria-hidden` decoration in all three, so nothing accessible is lost
- [ ] Drop the now-unused `firstSlot` prop from `FeedList` **and** its call site — no dangling prop
- [ ] Compact + grid become fully clickable via the **link-overlay** pattern: `relative` on the
      `<li>`, `after:absolute after:inset-0 after:content-['']` on the existing title `<Link>`,
      and `relative z-10` on `VoteButtons`, genre chips, copy/share. **Not** a `div onClick` —
      that silently breaks keyboard focus, middle-click and open-in-new-tab
- [ ] Stream keeps its partial clickability and gains a **"View list"** link in the footer
      (`ArrowRightIcon`), as the prototype has
- [ ] Stream filmstrip: per-cover rank badge + `ScoreBadge`; the strip stops being `aria-hidden`
      once its covers are labelled (depends on A1's widened `covers`)
- [ ] **"Multi-genre"** `SparklesIcon` badge when `genres.length >= 3`
- [ ] Share button beside Copy link, reusing `ShareModal` the way `ShareListButton` does
- [ ] Grid and compact gain the genre chips they are missing

### A5. Header (`src/components/Header.tsx`)

- [ ] Render the `NAV` icons on desktop too (`size-3.5`, `text-primary` when active), keeping the
      existing `.brand-gradient` active underline
- [ ] Add the prototype's **Import** item (`DownloadCloudIcon`) → `/?from=mylist`. **Blocked on
      B2** — land it with Phase B, not before, or it points at a mode that does not exist yet

### Phase A gate

- [ ] `bun x tsc --noEmit` · `bun x eslint .` · `bun test --conditions=react-server`
- [ ] `bun dev` walkthrough: search the feed and confirm the sidebar counts move with it; toggle
      Anime/Manga; click a compact row anywhere except the vote pill and land on `/r/{slug}`;
      middle-click a card and confirm it opens a tab; vote without navigating; confirm no `01`
      anywhere; tab through the toolbar and confirm every control has a visible focus ring

---

## Phase B — The create page's "My list" mode

### B1. Data layer: richer tracker entries

`ListEntry` (`src/lib/types/media.ts`) gains `status`, `genres`, `year`, where
`ListStatus = "current" | "planning" | "completed" | "dropped" | "paused" | "repeating"` —
AniList's vocabulary, with MAL's `watching`/`plan_to_watch`/`on_hold` mapped onto it in the
adapter, in **one** place.

- [ ] `src/lib/types/media.ts`: `status: ListStatus | null`, `genres: string[]`, `year: number | null`
- [ ] `src/server/services/lists/anilist.ts`: `status` and `media { genres startDate { year } }`
      added to the `MediaListCollection` query and to `toListEntry`
- [ ] `src/server/services/lists/mal.ts`: `FIELDS` extended to
      `list_status,genres,start_season`; status mapping table; genres from `node.genres[].name`
- [ ] `list_cache.entries` is `jsonb`, so **no migration** — but parse tolerantly
      (`status ?? null`, `genres ?? []`) and bump a `CACHE_VERSION` written into the row, so a
      stale shape re-fetches once instead of rendering with empty filters
- [ ] Tests: status mapping for both providers; a fixture missing `genres` → `[]`; the
      stale-cache re-fetch path

### B2. `MyListPicker` becomes the import workspace

Rewritten around the prototype's `ImportModal` composition, but inline in the builder — no modal,
because the builder already *is* the workspace.

- [ ] Header bar: provider glyph chip in the `anilist`/`mal` tokens, linked handle, entry count,
      refresh button (keep the existing `?refresh=1` + stale notice — that behaviour is correct)
- [ ] **Status** filter: horizontally scrollable pill row with live counts (All / Watching /
      Completed / Planning / Paused / Dropped)
- [ ] **Provider** and **anime/manga** `SegmentedRadioGroup`s moved down into this panel from
      `ListBuilder`'s toolbar
- [ ] **Genre** `Select`, populated from the fetched entries
- [ ] **Sort** `Select`: score high→low, title A→Z, recently updated
- [ ] **Search-within**: the existing text `Input`, restyled with `SearchIcon`
- [ ] All filtering is client-side over the already-fetched array — no new API round trips
- [ ] Results: two-column card grid at `sm` (cover, title, format/year chips, score via
      `ScoreBadge` in its own format, Add/Added pill), replacing the flat button list. Keep the
      `isSelected` → disabled "Added" contract
- [ ] "Add all N shown" action — the point of importing a library
- [ ] Empty/error states keep their copy: `not_linked` / `reauth_required` → `/settings`
- [ ] `ListBuilder` drops the provider/media-type controls it owns for this mode
- [ ] `/?from=mylist` opens straight into the mode, and A5's Import nav item lands with it

### Phase B gate

- [ ] `bun x tsc --noEmit` · `bun x eslint .` · `bun test --conditions=react-server`
- [ ] `bun dev` walkthrough: connect a tracker, open My list, filter by status and genre, sort,
      search within, add all shown; confirm an imported `POINT_100` score still renders `87/100`
      (D47); confirm a stale cache row re-fetches once rather than showing empty filters
- [ ] Keyboard pass on the new filter rail

---

## Phase C — Sweep the remaining prototype gaps

Deliberately last, because it is the least specified. Walk `RecView.tsx`, `DashboardView.tsx`,
`SettingsView.tsx`, `ItemTray.tsx`, `MediaSearchInput.tsx` in the prototype against ours and close
what is still missing. Anything found gets a checkbox added here, not silently absorbed.

- [ ] `/r/[slug]`: "Export card PNG" and "Copy link" surfaced *beside* Share in the top bar (ours
      hides both inside `ShareModal`)
- [ ] `/r/[slug]`: tier-grid poster layout; the genre-spectrum reset bar
- [ ] Dashboard: per-metric tinted stat icons; per-row cover thumbnail
- [ ] Builder search rows: provider aggregate score as `★ N%` and the format badge (small delta —
      type/year/score chips already exist)
- [ ] Walk the five prototype files listed above and append anything else found

### Phase C gate

- [ ] `bun x tsc --noEmit` · `bun x eslint .` · `bun test --conditions=react-server`
- [ ] `bun dev` walkthrough, per item added above

---

## Phase D — Documentation (not optional, per AGENTS.md §4)

- [ ] **D50** — the feed carries a text search and an anime/manga filter; why the counts are
      filtered too; why there is no `format` column (owner's call, recorded with what it costs).
      `Revisit if:` per-format chips (TV/Movie/OVA) are wanted on item rows
- [ ] **D51** — feed cards use a link overlay and the rank number is removed; records that the
      number was decoration and that a `div onClick` was considered and rejected
- [ ] **D52** — tracker entries carry status/genres/year; `list_cache` versioning instead of a
      migration
- [ ] `context/ui-registry.md` rows for every changed component, in the same change
- [ ] While in the registry, fix the drift found during exploration: the `RecView` row still
      claims a `viewerId` prop and comment loading (removed by **D46**), and `FeedList`'s row
      omits `sortNav`/`filterBar`
- [ ] `context/ui-rules.md`: the link-overlay pattern, so the next agent does not "fix" it into a
      click handler
- [ ] Fold the old tracker's two open boxes (browser walkthrough, builder keyboard pass) into this
      file and **delete `context/planning/TEMP-prototype-adaptation.md`** — one live tracker, never two
- [ ] `context/progress-tracker.md`: phase status, session log entry
- [ ] Delete this file once the above are done **and** the owner has walked the result in a browser

---

## Verification (applies to every phase)

- [ ] The gate is all three, in order: `tsc --noEmit`, `eslint .`,
      `bun test --conditions=react-server`. `--conditions` is load-bearing
- [ ] New db-tier tests carry explicit per-test timeouts
- [ ] Confirm the two hand-copied palettes did not drift:
      `src/app/r/[slug]/opengraph-image.tsx` and `src/lib/canvasExport.ts`

## Risks worth stating up front

- **Widening `FeedEntry.covers`** touches every density in `FeedList` at once; do A1 and A4
  together or the feed does not compile in between.
- **Old cached tracker rows have no status or genres.** The `CACHE_VERSION` bump forces one
  re-fetch per user per provider/media-type — a slower first My-list open after deploy.
- **The header's Import item is a promise.** Landing it before B2 points at a mode that does not
  exist.
