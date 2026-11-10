"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gte, not, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession, destroySession, isAuthenticated, passwordMatches } from "@/lib/auth";
import { consume } from "@/lib/rate-limit";
import { uniqueSlug } from "@/lib/slug";
import { cleanupNews, fetchNews } from "@/lib/news";
import { generateTopicById } from "@/lib/generate";

const LOGIN_WINDOW = 900;
const LOGIN_LIMIT = 5;

async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

function revalidatePublicContent(): void {
  revalidatePath("/");
  revalidatePath("/guides");
  revalidatePath("/marketplace");
}

/* ------------------------------------------------------------------ auth */

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") || "");
  const headerBag = await headers();
  const ip =
    headerBag.get("cf-connecting-ip") ||
    headerBag.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const limit = await consume(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW);
  if (!limit.allowed) redirect("/admin/login?error=rate");
  if (!password || !passwordMatches(password)) redirect("/admin/login?error=invalid");

  await createSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

/* ----------------------------------------------------------------- leads */

const LEAD_STATUSES = ["new", "contacted", "quoted", "won", "lost"];

export async function updateLeadAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const contactId = Number(formData.get("contact_id"));
  const status = String(formData.get("status") || "new");
  const rawValue = String(formData.get("estimated_value") || "").trim();

  if (!Number.isInteger(contactId) || !LEAD_STATUSES.includes(status)) {
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

  revalidatePath("/admin");
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
  const content = String(formData.get("content") || "").trim().slice(0, 40000);

  if (!title || !content) {
    redirect(id ? `/admin/posts/${id}?error=empty` : "/admin/posts/new?error=empty");
  }

  const priceRaw = String(formData.get("price") || "").trim();
  const payload = {
    title,
    content,
    metaDescription: String(formData.get("meta_description") || "").trim().slice(0, 160) || null,
    imageUrl: String(formData.get("image_url") || "").trim().slice(0, 500) || null,
    imageAlt: String(formData.get("image_alt") || "").trim().slice(0, 200) || title,
    videoUrl: String(formData.get("video_url") || "").trim().slice(0, 500) || null,
    category: String(formData.get("category") || "general").trim().slice(0, 100),
    postType: String(formData.get("post_type") || "portfolio"),
    negotiable: formData.get("negotiable") === "on",
    itemLink: String(formData.get("item_link") || "").trim().slice(0, 500) || null,
    price: priceRaw ? Number(priceRaw) : null,
    published: formData.get("published") === "on",
    updatedAt: new Date().toISOString(),
  };

  if (id) {
    await db().update(schema.posts).set(payload).where(eq(schema.posts.id, id));
  } else {
    await db()
      .insert(schema.posts)
      .values({ ...payload, slug: await uniqueSlug(title) });
  }

  // Public pages are ISR-cached for 5 minutes; drop them so the edit is visible now.
  revalidatePublicContent();
  revalidatePath("/admin/posts");
  if (id) revalidatePath(`/admin/posts/${id}`);
  redirect("/admin/posts");
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/posts");

  // SQLite cascades, but D1 does not reliably enforce FKs on existing tables.
  await db().delete(schema.postFaqs).where(eq(schema.postFaqs.postId, id));
  await db().delete(schema.posts).where(eq(schema.posts.id, id));

  revalidatePublicContent();
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

/* ------------------------------------------------------------------ news */

export async function createNewsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = String(formData.get("title") || "").trim().slice(0, 300);
  const link = String(formData.get("link") || "").trim().slice(0, 500);
  const description = String(formData.get("description") || "").trim().slice(0, 1000);
  const sourceId = String(formData.get("source_id") || "").trim().slice(0, 100);

  if (!title || !link) redirect("/admin/news?error=missing");

  let link_is_valid = true;
  try {
    new URL(link);
  } catch {
    link_is_valid = false;
  }
  if (!link_is_valid) redirect("/admin/news?error=link");

  const pubRaw = String(formData.get("pub_date") || "").trim();
  const pubDate = pubRaw ? new Date(pubRaw) : new Date();
  if (Number.isNaN(pubDate.getTime())) redirect("/admin/news?error=date");

  await db()
    .insert(schema.newsArticles)
    .values({
      title,
      description: description || null,
      link,
      pubDate: pubDate.toISOString(),
      sourceId: sourceId || "Manual",
      apiSource: "manual",
      // The unique index is on article_id, so the link doubles as the identity
      // of a hand-added item and re-submitting the same link is a no-op.
      articleId: link,
    })
    .onConflictDoNothing();

  revalidatePath("/admin/news");
  revalidatePath("/");
  redirect("/admin/news");
}

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

export async function fetchNewsAction(): Promise<void> {
  await requireAdmin();
  const count = await fetchNews();
  revalidatePath("/admin/news");
  revalidatePath("/");
  redirect(`/admin/news?fetched=${count}`);
}

export async function cleanupNewsAction(): Promise<void> {
  await requireAdmin();
  const removed = await cleanupNews();
  revalidatePath("/admin/news");
  revalidatePath("/");
  redirect(`/admin/news?removed=${removed}`);
}

/* -------------------------------------------------------------- ai studio */

export async function createTopicAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const topic = String(formData.get("topic") || "").trim().slice(0, 200);
  const keyword = String(formData.get("keyword") || "").trim().slice(0, 120);
  const category = String(formData.get("category") || "guides");
  const tone = String(formData.get("tone") || "practical").slice(0, 40);
  const targetWords = Number(formData.get("target_words") || 1200);
  const faqCount = Number(formData.get("faq_count") || 4);

  if (!topic) redirect("/admin/ai?error=topic");

  await db()
    .insert(schema.contentTopics)
    .values({
      topic,
      keyword: keyword || null,
      category: category === "portfolio" ? "portfolio" : "guides",
      tone,
      targetWords: Number.isFinite(targetWords) ? Math.min(Math.max(targetWords, 300), 3000) : 1200,
      faqCount: Number.isFinite(faqCount) ? Math.min(Math.max(faqCount, 0), 8) : 4,
      status: "queued",
    });

  revalidatePath("/admin/ai");
  redirect("/admin/ai");
}

export async function generateTopicAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/admin/ai");

  const result = await generateTopicById(id);
  revalidatePath("/admin/ai");
  revalidatePath("/admin/posts");

  if (!result.ok) {
    redirect(`/admin/ai?error=${encodeURIComponent(result.error.slice(0, 160))}`);
  }
  redirect("/admin/ai?generated=1");
}

export async function deleteTopicAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await db().delete(schema.contentTopics).where(eq(schema.contentTopics.id, id));
  }
  revalidatePath("/admin/ai");
  redirect("/admin/ai");
}

/** Clears a stale "error" status so the topic can be retried. */
export async function requeueTopicAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await db()
      .update(schema.contentTopics)
      .set({ status: "queued", error: null })
      .where(eq(schema.contentTopics.id, id));
  }
  revalidatePath("/admin/ai");
  redirect("/admin/ai");
}

/* Kept for the dashboard's "did anything arrive" check. */
export async function staleTopicCount(): Promise<number> {
  const rows = await db()
    .select({ total: sql<number>`count(*)` })
    .from(schema.contentTopics)
    .where(and(not(eq(schema.contentTopics.status, "generated")), gte(schema.contentTopics.id, 0)));
  return Number(rows[0]?.total ?? 0);
}
