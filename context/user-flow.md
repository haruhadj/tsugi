# User Flow

Every screen, and every path between them. If a screen is not here, it does not exist.

## Screen map

```
   ┌──────────────┐   not signed in    ┌──────────────────────────┐
   │  /  Create   │ ─────────────────► │  /sign-in                │
   │              │ ◄───────────────── │  AniList · MAL           │
   └──────┬───────┘   session          │  Google                  │
          │                            └──────────────────────────┘
          │                            ┌──────────────────────────┐
          │  ────────────────────────► │  /settings  (Phase 2)    │
          │                            │  connected providers     │
          │                            │  link another            │
          │                            └──────────────────────────┘
          │  Search  ⇄  My list (Phase 7)
          │  add 1..10 items, score, comment
          ▼
   ┌──────────────────────────┐
   │  ShareModal  (overlay)   │
   │  link auto-copied        │
   └──────┬───────────────────┘
          │ "View it"
          ▼
   paste anywhere ──►  ┌──────────────────────────┐
   (unfurls as OG card)│  /r/[slug]  — public     │  ◄── NO account needed
                       └──────┬───────────────────┘
                              │ "Recommend something"
                              ▼
                             /

   Phase 8:   /dashboard  — your recs · connections · delete
```

## `/sign-in`

Three buttons, no form, no copy beyond a line explaining why. Reached from the create screen,
never as a mid-flow interruption.

**AniList** and **MyAnimeList** are presented first and marked as unlocking list import.
**Google** is offered below, separately, as plain sign-in. The difference is stated on the
screen — someone choosing Google should not later feel misled about why *My list* is
missing. They can link a tracker afterwards from [`/settings`](#settings--connections).

Signing in with a second provider later does **not** merge accounts (**D25**); linking is a
deliberate action on [`/settings`](#settings--connections). The sign-in screen says so,
quietly, rather than letting someone discover it by accumulating duplicate accounts.

## `/settings` — connections

Ships in **Phase 2**, minimal on purpose: which providers this account has linked, and a
button to link another. It exists that early because `linkSocial()` needs somewhere to be
called from, and without it a Google sign-in is a dead end rather than a deferral — the
opposite of what **D24** promises (**D33**).

```
  Connected
  ┌────────────────────────────────────────────┐
  │ ✓ Google          signed in with this      │
  │   AniList         [ Link ]  ◀ unlocks My list
  │   MyAnimeList     [ Link ]                 │
  └────────────────────────────────────────────┘
```

Linking states what it unlocks, because that is the only reason a signed-in person comes
here. **Phase 8** adds unlinking, refuses the last one, and puts this beside the dashboard.

**Sign out lives here**, at the bottom, quiet. It is the only sign-out control in the
product — the create screen must not carry one, because the only thing that screen is for is
getting to a link. Signing out returns to `/` in its signed-out form, which explains the
product and offers sign-in, so it is a working screen rather than a dead end.

Signed out, `/settings` redirects to `/sign-in` like any other authenticated screen.

## `/` — the create screen

Requires a session. Signed out, it shows what the product does and a sign-in call to action —
not a blank redirect, which teaches nothing.

**State 1 — empty**

```
  [ Search ]  [ My list ]              ◀ mode  (My list only if a tracker is linked)
  [● AniList ] [ MyAnimeList ]         ◀ source, pre-set, switchable
  ┌────────────────────────────┐
  │ Search anime or manga…     │       ◀ focused on mount
  └────────────────────────────┘

  Items (0)                            ◀ the tray, empty but visible
```

The tray is visible from the start so the shape of the task is legible before any item
exists — this is a builder, not a single-shot form.

**State 2 — searching**
Typeahead fires after 250 ms of quiet, minimum 2 characters, against the selected source.
Keyboard navigable: ↑/↓ to move, Enter to add to the tray, Escape to dismiss.

**State 2b — source unreachable**
Quiet, names the source, offers one tap out:

```
    MyAnimeList isn't responding.
    → Search AniList instead
```

No modal, no toast, no red. Tapping flips the toggle visibly and re-runs the same query.
Nothing switches on its own. This will be common for MyAnimeList — Jikan fails about half
the time.

**Switching source clears the search results, not the tray.** Items already added keep their
own `provider`; a group may legitimately mix AniList and MAL titles. What is cleared is the
*pending* selection, because an id from one space is meaningless in the other.

**State 3 — items in the tray**

```
  Items (2)
  ┌────────────────────────────────────────────┐
  │ ⠿ Attack on Titan        [score] [note] ✕ │
  │ ⠿ Vinland Saga           [score] [note] ✕ │
  └────────────────────────────────────────────┘

  Caption   (optional)
  ┌────────────────────────────────────────────┐
  │ my masterpiece tier                        │
  └────────────────────────────────────────────┘
  Comment   (optional, 280)
```

Each item carries its own optional score and note. Reorderable; order is what the card and
page render.

**The tray holds ten.** At ten the search input says so and stops accepting additions, rather
than letting someone build an eleventh item and lose it to a 400 (**D36**). The count in the
header is the warning — `Items (9/10)` once it is close.

Score input uses **the user's own scale** — read from `user.scoreFormat` on the session,
captured at sign-in and defaulting to 10-point for Google accounts (**D32**). A `POINT_3`
user sees three smileys, not a 1–10 strip. No format has a zero position: clearing a score
removes it rather than setting `0`, which is what the trackers mean by *unrated* (**D35**).
Imported items arrive with their score already set, or with none (Phase 7).

**The primary action enables when the recommendation says something** — at least one score or
one comment, anywhere (invariant 8). Until then it is disabled and the reason is stated
inline, because a disabled button with no explanation is a dead end.

**State 4 — submitting**
Loading state on the action, disabled, same width. Nothing else moves.

**State 5 — rate limited**
The 6th creation in a minute returns 429: *"You're going a bit fast — try again in a
moment"*, inline, **with the entire tray preserved**. Losing a five-item group to a rate
limit would be far worse than the limit itself.

## `My list` mode (Phase 7)

Same tray, different source of items. A filterable view of the signed-in user's AniList or
MAL list, each entry showing the score they already gave it. Tapping adds it to the tray with
that score attached, in their own format.

Hidden entirely for accounts with no tracker linked — not shown-and-disabled, which just
advertises something the user cannot have.

If the tracker token has expired beyond refresh, the mode asks them to reconnect. It never
shows an empty list, which would read as *"you have nothing rated."*

## ShareModal

Opens immediately on success. The link is **already on the clipboard** — copying is not
something the user does, it is something already done for them. The modal reports that
rather than instructing it.

- The URL, read-only, selectable
- **Copy Link** — the fallback for when the browser refused the automatic copy
- Share to **X/Twitter**, **Discord**, **WhatsApp**
- A quiet "View it" link

**Clipboard reality:** `navigator.clipboard.writeText` needs a secure context and can be
refused. If it fails, "Link copied!" silently becomes "Copy your link". The user must never
be told something happened that did not.

## `/r/[slug]` — the public recommendation

**Open to everyone.** No session, no prompt, no "sign in to see this". Gating this screen
would end the loop the product depends on.

- The group caption and comment, presented as a statement rather than a field
- Every item: cover art, title, media type badge, score **in the rater's own scale**,
  per-item note
- Source attribution, linked out to that entry
- View count, understated
- One call to action back to `/`

One item and eight items are the same page, laid out differently. Unknown slug → 404; no
"did you mean", no redirect home.

**The OG card is the real first impression.** Most people meet this page as an unfurled
preview and never click, so `/r/[slug]/opengraph-image` carries the same substance and adapts
to item count — a single hero cover for one title, a composed set for a group.

## `/dashboard` (Phase 8)

Your recommendations, newest first, each showing its items and view count. Delete is here;
edit is not (see `functionality.md`). It sits beside `/settings`, which gains unlinking in
the same phase — that is where someone goes to ask why *My list* is missing.

Related: [`functionality.md`](./functionality.md) · [`ui-rules.md`](./ui-rules.md)
