# Plan: "True" HVE-Core RPI build for one POC feature

Rather than replicate the RPI artifacts by hand, drive one feature end-to-end through the real HVE-Core `/rpi` workflow — the `RPI Agent` orchestrating its five phases and dedicated subagents, with all state in `.copilot-tracking/`. I recommend the **`build_tour` agent tool** as the target: it's a genuine feature gap (the docs and `reference.html` describe it, but it was never implemented), it's non-trivial (sequencing/narration logic), and it naturally reuses the existing Met tool-layer research and plan as reference.

## What HVE-Core actually provides (verified in the extension)

- Prompt `/rpi` (driven by the `RPI Agent`) — the 5-phase Research → Plan → Implement → Review → Discover loop
- Phase prompts: `/task-research`, `/task-plan`, `/task-implement`, `/task-review`
- Subagents: `Researcher Subagent`, `task-planner`, `Phase Implementor`, `task-reviewer`, plus validators `Plan Validator`, `RPI Validator`, `Implementation Validator`, and `PR Review`
- All artifacts persist under `.copilot-tracking/` (research, plans, changes, review notes)

## Recommended target feature

`build_tour` — a new tool that takes a theme (or an existing result set) and returns an ordered, narrated sequence of public-domain artworks (stops), exposed as a 5th function tool alongside `search_collection`, `get_object`, `list_departments`, `find_related`.

## Steps (the true HVE-Core arc)

1. **Kick off the loop** — run `/rpi task="Add a build_tour agent tool to museum-sidekick that sequences public-domain artworks into a narrated, ordered tour"`. The `RPI Agent` takes over and manages phases + tracking files.

2. **Phase 1 — Research** (`Researcher Subagent`): produces `.copilot-tracking/research/build-tour-research.md` — Met endpoints reused, sequencing strategy (by tag/culture/period/chronology), tool JSON schema, how it composes with `searchCollection`, error/empty handling, and a vitest plan. Grounded via CAIRA skill + Learn MCP.

3. **Phase 2 — Plan** (`task-planner`): produces `.copilot-tracking/plans/build-tour-plan.md` — files to change (`met/client.ts`, `met/tools.ts`, `agent/agent.ts`, new tests), design decisions, task checklist, out-of-scope. Then `Plan Validator` checks the plan against the research doc and records discrepancies.

4. **Phase 3 — Implement** (`Phase Implementor`): executes the plan phase-by-phase, writing a `.copilot-tracking/changes/` log, adding the `buildTour` client function + `build_tour` tool definition + dispatch + tests, and running build/tests to green.

5. **Phase 4 — Review** (`task-reviewer` + `RPI Validator` / `Implementation Validator`): validates the changes log against the plan and research, grades findings by severity, and lists any required fixes.

6. **Phase 5 — Discover**: surfaces suggested follow-up work items (e.g., wire `build_tour` into the frontend gallery as an ordered itinerary, add tour export).

7. **Optional PR** — run `PR Review` and/or the `pull-request` prompt to generate a review-ready description from the branch diff.

## Relevant files (targets & references)

- `museum-sidekick/src/api/src/met/client.ts` — add `buildTour(...)` reusing `searchCollection` + guardrails
- `museum-sidekick/src/api/src/met/tools.ts` — add the `build_tour` schema to `metTools` + a `dispatchTool` case
- `museum-sidekick/src/api/src/agent/agent.ts` — no change likely; tool auto-available via `metTools`
- `museum-sidekick/src/api/src/met/client.test.ts` — new sequencing tests
- Reference: existing `.copilot-tracking/research/met-tool-layer-research.md` and `plans/met-tool-layer-plan.md`

## Verification

1. Every phase leaves an artifact in `.copilot-tracking/` (research → plan → changes → review) — the audit trail that proves it was a real RPI run
2. `npm run build` clean, `npm test` green (including new `build_tour` tests)
3. `Plan Validator` and `RPI Validator` report no unresolved high-severity findings

## Decisions / scope

- One feature only, to keep the demo tight and the loop observable
- Included: the full 5-phase RPI run with tracking artifacts and validators
- Excluded: re-running RPI over already-built layers (agent/API/frontend/infra) — those stay as-is unless Phase 5 recommends otherwise

## Further considerations

1. **Which feature?** `build_tour` (A, recommended — real gap, exercises full loop) / harden the **Terraform infra** (B — good if you want IaC-standards enforcement) / retro-fit RPI onto the **agent layer** (C — least valuable, already built).
2. **How autonomous?** Single `/rpi` run that flows through all phases (A) / drive each phase prompt manually so you can inspect each artifact before continuing (B, more didactic for a walkthrough).
3. **Finish with a PR?** Yes — run `PR Review` + generate a PR description as the capstone (A) / stop at Phase 5 discovery (B).
