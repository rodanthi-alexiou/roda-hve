# Plan: Museum showcase — "The Visitor's Agentic Sidekick" (Met API)

**What we're building for the demo:** a visitor-facing, multimodal agent that plans a **themed self-guided visit** from the Met's CC0 collection — *"Build me a 6-stop family tour on animals in art across cultures"* → the agent searches, filters to works with images/highlights, sequences the stops, writes narration, and renders a visual gallery. Curator/educator value (assemble collections, draft labels) sits underneath as the enterprise hook. Built in `agentic-sidekick`, TypeScript + Foundry Agent Service, composed from CAIRA — a reusable golden accelerator.

## Steps (implementation handoff)

1. **Persist the scenario** — add a `## Showcase scenario — Museum (Met Collection API)` section to `fy27-plan/05-hve-journey.md`, placed after "Using Microsoft CAIRA" and before "## To do". (This is the only file edit; see the section outline below.)
2. *(Later, in the `agentic-sidekick` repo — separate handoff)* scaffold via the HVE 7-step arc, wire Foundry Agent Service (GPT-4o vision), build the Met tool layer, IaC from CAIRA, `azd up`.

## Section outline to write into the playbook

- One-paragraph framing (visitor-facing sidekick; curator value as B2B hook; `agentic-sidekick` = golden accelerator).
- *Why the Met API*: no-auth, CC0, high-res images, rich metadata, strong search filters → zero data-prep, safe, live.
- *Agent tools* table: `search_collection` / `get_object` / `list_departments` / `build_tour`|`find_related` → Met endpoints.
- *Signature aha moments*: tour-from-one-sentence, multimodal "explain this painting," cross-cultural tag connections, Coding Agent live feature.
- *Maps to CAIRA* mini-table: Foundry IaC (GPT-4o vision) / Container Apps / TS Foundry Agent Service API / React frontend.
- *Maps to the HVE 7-step arc*: one line referencing the existing arc.
- *Golden-accelerator payoff*: swap the Met tool layer for any partner's domain API.
- *Guardrail note*: `/search` returns IDs → batched+cached fan-out to `/objects`; filter `hasImages`+`isPublicDomain`.

## Scenario detail

**Scenario: "The Visitor's Agentic Sidekick"** — a conversational, multimodal agent that turns the Met's 470K+ open-access collection into **curated, narrated experiences**: themed self-guided tours, cross-cultural connections, and kid-friendly explanations — grounded live in the Met API via agentic tool-calling. Built in `agentic-sidekick` through the HVE loop, composed from CAIRA, and reusable as a golden accelerator by swapping the Met tool layer for any partner's domain API.

### Why the Met API is the ideal showcase data

- No API key, CC0 public domain, high-res images → works live on stage, safe content, **zero data-prep**.
- Rich structured metadata (department, culture, period, medium, tags, geoLocation, dates, artist) → maps cleanly to agent tool parameters.
- `primaryImage` on many objects → shows off Foundry **vision** (GPT-4o) multimodal.
- Search filters (`isHighlight`, `hasImages`, `isOnView`, `medium`, `geoLocation`, `dateBegin/End`, `tags`, `departmentId`) → natural **multi-step** agentic retrieval, not just Q&A.

### Agent tools (map to Met endpoints)

| Tool | Met endpoint | Purpose |
| --- | --- | --- |
| `search_collection(q, departmentId, medium, geoLocation, dateBegin/End, hasImages, isHighlight, isOnView, tags)` | `/search` | Returns object IDs matching filters |
| `get_object(objectID)` | `/objects/{id}` | Full metadata + image for one object |
| `list_departments()` | `/departments` | Valid departments + IDs |
| `build_tour` / `find_related` | derived | Sequence works by tag/culture/period |

### Signature "aha" moments (each proves agentic > autocomplete)

1. **Multi-step tour from one sentence**: *"Build a 6-stop family tour on animals in art across cultures"* → agent searches multiple departments, filters `hasImages`+`isHighlight`, sequences the stops, writes narration, renders a visual gallery.
2. **Multimodal**: *"Explain this painting to a 10-year-old"* (vision on the object image).
3. **Cross-cultural connections** via tags: *"How did different cultures depict cats?"*
4. **Coding Agent adds a feature live** (e.g. a `find_related_works` tool) while the room watches the PR open.

### How it maps to CAIRA (what's built)

| CAIRA component | Role in the sidekick |
| --- | --- |
| `iac/foundry/` | Foundry account + project + GPT-4o vision (+ optional embeddings for "find works that feel like this one") |
| `iac/container-apps/` | Two apps: agentic API + React frontend |
| Agentic API | TypeScript (Foundry Agent Service); tools wrap the Met API (`search_collection`, `get_object`, `list_departments`, `build_tour`) |
| `app/frontend/typescript/react/` | Chat + gallery grid + "tour" view |

### How it maps to the HVE 7-step demo arc

Reuses the existing 7-step arc: 1. Scaffold `agentic-sidekick` from a one-paragraph spec → 2. Wire Foundry SDK (chat+vision) → 3. Build the Met tool layer + agent tool-calling (the "RAG pipeline" equivalent) → 4. Tests + self-heal (mock the Met API) → 5. IaC + CI/CD from CAIRA + `azd` → 6. Hand a feature to Coding Agent, review its PR → 7. `azd up` → live, ask it to build a tour.

### Golden-accelerator payoff

The transferable asset isn't the museum app; it's the **pattern**: *agent + domain-API tools + Foundry + Container Apps + React, built via HVE, composed from CAIRA*. Met is the safe public stand-in for a customer's private API. Swap the tool layer → retail catalog, product docs, internal KB.

### Guardrail worth staging

`/search` returns IDs only, so you fan out to `/objects` (N+1). That's the perfect live moment to have the agent write a **batched + cached** fetch — showing agentic problem-solving, not just codegen. Filter `hasImages=true` + `isPublicDomain` for renderable, safe results. Rate limit is 80 req/s.

## Relevant files

- `fy27-plan/05-hve-journey.md` — insert the new section after the CAIRA section; reuse the existing 7-step demo-arc table and A/B/C/D framing rather than duplicating.

## Verification

1. Section renders after "Using Microsoft CAIRA," before "## To do"; markdown lint clean (`get_errors` on the file).
2. Tool table endpoints match the real Met API (`/search`, `/objects/{id}`, `/departments`).
3. No fabricated partner names/metrics; scenario stays vendor-neutral on the customer.

## Decisions (locked)

- Visitor-facing narrative leads; TypeScript + Foundry Agent Service; scenario persisted into the playbook.
