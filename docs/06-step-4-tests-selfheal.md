---
title: "Step 4: Tests and Self-Heal"
description: "Add a test suite with a mocked Met API and use HVE's review loop to let Copilot diagnose and fix its own failures"
author: Microsoft
ms.date: 2026-07-03
ms.topic: how-to
keywords:
  - testing
  - mock api
  - self-healing code
estimated_reading_time: 6
---

## Step 4: Tests and Self-Heal

**Goal:** make the tool layer trustworthy. Add tests that mock the Met API, then
use HVE's review loop to have Copilot diagnose and fix any failures it finds.

**Building blocks used:** HVE (RPI implement and review).

### Why mock the Met API

The live Met API is fast and free, but tests should not depend on the network or
on specific object IDs staying stable. Mock the `fetch` calls so tests are
deterministic and prove your logic: batching, caching, and the safety filters.

### Research and plan the tests

```text
/rpi-research Plan a test suite for the Met tool layer. Mock the Met API so
tests never hit the network. Cover: search_collection returns only public-domain
works with images, get_object caches so a repeated ID is fetched once, and the
fan-out respects the concurrency limit. Produce a research document.
```

```text
/clear
/rpi-plan Plan the test files and the mock harness from the research.
```

### Implement the tests

```text
/clear
/rpi-implement Execute the test plan.
```

A representative test asserts the caching behavior.

```typescript
// src/api/met/client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchCollection } from "./client";

beforeEach(() => vi.restoreAllMocks());

it("caches get_object so a repeated ID is fetched once", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
    if (String(url).includes("/search")) {
      return jsonResponse({ objectIDs: [1, 1, 2] });
    }
    return jsonResponse(publicDomainObject(Number(String(url).split("/").pop())));
  });

  await searchCollection({ q: "cats" });

  // /search once + two unique objects, not three
  expect(fetchSpy).toHaveBeenCalledTimes(3);
});

it("drops works that are not public domain", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation((url) =>
    String(url).includes("/search")
      ? jsonResponse({ objectIDs: [7] })
      : jsonResponse({ ...publicDomainObject(7), isPublicDomain: false })
  );

  const results = await searchCollection({ q: "cats" });
  expect(results).toHaveLength(0);
});
```

Run the suite.

```bash
npm test
```

### Let Copilot self-heal failures

When a test fails, do not fix it by hand first. Feed the failure to the review
loop and let the agent diagnose and repair it. This is a strong demo moment
because the room watches the agent reason about its own output.

```text
/rpi-review The test suite has failures. Analyze the failing tests and the tool
layer, identify the root cause, and produce a plan to fix it.
```

```text
/clear
/rpi-implement Apply the fix from the review.
```

Repeat until green. Each cycle is grounded in the actual failure output, so the
agent converges on a real fix rather than thrashing.

> [!TIP]
> The self-heal loop works because the review phase reads the test output as
> evidence. It is the same research-first discipline applied to debugging.

### What you just demonstrated

* The retrieval layer is covered by fast, deterministic tests.
* Copilot diagnosed and repaired its own failures through the HVE review loop.

### Next

Continue to [Step 5: Infrastructure and CI/CD](07-step-5-iac-cicd.md).
