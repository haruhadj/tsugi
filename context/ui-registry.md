# UI Registry

What already exists, so it is never rebuilt.

**Read this before building any component. Update it in the same change that adds one** —
not at the end of the phase, not "when convenient". An unregistered component gets rebuilt
within a week, and then there are two.

## Status

**Empty.** No components exist yet. As of 2026-08-09 the repository contains only context
files.

The table below is the planned surface, carried from the phase specs in `planning/`.
**Planned is not built.** Move a row into "Built" only when the component exists, is used,
and its props are accurate here.

## Built

| Component | File | Props | Used by | Notes |
|---|---|---|---|---|
| _none yet_ | | | | |

## Planned

| Component | File | Phase | Responsibility |
|---|---|---|---|
| `SignInButtons` | `src/components/SignInButtons.tsx` | 2 | Three providers, trackers first and visually primary, Google separated below |
| `ProviderConnections` | `src/components/ProviderConnections.tsx` | 2 | `/settings` — which providers are linked, and `linkSocial()` for the rest. Gains unlinking and the last-provider guard in Phase 8 (**D33**) |
| `ProviderToggle` | `src/components/ProviderToggle.tsx` | 5 | AniList / MyAnimeList search source; defaults to AniList, persists to `localStorage` |
| `MediaSearchInput` | `src/components/MediaSearchInput.tsx` | 5 | Debounced typeahead against the selected source, keyboard-navigable listbox, emits a `UnifiedMediaResult` |
| `ScoreInput` | `src/components/ScoreInput.tsx` | 5 | Score entry **in the user's own format** — five AniList scales plus MAL's 10-point. `POINT_3` renders as smileys, `POINT_5` as stars |
| `ScoreBadge` | `src/components/ScoreBadge.tsx` | 5 | Read-only score display. Same five formats. Used by the tray, the public page, and the dashboard |
| `ItemTray` | `src/components/ItemTray.tsx` | 5 | The 1..10 item list — reorder, per-item score and note, remove. Refuses an eleventh (**D36**) |
| `RecBuilder` | `src/components/RecBuilder.tsx` | 5 | Composes source + search + tray + caption + comment; owns submit, validation, and error states |
| `ShareModal` | `src/components/ShareModal.tsx` | 5 | Displays the created link, auto-copy result, three share targets |
| `MediaCover` | `src/components/MediaCover.tsx` | 5 | `next/image` wrapper with the required placeholder fallback |
| `RecView` | `src/components/RecView.tsx` | 6 | Public rendering of a recommendation and all its items on `/r/[slug]` |
| `SourceLink` | `src/components/SourceLink.tsx` | 6 | "via AniList / MyAnimeList", linking out. Page only — never the OG card (Q4) |
| `ListBrowser` | `src/components/ListBrowser.tsx` | 7 | Filterable view of the user's own tracker list; adds items with their existing score |
| `RecSummaryCard` | `src/components/RecSummaryCard.tsx` | 8 | One row of the dashboard — items, view count, delete. Reuses `ScoreBadge` and `MediaCover` |
| `ConfirmDialog` | `src/components/ConfirmDialog.tsx` | 8 | Confirmation for deleting a recommendation — the only destructive action in the product. Nothing in Phase 5 needs it; the tray has no discard-all |

`ScoreBadge`, `ScoreInput`, and `MediaCover` are listed separately from their parents on
purpose: each is needed in more than one place, and the second use is where duplication
normally starts.

**`ScoreBadge` and `ScoreInput` must share one formatting module** (`src/lib/score.ts`).
Five formats across the tray, the public page, the dashboard, and the OG card is fifteen
chances to render `2/3` for a smiley rating if each surface improvises.

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

- DaisyUI classes (`btn`, `modal`, `card`) — the library is the registry for those
- One-off layout wrappers used in a single file
- Anything under `src/app/**`. Pages and routes are not reusable UI; they belong in
  `user-flow.md`.

Related: [`ui-rules.md`](./ui-rules.md) · [`ui-tokens.md`](./ui-tokens.md)
