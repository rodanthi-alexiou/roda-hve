# SPEC: Museum Sidekick

The Visitor's Agentic Sidekick — a conversational museum guide that plans tours
and explains artworks using **only** real, public-domain works retrieved live
from the Metropolitan Museum of Art Collection API.

## Goal

A cost-conscious proof of concept that demonstrates an agentic app built with
High Velocity Engineering (HVE) practices and Azure building blocks:

- A GPT-4o vision agent that chats, plans themed tours, and explains images.
- A tool layer that grounds every answer in the keyless, CC0 Met Collection API.
- A React frontend with a chat panel and an artwork gallery.
- Full-stack deployment via `azd up` (Terraform + Azure Container Apps).

## Non-goals

- No user accounts, persistence, or database.
- No paid data sources — the Met API is free and needs no key.
- Not production-hardened; this is a demo/POC. Tear down with `azd down --purge`.

## Architecture

```
React frontend ──HTTP──> Agent API ──> Azure OpenAI (GPT-4o vision)
                             │
                             └──> Met tool layer ──> Met Collection API
```

Both the API and frontend run as Azure Container Apps (scale-to-zero to keep the
POC cheap). Locally, both run on `localhost`.

## The four tools

| Tool | Purpose | Met endpoint |
| --- | --- | --- |
| `search_collection` | Themed, filtered search | `/search` |
| `get_object` | Full metadata + image for one work | `/objects/{id}` |
| `list_departments` | Browse the 19 curatorial departments | `/departments` |
| `find_related` | Related works by tag/culture/medium | derived |

## The engineering guardrail

`/search` returns object IDs only. `get_object` must fan out to `/objects/{id}`.
The tool layer solves this N+1 fan-out with a **batched, cached** fetch (bounded
concurrency) and always filters `hasImages=true` + `isPublicDomain=true` so every
displayed work is safe.

## Cost controls (POC)

- GPT-4o deployment at a minimal capacity (see `infra/variables.tf`).
- Container Apps `min_replicas = 0` (scale to zero when idle).
- Consumption workload profile.
- `azd down --purge` after the demo.

## Implementation notes

The agent is implemented with the **Azure OpenAI GPT-4o** chat-completions API
(`openai` package, `AzureOpenAI` client) using function/tool calling and image
content parts for vision. This is a simpler, cheaper realization of the
"Foundry Agent Service" concept in the walkthrough and keeps the POC reliable.
