import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Worker bindings, declared by hand so the app typechecks before Wrangler
 * generates types. Only DB is mandatory; a missing secret disables a feature
 * instead of crashing a page.
 */
export interface Bindings {
  DB: D1Database;
  VINEXT_KV_CACHE?: KVNamespace;
  ASSETS?: Fetcher;
  /** Workers AI binding — typed loosely so we don't depend on global types. */
  AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  NEWSDATA_API_KEY?: string;
  AI_API_KEY?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;
  SITE_URL?: string;
  BUSINESS_ADDRESS?: string;
  BUSINESS_LOCALITY?: string;
  BUSINESS_REGION?: string;
  BUSINESS_PHONE?: string;
  BUSINESS_EMAIL?: string;
  GOOGLE_REVIEW_URL?: string;
  GA_MEASUREMENT_ID?: string;
  CRON_SECRET?: string;
}

const BINDING_KEYS = [
  "DB",
  "VINEXT_KV_CACHE",
  "AI",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
  "TURNSTILE_SECRET",
  "TURNSTILE_SITE_KEY",
  "NEWSDATA_API_KEY",
  "AI_API_KEY",
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_BASE_URL",
  "SITE_URL",
  "BUSINESS_ADDRESS",
  "BUSINESS_LOCALITY",
  "BUSINESS_REGION",
  "BUSINESS_PHONE",
  "BUSINESS_EMAIL",
  "GOOGLE_REVIEW_URL",
  "GA_MEASUREMENT_ID",
  "CRON_SECRET",
] as const;

let cachedBindings: Bindings | null = null;

type Db = ReturnType<typeof createClient>;

let cached: Db | null = null;

/**
 * Reset memoised state — used by tests that swap bindings. Clears both the
 * binding snapshot and the Drizzle client.
 */
export function resetDb(): void {
  cachedBindings = null;
  cached = null;
}

/**
 * Access Worker bindings from any server component, route handler or action.
 *
 * At build time `cloudflare:workers` bindings are not available and every
 * property access throws. Reading each key defensively means prerendering sees
 * an empty environment (falling back to defaults and empty data) instead of
 * failing the build — real requests still get the real bindings.
 */
export function bindings(): Bindings {
  if (cachedBindings) return cachedBindings;

  const values: Record<string, unknown> = {};
  try {
    const raw = env as unknown as Record<string, unknown>;
    for (const key of BINDING_KEYS) values[key] = raw[key];
  } catch {
    // Build-time prerender: no bindings, defaults only.
  }

  cachedBindings = values as unknown as Bindings;
  return cachedBindings;
}

/** True when running inside a Worker with real bindings attached. */
export function hasBindings(): boolean {
  try {
    return Boolean((env as unknown as Record<string, unknown>).DB);
  } catch {
    return false;
  }
}

function createClient() {
  return drizzle(bindings().DB, { schema });
}

/** Drizzle client over the D1 binding, reused within the isolate. */
export function db(): Db {
  if (!cached) cached = createClient();
  return cached;
}

export { schema };
