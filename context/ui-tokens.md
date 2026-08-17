# UI Tokens

**The only source of visual values.** A hardcoded hex anywhere in `src/components` is a bug,
even when it looks right — it is the thing that makes "change the theme without touching a
component" false, and nobody notices until one button is the wrong colour.

Superseded the HeroUI palette on 2026-08-11 (**D41**). If you find `bg-accent` used as *the*
accent, `data-theme="dark"`, or an `oklch(12% 0.005 285.823)` anywhere, it is from that era.

## The direction — "Eyecatch"

Tsugi's screens are built on the **eyecatch**: the title card that punctuates an anime episode
half-way through. Hard-edged broadcast geometry, a deep violet night, and a two-tone screen
glow — a violet key light and a cyan rim. The product's whole output is a card you send
someone, so the site is made of that same card.

This is a direction, not a mood board. It cashes out as four rules:

1. **The ground is violet-black, not neutral black.** `--background` carries real chroma
   (`0.024`). A neutral grey-black reads as a generic dark theme and loses the direction.
2. **Two accents, unequal.** `primary` (violet) is the action colour. `bloom` (cyan) is
   punctuation — **one use per screen**, and never on a button.
3. **Radius is 2px.** Broadcast graphics are hard-edged. shadcn's stock `0.625rem` was
   deliberately overridden.
4. **Separation comes from surface and hairline, not shadow.** On a dark ground shadows read
   as murk. `--card` against `--background`, plus a 1px `--border`.

## How theming works here

Tailwind 4 and shadcn are configured in CSS. There is no `tailwind.config.ts`.

`src/app/globals.css` owns the whole visual layer:

```css
@import "tailwindcss";      /* required — nothing else pulls Tailwind in any more */
@import "tw-animate-css";
```

**Tsugi ships one theme.** The palette is defined on `:root, .dark` together — on `:root` so
it applies unconditionally, and repeated under `.dark` (which `<html>` carries) so shadcn
components' own `dark:` variants resolve against the same values instead of falling through
to a light palette that does not exist. Deleting either selector half-breaks the page in a
way that only shows on the few components that use `dark:`.

## Colour — semantic names only

Every token is exposed through Tailwind's theme layer by the `@theme inline` block, so each is
an ordinary utility: `bg-background`, `text-muted-foreground`, `border-border`, `text-bloom`.

Use the semantic token. Never the underlying value.

Hex below is the **exact** sRGB equivalent of the `oklch()` in `globals.css`, verified
against the compiled stylesheet on 2026-08-11 — not an approximation. Phase 6's OG card is
built from this column, so the two must stay in step.

| Token | Hex | Use for |
|---|---|---|
| `background` | `#0B0A14` | page ground — violet-black |
| `card` / `popover` | `#14132B` | raised surfaces — the eyecatch card, the modal |
| `foreground` | `#EDEAFF` | body text, faintly violet off-white |
| `muted-foreground` | `#8C87B0` | secondary text — metadata, helper lines, view count |
| `muted` / `secondary` | `#222136` | quiet chrome, secondary buttons |
| `accent` / `accent-foreground` | `#262543` | **hover surfaces only** — not the accent colour |
| `primary` | `#6C63FF` | the one action that matters on a screen |
| `primary-foreground` | `#F7F7FD` | text on `primary` |
| `bloom` | `#4CE0D2` | cyan punctuation — **once per screen** |
| `bloom-foreground` | `#001315` | text on `bloom` |
| `border` | `#2E2D44` | borders, dividers |
| `input` | `#36344E` | input outlines |
| `ring` | `#6C63FF` | focus rings — aliased to `primary` |
| `destructive` | `#EC3740` | destructive actions only, never decoration |

```html
<!-- yes -->
<div class="bg-card text-foreground border-border">

<!-- no — both of these break retheming -->
<div style="background:#14132B">
<div class="bg-[#14132B]">
```

**One primary action per screen.** If two things are `bg-primary`, neither is primary.

**`bloom` is a spice, not a colour.** It has exactly two jobs, and eyebrows are not one of
them (they were, in the first pass — three cyan things on the landing page, which is how a
spice becomes a colour):

1. **The mark** — the `次` in `Wordmark`, and the `.eyecatch-edge` / `.eyecatch-bar`
   terminus, which are the same mark by other means.
2. **Live data or state** — a score numeral, the "Linked" indicator. Never a static label.

Everything else that wants emphasis takes `muted-foreground` and earns its emphasis from
type and spacing instead. A screen with three cyan things has no cyan thing.

**Note the reversal from the HeroUI era.** There, `primary` was the token that did not exist
and `accent` was the real accent. It is now exactly the other way round: `primary` is the
accent, and `accent` is a quiet hover surface. This is the single most likely leftover.

## Signature utilities

Two utilities in `globals.css` carry the direction. They exist as tokens rather than as piles
of utilities reassembled per screen, because the signature has to be identical everywhere.

| Utility | What it is |
|---|---|
| `.eyecatch-bar` | The glowing violet→cyan rule. Pair with `animate-wipe-in` on first paint; static at the foot of a card. |
| `.eyecatch-edge` | The cyan scanline tooth down a card's leading edge. `absolute inset-y-0 left-0 w-1`. |

## Type

Three faces, three roles, loaded via `next/font/google` in `layout.tsx` as variable fonts.

| Role | Face | Class | Use |
|---|---|---|---|
| Display | **Unbounded** 600/800 | `font-display` | Headlines, the wordmark, card titles, section headings. Always `uppercase`, always tight tracking (`-0.02em` to `-0.035em`). |
| Body | **Inter Tight** variable | `font-sans` (default) | Prose, helper text, button labels. |
| Utility | **JetBrains Mono** 400/500 | `font-mono` | Scores, eyebrows, captions, step markers, metadata. Wide tracking (`0.2em`–`0.3em`) when uppercase. |

**Scores are always mono.** A score is the only real data the product carries; setting it in
the body face makes it read as prose.

Headline sizes use `clamp()` rather than breakpoint jumps — `clamp(2.6rem, 7vw, 4.75rem)` on
the hero, `clamp(1.9rem, 5vw, 2.75rem)` on a page title. Body text uses the standard scale:
`text-xs` metadata, `text-sm` secondary, `text-base` body.

Weights: `font-extrabold` for display headlines, `font-semibold` for smaller display, normal
for prose, `font-medium` for mono numerals. Nothing else.

## Spacing

The 4-point scale, restricted to `1 · 2 · 3 · 4 · 6 · 8 · 12 · 16`. Values outside it need a
reason in a comment. Vertical rhythm inside a card is `gap-3`; between sections it is `gap-8`.

Cards are padded `p-8 pl-10` (`sm:p-10 sm:pl-12`) — the extra left inset clears
`.eyecatch-edge`, which sits inside the card's own bounds.

## The rundown — lists of lists

The rules above were written when a screen held exactly one card, because the product was a
link generator. It is not any more: `/feed` and `/dashboard` show many lists at once. Applying
the card rules per row put ~20 cyan edges on one screen, which by the "spice, not a colour"
rule means the screen had no cyan at all. So there is a second layout form.

**One surface, not many cards.** A collection of lists is a single
`divide-y divide-border rounded-xs border border-border` list — hairline-divided rows. Rows get
no `bg-card`, no `.eyecatch-edge`, no `.eyecatch-bar`. Those stay reserved for `/r/[slug]`,
which is the artifact the product exists to make; the rundown runs deliberately quiet so that
arriving at a list feels like arriving somewhere.

**The gutter.** Every row opens with a fixed-width mono column. It carries the one datum that
is true of every row on that screen and that the row's own title cannot say:

- `/feed` — the slot number (`01`, `02`, …), zero-padded, `tabular-nums`, continuing across
  pages. It is the sort order made visible, so it must keep counting; page 2 opens at `21`.
- `/dashboard` — `Live` / `Draft`, since dashboard rows are not ranked and inventing a rank
  there would be a decoration pretending to be information.

Only put something in the gutter that is genuinely uniform and genuinely data. If neither is
true for a new surface, leave the gutter out rather than filling it.

**The one cyan thing.** On the rundown it is slot `01` only — `text-bloom` on the lead number
plus a 1px `.eyecatch-edge` tooth on that row alone. Nothing else on the screen is cyan, and
the foot of the rundown gets no `.eyecatch-bar`: the gutter is the signature, and a second glow
would split it.

**Two nav axes, two forms.** Sort is exactly one of two states, so it is one enclosed segmented
control (`divide-x`, bordered, `bg-secondary` on the active half). Category is a filter over an
open-ended set, so it is an underlined rail (`border-primary` active, `border-transparent`
inactive). Making them look alike implies they are the same kind of choice; they are not.

**Row padding** is `py-6 pr-6 pl-8` on `/feed` (the `pl-8` clears the lead row's edge tooth so
rows stay aligned) and `px-6 py-6` on `/dashboard`, which has no tooth.

## Radius and elevation

`--radius: 0.125rem`. shadcn derives `--radius-sm/md/lg/xl` from it, so every component follows
from that one line. Do not set `rounded-lg` by hand on a shadcn component; change `--radius`.

Elevation is one step: the modal's own shadow, nothing on anything else. Separation comes from
`card` against `background` and a 1px `border`.

The ambient glow on `body` — two fixed radial gradients, violet from the upper left and cyan
from the lower right — is the room's lighting. It is `background-attachment: fixed` on purpose,
so it belongs to the page rather than the scroll position. Do not add a third light source.

## Motion

One orchestrated entrance, then nothing.

- `animate-wipe-in` — the eyecatch bar clips in from the left, 620ms. First paint only.
- `animate-card-in` — content rises 12px and fades, 550ms, staggered with
  `[animation-delay:…]` for a second element.
- `transition-colors`/`transition-all` on interactive elements, ~150ms. shadcn's button
  ships this already.
- Nothing on the create path animates for longer than 200 ms. Perceived speed *is* the
  product.

**`prefers-reduced-motion` removes decorative motion only.** The media query in `globals.css`
kills `animate-wipe-in` and `animate-card-in` and collapses transitions — but deliberately
does **not** blanket-disable all animation, because that freezes every loading spinner into a
still icon and removes the one thing a spinner is for. If you add a decorative animation, add
it to that query by name.

## The OG card is not themed

`/r/[slug]/opengraph-image` renders through Satori, which does **not** run Tailwind or shadcn —
it takes inline styles only. Its palette is therefore hardcoded in that one file, and that is
the single sanctioned exception to the rule at the top of this document.

Match it to the hex values in the table above, and note in that file that it is a deliberate
copy. If the theme ever changes, this file must be updated by hand — the OG card is the one
place where a rebrand is not automatic.

The card should read as an eyecatch: violet-black ground, the scanline edge, the title in a
heavy face, the score in mono, the violet→cyan bar along the foot.

**Satori does not understand `oklch()`.** `globals.css` authors the palette in `oklch()` with
the hex in a comment beside each — use the hex there, and keep the `oklch()` in a comment so
the two can be compared later.

Related: [`ui-rules.md`](./ui-rules.md) · [`ui-registry.md`](./ui-registry.md)
