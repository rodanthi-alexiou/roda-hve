---
title: "Museum Sidekick: An HVE + CAIRA Walkthrough"
description: "End-to-end partner walkthrough for building a multimodal agentic app with GitHub Copilot, Hypervelocity Engineering, CAIRA, and the Microsoft Learn MCP"
author: Microsoft
ms.date: 2026-07-03
ms.topic: overview
keywords:
  - hypervelocity engineering
  - github copilot
  - caira
  - foundry agent service
  - azure container apps
estimated_reading_time: 6
---

## Museum Sidekick: An HVE + CAIRA Walkthrough

This walkthrough shows partners how to build a real, deployable AI application
using [Hypervelocity Engineering (HVE)](https://github.com/microsoft/hve-core),
the [CAIRA](https://github.com/microsoft/CAIRA) reference architectures, and the
[Microsoft Learn MCP](https://learn.microsoft.com/training/support/mcp) server,
all driven from GitHub Copilot.

The example we build is **The Visitor's Agentic Sidekick**: a conversational,
multimodal agent that turns the Metropolitan Museum of Art's 470,000+ open-access
artworks into curated, narrated experiences. Ask it *"Build me a 6-stop family
tour on animals in art across cultures"* and it searches the collection, filters
to works with public-domain images, sequences the stops, writes narration, and
renders a visual gallery.

The museum app is the demo. The transferable asset is the **pattern**: an agent
plus domain-API tools, built through the HVE loop, composed from CAIRA, deployed
to Azure. Swap the museum tool layer for any partner's domain API and the same
accelerator delivers a retail catalog assistant, a product-docs copilot, or an
internal knowledge-base agent.

### Who this is for

You are a partner engineer or architect who wants to see how HVE, CAIRA, and
Copilot fit together on a concrete build. No prior HVE experience is required.
Basic familiarity with TypeScript, Azure, and GitHub Copilot Chat is helpful.

### What you will build

| Layer | Technology | Source |
| ------------- | ------------------------------------------ | ------------------------- |
| Infrastructure | Azure AI Foundry + Azure Container Apps | CAIRA `iac/` Terraform |
| Agent API | TypeScript, Foundry Agent Service, GPT-4o vision | CAIRA `app/api/` reference |
| Tool layer | Met Collection API wrappers (search, object, departments, tour) | Built during the walkthrough |
| Frontend | React chat + gallery grid | CAIRA `app/frontend/` reference |

### The three building blocks

HVE, CAIRA, and the Learn MCP each play a distinct role. Keep this separation in
mind as you move through the steps.

| Building block | What it gives you | How you use it here |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| HVE Core | Agents, prompts, and the RPI workflow for AI-assisted coding | Drives every step: research, plan, implement, review |
| CAIRA | Composable, validated Azure reference components | Supplies IaC, agent API, and frontend you copy and adapt |
| Learn MCP | Live, grounded Microsoft documentation inside Copilot | Grounds the agent in real Foundry, azd, and Container Apps APIs |

### The 7-step demo arc

The walkthrough follows a repeatable seven-step arc. Each step maps to a page in
this guide.

| Step | Page | What happens |
| ---- | ------------------------------------------------------ | ----------------------------------------------------- |
| 1 | [Scaffold the project](03-step-1-scaffold.md) | Turn a one-paragraph spec into a working project skeleton |
| 2 | [Wire Foundry Agent Service](04-step-2-foundry-agent.md) | Connect chat and GPT-4o vision |
| 3 | [Build the Met tool layer](05-step-3-met-tools.md) | Add agentic tool-calling over the Met API |
| 4 | [Tests and self-heal](06-step-4-tests-selfheal.md) | Generate tests, mock the Met API, let Copilot fix failures |
| 5 | [IaC and CI/CD from CAIRA](07-step-5-iac-cicd.md) | Compose infrastructure and pipelines |
| 6 | [Hand a feature to the Coding Agent](08-step-6-coding-agent.md) | Delegate a feature and review the PR |
| 7 | [Deploy and demo](09-step-7-deploy-demo.md) | Run `azd up` and drive the live "aha" moments |

### Start here

1. Read the [Overview and architecture](01-overview.md) to understand the
   scenario and why the Met API is the ideal showcase data.
2. Complete the [Prerequisites and setup](02-prerequisites.md) to install HVE,
   the CAIRA skill, and the Learn MCP.
3. Work through steps 1 through 7 in order.
4. Review the [CAIRA mapping and golden-accelerator payoff](10-caira-golden-accelerator.md)
   to see how to reuse the pattern.

### Reference

* [Build approaches: baseline vs true HVE-Core RPI](12-build-approaches.md): how
  the POC was actually built, what a full `/rpi` run looks like, and when to use
  each approach.
* [Met Collection API and agent tools](11-met-api-reference.md): endpoints,
  parameters, and how each maps to an agent tool.

### Implementation notes (the built POC)

A working proof-of-concept of this walkthrough lives in the
[`museum-sidekick/`](../museum-sidekick/) folder. It followed the HVE loop by
hand (the Met tool layer went through research → plan → implement, with the
tracking documents authored while following the methodology rather than emitted
by the `/rpi` agents) and makes a few deliberate, cost-conscious choices that
diverge from the tutorial text above. For a full comparison of that hybrid
approach against a true HVE-Core RPI run, see
[Build approaches](12-build-approaches.md). When following the steps, treat these
notes as the source of truth:

| Topic | Tutorial says | The POC does | Why |
| ----- | ------------- | ------------ | --- |
| Project folder | `agentic-sidekick` | `museum-sidekick` | Clearer product name |
| Agent runtime | Foundry Agent Service SDK | Azure OpenAI GPT-4o via chat-completions (`openai` npm package, `AzureOpenAI` client) with function tool-calling and vision | Cheaper, no server-side agent/thread state to provision, fully unit-testable |
| Auth | — | Passwordless-first: `getBearerTokenProvider(new DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default")`, API-key fallback for local dev | No secrets in the app; Managed Identity in Azure |
| GPT-4o capacity | `sku_capacity = 30` | `openai_capacity = 10` (10K TPM) | POC cost control |
| Hosting | Azure Container Apps | Container Apps with `min_replicas = 0` (scale to zero), Basic-tier ACR | No compute cost when idle |
| IaC | CAIRA `iac/` Terraform | Hand-written low-cost Terraform in [`museum-sidekick/infra/`](../museum-sidekick/infra/), grounded in CAIRA conventions | Kept minimal for a POC |

The Met tool layer solves the signature N+1 fan-out (one search returns many
object IDs, each needing its own hydrate call) with bounded concurrency plus an
in-memory promise cache, and enforces three guardrails so only public-domain
works with real images reach the gallery. See the research and plan under
`museum-sidekick/.copilot-tracking/`.

> **Cost reminder:** run `azd down --purge` when finished to stop charges and
> purge the soft-deleted Azure OpenAI account.

