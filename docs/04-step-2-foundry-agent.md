---
title: "Step 2: Wire Foundry Agent Service"
description: "Add a conversational, multimodal agent backed by Azure AI Foundry Agent Service and GPT-4o vision, grounded with the Microsoft Learn MCP"
author: Microsoft
ms.date: 2026-07-03
ms.topic: how-to
keywords:
  - foundry agent service
  - gpt-4o vision
  - multimodal agent
estimated_reading_time: 7
---

## Step 2: Wire Foundry Agent Service

**Goal:** make the skeleton talk. Add a conversational agent backed by Azure AI
Foundry Agent Service with GPT-4o vision, so it can both chat and reason over
images.

**Building blocks used:** HVE (RPI), CAIRA API component, Learn MCP.

### Research the agent wiring

The Foundry Agent Service SDK evolves, so ground this step in current docs before
writing any code.

```text
/rpi-research Wire the agentic-sidekick API to Azure AI Foundry Agent Service.
Use the Microsoft Learn MCP to confirm the current SDK for creating an agent,
starting a thread, sending a message, and running the agent. Confirm how to
attach an image to a message so GPT-4o vision can describe artwork. Base the
implementation on the CAIRA foundry-agent-service reference. Produce a research
document with cited Learn pages.
```

Ask Copilot to verify these specifics with the Learn MCP:

* Creating an agent and a persistent thread.
* Adding a user message with both text and an image URL.
* Running the agent and streaming or polling the response.
* The environment variables the CAIRA component expects for the Foundry
  connection.

### Plan and implement

Clear context between phases.

```text
/clear
/rpi-plan Create the plan to add a chat endpoint and a vision-capable message
path to the agent API, using the researched Foundry Agent Service SDK.
```

```text
/clear
/rpi-implement Execute the agent-wiring plan.
```

The implementation adds an agent definition and a chat entry point. A minimal
shape looks like the following. Treat it as an illustration; your generated code
follows the exact SDK the Learn MCP confirmed.

```typescript
// src/api/agent/agent.ts
import { AgentsClient } from "@azure/ai-agents";
import { DefaultAzureCredential } from "@azure/identity";

const client = new AgentsClient(
  process.env.FOUNDRY_PROJECT_ENDPOINT!,
  new DefaultAzureCredential()
);

export async function createSidekick() {
  return client.createAgent(process.env.MODEL_DEPLOYMENT_NAME!, {
    name: "museum-sidekick",
    instructions:
      "You are a friendly museum guide. Plan tours and explain artworks " +
      "using only works you retrieved from the Met tool layer. Adapt tone " +
      "to the visitor, including children.",
  });
}
```

The multimodal path attaches an image URL to the message so GPT-4o vision can
describe a work.

```typescript
// explain an artwork to a 10-year-old
await client.createMessage(threadId, "user", [
  { type: "text", text: "Explain this painting to a 10-year-old." },
  { type: "image_url", imageUrl: { url: object.primaryImage } },
]);
```

### Configure the Foundry connection

The CAIRA component reads its Foundry settings from the environment. For local
runs, set them from your provisioned project (you will provision for real in
Step 5; for now you can point at a dev project).

```bash
export FOUNDRY_PROJECT_ENDPOINT="https://<your-project>.services.ai.azure.com"
export MODEL_DEPLOYMENT_NAME="gpt-4o"
```

Authentication uses `DefaultAzureCredential`, so sign in once with the Azure CLI.

```bash
az login
```

### Verify the agent responds

Run the API locally and send a plain chat message.

```bash
npm run dev --workspace api
```

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi, what can you help me do at the Met?"}'
```

You should get a friendly, general answer. It cannot yet retrieve real artworks;
it has no tools. That is the next step, and it is where the demo becomes
convincing.

### What you just demonstrated

* The app now hosts a real Foundry-backed agent with a vision-capable path.
* The SDK usage was verified against live Microsoft docs, not guessed.

### Next

Continue to [Step 3: Build the Met tool layer](05-step-3-met-tools.md).
