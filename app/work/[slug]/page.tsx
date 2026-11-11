import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article-body";
import { getPostBySlug, listPosts, relatedPosts } from "@/db/queries";
import { PostCard } from "@/components/post-card";
import { business, siteUrl } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await listPosts("portfolio", 50);
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Case study not found" };

  return {
    title: post.title,
    description: post.metaDescription || undefined,
    alternates: { canonical: `${siteUrl()}/work/${post.slug}` },
  };
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const related = await relatedPosts(post);
  const biz = business();

  return (
    <article className="container-page py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <span>Work</span>
      </nav>

      <header className="reveal mt-6 max-w-3xl">
        <p className="eyebrow eyebrow-rule">Case study · {post.category}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-ink-soft">{post.metaDescription}</p>
      </header>

      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt={post.imageAlt || post.title}
          className="mt-8 aspect-[16/8] w-full rounded-2xl border border-line object-cover"
          loading="eager"
          decoding="async"
        />
      ) : null}

      <div className="mt-10 max-w-3xl">
        <ArticleBody content={post.content} />

        <div className="mt-12 rounded-2xl border border-line bg-white p-6">
          <h2 className="font-display text-xl font-semibold">Need the same job done?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            We cover Lagos Mainland and Ogun State with a 24/7 emergency line.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={biz.phoneHref} className="btn-primary">
              Call {biz.phone}
            </a>
            <a href="/#contact" className="btn-ghost">
              Request a quote
            </a>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">More job notes</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} eyebrow="Case study" />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
