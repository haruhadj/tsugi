# UI Rules

How the interface behaves, so that behaviour is never invented per-component. Values live in
[`ui-tokens.md`](./ui-tokens.md); screens live in [`user-flow.md`](./user-flow.md).

## Composition

- Add a shadcn component before writing markup: `bun x shadcn@4.16.2 add button card
  separator dialog input badge alert skeleton tooltip radio-group …`. Do not hand-write
  something the registry already ships.
- **shadcn components are source, not a dependency.** They land in `src/components/ui/` and
  are edited in place. If `Button` needs a variant, add it to `buttonVariants` — do not wrap
  the component to override it from outside, and do not fork it into a second button.
- Tailwind utilities carry layout, spacing, **and type** here — that is the difference from
  the HeroUI era, where utilities were layout-only because the library owned typography.
  Colour is still tokens-only: a `bg-[#…]` on a shadcn component is always wrong.
- Never restyle a shadcn component to look like a different one. Use the other one.
- **Most shadcn primitives are plain functions and render fine in a Server Component** —
  `Button` only becomes client code when you hand it an `onClick`. This is a real gain over
  HeroUI, where any component pulled a page into the client tree, and `/sign-in` prerenders
  as fully static proof of it. (`/` itself became dynamic on 2026-08-11 for an unrelated
  reason — it reads the session cookie — so don't cite its route type here; see
  `code-standards.md`.) Keep `"use client"` on the smallest interactive leaf; the rule there
  is now cheap to follow rather than load-bearing.

## Every interactive element has four states

Default, hover, focus-visible, disabled. Loading is a fifth where an action is async.
A control missing focus-visible is not finished — keyboard users are how this product gets
used fastest, and speed is the whole promise.

- Focus rings come from the `ring` token, which is aliased to `primary`. shadcn's components
  ship `focus-visible:ring-ring/50 focus-visible:ring-[3px]` — keep it. Never `outline-none`
  without an explicit replacement.
- Disabled controls stay in the DOM and keep their position. Never hide a control to
  disable it — the layout must not move as the form becomes valid.

## Loading

- **Inline, never global.** No full-page spinner on the create path.
- Typeahead: a small spinner in the input's trailing slot. The input never becomes
  disabled while searching.
- **Submit: there is no `isPending` prop.** shadcn's `Button` is a plain `<button>` with
  variants — pending state is `disabled` plus a `<Loader2Icon className="animate-spin" />`
  rendered *beside* the label, never replacing it, so the button keeps its width. A button
  that resizes on click reads as a bug. Own the pending state **per control**, not per page:
  see `SignInButtons`, where two tracker buttons must not both look busy.
  (HeroUI's inherited `isPending`/`onPress`/`isDisabled` are gone — **D41**. `onPress` on a
  shadcn button silently does nothing, because it is not a DOM event.)
- Skeletons only where a known-size block is being filled. Never for something whose height
  is unknown — a skeleton that resizes is worse than a blank space.

## Errors

Three tiers, and picking the wrong one is the most common UI mistake here:

| Situation | Treatment |
|---|---|
| Field-level (comment too long) | Inline under the field, `text-error text-sm`. No alert. |
| Recoverable action failure (429, create failed) | shadcn `Alert` (`variant="default"`, warning styling from tokens) **inside the form**, form state preserved. |
| Provider unavailable (AniList unreachable) | Quiet inline sentence in the results area, naming the source, offering the one-tap switch. Not an alert. Not red. |
| Provider **rate-limited** (AniList's own 30/min) | Also quiet and inline, but a **different sentence** — "searching too fast, one moment" — and **no switch offer**. Waiting fixes it; changing provider does not, and would send someone to Jikan for nothing. |

Rules that hold across all three:
- Never destroy user input to display an error. A lost 280-character comment is a worse
  outcome than the error being explained badly.
- Never show a raw provider message, HTTP status, or stack trace.
- An empty search result is **not** an error. "No matches" is normal and gets normal
  styling.

## Forms

- The primary action is enabled only when the form is genuinely submittable — **at least one
  item in the tray, and at least one score or one comment anywhere in the group** (invariant
  8). Scores are optional per item (**D27**); requiring one on every title would be friction
  on a group of eight. Disabled state is honest: it never accepts a click and then complains,
  and it states the reason inline.
- The comment field shows a live counter as it approaches 280 and hard-stops at it. It must
  never be possible to type a comment the server will reject.
- Enter submits from the comment field. Enter selects from the typeahead. These do not
  conflict, because the typeahead owns Enter only while its list is open.
- Autofocus the search input on mount. This is the one autofocus in the product, and it is
  justified: the user came here to type.

## Modals

- One at a time. Never stack.
- Closable with Escape, with the backdrop, and with a visible control. All three — shadcn's
  `Dialog` (Radix) gives the first two; the visible control is ours to include.
- Focus moves into the modal on open and returns to the trigger on close. Radix handles
  this; do not reimplement it, and do not fight it with a stray `autoFocus`.
- The ShareModal never blocks on a network call — by the time it opens, everything it
  displays already exists.

## Images

- Media covers use `next/image` with explicit `width`/`height`. Provider art has wildly
  inconsistent dimensions; unsized images cause layout shift on exactly the screen where
  speed is being judged.
- Every cover needs a real `alt` — the media title, not "cover image".
- Remote hosts must be listed in `images.remotePatterns` (`s4.anilist.co`,
  `cdn.myanimelist.net`). A missing entry fails the render, not just the image.
- Covers can 404 or be absent from provider data. A placeholder is required, and it is a
  designed state, not a broken image icon.
- Inside the OG card there is no `next/image` — Satori takes plain `<img>` with an absolute
  URL.

## Responsive

Mobile-first; the share flow is a phone flow. Two breakpoints only, `md` and `lg` — a third
is a sign a layout is being over-fitted.

- Touch targets ≥44 px. The score picker is the risk, and its width depends on the user's
  format: `POINT_10` puts ten targets in a row, which will not fit a small screen. It wraps;
  it does not shrink below 44 px and it does not scroll horizontally.
- The ShareModal is a bottom sheet under `md`, a centred dialog above it.

## Accessibility

**Most of this is still the library's job** — Radix, rather than React Aria, since **D41**.
Radix implements the listbox semantics, the radio-group roving tabindex, the focus management,
and the live-region plumbing that this section used to specify by hand. The rules below
survive as *requirements* — what must be true — not as instructions to build the mechanics
yourself. If a rule here is satisfied by using the right component, use it.

**One capability did not transfer, and Phase 5 has to deal with it.** HeroUI shipped an
`Autocomplete`; Radix has no combobox primitive. shadcn's answer is a `Combobox` composed
from `Popover` + `Command`, and `Command` is a wrapper around `cmdk`. `cmdk` was proposed per
the dependency rule in `AGENTS.md` and approved (**D42**, 2026-08-15, `tech-stack.md`) —
`MediaSearchInput` builds on `Popover` + `Command`.

- Semantic elements first. A `div` with an onClick is never a button.
- The typeahead is a listbox with a managed active option and results announced politely.
  `cmdk`'s `Command` gives this out of the box; do not fight it or replace its keyboard
  handling.
- The score input is a radio group, not a row of buttons — arrow keys must move between
  values. shadcn's `RadioGroup` (Radix) gives that. Its *shape* is still ours: ten options
  for `POINT_10`, five stars for `POINT_5`, three smileys for `POINT_3`, a number field for
  `POINT_100`.
- **`POINT_3` scores have no numeric rendering.** They are smileys with text alternatives
  ("liked it", "it was fine", "disliked it"). Printing `2/3` is a bug on every surface.
- Every score display names its scale — `87/100`, `4/5`, `8.7/10`. A bare number is
  ambiguous between five formats and invites the reader to guess wrong.
- The provider toggle is a radio group too, labelled as a group ("Search source"). Two
  buttons where only one can be active is a radio group, and screen-reader users must be
  able to tell which source is selected before they start typing — it changes what the
  results mean. shadcn's `Tabs` is **not** the right component here: this selects a data
  source for a search, not a view of the same content.
- Switching the source clears pending search results but **never the item tray**. Announce
  the clear in a live region; a silent reset would read as the app losing the user's work.
- The item tray is a reorderable list. Drag is an enhancement, never the only way — provide
  move-up / move-down controls that work from the keyboard.
- Removing an item is immediate and reversible by re-adding, so it needs no confirmation.
  **There is no discard-all control** — no phase builds one, and removing items individually
  is enough for a tray capped at ten (**D36**). If one is ever added it needs a confirmation,
  which is the same rule as deleting a recommendation in Phase 8.
- Copy-to-clipboard announces its result in a live region. A purely visual "Copied!" is
  invisible to the people most reliant on keyboard flow.
- Colour is never the only signal. The selected score carries a shape or a check, not just
  `bg-primary`. "Linked" in `ProviderConnections` is green **and** a check icon **and** the
  word. `ScoreBadge`'s tier colour sits on top of text that already names the value and its
  scale. `VotePill`'s active direction is colour **and** `aria-pressed` **and** a heavier icon
  stroke. Every switcher group (density, view mode, comment sort, dashboard filter) is a
  `role="group"` with an `aria-label`, and each button carries `aria-pressed`.
- **Do not strip Radix's built-in behaviour to match a mockup.** Removing a focus ring,
  suppressing an announcement, or replacing keyboard handling with click handlers undoes the
  main reason a primitive library is here. If the visual has to change, change the visual.
- The `次` glyph is decorative and `aria-hidden`. It resolves from the reader's own CJK font —
  none of the three loaded faces carry it — so it must never be the only thing naming the
  product on a screen.

Related: [`ui-tokens.md`](./ui-tokens.md) · [`ui-registry.md`](./ui-registry.md)
