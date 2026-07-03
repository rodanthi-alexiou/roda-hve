---
title: "Prerequisites and Setup"
description: "Install GitHub Copilot, HVE Core, the CAIRA skill, the Microsoft Learn MCP, and the Azure tooling needed for the walkthrough"
author: Microsoft
ms.date: 2026-07-03
ms.topic: how-to
keywords:
  - hve core install
  - caira skill
  - microsoft learn mcp
  - azure developer cli
estimated_reading_time: 8
---

## Prerequisites and Setup

Before you start the seven-step build, install the tooling and configure the
three building blocks: HVE Core, the CAIRA skill, and the Microsoft Learn MCP.

### Accounts and access

You need the following before you begin.

* A GitHub account with GitHub Copilot enabled.
* An Azure subscription where you can create Azure AI Foundry and Azure Container
  Apps resources.
* Permission to create role assignments in that subscription, because the CAIRA
  infrastructure assigns least-privilege roles to the running apps.

> [!NOTE]
> The Met Collection API needs no account or key. Everything that touches the Met
> is anonymous and public.

### Core tools

Install these local tools. Versions shown are minimums that were current at the
time of writing; newer releases are fine.

| Tool | Purpose | Check |
| -------------------------- | ------------------------------------ | ---------------------------- |
| Visual Studio Code | Editor and Copilot Chat host | `code --version` |
| GitHub Copilot extension | AI pair programming in VS Code | Sign in from the Accounts menu |
| Node.js 20+ | Runs the TypeScript API and frontend | `node --version` |
| Azure Developer CLI (azd) | One-command provision and deploy | `azd version` |
| Azure CLI | Auth and resource management | `az version` |
| Terraform | CAIRA infrastructure as code | `terraform version` |
| Docker | Builds the app containers locally | `docker --version` |
| Git | Source control and the Coding Agent flow | `git --version` |

### Install HVE Core

HVE Core delivers the agents, prompts, and the RPI workflow that drive every
step. Choose the path that matches how you use Copilot.

For VS Code, install the extension from the Marketplace:

```text
ise-hve-essentials.hve-core
```

For the full component set, install the "All" collection instead:

```text
ise-hve-essentials.hve-core-all
```

For the GitHub Copilot CLI, install HVE as a plugin:

```bash
copilot plugin marketplace add microsoft/hve-core
copilot plugin install
```

After installing, reload VS Code, open Copilot Chat with `Ctrl+Alt+I`, and
confirm the agent picker lists HVE agents such as `rpi-agent` and
`task-researcher`. If they do not appear, see the HVE
[Getting Started guide](https://github.com/microsoft/hve-core/blob/main/docs/getting-started/README.md).

#### Understand the RPI workflow

HVE's core methodology is **RPI**: Research, Plan, Implement, Review. Instead of
asking Copilot to "write the code," you ask it to research first, plan second,
implement third, and review last. This constraint produces verified, traceable
code instead of plausible-looking guesses.

| Phase | Skill command | Prompt command | Output |
| ----------- | ---------------- | ------------------ | -------------------------------- |
| Research | `/rpi-research` | `/task-research` | A research document with evidence |
| Plan | `/rpi-plan` | `/task-plan` | A checkboxed implementation plan |
| Implement | `/rpi-implement` | `/task-implement` | Working code plus a changes log |
| Review | `/rpi-review` | `/task-review` | A validation report |

> [!IMPORTANT]
> Run `/clear` or start a new chat between phases. Each phase uses a different
> agent, and accumulated context degrades results. Findings are preserved in
> files under `.copilot-tracking/`, not in chat history, so a clean context is
> safe.

Use `/rpi-quick` when you want the full research-to-review loop in one flow, or
the `rpi-agent` for an autonomous single-session workflow. You will use both
styles across the walkthrough.

### Install the CAIRA skill

CAIRA is delivered as a skill your coding agent installs into the project. From
the directory where you will create the app, run one of:

```bash
npx skills add github.com/microsoft/CAIRA/skills
```

```bash
bunx skills add github.com/microsoft/CAIRA/skills
```

Once installed, your agent can inspect the CAIRA repository and copy or adapt
only the reference components that fit the scenario. The components you will
reuse are:

| Component | Path |
| --------------- | ------------------------------------------------------------------ |
| Foundry IaC | `reference-architectures/iac/foundry/` |
| Container Apps IaC | `reference-architectures/iac/container-apps/` |
| Agent API | `reference-architectures/app/api/typescript/foundry-agent-service/` |
| React frontend | `reference-architectures/app/frontend/typescript/react/` |

### Configure the Microsoft Learn MCP

The Learn MCP server gives Copilot live, grounded access to official Microsoft
documentation. During the Research phase you use it to verify Foundry Agent
Service, azd, and Container Apps APIs against current docs rather than relying on
model memory.

Add the server to your VS Code MCP configuration (`.vscode/mcp.json` in the
workspace, or your user settings):

```json
{
  "servers": {
    "microsoft-learn": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp"
    }
  }
}
```

Reload VS Code. In Copilot Chat you now have three Learn MCP tools available:

| Tool | Use it to |
| ---------------------------- | --------------------------------------------- |
| `microsoft_docs_search` | Find relevant documentation quickly |
| `microsoft_code_sample_search` | Pull official code samples |
| `microsoft_docs_fetch` | Read a full doc page for deep detail |

> [!TIP]
> A good Research-phase habit: before implementing anything against a Microsoft
> SDK, ask Copilot to confirm the API with the Learn MCP. It catches renamed
> methods and deprecated patterns that a model might otherwise invent.

### Verify your setup

Run this quick checklist before moving on.

* [ ] Copilot Chat lists HVE agents in the picker.
* [ ] `/rpi-research` responds in chat.
* [ ] The CAIRA skill is installed in your project directory.
* [ ] The Learn MCP tools appear in Copilot's tool list.
* [ ] `azd version`, `terraform version`, and `docker --version` all succeed.

### Next

Continue to [Step 1: Scaffold the project](03-step-1-scaffold.md).
