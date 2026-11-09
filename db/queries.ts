import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "./index";
import type { NewsArticle, Post, PostFaq } from "./schema";

/**
 * Public read helpers.
 *
 * Every function here is capped at a handful of statements because D1 Free
 * allows 50 queries per Worker invocation and a prerender can otherwise blow
 * the budget. Failures return empty data: a cold or un-migrated database must
 * render an honest empty page, never a 500.
 */
async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch {
    return fallback;
  }
}

export function listPosts(postType: string, limit = 24): Promise<Post[]> {
  return safe(
    () =>
      db()
        .select()
        .from(schema.posts)
        .where(and(eq(schema.posts.published, true), eq(schema.posts.postType, postType)))
        .orderBy(desc(schema.posts.createdAt))
        .limit(limit),
    [],
  );
}

export function listGuides(limit = 60): Promise<Post[]> {
  return listPosts("article", limit);
}

export function getPostBySlug(slug: string): Promise<Post | null> {
  return safe(async () => {
    const rows = await db()
      .select()
      .from(schema.posts)
      .where(and(eq(schema.posts.slug, slug), eq(schema.posts.published, true)))
      .limit(1);
    return rows[0] ?? null;
  }, null);
}

export function getPostById(id: number): Promise<Post | null> {
  return safe(async () => {
    const rows = await db()
      .select()
      .from(schema.posts)
      .where(and(eq(schema.posts.id, id), eq(schema.posts.published, true)))
      .limit(1);
    return rows[0] ?? null;
  }, null);
}

export function faqsForPost(postId: number): Promise<PostFaq[]> {
  return safe(
    () =>
      db()
        .select()
        .from(schema.postFaqs)
        .where(eq(schema.postFaqs.postId, postId))
        .orderBy(schema.postFaqs.position),
    [],
  );
}

export function relatedPosts(post: Post, limit = 3): Promise<Post[]> {
  return safe(
    () =>
      db()
        .select()
        .from(schema.posts)
        .where(
          and(
            eq(schema.posts.published, true),
            eq(schema.posts.postType, post.postType),
          ),
        )
        .orderBy(desc(schema.posts.createdAt))
        .limit(limit + 1)
        .then((rows) => rows.filter((row) => row.id !== post.id).slice(0, limit)),
    [],
  );
}

export function latestNews(limit = 6): Promise<NewsArticle[]> {
  return safe(
    () =>
      db()
        .select()
        .from(schema.newsArticles)
        .orderBy(desc(schema.newsArticles.pubDate))
        .limit(limit),
    [],
  );
}

/** All published posts, for the sitemap. */
export function allPublishedPosts(): Promise<Post[]> {
  return safe(
    () =>
      db()
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.published, true))
        .orderBy(desc(schema.posts.updatedAt)),
    [],
  );
}

export function postsByIds(ids: number[]): Promise<Post[]> {
  if (!ids.length) return Promise.resolve([]);
  return safe(
    () => db().select().from(schema.posts).where(inArray(schema.posts.id, ids)),
    [],
  );
}
