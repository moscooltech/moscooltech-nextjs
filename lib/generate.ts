import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { aiConfigured, generateDraft, modelName, providerName } from "./ai";
import { markTopicUsed, pickNextTopic, queuedTopicCount, refillTopicPool } from "./topic-pool";
import { attachImageToPost } from "./images";
import { uniqueSlug } from "./slug";

export type GenerateResult = {
  ok: true;
  postId: number;
  /** Outcome of the soft image step — a missing image never fails the post. */
  image?: { ok: boolean; reason?: string };
} | { ok: false; error: string };

export type GenerateOptions = {
  /**
   * Publish immediately instead of leaving a reviewable draft. Only the daily
   * auto-poster sets this; the admin AI studio always keeps drafts for a human.
   */
  publish?: boolean;
};

async function markError(topicId: number, message: string): Promise<void> {
  try {
    await db()
      .update(schema.contentTopics)
      .set({ status: "error", error: message.slice(0, 500) })
      .where(eq(schema.contentTopics.id, topicId));
  } catch {
    /* reporting the original error matters more than this update */
  }
}

/**
 * Meta-description fallback when the model omits `meta_description`: the first
 * readable prose line of the body, markup stripped, cut at a word boundary.
 * A raw `content.slice(0, 155)` once put "## Introduction to…" into the tag.
 */
function metaFromContent(content: string): string {
  const text = content
    .split("\n")
    .filter((line) => !/^\s*(#+|-|\*\*)/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const base = text || content.replace(/\s+/g, " ").trim();
  return base.length <= 155 ? base : `${base.slice(0, 152).trimEnd()}…`;
}

/**
 * Turns one `content_topics` row into a post.
 *
 * Default behaviour is unchanged: an unpublished draft a human reviews first.
 * `publish: true` (daily auto-poster only) makes the post live immediately.
 * Both the admin button and the `generate_ai` job call this.
 */
export async function generateTopicById(
  topicId: number,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const rows = await db()
    .select()
    .from(schema.contentTopics)
    .where(eq(schema.contentTopics.id, topicId))
    .limit(1);
  const topic = rows[0];
  if (!topic) return { ok: false, error: "Topic not found." };

  if (!aiConfigured()) {
    const message = "AI_API_KEY is not configured on this Worker.";
    await markError(topicId, message);
    return { ok: false, error: message };
  }

  const startedAt = Date.now();
  try {
    const draft = await generateDraft({
      topic: topic.topic,
      keyword: topic.keyword,
      category: topic.category,
      tone: topic.tone,
      targetWords: topic.targetWords,
      faqCount: topic.faqCount,
    });

    const now = new Date().toISOString();
    const inserted = await db()
      .insert(schema.posts)
      .values({
        title: draft.title,
        slug: await uniqueSlug(draft.title),
        content: draft.content,
        metaDescription: draft.metaDescription || metaFromContent(draft.content),
        category: topic.category,
        postType: topic.category === "portfolio" ? "portfolio" : "article",
        published: options.publish ?? false,
        updatedAt: now,
      })
      .returning({ id: schema.posts.id });

    const postId = inserted[0]?.id ?? null;

    if (postId && draft.faqs.length) {
      await db()
        .insert(schema.postFaqs)
        .values(
          draft.faqs.map((faq, index) => ({
            postId,
            question: faq.question,
            answer: faq.answer,
            position: index,
          })),
        );
    }

    // Image step is soft: an AI-image or Cloudinary failure leaves the post
    // imageless (the guide layout handles that) rather than failing the run.
    let image: { ok: boolean; reason?: string } = { ok: false, reason: "not attempted" };
    if (postId) {
      image = await attachImageToPost(postId, {
        topic: topic.topic,
        keyword: topic.keyword,
        category: topic.category,
      });
    }

    await db()
      .update(schema.contentTopics)
      .set({ status: "generated", postId, generatedAt: now, error: null })
      .where(eq(schema.contentTopics.id, topicId));

    await db().insert(schema.aiGenerations).values({
      topic: topic.topic,
      provider: providerName(),
      model: modelName(),
      status: "success",
      postId,
      durationMs: Date.now() - startedAt,
    });

    return { ok: true, postId: postId ?? 0, image };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    await markError(topicId, message);
    try {
      await db().insert(schema.aiGenerations).values({
        topic: topic.topic,
        provider: providerName(),
        model: modelName(),
        status: "error",
        error: message.slice(0, 500),
        durationMs: Date.now() - startedAt,
      });
    } catch {
      /* nothing useful to do */
    }
    return { ok: false, error: message };
  }
}

export type DailyPostResult =
  | {
      ok: true;
      postId: number;
      topic: string;
      image: { ok: boolean; reason?: string };
      /** Set when the run had to plan a fresh batch to keep going. */
      refilled?: number;
    }
  | { ok: false; error: string };

/**
 * The daily auto-poster: picks the next unused pool topic, queues it and
 * generates a PUBLISHED post (with image attempt) in one call.
 *
 * The pool is the `topic_pool` table: one row per day is marked used, and
 * when the queue runs dry the planner refills it automatically with an
 * AI-planned batch (see lib/topic-pool.ts). As a safety net the queue is also
 * topped up whenever it drops to five or fewer topics, so a refill day never
 * doubles the work of the post day.
 *
 * A topic whose generation fails stays marked used — the next day's run moves
 * on instead of retrying a poisoned topic forever; the row keeps the error for
 * manual retry from the admin AI studio.
 */
export async function generateDailyPost(): Promise<DailyPostResult> {
  if (!aiConfigured()) {
    return { ok: false, error: "AI is not configured on this Worker." };
  }

  let seed = await pickNextTopic();
  let refilled: number | undefined;
  if (!seed) {
    refilled = await refillTopicPool(30);
    seed = refilled ? await pickNextTopic() : null;
    if (!seed) {
      return {
        ok: false,
        error: "Topic pool is empty and the planner produced no new topics.",
      };
    }
  }

  const inserted = await db()
    .insert(schema.contentTopics)
    .values({
      topic: seed.topic,
      keyword: seed.keyword,
      category: seed.category,
      tone: seed.tone,
      targetWords: seed.targetWords,
      faqCount: seed.faqCount,
      status: "queued",
    })
    .returning({ id: schema.contentTopics.id });

  const topicId = inserted[0]!.id;
  await markTopicUsed(seed.id);

  const result = await generateTopicById(topicId, { publish: true });
  if (!result.ok) return { ok: false, error: result.error };

  // Low-water top-up: keep at least a week of topics queued. Failures here
  // must not fail today's published post — the next run refills when empty.
  let toppedUp = 0;
  try {
    const remaining = await queuedTopicCount();
    if (remaining <= 5) toppedUp = await refillTopicPool(30);
    if (toppedUp) refilled = (refilled ?? 0) + toppedUp;
  } catch {
    /* the pool refills on its next empty run regardless */
  }

  return {
    ok: true,
    postId: result.postId,
    topic: seed.topic,
    image: result.image ?? { ok: false, reason: "not attempted" },
    ...(refilled ? { refilled } : {}),
  };
}
