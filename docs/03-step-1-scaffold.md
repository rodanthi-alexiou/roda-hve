---
title: "Step 1: Scaffold the Project"
description: "Turn a one-paragraph spec into a working agentic-sidekick project skeleton using HVE research, plan, and implement"
author: Microsoft
ms.date: 2026-07-03
ms.topic: how-to
keywords:
  - hve rpi
  - project scaffold
  - agentic sidekick
estimated_reading_time: 7
---

## Step 1: Scaffold the Project

**Goal:** turn a one-paragraph spec into a working project skeleton for
`agentic-sidekick`, composed from CAIRA reference components.

**Building blocks used:** HVE (RPI), CAIRA skill, Learn MCP.

### Start from a spec, not a blank page

Create a short spec file the agent can anchor to. Save it as `SPEC.md` in an
empty project directory.

```markdown
# agentic-sidekick

A visitor-facing, multimodal agent that plans themed self-guided museum visits
from the Met's open-access collection. Given a request like "Build me a 6-stop
family tour on animals in art across cultures," it searches the Met API, filters
to public-domain works with images, sequences the stops, writes narration, and
renders a visual gallery.

Stack: TypeScript, Foundry Agent Service (GPT-4o vision), Azure Container Apps,
React frontend. Compose infrastructure and app scaffolding from CAIRA.
```

### Research the scaffold

Open Copilot Chat and run the Research phase. Point it at the spec, the installed
CAIRA skill, and the Learn MCP.

```text
/rpi-research Scaffold the agentic-sidekick project from SPEC.md. Use the CAIRA
skill to identify which reference components to copy: Foundry IaC, Container Apps
IaC, the TypeScript Foundry Agent Service API, and the React frontend. Use the
Microsoft Learn MCP to confirm the current project layout and dependencies for a
Foundry Agent Service app. Do not write code yet; produce a research document.
```

The Research phase inspects the CAIRA repository, verifies the Foundry Agent
Service shape against Microsoft Learn, and writes a research document under
`.copilot-tracking/`. Review it. You should see one recommended structure with
evidence, for example:

```text
agentic-sidekick/
  infra/                      # from CAIRA iac/foundry + iac/container-apps
  src/
    api/                      # from CAIRA app/api/typescript/foundry-agent-service
      agent/                  # agent definition + tools (empty for now)
      met/                    # Met tool layer (empty for now)
    frontend/                 # from CAIRA app/frontend/typescript/react
  azure.yaml                  # azd service map
  package.json
```

> [!TIP]
> Because the Research phase cites specific CAIRA files and Learn doc pages, you
> can trust the plan is grounded in real components rather than a plausible
> guess. This is the core HVE benefit.

### Plan the scaffold

Clear context, then create the implementation plan from the research.

```text
/clear
```

```text
/rpi-plan Create the implementation plan to scaffold agentic-sidekick from the
research document. Copy the four CAIRA components into the structure the
research recommends, wire azure.yaml, and leave the agent and Met tool
directories as documented stubs.
```

The Plan phase produces a checkboxed plan with file-level tasks. Open it and
confirm it copies the CAIRA components rather than reinventing them.

### Implement the scaffold

Clear context and run the implementation.

```text
/clear
```

```text
/rpi-implement Execute the scaffold plan.
```

Copilot copies the CAIRA reference components into place, adjusts names to
`agentic-sidekick`, and writes an `azure.yaml` that maps two services. Install
dependencies and confirm the skeleton builds.

```bash
npm install
npm run build
```

You now have a project that compiles but does not yet do anything intelligent.
That is intentional. The next steps add the agent, then its tools.

### What you just demonstrated

* A one-paragraph spec became a structured, buildable project.
* CAIRA supplied validated infrastructure and app scaffolding, so you wrote no
  boilerplate.
* HVE's research-first loop kept the scaffold grounded in real components.

### Next

Continue to [Step 2: Wire Foundry Agent Service](04-step-2-foundry-agent.md).
