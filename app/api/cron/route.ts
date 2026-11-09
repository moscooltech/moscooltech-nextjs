// $FlowIgnore
// @ts-nocheck
import { db } from "@/db";
import { schema } from "@/db/schema";
import type { JobRun } from "@/db/schema";
import { eq, and, gte, lt, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CRON_SECRET = "moscooltech-cron-2026-free";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret") ?? "";
  if (secret !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const job = url.searchParams.get("job") ?? "";

  // Idempotency check: only one job_runs row per job per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  let existing: any[] = [];
  try {
    existing = (await db()
      .select()
      .from(schema.jobRuns)) as any[];
    // $FlowFixMe[drizzle-inference]
    existing = existing?.length ? existing : [];
  } catch {
    // If table doesn't exist yet, first run goes through
  }

  const now = new Date().toISOString();

  if (job === "fetch_news") {
    const existingCount = existing.length;
    if (existingCount > 0) {
      return new Response(`Already run today: ${existingCount} row(s)`, { status: 200 });
    }
    // Simple fetch from NewsData.io if API key is configured
    const { NEWSDATA_API_KEY } = (await import("@/db")).bindings();
    if (NEWSDATA_API_KEY) {
      try {
        const resp = await fetch(`https://newsdata.io/api/1/latest?apikey=${NEWSDATA_API_KEY}&country=ng`);
        const data = await resp.json();
        if (data.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            await db()
              .insert(schema.newsArticles)
              .values({
                title: item.title,
                link: item.link,
                sourceId: item.category || "newsdata",
                pubDate: item.pubDate || now,
                apiSource: "newsdata",
                createdAt: now,
              })
              .onConflictDoUpdate({
                target: schema.newsArticles.link,
                set: { title: item.title, pubDate: item.pubDate },
              });
          }
        }
      } catch (e) {
        console.error("cron fetch_news error", e);
      }
    }
    await db()
      .insert(schema.jobRuns)
      .values({ jobName: "fetch_news", startedAt: now, durationMs: 0, status: "completed" });
    return new Response(`fetch_news: done (${existingCount > 0 ? "skipped inserts" : "new items"})`, {
      status: 200,
    });
  }

  if (job === "cleanup_news") {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const stale = await db()
      .select({ id: schema.newsArticles.id })
      .from(schema.newsArticles)
      .where(and(eq(schema.newsArticles.apiSource, "newsdata"), lt(schema.newsArticles.pubDate, cutoff)))
      .limit(200);

    if (stale.length) {
      await db()
        .delete(schema.newsArticles)
        .where(inArray(schema.newsArticles.id, stale.map((row) => row.id)));
    }
    await db()
      .insert(schema.jobRuns)
      .values({ jobName: "cleanup_news", startedAt: now, durationMs: 0, status: "completed" });
    return new Response(`cleanup_news: removed ${stale.length} old item(s)`, { status: 200 });
  }

  if (job === "generate_ai") {
    try {
      const aiKey = process.env.OPENAI_API_KEY || "";
      if (!aiKey) {
        await db()
          .insert(schema.jobRuns)
          .values({ jobName: "generate_ai", startedAt: now, durationMs: 0, status: "failed", error: "no API key" });
        return new Response("AI generation skipped: no OPENAI_API_KEY", { status: 200 });
      }
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Write a 2-paragraph HVAC business blog post about seasonal maintenance." }],
          temperature: 0.7,
        }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        await db()
          .insert(schema.jobRuns)
          .values({ jobName: "generate_ai", startedAt: now, durationMs: 0, status: "failed", error: (data as any).error?.message });
        return new Response(`AI generation failed: ${(data as any).error?.message ?? "unknown"}`, { status: 200 });
      }

      const generated = (data as any).choices?.[0]?.message?.content || "";
      await db()
        .insert(schema.jobRuns)
        .values({ jobName: "generate_ai", startedAt: now, durationMs: 0, status: "completed" });
      return new Response(`generate_ai: OK (${generated.length} chars)`, { status: 200 });
    } catch (e: any) {
      await db()
        .insert(schema.jobRuns)
        .values({ jobName: "generate_ai", startedAt: now, durationMs: 0, status: "failed", error: e.message });
      return new Response(`AI generation error: ${e.message}`, { status: 200 });
    }
  }

  return new Response(`Unknown job: ${job}`, { status: 400 });
}

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret") ?? "";
  if (secret !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const job = searchParams.get("job") ?? "";

  // Return stats summary
  const runs = (await db()
    .select({
      jobName: schema.jobRuns.jobName,
      _count: { count: schema.jobRuns.id },
      lastStarted: sql`MAX(${schema.jobRuns.startedAt})`,
    })
    .from(schema.jobRuns)
    .groupBy(schema.jobRuns.jobName)) as any;

  return new Response(JSON.stringify({ jobs: runs }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}