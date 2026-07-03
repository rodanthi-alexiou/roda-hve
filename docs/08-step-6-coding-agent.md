---
title: "Step 6: Hand a Feature to the Coding Agent"
description: "Delegate a new agent tool to the GitHub Coding Agent and review the pull request it opens"
author: Microsoft
ms.date: 2026-07-03
ms.topic: how-to
keywords:
  - github coding agent
  - pull request review
  - delegated development
estimated_reading_time: 6
---

## Step 6: Hand a Feature to the Coding Agent

**Goal:** show delegated development. Assign a self-contained feature to the
GitHub Coding Agent, then review the pull request it opens, live, while the room
watches.

**Building blocks used:** GitHub Coding Agent, the tests and structure from the
earlier steps.

### Choose a well-shaped feature

The Coding Agent does best with a small, well-bounded task that fits the patterns
already in the repository. A new Met tool is ideal: `find_related_works`, which
takes an object and returns thematically connected works using its tags, culture,
and period.

Because Steps 3 and 4 established the tool pattern and the test harness, the agent
has clear examples to follow. That is the payoff of building on a consistent
structure.

### Write the issue

Create a GitHub issue with a crisp specification. Clear acceptance criteria are
what let the agent finish without hand-holding.

```markdown
### Add a find_related_works tool

Add a new agent tool `find_related_works(objectID)` to the Met tool layer.

Behavior:
- Fetch the source object with the existing get_object.
- Search for works that share its tags, culture, or period.
- Reuse the batched, cached fetch and the public-domain + image filters.
- Return up to 6 related works, excluding the source object.

Acceptance criteria:
- Registered as a Foundry agent tool with a clear schema.
- Unit tests mock the Met API and cover the tag-match and exclusion logic.
- All existing tests still pass.
```

### Delegate to the Coding Agent

Assign the issue to the GitHub Coding Agent (assign to Copilot on the issue, or
use the CLI).

```bash
gh issue create \
  --title "Add a find_related_works tool" \
  --body-file .github/ISSUE_find_related_works.md \
  --assignee "@copilot"
```

The Coding Agent works in the background: it reads the repository, follows the
established tool and test patterns, implements the feature, runs the tests, and
opens a pull request.

### Review the pull request

When the PR arrives, review it as you would any contributor's. Focus on the
things that matter for this feature.

* Does it reuse the batched, cached fetch rather than adding a second fan-out?
* Does it keep the public-domain and image safety filters?
* Do the new tests actually exercise the tag-match and exclusion logic?
* Are the existing tests still green in CI?

You can drive the review from the VS Code pull request experience or from the
CLI.

```bash
gh pr checkout <number>
npm test
gh pr review <number> --approve
```

> [!TIP]
> If something is off, leave a review comment and let the Coding Agent revise.
> The back-and-forth is itself a compelling demo of human-in-the-loop delegation.

### What you just demonstrated

* A real feature was implemented by an autonomous agent, following the
  repository's own conventions.
* Human review stayed in control, approving grounded, tested work.

### Next

Continue to [Step 7: Deploy and demo](09-step-7-deploy-demo.md).
