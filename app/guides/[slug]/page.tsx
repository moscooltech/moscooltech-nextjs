import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article-body";
import { PostCard } from "@/components/post-card";
import { faqsForPost, getPostBySlug, listGuides, relatedPosts } from "@/db/queries";
import { business, siteUrl } from "@/lib/site";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const guides = await listGuides(100);
  return guides.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Guide not found" };

  const url = `${siteUrl()}/guides/${post.slug}`;
  return {
    title: post.title,
    description: post.metaDescription || undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.metaDescription || undefined,
      images: post.imageUrl ? [{ url: post.imageUrl }] : undefined,
    },
  };
}

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const [faqs, related] = await Promise.all([faqsForPost(post.id), relatedPosts(post)]);
  const biz = business();
  const url = `${siteUrl()}/guides/${post.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    image: post.imageUrl ? [post.imageUrl] : undefined,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: biz.name, url: siteUrl() },
    publisher: { "@type": "Organization", name: biz.name, url: siteUrl() },
  };

  const faqSchema = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }
    : null;

  return (
    <article className="container-page py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/guides" className="hover:text-accent">
          Guides
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-soft">{post.category}</span>
      </nav>

      <header className="reveal mt-6 max-w-3xl">
        <p className="eyebrow eyebrow-rule">{post.category}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-ink-soft">{post.metaDescription}</p>
        <p className="mt-4 text-sm text-ink-muted">
          Updated{" "}
          <time dateTime={post.updatedAt}>
            {new Date(post.updatedAt).toLocaleDateString("en-NG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          {" · "}Moscool Technical Services
        </p>
      </header>

      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt={post.imageAlt || post.title}
          className="mt-8 aspect-[16/7] w-full rounded-2xl border border-line object-cover"
          loading="eager"
          decoding="async"
        />
      ) : null}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="max-w-3xl">
          <ArticleBody content={post.content} />

          {faqs.length ? (
            <section className="mt-14 rounded-2xl border border-line bg-white p-6 sm:p-8">
              <h2 className="font-display text-2xl font-semibold">Frequently asked questions</h2>
              <dl className="mt-6 flex flex-col gap-6">
                {faqs.map((faq) => (
                  <div key={faq.id}>
                    <dt className="font-semibold text-ink">{faq.question}</dt>
                    <dd className="mt-1.5 text-sm leading-7 text-ink-soft">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card bg-ink p-6 text-paper">
            <p className="eyebrow text-accent">Need this done?</p>
            <p className="mt-2 font-display text-lg font-semibold leading-snug">
              Same-day visits across Lagos Mainland and Ogun State.
            </p>
            <a href={biz.phoneHref} className="btn-primary mt-4 w-full">
              Call {biz.phone}
            </a>
            <a
              href={biz.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-center text-sm text-paper/80 underline underline-offset-4"
            >
              Or message on WhatsApp
            </a>
          </div>

          <a href={biz.reviewUrl} target="_blank" rel="noreferrer" className="card p-5 text-sm">
            <span className="font-semibold text-ink">Worked with us before?</span>
            <span className="mt-1 block text-ink-muted">Leave a Google review — it helps neighbours find us.</span>
          </a>
        </aside>
      </div>

      {related.length ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">Related guides</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} eyebrow="Guide" />
            ))}
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
    </article>
  );
}
