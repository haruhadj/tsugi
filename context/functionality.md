# Functionality — the scope boundary

This is the scope-creep brake. Every exclusion states **why**, so it stops being
re-proposed each session. Changing anything here is a decision that belongs in
`progress-tracker.md`'s decision log.

## In scope

### Accounts (Phase 2)
- Sign in with **AniList**, **MyAnimeList**, or **Google**
- AniList and MAL additionally unlock list import; Google is sign-in only, and exists so
  that not having a tracker is not a hard wall
- Explicit provider linking from settings — automatic linking is impossible here, since
  neither tracker returns an email (**D25**)
- **Creating requires a session. Viewing never does.**

### Creation flow (the product)
- A source toggle — AniList or MyAnimeList — defaulting to AniList and remembered
- Live typeahead search against the selected source
- A one-tap offer to re-run the query on the other source when the selected one is down
- **1..N titles per recommendation.** One is the common case; a group is the same model
- Optional score per item, **preserved in the rater's own scale** (five AniList formats plus
  MAL's 10-point)
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
- `/r/[slug]` renders every item: cover art, title, media type, score, comment
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
- Manage which providers are connected

### Platform
- Rate limiting on creation: 5 requests per minute per IP
- Two user-selectable media providers with **no automatic fallback** between them (**D15**)
- RLS on every table (**D20**)
- CI gating type errors and lint errors on every push and PR

## Out of scope

Each of these was considered and rejected. The reason is the part that matters.

| Excluded | Why |
|---|---|
| **Anonymous creation** | *Removed by **D23**, having previously been the core of the product.* The owner does not want orphan data. The cost is real and accepted: creating now requires an account on one of three services. |
| **Editing a recommendation** | A shared link is a public claim. Quietly changing the title or score behind a link a friend already posted is a small betrayal of the person who shared it. Delete (Phase 8) removes the claim honestly instead. |
| **Writing back to AniList or MAL** | Tsugi reads your list; it never touches it. A recommendation tool that silently edits your tracker is a tool nobody trusts twice. Permanent. |
| **Continuous list sync** | Fetch on demand, never mirror. A mirror is a second source of truth that goes stale and needs reconciliation. |
| **Comments, replies, likes on a rec page** | Turns a share target into a social network, bringing moderation, spam, and abuse reporting — permanent cost against a promise about speed. |
| **User profiles, following, feeds** | Same reason. Tsugi is a link generator, not a destination. |
| **Watch-list / progress tracking** | This is what AniList and MAL already do well, and doing it badly is worse than not doing it. Tsugi links *out* to them. |
| **Recommendation algorithms / "similar titles"** | The name says recommendation, but the product means *a person recommending*, not a model inferring. No ML in scope. |
| **Email/password or magic-link auth** | Three OAuth providers is already the ceiling. Passwords bring resets, verification mail, and an email service — a large surface for a small gain. |
| **Merging the same title across providers** | AniList exposes `idMal`, so a cross-walk is possible. Not worth it: reconciling two catalogues introduces a whole class of "wrong title" bugs to solve a problem nobody has reported. |
| **A third media provider** | Two cover anime and manga. Each additional one is another id space, another adapter, another failure mode, another toggle option on the critical path. |
| **Mobile apps** | The share target is a browser link. Native adds distribution cost with no gain to the core promise. |
| **Internationalised UI** | English only. Media titles are already multilingual via provider data; translating the chrome is not the bottleneck. |
| **Analytics beyond the view counter** | A single integer answers "did anyone click it". More needs a consent banner, which costs time on the critical path. |
| **Custom OG card themes** | Rendering cost and QA surface scale with template count. One excellent card beats six adequate ones. |

## The test for a new feature request

Ask, in order:

1. Does it shorten the path from opinion to link? → Build it.
2. Does it make the shared card more clickable? → Consider it.
3. Does it lengthen that path? → Reject it, or put it behind the share modal.
4. Does it create a moderation, privacy, or abuse surface? → It needs its own decision entry
   with the ongoing cost written down before any code is written.

Related: [`project-overview.md`](./project-overview.md) · [`user-flow.md`](./user-flow.md)
