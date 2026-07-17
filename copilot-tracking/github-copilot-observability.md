# GitHub Copilot Observability Tracking

Working notes for references, repos, tests, and findings on observability options for GitHub Copilot across individual users and organizations.

## Scope

- Track how Copilot activity can be observed from local CLI/IDE sessions.
- Compare local telemetry hooks, Copilot CLI session state, VS Code debug logs, GitHub-hosted agent behavior, and organization-level reporting surfaces.
- Capture reusable tests and findings for HVE observability scenarios.

## This repo's telemetry hook

This repo includes a local Copilot telemetry hook under:

- `.github/hooks/shared/telemetry.json`
- `.github/hooks/shared/telemetry/telemetry-collector.sh`
- `.github/hooks/shared/telemetry/Invoke-TelemetryCollector.ps1`
- `.github/hooks/shared/telemetry/_telemetry_core.py`
- `.github/hooks/shared/telemetry/generate-telemetry-report.sh`
- `.github/hooks/shared/telemetry/Invoke-TelemetryReport.ps1`
- `.github/hooks/shared/telemetry/report.html`

The hook records Copilot session lifecycle events to local JSONL files and generates a self-contained HTML report.

### Events captured

`telemetry.json` registers hook handlers for:

| Event | Purpose |
| --- | --- |
| `sessionStart` | Records session start, cwd, source, and detected client. |
| `userPromptSubmit` | Records the first 200 characters of submitted prompts. |
| `preToolUse` | Records tool name, tool input keys, instruction/skill loads, and active agent context. |
| `postToolUse` | Records tool name, response length, and active agent context. |
| `subagentStart` / `subagentStop` | Tracks subagent boundaries. |
| `preCompact` | Captures a summary before context compaction. |
| `stop` | Captures end-of-session summary data. |

### Output files

Default output location:

```text
<repo>/.copilot-tracking/telemetry/
```

Important generated files:

| File | Created by | Description |
| --- | --- | --- |
| `sessions-YYYY-MM-DD.jsonl` | Collector hook via `_telemetry_core.py collect` | Local lifecycle events for sessions in this repo. |
| `report.generated.html` | Report generator | Self-contained dashboard with embedded telemetry data. |
| `cli-session-state.jsonl` | Temporary report enrichment file | Generated during report creation from `~/.copilot/session-state/{sid}/events.jsonl`; embedded into the HTML report, then deleted. |
| `debug-llm-requests.jsonl` | Temporary report enrichment file | Generated during report creation from VS Code debug logs when matching session IDs exist; embedded into the HTML report, then deleted. |

### Client detection

The collector classifies the source client from environment variables:

| Detected client | Condition |
| --- | --- |
| `cloud-agent` | `GITHUB_COPILOT_API_TOKEN` is present. |
| `vscode` | `VSCODE_PID` or `VSCODE_IPC_HOOK_CLI` is present. |
| `cli` | Default when neither condition applies. |

This means the hook is not CLI-only by design. It can classify CLI, VS Code, and cloud-agent contexts if the hook infrastructure fires for those surfaces.

### Opt-in gate

Collection is enabled when either condition is true:

```text
HVE_TELEMETRY=1
```

or the repo contains:

```text
.hve-telemetry
```

This repo has the `.hve-telemetry` marker, so telemetry collection is enabled for compatible hook executions in this repo.

### How to generate the report on Windows

From the repo root:

```powershell
pwsh -File ".github\hooks\shared\telemetry\Invoke-TelemetryReport.ps1" -Date "all" -Open
```

Useful options:

```powershell
# Generate only today's UTC report
pwsh -File ".github\hooks\shared\telemetry\Invoke-TelemetryReport.ps1"

# Generate for all available local session files
pwsh -File ".github\hooks\shared\telemetry\Invoke-TelemetryReport.ps1" -Date "all"

# Write to a custom output file
pwsh -File ".github\hooks\shared\telemetry\Invoke-TelemetryReport.ps1" -Date "all" -Output ".copilot-tracking\telemetry\report.generated.html"

# Include telemetry directories registered across projects
pwsh -File ".github\hooks\shared\telemetry\Invoke-TelemetryReport.ps1" -Date "all" -AllDirs
```

### How to generate the report on bash-compatible shells

From the repo root:

```bash
.github/hooks/shared/telemetry/generate-telemetry-report.sh --date all --open
```

### What the report does

The report generator:

1. Finds `sessions-*.jsonl` files in `.copilot-tracking/telemetry`.
2. Optionally enriches them with VS Code debug-log `llm_request` events for exact model/token data.
3. Optionally enriches CLI sessions from `~/.copilot/session-state/{sid}/events.jsonl`.
4. Embeds all selected JSONL content into `report.html`.
5. Writes a single portable `report.generated.html`.

The HTML dashboard shows:

- session matrix
- model and agent usage
- token usage when enrichment is available
- loaded instruction and skill files
- tool usage heatmap
- average tool latency from `PreToolUse` to `PostToolUse`

### Current known limitation

The report only shows sessions that have local hook telemetry files. If no `sessions-*.jsonl` file exists for a session, report-time enrichment cannot discover that session by itself because enrichment is scoped to session IDs already present in hook logs.

For this repo, only the current CLI session had generated local session telemetry at the time of initial testing.

## References and repos to evaluate

| Reference | Type | What to check | Status |
| --- | --- | --- | --- |
| This repo telemetry hook | Local hook implementation | Session lifecycle events, tool usage, token enrichment, report HTML. | In progress |
| GitHub Copilot CLI session state | Local CLI state | `~/.copilot/session-state/{sid}/events.jsonl` shape, model/token fidelity, retention. | To test |
| VS Code Copilot debug logs | Local IDE logs | Whether `llm_request` events are present and joinable by `sid`. | To test |
| GitHub Copilot organization metrics APIs/docs | Org-level reporting | Seat usage, adoption metrics, coding activity, privacy boundaries. | To research |
| GitHub-hosted coding agent sessions | Cloud agent | Whether lifecycle/token/tool telemetry can be exported or correlated. | To research |

## Test matrix

| Test | Surface | Expected evidence | Result |
| --- | --- | --- | --- |
| CLI prompt with tool calls | Copilot CLI | `sessions-YYYY-MM-DD.jsonl` contains prompt, pre/post tool events, and session summary. | Pending |
| CLI report generation | Copilot CLI | `report.generated.html` embeds `sessions-*.jsonl` and `cli-session-state.jsonl`. | Pending |
| VS Code Copilot Chat prompt | VS Code | Hook file records client as `vscode`, or debug logs provide joinable `llm_request` entries. | Pending |
| Subagent task | Copilot CLI | `SubagentStart`, `SubagentStop`, and parent/child attribution appear in report. | Pending |
| Cross-project report | Copilot CLI | `-AllDirs` includes telemetry directories from `~/.copilot/telemetry-dirs.txt`. | Pending |

## Findings

| Date | Finding | Evidence | Notes |
| --- | --- | --- | --- |
| 2026-07-09 | The hook design supports client classification for CLI, VS Code, and cloud-agent contexts. | `_detect_client()` in `_telemetry_core.py`. | Actual capture still depends on the hook being invoked by that surface. |
| 2026-07-09 | Report generation can enrich CLI token/model data from Copilot CLI session state. | `Invoke-TelemetryReport.ps1` calls `_telemetry_core.py aggregate-session`. | Enrichment is scoped to sessions already present in hook JSONL files. |
| 2026-07-09 | `cli-session-state.jsonl` is report-time enrichment, not a persistent source file in `.copilot-tracking/telemetry`. | Report generator creates it in a temp directory and embeds it into `report.generated.html`. | Useful distinction when debugging missing files. |
