import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { aiConfigured, generateDraft, modelName, providerName } from "./ai";
import { uniqueSlug } from "./slug";

export type GenerateResult = { ok: true; postId: number } | { ok: false; error: string };

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
 * Turns one `content_topics` row into an unpublished draft post.
 *
 * Drafts are never published automatically: a human reviews the copy first.
 * Both the admin button and the `generate_ai` job call this.
 */
export async function generateTopicById(topicId: number): Promise<GenerateResult> {
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
        metaDescription: draft.metaDescription || draft.content.slice(0, 155),
        category: topic.category,
        postType: topic.category === "portfolio" ? "portfolio" : "article",
        published: false,
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

    return { ok: true, postId: postId ?? 0 };
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
