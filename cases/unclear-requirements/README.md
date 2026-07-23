# Unclear Requirements / Rework

## Bottleneck

Features ship without clear problem definitions. Developers interpret tickets differently, leading to rework loops and scope creep. Sprint goals are missed because "done" was never defined.

Typical signals:

- Rework rate > 30% of sprint capacity
- Stories reopen after review
- Acceptance criteria missing or vague on > 50% of backlog items

## HVE Answer

| Tool | Type | What it does |
|------|------|--------------|
| [BRD Builder](https://github.com/microsoft/hve-core) | Agent | Guided Q&A to produce a structured Business Requirements Document |
| [PRD Builder](https://github.com/microsoft/hve-core) | Agent | Guided Q&A to produce a structured Product Requirements Document |
| [Product Manager Advisor](https://github.com/microsoft/hve-core) | Agent | Requirements discovery, validation, and issue creation |
| [Task Planner](https://github.com/microsoft/hve-core) | Agent | Decomposes requirements into actionable engineering tasks |
| [/rpi](https://github.com/microsoft/hve-core) | Prompt | Research → Plan → Implement loop with structured outputs |
| [story-quality instructions](https://github.com/microsoft/hve-core) | Instructions | Shared quality conventions for work item creation and evaluation |

- [HVE Core](https://github.com/microsoft/hve-core)
- [HVE Squad](https://peter-n91.github.io/hve-squad/)

## Engagement Model Mapping

| Stage | What happens |
|-------|-------------|
| **Identify** | Audit recent sprints for rework rate and story quality scores |
| **Design** | Set up BRD/PRD builders in the team's workflow; configure story-quality instructions |
| **Test** | 2–4 week pilot: run all new features through the Research → Plan loop before implementation |
| **Measure** | Compare rework rate, story reopens, and sprint completion vs. baseline |
| **Scale** | Embed agents into intake process; add Requirements Intake Gate from HVE Squad |

## Demo Script

1. Show a poorly-defined backlog item (missing acceptance criteria, vague scope)
2. Invoke the BRD Builder agent — walk through the guided Q&A
3. Show the structured BRD output with problem statement, success criteria, constraints
4. Feed the BRD into the PRD Builder to produce technical requirements
5. Use the Task Planner to decompose into sprint-ready stories
6. Show story-quality instructions validating the output
7. Compare the original ticket vs. the generated artifacts

## Before / After

| Metric | Before | After (target) |
|--------|--------|----------------|
| Rework rate | 35% of sprint | < 10% |
| Stories with acceptance criteria | 45% | > 95% |
| Sprint goal completion | 60% | > 85% |
| Story reopen rate | 25% | < 5% |

## KPIs to Track

- **Rework rate**: Percentage of sprint points spent on rework — measured via ADO/Jira tag analysis
- **Story quality score**: Percentage of stories passing story-quality instructions checks — measured via automated scan
- **Sprint completion**: Percentage of committed stories shipped — measured via sprint reports
- **Time to first code**: Days from story creation to first commit — measured via repo + tracker correlation

## Resources

- [HVE Core — BRD Builder agent](https://github.com/microsoft/hve-core)
- [HVE Core — PRD Builder agent](https://github.com/microsoft/hve-core)
- [HVE Core — Product Manager Advisor agent](https://github.com/microsoft/hve-core)
- [HVE Squad — Requirements Intake Gate](https://peter-n91.github.io/hve-squad/)
