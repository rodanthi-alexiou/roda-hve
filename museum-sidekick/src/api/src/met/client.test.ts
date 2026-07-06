import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findRelated,
  getObject,
  getObjects,
  searchCollection,
} from "./client.js";
import type { MetObject } from "./types.js";

// Minimal MetObject factory — only the fields the client reads.
function makeObject(overrides: Partial<MetObject>): MetObject {
  return {
    objectID: 1,
    isHighlight: false,
    isPublicDomain: true,
    primaryImage: "https://example.org/img.jpg",
    primaryImageSmall: "https://example.org/img-small.jpg",
    title: "Test Work",
    artistDisplayName: "Test Artist",
    artistDisplayBio: "",
    objectDate: "1900",
    medium: "Oil on canvas",
    dimensions: "",
    department: "European Paintings",
    culture: "",
    period: "",
    classification: "Paintings",
    objectURL: "https://metmuseum.org/art/1",
    tags: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("getObject cache", () => {
  it("fetches a repeated object only once", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(makeObject({ objectID: 45734 })),
    );
    vi.stubGlobal("fetch", fetchMock);

    // Unique ID so no other test has cached it.
    const first = await getObject(45734);
    const second = await getObject(45734);

    expect(first?.objectID).toBe(45734);
    expect(second?.objectID).toBe(45734);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches null on a non-ok response (no retry)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({}, false, 404),
    );
    vi.stubGlobal("fetch", fetchMock);

    const a = await getObject(999001);
    const b = await getObject(999001);

    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("getObjects bounded fan-out", () => {
  it("dedupes repeated IDs and soft-fails bad ones", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/objects/8801")) {
        return Promise.resolve(jsonResponse(makeObject({ objectID: 8801 })));
      }
      if (url.endsWith("/objects/8802")) {
        return Promise.resolve(jsonResponse(makeObject({ objectID: 8802 })));
      }
      return Promise.resolve(jsonResponse({}, false, 404));
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const objs = await getObjects([8801, 8801, 8802, 8803]);

    // The cache dedupes at the network level: 8801 is fetched once (shared
    // promise), 8802 once, 8803 once (404 → dropped from output). The output
    // preserves positional duplicates, but only 3 network calls are made.
    expect(objs.map((o) => o.objectID)).toEqual([8801, 8801, 8802]);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 8801, 8802, 8803
  });
});

describe("searchCollection guardrails", () => {
  it("keeps only public-domain works with a non-empty image", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve(
          jsonResponse({ total: 3, objectIDs: [7001, 7002, 7003] }),
        );
      }
      if (url.endsWith("/objects/7001")) {
        // valid
        return Promise.resolve(jsonResponse(makeObject({ objectID: 7001 })));
      }
      if (url.endsWith("/objects/7002")) {
        // copyrighted → excluded
        return Promise.resolve(
          jsonResponse(makeObject({ objectID: 7002, isPublicDomain: false })),
        );
      }
      // public-domain but empty image → excluded
      return Promise.resolve(
        jsonResponse(makeObject({ objectID: 7003, primaryImage: "" })),
      );
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const cards = await searchCollection({ q: "test" });

    expect(cards.map((c) => c.objectID)).toEqual([7001]);
  });

  it("forces hasImages=true in the search query", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ total: 0, objectIDs: null })),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await searchCollection({ q: "cats" });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("hasImages=true");
    expect(calledUrl).toContain("q=cats");
  });

  it("returns [] and does no fan-out when total is 0", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ total: 0, objectIDs: null })),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const cards = await searchCollection({ q: "zzzznope" });

    expect(cards).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // only /search, no /objects
  });
});

describe("findRelated", () => {
  it("falls back past null tags and excludes the source object", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith("/objects/5000")) {
        // source: no tags, no culture → falls back to medium
        return Promise.resolve(
          jsonResponse(
            makeObject({ objectID: 5000, tags: null, culture: "", medium: "Jade" }),
          ),
        );
      }
      if (url.includes("/search")) {
        return Promise.resolve(
          jsonResponse({ total: 2, objectIDs: [5000, 5001] }),
        );
      }
      // related work
      return Promise.resolve(jsonResponse(makeObject({ objectID: 5001 })));
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const cards = await findRelated(5000);

    expect(cards.map((c) => c.objectID)).toEqual([5001]);
    const searchUrl = fetchMock.mock.calls.find((c) =>
      (c[0] as string).includes("/search")
    )?.[0] as string;
    expect(searchUrl).toContain("q=Jade");
  });
});
