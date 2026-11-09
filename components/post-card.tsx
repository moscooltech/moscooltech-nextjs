import Link from "next/link";
import type { Post } from "@/db/schema";

export function postHref(post: Post): string {
  return post.postType === "article"
    ? `/guides/${post.slug}`
    : post.postType === "sale"
      ? `/marketplace#item-${post.id}`
      : `/work/${post.slug}`;
}

type Props = {
  post: Post;
  eyebrow?: string;
  showPrice?: boolean;
};

export function PostCard({ post, eyebrow, showPrice }: Props) {
  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-[0_10px_40px_-24px_rgba(13,21,32,0.45)]">
      <Link href={postHref(post)} className="flex h-full flex-col">
        {post.imageUrl ? (
          <span className="relative block aspect-[16/10] overflow-hidden bg-paper">
            {/* Plain <img>: Workers Image Optimization is a paid product and the
                free plan has no image budget. */}
            <img
              src={post.imageUrl}
              alt={post.imageAlt || post.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </span>
        ) : null}

        <span className="flex flex-1 flex-col gap-2.5 p-5">
          <span className="eyebrow">{eyebrow || post.category}</span>
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">{post.title}</h3>
          <p className="line-clamp-3 text-sm leading-6 text-ink-muted">{post.metaDescription}</p>

          {showPrice && post.price ? (
            <span className="mt-auto pt-2 font-display text-base font-semibold text-accent-ink">
              {post.currency === "NGN" ? "₦" : `${post.currency} `}
              {post.price.toLocaleString("en-NG")}
              {post.negotiable ? <span className="ml-1 text-xs font-normal text-ink-muted">negotiable</span> : null}
            </span>
          ) : (
            <span className="mt-auto pt-2 text-sm font-medium text-accent">Read more →</span>
          )}
        </span>
      </Link>
    </article>
  );
}
