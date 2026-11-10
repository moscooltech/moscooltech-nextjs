import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PostForm } from "@/components/admin/post-form";
import { deletePostAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const rows = await db()
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.id, postId))
    .limit(1);
  const post = rows[0];
  if (!post) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/posts" className="text-sm text-ink-muted hover:text-accent">
            ← Posts
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold">{post.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {post.published ? "Published" : "Draft"} · updated{" "}
            {new Date(post.updatedAt).toLocaleString("en-NG")}
          </p>
        </div>
        <form action={deletePostAction}>
          <input type="hidden" name="id" value={post.id} />
          <button type="submit" className="text-sm text-ink-muted hover:text-accent">
            Delete post
          </button>
        </form>
      </header>

      {error === "empty" ? (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          A post needs both a title and body content.
        </p>
      ) : null}

      <div className="card p-6">
        <PostForm post={post} />
      </div>
    </div>
  );
}
