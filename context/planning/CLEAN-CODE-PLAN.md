# Clean-code refactor — status and next task

Cross-cutting maintenance work, run alongside the phase plan rather than as one of its
phases. Goal: no file in `src/` should mix more than one responsibility or run past a few
hundred lines without a reason. Purely structural — no behavior changes, verified with
`tsc --noEmit`, `eslint .`, and the full test suite after every split.

## Done — Phase 1 (2026-08-26)

Split the three largest files in the app:

- `src/server/services/lists.ts` (1141 lines) → `src/server/services/lists/{crud,feed,
  stats,votes,index}.ts`. `index.ts` is a barrel re-exporting all four, so every existing
  `@/server/services/lists` import kept working unchanged.
- `src/components/FeedList.tsx` (882→238 lines) → `src/hooks/{useInfiniteFeed,
  usePullToRefresh}.ts`, `src/components/feed/{StreamCard,CompactRow,GridCard,Filmstrip,
  CardActionRow,chips}.tsx`. Also unified the duplicate share button (`ShareRowButton` vs
  `ShareListButton`) into one `ShareListButton` with a `variant: "button" | "pill"` prop.
- `src/components/ListBuilder.tsx` (796→508 lines) → `src/components/list-builder/
  {helpers,useTrackerLinking}.ts` + `src/components/list-builder/steps/{DetailsStep,
  AddTitlesStep,ArrangeStep}.tsx`.

## Done — Phase 2 (2026-08-26)

- `src/app/feed/page.tsx` (571→212 lines) → `src/components/feed/{FeedDirectory,
  FeedEmptyState,FeedFilterBar,FeedPagination,FeedSortNav,FeedSortDrawerNav,
  sortOptions}.tsx`. Added a `HrefFor` type to `src/lib/feed-params.ts` so the extracted
  components share the page's `hrefFor` closure type.
- `src/components/ListItemViews.tsx` (540→148 lines) → `src/components/list-item-views/
  {shared,TierView,GalleryView,RankedView}.tsx`.
- `src/components/MediaSearchInput.tsx` (513→216 lines) → `src/components/media-search/
  {labels,useMediaSearch,SearchResultCard,SearchResultsList}.ts(x)`.
- `src/components/MyListPicker.tsx` (460→297 lines) → `src/components/my-list-picker/
  {helpers,useMyListEntries,ResultGrid}.ts(x)`.

Checked whether `aggregateGenres` (`lists/stats.ts`) and `collectGenres`/`countByStatus`
(`my-list-picker/helpers.ts`) were duplicate logic — they are not: different input shapes
(stored list items vs. live tracker `ListEntry`) and different jobs (frequency-ranked
cloud vs. unique sorted genre list / status tally). Left separate.

Committed as `dc42f4d`, pushed to `main`.

## Done — Phase 3 Track A (2026-08-26)

- `src/components/ListBuilder.tsx` (508→260 lines) → `src/components/list-builder/
  {useListBuilderForm,useListBuilderSubmit,StepRail}.ts(x)`. `useListBuilderForm` holds the
  form state (`items`/`name`/`category`/`caption`/`comment`/`step`/`error`), the tray
  mutators, `body()`, `validate()`, and `goNext`/`goBack`. `useListBuilderSubmit` holds
  `pending`/`savedNotice`/`shareUrl` and the `submit`/`saveEdit` network calls.
  `StepRail.tsx` is the step-indicator header, now presentational.
- `src/components/MyListPicker.tsx` (297→234 lines) → `src/components/my-list-picker/
  {useMyListFilters,StatusFilterBar}.ts(x)`. `useMyListFilters` holds
  `search`/`statusFilter`/`genreFilter`/`sortMode` and the derived `allGenres`/
  `statusCounts`/`filtered`/`addableCount`. `StatusFilterBar.tsx` is the status-pill row.

All 206 tests pass, `tsc --noEmit` and `eslint` clean. Not yet committed.

## Done — Phase 3 Track B, round 1 (2026-08-26)

Fresh line-count survey of `src/**/*.{ts,tsx}` (excluding tests) turned up two files well
past the original top-18 scan, both split:

- `src/server/services/lists/crud.ts` (680 lines) → `lists/{resolve,read,create,edit,
  mutate}.ts`. `resolve.ts` holds the shared concurrent-resolution machinery
  (`resolveAllItems`, `withDeadline`, slug-collision/slug-generation helpers) used by both
  `create.ts` and `edit.ts`. `read.ts` holds the `ListView` type, `itemColumns`, and every
  read path (`getListBySlug`, `listListsForUser`, `getOwnedListBySlug`,
  `incrementViewCount`). `mutate.ts` holds publish/unpublish/delete/duplicate. The file
  itself is deleted — `lists/index.ts` now re-exports the five modules directly, so every
  existing `@/server/services/lists` import kept working unchanged.
- `src/lib/canvasExport.ts` (368→208 lines) → `src/lib/canvas-export/{helpers,layout}.ts`.
  `helpers.ts` holds the palette/size constants and the pure drawing primitives
  (`loadImage`, `roundedRect`, `wrapText`, `coverLayout`). `layout.ts` holds
  `computeCardLayout`, the measurement pass that sizes the canvas before `drawCard` (still
  in the main file) paints it — pulled out because it used a second, throwaway canvas
  context and previously duplicated variables the real draw pass also needed.

All 206 tests pass, `tsc --noEmit` and `eslint` clean. Not yet committed.

## Next — Phase 3 Track B, round 2 (not started)

Next-largest files not yet reviewed, in order: `src/server/services/lists/feed.ts` (361),
`src/lib/auth.ts` (316), `src/components/DashboardRecList.tsx` (312),
`src/components/Header.tsx` (289), `src/components/ShareModal.tsx` (279). The `src/
components/ui/*` shadcn primitives (`dropdown-menu.tsx` 257, `select.tsx` 190,
`command.tsx` 186, `dialog.tsx` 158) are vendor-generated and were deliberately skipped —
confirm before touching any of them, since diverging from upstream shadcn output has its
own cost.

### Explicitly still out of scope

`reference/ai-studio-prototype/` — the legacy prototype folder (`FeedView.tsx` 1121 lines,
`storage.ts` 737, `RecView.tsx` 680, `CommentSection.tsx` 647, `ImportModal.tsx` 583) — is
excluded per an earlier decision in this line of work: confirm with the project owner
whether it's still live reference material or safe to delete before ever refactoring it.
