# Phase 3 — Media providers

**Status:** not started
**User-visible output:** none

The riskiest phase, placed early on purpose. Neither provider is under our control, and
verification found both of them constrained: AniList caps at 30 requests per minute per IP,
and Jikan returns HTTP 504 on roughly half of all calls. Everything downstream assumes this
phase absorbed those facts.

## Scope

**In**
- `src/lib/types/media.ts` — `UnifiedMediaResult` and the `Provider` union
- `src/lib/providers/anilist-client.ts` — browser-side AniList search
- `src/lib/providers/jikan-client.ts` — browser-side Jikan search
- `src/lib/providers/index.ts` — dispatch on the selected provider
- `src/server/services/media.ts` — server-side resolve-by-id, **within one provider**
- Response validation for both providers
- Timeouts, one same-provider retry, structured logging
- Recorded fixtures for both providers, and the injectable-`fetch` seam described in
  `../code-standards.md`

**Explicitly out**
- **Cross-provider fallback of any kind.** Removed by decision **D15** — it is not a
  simplification, it is a correctness bug. See below.
- Any UI. The provider toggle is Phase 5; this phase ends at typed functions.
- The Hono route that calls the service — Phase 4.
- Redis caching. Deferred to Phase 4 where Upstash is already wired. Design the service so
  caching wraps it without modification.
- Using AniList's `idMal` to translate between providers. It exists and is recorded in
  `../tech-stack.md`, but nothing in v1 needs it.

## Deliverables

```ts
type Provider = "anilist" | "mal";

type UnifiedMediaResult = {
  provider: Provider;            // part of identity, not metadata
  externalId: number;            // meaningless without `provider`
  mediaType: "anime" | "manga";
  title: string;                 // best available, already chosen
  titleNative: string | null;
  coverImage: string | null;
  year: number | null;
  averageScore: number | null;   // normalised 0–100
};
```

- `searchMedia(provider, query, mediaType, signal)` — browser, queries only that provider
- `resolveMedia(provider, externalId, mediaType)` — server, queries only that provider
- `ProviderResult<T>` discriminated union per `../code-standards.md`

## Key design decisions

**There is no cross-provider fallback, and this is a correction.** An earlier version of this
plan had `resolveMedia` fall through from AniList to Jikan. That was wrong. Verified live on
2026-08-09:

```
AniList  "Sousou no Frieren"  → id 154587,  idMal 52991
AniList  Media(id: 52991)     → 404 Not Found
```

The id spaces are disjoint. Falling back would look up **a different anime** under the same
number, or nothing at all, and store it on a user's recommendation card. The brief's
requirement 4 ("auto-fallback handling if the primary provider throws") is not implementable
by id and has been withdrawn. (**D15**)

**The user picks the provider; the code never overrides that.** A toggle selects AniList or
MyAnimeList before searching. On failure the UI offers a one-tap switch that flips the
toggle and re-runs the query — an explicit, visible action, not a silent substitution.
(**D14**)

**Both adapters run in the browser.** Both providers send
`Access-Control-Allow-Origin: *`, verified including on preflight. AniList's live
`x-ratelimit-limit` header reads **30** per minute per IP, and Vercel functions egress from a
small shared address pool, so a server-side typeahead proxy would put every user of the
product into one bucket. Browser-side search spends each user's own quota. (**D3**)

**`title` is chosen in the adapter, not downstream.** AniList returns romaji, English, and
native, and English is frequently `null` — verified live: *Sousou no Frieren* has one, its
third season does not. The adapter picks English → romaji → native once, so no component
ever writes that fallback chain again.

**`averageScore` is normalised to 0–100.** AniList returns 0–100; Jikan returns 0–10. Two
scales reaching the UI would eventually be rendered with the wrong one. This is the
*provider's* aggregate score, entirely separate from the user's own rating — which is a
`(scoreRaw, scoreFormat)` pair in one of five scales and is never normalised (**D28**).

**A Jikan 5xx is an expected outcome, not an exception.** It is retried once against Jikan,
then returns `{ ok: false, reason: "unavailable" }`. It never throws — one uncaught rejection
here takes down the create flow. Because Jikan sends CORS headers even on its 504, the
browser sees a real status rather than an opaque network error, so the failure is
distinguishable and reportable.

**Every call carries `AbortSignal.timeout`.** 3 s for typeahead — beyond that the user has
typed again anyway. 5 s for server resolution. Invariant 11.

## Exit criteria

All of these are `bun test` cases. Criteria 1–3 run against **recorded fixtures**, not the
live APIs — a suite that calls AniList competes with the developer's own 30/min budget, and
one that calls Jikan fails about half the time.

The live equivalents of criteria 1–3 belong in `providers.contract.test.ts`, excluded from
the CI gate and run deliberately when checking whether our assumptions still hold. When a
contract test fails, the fix is usually an update to `../tech-stack.md`.

Forced failures use the injectable-`fetch` seam from `../code-standards.md` — a constructor
parameter, never a runtime flag.

1. `searchMedia("anilist", "frieren", "anime")` returns ≥1 result whose first entry has
   `title === "Frieren: Beyond Journey's End"`, `externalId === 154587`,
   `provider === "anilist"`, and a non-null `coverImage`.
2. `searchMedia("mal", "frieren", "anime")` returns ≥1 result with
   `provider === "mal"` and `externalId === 52991` — **a different number for the same
   show**, which is the whole point.
3. `searchMedia("anilist", "berserk", "manga")` returns results with
   `mediaType === "manga"`.
4. Results from both providers satisfy the same type with no extra or missing keys —
   compare `Object.keys()` of one result from each.
5. `resolveMedia("anilist", 154587, "anime")` returns `ok: true` with the correct title.
6. **`resolveMedia("mal", 154587, "anime")` does not return Frieren.** It returns either a
   different title or `ok: false`. This criterion exists to prove the id spaces are treated
   as separate; if it ever returns Frieren, the dispatch is broken.
7. With the chosen provider forced to fail, the call returns `{ ok: false, reason: … }` and
   **never** returns data from the other provider. Assert on `provider` in any result.
8. With a provider forced to fail, the call **does not throw**. Assert no rejection.
9. With a provider forced to hang, the call settles within 6 s. Assert elapsed time.
10. A malformed provider payload produces `ok: false`, never a partially-populated
    `UnifiedMediaResult`.
11. `grep -rn "anilist\|jikan\|myanimelist" src/server/services/media.ts` shows the two
    adapters dispatched from a single switch on `provider`, with no fall-through path
    between them.
12. Every `fetch` in every adapter passes a `signal` — the `signal` count matches the
    `fetch` count in each file.
13. A failed provider call emits a log line naming provider, reason, and elapsed ms.
14. `bun x tsc --noEmit` and `bun x eslint .` exit 0.

## Risks

| Risk | Mitigation |
|---|---|
| **Someone re-introduces cross-provider fallback as a "robustness improvement"** | The highest-consequence risk in the project — it silently stores the wrong anime. Criterion 6 and 7 both test for it; the evidence sits in `../tech-stack.md` and invariant 2 |
| Jikan's flakiness read as a bug in our code | Recorded as measured behaviour in `../tech-stack.md`; the retry is same-provider only |
| A user selecting MyAnimeList and hitting frequent failures | Expected. The one-tap switch (D14) is the designed response, built in Phase 4 |
| `provider` dropped somewhere in the pipeline, leaving a bare id | It is a required field on `UnifiedMediaResult`, a not-null column in Phase 1, and part of the Phase 3 request body |
| An agent merging the two browser adapters "for DRY" | They share a type, not an implementation; the dispatch module is the shared surface |
| Test criteria depending on live third-party data | Criteria 1 and 2 pin a stable, popular title. If one breaks, verify against the live API and update this file rather than loosening the assertion. |

**Next:** [`PHASE-4.md`](./PHASE-4.md)
