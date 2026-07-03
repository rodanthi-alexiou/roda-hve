---
title: "Step 7: Deploy and Demo"
description: "Deploy the whole system to Azure with azd up and run the four signature aha moments live"
author: Microsoft
ms.date: 2026-07-03
ms.topic: how-to
keywords:
  - azd up
  - live demo
  - multimodal agent
estimated_reading_time: 6
---

## Step 7: Deploy and Demo

**Goal:** ship it and show it. Deploy the whole system to Azure with one command,
then run the four signature moments that prove an agent with tools beats
autocomplete.

**Building blocks used:** azd, the full system from Steps 1 through 6.

### Deploy with one command

Everything is already wired: CAIRA infrastructure, the azd service map, and both
apps. Provision and deploy in a single step.

```bash
azd up
```

`azd up` provisions the Foundry account, project, and GPT-4o deployment, creates
the two Container Apps, builds and pushes both images, and prints the public
frontend URL. Open it.

> [!NOTE]
> The first `azd up` takes several minutes because it provisions Foundry and
> Container Apps from scratch. Subsequent `azd deploy` runs, for code-only
> changes, are much faster.

### Run the four aha moments

Open the frontend and run these live. Each one exercises a different capability.

#### 1. Multi-step tour from one sentence

Type into the chat:

```text
Build me a 6-stop family tour on animals in art across cultures.
```

The agent searches multiple departments, filters to highlighted public-domain
works with images, sequences the stops, writes kid-friendly narration, and
renders a gallery. One sentence in, a curated tour out.

#### 2. Multimodal explanation

Click any work in the gallery and ask:

```text
Explain this painting to a 10-year-old.
```

GPT-4o vision reads the actual image and explains it in plain, friendly language.

#### 3. Cross-cultural connections

```text
How did different cultures depict cats? Show me examples.
```

The agent uses the tag and culture fields to find related works across
departments, demonstrating retrieval that reasons about metadata.

#### 4. The feature you shipped in Step 6

If you merged `find_related_works`, show it end to end:

```text
Find works related to this one.
```

The tool the Coding Agent wrote returns thematically connected pieces, closing
the loop from delegated development to live feature.

### The enterprise hook

After the consumer demo lands, reframe for partners. The same agent, pointed at a
curator's workflow, assembles a themed collection and drafts exhibit labels in
minutes. The visitor experience and the productivity tool are the same system.

### Clean up

Tear down the environment when you are done to stop billing.

```bash
azd down --purge
```

### What you just demonstrated

* A full agentic application went from spec to live in Azure with a single
  deploy command.
* Four distinct capabilities, retrieval, multimodal reasoning, metadata-aware
  connections, and a delegated feature, all ran on real, open data.

### Next

See how this generalizes in
[CAIRA as a golden accelerator](10-caira-golden-accelerator.md).
