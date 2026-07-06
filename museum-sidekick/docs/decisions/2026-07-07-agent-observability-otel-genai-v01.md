# ADR: Agent observability schema and client choice

- **Status:** Proposed
- **Date:** 2026-07-07
- **Deciders:** Museum Sidekick maintainers
- **Tags:** observability, opentelemetry, application-insights, azure-openai, foundry-agent-service

## Context

Museum Sidekick is a cost-conscious proof of concept: a GPT-4o vision agent that
plans museum tours and explains artworks, grounded in the keyless, CC0 Met
Collection API. The API runs on Azure Container Apps (scale-to-zero) and is
built with the `AzureOpenAI` chat-completions client plus a local
function/tool-calling loop, rather than the Foundry Agent Service SDK. That
choice was deliberate: it is cheaper, has no server-side agent or thread state
to provision, and is fully deterministic to unit test.

Telemetry today is a hand-rolled classic Application Insights schema. The
[telemetry module](../../src/api/src/telemetry/telemetry.ts) wraps the
`applicationinsights` v3 SDK — which is itself a shim over the Azure Monitor
OpenTelemetry Distro — but exposes it through the legacy `TelemetryClient`
surface (`trackEvent`, `trackDependency`, `trackMetric`, `trackException`). The
[agent loop](../../src/api/src/agent/agent.ts) manually instruments each model
call as a dependency of bespoke type `"Azure OpenAI"`, each tool call as
`"InProc"`, token counts as an `openai.total_tokens` metric, and
`ToolCall` / `AgentComplete` custom events. Per-turn correlation is carried by a
custom `turnId` string property.

Ingestion is already passwordless: `DefaultAzureCredential` (the app's
user-assigned managed identity) authenticates to Application Insights via Entra
ID, local auth is disabled, and the managed identity holds the Monitoring
Metrics Publisher role.

An architecture review raised two questions:

1. Would moving from the `AzureOpenAI` client to a Foundry Agent client change
   the observability implementation?
2. Where does OpenTelemetry fit into the telemetry schema, and what are the
   Azure best practices?

### Forces

- **Cost and determinism.** The POC values a cheap, locally testable agent loop
  with no server-side state. This pulls toward keeping the current client.
- **Observability quality.** The bespoke schema does not emit OpenTelemetry
  GenAI semantic-convention attributes (`gen_ai.system`, `gen_ai.request.model`,
  `gen_ai.usage.input_tokens` / `output_tokens`, `gen_ai.operation.name`), so
  the Application Insights AI-agent experiences (Agents view, token/cost
  workbooks, conversation Search) do not light up. `turnId` is a filterable
  property, not a real parent/child span relationship, so there is no true
  distributed-trace waterfall.
- **Standardization and portability.** Microsoft guidance is to prefer the Azure
  Monitor OpenTelemetry Distro and the OTel GenAI conventions over the classic
  SDK surface for GenAI workloads. Foundry Agent Service writes traces to
  Application Insights using these same conventions and emits server-side agent
  telemetry automatically.
- **Language maturity.** The richest Foundry agent-tracing samples today target
  Python and C#. This API is TypeScript; the JS Foundry agent-tracing surface
  (`@azure/monitor-opentelemetry`, `@azure/ai-projects`) must be verified before
  a client migration, which is a real risk rather than an assumption.

## Decision

1. **Keep the `AzureOpenAI` chat-completions client and local tool loop** for
   the POC. Do not migrate to the Foundry Agent client solely to improve
   observability.
2. **Adopt OpenTelemetry GenAI semantic conventions** for agent telemetry:
   emit real spans with one span per chat turn and nested child spans for each
   model call and tool call, tagged with `gen_ai.*` attributes, replacing the
   bespoke dependency types and the `turnId` string correlation.
3. **Prefer the Azure Monitor OpenTelemetry Distro** (`@azure/monitor-opentelemetry`)
   over the classic `TelemetryClient` surface as the ingestion path, keeping the
   existing passwordless (Entra ID / managed identity) configuration.
4. **Defer the Foundry Agent Service migration** until there is a concrete need
   for server-side tools (for example Bing grounding, file search, code
   interpreter) or managed thread state. At that point the built-in server-side
   tracing becomes a genuine reason to switch, and the JS tracing surface should
   be re-evaluated then.

## Consequences

### Positive

- Telemetry becomes standardized and portable; Application Insights AI-agent
  views, token/cost workbooks, and conversation Search work without custom KQL.
- A true end-to-end trace waterfall replaces flat, string-joined events, making
  latency and failure debugging clearer.
- The POC keeps its cost, determinism, and testability advantages — no
  server-side agent or thread state is introduced.
- Passwordless ingestion is preserved; the Distro supports the same
  Entra ID / managed-identity ingestion already in place.

### Negative / trade-offs

- Refactoring [telemetry.ts](../../src/api/src/telemetry/telemetry.ts) and the
  [agent loop](../../src/api/src/agent/agent.ts) to span-based instrumentation is
  non-trivial work with no new user-facing feature.
- The classic-schema dashboards or queries already built against
  `dependencies` / `customEvents` / `customMetrics` will need updating to the
  span-based `AppDependencies` / `AppTraces` / `AppMetrics` shape.
- Prompt/response content capture must be gated (off by default, e.g. via
  `AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED`) because it can contain
  personal data — an explicit, documented security toggle.

### Schema mapping (for reference)

| Telemetry | OTel signal | Workspace table | Classic name |
| --- | --- | --- | --- |
| Model / tool call | span | `AppDependencies` | `dependencies` |
| Auto request | span (server) | `AppRequests` | `requests` |
| Turn / tool events | span events | `AppTraces` / `AppEvents` | `traces` / `customEvents` |
| Token usage | metric | `AppMetrics` | `customMetrics` |
| Exception | exception | `AppExceptions` | `exceptions` |

## Alternatives considered

- **Keep the custom classic schema unchanged.** Cheapest short term, but blocks
  the first-party AI-agent observability experiences and keeps correlation as a
  brittle string join. Rejected.
- **Migrate to the Foundry Agent client now.** Gives auto server-side GenAI
  tracing, but adds server-side agent/thread state, reduces determinism/testability,
  contradicts the SPEC's POC rationale, and carries unverified JS tracing
  maturity risk. Deferred rather than rejected — revisit when server-side tools
  or managed threads are needed.

## References

- [Set up tracing in Microsoft Foundry](https://learn.microsoft.com/azure/foundry/observability/how-to/trace-agent-setup)
- [Configure tracing for AI agent frameworks (preview)](https://learn.microsoft.com/azure/foundry/observability/how-to/trace-agent-framework)
- [Introduction to Application Insights - OpenTelemetry observability](https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview)
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [SPEC: Museum Sidekick](../../SPEC.md)
