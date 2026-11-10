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
 * Returns the number of rows sent to D1, or 0 when the API key is unset, the
 * request fails, or nothing relevant came back. All inserts go through a single
 * `D1 batch()`, which counts as one query against the 50-per-invocation budget.
 */
export async function fetchNews(): Promise<number> {
  const key = bindings().NEWSDATA_API_KEY;
  if (!key) return 0;

  const query = NEWS_KEYWORDS.map((word) => `"${word}"`).join(" OR ");
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
    if (response.ok) {
      const data = (await response.json()) as { results?: NewsApiItem[] };
      items = data.results ?? [];
    }
  } catch {
    return 0;
  }

  const relevant = items.filter((item) => {
    if (!item.title || !item.link) return false;
    const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
    return NEWS_KEYWORDS.some((word) => haystack.includes(word));
  });

  if (!relevant.length) return 0;

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

  await bindings().DB.batch(statements as unknown as D1PreparedStatement[]);
  return statements.length;
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
