import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  cleanupNewsAction,
  createNewsAction,
  deleteNewsAction,
  fetchNewsAction,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const field =
  "rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent";

const ERRORS: Record<string, string> = {
  missing: "A news item needs both a title and a link.",
  link: "That link is not a valid URL.",
  date: "That publish date could not be understood.",
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; fetched?: string; removed?: string }>;
}) {
  const { error, fetched, removed } = await searchParams;

  const items = await db()
    .select()
    .from(schema.newsArticles)
    .orderBy(desc(schema.newsArticles.pubDate))
    .limit(60);

  const fetchedCount = fetched ? Number(fetched) : null;
  const removedCount = removed ? Number(removed) : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Newsroom</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            News ({items.length})
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Fetched items are pruned after 30 days; hand-added items stay until deleted.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={fetchNewsAction}>
            <button type="submit" className="btn-primary px-4 py-2 text-sm">
              Fetch from NewsData.io
            </button>
          </form>
          <form action={cleanupNewsAction}>
            <button type="submit" className="btn-ghost px-4 py-2 text-sm">
              Remove items older than 30 days
            </button>
          </form>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          {ERRORS[error] ?? "That news item could not be saved."}
        </p>
      ) : null}

      {fetchedCount !== null ? (
        <p className="rounded-lg bg-trust-soft px-3 py-2 text-sm text-trust">
          {fetchedCount > 0
            ? `Imported ${fetchedCount} article(s).`
            : "Nothing imported — check NEWSDATA_API_KEY or try again later."}
        </p>
      ) : null}

      {removedCount !== null ? (
        <p className="rounded-lg bg-trust-soft px-3 py-2 text-sm text-trust">
          Removed {removedCount} old article(s).
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <section className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="card p-6 text-sm text-ink-muted">
              No news yet. Fetch from the API above, or add an item by hand.
            </p>
          ) : (
            items.map((item) => (
              <article key={item.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-semibold">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent"
                      >
                        {item.title}
                      </a>
                    </h2>
                    <p className="mt-1 text-xs text-ink-muted">
                      {item.sourceId || "Unknown source"} ·{" "}
                      {new Date(item.pubDate).toLocaleDateString("en-NG")} ·{" "}
                      {item.apiSource === "manual" ? "manual" : "fetched"}
                    </p>
                  </div>
                  <form action={deleteNewsAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-xs text-ink-muted hover:text-accent"
                    >
                      Delete
                    </button>
                  </form>
                </div>
                {item.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{item.description}</p>
                ) : null}
              </article>
            ))
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Add an item</h2>
          <form action={createNewsAction} className="mt-4 flex flex-col gap-3 text-sm">
            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Title</span>
              <input name="title" required maxLength={300} className={field} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Link</span>
              <input name="link" type="url" required placeholder="https://" className={field} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Summary</span>
              <textarea name="description" rows={3} maxLength={1000} className={field} />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-medium">Source</span>
                <input name="source_id" placeholder="Punch, Reuters…" className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-medium">Publish date</span>
                <input name="pub_date" type="date" className={field} />
              </label>
            </div>

            <button type="submit" className="btn-primary self-start">
              Add news
            </button>
          </form>

          <p className="mt-4 text-xs text-ink-muted">
            The public home page shows the latest few items, so this list feeds{" "}
            <Link href="/" className="text-accent">
              the site
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
