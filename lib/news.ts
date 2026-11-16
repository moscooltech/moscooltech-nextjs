import { and, eq, inArray, lt } from "drizzle-orm";
import { bindings, db, schema } from "@/db";

/** Keywords that keep the feed on-topic; the same list gates relevance. */
export const NEWS_KEYWORDS = [
  "air conditioning",
  "air conditioner",
  "refrigerator",
  "refrigeration",
  "hvac",
  "solar panel",
  "solar installation",
  "inverter",
  "electrical wiring",
];

/**
 * Query sent to NewsData.io — capped at 100 chars (their API 422s beyond that,
 * `UnsupportedQueryLength`). A broad query is fine here because the local
 * NEWS_KEYWORDS filter re-checks every returned title/description anyway.
 */
const QUERY_TERMS = ["air conditioning", "refrigeration", "solar", "inverter", "electrical"];

type NewsApiItem = {
  article_id?: string;
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  source_id?: string;
  image_url?: string;
};

/**
 * Pulls the latest relevant items into D1.
 *
 * Returns how many rows were inserted plus a `detail` string that always says
 * WHY on a zero-import run (missing key, HTTP error, network failure, or no
 * relevant results) — the job log then shows the real cause instead of a
 * mystery zero. All inserts go through a single `D1 batch()`, which counts as
 * one query against the 50-per-invocation budget.
 */
export type FetchNewsResult = { imported: number; detail: string };

export async function fetchNews(): Promise<FetchNewsResult> {
  const key = bindings().NEWSDATA_API_KEY;
  if (!key) {
    return { imported: 0, detail: "NEWSDATA_API_KEY is not configured on this Worker" };
  }

  const query = QUERY_TERMS.map((word) => `"${word}"`).join(" OR ");
  const params = new URLSearchParams({
    apikey: key,
    q: query,
    language: "en",
    size: "10",
    removeduplicate: "1",
    country: "ng",
  });

  let items: NewsApiItem[] = [];
  try {
    const response = await fetch(`https://newsdata.io/api/1/latest?${params}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      const text = await response.text();
      return {
        imported: 0,
        detail: `NewsData responded ${response.status}: ${text.slice(0, 160)}`,
      };
    }
    const data = (await response.json()) as { results?: NewsApiItem[] };
    items = data.results ?? [];
  } catch (error) {
    return {
      imported: 0,
      detail: `NewsData request failed: ${error instanceof Error ? error.message : "network error"}`,
    };
  }

  if (!items.length) {
    return { imported: 0, detail: "NewsData returned no results for the keyword query" };
  }

  const relevant = items.filter((item) => {
    if (!item.title || !item.link) return false;
    const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
    return NEWS_KEYWORDS.some((word) => haystack.includes(word));
  });

  if (!relevant.length) {
    return {
      imported: 0,
      detail: `none of ${items.length} result(s) matched the service keywords`,
    };
  }

  const statements = relevant.map((item) =>
    db()
      .insert(schema.newsArticles)
      .values({
        title: item.title!.slice(0, 300),
        description: (item.description ?? "").slice(0, 1000),
        link: item.link!.slice(0, 500),
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        sourceId: item.source_id ?? "NewsData.io",
        imageUrl: item.image_url ?? null,
        apiSource: "newsdata",
        articleId: item.article_id ?? item.link!,
      })
      .onConflictDoNothing(),
  );

  // Drizzle's D1 driver batch — takes query builders directly (the old raw
  // D1PreparedStatement cast fed it malformed objects).
  await db().batch(statements);
  return {
    imported: statements.length,
    detail: `matched ${relevant.length} of ${items.length} result(s)`,
  };
}

/** Deletes API-fetched news older than 30 days. Manual entries are kept. */
export async function cleanupNews(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const stale = await db()
    .select({ id: schema.newsArticles.id })
    .from(schema.newsArticles)
    .where(
      and(
        eq(schema.newsArticles.apiSource, "newsdata"),
        lt(schema.newsArticles.createdAt, cutoff),
      ),
    )
    .limit(200);

  if (!stale.length) return 0;
  await db()
    .delete(schema.newsArticles)
    .where(inArray(schema.newsArticles.id, stale.map((row) => row.id)));
  return stale.length;
}
