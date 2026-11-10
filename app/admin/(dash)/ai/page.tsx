import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  createTopicAction,
  deleteTopicAction,
  generateTopicAction,
  requeueTopicAction,
} from "@/app/admin/actions";
import { aiConfigured, modelName, providerName } from "@/lib/ai";

export const dynamic = "force-dynamic";

const field =
  "rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent";

const STATUS_STYLE: Record<string, string> = {
  queued: "bg-accent-soft text-accent-ink",
  generated: "bg-trust-soft text-trust",
  error: "bg-accent-soft text-accent-ink",
};

export default async function AiStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; generated?: string }>;
}) {
  const { error, generated } = await searchParams;

  const [topics, generations] = await Promise.all([
    db().select().from(schema.contentTopics).orderBy(desc(schema.contentTopics.createdAt)).limit(50),
    db().select().from(schema.aiGenerations).orderBy(desc(schema.aiGenerations.createdAt)).limit(15),
  ]);

  const configured = aiConfigured();
  const queued = topics.filter((topic) => topic.status === "queued").length;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">AI studio</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Content pipeline</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {queued} queued · drafts land in{" "}
          <Link href="/admin/posts" className="text-accent">
            Posts
          </Link>{" "}
          unpublished, for review before they go live.
        </p>
      </header>

      {!configured ? (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          AI_API_KEY is not set on this Worker, so generation will fail. Add it with{" "}
          <code className="font-mono text-xs">wrangler secret put AI_API_KEY</code>, plus{" "}
          <code className="font-mono text-xs">AI_MODEL</code> /{" "}
          <code className="font-mono text-xs">AI_BASE_URL</code> if you are not using OpenAI.
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          Provider <span className="font-medium text-ink">{providerName()}</span> · model{" "}
          <span className="font-medium text-ink">{modelName()}</span>
        </p>
      )}

      {error ? (
        <p role="alert" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          Generation failed: {error}
        </p>
      ) : null}

      {generated ? (
        <p className="rounded-lg bg-trust-soft px-3 py-2 text-sm text-trust">
          Draft created. Open it in Posts to review before publishing.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Topics ({topics.length})</h2>

          {topics.length === 0 ? (
            <p className="card p-6 text-sm text-ink-muted">
              No topics yet. Add one and the generator will write the first draft.
            </p>
          ) : (
            topics.map((topic) => (
              <article key={topic.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold">{topic.topic}</h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      {topic.keyword ? `${topic.keyword} · ` : ""}
                      {topic.category} · {topic.tone} · {topic.targetWords} words ·{" "}
                      {topic.faqCount} FAQs
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[topic.status] ?? "bg-accent-soft text-accent-ink"
                    }`}
                  >
                    {topic.status}
                  </span>
                </div>

                {topic.error ? (
                  <p className="mt-2 text-xs text-accent-ink">{topic.error}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <form action={generateTopicAction}>
                    <input type="hidden" name="id" value={topic.id} />
                    <button
                      type="submit"
                      disabled={!configured}
                      className="rounded-full border border-line px-3 py-1 font-medium hover:border-ink-muted disabled:opacity-50"
                    >
                      {topic.status === "generated" ? "Regenerate" : "Generate draft"}
                    </button>
                  </form>

                  {topic.status === "error" ? (
                    <form action={requeueTopicAction}>
                      <input type="hidden" name="id" value={topic.id} />
                      <button type="submit" className="text-xs text-ink-muted hover:text-accent">
                        Requeue
                      </button>
                    </form>
                  ) : null}

                  {topic.postId ? (
                    <Link href={`/admin/posts/${topic.postId}`} className="text-xs text-accent">
                      Open draft
                    </Link>
                  ) : null}

                  <form action={deleteTopicAction} className="ml-auto">
                    <input type="hidden" name="id" value={topic.id} />
                    <button type="submit" className="text-xs text-ink-muted hover:text-accent">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold">New topic</h2>
            <form action={createTopicAction} className="mt-4 flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1.5">
                <span className="font-medium">Topic</span>
                <input
                  name="topic"
                  required
                  maxLength={200}
                  placeholder="How to size an inverter for a Nigerian home"
                  className={field}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-medium">Primary keyword</span>
                <input name="keyword" maxLength={120} placeholder="inverter sizing" className={field} />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium">Category</span>
                  <select name="category" className={field}>
                    <option value="guides">Guide</option>
                    <option value="portfolio">Case study</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium">Tone</span>
                  <select name="tone" className={field}>
                    <option value="practical">Practical</option>
                    <option value="formal">Formal</option>
                    <option value="friendly">Friendly</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium">Target words</span>
                  <input name="target_words" type="number" defaultValue={1200} min={300} max={3000} className={field} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium">FAQs</span>
                  <input name="faq_count" type="number" defaultValue={4} min={0} max={8} className={field} />
                </label>
              </div>

              <button type="submit" className="btn-primary self-start">
                Add to queue
              </button>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold">Recent runs</h2>
            {generations.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No generations yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-line text-sm">
                {generations.map((run) => (
                  <li key={run.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate">{run.topic}</span>
                      <span
                        className={`shrink-0 text-xs font-medium ${
                          run.status === "success" ? "text-trust" : "text-accent-ink"
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <span className="text-xs text-ink-muted">
                      {run.model || "unknown model"}
                      {run.durationMs ? ` · ${(run.durationMs / 1000).toFixed(1)}s` : ""} ·{" "}
                      {new Date(run.createdAt).toLocaleString("en-NG")}
                    </span>
                    {run.error ? (
                      <span className="mt-1 block text-xs text-accent-ink">{run.error}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
