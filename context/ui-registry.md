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

Twenty-two components built. Everything else is still planned, carried from the phase specs in
`planning/`. **Planned is not built.** Move a row into "Built" only when the component
exists, is used, and its props are accurate here.

## Built

| Component | File | Props | Used by | Notes |
|---|---|---|---|---|
| `Wordmark` | `src/components/Wordmark.tsx` | `size?: "sm" \| "md" \| "lg"`, `className?` | `Header`, `sign-in` | **Server component.** 次 in the `.brand-gradient` mark beside the wordmark; `md`/`lg` also carry the tagline. The kanji is `aria-hidden` and resolves from the reader's own CJK font stack — never the sole name of the product on a screen |
| `Header` | `src/components/Header.tsx` | `username: string \| null` | every page | Client component. Sticky blurred top bar plus a fixed mobile tab bar under `md`. `username` is null for signed-out visitors and renders a Sign in button — the product is readable without an account (invariant 9). The bottom bar is fixed, so the page clearance lives as `pb-14 md:pb-0` on `<body>` in `layout.tsx`, not as a spacer inside this component |
| `SignInButtons` | `src/components/SignInButtons.tsx` | none | `(auth)/sign-in` | Client component. AniList/MAL via `authClient.signIn.oauth2({ providerId })`; Google renders `disabled` — not wired into `auth.ts`. Per-button pending state, not a page-level flag |
| `ProviderConnections` | `src/components/ProviderConnections.tsx` | none | `(settings)/settings` | Client component. Linked providers via `authClient.listAccounts()`; links via `authClient.oauth2.link()` — **not** `linkSocial()`, which is for built-in social providers only. Owns the product's only sign-out control besides `Header`'s. "Linked" is signalled three ways — colour, icon, word |
| `UsernameField` | `src/components/UsernameField.tsx` | `initialUsername: string` | `(settings)/settings` | Client component. Client-side Zod validation mirroring the DB check constraint |
| `ProviderToggle` | `src/components/ProviderToggle.tsx` | `value: Provider`, `onChange` | `ListBuilder` | Client component. Labelled `RadioGroup` (not `Tabs` — ui-rules.md § Accessibility). Owns only `localStorage` persistence under `tsugi:search-provider`; the parent owns selection |
| `MediaSearchInput` | `src/components/MediaSearchInput.tsx` | `provider`, `mediaType`, `onSelect`, `onSwitchProvider` | `ListBuilder` | Client component. `Popover` + `Command` combobox (D42), 250ms debounce, 2-char floor, calls `searchMedia` straight from the browser (both provider clients are unauthenticated `fetch`). Owns query text and results only — the parent must clear its selection on provider change, so a stale `(provider, externalId)` pair can never survive |
| `MyListPicker` | `src/components/MyListPicker.tsx` | `provider`, `mediaType`, `onImport`, `isSelected` | `ListBuilder` | Client component. Imports from the user's own tracker list via `GET /api/lists/:provider/:mediaType` |
| `ScoreInput` | `src/components/ScoreInput.tsx` | `scoreFormat`, `value`, `onChange`, `id` | `ItemTray` | Client component, fully controlled. Shape follows `scoreFormat`: `POINT_10`/`5`/`3` are a `RadioGroup` of ≥44px targets; `POINT_100`/`POINT_10_DECIMAL` are a numeric `Input`. `POINT_3` renders smileys with a screen-reader text alternative — never a bare number (D28) |
| `ScoreBadge` | `src/components/ScoreBadge.tsx` | `scoreRaw: number`, `scoreFormat: ScoreFormat`, `size?: "sm" \| "md" \| "lg"`, `className?` | `ListItemViews`, `page.tsx` | **Server component.** Tinted pill in its score-tier colour, from `scoreTier()` in `src/lib/score.ts`. Colour is decoration only — `formatScore` always spells out the value and its scale. Tier classes are written out in full, never interpolated, or Tailwind emits nothing |
| `MediaCover` | `src/components/MediaCover.tsx` | `src`, `title`, `width`, `height`, `className?` | `ItemTray`, `ListItemViews`, `FeedList`, `DashboardRecList` | Client component (needs `onError`). `next/image` wrapper, explicit dimensions always. Missing and failed covers both render the same designed placeholder with `role="img"`. Pass `title=""` inside an `aria-hidden` strip where the covers are decorative repetition of a link that is already labelled |
| `ItemTray` | `src/components/ItemTray.tsx` | `items: TrayItem[]`, `onChange`, `scoreFormat` | `ListBuilder` | Client component, fully controlled. Display fields (`title`, `coverImage`) are client-only and never reach the wire. Keyboard move-up/move-down per ui-rules.md; drag is not implemented. Exports `canAddItem` and `MAX_ITEMS` — the parent gates adding, not this |
| `ListBuilder` | `src/components/ListBuilder.tsx` | `scoreFormat: ScoreFormat` | `src/app/page.tsx` | Client component. Two-column at `lg`. Composes `ProviderToggle` + `MediaSearchInput` + `MyListPicker` + `ItemTray` + name/caption/comment inputs. Pre-checks invariant 8 client-side to surface a friendly message rather than relying on the server's 400. POSTs `/api/lists`, then opens `ShareModal` over the new URL instead of navigating away |
| `RecView` | `src/components/RecView.tsx` | `rec: ListView`, `viewerId: string \| null` | `/r/[slug]` | **Async server component.** The artifact card. Loads the discussion server-side via `listComments` + `toWireComments` so the thread is in the first paint and visible to crawlers, and builds the share URL from `NEXT_PUBLIC_APP_URL` (never `window.location`) plus the markdown and card payloads |
| `ListItemViews` | `src/components/ListItemViews.tsx` | `items: ListView["items"]` | `RecView` | Client component. The ranked / tier / gallery switch. Tier bands come from `tierBandFor()` in `src/lib/score.ts` — never from comparing raw numbers across formats. Unscored items get their own dashed "no score" band rather than being dropped |
| `SourceLink` | `src/components/SourceLink.tsx` | `provider`, `mediaType`, `externalId`, `className?` | `ListItemViews` | External "View on AniList / MyAnimeList" link |
| `VotePill` | `src/components/VotePill.tsx` | `score`, `direction`, `onVote`, `disabled?`, `orientation?`, `size?`, `className?` | `VoteButtons` | Client component, presentational and fully controlled — it owns no score and makes no request, so a second caller can post to a different endpoint. Kept split from `VoteButtons` for that reason even though comments (**D46**) removed the second caller. Active state is colour **and** `aria-pressed` **and** a thicker icon stroke |
| `VoteButtons` | `src/components/VoteButtons.tsx` | `slug`, `initialScore`, `orientation?`, `className?` | `FeedList` | Client component. Wraps `VotePill` with the `/api/feed/:slug/vote` call. Direction is optimistic-only — `FeedEntry` carries no "your vote", so this knows only what this browser clicked this page load |
| `FeedList` | `src/components/FeedList.tsx` | `entries: FeedEntry[]`, `firstSlot: number` | `/feed` | Client component. The stream / compact / grid densities. Density is client state and deliberately **not** a URL param — it is a reading preference, not part of what the page shows, so a shared `/feed` link must not carry it |
| `DashboardRecList` | `src/components/DashboardRecList.tsx` | `initialRecs: ListView[]` | `/dashboard` | Client component. All/Published/Drafts filter over already-fetched rows, plus per-row publish/unpublish, duplicate, open, and a two-press delete. Duplicate calls `router.refresh()` rather than guessing the server-assigned slug |
| `ShareModal` | `src/components/ShareModal.tsx` | `open`, `onOpenChange`, `url`, `text?`, `markdown?`, `card?` | `ListBuilder`, `ShareListButton` | Client component, `Dialog` + `Tabs`. Bottom sheet under `sm`. Auto-copies on open, with a `role="status"` region that never claims a success it did not have. `markdown` and `card` are optional: `ListBuilder` opens this the moment a list is created, when it has the URL but not the resolved titles, and those tabs only appear once there is something to put in them |
| `ShareListButton` | `src/components/ShareListButton.tsx` | `url`, `text`, `markdown`, `card` | `RecView` | Client component. The share entry point on `/r/[slug]` — opens `ShareModal` over payloads that were built on the server |

## shadcn primitives present

Added by `bun x shadcn@4.16.2 add`, living as editable source in `src/components/ui/`.
**These are not registry components** (see "Not components" below) — the list exists only so
nobody re-adds one that is already here.

`button` · `card` · `separator` · `popover` · `command` · `dialog` · `radio-group` · `input` ·
`badge` · `alert` · `label` · `dropdown-menu` · `tabs` · `textarea` · `select`

`dropdown-menu` and `tabs` were added 2026-08-17 for `Header`'s account menu and
`ShareModal`'s tabs. `textarea` and `select` arrived with the comment composer (**D44**) and
are currently **unused** after **D46** — leave them; they cost nothing and the next form will
want them.

`dialog` arrived as a transitive dependency of `command` (`bun x shadcn add command popover`,
2026-08-15) — now used directly by `ShareModal`.

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
