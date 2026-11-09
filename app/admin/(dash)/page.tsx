import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

export default async function AdminOverview() {
  const [counts, statusRows, recent, posts, news] = await Promise.all([
    db()
      .select({
        contacts: sql<number>`(select count(*) from contact_submissions)`,
        feedback: sql<number>`(select count(*) from feedback_submissions)`,
        posts: sql<number>`(select count(*) from posts)`,
        news: sql<number>`(select count(*) from news_articles)`,
      })
      .from(schema.posts)
      .limit(1),
    db().select().from(schema.leadStatuses),
    db().select().from(schema.contactSubmissions).orderBy(desc(schema.contactSubmissions.createdAt)).limit(6),
    db().select().from(schema.posts).orderBy(desc(schema.posts.createdAt)).limit(5),
    db().select().from(schema.newsArticles).orderBy(desc(schema.newsArticles.pubDate)).limit(4),
  ]);

  const totals = counts[0] || { contacts: 0, feedback: 0, posts: 0, news: 0 };
  const byStage = Object.fromEntries(STAGES.map((stage) => [stage.key, 0])) as Record<string, number>;
  for (const row of statusRows) {
    if (row.status in byStage) byStage[row.status] += 1;
  }
  byStage.new += Math.max(0, Number(totals.contacts) - statusRows.length);

  const pipelineValue = statusRows
    .filter((row) => row.status === "contacted" || row.status === "quoted")
    .reduce((sum, row) => sum + (row.estimatedValue ?? 0), 0);

  // Keeps the compiler honest about unused imports while reading like intent.
  void eq;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="eyebrow">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Pipeline at a glance</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Leads", totals.contacts],
          ["Feedback", totals.feedback],
          ["Posts", totals.posts],
          ["News items", totals.news],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-5">
            <p className="text-sm text-ink-muted">{label}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{String(value)}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Pipeline</h2>
            <Link href="/admin/leads" className="text-sm font-medium text-accent">
              Open board →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {STAGES.map((stage) => (
              <div key={stage.key} className="rounded-lg border border-line bg-paper px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-ink-muted">{stage.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{byStage[stage.key]}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Open value in quoted/contacted:{" "}
            <span className="font-medium text-ink">
              ₦{pipelineValue.toLocaleString("en-NG")}
            </span>
          </p>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Latest leads</h2>
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {recent.length ? (
              recent.map((contact) => (
                <li key={contact.id} className="py-3">
                  <Link href={`/admin/leads/${contact.id}`} className="flex flex-col">
                    <span className="text-sm font-medium">{contact.name}</span>
                    <span className="text-xs text-ink-muted">
                      {contact.serviceNeeded || "General enquiry"} ·{" "}
                      {new Date(contact.createdAt).toLocaleDateString("en-NG")}
                    </span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="py-3 text-sm text-ink-muted">No leads yet.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Recent posts</h2>
          <ul className="mt-4 flex flex-col divide-y divide-line text-sm">
            {posts.length ? (
              posts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate">{post.title}</span>
                  <Link href={`/admin/posts/${post.id}`} className="shrink-0 text-accent">
                    Edit
                  </Link>
                </li>
              ))
            ) : (
              <li className="py-2.5 text-ink-muted">No posts yet.</li>
            )}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Latest news</h2>
          <ul className="mt-4 flex flex-col divide-y divide-line text-sm">
            {news.length ? (
              news.map((item) => (
                <li key={item.id} className="py-2.5">
                  <span className="block truncate">{item.title}</span>
                  <span className="text-xs text-ink-muted">{item.sourceId}</span>
                </li>
              ))
            ) : (
              <li className="py-2.5 text-ink-muted">Nothing fetched yet.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
