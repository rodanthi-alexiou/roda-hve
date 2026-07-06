# Implementation Plan: Met Tool Layer

**Source research:** [met-tool-layer-research.md](../research/met-tool-layer-research.md)
**Target location:** `museum-sidekick/src/api/src/met/`
**Stack:** TypeScript, Node 20+ ESM, native `fetch`, vitest

## Objective

Implement the four-tool Met Collection API layer that grounds the agent in real,
public-domain artworks, solving the N+1 fan-out with a batched, cached,
bounded-concurrency fetch and mandatory display guardrails.

## Files to create

| File | Purpose |
| --- | --- |
| `src/api/src/met/client.ts` | Typed Met HTTP client: `getObject` (cached), `getObjects` (bounded fan-out), `searchCollection`, `listDepartments`, `findRelated`, `toArtworkCard`. |
| `src/api/src/met/tools.ts` | OpenAI function-tool definitions + a `dispatchTool(name, args)` executor mapping tool calls to client functions. |
| `src/api/src/met/client.test.ts` | vitest suite: cache dedupe, guardrail filtering, `/search` empty case, soft-fail on 404, `find_related` facet selection. |

## Design decisions (from research)

1. **Cache:** `Map<number, Promise<MetObject | null>>` keyed by `objectID` to
   dedupe both completed and in-flight fetches. Process-local, unbounded,
   ephemeral (matches SPEC "no persistence").
2. **Bounded concurrency:** fan out `/objects/{id}` in slices of `CONCURRENCY = 8`.
3. **Window cap:** hydrate at most `hydrateCount = limit * 2` IDs (over-fetch to
   compensate for guardrail drops), then trim to `limit` after filtering.
4. **Guardrails (all three):** search forces `hasImages=true`; results kept only
   if `isPublicDomain === true` **and** `primaryImage` is a non-empty string.
5. **Booleans are case-sensitive literal `true`/`false`** in query strings.
6. **Error handling:** `fetch` never throws on 4xx/5xx → check `response.ok`.
   Single `getObject` returns `null` on non-ok (cache the null to avoid retry
   storms); batch fan-out drops nulls (soft-fail). `/search` `objectIDs: null` →
   `[]`.
7. **`find_related`:** `getObject(id)` → pick first non-empty of `tags[0].term`,
   `culture`, `medium` (null-guard `tags`) → hydrated search on that facet →
   exclude source `objectID`.

## Task checklist

- [ ] **T1 — `client.ts` constants + `getObject`**: base URL, `CONCURRENCY`,
  in-memory cache; `getObject(id)` checks cache, fetches `/objects/{id}`, checks
  `response.ok`, caches promise, returns `MetObject | null`.
- [ ] **T2 — `getObjects` bounded fan-out**: slice IDs into batches of 8,
  `Promise.all` each batch through `getObject`, drop nulls, concatenate.
- [ ] **T3 — `toQuery` + `searchCollection`**: build query string forcing
  `hasImages=true`, serialize booleans as literal strings, only include provided
  params; parse `{ total, objectIDs }`, normalize null, cap window, hydrate via
  `getObjects`, filter guardrails, trim to `limit`, map to `ArtworkCard[]`.
- [ ] **T4 — `listDepartments`**: fetch `/departments`, return `Department[]`
  (live, not hardcoded).
- [ ] **T5 — `findRelated`**: cached `getObject`, facet selection with
  null-guards, hydrated search, exclude source ID, trim to `limit`.
- [ ] **T6 — `toArtworkCard` mapper**: `MetObject` → `ArtworkCard`.
- [ ] **T7 — `tools.ts`**: export the four function-tool JSON definitions and a
  `dispatchTool(name, argsJson)` that validates/coerces args and calls the client.
- [ ] **T8 — `client.test.ts`**: implement the six vitest scenarios from research
  §Testing (mock global `fetch`).
- [ ] **T9 — Validate**: `npm install`, `npm run build --workspace api`,
  `npm test --workspace api` all green.

## Out of scope

- Cache eviction/TTL (unbounded ephemeral is acceptable for the POC).
- Agent wiring (next RPI cycle, via the `caira` skill + Learn MCP).
- HTTP retries/backoff (80 req/s ceiling is far above our bounded fan-out).
