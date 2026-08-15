# UI Registry

What already exists, so it is never rebuilt.

**Read this before building any component. Update it in the same change that adds one** —
not at the end of the phase, not "when convenient". An unregistered component gets rebuilt
within a week, and then there are two.

## Status

Eleven components built. Everything else is still planned, carried from the phase specs in
`planning/`. **Planned is not built.** Move a row into "Built" only when the component
exists, is used, and its props are accurate here.

## Built

| Component | File | Props | Used by | Notes |
|---|---|---|---|---|
| `Wordmark` | `src/components/Wordmark.tsx` | `size?: "sm" \| "lg"`, `className?: string` | `page.tsx`, `(auth)/sign-in`, `(settings)/settings` | **Server component.** The eyecatch lockup — `次` + wordmark over the bar that wipes in. Carries the whole visual direction, which is why everything around it stays quiet. The kanji is `aria-hidden` and resolves from the reader's own CJK font stack; never the sole name of the product on a screen |
| `SignInButtons` | `src/components/SignInButtons.tsx` | none | `(auth)/sign-in/page.tsx` | Client component. AniList/MAL call `authClient.signIn.oauth2({ providerId })`; Google button renders `disabled` — not wired into `auth.ts` yet ("google later"). Per-button pending state, not a page-level flag: `disabled` + a `Loader2Icon` beside the label, since shadcn's Button has no `isPending` |
| `ProviderConnections` | `src/components/ProviderConnections.tsx` | none | `(settings)/settings/page.tsx` | Client component. Fetches linked providers via `authClient.listAccounts()`; AniList/MAL link via `authClient.oauth2.link()` — **not** `linkSocial()`, which is for built-in social providers only (found while implementing; the blueprint's prose used "linkSocial" loosely for both). Owns the product's only sign-out control. "Linked" is signalled three ways — colour, icon, word |
| `ProviderToggle` | `src/components/ProviderToggle.tsx` | `value: Provider`, `onChange: (provider: Provider) => void` | `RecBuilder` (Phase 5, pending) | Client component. Labelled `fieldset`/`RadioGroup` (not `Tabs` — ui-rules.md § Accessibility), AniList/MyAnimeList. Controlled by the parent; owns only `localStorage` persistence under `tsugi:search-provider`, reading it once on mount and calling `onChange` if it differs from the initial `value`, then writing every subsequent `value` change back. Does **not** own selection state itself — parent must apply the mount-time correction via `onChange` |
| `MediaSearchInput` | `src/components/MediaSearchInput.tsx` | `provider: Provider`, `mediaType: MediaType`, `onSelect: (result: UnifiedMediaResult) => void`, `onSwitchProvider: (provider: Provider) => void` | `RecBuilder` (Phase 5, pending) | Client component. `Popover` + `Command` combobox (D42). 250ms-debounced typeahead, 2-character floor, calls `searchMedia` directly from the browser (both provider clients are plain unauthenticated `fetch`, confirmed safe — `PHASE-3.md`). Spinner sits in the input's trailing slot without disabling it. Three-tier errors: `rate_limited` shows a quiet "searching too fast" sentence with no switch offer; `unavailable`/`timeout` shows a quiet sentence plus a one-tap switch-provider button that calls `onSwitchProvider` and re-runs the same query against the other provider. Owns **only** query text and search-result state — it does not own the selected result or the active provider; the parent (`RecBuilder`) must clear its own selection whenever `provider` changes, since a provider switch must never let a stale `(provider, externalId)` pair survive (criterion 22) |
| `ScoreInput` | `src/components/ScoreInput.tsx` | `scoreFormat: ScoreFormat`, `value: number \| null`, `onChange: (value: number) => void`, `id: string` | `RecBuilder` (Phase 5, pending) | Client component. Fully controlled — owns no state of its own. Shape follows `scoreFormat` per ui-rules.md § Accessibility: `POINT_10`/`POINT_5`/`POINT_3` render as a `RadioGroup` of ≥44px labelled targets (`peer` + `sr-only` radio pattern) that wrap and never scroll horizontally; `POINT_5` targets show a filled `StarIcon` up to the option's value, `POINT_3` targets show a smiley glyph with a screen-reader-only text alternative from `formatScore` (never a bare number — D28). `POINT_100` and `POINT_10_DECIMAL` render as a single numeric `Input` (`type="number"`, correct `step`/`min`/`max`) instead of 91–100 radio targets, since ui-rules.md only prescribes a radio group for the three small discrete scales and calls for "a number field" once the scale gets that large; `POINT_10_DECIMAL` was extended to the same treatment by the same reasoning. Options and bounds come from `src/lib/score.ts` (`scoreOptions`, `SCORE_FORMAT_BOUNDS`); every option's accessible name is `formatScore(option, scoreFormat)` |
| `ScoreBadge` | `src/components/ScoreBadge.tsx` | `scoreRaw: number`, `scoreFormat: ScoreFormat`, `className?: string` | `RecBuilder`, `ScoreInput` sibling surfaces — tray/public page/dashboard (Phase 5–8, pending) | **Server component** (no `"use client"` — pure display). Thin wrapper around shadcn `Badge` (`variant="secondary"`); its only job is calling `formatScore(scoreRaw, scoreFormat)` from `src/lib/score.ts` so POINT_3 always renders its text label ("liked it") and every other format always names its scale (`87/100`), never a bare number (D28) |
| `MediaCover` | `src/components/MediaCover.tsx` | `src: string \| null`, `title: string`, `width: number`, `height: number`, `className?: string` | `ItemTray`, `RecView` (Phase 5–6, pending) | Client component (needs `onError` to catch 404s). `next/image` wrapper, explicit `width`/`height` always required (no layout shift — ui-rules.md § Images). `alt` is always `title`, never a generic "cover image". Missing (`src === null`) or failed-to-load covers both render the same designed placeholder — a muted rounded box with a centered `ImageIcon`, `role="img"` + `aria-label={title}` so it still announces what's missing rather than reading as decorative. Remote hosts (`s4.anilist.co`, `cdn.myanimelist.net`) are already in `next.config.ts` `images.remotePatterns` |
| `ItemTray` | `src/components/ItemTray.tsx` | `items: TrayItem[]`, `onChange: (items: TrayItem[]) => void`, `scoreFormat: ScoreFormat` | `RecBuilder` (Phase 5, pending) | Client component. Fully controlled, owns no item-list state — mirrors `ScoreInput`/`ProviderToggle`. `TrayItem = UnifiedMediaResult & { scoreRaw: number \| null; comment: string }`; display fields (`title`, `coverImage`, `year`) are client-only and never reach the wire, matching `itemSchema` in `rec.ts` (no `title`/`position` field — order is array-order, per-item free text is `comment` not "note" despite `user-flow.md`'s mockup prose). Each row: `MediaCover` thumbnail, inline `ScoreInput`, a `comment` `Input` (280-char cap), and move-up/move-down/remove `Button`s — keyboard-operable per ui-rules.md § Accessibility, drag is not implemented since the spec only requires it as an optional enhancement. Remove has no confirmation (ui-rules.md, immediate + reversible by re-adding). Renders an `Items (n/{MAX_ITEMS})` header so the 10-cap (D36) is always visible. Does **not** own adding items or refusing the eleventh — `MediaSearchInput`'s `onSelect` in `RecBuilder` appends, and `RecBuilder` must gate that call using the exported `canAddItem(items)` helper (also exported: `MAX_ITEMS = 10`) |
| `RecBuilder` | `src/components/RecBuilder.tsx` | `scoreFormat: ScoreFormat` | `src/app/page.tsx` (Phase 5, pending) | Client component. Composes `ProviderToggle` + `MediaSearchInput` + `ItemTray` + caption/comment `Input`s (caption 120-char cap, comment 280-char cap group-level — both reuse the plain shadcn `Input`, matching `ItemTray`'s own per-item `comment` field rather than adding a `textarea` primitive). Owns `provider`, `items`, `caption`, `comment`, `submitting`, and `error` state. `MediaSearchInput.onSelect` appends straight into the tray (gated by `canAddItem`, deduped on `(provider, externalId)`) — there is no separate "pending selection" staging state, so a provider switch mid-search can never leave a stale pair to submit (criterion 22). Maps `TrayItem[]` to `CreateRecItem[]` via a local `toWireItem`, dropping display-only fields. Client-side pre-checks the D27 "at least one score or comment, at group or item level" invariant before POSTing, to surface a friendly message instead of relying solely on the server's 400. POSTs to `/api/recs`; on 201 builds the public `/r/[slug]` URL and stores it as `shareUrl` state, rendering `ShareModal` open over that URL instead of navigating away; on 429/401/other renders the matching error inline |
| `ShareModal` | `src/components/ShareModal.tsx` | `open: boolean`, `onOpenChange: (open: boolean) => void`, `url: string`, `text?: string` | `RecBuilder` (Phase 5) | Client component, `Dialog` wrapper. Bottom sheet under `sm`, centred dialog at/above `sm` via a className override on `DialogContent` (`bottom-0 top-auto … sm:top-[50%] sm:translate-y-[-50%]`) — inherits shadcn's own `sm:` breakpoint on `DialogContent` rather than introducing a third project breakpoint. Auto-copies `url` to the clipboard on open (state reset happens during render via an `open`-vs-`prevOpen` comparison, per React's "adjusting state when a prop changes" pattern, to keep the async `navigator.clipboard.writeText` call — the actual side effect — inside `useEffect` without a lint-flagged synchronous `setState` in the effect body); a `role="status" aria-live="polite"` region reports "Link copied!" on success or "Copy your link" on failure/denial, never claiming success it didn't have. Renders the URL in a read-only selectable `Input` plus a manual Copy fallback `Button`, X and WhatsApp buttons (`asChild` around `<a target="_blank">`, built by `buildXShareUrl`/`buildWhatsAppShareUrl` in `src/lib/share.ts`), a Discord button that only ever copies a formatted message (`buildDiscordMessage`) and labels itself "Copy for Discord" → "Message copied" — never "share" or "open" language, since Discord has no public web share intent — and a quiet "View it" link. Never blocks on a network call; everything it displays already exists by the time it opens |

## shadcn primitives present

Added by `bun x shadcn@4.16.2 add`, living as editable source in `src/components/ui/`.
**These are not registry components** (see "Not components" below) — the list exists only so
nobody re-adds one that is already here.

`button` · `card` · `separator` · `popover` · `command` · `dialog` · `radio-group` · `input` ·
`badge` · `alert` · `label`

`dialog` arrived as a transitive dependency of `command` (`bun x shadcn add command popover`,
2026-08-15) — now used directly by `ShareModal`.

`card` is currently unused by application code — the eyecatch card is hand-composed in the
pages, because it carries `.eyecatch-edge` and the foot bar. If a third screen needs that
composition, promote it to a real registry component rather than copying it again.

## Planned

| Component | File | Phase | Responsibility |
|---|---|---|---|
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

**`MediaSearchInput` builds on shadcn's `Combobox`** (`Popover` + `Command`). It was specced
as a HeroUI `Autocomplete`; Radix has no combobox, so the underlying `cmdk` dependency was
proposed and approved (**D42**, `tech-stack.md`). See `ui-rules.md` § Accessibility.

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
