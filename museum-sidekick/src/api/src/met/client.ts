// Met Collection API client for the Museum Sidekick tool layer.
//
// Solves the N+1 fan-out: `/search` returns object IDs only, so rendering
// results requires one `/objects/{id}` call per ID. We batch those fetches with
// bounded concurrency and cache them by objectID. Every displayed work must pass
// all three guardrails: hasImages=true (search filter) + isPublicDomain === true
// + a non-empty primaryImage.
//
// Grounded in the official Met API docs: https://metmuseum.github.io/

import type {
  ArtworkCard,
  Department,
  MetObject,
  SearchParams,
} from "./types.js";
import {
  startTimer,
  trackDependency,
  trackException,
} from "../telemetry/telemetry.js";

const BASE =
  "https://collectionapi.metmuseum.org/public/collection/v1";

/** Max `/objects/{id}` requests in flight at once (stays well under 80 req/s). */
const CONCURRENCY = 8;

/** fetch wrapper that records each Met HTTP call as a dependency. */
async function tracedFetch(name: string, url: string): Promise<Response> {
  const stop = startTimer();
  try {
    const res = await fetch(url);
    trackDependency({
      name,
      data: url,
      type: "HTTP",
      duration: stop(),
      success: res.ok,
      resultCode: res.status,
    });
    return res;
  } catch (err) {
    trackDependency({
      name,
      data: url,
      type: "HTTP",
      duration: stop(),
      success: false,
    });
    trackException(err, { url });
    throw err;
  }
}

/**
 * Process-local cache keyed by objectID. Stores the in-flight promise so that
 * concurrent requests for the same ID share one network call. Ephemeral by
 * design (SPEC: no persistence). `null` results (404 / non-ok) are cached too,
 * to avoid retry storms on bad IDs.
 */
const cache = new Map<number, Promise<MetObject | null>>();

/** Fetch a single object by ID, served through the cache. */
export function getObject(id: number): Promise<MetObject | null> {
  const cached = cache.get(id);
  if (cached) return cached;

  const promise = (async (): Promise<MetObject | null> => {
    const res = await tracedFetch("Met /objects", `${BASE}/objects/${id}`);
    // fetch does not throw on 4xx/5xx — check explicitly.
    if (!res.ok) return null;
    return (await res.json()) as MetObject;
  })();

  cache.set(id, promise);
  return promise;
}

/**
 * Hydrate many object IDs with bounded concurrency. Fetches in slices of
 * CONCURRENCY, dropping any that fail (soft-fail) so one bad ID never sinks the
 * whole gallery.
 */
export async function getObjects(ids: number[]): Promise<MetObject[]> {
  const out: MetObject[] = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY).map(getObject);
    const settled = await Promise.all(batch);
    for (const obj of settled) {
      if (obj) out.push(obj);
    }
  }
  return out;
}

/** True when a work is safe and usable to display. */
function isDisplayable(obj: MetObject): boolean {
  return obj.isPublicDomain === true && typeof obj.primaryImage === "string" &&
    obj.primaryImage.length > 0;
}

/** Serialize search params into a query string, forcing hasImages=true. */
function toQuery(params: SearchParams): string {
  const qs = new URLSearchParams();
  qs.set("hasImages", "true");
  qs.set("q", params.q);
  if (params.departmentId !== undefined) {
    qs.set("departmentId", String(params.departmentId));
  }
  if (params.medium !== undefined) qs.set("medium", params.medium);
  if (params.geoLocation !== undefined) {
    qs.set("geoLocation", params.geoLocation);
  }
  if (params.dateBegin !== undefined && params.dateEnd !== undefined) {
    qs.set("dateBegin", String(params.dateBegin));
    qs.set("dateEnd", String(params.dateEnd));
  }
  // Booleans are case-sensitive literal strings in the Met API.
  if (params.isHighlight !== undefined) {
    qs.set("isHighlight", params.isHighlight ? "true" : "false");
  }
  if (params.isOnView !== undefined) {
    qs.set("isOnView", params.isOnView ? "true" : "false");
  }
  return qs.toString();
}

/** Map a full Met object down to the trimmed card the UI/agent consume. */
export function toArtworkCard(obj: MetObject): ArtworkCard {
  return {
    objectID: obj.objectID,
    title: obj.title,
    artist: obj.artistDisplayName,
    date: obj.objectDate,
    medium: obj.medium,
    department: obj.department,
    culture: obj.culture,
    image: obj.primaryImage,
    thumbnail: obj.primaryImageSmall || obj.primaryImage,
    url: obj.objectURL,
  };
}

/**
 * Search the collection and return hydrated, guardrail-filtered artwork cards.
 * Over-fetches (2x limit) to compensate for records dropped by the guardrails,
 * then trims to `limit`.
 */
export async function searchCollection(
  params: SearchParams,
  limit = 12,
): Promise<ArtworkCard[]> {
  const res = await tracedFetch(
    "Met /search",
    `${BASE}/search?${toQuery(params)}`,
  );
  if (!res.ok) return [];

  const { objectIDs } = (await res.json()) as {
    total: number;
    objectIDs: number[] | null;
  };
  if (!objectIDs || objectIDs.length === 0) return [];

  const hydrateCount = Math.min(objectIDs.length, limit * 2);
  const objects = await getObjects(objectIDs.slice(0, hydrateCount));

  return objects
    .filter(isDisplayable)
    .slice(0, limit)
    .map(toArtworkCard);
}

/** List the Met's curatorial departments (fetched live, not hardcoded). */
export async function listDepartments(): Promise<Department[]> {
  const res = await tracedFetch("Met /departments", `${BASE}/departments`);
  if (!res.ok) return [];
  const { departments } = (await res.json()) as {
    departments: Department[];
  };
  return departments ?? [];
}

/**
 * Given a source object, find other public-domain works related to it by its
 * dominant subject tag, culture, or medium. Excludes the source work.
 */
export async function findRelated(
  objectID: number,
  limit = 6,
): Promise<ArtworkCard[]> {
  const source = await getObject(objectID);
  if (!source) return [];

  // Pick the first available facet: subject tag, then culture, then medium.
  const facet = source.tags?.[0]?.term || source.culture || source.medium;
  if (!facet) return [];

  // Over-fetch by one so we still return `limit` after excluding the source.
  const results = await searchCollection({ q: facet }, limit + 1);
  return results.filter((c) => c.objectID !== objectID).slice(0, limit);
}
