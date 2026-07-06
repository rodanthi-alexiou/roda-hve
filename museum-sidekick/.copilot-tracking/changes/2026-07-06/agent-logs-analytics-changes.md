<!-- markdownlint-disable-file -->
# Changes: Agent Logs & Analytics

Related plan: `.copilot-tracking/plans/2026-07-06/agent-logs-analytics-plan.instructions.md`
Implementation date: 2026-07-06

## Summary

Added structured tracing plus optional Azure Application Insights export to the
API, wired into the chat endpoint, agent loop, and Met client. Telemetry is a
side-effect-only wrapper: it always emits structured JSON to stdout (captured by
Container Apps → Log Analytics) and lazily initializes the classic
`applicationinsights` v3 SDK only when `APPLICATIONINSIGHTS_CONNECTION_STRING`
is set. Passwordless auth is preserved; the connection string is injected via
Terraform. Telemetry is silent under Vitest.

## Changes by Category

### Added

- `src/api/src/telemetry/telemetry.ts` — telemetry module: `initTelemetry`
  (async lazy SDK import, chained setup, cloud role `museum-sidekick-api`),
  `trackEvent`, `trackDependency`, `trackException`, `trackMetric`,
  `flushTelemetry`, `startTimer`; structured `emit()` to stdout, silent under
  Vitest.
- `src/api/src/telemetry/telemetry.test.ts` — Vitest suite validating
  unconfigured telemetry is safe (no console under Vitest, no throws, timer
  returns finite non-negative elapsed ms).

### Modified

- `src/api/src/index.ts` — generate `turnId`; `startTimer`; call
  `runAgent(..., { turnId })`; emit `ChatTurn` / `ChatTurnFailed`; call
  `void initTelemetry()` before `app.listen`.
- `src/api/src/agent/agent.ts` — `AgentContext { turnId? }`; per-model-call and
  per-tool-call `trackDependency`; `openai.total_tokens` metric; `ToolCall` and
  `AgentComplete` events.
- `src/api/src/met/client.ts` — `tracedFetch` wrapper (timer + fetch +
  `trackDependency` type HTTP; catch → dependency `success:false` +
  `trackException` + rethrow); applied to `getObject`, `searchCollection`,
  `listDepartments`. Response semantics unchanged.
- `infra/main.tf` — `azurerm_application_insights.main`
  (`appi-${local.resource_token}`, workspace-based, `application_type = "web"`);
  API container app `APPLICATIONINSIGHTS_CONNECTION_STRING` env var.
- `infra/outputs.tf` — sensitive `APPLICATIONINSIGHTS_CONNECTION_STRING` output.
- `src/api/package.json` — added `applicationinsights` `^3.5.0`.
- `.env.example` — added Observability section with
  `APPLICATIONINSIGHTS_CONNECTION_STRING`.

### Removed

- None.

## Deviations from Plan

- `telemetry.ts`: `setAutoCollectPerformance(false)` required a second argument
  under the `applicationinsights` v3 shim typings; changed to
  `setAutoCollectPerformance(false, false)` to satisfy `tsc`. No behavior change.

## Validation

- `npx tsc -p tsconfig.json` — exit 0.
- `npx vitest run` — 10 passed (7 existing met/client + 3 new telemetry).
- `terraform -chdir=infra fmt` — exit 0; `terraform ... validate` — success.

## Release Summary

Observability is now instrumented end-to-end. Deployed API revisions emit
structured JSON logs immediately; setting the connection string (already wired
via Terraform) activates full Application Insights export on the next deploy.

## Follow-up: Passwordless (Entra ID) Application Insights Ingestion

Date: 2026-07-06

Switched Application Insights ingestion authentication from the connection-string
instrumentation key to Microsoft Entra ID, completing the passwordless pattern.

### Modified

- `src/api/src/telemetry/telemetry.ts` — split the `setup()`/`start()` chain so
  the AAD credential is set before `start()`: after `setup(conn)` + auto-collect
  setters, lazy-import `@azure/identity` and set
  `client.config.aadTokenCredential = new DefaultAzureCredential()` before
  `appInsights.start()` (the v3 shim reads `aadTokenCredential` during `start()`
  via `parseConfig()`). Init log now emits `auth: "aad"`. Header comment updated
  to note Entra ID ingestion.
- `infra/main.tf` — set `local_authentication_enabled = false` on
  `azurerm_application_insights.main` to enforce Entra-only ingestion; added
  `azurerm_role_assignment.metrics_publisher_app` granting the app's
  user-assigned identity **Monitoring Metrics Publisher** on the App Insights
  resource (authorizes publishing all telemetry via Entra ID). The connection
  string env var is retained (supplies the ingestion endpoint only).

### Validation

- `npx tsc --noEmit` — exit 0; `npx vitest run` — 10 passed.
- `terraform fmt` / `terraform validate` — success.
- `azd provision` — role assignment created, `local_authentication_enabled` set
  to false. `azd deploy api` — succeeded.
- Verified end-to-end: with key-based ingestion disabled, a fresh chat probe
  produced new `ChatTurn`/`ToolCall`/`AgentComplete` events plus `AppDependencies`
  and `AppMetrics` in Log Analytics ingested after the probe timestamp, proving
  Entra ID ingestion via the managed identity works.
