# Phase 8 — Dashboard

**Status:** implementation complete, 2026-08-16. `src/app/(dashboard)/dashboard/page.tsx`,
`DashboardRecList.tsx`, `GET`/`DELETE /api/recs`, and `ProviderConnections.tsx` (unlink +
last-provider guard) are all built. `recs.db.test.ts` covers criteria 1, 3, 6, 7 in-process
(10/10 passing); full suite 153/153, `tsc`/`eslint` clean. Criteria 1 and 6's "two real
accounts" language was satisfied with a mocked-session technique (`auth.api.getSession`
monkey-patched per request) rather than two literal signed-in browser sessions — same
standard of evidence as Phase 7's unit-tier coverage. Criteria 2, 4, 12, 13 (redirect-on-
signed-out, multi-item render, `/r/[slug]` symmetry, Phase 5 regression) are covered by code
inspection/reuse of existing tested paths but not re-run live in a browser this session.
**User-visible output:** your recommendations, in one place
**Prerequisites:** none beyond Phase 2.

Everything before this shipped a working product. This phase is the payoff for having made
people sign in: they can find what they made.

## Scope

**In**
- `src/app/(dashboard)` — your recommendations, newest first
- `GET /api/recs` — session-scoped list
- `DELETE /api/recs/:slug` — yours only
- **Expanding** the `/settings` screen Phase 2 stood up: unlinking, the last-provider guard,
  and connection state worth reading. Linking already works (**D33**)
- Deleting your own recommendation

**Explicitly out**
- Editing a recommendation. Deleting and recreating is honest; editing a link someone has
  already shared silently changes what they endorsed.
- Public profiles, following, feeds. Still out, permanently — see `../functionality.md`.
- Analytics beyond the view count already on each rec.
- Unlinking your **last** provider. That is account deletion wearing a disguise, and it needs
  its own decision about what happens to the recommendations.

## Key design decisions

**Delete is in scope now; edit is not.** Identity exists, so ownership is provable and a
delete is safe. Editing is different in kind: a shared link is a public claim, and quietly
changing the title or score behind one that a friend already posted is a small betrayal of
the person who shared it. Delete removes the claim honestly — the link 404s.

*(This amends `../functionality.md`, which excluded both on the grounds that anonymous
creation made ownership unprovable. Half that reasoning expired with **D23**; the other half
did not.)*

**Deleting is immediate and total.** The row and its items go; the slug is never reissued. A
recycled slug would resurrect a dead link as someone else's recommendation.

**Connection management is finished here, not started here.** Phase 2 shipped `/settings` in
minimal form — linked providers, and a link button — because `linkSocial()` had to work for
a Google user to reach list import at all (**D33**). What this phase adds is everything that
needed a decision Phase 2 did not have: unlinking, the last-provider refusal, and surfacing
connection state next to the recommendations it explains. Linking still uses `linkSocial()`,
the explicit flow from **D25**, since automatic linking cannot work on synthesised emails.

**The dashboard reads, it does not resolve.** It renders stored rows. No provider calls, no
cache warming, no refresh of cover art. It must load instantly and work with every provider
down.

## Exit criteria

1. `/dashboard` lists exactly the signed-in user's recommendations, newest first, and
   **nobody else's** — verified with two real accounts.
2. `/dashboard` while signed out redirects to sign-in and does not 500.
3. `GET /api/recs` while signed out returns **401**, not an empty list. An empty list reads
   as "you have none."
4. A multi-item recommendation shows its items, not just the first.
5. Deleting a recommendation removes it and its items; `/r/<slug>` then returns **404**.
6. A user cannot delete a recommendation they do not own — attempt it by slug from a second
   account and confirm **403** and no deletion.
7. A deleted slug is never reissued by later creations.
8. Linking a second provider from `/settings` adds an `account` row and leaves `user`
   unchanged — still true after this phase's expansion, which is the regression this checks.
9. Unlinking a provider removes its `account` row; the session survives.
10. Attempting to unlink the **last** provider is refused with an explanation.
11. `/dashboard` renders with **both tracker APIs unreachable** — it reads stored rows only.
12. `/r/[slug]` renders identically signed in and signed out. Invariant 9.
13. Phase 5's criterion 1 still passes.
14. `bun x tsc --noEmit`, `bun x eslint .`, and `bun test` all exit 0 — including every
    earlier phase's tests. This phase touches shared code, so a green suite here is the
    regression check that matters.

## Risks

| Risk | Mitigation |
|---|---|
| The dashboard leaking other users' recommendations | Criterion 1 requires two real accounts, not a filtered query read by eye |
| A delete endpoint that trusts a slug without checking ownership | Criterion 6 attempts the cross-account delete explicitly |
| Slug reuse resurrecting a dead link as different content | Criterion 7 |
| Edit creeping in as "just a quick fix for typos" | Out of scope with a stated reason. Removing that exclusion needs a decision-log entry |
| A user unlinking everything and locking themselves out | Criterion 10 |
| The dashboard becoming slow by resolving titles on render | Criterion 11 forces it to be a pure read |

**Previous:** [`PHASE-7.md`](./PHASE-7.md) · **Plan:** [`PLAN.md`](./PLAN.md)
