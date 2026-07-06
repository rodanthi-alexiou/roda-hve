<!-- markdownlint-disable-file -->
# Research: Agent Logs & Analytics (Structured Tracing + Application Insights)

## Scope

Add observability to the Museum Sidekick API:

- Structured tracing + Azure Application Insights.
- Wired into three modules: the chat endpoint (`POST /api/chat`), the agent loop
  (`runAgent`), and the Met client.

## Success Criteria

- A single telemetry module owns all instrumentation; the three modules call it.
- Telemetry is **side-effect only** — it never changes request/agent behavior.
- Works locally with **zero Azure config** (structured JSON to stdout) and sends
  to Application Insights when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set.
- Passwordless pattern preserved: connection string injected via a
  Terraform-provisioned Container App env var (no code changes to auth).
- Existing Vitest suite (`met/client.test.ts`) stays green; add a telemetry test.

## Evidence Log (current state)

- `src/api/src/index.ts` — Express app. `POST /api/chat` validates `message`,
  builds a multimodal `latest` turn, calls `runAgent([...history, latest])`,
  returns `{ reply, cards }`. Errors → `console.error` + 500. No telemetry.
- `src/api/src/agent/agent.ts` — GPT-4o chat-completions tool loop. `runAgent`,
  `MAX_STEPS = 5`, two `azure.chat.completions.create` call sites (loop + final
  fallback), `dispatchTool`, `cardsById` accumulation. `completion.usage`
  available for token counts. No telemetry.
- `src/api/src/met/client.ts` — Met API client. Three `fetch` sites
  (`getObject`, `searchCollection`, `listDepartments`); `findRelated` composes
  them. Promise cache `Map<number, ...>`. No telemetry.
- `src/api/package.json` — ESM, deps: `@azure/identity`, `cors`, `dotenv`,
  `express`, `openai`. Test = `vitest run`.
- `infra/main.tf` — RG, Log Analytics (PerGB2018/30d), UAMI, ACR, Azure OpenAI +
  gpt-4o, Container App Env, API + Frontend Container Apps. **No App Insights.**
- `infra/outputs.tf` — azd-consumed outputs (no App Insights).
- `.env.example` — OpenAI + PORT + frontend base URL. No App Insights var.

## Alternatives Evaluated

1. **Azure Monitor OpenTelemetry Distro** (`@azure/monitor-opentelemetry`) —
   full OTel auto-instrumentation. Heavier, more moving parts than a POC needs.
2. **Classic `applicationinsights` SDK (v3)** — retains `trackEvent` /
   `trackDependency` / `trackException` API over an OTel core; auto-collects
   HTTP requests/dependencies/exceptions. Best fit for custom agent events.
   **← selected.**
3. **Console-only structured logs** — cheapest, but does not satisfy the explicit
   "Azure Application Insights" requirement. Kept as the *fallback* path.

**Selected approach:** thin wrapper module (`telemetry/telemetry.ts`) that
lazy-imports the `applicationinsights` SDK on `initTelemetry()` only when a
connection string is present, and always emits structured JSON lines (silent
under Vitest). Modules depend only on the wrapper, not the SDK.

## Instrumentation Points

| Module | Signals |
|--------|---------|
| `index.ts` | `initTelemetry()` at startup; per-request `ChatTurn` event (turnId, hasImage, historyLen, cardCount, durationMs, replyChars); `trackException` + `ChatTurnFailed` on error. |
| `agent.ts` | Per model call → dependency (`Azure OpenAI`, duration, success) + `openai.total_tokens` metric; per tool call → dependency + `ToolCall` event; `AgentComplete` event (steps, cardCount, stopped). Correlated by `turnId`. |
| `met/client.ts` | Each HTTP fetch → dependency (`HTTP`, url, status, duration, success) via `tracedFetch`; exceptions tracked. |

## Terraform / Config Changes

- `azurerm_application_insights` (workspace-based, linked to existing Log
  Analytics) → `appi-${resource_token}`, `application_type = "web"`.
- API Container App: add `APPLICATIONINSIGHTS_CONNECTION_STRING` env from the
  App Insights `connection_string`.
- `outputs.tf`: add sensitive `APPLICATIONINSIGHTS_CONNECTION_STRING` output.
- `.env.example`: add empty `APPLICATIONINSIGHTS_CONNECTION_STRING`.
- `package.json`: add `applicationinsights` dependency.

## Next Steps

Proceed to plan → implement telemetry module, instrument three modules, update
Terraform + config, add a telemetry unit test, validate with build + Vitest.
