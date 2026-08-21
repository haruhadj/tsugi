# UI Registry

What already exists, so it is never rebuilt.

**Read this before building any component. Update it in the same change that adds one** —
not at the end of the phase, not "when convenient". An unregistered component gets rebuilt
within a week, and then there are two.

## Status

Rewritten 2026-08-17 for **D45** (the palette replacement), which corrected a batch of rows
still describing the single-recommendation product and the Eyecatch visual system.
`CommentSection` was added by **D44** and removed the next day by **D46** — do not re-add it
without reading D46 first.

**Updated 2026-08-18 for D47/D48/D49** — the prototype adaptation. `SegmentedRadioGroup`,
`SocialCardPreview`, and `ChooseHandle` are new; `MediaSearchInput`, `ItemTray`, `ListBuilder`,
`ScoreInput`, and `UsernameField` changed shape or props.

**Updated 2026-08-21** — the rundown gave its sidebar to the covers. `FeedBrowseDrawer` (new,
on the `sheet` primitive) now holds the Categories/Genres/About directory that was a permanent
18rem column, so `FeedList`'s stream card can spend the whole row width on its cover filmstrip.
`MediaCover` gained a `fluid` mode for that filmstrip.

Twenty-six components built. Everything else is still planned, carried from the phase specs in
`planning/`. **Planned is not built.** Move a row into "Built" only when the component
exists, is used, and its props are accurate here.

## Built

| Component | File | Props | Used by | Notes |
|---|---|---|---|---|
| `Wordmark` | `src/components/Wordmark.tsx` | `size?: "sm" \| "md" \| "lg"`, `className?` | `Header`, `sign-in` | **Server component.** 次 in the `.brand-gradient` mark beside the wordmark; `md`/`lg` also carry the tagline. The kanji is `aria-hidden` and resolves from the reader's own CJK font stack — never the sole name of the product on a screen |
| `Header` | `src/components/Header.tsx` | `username: string \| null` | every page | Client component. Sticky blurred top bar plus a fixed mobile tab bar under `md`. `username` is null for signed-out visitors and renders a Sign in button — the product is readable without an account (invariant 9). The bottom bar is fixed, so the page clearance lives as `pb-14 md:pb-0` on `<body>` in `layout.tsx`, not as a spacer inside this component |
| `SignInButtons` | `src/components/SignInButtons.tsx` | none | `(auth)/sign-in` | Client component. AniList/MAL via `authClient.signIn.oauth2({ providerId })`. Per-button pending state, not a page-level flag |
| `ProviderConnections` | `src/components/ProviderConnections.tsx` | none | `(settings)/settings` | Client component. Linked providers via `authClient.listAccounts()`; links via `authClient.oauth2.link()` — **not** `linkSocial()`, which is for built-in social providers only. Owns the product's only sign-out control besides `Header`'s. "Linked" is signalled three ways — colour, icon, word |
| `UsernameField` | `src/components/UsernameField.tsx` | `initialUsername`, `onSaved?`, `saveLabel?`, `autoFocus?` | `(settings)/settings`, `ChooseHandle` | Client component. `@`-prefixed framed input; client-side Zod validation mirroring the DB check constraint. `onSaved` exists for the D49 handle gate, which is the only difference between its two call sites |
| `ProviderToggle` | `src/components/ProviderToggle.tsx` | `value: Provider`, `onChange` | `ListBuilder` | Client component. Labelled `RadioGroup` (not `Tabs` — ui-rules.md § Accessibility). Owns only `localStorage` persistence under `tsugi:search-provider`; the parent owns selection |
| `MediaSearchInput` | `src/components/MediaSearchInput.tsx` | `provider`, `mediaType`, `onSelect`, `onSwitchProvider`, `onMediaTypeChange`, `isSelected` | `ListBuilder` | Client component. The prototype's inline "Add titles" panel. **`Command` (cmdk) rendered inline, not in a `Popover`** — same listbox semantics (D42), but the results stay open so several titles can be added in a row; do not "restore" the Popover. Absorbs the provider and media-type `SegmentedRadioGroup`s into its bar. 250ms debounce, 2-char floor, `/` and Cmd+K focus, calls `searchMedia` straight from the browser. Rows carry cover, type/year/score chips, genres, and an Add → "Added" control |
| `MyListPicker` | `src/components/MyListPicker.tsx` | `provider`, `mediaType`, `onImport`, `isSelected` | `ListBuilder` | Client component. Imports from the user's own tracker list via `GET /api/lists/:provider/:mediaType` |
| `ScoreInput` | `src/components/ScoreInput.tsx` | `scoreFormat`, `value`, `onChange: (value: number \| null) => void`, `id` | `ItemTray` | Client component, fully controlled. Shape follows `scoreFormat`: `POINT_10`/`5`/`3` are a `RadioGroup` of ≥44px targets; `POINT_100`/`POINT_10_DECIMAL` are a numeric `Input` with a mono readout. `POINT_3` renders smileys with a screen-reader text alternative — never a bare number (D28). **`onChange` emits `null` to clear** — scores are optional (D27) and a radio group has no native "none"; the builder only ever draws `POINT_10` (D47), the other shapes render imported scores |
| `ScoreBadge` | `src/components/ScoreBadge.tsx` | `scoreRaw: number`, `scoreFormat: ScoreFormat`, `size?: "sm" \| "md" \| "lg"`, `className?` | `ListItemViews`, `page.tsx` | **Server component.** Tinted pill in its score-tier colour, from `scoreTier()` in `src/lib/score.ts`. Colour is decoration only — `formatScore` always spells out the value and its scale. Tier classes are written out in full, never interpolated, or Tailwind emits nothing |
| `MediaCover` | `src/components/MediaCover.tsx` | `src`, `title`, `width`, `height`, `fluid?: boolean`, `className?` | `ItemTray`, `ListItemViews`, `FeedList`, `DashboardRecList` | Client component (needs `onError`). `next/image` wrapper, explicit dimensions always. `fluid` fills the container width instead of the fixed `width`×`height` box — the dimensions still feed `next/image` the source size and set the held `aspectRatio`, they just stop being the rendered size (the stream filmstrip uses it). Missing and failed covers both render the same designed placeholder with `role="img"`, following the same box so a fluid slot does not collapse. Pass `title=""` inside an `aria-hidden` strip where the covers are decorative repetition of a link that is already labelled |
| `ItemTray` | `src/components/ItemTray.tsx` | `items: TrayItem[]`, `onChange` | `ListBuilder` | Client component, fully controlled. Prototype's row card: rank tile, cover, type chips, `SourceLink`, then a divided half holding `ScoreInput` and a counted note `Textarea`. Has a designed empty state. Exports `TrayItem`, which now carries its **own** `scoreFormat` (D47) — typed scores are `POINT_10`, imported ones keep their tracker's scale. No `scoreFormat` prop. Keyboard move-up/move-down per ui-rules.md; drag is not implemented and is not claimed to be |
| `ListBuilder` | `src/components/ListBuilder.tsx` | none | `src/app/page.tsx` | Client component. Prototype's two-column workspace at `lg`: toolbar (Social card / Save draft / Publish), left metadata panel (title, category `Select`, genre cloud, caption, note), right search + tray. Composes `MediaSearchInput` + `MyListPicker` + `ItemTray` + `SegmentedRadioGroup` + `SocialCardPreview`. Takes **no** `scoreFormat` prop since D47 — typed scores are always `POINT_10`. Pre-checks invariant 8 client-side; surfaces recoverable failures through `Alert`, saved-draft through a `role="status"` region. POSTs `/api/lists` once with `publish` set, then opens `ShareModal` |
| `RecView` | `src/components/RecView.tsx` | `rec: ListView`, `viewerId: string \| null` | `/r/[slug]` | **Async server component.** The artifact card. Loads the discussion server-side via `listComments` + `toWireComments` so the thread is in the first paint and visible to crawlers, and builds the share URL from `NEXT_PUBLIC_APP_URL` (never `window.location`) plus the markdown and card payloads |
| `ListItemViews` | `src/components/ListItemViews.tsx` | `items: ListView["items"]` | `RecView` | Client component. The ranked / tier / gallery switch. Tier bands come from `tierBandFor()` in `src/lib/score.ts` — never from comparing raw numbers across formats. Unscored items get their own dashed "no score" band rather than being dropped |
| `SourceLink` | `src/components/SourceLink.tsx` | `provider`, `mediaType`, `externalId`, `className?` | `ListItemViews` | External "View on AniList / MyAnimeList" link |
| `VotePill` | `src/components/VotePill.tsx` | `score`, `direction`, `onVote`, `disabled?`, `orientation?`, `size?`, `className?` | `VoteButtons` | Client component, presentational and fully controlled — it owns no score and makes no request, so a second caller can post to a different endpoint. Kept split from `VoteButtons` for that reason even though comments (**D46**) removed the second caller. Active state is colour **and** `aria-pressed` **and** a thicker icon stroke |
| `VoteButtons` | `src/components/VoteButtons.tsx` | `slug`, `initialScore`, `orientation?`, `className?` | `FeedList` | Client component. Wraps `VotePill` with the `/api/feed/:slug/vote` call. Direction is optimistic-only — `FeedEntry` carries no "your vote", so this knows only what this browser clicked this page load |
| `FeedList` | `src/components/FeedList.tsx` | `entries: FeedEntry[]`, `firstSlot: number`, `sortNav: ReactNode`, `filterBar?: ReactNode`, `browseDrawer?: ReactNode` | `/feed` | Client component. The stream / compact / grid densities. Density is client state and deliberately **not** a URL param — it is a reading preference, not part of what the page shows, so a shared `/feed` link must not carry it. `sortNav`/`filterBar`/`browseDrawer` are server-rendered and handed down so the density toggle, the sort tabs and the Browse trigger share one row. The stream card's cover filmstrip is `flex-1` across the row's full width (the rundown moved its sidebar into `FeedBrowseDrawer` to buy that width); below `md` only the first five covers show |
| `FeedBrowseDrawer` | `src/components/FeedBrowseDrawer.tsx` | `children: ReactNode`, `filtered?: boolean` | `/feed` | Client component, a `Sheet` (right side). Holds the rundown's directory — the Categories/Genres/About panels the page used to render in an 18rem column, now handed in as `children` so the panels (nothing but `Link`s and their counts) stay server-rendered. Closes on any click inside via delegation (every child is a real link; keyboard activation fires a click too). `filtered` only puts a dot on the trigger — what is filtering is still spelled out in the page's filter bar, so the dot is never the only signal |
| `DashboardRecList` | `src/components/DashboardRecList.tsx` | `initialRecs: ListView[]` | `/dashboard` | Client component. All/Published/Drafts filter over already-fetched rows, plus per-row publish/unpublish, duplicate, open, and a two-press delete. Duplicate calls `router.refresh()` rather than guessing the server-assigned slug |
| `ShareModal` | `src/components/ShareModal.tsx` | `open`, `onOpenChange`, `url`, `text?`, `markdown?`, `card?` | `ListBuilder`, `ShareListButton` | Client component, `Dialog` + `Tabs`. Bottom sheet under `sm`. Auto-copies on open, with a `role="status"` region that never claims a success it did not have. `markdown` and `card` are optional: `ListBuilder` opens this the moment a list is created, when it has the URL but not the resolved titles, and those tabs only appear once there is something to put in them |
| `SegmentedRadioGroup` | `src/components/SegmentedRadioGroup.tsx` | `label`, `value`, `options`, `onChange`, `className?` | `MediaSearchInput`, `ListBuilder` | Client component, generic over the value type. The prototype's segmented control, built on Radix `RadioGroup` — **not `Tabs`**: every use selects a *data source* (which provider, which media type), not a view of the same content (ui-rules.md § Accessibility). Radio is visually hidden, the label carries the styling, ≥44px targets, arrow keys and the group label survive |
| `SocialCardPreview` | `src/components/SocialCardPreview.tsx` | `title`, `subtitle`, `comment`, `category`, `items` | `ListBuilder` | Client component. A DOM **approximation** of the share card, shown while building — the two real renderers (`opengraph-image.tsx` via Satori, `canvasExport.ts` via canvas) both need a saved list and cannot run here. Three surfaces, one design: change them together. Uses tokens, unlike the other two, which need literal hex |
| `ChooseHandle` | `src/components/ChooseHandle.tsx` | none | `/handle` | Client component. `UsernameField` plus "leave once saved" — `router.refresh()` before `replace()`, or the cached session bounces the user straight back into the gate (D49). Exists only so `/handle` can stay a server component |
| `ShareListButton` | `src/components/ShareListButton.tsx` | `url`, `text`, `markdown`, `card` | `RecView` | Client component. The share entry point on `/r/[slug]` — opens `ShareModal` over payloads that were built on the server |

## shadcn primitives present

Added by `bun x shadcn@4.16.2 add`, living as editable source in `src/components/ui/`.
**These are not registry components** (see "Not components" below) — the list exists only so
nobody re-adds one that is already here.

`button` · `card` · `separator` · `popover` · `command` · `dialog` · `radio-group` · `input` ·
`badge` · `alert` · `label` · `dropdown-menu` · `tabs` · `textarea` · `select` · `sheet`

`dropdown-menu` and `tabs` were added 2026-08-17 for `Header`'s account menu and
`ShareModal`'s tabs. `textarea` and `select` arrived with the comment composer (**D44**), were
orphaned by **D46**, and are in use again since **D48** — `select` is the builder's category
picker, `textarea` its caption/note fields and the tray's per-item note. `alert` also got its
first real call site there (the builder's recoverable-failure tier, which `ui-rules.md`
prescribed and nothing implemented until now).

Still unused: `badge` and `card`. Both are deliberate — every chip in the product is the
`.tint` recipe on a `span`, and every panel is a hand-composed `div`. Swapping either now
would be churn rather than adaptation.

`dialog` arrived as a transitive dependency of `command` (`bun x shadcn add command popover`,
2026-08-15) — now used directly by `ShareModal`.

`sheet` was added 2026-08-21 for `FeedBrowseDrawer` — the rundown's Browse drawer. Like
`dialog` it is a thin skin over Radix `Dialog`; it is the sliding-panel shape of the same
primitive, kept separate rather than reconstructed from `dialog` each time a drawer is needed.

`card` is currently unused by application code — the eyecatch card is hand-composed in the
pages, because it carries `.eyecatch-edge` and the foot bar. If a third screen needs that
composition, promote it to a real registry component rather than copying it again.

## Planned

Nothing. Every row that was here has either shipped or been resolved differently:

- `RecView` and `SourceLink` shipped (Phase 6).
- `ListBrowser` shipped as `MyListPicker`.
- `RecSummaryCard` was never built — the dashboard row is composed inline in
  `DashboardRecList`, which is its only call site. Promote it only if a second surface needs
  the same row.
- `ConfirmDialog` was never built. Delete uses a two-press button that relabels itself to
  "Delete for good" and resets on blur, which is lighter than a modal for the one destructive
  action in the product.

`ScoreBadge`, `ScoreInput`, and `MediaCover` are listed separately from their parents on
purpose: each is needed in more than one place, and the second use is where duplication
normally starts.

**Most of these compose shadcn primitives rather than replacing them** — `ScoreInput` is a
`RadioGroup` whose shape depends on the user's score format, `ShareModal` is a `Dialog`. The
registry entry exists for the project behaviour on top, not for the widget underneath. If a
wrapper turns out to add nothing, delete it and use the primitive directly.

**`MediaSearchInput` builds on shadcn's `Combobox`** (`Popover` + `Command`). It was specced
as a HeroUI `Autocomplete`; Radix has no combobox, so the underlying `cmdk` dependency was
proposed and approved (**D42**, `tech-stack.md`). See `ui-rules.md` § Accessibility.

**`ScoreBadge` and `ScoreInput` must share one formatting module** (`src/lib/score.ts`).
Five formats across the tray, the public page, the dashboard, the OG card, and the markdown
export is twenty chances to render `2/3` for a smiley rating if each surface improvises.

**Tier colour comes from the same module.** `scoreTier` and `tierBandFor` in `src/lib/score.ts`
normalise a score against its own format's range before banding it, so `ScoreBadge` and
`ListItemViews` cannot disagree about whether 8/10 and 8/100 are the same thing.

## Registering a component

Add a row to **Built** with:

- **File** — the real path
- **Props** — the actual signature, not a description of it
- **Used by** — every call site. When this becomes long, the component is doing too much.
- **Notes** — anything a future agent would otherwise have to read the source to learn:
  which states it owns, what it deliberately does not handle

Then delete its row from **Planned**.

## Not components

These are deliberately not in the registry, and adding them would be wrong:

- shadcn primitives in `src/components/ui/` (`Button`, `Dialog`, `Card`) — the shadcn
  registry is the registry for those, and they are listed above only to prevent re-adding.
  A registry entry is for something *we* built, including a thin wrapper around a primitive
  when the wrapper carries real project behaviour
- One-off layout wrappers used in a single file
- Anything under `src/app/**`. Pages and routes are not reusable UI; they belong in
  `user-flow.md`.

Related: [`ui-rules.md`](./ui-rules.md) · [`ui-tokens.md`](./ui-tokens.md)
