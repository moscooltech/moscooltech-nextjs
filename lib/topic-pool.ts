import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { bindings, db, schema } from "@/db";
import { modelName } from "./ai";

/**
 * The self-refilling topic pool (table `topic_pool`).
 *
 * The daily poster consumes one row per day. When the queue runs dry,
 * `refillTopicPool()` asks Workers AI to plan the next batch — under editorial
 * rules, validated with zod, and deduped against every topic already planned,
 * queued or published. The owner can prune AI-planned topics from the admin
 * AI studio before they are ever used, so automation stays reviewable.
 *
 * Editorial rules (content-strategy methodology):
 *  - searchable buyer-stage questions and comparisons ("how to", "why", "vs")
 *  - one natural keyword per topic
 *  - rotating mix across AC / refrigeration / solar-inverter / electrical
 *  - Nigerian phrasing and context (NEPA, harmattan, Naira)
 *  - never duplicate what is already on the site
 */

const PLAN_SYSTEM = `You are the content planner for Moscool Technical Services, an
air-conditioning, refrigeration, solar/inverter and electrical services company
serving Lagos Mainland and Ogun State, Nigeria.

Plan the next batch of blog topics. Every topic MUST be searchable: a question,
problem or comparison a Nigerian homeowner or small-business owner would really
type into Google — use modifiers like "how to", "why does", "vs", "without",
"after", "cost", "best". Prefer topics that teach something practical: fixing a
problem, understanding a cost, comparing options, maintaining equipment. Avoid
"best contractor/company" listicles, generic "why X is important" essays, and
anything that reads like a services advert. Balance the batch across the four
service lines (air conditioning, refrigeration, solar and inverters, electrical).
Use Nigerian phrasing and context (power supply, harmattan, Naira). No
clickbait, no invented statistics, no vague generic titles.

Already-covered subjects you must NOT repeat (list may be long — treat it as
banned vocabulary): banned topics.

Return ONE JSON object and nothing else:
{"topics":[{"topic": string 40-90 characters, "keyword": string}]}`;

const PlanSchema = z.object({
  topics: z
    .array(
      z.object({
        topic: z.string().trim().min(20).max(100),
        keyword: z.string().trim().min(3).max(80),
      }),
    )
    .min(1),
});

/** JSON Schema mirroring PlanSchema for Workers AI guided (JSON-mode) output. */
const PlanJsonSchema = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: { topic: { type: "string" }, keyword: { type: "string" } },
        required: ["topic", "keyword"],
      },
    },
  },
  required: ["topics"],
};

function normalize(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Everything the planner must not repeat: pool, queue and live posts. */
async function exclusionSet(): Promise<Set<string>> {
  const [poolRows, queueRows, postRows] = await Promise.all([
    db().select({ topic: schema.topicPool.topic }).from(schema.topicPool),
    db().select({ topic: schema.contentTopics.topic }).from(schema.contentTopics),
    db().select({ title: schema.posts.title }).from(schema.posts),
  ]);
  return new Set(
    [
      ...poolRows.map((r) => r.topic),
      ...queueRows.map((r) => r.topic),
      ...postRows.map((r) => r.title),
    ].map(normalize),
  );
}

/** Next unused topic, oldest first — keeps the curated batch order stable. */
export async function pickNextTopic() {
  const rows = await db()
    .select()
    .from(schema.topicPool)
    .where(eq(schema.topicPool.status, "queued"))
    .orderBy(asc(schema.topicPool.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function markTopicUsed(id: number): Promise<void> {
  await db().update(schema.topicPool).set({ status: "used" }).where(eq(schema.topicPool.id, id));
}

export function queuedTopicCount(): Promise<number> {
  return db()
    .select({ n: sql`count(*)` })
    .from(schema.topicPool)
    .where(eq(schema.topicPool.status, "queued"))
    .then((rows) => Number(rows[0]?.n ?? 0));
}

export async function poolStats(): Promise<{
  queued: number;
  used: number;
  curated: number;
  aiPlanned: number;
}> {
  const rows = await db()
    .select({
      queued: sql`sum(case when status = 'queued' then 1 else 0 end)`,
      used: sql`sum(case when status = 'used' then 1 else 0 end)`,
      curated: sql`sum(case when source = 'curated' then 1 else 0 end)`,
      aiPlanned: sql`sum(case when source = 'ai' then 1 else 0 end)`,
    })
    .from(schema.topicPool);
  const r = rows[0];
  return {
    queued: Number(r?.queued ?? 0),
    used: Number(r?.used ?? 0),
    curated: Number(r?.curated ?? 0),
    aiPlanned: Number(r?.aiPlanned ?? 0),
  };
}

export function listQueuedTopics(limit = 15) {
  return db()
    .select({ id: schema.topicPool.id, topic: schema.topicPool.topic, keyword: schema.topicPool.keyword, source: schema.topicPool.source })
    .from(schema.topicPool)
    .where(eq(schema.topicPool.status, "queued"))
    .orderBy(asc(schema.topicPool.id))
    .limit(limit);
}

/**
 * Plans `count` new topics with Workers AI, dedupes and stores them.
 * Returns how many were inserted (0 when the model only repeated known
 * subjects — the caller treats that as a failure).
 */
export async function refillTopicPool(count = 30): Promise<number> {
  const ai = bindings().AI;
  if (!ai) throw new Error("Workers AI binding unavailable — cannot refill the topic pool.");

  const banned = await exclusionSet();
  const bannedList = Array.from(banned).slice(0, 80).join(" | ");

  const result = (await ai.run(modelName(), {
    messages: [
      { role: "system", content: PLAN_SYSTEM.replace("banned topics.", bannedList || "(none yet)") },
      {
        role: "user",
        content: `Plan exactly ${count} new blog topics as the JSON object described.`,
      },
    ],
    response_format: { type: "json_schema", json_schema: PlanJsonSchema },
    temperature: 0.8,
    max_tokens: 4000,
  })) as { response?: unknown };

  const raw = typeof result.response === "string" ? result.response : JSON.stringify(result.response);
  const parsed = PlanSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Planner output failed validation: ${parsed.error.issues[0]?.message}`);
  }

  const seen = new Set(banned);
  const fresh = [];
  for (const item of parsed.data.topics) {
    const key = normalize(item.topic);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    fresh.push(item);
    if (fresh.length >= count) break;
  }
  if (!fresh.length) throw new Error("Planner produced no new topics (all repeats).");

  const statements = fresh.map((item) =>
    db()
      .insert(schema.topicPool)
      .values({
        topic: item.topic,
        keyword: item.keyword,
        category: "guides",
        status: "queued",
        source: "ai",
      })
      .onConflictDoNothing(),
  );
  // One batch — counts as a single query against the per-invocation budget.
  await db().batch(statements);
  return statements.length;
}
