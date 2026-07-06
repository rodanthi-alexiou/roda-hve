# Research: Met Collection API Tool Layer

**Topic:** The Met Collection API tool layer for the "Museum Sidekick" agentic app
**Tool layer location:** `museum-sidekick/src/api/src/met/`
**Stack:** TypeScript, Node 20+, ESM, Azure OpenAI GPT-4o chat-completions (`openai` npm, `AzureOpenAI` client) with function/tool calling
**Status:** Complete

## Summary

The Metropolitan Museum of Art Collection API is a keyless, RESTful/JSON web
service exposing 470,000+ Open Access artworks under a CC0 (public domain)
dedication. The base URL is
`https://collectionapi.metmuseum.org/public/collection/v1`. No API key or
registration is required; the only stated constraint is a rate limit of **80
requests per second**.

The Museum Sidekick tool layer uses four endpoints (`/objects/{objectID}`,
`/search`, `/departments`, and the `/objects` listing indirectly) to power four
agent-facing tools (`search_collection`, `get_object`, `list_departments`,
`find_related`). The core engineering challenge is an **N+1 fan-out**: `/search`
returns only object IDs (`{ total, objectIDs }`), so any visual result set
requires one `/objects/{id}` call per ID. The recommended solution is a
bounded-concurrency batched fetch (≈8 in flight) backed by an in-memory cache
keyed by `objectID`, combined with mandatory display guardrails: `hasImages=true`
(search filter) **plus** `isPublicDomain === true` **plus** a non-empty
`primaryImage`. Node 20's native `fetch` covers all HTTP needs — no extra HTTP
dependency. Testing uses vitest with a mocked global `fetch` to assert caching
(no duplicate network calls) and filter correctness (bad records excluded).

The existing `museum-sidekick/src/api/src/met/types.ts` already models the exact
subset of fields documented below (`MetObject`, `Department`, `SearchParams`,
`ArtworkCard`), so the research aligns with the current codebase.

## Endpoints

Base URL: `https://collectionapi.metmuseum.org/public/collection/v1`

All endpoints are `GET`, return JSON, require no auth, and are subject to the
80 req/s rate limit.

| Tool endpoint | Method + path | Returns | Notes |
| --- | --- | --- | --- |
| Object | `GET /objects/{objectID}` | Full object record (single JSON object) | Contains image URLs only when the work is Open Access. |
| Search | `GET /search?q=...` | `{ total: number, objectIDs: number[] \| null }` | **IDs only** — no metadata. `objectIDs` is `null` when `total` is 0. |
| Departments | `GET /departments` | `{ departments: [{ departmentId, displayName }] }` | Static-ish list of curatorial departments. |
| Objects listing | `GET /objects` | `{ total: number, objectIDs: number[] }` | All valid IDs; optional `departmentIds`/`metadataDate` filters. Not directly needed by the four tools but documents the ID-only pattern. |

### `GET /objects/{objectID}` — object record

Returns one object with all Open Access data. The fields the tool layer consumes
(matching `MetObject` in `museum-sidekick/src/api/src/met/types.ts`):

| Field | Type | Meaning |
| --- | --- | --- |
| `objectID` | int | Unique identifying number for the artwork (usable as a key). |
| `isHighlight` | boolean | `true` = popular/important work in the collection. |
| `isPublicDomain` | boolean | `true` = artwork is in the public domain (safe to display). |
| `primaryImage` | string | URL to the full-res primary image (JPEG). Empty string when no Open Access image. |
| `primaryImageSmall` | string | URL to the lower-res primary image (JPEG). |
| `title` | string | Title/name of the work, e.g. `"Wheat Field with Cypresses"`. |
| `artistDisplayName` | string | Artist name in display order, e.g. `"Vincent van Gogh"`. |
| `artistDisplayBio` | string | Nationality + life dates, e.g. `"Dutch, Zundert 1853–1890 Auvers-sur-Oise"`. |
| `objectDate` | string | Human-readable date/span, e.g. `"ca. 1796"`, `"19th century"`. |
| `medium` | string | Materials, e.g. `"Oil on canvas"`. |
| `dimensions` | string | Size text, e.g. `"16 x 20 in. (40.6 x 50.8 cm)"`. |
| `department` | string | Curatorial department name, e.g. `"European Paintings"`. |
| `culture` | string | Culture/people of origin, e.g. `"Japan"` (frequently empty). |
| `period` | string | Time period, e.g. `"Edo period (1615–1868)"` (frequently empty). |
| `classification` | string | General type, e.g. `"Paintings"`, `"Ceramics"`. |
| `objectURL` | string | Public metmuseum.org page for the work. |
| `tags` | `{ term: string }[] \| null` | Subject keyword tags (each also has `AAT_URL`, `Wikidata_URL`). **Can be `null`.** |

Additional fields exist (`accessionNumber`, `constituents[]`, `objectBeginDate`,
`objectEndDate`, `additionalImages[]`, `measurements[]`, `GalleryNumber`, etc.)
but are not required by the four tools. Real example object: `45734` ("Quail and
Millet", Kiyohara Yukinobu, `isPublicDomain: true`).

**Guardrail note:** `primaryImage` can be an empty string and `tags` can be
`null` even on a valid 200 response. Both must be handled defensively.

### `GET /search` — ID-only search

Returns **only** `{ total, objectIDs }`. `objectIDs` is `null` when `total === 0`.
Query parameters (all optional except `q`):

| Param | Type | Behavior |
| --- | --- | --- |
| `q` | string (required) | Search term matched across the object's data, e.g. `q=sunflowers`. |
| `hasImages` | boolean (case-sensitive) | Restrict to objects that have images. **Essential for display.** |
| `departmentId` | integer | Restrict to one department (IDs from `/departments`). |
| `medium` | string, `\|`-separated (case-sensitive) | Restrict to medium/object type, e.g. `medium=Paintings\|Ceramics`. |
| `geoLocation` | string, `\|`-separated (case-sensitive) | Restrict to geography, e.g. `geoLocation=France\|Paris`. |
| `dateBegin` + `dateEnd` | integers (must use both) | Year range; negatives = B.C., e.g. `dateBegin=1700&dateEnd=1800`. |
| `isHighlight` | boolean (case-sensitive) | Restrict to highlight works. |
| `isOnView` | boolean (case-sensitive) | Restrict to works currently on view. |
| `tags` | boolean (case-sensitive) | Search specifically against the subject keyword tags field. |
| `title` | boolean (case-sensitive) | Search specifically against the title field. |
| `artistOrCulture` | boolean (case-sensitive) | Search specifically against artist name or culture field. |

Real examples:
- `/search?q=sunflowers` → `{ "total": 27, "objectIDs": [...] }`
- `/search?isHighlight=true&q=sunflowers` → `{ "total": 3, "objectIDs": [437329, 436121, 436535] }`
- `/search?hasImages=true&q=Auguste Renoir` → `{ "total": 66, "objectIDs": [...] }`

**Critical:** boolean and string filter params are **case-sensitive** and expect
the literal string `true`/`false`. The `|` character is the multi-value
delimiter for `medium` and `geoLocation` (URL-encode as needed).

### `GET /departments` — department list

Returns `{ departments: [{ departmentId: number, displayName: string }] }`.
`departmentId` is the integer used as the `departmentId`/`departmentIds` query
param on `/search` and `/objects`. The documented list (19 departments) includes:

| departmentId | displayName |
| --- | --- |
| 1 | American Decorative Arts |
| 3 | Ancient Near Eastern Art |
| 4 | Arms and Armor |
| 5 | Arts of Africa, Oceania, and the Americas |
| 6 | Asian Art |
| 7 | The Cloisters |
| 8 | The Costume Institute |
| 9 | Drawings and Prints |
| 10 | Egyptian Art |
| 11 | European Paintings |
| 12 | European Sculpture and Decorative Arts |
| 13 | Greek and Roman Art |
| 14 | Islamic Art |
| 15 | The Robert Lehman Collection |
| 16 | The Libraries |
| 17 | Medieval Art |
| 18 | Musical Instruments |
| 19 | Photographs |
| 21 | Modern Art |

(Note the gap: there is no departmentId 2 or 20 in the documented sample — the
list should be fetched live rather than hardcoded.)

### Rate limit guidance

The official docs state: *"At this time, we do not require API users to register
or obtain an API key to use the service. Please limit request rate to 80 requests
per second."* The bounded-concurrency fan-out (≈8 in flight) stays far under this
ceiling and is the primary mechanism keeping the tool layer polite.

## N+1 fan-out and guardrails

### The problem

`/search` returns only `{ total, objectIDs }` — no titles, artists, or images.
To render a gallery of N results, the tool layer must issue **N separate**
`/objects/{id}` calls. Naively awaiting them serially is slow; firing all N at
once risks tripping the 80 req/s limit and wastes work on records that turn out
to have no displayable image.

### The solution: bounded-concurrency batched fetch + cache

1. **Cap the result window.** Only hydrate the first K IDs (e.g. K = 12–24) that
   the agent/UI will actually show, not the full `objectIDs` array (which can be
   thousands long).
2. **Bounded concurrency.** Run the `/objects/{id}` fetches through a concurrency
   limiter of ≈8 in flight (a small promise pool / worker loop). This keeps
   throughput high while staying well under 80 req/s.
3. **In-memory cache keyed by `objectID`.** Wrap `get_object` in a
   `Map<number, MetObject>` (or `Map<number, Promise<MetObject>>` to dedupe
   concurrent in-flight requests for the same ID). Repeated lookups —
   e.g. `find_related` re-touching an already-seen work, or a follow-up chat
   turn — hit the cache instead of the network. The cache is process-local and
   ephemeral (matches the SPEC non-goal of "no persistence").

### Mandatory display guardrails

Every work shown to the user must pass **all three** checks. Any one being false
means the record is unsafe/unusable for display and must be filtered out:

1. **`hasImages=true` (search-time filter):** narrows `/search` results to
   objects that have images *before* fan-out, reducing wasted `/objects/{id}`
   calls. This is a query param on `/search`, not a property check.
2. **`isPublicDomain === true` (post-fetch check):** only CC0/public-domain works
   are legally safe to display and re-serve. `hasImages=true` alone does **not**
   guarantee public domain — a work can have an image that is still under
   copyright (`rightsAndReproduction` populated, `isPublicDomain: false`).
3. **Non-empty `primaryImage` (post-fetch check):** even with `hasImages=true`
   and `isPublicDomain: true`, `primaryImage` can be an empty string. A gallery
   card with no image URL is broken, so require `primaryImage` to be a
   non-empty string (fall back to `primaryImageSmall` only if the product decides
   to, but the safe default is to require `primaryImage`).

Because these guardrails drop records, the hydrated/filtered result count will
often be **smaller** than `total` or than K — the tool layer should over-fetch
slightly (hydrate a few more IDs than the target display count) to compensate.

### Error handling

- **Non-200 responses:** treat any non-`ok` HTTP status as a failure. For a
  single `get_object`, throw/propagate a typed error. Inside a batched fan-out,
  fail *soft* — skip the individual failed/404 ID and continue, so one bad ID
  does not sink the whole gallery.
- **`objectIDs === null`:** when `/search` returns `total: 0`, `objectIDs` is
  `null`. Normalize to an empty array and return "no results" rather than
  iterating `null`.
- **Objects without images:** filtered by the non-empty `primaryImage` guardrail
  above; never surfaced to the user.
- **`tags === null`:** the `tags` field can be `null` on valid objects.
  `find_related` and any tag logic must null-guard before reading `tags[0].term`.

## Tool schemas

The agent uses Azure OpenAI GPT-4o **function/tool calling**, so each tool is an
OpenAI-style function tool definition (`type: "function"`, JSON-schema
`parameters`) paired with a TypeScript executor. Recommended definitions:

### `search_collection`

Themed, filtered search. Maps to `/search`; internally forces `hasImages=true`
and hydrates + filters results before returning `ArtworkCard[]`.

```json
{
  "type": "function",
  "function": {
    "name": "search_collection",
    "description": "Search the Met's public-domain collection for artworks matching a theme or keyword. Returns hydrated artwork cards (title, artist, image) for public-domain works that have images. Use this to plan tours or find works on a subject.",
    "parameters": {
      "type": "object",
      "properties": {
        "q": {
          "type": "string",
          "description": "Search term or theme, e.g. 'sunflowers', 'samurai armor', 'Impressionism'."
        },
        "departmentId": {
          "type": "integer",
          "description": "Optional department ID to restrict the search (from list_departments)."
        },
        "medium": {
          "type": "string",
          "description": "Optional medium/object type filter, e.g. 'Paintings' or 'Ceramics|Sculpture' (pipe-separated, case-sensitive)."
        },
        "geoLocation": {
          "type": "string",
          "description": "Optional geographic filter, e.g. 'France' or 'Japan|China' (pipe-separated, case-sensitive)."
        },
        "dateBegin": {
          "type": "integer",
          "description": "Optional start year (use together with dateEnd). Negative for B.C."
        },
        "dateEnd": {
          "type": "integer",
          "description": "Optional end year (use together with dateBegin). Negative for B.C."
        },
        "isHighlight": {
          "type": "boolean",
          "description": "Optional. Restrict to highlight (notable) works."
        },
        "isOnView": {
          "type": "boolean",
          "description": "Optional. Restrict to works currently on view in the museum."
        },
        "limit": {
          "type": "integer",
          "description": "Optional max number of artwork cards to return after filtering (default 12).",
          "minimum": 1,
          "maximum": 40
        }
      },
      "required": ["q"]
    }
  }
}
```

### `get_object`

Full metadata + image for one work. Maps to `/objects/{objectID}`; served through
the cache.

```json
{
  "type": "function",
  "function": {
    "name": "get_object",
    "description": "Fetch the full metadata and image for a single Met artwork by its object ID. Use this to explain or describe one specific work in detail.",
    "parameters": {
      "type": "object",
      "properties": {
        "objectID": {
          "type": "integer",
          "description": "The Met object ID, e.g. 45734."
        }
      },
      "required": ["objectID"]
    }
  }
}
```

### `list_departments`

Browse the curatorial departments. Maps to `/departments`.

```json
{
  "type": "function",
  "function": {
    "name": "list_departments",
    "description": "List the Met's curatorial departments with their IDs and display names. Use the returned departmentId to scope a search_collection call.",
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  }
}
```

### `find_related`

Derived tool: given an object, search by its dominant tag/culture/medium and
return other public-domain works, excluding the original. Internally: `get_object`
(cached) → pick a facet (first non-empty of `tags[0].term`, `culture`, `medium`) →
`search_collection`-style hydrated search → filter out the source `objectID`.

```json
{
  "type": "function",
  "function": {
    "name": "find_related",
    "description": "Given an object ID, find other public-domain works related to it by its dominant subject tag, culture, or medium. Excludes the original work. Use this to suggest 'if you liked this, see also…' recommendations.",
    "parameters": {
      "type": "object",
      "properties": {
        "objectID": {
          "type": "integer",
          "description": "The source Met object ID to find related works for."
        },
        "limit": {
          "type": "integer",
          "description": "Optional max number of related artwork cards to return (default 6).",
          "minimum": 1,
          "maximum": 20
        }
      },
      "required": ["objectID"]
    }
  }
}
```

## HTTP client: Node 20 native `fetch`

Node 20+ ships a stable global `fetch` (Undici-backed), so **no extra HTTP
dependency** (`axios`, `node-fetch`, `got`) is required. The tool layer can call
`await fetch(url)` directly. This keeps the dependency footprint minimal and makes
mocking trivial in tests (replace the global `fetch`). Confirm `"type": "module"`
in `package.json` (ESM) so top-level `fetch` and `import`/`export` work as
expected. Because `fetch` does not throw on 4xx/5xx, always check `response.ok`
and branch on status explicitly.

## Testing (vitest)

Recommended vitest approach for `museum-sidekick/src/api/src/met/`:

1. **Mock global `fetch`.** Use `vi.stubGlobal('fetch', vi.fn())` (or
   `globalThis.fetch = vi.fn()`) and return canned `Response`-like objects
   (`{ ok: true, status: 200, json: async () => fixture }`). Reset with
   `vi.restoreAllMocks()` / `vi.clearAllMocks()` in `afterEach`.
2. **Assert the cache prevents duplicate network calls.** Call `get_object(45734)`
   twice; assert the mocked `fetch` was called **once** (`expect(fetch).toHaveBeenCalledTimes(1)`).
   Also verify a batched fan-out over IDs `[1, 1, 2]` only fetches `1` and `2`
   once each (dedupe of in-flight + cached).
3. **Assert public-domain / image filters exclude bad records.** Provide fixtures
   for:
   - a valid work (`isPublicDomain: true`, non-empty `primaryImage`) → **included**;
   - a copyrighted work (`isPublicDomain: false`, has image) → **excluded**;
   - a public-domain work with `primaryImage: ""` → **excluded**;
   Assert the returned `ArtworkCard[]` contains only the valid work.
4. **Assert `/search` edge cases.** Fixture with `{ total: 0, objectIDs: null }`
   → tool returns `[]` and issues no `/objects/{id}` fan-out calls.
5. **Assert error handling.** A `{ ok: false, status: 404 }` for one ID inside a
   batch is skipped (soft-fail) while sibling IDs still resolve; a non-200 for a
   direct `get_object` throws/propagates.
6. **Assert `find_related` behavior.** Source object fixture with a known tag;
   assert the follow-up search excludes the source `objectID` and null-guards a
   `tags: null` source (falls back to `culture`/`medium`).

Config already present: `museum-sidekick/src/api/vitest.config.ts`.

## Codebase alignment

The current `museum-sidekick/src/api/src/met/types.ts` already defines
`MetObject`, `Department`, `SearchParams`, and `ArtworkCard` with exactly the
field subset documented here (including `tags: { term: string }[] | null`),
confirming the research matches the intended implementation. `SPEC.md` documents
the same four tools, the N+1 fan-out guardrail (`hasImages=true` +
`isPublicDomain=true`), and the batched/cached/bounded-concurrency solution.

## Open questions / clarifying items

- **Cache TTL / eviction:** none proposed (process-local, ephemeral per SPEC).
  Confirm whether a size cap is desired for long-running Container App instances.
- **`departmentId` vs `departmentIds`:** `/search` uses singular `departmentId`
  (one department); `/objects` uses `departmentIds` (pipe-separated). The tools
  only need the singular form on `/search`.
- **Fan-out window K and concurrency limit:** ≈8 concurrency and K ≈ 12–24 are
  recommended defaults; final values are a tuning decision for the implementer.

## References

- The Met Collection API — official docs: https://metmuseum.github.io/
- The Met Open Access GitHub (datasets): https://github.com/metmuseum/openaccess
- The Met API base URL: https://collectionapi.metmuseum.org/public/collection/v1
- Example object endpoint: https://collectionapi.metmuseum.org/public/collection/v1/objects/45734
- Example search endpoint: https://collectionapi.metmuseum.org/public/collection/v1/search?q=sunflowers
- Departments endpoint: https://collectionapi.metmuseum.org/public/collection/v1/departments
- The Met terms and conditions: https://www.metmuseum.org/information/terms-and-conditions
- Creative Commons Zero (CC0) 1.0: https://creativecommons.org/publicdomain/zero/1.0/
- Node.js 20 global fetch (Undici): https://nodejs.org/dist/latest-v20.x/docs/api/globals.html#fetch
- OpenAI function/tool calling (schema shape): https://platform.openai.com/docs/guides/function-calling
- Vitest mocking / vi.stubGlobal: https://vitest.dev/api/vi.html#vi-stubglobal
