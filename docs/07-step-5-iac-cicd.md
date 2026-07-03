---
title: "Step 5: Infrastructure and CI/CD"
description: "Provision Foundry and Container Apps from CAIRA infrastructure as code and wire azd for one-command deploys"
author: Microsoft
ms.date: 2026-07-03
ms.topic: how-to
keywords:
  - infrastructure as code
  - azure container apps
  - azure developer cli
  - caira
estimated_reading_time: 7
---

## Step 5: Infrastructure and CI/CD

**Goal:** make the app deployable. Bring in CAIRA's Foundry and Container Apps
infrastructure as code, and wire the Azure Developer CLI so the whole system
provisions and deploys with one command.

**Building blocks used:** CAIRA IaC components, HVE (RPI), Learn MCP.

### The infrastructure you need

The scenario needs three things provisioned:

* An Azure AI Foundry account and project with a GPT-4o deployment.
* Two Azure Container Apps: the agent API and the React frontend.
* Least-privilege role assignments so the API can call Foundry without secrets.

CAIRA already provides all of this as Terraform reference architecture. You adapt
it rather than authoring it.

### Research the infrastructure adaptation

```text
/rpi-research Compose the infrastructure for agentic-sidekick from CAIRA. Use
reference-architectures/iac/foundry for the Foundry account, project, and a
GPT-4o deployment, and reference-architectures/iac/container-apps for two
Container Apps (api and frontend). Use the Microsoft Learn MCP to confirm the
current azd azure.yaml schema and how azd maps services to Container Apps.
Produce a research document listing exactly which CAIRA files to copy and which
variables to set.
```

Ask Copilot to confirm with the Learn MCP:

* The `azure.yaml` service schema azd expects.
* How Container Apps ingress is configured for a public frontend and an internal
  API.
* The managed-identity role assignment that lets the API reach Foundry.

### Plan and implement

```text
/clear
/rpi-plan Plan the infrastructure: copy the CAIRA Terraform modules into infra/,
parameterize the Foundry model deployment as gpt-4o, define two Container Apps,
and complete azure.yaml so azd provisions and deploys both services.
```

```text
/clear
/rpi-implement Execute the infrastructure plan.
```

### The azd service map

The result is an `azure.yaml` that ties the repository to the two services. It
should look like the following.

```yaml
# azure.yaml
name: agentic-sidekick
metadata:
  template: agentic-sidekick@1.0.0
infra:
  provider: terraform
services:
  api:
    project: ./src/api
    language: ts
    host: containerapp
  frontend:
    project: ./src/frontend
    language: ts
    host: containerapp
```

### The Foundry model deployment

The CAIRA Foundry module deploys the model your agent uses. Confirm it targets
GPT-4o with vision.

```hcl
# infra/foundry/main.tf (excerpt, adapted from CAIRA)
model_deployments = {
  gpt-4o = {
    model_name    = "gpt-4o"
    model_version = "2024-11-20"
    sku_capacity  = 30
  }
}
```

### Validate before you provision

CAIRA components ship with a Taskfile. Bootstrap and validate the infrastructure
locally before touching Azure.

```bash
task bootstrap
task validate
```

Then run a provisioning preview with azd.

```bash
azd provision --preview
```

Review the plan. You should see one Foundry account, one project, one GPT-4o
deployment, two Container Apps, and the role assignments, and nothing else.

> [!CAUTION]
> Provisioning creates billable Azure resources. Keep the GPT-4o capacity modest
> for a demo and tear the environment down afterward with `azd down`.

### What you just demonstrated

* Production-shaped infrastructure came from CAIRA, not from hand-written
  Terraform.
* The whole system is now a single `azd` command away from running in Azure.

### Next

Continue to [Step 6: Hand a feature to the Coding Agent](08-step-6-coding-agent.md).
