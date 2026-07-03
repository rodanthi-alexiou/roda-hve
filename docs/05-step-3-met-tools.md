---
title: "Step 3: Build the Met Tool Layer"
description: "Give the agent real capabilities with tool-calling against the Met Collection API, including a batched and cached fetch to solve the N+1 fan-out"
author: Microsoft
ms.date: 2026-07-03
ms.topic: how-to
keywords:
  - agent tool calling
  - met collection api
  - retrieval augmented generation
estimated_reading_time: 9
---

## Step 3: Build the Met Tool Layer

**Goal:** give the agent real capabilities. Add tools that call the Met
Collection API so the agent retrieves live, grounded artworks instead of
inventing them. This is the retrieval layer, the equivalent of a RAG pipeline,
but implemented as agentic tool-calling.

**Building blocks used:** HVE (RPI), Learn MCP for the tool-calling SDK.

### The tools the agent needs

Four tools cover the whole demo. Each maps to a Met API endpoint.

| Tool | Parameters | Met endpoint |
| ------------------- | ------------------------------------------------------------------------------- | ------------------- |
| `search_collection` | `q`, `departmentId`, `medium`, `geoLocation`, `dateBegin`, `dateEnd`, `hasImages`, `isHighlight`, `isOnView`, `tags` | `/search` |
| `get_object` | `objectID` | `/objects/{id}` |
| `list_departments` | none | `/departments` |
| `build_tour` / `find_related` | derived (sequence by tag, culture, period) | derived from the above |

See the [Met API reference](11-met-api-reference.md) for the full field list.

### The guardrail: solve the N+1 fan-out live

This is the signature engineering moment of the demo. The Met `/search` endpoint
returns only an array of object IDs. To show anything, you must call
`/objects/{id}` for each result. Done naively, a 40-result search fires 40
sequential requests. Have Copilot fix it on stage.

```text
/rpi-research Design the Met tool layer for agentic-sidekick. The /search
endpoint returns only object IDs, so get_object must fan out to /objects/{id}.
Design search_collection to batch and cache those fetches with a bounded
concurrency limit, and to always filter hasImages=true and isPublicDomain=true
so every returned work is safe to display. Use the Microsoft Learn MCP only if
needed for the agent tool-calling registration API. Produce a research document.
```

Then plan and implement, clearing context between phases.

```text
/clear
/rpi-plan Plan the Met tool layer: a typed Met client, the four tools, batched
and cached object fetching, and registration of the tools with the Foundry
agent.
```

```text
/clear
/rpi-implement Execute the Met tool layer plan.
```

### What the batched, cached fetch looks like

Your generated code should resemble this. It caps concurrency, caches by object
ID, and filters to safe, displayable works.

```typescript
// src/api/met/client.ts
const BASE = "https://collectionapi.metmuseum.org/public/collection/v1";
const cache = new Map<number, MetObject>();

async function getObject(id: number): Promise<MetObject | null> {
  if (cache.has(id)) return cache.get(id)!;
  const res = await fetch(`${BASE}/objects/${id}`);
  if (!res.ok) return null;
  const obj = (await res.json()) as MetObject;
  cache.set(id, obj);
  return obj;
}

// bounded fan-out: never more than `limit` requests in flight
async function getObjects(ids: number[], limit = 8): Promise<MetObject[]> {
  const out: MetObject[] = [];
  for (let i = 0; i < ids.length; i += limit) {
    const batch = ids.slice(i, i + limit).map(getObject);
    out.push(...(await Promise.all(batch)).filter((o): o is MetObject => !!o));
  }
  return out;
}

export async function searchCollection(params: SearchParams): Promise<MetObject[]> {
  const qs = new URLSearchParams({ hasImages: "true", ...toQuery(params) });
  const res = await fetch(`${BASE}/search?${qs}`);
  const { objectIDs } = (await res.json()) as { objectIDs: number[] | null };
  if (!objectIDs) return [];
  const objects = await getObjects(objectIDs.slice(0, 40));
  // only public-domain works with a usable image
  return objects.filter((o) => o.isPublicDomain && o.primaryImage);
}
```

> [!IMPORTANT]
> The `hasImages=true` filter and the `isPublicDomain` check are not optional.
> They are what make the demo safe to run live: every rendered work is CC0 and
> has an image.

### Register the tools with the agent

The agent needs to know these functions exist and when to call them. The
implementation registers them as tools on the Foundry agent, with schemas the
model can reason about.

```typescript
// src/api/agent/tools.ts
export const tools = [
  {
    type: "function",
    function: {
      name: "search_collection",
      description:
        "Search the Met collection. Use department, medium, tags, and date " +
        "filters to build themed, cross-cultural tours.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string" },
          departmentId: { type: "number" },
          medium: { type: "string" },
          tags: { type: "string" },
          isHighlight: { type: "boolean" },
        },
      },
    },
  },
  // get_object, list_departments, ...
];
```

### Verify grounded retrieval

Restart the API and ask for something specific. The agent should now call
`search_collection`, fan out through `get_object`, and answer with real works.

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Find three highlighted paintings of cats and tell me about them."}'
```

The response should reference actual Met object titles and image URLs. That is
the moment the agent stops guessing and starts retrieving.

### What you just demonstrated

* The agent now has real, tool-based retrieval against a live API.
* The N+1 fan-out became a batched, cached fetch, solved live, proving agentic
  problem-solving.
* Safety filters guarantee every displayed work is public domain with an image.

### Next

Continue to [Step 4: Tests and self-heal](06-step-4-tests-selfheal.md).
