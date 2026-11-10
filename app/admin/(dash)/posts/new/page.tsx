import Link from "next/link";
import { PostForm } from "@/components/admin/post-form";

export const dynamic = "force-dynamic";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/admin/posts" className="text-sm text-ink-muted hover:text-accent">
          ← Posts
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold">New post</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Saved as a draft unless you tick “Published”.
        </p>
      </header>

      {error === "empty" ? (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          A post needs both a title and body content.
        </p>
      ) : null}

      <div className="card p-6">
        <PostForm />
      </div>
    </div>
  );
}
