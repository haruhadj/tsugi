# UI Tokens

**The only source of visual values.** A hardcoded hex anywhere in `src/components` is a bug,
even when it looks right — it is the thing that makes "change the theme without touching a
component" false, and nobody notices until one button is the wrong colour.

Rewritten on 2026-08-17 (**D45**) to match the AI Studio prototype, replacing the violet
"Eyecatch" palette that **D41** had established, and rewritten again on 2026-08-22 (**D57**)
around the project logo (`public/logo.png`). If you find `#6C63FF`, `bloom`, `text-bloom`,
`.eyecatch-bar`, `.eyecatch-edge`, or a 2px `--radius`, it is from the Eyecatch era. Older
leftovers still worth recognising: `bg-accent` used as *the* accent and `data-theme="dark"` are
HeroUI, pre-**D41**. `#09090B`/zinc-950 as *the* ground and rose as the only accent are D45's
"Curation Desk", pre-**D57** — it now survives only as the `rose` colour scheme (below).

## The direction

Tsugi's ground and accents are sampled straight from the logo: a deep indigo-navy workspace
with a violet-purple accent and a warm gold counter-accent, soft-rounded panels, and score
tiers that carry their own meaning in colour.

This is a direction, not a mood board. It cashes out as four rules:

1. **The ground is a colour, not a neutral — but still just the ground.** `--background` is
   the logo's navy. Chroma-bearing content — the purple accent, the gold pick, a green score —
   still has to read as content or action against it, never disappear into it as more chrome.
2. **Two accents, unequal.** `primary` (violet-purple) is the action colour. `highlight` (gold)
   is the counter-accent: the brand gradient's far end, and the one "editor's pick" mark per
   surface. It is not a second button colour.
3. **Radius is 12px, and panels go further.** Cards are `rounded-2xl`/`rounded-3xl`, pills and
   badges are `rounded-full`. Nothing in this system is hard-edged.
4. **Separation comes from surface, hairline, and — on the artifact — shadow.** `--card`
   against `--background` plus a 1px `--border` does most of it; `/r/[slug]`'s card is the one
   place a real shadow is spent, because it is the one real card.

## How theming works here

Tailwind 4 and shadcn are configured in CSS. There is no `tailwind.config.ts`.

`src/app/globals.css` owns the whole visual layer:

```css
@import "tailwindcss";      /* required — nothing else pulls Tailwind in any more */
@import "tw-animate-css";
```

**Tsugi ships one theme, with six selectable colour schemes on top (D56, D57).** The base
palette is defined on `:root, .dark` together — on `:root` so it applies unconditionally, and
repeated under `.dark` (which `<html>` carries) so shadcn components' own `dark:` variants
resolve against the same values instead of falling through to a light palette that does not
exist. Deleting either selector half-breaks the page in a way that only shows on the few
components that use `dark:`.

A colour scheme is a `:root[data-palette="X"], .dark[data-palette="X"]` block layered after the
base one. `raiden` (**default**, no attribute needed — it's what the base block above already
renders) and `rose` (the retired D45 "Curation Desk" direction) each override the full ground —
`--background`/`--card`/`--border`/`--muted`/etc — because each represents a distinct visual
identity, logo vs. not. The other four (`indigo`, `emerald`, `violet`, `sky`) are deliberately
narrower: layered on whichever ground is currently active, they only ever override
`--primary`/`--primary-foreground`/`--ring`/`--highlight`/`--highlight-foreground` — a scheme is
"which two accents", not a new visual system. The score-tier ramp (invariant 6) never moves in
any scheme. Picked in Settings (`ColorSchemeField`), stored in a plain `tsugi-palette` cookie
(per-browser, not per-account — there's no server round trip), applied by a render-blocking
inline script in `RootLayout` before hydration so switching schemes never flashes the default
on the next load. `src/lib/palette.ts` is the catalogue — id, label, and the two swatch hexes —
that both the CSS and the picker read from.

## Colour — semantic names only

Every token is exposed through Tailwind's theme layer by the `@theme inline` block, so each is
an ordinary utility: `bg-background`, `text-muted-foreground`, `border-border`, `text-primary`.

Use the semantic token. Never the underlying value.

Hex below is the **exact** sRGB equivalent of the `oklch()` in `globals.css` — not an
approximation, sampled directly from `public/logo.png` for the ground/accent rows.

**Two files copy this column** and must be changed with it: the OG card
(`src/app/r/[slug]/opengraph-image.tsx`) and the downloadable card (`src/lib/canvasExport.ts`).
Neither Satori nor canvas can parse `oklch()`. Nothing fails to build when they drift — the
shared card just stops matching the site.

| Token | Hex | Use for |
|---|---|---|
| `background` | `#101434` | page ground — the logo's navy |
| `card` / `popover` | `#181C40` | raised surfaces — panels, the modal |
| `foreground` | `#FAFAFA` | body text |
| `muted-foreground` | `#9CA0C4` | secondary text — metadata, helper lines, view count |
| `muted` / `secondary` | `#2A2F5C` | quiet chrome, secondary buttons |
| `accent` / `accent-foreground` | `#2A2F5C` | **hover surfaces only** — not the accent colour |
| `primary` | `#9A66E0` | the one action that matters on a screen — the logo's purple |
| `primary-foreground` | `#FAFAFA` | text on `primary` |
| `highlight` | `#D0B070` | the gold counter-accent — gradient end, "pick" marks |
| `success` | `#10B981` | confirmed / connected / saved. Never a button, never a score |
| `border` | `#262B54` | borders, dividers |
| `input` | `#3A3E68` | input outlines |
| `ring` | `#9A66E0` | focus rings — aliased to `primary` |
| `destructive` | `#EF4444` | destructive actions only, never decoration |

**Score tiers.** The only place score colour is defined. A score's band comes from
`scoreTier()` in `src/lib/score.ts`, which derives it from the `(raw, format)` pair — never
from comparing a bare number, which would put 8/10 and 8/100 in the same band (invariant 6).

| Token | Hex | Band |
|---|---|---|
| `score-excellent` | `#10B981` | top 15% of the scale |
| `score-good` | `#6366F1` | 65–85% |
| `score-fair` | `#F59E0B` | 40–65% |
| `score-poor` | `#F43F5E` | bottom 40% |
| `score-unrated` | `#A1A1AA` | no score — `(null, null)` |

Colour here is **decoration on top of text, never instead of it**: every `ScoreBadge` also
spells out its value and scale, so the badge survives colour-blindness and high-contrast modes.

**Directional and brand tokens.** `upvote` (`#F43F5E`) and `downvote` (`#6366F1`) only have to
be told apart — rose is not "good" and indigo is not "bad". `anilist` (`#0EA5E9`) and `mal`
(`#6366F1`) identify a provider and are never used as UI accents.

```html
<!-- yes -->
<div class="bg-card text-foreground border-border">

<!-- no — both of these break retheming -->
<div style="background:#14132B">
<div class="bg-[#14132B]">
```

**One primary action per screen.** If two things are `bg-primary`, neither is primary.

**Note the reversal from the HeroUI era.** There, `primary` was the token that did not exist
and `accent` was the real accent. It is now exactly the other way round: `primary` is the
accent, and `accent` is a quiet hover surface. This is the single most likely leftover.

## Signature utilities

Two utilities in `globals.css` carry the direction. They exist as tokens rather than as piles
of utilities reassembled per screen, because the signature has to be identical everywhere.

| Utility | What it is |
|---|---|
| `.brand-gradient` | Rose→amber at 135°. The wordmark's mark, the rule across the top of a card, the active-nav underline. |
| `.tint` | The badge recipe: 15% fill of `--tint`, that colour as text, a 30% border. Set `--tint` to any token instead of writing the three opacity utilities out again. |

**The badge recipe is the system's most repeated shape.** Every chip, pill, and status badge
is a 15% fill / full-strength text / 30% border of one token. Where the token is known at
build time, write it out (`bg-primary/15 text-primary border-primary/30`) so Tailwind can see
the class names — an interpolated `bg-${token}/15` emits nothing.

## Type

Three faces, three roles, loaded via `next/font/google` in `layout.tsx` as variable fonts.

| Role | Face | Class | Use |
|---|---|---|---|
| Display | **Unbounded** 600/800 | `font-display` | Headlines, the wordmark, card titles, section headings. Tight tracking (`-0.02em` to `-0.035em`). Not uppercase — that was the Eyecatch era (**D45**). |
| Body | **Inter Tight** variable | `font-sans` (default) | Prose, helper text, button labels. |
| Utility | **JetBrains Mono** 400/500/600/700 | `font-mono` | Scores, eyebrows, captions, tier letters, vote counts, slugs, metadata. Wide tracking (`0.2em`–`0.3em`) when uppercase. 600/700 are loaded because the redesign sets scores and counts in bold. |

**Scores are always mono.** A score is the only real data the product carries; setting it in
the body face makes it read as prose.

Headline sizes use `clamp()` rather than breakpoint jumps — `clamp(2.6rem, 7vw, 4.75rem)` on
the hero, `clamp(1.9rem, 5vw, 2.75rem)` on a page title. Body text uses the standard scale:
`text-xs` metadata, `text-sm` secondary, `text-base` body.

Weights: `font-extrabold` for display headlines, `font-bold` for card and item titles, normal
for prose, `font-semibold`/`font-bold` for mono numerals. Nothing else.

## Spacing

The 4-point scale, restricted to `1 · 2 · 3 · 4 · 6 · 8 · 12 · 16`. Values outside it need a
reason in a comment. Vertical rhythm inside a card is `gap-3`; between sections it is `gap-8`.

Cards are padded `p-4`/`p-5` for rows and `p-6 sm:p-10` for the artifact. Padding is uniform —
the asymmetric left inset existed only to clear `.eyecatch-edge`, which is gone (**D45**).

## The rundown — lists of lists

`/feed` and `/dashboard` show many lists at once, and both are **card-based**: each row is its
own `rounded-2xl border border-border bg-card/60` panel, in a `gap-3` stack.

> This reverses the "one surface, hairline-divided rows — never per-row cards" rule that stood
> until **D45**. That rule existed to protect the cyan `bloom` accent from being spent twenty
> times on one screen; with `bloom` gone there is nothing left for it to protect.

**The feed has three densities**, a client-side toggle that is deliberately *not* a URL param —
it is a reading preference, not part of what the page is showing, so a shared `/feed` link must
not carry it. Sort, category, and page all do live in the URL.

| Density | Shape |
|---|---|
| `stream` | The default, and the only one shaped twice — see below |
| `compact` | One row: single thumbnail, title, inline meta, horizontal vote pill |
| `grid` | Two-up cards with a fanned, overlapping cover stack |

**The toggle is `md` and up only** (**D58**). On a phone the stream card already *is* the
compact reading, so offering three densities there was offering the same thing twice.

**`stream` is two shapes on one component.** Below `md` it is a Reddit-style compact card:
edge-to-edge, divided by a hairline rather than boxed, one metadata line (category ·
`u/handle` · relative age), a two-line title, a lead cover as a right-hand thumbnail, and a bar
of 44px action pills. From `md` it opens back out into the original card — chip row, caption,
genre links, the full filmstrip, and a bordered `bg-card/60` panel.

Write this as responsive classes on one component, never as two components with one hidden:
the card owns `VoteButtons`, and two mounted copies are two optimistic state machines that
diverge on the first click. Hiding the filmstrip with `md:` is free — `next/image` lazy-loads,
and a `display: none` element never intersects the viewport.

**The card is link-overlaid below `md` only**, via `md:after:content-none`. The compact card
sheds the genre chips, the filmstrip and the copy button, which is what makes a card-wide
target safe there and not above it. See `ui-rules.md` § Accessibility, and note that everything
in the action bar needs `OVER_LINK_OVERLAY`.

**The gutter.** `/dashboard` rows open with a fixed-width mono column carrying `Live` / `Draft`
— the one datum true of every row on that screen that the row's own title cannot say. Dashboard
rows are not ranked, and inventing a rank there would be decoration pretending to be
information.

`/feed` no longer has one. It carried the slot number (`01`, `02`, …) until **D51** removed it;
the pagination link's "Slot 41 onward" copy is the last trace of it. Only put something in the
gutter that is genuinely uniform and genuinely data — if neither is true for a new surface,
leave the gutter out rather than filling it.

**The artifact still outranks the rundown.** `/r/[slug]` is the only surface that gets
`rounded-3xl`, a real `shadow-xl`, and the `.brand-gradient` rule across its top. The rundown
runs quieter so that arriving at a list feels like arriving somewhere.

**Two nav axes, two forms.** Sort is a small closed set, so it is a row of pills with
`bg-secondary` on the active one. Category is an open-ended filter over a list that grows with
the data, so it is a sidebar directory with a live count per row. Making them look alike
implies they are the same kind of choice; they are not.

**The pill-group is this system's switcher.** Density, view mode, comment sort, and dashboard
filter all use the same shape: `rounded-full border border-border bg-secondary/40 p-0.5`
wrapping buttons that take `bg-primary text-primary-foreground` when active. Each group is a
`role="group"` with an `aria-label`, and each button carries `aria-pressed`.

## Radius and elevation

`--radius: 0.75rem`, up from 2px (**D45**). `--radius-sm` through `--radius-3xl` all derive
from it, so every shadcn component follows from that one line. Do not set `rounded-lg` by hand
on a shadcn component; change `--radius`.

Above the derived scale, the app uses three shapes directly:

| Shape | Where |
|---|---|
| `rounded-full` | Pills, badges, chips, avatars, vote controls, and every button in a switcher group |
| `rounded-2xl` | Row cards on the feed and dashboard, panels, sidebar sections |
| `rounded-3xl` | The artifact card on `/r/[slug]`, and the share modal at `sm` and up |

Elevation is two steps: `shadow-xl` on the artifact card and the sign-in card, the modal's own
shadow, and nothing anywhere else. Everything else separates with `card` against `background`
and a 1px `border`.

The ambient glow on `body` — two fixed radial gradients, rose from the upper left and amber
from the lower right — is the room's lighting. It is `background-attachment: fixed` on purpose,
so it belongs to the page rather than the scroll position. Do not add a third light source.

## Motion

One orchestrated entrance, then nothing.

- `animate-wipe-in` — clips in from the left, 620ms. First paint only. (Retained from the
  Eyecatch era but currently unused; the bar it animated is gone.)
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

**`src/lib/canvasExport.ts` is a second copy of the same exception.** It draws the same card
to a `<canvas>` so the reader can save it as a PNG, and canvas needs literal colours for the
same reason Satori does. Three files therefore carry the palette — `globals.css`, the OG route,
and the canvas exporter — and a rebrand has to touch all three by hand. Nothing fails to build
when they drift; the shared card just stops matching the site.

The card should read as the site does: zinc ground, the rose→amber rule across the top, the
title in a heavy face, the score in mono, covers fanned along the bottom.

**Satori does not understand `oklch()`.** `globals.css` authors the palette in `oklch()` with
the hex in a comment beside each — use the hex there, and keep the `oklch()` in a comment so
the two can be compared later.

Related: [`ui-rules.md`](./ui-rules.md) · [`ui-registry.md`](./ui-registry.md)
