<!-- markdownlint-disable-file -->
<!-- markdown-table-prettify-ignore-start -->
# Museum Sidekick - Product Requirements Document (PRD)
Version 0.1 | Status Draft | Owner rodanthi-alexiou | Team roda-hve | Target POC demo | Lifecycle Proof of Concept

## Progress Tracker
| Phase | Done | Gaps | Updated |
|-------|------|------|---------|
| Context | Yes | None | 2026-07-06 |
| Problem & Users | Yes | Persona metrics unquantified | 2026-07-06 |
| Scope | Yes | None | 2026-07-06 |
| Requirements | Yes | build_tour acceptance to refine | 2026-07-06 |
| Metrics & Risks | Partial | Success metric baselines TBD | 2026-07-06 |
| Operationalization | Partial | POC-only, no SLOs | 2026-07-06 |
| Finalization | No | Awaiting review | 2026-07-06 |
Unresolved Critical Questions: 0 | TBDs: 3

## 1. Executive Summary
### Context
Museum Sidekick is a cost-conscious proof of concept that demonstrates an agentic
application built with High Velocity Engineering (HVE) practices on Azure building
blocks. It is the runnable implementation of the walkthrough published at
rodanthi-alexiou.github.io/roda-hve. A GPT-4o vision agent chats with visitors,
plans themed tours, and explains artworks grounded exclusively in real,
public-domain works retrieved live from the Metropolitan Museum of Art Collection API.

### Core Opportunity
Show that a small, reliable, grounded agent can deliver an engaging museum-guide
experience without paid data sources, user accounts, or production hardening, while
staying cheap to run (scale-to-zero, minimal model capacity) and easy to tear down.

### Goals
| Goal ID | Statement | Type | Baseline | Target | Timeframe | Priority |
|---------|-----------|------|----------|--------|-----------|----------|
| G-001 | Ground every artwork answer in a real, public-domain Met work | Quality | 0% grounded | 100% grounded | POC | Must |
| G-002 | Demonstrate agentic tour planning from a natural-language prompt | Capability | None | Working themed tour | POC | Must |
| G-003 | Keep POC idle cost near zero via scale-to-zero and minimal capacity | Cost | N/A | ~$0 idle | POC | Must |
| G-004 | Deploy full stack with a single `azd up` and tear down with `azd down --purge` | DevEx | Manual | One-command | POC | Should |
| G-005 | Explain any displayed artwork image using vision | Capability | None | Vision explanation | POC | Must |

### Objectives (Optional)
| Objective | Key Result | Priority | Owner |
|-----------|------------|----------|-------|
| Reliable grounding | 0 hallucinated/non-public-domain works displayed | Must | rodanthi-alexiou |
| Cheap demo | Idle cost ~$0; teardown verified | Must | rodanthi-alexiou |

## 2. Problem Definition
### Current Situation
Demonstrating agentic patterns often relies on paid APIs, complex infrastructure,
or mock data that undermines credibility. Museum-guide demos frequently show
artworks the app has no rights to display or fabricates details about.

### Problem Statement
There is no simple, cheap, trustworthy reference app that shows an AI agent
planning tours and explaining real artworks while guaranteeing every displayed
work is genuine and safe to show.

### Root Causes
* Paid or key-gated data sources add cost and setup friction.
* Ungrounded LLM output invents artworks or misattributes details.
* The Met `/search` endpoint returns IDs only, creating an N+1 fan-out that naive implementations handle poorly.

### Impact of Inaction
Without this POC, the HVE walkthrough lacks a credible, runnable artifact, and
the agentic + grounding patterns remain abstract rather than demonstrable.

## 3. Users & Personas
| Persona | Goals | Pain Points | Impact |
|---------|-------|------------|--------|
| Curious visitor | Discover and understand artworks conversationally | Doesn't know where to start; wants a themed path | Engaged, guided exploration |
| HVE learner / engineer | See how to build a grounded agent on Azure | Wants a real, runnable reference, not slides | Copyable patterns and code |
| Demo presenter | Run a reliable, cheap live demo | Fear of runaway cost or flaky data | One-command up/down, safe content |

### Journeys (Optional)
Visitor asks for a theme (e.g., "paintings of cats") → agent searches the Met,
grounds results, returns works with images → visitor asks about one → agent
explains it (with vision) → visitor asks for a tour → agent assembles a themed
sequence of real works.

## 4. Scope
### In Scope
* Conversational chat with a GPT-4o vision agent.
* Themed, filtered artwork search grounded in the Met Collection API.
* Per-artwork explanation, including vision-based description of images.
* Themed tour planning (`build_tour`) from a natural-language request.
* React frontend with a chat panel and an artwork gallery.
* Single-command full-stack deploy/teardown via azd (Terraform + Container Apps).

### Out of Scope (justify if empty)
* User accounts, authentication, or profiles (POC simplicity).
* Persistence or database (stateless demo).
* Paid data sources (Met API is free and keyless).
* Production hardening, SLAs, or scaling beyond demo needs.

### Assumptions
* An Azure OpenAI resource with a gpt-4o (vision) deployment is available.
* Node.js 20+ is installed for local runs.
* The Met Collection API remains free, keyless, and reachable.

### Constraints
* Cost must stay minimal: scale-to-zero and minimal GPT-4o capacity.
* Only works with `hasImages=true` and `isPublicDomain=true` may be displayed.
* Agent uses Azure OpenAI chat-completions (function/tool calling + image parts), not a managed agent service.

## 5. Product Overview
### Value Proposition
A trustworthy, low-cost, agentic museum guide that only ever shows real,
public-domain art — a credible reference implementation of HVE + grounding on Azure.

### Differentiators (Optional)
* Every answer is grounded in live Met data; nothing is fabricated.
* Guardrail against the `/search` N+1 fan-out via a batched, cached, bounded-concurrency fetch.
* One-command deploy/teardown with near-zero idle cost.

### UX / UI (Conditional)
Two-pane React UI: a chat panel for conversation and a gallery for retrieved
artworks with images and metadata. UX Status: Defined (POC-level).

## 6. Functional Requirements
| FR ID | Title | Description | Goals | Personas | Priority | Acceptance | Notes |
|-------|-------|------------|-------|----------|----------|-----------|-------|
| FR-001 | Conversational chat | Visitor sends a message to `/chat`; agent replies conversationally | G-002 | Curious visitor | Must | POST `/chat` returns a coherent grounded reply | Express + Azure OpenAI |
| FR-002 | Themed collection search | `search_collection` tool performs themed, filtered Met `/search` | G-001 | Curious visitor | Must | Returns only `hasImages` + `isPublicDomain` works | Filters enforced server-side |
| FR-003 | Artwork detail retrieval | `get_object` fetches full metadata + image for one work via `/objects/{id}` | G-001 | Curious visitor | Must | Returns title, artist, date, medium, image URL | Resolves N+1 from search |
| FR-004 | Department browsing | `list_departments` lists the 19 curatorial departments via `/departments` | G-002 | Curious visitor | Should | Returns department list | Enables browse-by-area |
| FR-005 | Related works | `find_related` returns related works by tag/culture/medium | G-002 | Curious visitor | Should | Returns related public-domain works | Derived from object metadata |
| FR-006 | Artwork explanation (vision) | Agent explains a displayed artwork, using GPT-4o vision on the image | G-005 | Curious visitor | Must | Explanation references the actual image content | Image content parts |
| FR-007 | Themed tour planning | `build_tour` assembles a themed, ordered sequence of real works from a NL prompt | G-002 | Curious visitor, Demo presenter | Must | Returns an ordered tour of grounded works with rationale | New feature to build |
| FR-008 | Grounding guardrail | Every displayed work is fetched from the Met and passes public-domain + image filters | G-001 | All | Must | 0 ungrounded or non-public-domain works shown | Core trust requirement |
| FR-009 | Batched cached fetch | Tool layer resolves `/search` IDs via batched, cached, bounded-concurrency `/objects/{id}` calls | G-001, G-003 | HVE learner | Must | No unbounded fan-out; repeat lookups served from cache | Engineering guardrail |
| FR-010 | Artwork gallery UI | Frontend shows retrieved works with images and metadata alongside chat | G-002 | Curious visitor | Must | Gallery renders returned works | React + Vite |
| FR-011 | One-command deploy | `azd up` provisions Azure OpenAI + Container Apps and deploys both services | G-004 | Demo presenter | Should | `azd up` yields a working deployed app | Terraform + azure.yaml |
| FR-012 | One-command teardown | `azd down --purge` removes all provisioned resources | G-003, G-004 | Demo presenter | Should | All resources removed after teardown | Cost control |

### Feature Hierarchy (Optional)
```plain
Museum Sidekick
├─ Chat agent (GPT-4o vision)
│  ├─ Conversational chat (FR-001)
│  ├─ Artwork explanation / vision (FR-006)
│  └─ Themed tour planning (FR-007)
├─ Met tool layer
│  ├─ search_collection (FR-002)
│  ├─ get_object (FR-003)
│  ├─ list_departments (FR-004)
│  ├─ find_related (FR-005)
│  ├─ Grounding guardrail (FR-008)
│  └─ Batched cached fetch (FR-009)
├─ Frontend (React + Vite)
│  └─ Chat + gallery (FR-010)
└─ Infra (azd + Terraform + Container Apps)
   ├─ azd up (FR-011)
   └─ azd down --purge (FR-012)
```

## 7. Non-Functional Requirements
| NFR ID | Category | Requirement | Metric/Target | Priority | Validation | Notes |
|--------|----------|------------|--------------|----------|-----------|-------|
| NFR-001 | Cost | Idle cost near zero | Container Apps `min_replicas = 0`; minimal GPT-4o capacity | Must | Review infra config + Azure cost | POC guardrail |
| NFR-002 | Reliability | Grounded, safe content only | 100% displayed works public-domain + have images | Must | Automated filter tests | Trust requirement |
| NFR-003 | Performance | Bounded fan-out on search | Concurrency-limited, cached `/objects` fetch | Should | Tool-layer tests | Avoid Met throttling |
| NFR-004 | Maintainability | Simple, reliable stack | Chat-completions API over managed agent service | Should | Code review | Cheaper, more reliable POC |
| NFR-005 | Portability | Runs locally and on Azure | Local `npm run dev:*` + `azd up` parity | Should | Manual run | Same code both targets |
| NFR-006 | Security | No secrets in code; identity-friendly | Supports `az login` identity or dev API key | Should | Config review | `.env` not committed |

## 8. Data & Analytics (Conditional)
### Inputs
Visitor chat messages; theme/filter parameters; artwork object IDs.

### Outputs / Events
Grounded chat replies; artwork metadata + image URLs; themed tour sequences.

### Instrumentation Plan
| Event | Trigger | Payload | Purpose | Owner |
|-------|---------|--------|---------|-------|
| chat_request | POST /chat | message | Usage visibility | rodanthi-alexiou |
| tool_call | Agent invokes a Met tool | tool name, args | Grounding trace | rodanthi-alexiou |

### Metrics & Success Criteria
| Metric | Type | Baseline | Target | Window | Source |
|--------|------|----------|--------|--------|--------|
| Grounded-work rate | Quality | TBD | 100% | Demo | Tool layer |
| Idle cost | Cost | TBD | ~$0 | Idle | Azure cost |
| Tour success rate | Capability | TBD | Themed tour returned | Demo | Agent output |

## 9. Dependencies
| Dependency | Type | Criticality | Owner | Risk | Mitigation |
|-----------|------|------------|-------|------|-----------|
| Met Collection API | External | High | The Met | Availability/rate limits | Batched + cached fetch |
| Azure OpenAI (gpt-4o vision) | Azure | High | User subscription | Quota/capacity | Minimal capacity, region choice |
| Azure Container Apps | Azure | Medium | User subscription | Cost if not scaled to zero | `min_replicas = 0` |
| azd + Terraform | Tooling | Medium | User | Provisioning errors | Documented up/down flow |

## 10. Risks & Mitigations
| Risk ID | Description | Severity | Likelihood | Mitigation | Owner | Status |
|---------|-------------|---------|-----------|-----------|-------|--------|
| R-001 | Ungrounded or non-public-domain work displayed | High | Low | Enforce `hasImages` + `isPublicDomain` filters | rodanthi-alexiou | Open |
| R-002 | Met API throttling from N+1 fan-out | Medium | Medium | Batched, cached, bounded-concurrency fetch | rodanthi-alexiou | Open |
| R-003 | Unexpected Azure cost | Medium | Low | Scale-to-zero, minimal capacity, `azd down --purge` | rodanthi-alexiou | Open |
| R-004 | GPT-4o quota unavailable in region | Medium | Low | Choose available region/capacity | rodanthi-alexiou | Open |

## 11. Privacy, Security & Compliance
### Data Classification
Public data only (public-domain Met artworks); no personal data collected.

### PII Handling
No user accounts or PII stored; chat is stateless.

### Threat Considerations
Prompt injection from tool output is low-risk given trusted Met data; no secrets
in code; API key or managed identity via configuration.

### Regulatory / Compliance (Conditional)
| Regulation | Applicability | Action | Owner | Status |
|-----------|--------------|--------|-------|--------|
| Content licensing | Met CC0 works | Display only public-domain works | rodanthi-alexiou | Met |

## 12. Operational Considerations
| Aspect | Requirement | Notes |
|--------|------------|-------|
| Deployment | `azd up` provisions and deploys | Terraform + Container Apps |
| Rollback | `azd down --purge` then redeploy | POC-level |
| Monitoring | Basic Container Apps logs | No SLOs for POC |
| Alerting | None (POC) | Out of scope |
| Support | Best-effort, demo only | Not production |
| Capacity Planning | Minimal GPT-4o capacity | Cost control |

## 13. Rollout & Launch Plan
### Phases / Milestones
| Phase | Date | Gate Criteria | Owner |
|-------|------|--------------|-------|
| Tool layer + tests | Done | Met tools grounded and tested | rodanthi-alexiou |
| Agent (chat + vision) | In progress | Chat + explanation working | rodanthi-alexiou |
| build_tour feature | Planned | Themed tour from NL prompt | rodanthi-alexiou |
| Deploy first draft | Planned | `azd up` yields working app | rodanthi-alexiou |

### Feature Flags (Conditional)
| Flag | Purpose | Default | Sunset Criteria |
|------|---------|--------|----------------|
| None | POC has no flags | N/A | N/A |

### Communication Plan (Optional)
Demo alongside the HVE walkthrough site.

## 14. Open Questions
| Q ID | Question | Owner | Deadline | Status |
|------|----------|-------|---------|--------|
| Q-001 | What defines a "good" themed tour (length, ordering)? | rodanthi-alexiou | Before build_tour | Open |
| Q-002 | Target baselines for success metrics? | rodanthi-alexiou | Before demo | Open |
| Q-003 | Preferred deploy region for gpt-4o capacity? | rodanthi-alexiou | Before deploy | Open |

## 15. Changelog
| Version | Date | Author | Summary | Type |
|---------|------|-------|---------|------|
| 0.1 | 2026-07-06 | rodanthi-alexiou | Initial PRD generated from SPEC.md and README.md | Added |

## 16. References & Provenance
| Ref ID | Type | Source | Summary | Conflict Resolution |
|--------|------|--------|---------|--------------------|
| REF-001 | Doc | museum-sidekick/SPEC.md | Goals, non-goals, architecture, tools, cost controls | Source of truth |
| REF-002 | Doc | museum-sidekick/README.md | Layout, run/test/deploy instructions | Source of truth |
| REF-003 | API | metmuseum.github.io | Met Collection API endpoints | External |

### Citation Usage
Sections 1-12 derive from REF-001 and REF-002; tool endpoints from REF-003.

## 17. Appendices (Optional)
### Glossary
| Term | Definition |
|------|-----------|
| HVE | High Velocity Engineering practices |
| CC0 | Public-domain (no rights reserved) licensing |
| N+1 fan-out | `/search` returns IDs, requiring one `/objects/{id}` call per result |
| Scale-to-zero | Container Apps `min_replicas = 0` to eliminate idle cost |

### Additional Notes
This PRD documents an existing POC; some sections reflect a demo/POC posture and
intentionally omit production concerns.

Generated 2026-07-06 by PRD Builder (mode: full)
<!-- markdown-table-prettify-ignore-end -->
