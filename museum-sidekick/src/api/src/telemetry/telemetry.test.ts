import { afterEach, describe, expect, it, vi } from "vitest";
import {
  startTimer,
  trackDependency,
  trackEvent,
  trackException,
  trackMetric,
} from "./telemetry.js";

// Under Vitest (VITEST=true) the telemetry module is console-silent and, with no
// APPLICATIONINSIGHTS_CONNECTION_STRING, has no SDK client. These tests assert
// the wrapper is side-effect-safe and never throws when unconfigured.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("telemetry (unconfigured)", () => {
  it("does not emit to the console when running under Vitest", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    trackEvent("ChatTurn", { turnId: "abc" }, { durationMs: 5 });
    expect(spy).not.toHaveBeenCalled();
  });

  it("tracks events, dependencies, metrics and exceptions without throwing", () => {
    expect(() => trackEvent("AgentComplete", { turnId: "t" })).not.toThrow();
    expect(() =>
      trackDependency({
        name: "Met /search",
        data: "https://example.org",
        type: "HTTP",
        duration: 12,
        success: true,
        resultCode: 200,
      }),
    ).not.toThrow();
    expect(() => trackMetric("openai.total_tokens", 42, { turnId: "t" }))
      .not.toThrow();
    expect(() => trackException(new Error("boom"), { turnId: "t" }))
      .not.toThrow();
    expect(() => trackException("string error")).not.toThrow();
  });

  it("startTimer returns a non-negative elapsed millisecond count", () => {
    const stop = startTimer();
    const elapsed = stop();
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(elapsed)).toBe(true);
  });
});
