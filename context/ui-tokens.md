# UI Tokens

**The only source of visual values.** A hardcoded hex anywhere in `src/components` is a bug,
even when it looks right — it is the thing that makes "change the theme without touching a
component" false, and nobody notices until one button is the wrong colour.

## How theming works here

Tailwind 4 and HeroUI are configured in CSS. There is no `tailwind.config.ts`.

`src/app/globals.css` is **one line**:

```css
@import "@heroui/styles";
```

That file imports Tailwind itself. **Do not also `@import "tailwindcss"`** — that is a double
import, and it is the most likely way to get a confusingly broken build here.

HeroUI ships a light palette on `:root` and a dark one under `.dark` / `[data-theme="dark"]`.
Tsugi sets `data-theme="dark"` on `<html>` and uses the **dark palette unmodified**
(**Q3**, re-resolved after the move off DaisyUI — **D37**). Introducing a custom palette is a
design decision that needs a decision-log entry, not an edit to this file.

## Colour — semantic names only

HeroUI exposes its tokens through Tailwind's theme layer (`@theme inline` maps
`--color-background: var(--background)` and so on), so every token below is usable as an
ordinary utility: `bg-background`, `text-foreground`, `border-border`.

Use the semantic token. Never the underlying value.

| Token | Use for |
|---|---|
| `background` | page background |
| `background-secondary` / `overlay` | raised surfaces — cards, the search result list, the modal |
| `border` | borders, dividers, input outlines |
| `foreground` | body text on any background |
| `muted` | secondary text — metadata, helper lines, the view count |
| `accent` / `accent-foreground` | the one action that matters on a screen, and the score badge |
| `accent-soft` | a quieter accent surface — a selected row, a highlighted chip |
| `default` | quiet chrome, secondary buttons |
| `field-*` | input interiors, borders, and focus states. Do not rebuild these from `border` |
| `focus` | focus rings. Aliased to `accent` in the dark palette |
| `success` / `warning` / `danger` | status only, never decoration |

```html
<!-- yes -->
<div class="bg-background-secondary text-foreground border-border">

<!-- no — both of these break retheming -->
<div style="background:#1a1a2e">
<div class="bg-[#1a1a2e]">
```

**One accent action per screen.** If two things are the primary colour, neither is primary.

**There is no `primary` token.** DaisyUI had one; HeroUI's equivalent is `accent`. Writing
`bg-primary` produces nothing at all — Tailwind emits no rule for an undefined token, so the
element silently renders unstyled rather than erroring. This is the single most likely
leftover from the DaisyUI era.

## The dark palette, for reference

Verified by reading `@heroui/styles@3.2.4`'s `themes/default/variables.css`. **Do not copy
these into components** — they exist here so the OG card (below) can be matched by eye, and
so a future palette change has a starting point.

| Token | Dark value |
|---|---|
| `background` | `oklch(12% 0.005 285.823)` — near-black, faint blue-violet cast |
| `overlay`, `field-background` | `oklch(21.03% 0.0059 285.89)` |
| `border` | `oklch(28% 0.006 286.033)` |
| `default` | `oklch(27.4% 0.006 286.033)` |
| `muted` | `oklch(70.5% 0.015 286.067)` |
| `foreground` | `oklch(99.11% 0 0)` |
| `accent` | `oklch(62.04% 0.195 253.83)` — saturated blue |
| `danger` | `oklch(59.4% 0.1967 24.63)` |
| `success` | `oklch(73.29% 0.1935 150.81)` |
| `warning` | `oklch(82.03% 0.1388 76.34)` |

A deep near-black ground with a saturated blue accent — which is the "dark theme with vibrant
accents" the brief asked for, without anyone authoring a palette.

## Type scale

Tailwind defaults, restricted to this set so screens stay comparable:

| Class | Use |
|---|---|
| `text-xs` | metadata — year, view count |
| `text-sm` | secondary text, helper lines |
| `text-base` | body, comments |
| `text-lg` | media titles in results |
| `text-2xl` | the selected title |
| `text-4xl` | the homepage headline |

Weights: `font-normal` for prose, `font-semibold` for titles and actions, `font-bold` for the
wordmark only. Nothing else.

## Spacing

The 4-point scale, restricted to `1 · 2 · 3 · 4 · 6 · 8 · 12 · 16`. Values outside it need a
reason in a comment. Vertical rhythm inside a card is `gap-3`; between sections it is `gap-8`.

## Radius and elevation

Radius comes from HeroUI's own component defaults, and from `--field-radius` for inputs. Do
not set `rounded-lg` by hand on a HeroUI component; it will disagree with the theme. For
plain layout elements that are not HeroUI components, match the nearest one rather than
inventing a value.

Elevation is one step: the modal's own shadow, nothing on anything else. On a dark theme,
shadows read as murk. Separation comes from `background-secondary` against `background`, not
from shadows. Note that HeroUI's dark overlay carries a 1px inset light ring
(`--overlay-shadow`) instead of a drop shadow — that is the intended treatment; do not add a
shadow on top of it.

## Motion

- Transitions: `transition-colors duration-150` on interactive elements.
- Entrances: HeroUI's own component animations. Do not add a second one on top.
- Nothing on the create path animates for longer than 200 ms. Perceived speed *is* the
  product.
- Respect `prefers-reduced-motion`. HeroUI ships `motion-reduce` and `motion-safe` variants
  and its components already honour the preference.

## The OG card is not themed

`/r/[slug]/opengraph-image` renders through Satori, which does **not** run Tailwind or
HeroUI — it takes inline styles only. Its palette is therefore hardcoded in that one file,
and that is the single sanctioned exception to the rule at the top of this document.

Match it to the dark values in the table above, and note in that file that it is a deliberate
copy. If the theme ever changes, this file must be updated by hand — the OG card is the one
place where a rebrand is not automatic.

**Satori does not understand `oklch()`.** Convert the values above to hex or `rgb()` when
writing that file, and keep the original `oklch()` beside them in a comment so the two can be
compared later.

Related: [`ui-rules.md`](./ui-rules.md) · [`ui-registry.md`](./ui-registry.md)
