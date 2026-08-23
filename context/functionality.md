# Functionality — the scope boundary

This is the scope-creep brake. Every exclusion states **why**, so it stops being
re-proposed each session. Changing anything here is a decision that belongs in
`progress-tracker.md`'s decision log.

## In scope

### Accounts (Phase 2)
- Sign in with **AniList** or **MyAnimeList**
- Both unlock list import
- Explicit provider linking from `/settings` — automatic linking is impossible here, since
  neither tracker returns an email (**D25**). The screen ships minimal in Phase 2 and is
  expanded in Phase 8 (**D33**)
- The scale a user rates in is captured at sign-in and used to interpret imported scores
  (**D32**, amended by **D47** — it no longer decides what the input control looks like)
- **A username is mandatory for anyone who publishes** (**D49**): it is the `u/{username}`
  attribution every list carries. Accounts without one are asked to pick at next sign-in
- **Creating requires a session. Viewing never does.**

### Creation flow (the product)
- A source toggle — AniList or MyAnimeList — defaulting to AniList and remembered
- A media-type toggle — anime or manga — beside it (**D48**); both providers support both
- Live typeahead search against the selected source, in a panel that stays open so several
  titles can be added in a row
- A one-tap offer to re-run the query on the other source when the selected one is down
- **1 to 10 titles per recommendation.** One is the common case; a group is the same model.
  The ceiling is 10 because the server resolves every item against the provider on a shared
  rate-limit budget (**D36**)
- **Scores typed in Tsugi are out of ten** (**D47**). Scores *imported* from a tracker are
  preserved in the rater's own scale (five AniList formats plus MAL's 10-point), so a list may
  legitimately carry both
- A **title** and a **category** from a fixed vocabulary, which is how the rundown files it
  (**D48** — the two used to be one field)
- A genre cloud, aggregated automatically from the titles on the list; readers can filter the
  rundown and the list itself by any of them
- A live preview of the share card while building
- **Save as a draft or publish immediately**, in one request either way
- Optional comment per item, ≤280 characters
- Optional caption and comment for the group as a whole
- A recommendation must carry at least one score *or* one comment
- One action that creates it and opens the share modal
- Share link copied to the clipboard automatically
- One-click share to X/Twitter, Discord, and WhatsApp

### List import (Phase 7)
- Browse and filter your own AniList or MAL list, and add titles straight from it
- Imported items keep the score you already gave them, in the format you rate in
- **Read-only.** Tsugi never writes to anyone's list

### Public recommendation page (Phase 6)
- `/r/[slug]` renders every item: cover art, title, media type, score, comment, genres
- The author's handle as `u/{username}`, and a genre spectrum that filters the titles below
- The group caption and comment
- Source attribution, linked out to that entry
- View counter, incremented fire-and-forget
- Open to everyone, no account

### Social preview (Phase 6)
- `/r/[slug]/opengraph-image` — a 1200×630 PNG that adapts to the item count
- Correct OpenGraph and Twitter card metadata

### Dashboard (Phase 8)
- Your recommendations, newest first
- Delete your own
- Unlink providers, with the last one refused

### Platform
- Rate limiting on creation: 5 requests per minute per signed-in user (**D34**)
- Two user-selectable media providers with **no automatic fallback** between them (**D15**)
- RLS on every table (**D20**)
- CI gating type errors and lint errors on every push and PR

### Legal/policy pages
- **Terms of Service** (`/terms`) — accounts and user-generated content require it (**D55**)
- **Privacy Policy** (`/privacy`) — OAuth token storage and view-count tracking require it
  (**D55**). Copy is owner-authored; not legal advice. No phase assigned yet — see `PLAN.md`
  before building the routes.

## Out of scope

Each of these was considered and rejected. The reason is the part that matters.

| Excluded | Why |
|---|---|
| **Anonymous creation** | *Removed by **D23**, having previously been the core of the product.* The owner does not want orphan data. The cost is real and accepted: creating now requires an account on one of three services. |
| ~~**Editing a recommendation**~~ | ~~A shared link is a public claim. Quietly changing the title or score behind a link a friend already posted is a small betrayal of the person who shared it. Delete (Phase 8) removes the claim honestly instead.~~ **Reversed (D59):** an author can edit any list they own, in full — metadata, the item set, its order, and per-item scores and notes — and a published list changes in place at the link it already has. The argument above was put to the owner and outweighed, not refuted; `/r/[slug]/edit` discloses it rather than restricting the edit. |
| **Writing back to AniList or MAL** | Tsugi reads your list; it never touches it. A recommendation tool that silently edits your tracker is a tool nobody trusts twice. Permanent. |
| **Continuous list sync** | Fetch on demand, never mirror. A mirror is a second source of truth that goes stale and needs reconciliation. |
| **Comments, replies, likes on a rec page** | Turns a share target into a social network, bringing moderation, spam, and abuse reporting — permanent cost against a promise about speed. **Voting only** (D43). Free-text comments were built and removed within a day (**D44**, reversed by **D46**): the deciding argument is that the worst case does not scale with user count, so there is no traffic level at which it becomes safe to have waited. Restoring means building report/block/admin tooling in the same change. |
| ~~**User profiles, following, feeds**~~ | ~~Same reason. Tsugi is a link generator, not a destination.~~ **Reversed (D43):** `/feed` ships, and usernames identify feed entries. Following and full profile pages remain out. |
| **Watch-list / progress tracking** | This is what AniList and MAL already do well, and doing it badly is worse than not doing it. Tsugi links *out* to them. |
| **Recommendation algorithms / "similar titles"** | The name says recommendation, but the product means *a person recommending*, not a model inferring. No ML in scope. |
| **Email/password or magic-link auth** | Three OAuth providers is already the ceiling. Passwords bring resets, verification mail, and an email service — a large surface for a small gain. |
| **Merging the same title across providers** | AniList exposes `idMal`, so a cross-walk is possible. Not worth it: reconciling two catalogues introduces a whole class of "wrong title" bugs to solve a problem nobody has reported. |
| **A third media provider** | Two cover anime and manga. Each additional one is another id space, another adapter, another failure mode, another toggle option on the critical path. |
| **Mobile apps** | The share target is a browser link. Native adds distribution cost with no gain to the core promise. |
| **Internationalised UI** | English only. Media titles are already multilingual via provider data; translating the chrome is not the bottleneck. |
| **Analytics beyond the view counter** | A single integer answers "did anyone click it". More needs a consent banner, which costs time on the critical path. |
| **Custom OG card themes** | Rendering cost and QA surface scale with template count. One excellent card beats six adequate ones. |
| **Cookie Policy / consent banner** | No stated EU/UK/CA audience targeting and no tracking cookies beyond the Better-Auth session itself (**D55**). Revisit if that targeting changes. |
| **Disclaimer page** | No advice-adjacent content (health/legal/financial) and no affiliate links anywhere in scope (**D55**). |
| **Refund/Cancellation Policy** | No payments or subscriptions exist or are planned (**D55**). |

## The test for a new feature request

Ask, in order:

1. Does it shorten the path from opinion to link? → Build it.
2. Does it make the shared card more clickable? → Consider it.
3. Does it lengthen that path? → Reject it, or put it behind the share modal.
4. Does it create a moderation, privacy, or abuse surface? → It needs its own decision entry
   with the ongoing cost written down before any code is written.

Related: [`project-overview.md`](./project-overview.md) · [`user-flow.md`](./user-flow.md)
