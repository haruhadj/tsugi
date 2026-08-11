# UI Registry

What already exists, so it is never rebuilt.

**Read this before building any component. Update it in the same change that adds one** —
not at the end of the phase, not "when convenient". An unregistered component gets rebuilt
within a week, and then there are two.

## Status

Three components built. Everything else is still planned, carried from the phase specs in
`planning/`. **Planned is not built.** Move a row into "Built" only when the component
exists, is used, and its props are accurate here.

## Built

| Component | File | Props | Used by | Notes |
|---|---|---|---|---|
| `Wordmark` | `src/components/Wordmark.tsx` | `size?: "sm" \| "lg"`, `className?: string` | `page.tsx`, `(auth)/sign-in`, `(settings)/settings` | **Server component.** The eyecatch lockup — `次` + wordmark over the bar that wipes in. Carries the whole visual direction, which is why everything around it stays quiet. The kanji is `aria-hidden` and resolves from the reader's own CJK font stack; never the sole name of the product on a screen |
| `SignInButtons` | `src/components/SignInButtons.tsx` | none | `(auth)/sign-in/page.tsx` | Client component. AniList/MAL call `authClient.signIn.oauth2({ providerId })`; Google button renders `disabled` — not wired into `auth.ts` yet ("google later"). Per-button pending state, not a page-level flag: `disabled` + a `Loader2Icon` beside the label, since shadcn's Button has no `isPending` |
| `ProviderConnections` | `src/components/ProviderConnections.tsx` | none | `(settings)/settings/page.tsx` | Client component. Fetches linked providers via `authClient.listAccounts()`; AniList/MAL link via `authClient.oauth2.link()` — **not** `linkSocial()`, which is for built-in social providers only (found while implementing; the blueprint's prose used "linkSocial" loosely for both). Owns the product's only sign-out control. "Linked" is signalled three ways — colour, icon, word |

## shadcn primitives present

Added by `bun x shadcn@4.16.2 add`, living as editable source in `src/components/ui/`.
**These are not registry components** (see "Not components" below) — the list exists only so
nobody re-adds one that is already here.

`button` · `card` · `separator`

`card` is currently unused by application code — the eyecatch card is hand-composed in the
pages, because it carries `.eyecatch-edge` and the foot bar. If a third screen needs that
composition, promote it to a real registry component rather than copying it again.

## Planned

| Component | File | Phase | Responsibility |
|---|---|---|---|
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

**Most of these compose shadcn primitives rather than replacing them** — `ScoreInput` is a
`RadioGroup` whose shape depends on the user's score format, `ShareModal` is a `Dialog`. The
registry entry exists for the project behaviour on top, not for the widget underneath. If a
wrapper turns out to add nothing, delete it and use the primitive directly.

**`MediaSearchInput` is the exception and needs a decision before it is built.** It was
specced as a HeroUI `Autocomplete`; Radix has no combobox, and shadcn's `Combobox` pulls in
`cmdk`, which is not an approved dependency. See `ui-rules.md` § Accessibility.

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

- shadcn primitives in `src/components/ui/` (`Button`, `Dialog`, `Card`) — the shadcn
  registry is the registry for those, and they are listed above only to prevent re-adding.
  A registry entry is for something *we* built, including a thin wrapper around a primitive
  when the wrapper carries real project behaviour
- One-off layout wrappers used in a single file
- Anything under `src/app/**`. Pages and routes are not reusable UI; they belong in
  `user-flow.md`.

Related: [`ui-rules.md`](./ui-rules.md) · [`ui-tokens.md`](./ui-tokens.md)
