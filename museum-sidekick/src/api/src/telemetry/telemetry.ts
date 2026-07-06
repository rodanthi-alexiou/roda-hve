// Structured tracing + Azure Application Insights for the API.
//
// Design goals:
//   * Side-effect only — telemetry never changes request or agent behavior.
//   * Zero-config locally: always emits one structured JSON line per signal to
//     stdout (captured by Container Apps -> Log Analytics), silent under Vitest.
//   * When APPLICATIONINSIGHTS_CONNECTION_STRING is set, the same signals are
//     also sent to Application Insights via the applicationinsights SDK, which
//     is lazy-imported so tests never load it.
//   * Passwordless: telemetry authenticates to Application Insights with Entra
//     ID (DefaultAzureCredential / the app's managed identity); the connection
//     string only supplies the ingestion endpoint, and no keys live in code.

type Props = Record<string, string | number | boolean | undefined>;
type Measurements = Record<string, number>;

/** Minimal surface of the applicationinsights TelemetryClient we depend on. */
interface AiClient {
  trackEvent(t: {
    name: string;
    properties?: Record<string, string>;
    measurements?: Record<string, number>;
  }): void;
  trackDependency(t: {
    name: string;
    data: string;
    dependencyTypeName: string;
    duration: number;
    success: boolean;
    resultCode: string;
    properties?: Record<string, string>;
  }): void;
  trackException(t: {
    exception: Error;
    properties?: Record<string, string>;
  }): void;
  trackMetric(t: {
    name: string;
    value: number;
    properties?: Record<string, string>;
  }): void;
  flush(): void;
}

const ROLE = "museum-sidekick-api";
// Keep test output clean: Vitest sets VITEST=true.
const silent = Boolean(process.env.VITEST);

let aiClient: AiClient | undefined;
let initialized = false;

function emit(kind: string, payload: Record<string, unknown>): void {
  if (silent) return;
  console.log(
    JSON.stringify({ telemetry: kind, ts: new Date().toISOString(), ...payload }),
  );
}

function stringProps(p?: Props): Record<string, string> | undefined {
  if (!p) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}

/**
 * Initialize telemetry once at startup. When a connection string is present the
 * applicationinsights SDK is configured; otherwise telemetry stays in
 * structured-console mode. Safe to call multiple times.
 */
export async function initTelemetry(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!conn) {
    emit("init", { enabled: false, reason: "no connection string" });
    return;
  }

  try {
    // applicationinsights is CommonJS. Imported from ESM, its synthesized named
    // bindings (e.g. `defaultClient`) are snapshots taken at import time — before
    // setup() runs — so they stay `undefined`. Go through the live module.exports
    // object (the default export) so `defaultClient` reflects setup()'s assignment.
    const mod = (await import("applicationinsights")) as typeof import("applicationinsights") & {
      default?: typeof import("applicationinsights");
    };
    const appInsights = mod.default ?? mod;
    // Configure the client but defer start(): the AAD credential must be set on
    // config before start() builds the exporter (start() reads aadTokenCredential
    // via parseConfig()).
    appInsights
      .setup(conn)
      .setAutoCollectRequests(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectPerformance(false, false)
      .setSendLiveMetrics(false);
    const client = appInsights.defaultClient;
    if (!client) throw new Error("defaultClient unavailable after setup()");

    // Passwordless ingestion: authenticate to Application Insights with Entra ID
    // (the app's user-assigned managed identity via DefaultAzureCredential, which
    // honors AZURE_CLIENT_ID) instead of the connection-string instrumentation
    // key. Matches the passwordless credential used for Azure OpenAI.
    const { DefaultAzureCredential } = await import("@azure/identity");
    client.config.aadTokenCredential = new DefaultAzureCredential();

    appInsights.start();
    client.context.tags[client.context.keys.cloudRole] = ROLE;
    aiClient = client as unknown as AiClient;
    emit("init", { enabled: true, role: ROLE, auth: "aad" });
  } catch (err) {
    emit("init", {
      enabled: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Record a named custom event with optional properties and measurements. */
export function trackEvent(
  name: string,
  properties?: Props,
  measurements?: Measurements,
): void {
  emit("event", { name, properties, measurements });
  aiClient?.trackEvent({
    name,
    properties: stringProps(properties),
    measurements,
  });
}

/** Record an outbound dependency call (HTTP, Azure OpenAI, in-proc tool, ...). */
export function trackDependency(d: {
  name: string;
  data: string;
  type: string;
  duration: number;
  success: boolean;
  resultCode?: string | number;
  properties?: Props;
}): void {
  emit("dependency", {
    name: d.name,
    data: d.data,
    type: d.type,
    duration: d.duration,
    success: d.success,
    resultCode: d.resultCode,
    properties: d.properties,
  });
  aiClient?.trackDependency({
    name: d.name,
    data: d.data,
    dependencyTypeName: d.type,
    duration: d.duration,
    success: d.success,
    resultCode: String(d.resultCode ?? (d.success ? 0 : 1)),
    properties: stringProps(d.properties),
  });
}

/** Record a handled or unhandled exception. */
export function trackException(error: unknown, properties?: Props): void {
  const err = error instanceof Error ? error : new Error(String(error));
  emit("exception", { message: err.message, properties });
  aiClient?.trackException({
    exception: err,
    properties: stringProps(properties),
  });
}

/** Record a numeric metric sample. */
export function trackMetric(
  name: string,
  value: number,
  properties?: Props,
): void {
  emit("metric", { name, value, properties });
  aiClient?.trackMetric({ name, value, properties: stringProps(properties) });
}

/** Best-effort flush of buffered telemetry (no-op when unconfigured). */
export function flushTelemetry(): void {
  aiClient?.flush();
}

/** Start a stopwatch; the returned function yields elapsed milliseconds. */
export function startTimer(): () => number {
  const t0 = performance.now();
  return () => Math.round(performance.now() - t0);
}
