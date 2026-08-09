# Phase 6 — Public page & OG cards

**Status:** not started
**User-visible output:** the product becomes shareable
**Prerequisites:** a **Vercel project — does not exist yet** (as of 2026-08-09). Criteria
1–13 require a public URL; social validators cannot reach localhost. Set
`NEXT_PUBLIC_APP_URL` on the deployment, or let it fall back to `VERCEL_URL`.

The share card is the entire distribution mechanism. Most people will meet Tsugi as an
unfurled preview in a chat window and never click through — for them, the card *is* the
product.

## Scope

**In**
- `src/app/r/[slug]/page.tsx` — the public recommendation
- `src/app/r/[slug]/opengraph-image.tsx` — 1200×630 PNG via `next/og`
- `generateMetadata` — OpenGraph and Twitter card tags
- Fire-and-forget view counting
- Multi-item card layouts: 1 · 2–4 · 5+
- `RecView`, `SourceLink` — reusing `ScoreBadge` and `MediaCover` from Phase 5
- Deployment to Vercel, because the card cannot be validated without a public URL

**Explicitly out**
- `twitter-image.tsx` as a separate file. The Twitter card points at the OpenGraph image;
  a second renderer is a second thing to keep in sync.
- Per-user or per-theme card variants — out of scope permanently.
- A view-count display more elaborate than a single number.
- Any listing of recommendations. Phase 8.

## Deliverables

The card carries the same substance as the page: cover art, titles, scores, a comment
excerpt, and Tsugi branding. That redundancy is the point — the card must stand alone for
readers who never click.

**The card adapts to item count** (**D26**). Three layouts, no more:

```
  N = 1            N = 2–4                    N ≥ 5
  ┌──────────┐     ┌────┐┌────┐┌────┐         ┌──┐┌──┐┌──┐┌──┐  +3 more
  │  cover   │     │    ││    ││    │         │  ││  ││  ││  │
  │  large   │     └────┘└────┘└────┘         └──┘└──┘└──┘└──┘
  │ title    │     caption / comment          caption / comment
  │ score    │     Tsugi                      Tsugi
  └──────────┘
```

Beyond four covers nothing is legible at 1200×630 in a chat window, so the fifth and later
items become a count. Picking which four to show is `position` order — the user's own
ordering, not a score ranking.

The page additionally shows **which source each title came from** (AniList or MyAnimeList),
linked out to that entry. The card does not — see below.

## Key design decisions

**`next/og`, not `@vercel/og`.** Next ships `ImageResponse` at `next/og`. The standalone
package is for non-Next runtimes; adding it would bundle a second copy of the same renderer.
The client brief lists it as a dependency — the brief is wrong. (**D5**)

**`params` is a Promise here.** Next 16 made the `opengraph-image` image function receive
`params` and `id` asynchronously. This is a breaking change from Next 15 and the most likely
thing to be written wrongly from memory. Invariant 12.

```tsx
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
}
```

**Satori does not run Tailwind or DaisyUI.** The card is built from inline styles with a
hardcoded palette, matched to `night` by eye. This is the single sanctioned exception to the
no-hardcoded-colours invariant, recorded in `../ui-tokens.md`. Flex layout only — Satori
supports a subset of CSS, and `display: grid` is not in it. The multi-cover layouts are
therefore nested flex rows, not a grid.

**Scores on the card go through `src/lib/score.ts`, like everywhere else.** Five formats
reach this renderer too, and a `POINT_3` smiley rendered as `2/3` on the card is the most
public possible place to get it wrong. Satori cannot use an icon font — emoji or inline SVG
only.

**Source attribution appears on the page, not on the card.** *(Q4, resolved.)* The user
picked a source deliberately (**D14**), and the two catalogues disagree on both scores and
titles — a 91 from AniList and an 8.9 from MyAnimeList are different scales. So the page
credits the source and links out to that entry.

The card does not. It is 1200×630 of finite attention competing in a chat window, and a
provider label earns less than the line it costs the comment.

**The OG route does not count views.** Every unfurl by every chat client would inflate the
counter far past actual human visits, making the number meaningless. Only `page.tsx` counts.

**View counting never blocks and never fails a render.** The increment is issued without
`await` and swallows its own errors with a comment saying why. A page must render from a
read-only replica or a degraded database. Invariant 13.

**The increment is atomic SQL, not read-modify-write.** `SET views = views + 1` in a single
statement. Reading the count, adding one, and writing it back loses counts under exactly the
condition the product is designed for — a link going viral and being opened concurrently.
The bug would be invisible, because an undercount looks like a plausible number.

**`og:image` is built from `NEXT_PUBLIC_APP_URL`**, defined back in Phase 0 and falling back
to `VERCEL_URL` then localhost. Never construct it from request headers: the OG route is
fetched by crawlers whose `Host` you do not control.

**Cover art can be absent.** `coverImage` is nullable and providers do 404. Both the page and
the card need a designed fallback. A card rendering a broken image is worse than a card
rendering a title on a clean ground.

**The card is not cached by us.** `ImageResponse` output is cached by the platform and by
every chat client that fetches it. Do not build a second cache layer; do make sure the
response carries sane cache headers.

**`/r/[slug]` renders per request; the OG image does not have to.** These pull in opposite
directions and the resolution is asymmetric. The page counts views, and criteria 14–15
require *every* load to increment — a cached page increments nothing and the counter
silently stops, which looks exactly like "nobody clicked". So the page is dynamic. The image
route reads the same row but counts nothing, so it is free to be cached, which is what keeps
a viral unfurl from becoming a database read per chat client.

`architecture.md` previously described the read as "cacheable" without distinguishing the
two routes. It is the image that is cacheable.

## Exit criteria

Criteria 1–13 are checked against a **deployed public URL** — social validators cannot reach
localhost.

1. `curl -sI <url>/r/<slug>/opengraph-image` returns **200** with
   `content-type: image/png`.
2. The downloaded PNG is exactly **1200×630** — check with `file` or `identify`.
3. Viewing the PNG for a **one-item** rec, all elements are legible: cover art, title, media
   type, score, comment excerpt, Tsugi branding.
4. A **three-item** rec renders three covers side by side, in `position` order, all legible.
5. A **seven-item** rec renders four covers plus "+3 more" — not seven unreadable thumbnails
   and not a silently truncated four.
6. A recommendation with **no comment** renders a card with no empty gap or stray quote
   marks.
7. An item with **no score** renders without an empty score slot or a stray "/10".
8. A `POINT_3` score renders as a smiley on the card, never as `2/3`. A `POINT_100` score
   renders as `87/100`, not `9/10`. Invariant 6.
9. A recommendation whose `coverImage` is `null` renders the designed fallback, not a broken
   image — checked at N=1 **and** inside a multi-cover layout.
10. A 280-character comment is truncated with an ellipsis and does not overflow the canvas or
   push branding off it.
11. A long native-script title (Japanese) does not overflow. Verify with a real title, not
   Latin filler.
12. `view-source` on `/r/[slug]` shows `og:image`, `og:title`, `og:description`,
   `twitter:card`, and `twitter:image` — and `og:image` is an **absolute** URL.
13. Pasting the URL into a real client (Discord or X) produces the card. This is the actual
   acceptance test; nothing else substitutes for it.
14. Loading `/r/[slug]` twice increments `views` by exactly **2**.
15. Twenty concurrent requests to `/r/[slug]` increment `views` by exactly **20**. This is
    the criterion that catches a read-modify-write implementation; sequential loads will
    pass either way.
16. Fetching `/r/[slug]/opengraph-image` ten times increments `views` by **0**.
17. With the database made unwritable, `/r/[slug]` still renders **200**. The counter fails
    silently.
18. `/r/aaaaaaaaaaaa` returns a real **404**, not a 500 and not a redirect.
19. `grep -n "await params" src/app/r/\[slug\]/opengraph-image.tsx` matches. Invariant 12.
20. `grep -rn "@vercel/og" src package.json` returns nothing.
21. `grep -rn "headers()" src/app/r` shows the base URL is **not** derived from request
    headers — it comes from `NEXT_PUBLIC_APP_URL`.
22. `grep -rn "runtime.*edge" src/app` returns **nothing**. The brief asks for Edge on the OG
    image; `postgres.js` cannot run there and the route reads the database (**D21**,
    invariant 15).
23. `bun x tsc --noEmit`, `bun x eslint .`, and `bun test` all exit 0.
24. Phase 5's criterion 1 still passes — the 10-second flow has not regressed.
25. **`/r/[slug]` and its OG image both render while signed out**, in a private window with
    no session cookie — no redirect, no prompt, no partial render. Invariant 9. If this
    fails, the product has no distribution. *(Moved here from `PHASE-2.md`, which asserted it
    two phases before this route existed.)*

## Risks

| Risk | Mitigation |
|---|---|
| Writing `params` synchronously from Next 15 memory | Criterion 19 greps for it; called out in three files |
| Satori silently dropping unsupported CSS, producing a blank card | Criteria 3–5 require visual inspection of the actual PNG, not a passing build |
| Relative `og:image` URLs, which most unfurlers reject | Criterion 12 checks for absolute |
| Fonts unavailable in the Satori runtime, falling back to something ugly | Inspect the rendered PNG at criterion 3. If a custom font is needed it must be loaded explicitly — record how in `../tech-stack.md`. |
| A `POINT_3` score printed as `2/3` on the most public surface there is | Criterion 8. All score text goes through `src/lib/score.ts` |
| Five covers rendered as five unreadable thumbnails | Criterion 5 pins the 4 + count rule |
| Chat clients caching a broken early card | Validate on a throwaway slug before sharing any real link |
| View counting blocking the render under database load | Criterion 17 tests the unwritable case directly |
| A read-modify-write counter silently losing views on a viral link | Criterion 15 runs concurrent requests; an undercount otherwise looks like a plausible number |
| The page cached "for speed", silently freezing the view counter | Criteria 14 and 15 both fail if the page is cached. The image route is the one that may be |
| Auth creeping onto the view path | Criterion 25, inherited from Phase 2 where it could not yet be checked |

**Next:** [`PHASE-7.md`](./PHASE-7.md)
