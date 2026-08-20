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
| A — The rundown (`/feed`) and the nav | **Code complete** — gate green (tsc/eslint/164 tests) and curl-smoked; awaiting the owner's browser walkthrough. Import nav item landed with B2. |
| B — The create page's "My list" mode | **Code complete** — gate green (tsc/eslint/170 tests); awaiting the owner's browser walkthrough. |
| C — Sweep the remaining prototype gaps | **Code complete** — gate green 2026-08-20 (tsc/eslint/**170 tests**), run one session late; see the gate note below. The sweep found five defects in our own work, not prototype deltas. Awaiting the owner's browser walkthrough — `/r/[slug]` especially, in a real browser rather than curl |
| D — Documentation | **Complete bar one deletion** — D50/D51/D52 in the decision log, session log entry, Current-state row, registry and `ui-rules.md` (both landed with their phases), pass 1's tracker folded in. Deleting pass 1's file and this one are the only boxes left |

---

## Phase A — The rundown (`/feed`) and the nav

### A1. Data layer: two new feed filters + search

`src/server/services/lists.ts` → `listPublishedFeed` gains `mediaType?: MediaType` and `q?: string`.
Both go into the existing `whereExpr` and must follow the pattern already documented in that
file: **correlated `EXISTS` against `list_item`, never a join** (a join multiplies against the
`list_vote` leftJoin and corrupts every aggregate — the comment at the `genre` filter explains it).

- [x] Extract the shared predicate into one `feedWhere(params)` helper — it is about to be needed
      in three places, and three copies would drift
- [x] `mediaType` → `exists (select 1 from list_item where list_id = list.id and media_type = $1)`
- [x] `q` → `ILIKE` over `list.name`, `list.caption`, `list.category`, `user.username`, plus an
      `EXISTS` over `list_item.title`. Case-insensitive; trim and floor at 2 characters in the
      page, the way `MediaSearchInput` already does
- [x] `listFeedCategories()` / `listFeedGenres()` take the same filters — otherwise the sidebar
      counts contradict the list the user is looking at
- [x] New `listFeedMediaTypeCounts()` → `{ anime: number; manga: number; all: number }` for the
      format panel's count badges
- [x] `FeedEntry.covers` widened from `(string | null)[]` to
      `{ coverImage: string | null; title: string; scoreRaw: number | null; scoreFormat: ScoreFormat | null }[]`
      — same query, more columns; needed by A4's filmstrip badges
- [x] Validators: `q` and `mediaType` narrowed in the page the way `category` already is (an
      unknown value falls back to unfiltered, never an empty page)

**Tests** (`lists.db.test.ts`, explicit per-test timeouts):

- [x] Search matches an item title but not an unrelated list
- [x] `mediaType` filter excludes a manga-only list
- [x] Sidebar counts respect the active filters
- [x] **No duplicated rows** with both filters active

### A2. `/feed` page composition (`src/app/feed/page.tsx`)

- [x] Read `?q=` and `?mediaType=`; extend `hrefFor` (keep its "explicit `undefined` clears,
      absent key keeps" semantics — do not rewrite it)
- [x] Hero: eyebrow `CompassIcon` + **"Public Discovery Feed"** in `text-primary` mono uppercase,
      headline, description, "Create & share a list" primary button right-aligned at `md`. Keep
      the existing decorative glow
- [x] Sidebar panel 1 — **Search curations**: a client `FeedSearch` leaf pushing `?q=`
      (debounced, `router.replace`), `Input` + `SearchIcon` + clear button, panel header in the
      established mono-uppercase idiom
- [x] Sidebar panel 2 — **Media format**: `SegmentedRadioGroup` (already built; this is exactly
      the "selects a data source" case its notes describe) — All `SparklesIcon` / Anime `TvIcon` /
      Manga `BookOpenIcon`, with counts from A1, in a small client wrapper that `router.push`es
- [x] Sidebar panels 3–5 — Categories, Genres, "Your rundown" CTA stay; the CTA gains the
      prototype's two-stat row (`totalPublished` curations · "AniList + MAL live sync")
- [x] Filter bar gains a chip for the search query and for media format, reusing the existing
      chip markup
- [x] Mobile: `FilterIcon` toggle in the toolbar with a count badge, revealing the sidebar under
      `lg` (it is `hidden lg:block` today)

### A3. Sort tabs + density, with icons

- [x] Sort tabs take the prototype's icons: `top`→`FlameIcon`, `new`→`ClockIcon`,
      `views`→`EyeIcon`, `items`→`ListOrderedIcon`. Icon always renders; label hides under `sm`,
      as the density toggle already does
- [x] Wrap the toolbar in the prototype's panel (`rounded-2xl bg-card/60 border-border p-2`) so
      sort tabs, filter toggle and density pills read as one bar

### A4. Cards (`src/components/FeedList.tsx`)

- [x] **Remove the `01` slot number** from `StreamCard`, `CompactRow`, `GridCard`. It is
      `aria-hidden` decoration in all three, so nothing accessible is lost
- [x] Drop the now-unused `firstSlot` prop from `FeedList` **and** its call site — no dangling prop
- [x] Compact + grid become fully clickable via the **link-overlay** pattern: `relative` on the
      `<li>`, `after:absolute after:inset-0 after:content-['']` on the existing title `<Link>`,
      and `relative z-10` on `VoteButtons`, genre chips, copy/share. **Not** a `div onClick` —
      that silently breaks keyboard focus, middle-click and open-in-new-tab
- [x] Stream keeps its partial clickability and gains a **"View list"** link in the footer
      (`ArrowRightIcon`), as the prototype has
- [x] Stream filmstrip: per-cover rank badge + `ScoreBadge`; the strip stops being `aria-hidden`
      once its covers are labelled (depends on A1's widened `covers`)
- [x] **"Multi-genre"** `SparklesIcon` badge when `genres.length >= 3`
- [x] Share button beside Copy link, reusing `ShareModal` the way `ShareListButton` does
- [x] Grid and compact gain the genre chips they are missing

### A5. Header (`src/components/Header.tsx`)

- [x] Render the `NAV` icons on desktop too (`size-3.5`, `text-primary` when active), keeping the
      existing `.brand-gradient` active underline
- [x] Add the prototype's **Import** item (`DownloadCloudIcon`) → `/?from=mylist`. **Blocked on
      B2** — land it with Phase B, not before, or it points at a mode that does not exist yet

### Phase A gate

- [x] `bun x tsc --noEmit` · `bun x eslint .` · `bun test --conditions=react-server`
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

- [x] `src/lib/types/media.ts`: `status: ListStatus | null`, `genres: string[]`, `year: number | null`
- [x] `src/server/services/lists/anilist.ts`: `status` and `media { genres startDate { year } }`
      added to the `MediaListCollection` query and to `toListEntry`
- [x] `src/server/services/lists/mal.ts`: `FIELDS` extended to
      `list_status,genres,start_season`; status mapping table; genres from `node.genres[].name`
- [x] `list_cache.entries` is `jsonb`, so **no migration** — but parse tolerantly
      (`status ?? null`, `genres ?? []`) and bump a `CACHE_VERSION` written into the row, so a
      stale shape re-fetches once instead of rendering with empty filters
- [x] Tests: status mapping for both providers; a fixture missing `genres` → `[]`; the
      stale-cache re-fetch path

### B2. `MyListPicker` becomes the import workspace

Rewritten around the prototype's `ImportModal` composition, but inline in the builder — no modal,
because the builder already *is* the workspace.

- [x] Header bar: provider glyph chip in the `anilist`/`mal` tokens, linked handle, entry count,
      refresh button (keep the existing `?refresh=1` + stale notice — that behaviour is correct)
- [x] **Status** filter: horizontally scrollable pill row with live counts (All / Watching /
      Completed / Planning / Paused / Dropped)
- [x] **Provider** and **anime/manga** `SegmentedRadioGroup`s moved down into this panel from
      `ListBuilder`'s toolbar
- [x] **Genre** `Select`, populated from the fetched entries
- [x] **Sort** `Select`: score high→low, title A→Z, recently updated
- [x] **Search-within**: the existing text `Input`, restyled with `SearchIcon`
- [x] All filtering is client-side over the already-fetched array — no new API round trips
- [x] Results: two-column card grid at `sm` (cover, title, format/year chips, score via
      `ScoreBadge` in its own format, Add/Added pill), replacing the flat button list. Keep the
      `isSelected` → disabled "Added" contract
- [x] "Add all N shown" action — the point of importing a library
- [x] Empty/error states keep their copy: `not_linked` / `reauth_required` → `/settings`
- [x] `ListBuilder` drops the provider/media-type controls it owns for this mode
- [x] `/?from=mylist` opens straight into the mode, and A5's Import nav item lands with it

### Phase B gate

- [x] `bun x tsc --noEmit` · `bun x eslint .` · `bun test --conditions=react-server`
- [ ] `bun dev` walkthrough: connect a tracker, open My list, filter by status and genre, sort,
      search within, add all shown; confirm an imported `POINT_100` score still renders `87/100`
      (D47); confirm a stale cache row re-fetches once rather than showing empty filters
- [ ] Keyboard pass on the new filter rail

---

## Phase C — Sweep the remaining prototype gaps

Deliberately last, because it is the least specified. Walk `RecView.tsx`, `DashboardView.tsx`,
`SettingsView.tsx`, `ItemTray.tsx`, `MediaSearchInput.tsx` in the prototype against ours and close
what is still missing. Anything found gets a checkbox added here, not silently absorbed.

- [x] `/r/[slug]`: "Export card PNG" and "Copy link" surfaced *beside* Share in the top bar (ours
      hides both inside `ShareModal`)
- [x] `/r/[slug]`: tier-grid poster layout; the genre-spectrum reset bar
- [x] Dashboard: per-metric tinted stat icons; per-row cover thumbnail — **both were already
      done**, by the D47/D48 pass. `(dashboard)/dashboard/page.tsx` renders four stat tiles, each
      with its own token tint (`primary`, `score-good`, `success`, `highlight`) written out as full
      class strings; `DashboardRecList` renders `rec.items[0].coverImage` beside the title plus an
      `aria-hidden` filmstrip of the first 8. Nothing to change — this item was stale when written
- [x] Builder search rows: provider aggregate score as `★ N%` and the format badge (small delta —
      type/year/score chips already exist) — the `N%` chip was already there; it gained the star
      glyph and, more usefully, an `sr-only` "AniList community score" label, because the chip sits
      near the author's own `ScoreBadge` and looked like one. The prototype's *format* badge
      (TV/MOVIE/OVA) is the thing the decisions table above rules out, so what landed instead is
      the anime/manga glyph — see `MediaTypeChip` below
- [x] Walk the five prototype files listed above and append anything else found

### The walk — what the five prototype files still had

`RecView`, `DashboardView`, and `MediaSearchInput` are covered by the items above. The other two:

- [x] **`ItemTray`** — ours is already the fuller adaptation (it has the native title, real
      `aria-label`s on the reorder cluster, and a counted note; the prototype has none of the
      first two). The one genuine delta was the **glyph inside the anime/manga chip**. Landed as
      `MediaTypeChip`, shared with `MediaSearchInput` rather than copied: the builder draws that
      chip twice — once on a search result, once on the tray row it becomes — and it reuses the
      same `TvIcon`/`BookOpenIcon` pair as the feed's media-format panel, so "anime" reads the
      same on both screens
- [ ] **`SettingsView`** — three deltas, all deliberately **not** taken:
      - **Editable "Default Rating Scale" picker.** Ours is read-only on purpose and must stay so:
        under **D47** a typed score is always `POINT_10` and an imported one keeps its tracker's
        scale, so a user-chosen default has nothing to apply to. Adapting this would contradict
        D47, not extend it
      - **Bio field.** A real feature (column + validator + API), not a design gap
      - **"Export local backup (JSON)" / "Reset demo seed data".** Artefacts of the prototype being
        `localStorage`-backed. "Reset seed" is meaningless against a real database; a
        genuine export-my-data feature is worth its own decision, not a silent adaptation
      `Revisit if:` the owner wants a bio or a data export — both are product asks, not adaptation
- [ ] Cosmetic, not taken: the prototype tints each settings/panel section header with its own
      icon colour. Ours uses one mono-uppercase idiom for every panel header. Left alone — one
      idiom is the point, and per-panel colour would spend the accent four times on a screen

### Found while sweeping (each of these is a defect, not a prototype delta)

- [x] **C1 had turned `RecView` into a client component**, which breaks `/r/[slug]` in the
      browser: the file calls `getEnv()`, and `getEnv()` validates the *whole* server env
      (`DATABASE_URL`, `BETTER_AUTH_SECRET`, both OAuth secrets). A client bundle's `process.env`
      carries only `NEXT_PUBLIC_*`, so it throws on hydration. SSR renders fine, which is why
      `tsc` and a curl smoke both stayed green. Fixed by extracting the two buttons into a
      `ListQuickActions` client leaf; `RecView` is a server component again, and its registry row
      now says it must stay one
- [x] **`ListItemViews` had raw palette classes** (`text-amber-400`, `bg-zinc-950`, `border-zinc-700`)
      against the tokens-only rule — and worse, the tier map it introduced *inverted* the ramp:
      S was amber and C emerald, when `score-excellent` **is** the emerald end. The file's own
      correct token maps (`TIER_TEXT`/`TIER_RAIL`) had been left behind as dead code. Restored
- [x] **The tier view banded on the four colour tiers, not the five letters.** It rendered
      `tier.charAt(0).toUpperCase()`, so the pillars read "E / G / F / P" rather than "S / A / B / C",
      collapsed S into A (the distinction `TIER_BANDS` exists to make), and filed *unscored* titles
      under "D" — which is a real band for a low score, so unrated titles were being shown as
      badly rated. Now buckets on `tierBandFor().label`, seeded from `TIER_BANDS` so the two
      cannot drift, with `score-unrated` for the unscored group
- [x] **Genre chips promised an interaction they could not deliver**: `span`s carrying
      `aria-label="Filter by X"` with no handler, while `allGenres` and `handleGenreSelect` sat
      computed-but-unused — the reset bar had nothing that could set the filter it reset. Chips
      are now `button`s with `aria-pressed`, and the spectrum row renders the server's
      frequency-ranked cloud
- [x] **`context/ui-registry.md` rows 45–47 were structurally broken** by the D50/D51 edit:
      `VotePill` and `FeedControls` had been merged into a single row, and `VotePill`'s notes were
      left under a second row labelled `VoteButtons`. Repaired, so Phase D's registry item is
      smaller than it looked
- [ ] **There is no `year` on `list_item`** — only on `ListEntry` (the tracker-side type B1
      widened). The C2 draft rendered `item.year` on `/r/[slug]` rows and in the gallery caption,
      which is why `tsc` failed; both are removed rather than papered over. The prototype *does*
      show a year on item rows, so this is a genuine gap: closing it means a `year` column, a
      backfill for existing rows, and resolving it at save time. **Owner's call** — flagged, not
      taken. `Revisit if:` the year chip is wanted on the artifact as well as in the builder

### Phase C gate

- [x] `bun x tsc --noEmit` · `bun x eslint .` · `bun test --conditions=react-server` — **green,
      2026-08-20**: tsc clean, eslint clean, **170 pass / 0 fail**. It could not be run in the
      session that wrote Phase C (the sandbox refused every `bun` invocation for that whole
      stretch), so this phase sat code-complete and unverified until now. It passed first try, but
      the two things being watched for were real risks: the seven `tsc` errors on `ListItemViews`
      that started that session, and `eslint` on the symbols the previous draft left dangling
      (`TIER_TEXT`, `TIER_RAIL`, `TIER_LABELS`, `MessageSquareIcon`, `TIER_BANDS`,
      `uniqueProviders`, `allGenres`) — all resolved before the run
- [ ] `bun dev` walkthrough, per item added above. Specifically: `/r/[slug]` must be checked in a
      **real browser, not curl** — the `getEnv()` bug above only fires on hydration, so SSR and a
      curl smoke both looked fine while the page was broken

---

## Phase D — Documentation (not optional, per AGENTS.md §4)

- [x] **D50** — the feed carries a text search and an anime/manga filter; why the counts are
      filtered too; why there is no `format` column (owner's call, recorded with what it costs).
      `Revisit if:` per-format chips (TV/Movie/OVA) are wanted on item rows
- [x] **D51** — feed cards use a link overlay and the rank number is removed; records that the
      number was decoration and that a `div onClick` was considered and rejected
- [x] **D52** — tracker entries carry status/genres/year; `list_cache` versioning instead of a
      migration. Also records that `year` stops at `ListEntry` — `list_item` has no such column
- [x] `context/ui-registry.md` rows for every changed component, in the same change — landed
      with each phase rather than here, as the rule requires; verified complete for `Header`,
      `FeedList`, `FeedControls`, `MyListPicker`, `MediaSearchInput`, `ItemTray`, `ListBuilder`,
      `RecView`, `ListItemViews`, `ListQuickActions`, `MediaTypeChip`
- [x] While in the registry, fix the drift found during exploration: the `RecView` row's
      `viewerId` prop and comment loading (removed by **D46**) are gone and the row now records
      that it must stay a server component; `FeedList`'s row carries `sortNav`/`filterBar`
- [x] `context/ui-rules.md`: the link-overlay pattern, so the next agent does not "fix" it into a
      click handler
- [x] Fold the old tracker's two open boxes (browser walkthrough, builder keyboard pass) into this
      file — both are now under "Inherited from pass 1" below, so nothing in pass 1's tracker is
      unrecorded here
- [ ] **Delete `context/planning/TEMP-prototype-adaptation.md`** — one live tracker, never two. The
      fold above is done, so the file is now pure duplication. **Blocked on the owner:** the
      sandbox refused the deletion (it destroys a pre-existing file), so it needs an explicit
      go-ahead. Nothing else waits on it
- [x] `context/progress-tracker.md`: phase status, session log entry, and D50–D52 in the decision
      log; the "Prototype adaptation" row in Current state now covers both passes
- [ ] Delete this file once the above are done **and** the owner has walked the result in a browser

---

## Verification (applies to every phase)

- [x] The gate is all three, in order: `tsc --noEmit`, `eslint .`,
      `bun test --conditions=react-server`. `--conditions` is load-bearing — green 2026-08-20,
      170 pass / 0 fail
- [x] New db-tier tests carry explicit per-test timeouts — all twelve `test(...)` calls in
      `lists.db.test.ts` pass the shared `TIMEOUT` (30s) as the third argument
- [x] Confirm the two hand-copied palettes did not drift:
      `src/app/r/[slug]/opengraph-image.tsx` and `src/lib/canvasExport.ts` — re-checked 2026-08-20,
      both hold the same seven keys and agree with the hex noted beside each token in `globals.css`

### Inherited from pass 1

Pass 1's tracker (`planning/TEMP-prototype-adaptation.md`) had everything checked off except these
two, which are still open and still need a human. They are recorded here so that file can go:

- [ ] `bun dev` walkthrough of the **builder**: create across both providers and both media types;
      multi-add without the results closing; import a tracker score and confirm it still shows its
      original scale; save a draft; publish; confirm `u/{username}` on `/feed` and `/r/[slug]`;
      confirm the handle gate fires for a user with no username; confirm the OG image still renders
- [ ] Keyboard pass on the **builder**: tab to search, arrow through results, Enter to add, arrow
      through the score radio group, move and remove an item without a mouse

## Risks worth stating up front

- **Widening `FeedEntry.covers`** touches every density in `FeedList` at once; do A1 and A4
  together or the feed does not compile in between.
- **Old cached tracker rows have no status or genres.** The `CACHE_VERSION` bump forces one
  re-fetch per user per provider/media-type — a slower first My-list open after deploy.
- **The header's Import item is a promise.** Landing it before B2 points at a mode that does not
  exist.
