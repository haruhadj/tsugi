# UI Rules

How the interface behaves, so that behaviour is never invented per-component. Values live in
[`ui-tokens.md`](./ui-tokens.md); screens live in [`user-flow.md`](./user-flow.md).

## Composition

- Reach for a DaisyUI component class before writing utilities: `btn`, `input`, `modal`,
  `card`, `badge`, `loading`, `alert`, `kbd`.
- Tailwind utilities are for **layout and spacing only** — flex, grid, gap, padding, width.
  If a utility is setting a colour, a radius, or a font size on a DaisyUI component, it is
  probably fighting the theme.
- Never restyle a DaisyUI component to look like a different DaisyUI component. Use the
  other one.

## Every interactive element has four states

Default, hover, focus-visible, disabled. Loading is a fifth where an action is async.
A control missing focus-visible is not finished — keyboard users are how this product gets
used fastest, and speed is the whole promise.

- Focus rings come from DaisyUI. Never `outline-none` without an explicit replacement.
- Disabled controls stay in the DOM and keep their position. Never hide a control to
  disable it — the layout must not move as the form becomes valid.

## Loading

- **Inline, never global.** No full-page spinner on the create path.
- Typeahead: a `loading loading-sm` inside the input's trailing slot. The input never
  becomes disabled while searching.
- Submit: `btn` with `loading` and disabled, keeping its label and therefore its width.
  A button that resizes on click reads as a bug.
- Skeletons only where a known-size block is being filled. Never for something whose height
  is unknown — a skeleton that resizes is worse than a blank space.

## Errors

Three tiers, and picking the wrong one is the most common UI mistake here:

| Situation | Treatment |
|---|---|
| Field-level (comment too long) | Inline under the field, `text-error text-sm`. No alert. |
| Recoverable action failure (429, create failed) | DaisyUI `alert alert-warning` **inside the form**, form state preserved. |
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
- Closable with Escape, with the backdrop, and with a visible control. All three.
- Focus moves into the modal on open and returns to the trigger on close.
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

- Semantic elements first. A `div` with an onClick is never a button.
- The typeahead is a listbox: `role="listbox"`, `aria-activedescendant`, and results
  announced via a polite live region.
- The score input is a radio group, not a row of buttons — arrow keys must move between
  values. Its shape follows the user's format: ten options for `POINT_10`, five stars for
  `POINT_5`, three smileys for `POINT_3`, a number field for `POINT_100`.
- **`POINT_3` scores have no numeric rendering.** They are smileys with text alternatives
  ("liked it", "it was fine", "disliked it"). Printing `2/3` is a bug on every surface.
- Every score display names its scale — `87/100`, `4/5`, `8.7/10`. A bare number is
  ambiguous between five formats and invites the reader to guess wrong.
- The provider toggle is a radio group too, labelled as a group ("Search source"). Two
  buttons where only one can be active is a radio group, and screen-reader users must be
  able to tell which source is selected before they start typing — it changes what the
  results mean.
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
  `bg-accent`.

Related: [`ui-tokens.md`](./ui-tokens.md) · [`ui-registry.md`](./ui-registry.md)
