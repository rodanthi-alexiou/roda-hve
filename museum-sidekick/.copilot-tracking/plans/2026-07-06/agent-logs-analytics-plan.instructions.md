<!-- markdownlint-disable-file -->
# Plan: Agent Logs & Analytics

## User Requests

- "Add agent logs & analytics (structured tracing + Azure Application Insights)
  to the API, wired into the chat endpoint, agent loop, and Met client."
  (source: user message this session)

## Objectives

- Provide one telemetry module; instrument `/api/chat`, `runAgent`, Met client.
- Keep telemetry side-effect only; preserve passwordless auth; keep tests green.

## Context Summary

- Applies: `coding-standards/terraform/terraform.instructions.md` (`**/*.tf`).
- ESM TS API; Vitest; Terraform infra with existing Log Analytics workspace.

## Implementation Checklist

### Phase 1 — Telemetry module <!-- parallelizable: false -->

- [x] Create `src/api/src/telemetry/telemetry.ts` (init, trackEvent,
      trackDependency, trackException, trackMetric, startTimer, console fallback,
      Vitest-silent, lazy SDK import).

### Phase 2 — Instrument modules <!-- parallelizable: false -->

- [x] `index.ts`: init at startup; `ChatTurn` / `ChatTurnFailed`; pass `turnId`.
- [x] `agent.ts`: dependency + token metric per model call; tool-call telemetry;
      `AgentComplete`; accept optional `ctx.turnId`.
- [x] `met/client.ts`: `tracedFetch` wrapper on the three fetch sites.

### Phase 3 — Infra + config <!-- parallelizable: true -->

- [x] `infra/main.tf`: `azurerm_application_insights` + API env var.
- [x] `infra/outputs.tf`: sensitive connection-string output.
- [x] `.env.example`: add `APPLICATIONINSIGHTS_CONNECTION_STRING`.
- [x] `src/api/package.json`: add `applicationinsights`.

### Phase 4 — Test + validate <!-- parallelizable: false -->

- [x] `telemetry.test.ts`: unconfigured telemetry is safe/no-throw.
- [x] `npm install`, `npm run build`, `npm test`; `terraform fmt/validate`.

## Dependencies

- npm: `applicationinsights` (^3.x). Skills: none required.

## Success Criteria

- Build passes, Vitest green (existing + new), Terraform valid, no behavior
  change to chat/agent/Met responses.
