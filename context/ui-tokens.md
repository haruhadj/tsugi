# UI Tokens

**The only source of visual values.** A hardcoded hex anywhere in `src/components` is a bug,
even when it looks right — it is the thing that makes "change the theme without touching a
component" false, and nobody notices until one button is the wrong colour.

## How theming works here

Tailwind 4 and DaisyUI 5 are configured in CSS. There is no `tailwind.config.ts`.

`src/app/globals.css`:

```css
@import "tailwindcss";

@plugin "daisyui" {
  themes: night --default;
}
```

`night` is a DaisyUI built-in dark theme: deep blue-black grounds with a saturated blue
primary. It gives the "vibrant accent on dark" look the brief asks for without us
hand-authoring a palette in Phase 0.

**`night` is used unmodified.** The custom-theme syntax is verified and recorded in
[`tech-stack.md`](./tech-stack.md) — including the trick of redeclaring a built-in theme's
name to override only a few tokens — but Tsugi does not use it. Introducing a custom palette
is a design decision that needs a decision-log entry, not an edit to this file.

## Colour — semantic names only

Use the semantic token. Never the underlying value.

| Token | Use for |
|---|---|
| `base-100` | page background |
| `base-200` | raised surfaces — cards, the search result list |
| `base-300` | borders, dividers, input outlines |
| `base-content` | body text on any `base-*` surface |
| `primary` / `primary-content` | the one action that matters on a screen |
| `secondary` | supporting actions |
| `accent` | the score badge, and highlights that should feel energetic |
| `neutral` | quiet chrome |
| `info` / `success` / `warning` / `error` | status only, never decoration |

```html
<!-- yes -->
<div class="bg-base-200 text-base-content border-base-300">

<!-- no — both of these break retheming -->
<div style="background:#1a1a2e">
<div class="bg-[#1a1a2e]">
```

**One primary per screen.** If two things are `btn-primary`, neither is primary.

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

Radius comes from DaisyUI's component defaults — `rounded-box` for surfaces, `rounded-btn`
for actions, `rounded-full` for score badges and avatars. Do not set `rounded-lg` by hand on
a DaisyUI component; it will disagree with the theme.

Elevation is one step: `shadow-lg` on the modal, nothing on anything else. On a dark theme,
shadows read as murk. Separation comes from `base-200` against `base-100`, not from shadows.

## Motion

- Transitions: `transition-colors duration-150` on interactive elements.
- Entrances: DaisyUI's own modal animation. Do not add a second one on top of it.
- Nothing on the create path animates for longer than 200 ms. Perceived speed *is* the
  product.
- Respect `prefers-reduced-motion`; DaisyUI's modal already does.

## The OG card is not themed

`/r/[slug]/opengraph-image` renders through Satori, which does **not** run Tailwind or
DaisyUI — it takes inline styles only. Its palette is therefore hardcoded in that one file,
and that is the single sanctioned exception to the rule at the top of this document.

Keep the values visually matched to `night` by eye, and note in that file that it is a
deliberate copy. If the theme ever changes, this file must be updated by hand — the OG card
is the one place where a rebrand is not automatic.

Related: [`ui-rules.md`](./ui-rules.md) · [`ui-registry.md`](./ui-registry.md)
