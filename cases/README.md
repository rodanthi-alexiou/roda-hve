# Bottleneck Case Catalog

Playbooks showing how [HVE Core](https://github.com/microsoft/hve-core) and [HVE Squad](https://peter-n91.github.io/hve-squad/) solve real SDLC bottlenecks for partner teams.

Each case follows the engagement model: **Identify → Design → Test → Measure → Scale**.

## Cases

| Bottleneck | HVE Answer | Status | Link |
|-----------|-----------|--------|------|
| Slow reviews / large PRs | PR Review agent + encoded standards | In progress | [slow-reviews](slow-reviews/) |
| Unclear requirements / rework | Research → Plan loop + BRD/PRD agents | In progress | [unclear-requirements](unclear-requirements/) |
| Flaky or missing tests | Test-generation agents + coverage KPIs | Planned | — |
| Long developer onboarding | Project standards + HVE Learning katas | Planned | — |

## Adding a new case

1. Run `/onboard-case` in Copilot Chat — it scaffolds the folder, updates this table, and adds a card to the GitHub Pages playbooks page.
2. Or do it manually:
   - Copy `_template/` into a new folder: `cases/<bottleneck-name>/`
   - Fill in the 7 sections in `README.md`
   - Add a row to the table above
   - Add a card to `docs/playbooks.html`
3. Push to `main` — GitHub Pages deploys automatically.

## Structure

```
cases/
├── README.md              ← you are here
├── _template/
│   └── README.md          ← copy this to start a new case
├── slow-reviews/
│   └── README.md
└── unclear-requirements/
    └── README.md
```

## External references

- [HVE Core](https://github.com/microsoft/hve-core) — agents, prompts, instructions, skills
- [HVE Squad](https://peter-n91.github.io/hve-squad/) — coordinator, profiles, requirements intake gate
- [HVE Practices Lab](https://rodanthi-alexiou.github.io/roda-hve/) — GitHub Pages site with playbooks page
