# Museum Sidekick

The Visitor's Agentic Sidekick — a GPT-4o museum guide that plans tours and
explains artworks using real, public-domain works from the
[Met Collection API](https://metmuseum.github.io/).

This is the implementation of the walkthrough published at
**[rodanthi-alexiou.github.io/roda-hve](https://rodanthi-alexiou.github.io/roda-hve/)**.

## What's inside

```
museum-sidekick/
├─ src/api/         Agent API (Express + Azure OpenAI GPT-4o + Met tools)
├─ src/frontend/    React chat + gallery (Vite)
├─ infra/           Terraform: Azure OpenAI + Container Apps (low-cost)
├─ azure.yaml       azd service map
└─ SPEC.md          What we're building and why
```

## Run locally

Prerequisites: Node.js 20+, an Azure OpenAI resource with a **gpt-4o** (vision)
deployment. No Met API key is needed.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#   edit .env: set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, and either
#   AZURE_OPENAI_API_KEY (dev) or run `az login` to use your identity.

# 3. Start API + frontend
npm run dev:api        # http://localhost:3000
npm run dev:frontend   # http://localhost:5173
```

Try it:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Find three highlighted paintings of cats and tell me about them."}'
```

## Test

```bash
npm test
```

## Deploy to Azure (optional)

Provisions Azure OpenAI + two Container Apps via Terraform. Keeps costs low with
scale-to-zero and a minimal GPT-4o capacity.

```bash
az login
azd up            # provision + deploy
azd down --purge  # tear everything down when done
```

> **Cost note:** this is a POC. GPT-4o is billed per token; Container Apps scale
> to zero when idle. Always run `azd down --purge` after demos.
