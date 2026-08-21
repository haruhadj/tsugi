# Phase 5 — Create & share UX

> ⚠️ **Read [D41](../progress-tracker.md) before starting this phase.** The UI library
> changed to shadcn/ui on 2026-08-11, and this phase carries the one capability that did not
> transfer: **Radix has no combobox**, so `MediaSearchInput` cannot simply be HeroUI's
> `Autocomplete`. Decide *first* — propose `cmdk` per the dependency rule in `AGENTS.md`, or
> build on `Popover` and own `aria-activedescendant`, which `../ui-rules.md` previously
> forbade. Everything else here holds; component prop vocabulary is now shadcn's
> (`onClick`/`disabled`, no `isPending`).
>
> Criterion 1's timing budget is now easier to hit than when it was written: shadcn's
> primitives render in Server Components, so the create screen is not forced into a client
> tree the way D37 assumed.

**Status:** not started
**User-visible output:** the product becomes usable

The first phase a person can actually use. Everything here is judged against one number:
landing to link-on-clipboard in **under 10 seconds**.

## Scope

**In**
- `src/app/page.tsx` — the create screen, session required
- `ProviderToggle`, `MediaSearchInput`, `ScoreInput`, `ScoreBadge`, `ItemTray`,
  `RecBuilder`, `ShareModal`, `MediaCover`
- `src/lib/score.ts` — **the one score formatter**, five formats, shared by every surface
- Debounced typeahead against whichever Phase 3 browser adapter the toggle selects
- **The item tray: add, reorder, remove, per-item score and note, 1..10** (**D36**)
- Group caption and comment
- The one-tap "search the other source instead" recovery (**D14**)
- Auto-copy on creation, with an honest fallback when the browser refuses
- Share targets: X/Twitter, Discord, WhatsApp
- Keyboard operation end to end

**Explicitly out**
- `/r/[slug]` and the OG image — Phase 6. The share modal links to a page that does not
  render properly yet, and that is expected.
- Sign-in itself. It is a Phase 2 prerequisite and already works by the time this phase
  starts; the create screen assumes a session and only needs the signed-out call to action.
- List import — Phase 7. Titles get here by search only.
- Editing (permanently) and deleting (Phase 8, once ownership is provable).
- Animations beyond the two entrance keyframes in `globals.css` and shadcn's own
  `transition-colors`. (Was "HeroUI's component defaults" — **D41**.)

## Deliverables

Components as specified in [`../ui-registry.md`](../ui-registry.md) — register each one in
the same change that creates it.

Screen states are defined in [`../user-flow.md`](../user-flow.md) and are not restated here.

## Key design decisions

**The provider toggle defaults to AniList and is remembered.** The user picks the search
source, but a forced choice would put a mandatory click on the 10-second path. The toggle
loads pre-set to AniList so a user can type immediately, and switching it persists to
`localStorage` so a MyAnimeList user pays that click once, ever. (**D14**)

AniList is the default rather than MyAnimeList for a measured reason: Jikan 504s on roughly
half of all calls. Defaulting to the flakier source would make the product feel broken to
anyone who never touches the toggle.

**The failure recovery is one tap, and it is explicit.** When the chosen source cannot
answer, the results area says so and offers to run the same query against the other one.
Tapping it flips the toggle — the user can see what changed. Nothing switches on its own.

**Submission is gated by "says something", not by a score.** At least one score or one
comment, anywhere in the group (invariant 8). Scores became optional with **D27**, so the old
rule — every item needs a score — would now be friction for someone grouping eight titles
under a single sentence. When the action is disabled, the reason is stated inline; a disabled
button with no explanation is a dead end.

**Score input follows the user's own format**, not a fixed 1–10 strip. Ten radio options for
`POINT_10`, five stars for `POINT_5`, three smileys for `POINT_3`, a number field for
`POINT_100`. Rendering a `POINT_3` rating as `2/3` is a bug (**D28**, invariant 6).

**The format is read from `user.scoreFormat` on the session** — written at sign-in in Phase 2,
written as `POINT_10` when a tracker gives no preference (**D32**). It is already loaded by the time the
page renders, so the score input never waits on a network call and never guesses. Do not
fetch it from AniList here; that is Phase 7's refresh, and it would put a third-party call on
the 10-second path.

**No score is `0`.** Every format starts at 1, because `0` is what the trackers store for
*unrated* (**D35**). The control has no zero position — clearing a score is removing it, and
that produces `(null, null)`.

**One formatter, every surface.** `src/lib/score.ts` is the only place a score becomes text.
Five formats across the tray, the public page, the dashboard, and the OG card is fifteen
chances to get it wrong independently.

**One item and eight items are the same screen.** The tray is visible from the start, even
empty, so the shape of the task is legible before anything is added. A single-title
recommendation is simply N=1 (**D26**) — there is no "add another" mode switch.

**Switching source clears pending results, never the tray.** Items keep their own provider,
and a group may legitimately mix AniList and MAL titles. Only the un-added selection is
discarded, because an id from one space is meaningless in the other.

**Auto-copy is an enhancement, never the mechanism.** `navigator.clipboard.writeText`
requires a secure context and can be refused. The modal reports what actually happened: on
success "Link copied!", on failure "Copy your link" with the button as the path. Claiming a
copy that did not occur is the single worst failure available here — the user pastes nothing
into a conversation and blames the product.

**Share URLs are verified and recorded**, not written from memory — the exact forms are in
`../tech-stack.md`. Two things there are easy to get wrong:

- X's canonical intent is `x.com/intent/post`. The familiar `twitter.com/intent/tweet` still
  works but 301s.
- **WhatsApp has no `url` parameter.** The link goes URL-encoded inside `text`. Passing a
  separate `url` drops it silently, and the share arrives without the link — which is the
  only thing the product exists to deliver.

**Discord gets a copy action, not a web intent.** Discord has no public web share intent, so
its button copies a Discord-formatted message and says that is what it did. It must not look
like the other two buttons if it behaves differently.

**The typeahead owns Enter only while its list is open.** Otherwise Enter submits the form.
This is what makes the flow fully keyboard-operable: type, arrow, Enter, number, Enter.

**Form state survives every error.** A 429 or a failed create leaves the selection, the
score, and the comment exactly as they were. Losing a typed comment to a rate limit is worse
than the rate limit.

**No layout shift on the create path.** Disabled controls hold their space, the submit button
keeps its width while loading, and covers are rendered at explicit dimensions. Movement on
this screen is read as slowness, and slowness is the only thing this product cannot afford.

## Exit criteria

1. From a cold load of `/` **as a signed-in user**, a one-item recommendation reaches the
   clipboard in **under 10 seconds**. Time it, three runs, worst run counts. Sign-in is a
   one-time cost paid before the clock starts (**D23**).
2. Signed out, `/` shows what the product does and a sign-in call to action — it does not
   silently redirect, and it does not render an unusable form.
3. The flow is completable **entirely by keyboard** from page load, without a mouse:
   type → ↓ → Enter → score → Enter.
4. A **three-item** group — two searched from AniList, one from MAL — builds, reorders, and
   submits, and the read-back preserves the order.
5. Removing an item from the tray removes exactly that item.
5a. At **ten items** the tray refuses an eleventh and says why, in the search area rather
   than as an alert. It must be impossible to build a group the API will reject (**D36**).
6. An item with **no score** can be added and submitted, provided the group carries a
   comment (invariant 8).
7. With **no score and no comment anywhere**, the submit action is disabled **and states
   why**. A disabled control with no explanation is a dead end.
8. A `POINT_3` user sees three smileys, not a 1–10 strip, and the stored `scoreFormat` is
   `POINT_3`. The format comes from `user.scoreFormat` on the session (**D32**) — verify by
   changing that row and reloading, with no AniList call in the network panel.
9. A `POINT_100` score of 87 is sent as `scoreRaw: 87, scoreFormat: "POINT_100"` — verify in
   the network panel. No client-side normalisation (**D28**).
10. Typing `frieren` shows results within 500 ms of the debounce firing, with cover art and
   no layout shift as images load.
11. The typeahead fires **at most one** request per 250 ms of typing — verify in the network
   panel by typing a 10-character query and counting requests. Fewer than 10.
12. Fewer than 2 characters fires **no** request.
13. Submitting opens the ShareModal, and the clipboard contains the URL **before** the modal
   finishes appearing — paste into a text field to confirm.
14. With clipboard permission denied, the modal shows "Copy your link" and **not** "Link
   copied!", and the Copy button works.
15. The comment field hard-stops at 280 characters and the caption at 120. Typing one past
   either is impossible — invariant 7's third layer, the one the user actually experiences.
16. The submit action is disabled while the tray is **empty**, and a disabled click does
   nothing at all. Once an item exists, criteria 6 and 7 govern: a score is *not* required,
   a comment or a score somewhere in the group is.
17. A forced 429 shows an inline warning with the selection, score, and comment all intact.
18. With the selected provider unreachable, the results area shows a quiet message plus the
    switch offer, the input stays editable, and no modal or red alert appears.
18a. A `reason: "rate_limited"` says **something different** from `"unavailable"`. Hitting
    AniList's own 30/min is the likeliest failure a heavy searcher meets, and it is not the
    same event as AniList being down: the fix is to wait a moment, not to switch providers.
    Offering the other source here would send someone to Jikan for no reason. Force it by
    searching past the quota and read the message.
19. Tapping the switch offer flips the toggle visibly, re-runs the **same** query against
    the other provider, and returns results.
20. On first load the toggle reads **AniList** and the search input is immediately typable
    — no click required. This phase's criterion 1 is timed without touching the toggle.
21. Switching to MyAnimeList, reloading the page, and searching queries **Jikan** — the
    choice persisted.
22. Selecting a title on AniList, then switching provider, **clears the selection** and
    disables submit. It must be impossible to submit an AniList id tagged `mal`.
23. The `provider` sent in the POST body always matches the toggle state at the moment the
    title was selected — verify in the network panel after a switch.
24. Searching the same query under each provider returns different `externalId` values for
    the same show (154587 vs 52991), and both create successfully.
25. At 375 px width: no horizontal scroll anywhere, and every score target is ≥44 px.
26. The X and WhatsApp buttons open a prefilled composer **containing the link**. Open each
    one and read it — a WhatsApp share missing the URL is the specific failure this checks.
27. The Discord button copies a message and says "copied", never claiming to have opened
    anything.
28. Every component created is present in `../ui-registry.md` under **Built**, with real
    props.
29. `grep -rn "#[0-9a-fA-F]\{6\}\|bg-\[" src/components` returns nothing. Invariant 5.
30. `grep -rn "@/db\|@/server" src/components` returns nothing. Invariant 3.
31. `bun x tsc --noEmit`, `bun x eslint .`, and `bun test` all exit 0.

Most of this phase is browser observation and stays manual — that is correct, not a gap.
The share-URL builders and the provider-switch state reducer are pure functions, and those
**are** `bun test` cases: criteria 22, 23, and 26 are cheap to automate and expensive to
re-check by hand every phase.

**Criteria 4, 19, 21, and 24 need Jikan to answer, and Jikan often will not** — six
consecutive 504s during verification (`../tech-stack.md`). A failure on those four is a
finding about MyAnimeList, not about this phase. Retry them later rather than treating the
phase as incomplete; criterion 18, which requires the *failure* to be handled gracefully, is
the one that can always be checked.

## Risks

| Risk | Mitigation |
|---|---|
| The 10-second promise quietly failing as features accrete | Criterion 1 is timed on every subsequent phase, not just this one |
| The score input fetching the user's format on mount, adding a round-trip to the timed flow | It is on the session already (**D32**). Criterion 8 checks the network panel is quiet |
| Submit re-gated on "every item needs a score", undoing **D27** | Criteria 6, 7, and 16 together. This wording was wrong in an earlier draft of this file and was corrected — do not restore it |
| Auto-copy failing silently in Safari or an insecure context | Criterion 14 tests the denied path explicitly |
| The score picker overflowing on small screens | Criterion 25 pins 375 px and a 44 px minimum |
| Typeahead exhausting a user's own 30/min AniList quota | Criteria 11 and 12 bound request volume; 250 ms debounce with a 2-character floor keeps a fast typist well inside it |
| A stale selection surviving a provider switch, producing an id/provider mismatch | Criteria 22 and 23. This is the one UI bug that can write a wrong anime to the database |
| The toggle adding a click to the timed flow | Criterion 20 times the flow without touching it; the default exists for exactly this |
| MyAnimeList users blaming Tsugi for Jikan's 504s | Criterion 18's message names the source, and criterion 19 gives a working way out |
| A rate-limit response handled as an outage, pushing the user to the other provider pointlessly | Criterion 18a. `ProviderResult` already distinguishes `rate_limited` from `unavailable`; the UI has to as well |
| Components built without registration, then rebuilt | Criterion 28 |
| A WhatsApp share arriving with no link in it | Criterion 26 opens the composer and reads it. The `url`-param mistake produces a share that looks fine until someone tries to click it |

**Next:** [`PHASE-6.md`](./PHASE-6.md)
