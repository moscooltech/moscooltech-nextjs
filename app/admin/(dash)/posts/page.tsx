import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { deletePostAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  portfolio: "Portfolio",
  article: "Guide",
  sale: "Marketplace",
};

export default async function PostsPage() {
  const posts = await db()
    .select()
    .from(schema.posts)
    .orderBy(desc(schema.posts.createdAt))
    .limit(200);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Content</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Posts ({posts.length})</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Guides, portfolio case studies and marketplace items all live here.
          </p>
        </div>
        <Link href="/admin/posts/new" className="btn-primary px-4 py-2 text-sm">
          New post
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="card p-6 text-sm text-ink-muted">
          Nothing written yet. Start with a new post, or seed the database with{" "}
          <code className="font-mono text-xs">db/seed.sql</code>.
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="max-w-[22rem] px-4 py-3">
                    <Link href={`/admin/posts/${post.id}`} className="font-medium hover:text-accent">
                      {post.title}
                    </Link>
                    <span className="mt-0.5 block truncate font-mono text-xs text-ink-muted">
                      /{post.postType === "article" ? "guides" : "work"}/{post.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {TYPE_LABEL[post.postType] ?? post.postType}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{post.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        post.published ? "bg-trust-soft text-trust" : "bg-accent-soft text-accent-ink"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(post.updatedAt).toLocaleDateString("en-NG")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/posts/${post.id}`} className="font-medium text-accent">
                        Edit
                      </Link>
                      <form action={deletePostAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <button type="submit" className="text-xs text-ink-muted hover:text-accent">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
