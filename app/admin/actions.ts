"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, destroySession, isAuthenticated, passwordMatches } from "@/lib/auth";
import { consume } from "@/lib/rate-limit";

const LOGIN_WINDOW = 900;
const LOGIN_LIMIT = 5;

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 240) || "article"
  );
}

async function uniqueSlug(title: string, ignoreId?: number): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const existing = await db()
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.slug, candidate))
      .limit(1);
    if (!existing.length || existing[0].id === ignoreId) return candidate;
    candidate = `${base.slice(0, 230)}-${i}`;
  }
  return `${base.slice(0, 230)}-${Date.now()}`;
}

async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") || "");
  const ip =
    (await headers()).get("cf-connecting-ip") ||
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const limit = await consume(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW);
  if (!limit.allowed) {
    redirect("/admin/login?error=rate");
  }

  if (!password || !passwordMatches(password)) {
    redirect("/admin/login?error=invalid");
  }

  await createSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

/* ----------------------------------------------------------------- leads */

export async function updateLeadAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const contactId = Number(formData.get("contact_id"));
  const status = String(formData.get("status") || "new");
  const rawValue = String(formData.get("estimated_value") || "").trim();
  const allowed = ["new", "contacted", "quoted", "won", "lost"];
  if (!Number.isInteger(contactId) || !allowed.includes(status)) {
    redirect("/admin/leads");
  }

  const value = rawValue ? Number(rawValue) : null;
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    redirect(`/admin/leads/${contactId}?error=value`);
  }

  await db()
    .insert(schema.leadStatuses)
    .values({ contactId, status, estimatedValue: value })
    .onConflictDoUpdate({
      target: schema.leadStatuses.contactId,
      set: { status, estimatedValue: value, updatedAt: new Date().toISOString() },
    });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${contactId}`);
  redirect(`/admin/leads/${contactId}`);
}

export async function addLeadNoteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const contactId = Number(formData.get("contact_id"));
  const body = String(formData.get("body") || "").trim().slice(0, 2000);
  if (!Number.isInteger(contactId) || !body) {
    redirect(`/admin/leads/${contactId || ""}`);
  }

  await db().insert(schema.leadNotes).values({ contactId, body });
  revalidatePath(`/admin/leads/${contactId}`);
  redirect(`/admin/leads/${contactId}`);
}

/* ----------------------------------------------------------------- posts */

export async function savePostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id") || 0);
  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const content = String(formData.get("content") || "").trim().slice(0, 20000);
  if (!title || !content) redirect(id ? `/admin/posts/${id}` : "/admin/posts/new?error=empty");

  const postType = String(formData.get("post_type") || "portfolio");
  const payload = {
    title,
    content,
    metaDescription: String(formData.get("meta_description") || "").trim().slice(0, 160),
    imageUrl: String(formData.get("image_url") || "").trim().slice(0, 500) || null,
    imageAlt: String(formData.get("image_alt") || "").trim().slice(0, 200) || title,
    category: String(formData.get("category") || "general").trim().slice(0, 100),
    postType,
    published: formData.get("published") === "on",
    updatedAt: new Date().toISOString(),
  };
  const priceRaw = String(formData.get("price") || "").trim();

  if (id) {
    await db()
      .update(schema.posts)
      .set({ ...payload, price: priceRaw ? Number(priceRaw) : null })
      .where(eq(schema.posts.id, id));
  } else {
    await db()
      .insert(schema.posts)
      .values({
        ...payload,
        slug: await uniqueSlug(title),
        price: priceRaw ? Number(priceRaw) : null,
        currency: "NGN",
        negotiable: formData.get("negotiable") === "on",
        itemLink: String(formData.get("item_link") || "").trim().slice(0, 500) || null,
      });
  }

  // Content is cached for 5 minutes; drop the cache so edits show immediately.
  revalidatePath("/");
  revalidatePath("/guides");
  revalidatePath("/marketplace");
  revalidatePath(`/guides/${slugify(title)}`);
  redirect("/admin/posts");
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/posts");

  // FAQs cascade in SQLite, but D1 does not always enforce it on legacy tables.
  await db().delete(schema.postFaqs).where(eq(schema.postFaqs.postId, id));
  await db().delete(schema.posts).where(eq(schema.posts.id, id));

  revalidatePath("/");
  revalidatePath("/guides");
  revalidatePath("/marketplace");
  redirect("/admin/posts");
}

/* ------------------------------------------------------------------ news */

export async function deleteNewsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await db().delete(schema.newsArticles).where(eq(schema.newsArticles.id, id));
  }
  revalidatePath("/admin/news");
  revalidatePath("/");
  redirect("/admin/news");
}

const NEWS_KEYWORDS = [
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

/** Shared by the admin button and the cron trigger. */
export async function fetchNews(): Promise<number> {
  const key = (await import("@/db")).bindings().NEWSDATA_API_KEY;
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
      items = data.results || [];
    }
  } catch {
    return 0;
  }

  const relevant = items.filter((item) => {
    if (!item.title || !item.link) return false;
    const haystack = `${item.title} ${item.description || ""}`.toLowerCase();
    return NEWS_KEYWORDS.some((word) => haystack.includes(word));
  });

  // One batch = one D1 query, keeping well inside the 50-query budget.
  const statements = relevant.map((item) =>
    db()
      .insert(schema.newsArticles)
      .values({
        title: item.title!.slice(0, 300),
        description: (item.description || "").slice(0, 1000),
        link: item.link!.slice(0, 500),
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        sourceId: item.source_id || "NewsData.io",
        imageUrl: item.image_url || null,
        apiSource: "newsdata",
        articleId: item.article_id || item.link!,
      })
      .onConflictDoNothing(),
  );

  if (!statements.length) return 0;

  const d1 = (await import("@/db")).bindings().DB;
  await d1.batch(statements as unknown as D1PreparedStatement[]);
  return statements.length;
}

export async function fetchNewsAction(): Promise<void> {
  await requireAdmin();
  await fetchNews();
  revalidatePath("/admin/news");
  revalidatePath("/");
  redirect("/admin/news");
}

/** Deletes fetched news older than 30 days. */
export async function cleanupNews(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const stale = await db()
    .select({ id: schema.newsArticles.id })
    .from(schema.newsArticles)
    .where(and(eq(schema.newsArticles.apiSource, "newsdata"), lt(schema.newsArticles.createdAt, cutoff)))
    .limit(200);

  if (!stale.length) return 0;
  await db()
    .delete(schema.newsArticles)
    .where(inArray(schema.newsArticles.id, stale.map((row) => row.id)));
  return stale.length;
}

export async function cleanupNewsAction(): Promise<void> {
  await requireAdmin();
  await cleanupNews();
  revalidatePath("/admin/news");
  revalidatePath("/");
  redirect("/admin/news");
}

export async function latestNewsCount(): Promise<number> {
  const rows = await db().select({ id: schema.newsArticles.id }).from(schema.newsArticles).limit(1);
  return rows.length;
}

export async function recentGenerations() {
  return db().select().from(schema.aiGenerations).orderBy(desc(schema.aiGenerations.createdAt)).limit(10);
}
