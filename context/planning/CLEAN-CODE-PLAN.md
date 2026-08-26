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

## Next — Phase 3 Track B (not started)

### Track B — fresh bloat scan beyond the original list

The Phase 1 exploration only ranked the top ~18 largest files in `src/` (excluding
`reference/`, `.next/`, tests). It has not been re-run since, and files outside that top
list were never looked at. Before starting: re-run a line-count survey of `src/**/*.{ts,tsx}`
(excluding `*.test.ts`) to catch anything that grew past a few hundred lines since, or that
was missed the first time because it sat just under the original cutoff.

### Explicitly still out of scope

`reference/ai-studio-prototype/` — the legacy prototype folder (`FeedView.tsx` 1121 lines,
`storage.ts` 737, `RecView.tsx` 680, `CommentSection.tsx` 647, `ImportModal.tsx` 583) — is
excluded per an earlier decision in this line of work: confirm with the project owner
whether it's still live reference material or safe to delete before ever refactoring it.
