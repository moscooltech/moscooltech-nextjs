import { and, desc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateDailyPost, generateTopicById } from "./generate";
import { cleanupNews, fetchNews } from "./news";

/**
 * Background jobs, callable from the HTTP cron endpoint.
 *
 * `job_runs` is keyed by an id and records `job`, `ran_at` and a free-text
 * `result`. The daily idempotency check reads that table rather than a counter,
 * so a failed run can be retried the same day by deleting its row.
 */

export const JOB_NAMES = ["fetch_news", "cleanup_news", "generate_ai", "daily_post"] as const;
export type JobName = (typeof JOB_NAMES)[number];

export function isJobName(value: string): value is JobName {
  return (JOB_NAMES as readonly string[]).includes(value);
}

/** Midnight UTC today, as an ISO string — the window for "already ran today". */
function startOfTodayUtc(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function alreadyRanToday(job: JobName): Promise<boolean> {
  try {
    const rows = await db()
      .select({ id: schema.jobRuns.id })
      .from(schema.jobRuns)
      .where(and(eq(schema.jobRuns.job, job), gte(schema.jobRuns.ranAt, startOfTodayUtc())))
      .limit(1);
    return rows.length > 0;
  } catch {
    // Un-migrated database: let the run proceed and fail loudly on its own.
    return false;
  }
}

async function record(job: JobName, result: string): Promise<void> {
  try {
    await db()
      .insert(schema.jobRuns)
      .values({ id: crypto.randomUUID(), job, result, ranAt: new Date().toISOString() });
  } catch {
    /* a logging failure must not fail the job */
  }
}

export type JobOutcome = { ran: boolean; message: string };

/**
 * Runs one job. `force` bypasses the once-per-day idempotency window — used
 * by smoke tests and manual retries (the cron route accepts ?force=1).
 *
 * The daily_post branch only records a `job_runs` row on SUCCESS: a failed run
 * leaves no row, so a scheduler's automatic retry actually re-runs it the same
 * day instead of hitting the "already ran today" wall.
 */
export async function runJob(job: JobName, force = false): Promise<JobOutcome> {
  if (!force && (await alreadyRanToday(job))) {
    return { ran: false, message: `${job}: already ran today, skipped` };
  }

  if (job === "fetch_news") {
    const { imported, detail } = await fetchNews();
    const message = imported
      ? `fetch_news: imported ${imported} article(s) — ${detail}`
      : `fetch_news: 0 imported — ${detail}`;
    await record(job, message.slice(0, 500));
    return { ran: true, message };
  }

  if (job === "cleanup_news") {
    const removed = await cleanupNews();
    const message = `cleanup_news: removed ${removed} article(s)`;
    await record(job, message);
    return { ran: true, message };
  }

  if (job === "daily_post") {
    const result = await generateDailyPost();
    if (!result.ok) {
      // No record() here — see the doc comment above.
      throw new Error(`daily_post failed: ${result.error}`);
    }
    const image = result.image.ok ? "image ok" : `image skipped (${result.image.reason ?? "unknown"})`;
    const refill = result.refilled ? `; pool refilled +${result.refilled}` : "";
    const message = `daily_post: published post ${result.postId} — "${result.topic}" — ${image}${refill}`;
    await record(job, message.slice(0, 500));
    return { ran: true, message };
  }

  // generate_ai: drain at most two queued topics per invocation so a single run
  // cannot blow the request timeout.
  const queued = await db()
    .select({ id: schema.contentTopics.id })
    .from(schema.contentTopics)
    .where(eq(schema.contentTopics.status, "queued"))
    .limit(2);

  if (!queued.length) {
    const message = "generate_ai: queue empty";
    await record(job, message);
    return { ran: true, message };
  }

  const results: string[] = [];
  for (const row of queued) {
    const result = await generateTopicById(row.id);
    results.push(result.ok ? `topic ${row.id} → post ${result.postId}` : `topic ${row.id} failed`);
  }

  const message = `generate_ai: ${results.join("; ")}`;
  await record(job, message.slice(0, 500));
  return { ran: true, message };
}

export async function jobStats() {
  try {
    const rows = await db()
      .select()
      .from(schema.jobRuns)
      .orderBy(desc(schema.jobRuns.ranAt))
      .limit(20);
    return rows;
  } catch {
    return [];
  }
}
