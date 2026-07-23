# Slow Reviews / Large PRs

## Bottleneck

Pull requests sit open for days. Reviews are superficial because diffs are too large. Developers context-switch while waiting, and defects slip through.

Typical signals:

- PR cycle time > 2 days
- Average diff size > 400 lines
- Review comments focus on style, not logic

## HVE Answer

| Tool | Type | What it does |
|------|------|--------------|
| [PR Review](https://github.com/microsoft/hve-core) | Agent | 8-step review protocol across 8 dimensions (correctness, security, performance, readability, testing, architecture, docs, conventions) |
| [Functional Code Review](https://github.com/microsoft/hve-core) | Agent | Pre-PR branch diff reviewer for functional correctness, error handling, edge cases, testing gaps |
| [/pull-request](https://github.com/microsoft/hve-core) | Prompt | Generates structured PR description from diff analysis |
| [coding-standards instructions](https://github.com/microsoft/hve-core) | Instructions | Encodes team conventions so agents enforce them automatically |

- [HVE Core](https://github.com/microsoft/hve-core)
- [HVE Squad](https://peter-n91.github.io/hve-squad/)

## Engagement Model Mapping

| Stage | What happens |
|-------|-------------|
| **Identify** | Measure current PR cycle time and diff sizes from repo analytics |
| **Design** | Configure PR Review agent with partner's coding standards; set up `/pull-request` prompt |
| **Test** | 2–4 week pilot: team uses agents for every PR on one repository |
| **Measure** | Compare cycle time, review depth, and escaped defects vs. baseline |
| **Scale** | Roll out HVE Core extension across all team repos; add CI integration |

## Demo Script

1. Open a sample repo with a pending PR (or create one from a feature branch)
2. Invoke the PR Review agent on the open PR
3. Walk through the 8-dimension review output
4. Show how coding-standards instructions customize the review
5. Run `/pull-request` to generate a structured PR description
6. Show the Functional Code Review agent catching an edge case
7. Compare output to a manual review of the same PR

## Before / After

| Metric | Before | After (target) |
|--------|--------|----------------|
| PR cycle time | 3.2 days | < 1 day |
| Avg diff size per PR | 480 lines | 480 lines (unchanged — smaller PRs are a culture change) |
| Review comments on style | 60% | < 10% (agents catch style automatically) |
| Escaped defects/sprint | 4 | < 1 |

## KPIs to Track

- **PR cycle time**: Time from PR open to merge — measured via GitHub/ADO analytics
- **Review thoroughness**: Number of substantive (non-style) comments — measured via manual tagging
- **Escaped defects**: Bugs found post-merge in the same sprint — measured via bug linking
- **Developer satisfaction**: Survey on review experience — measured via 1-5 scale weekly pulse

## Resources

- [HVE Core — PR Review agent](https://github.com/microsoft/hve-core)
- [HVE Core — Functional Code Review agent](https://github.com/microsoft/hve-core)
- [HVE Squad coordinator](https://peter-n91.github.io/hve-squad/)
