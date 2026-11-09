import type { Metadata } from "next";
import { listGuides } from "@/db/queries";
import { PostCard } from "@/components/post-card";
import { siteUrl } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Guides: real prices and process for AC, solar and refrigeration in Nigeria",
  description:
    "Practical guides for Nigerian homes and businesses: what AC repair, solar installation, refrigeration work and inverters actually cost, and how to avoid being overcharged.",
  alternates: { canonical: `${siteUrl()}/guides` },
};

export default async function GuidesPage() {
  const guides = await listGuides();

  return (
    <div className="container-page py-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Guides</p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
          What the job should cost, and how it should be done.
        </h1>
        <p className="mt-4 text-lg leading-8 text-ink-soft">
          Written from the jobs we actually run across Lagos Mainland and Ogun State — with
          2026 Naira ranges instead of vague advice.
        </p>
      </header>

      {guides.length ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((post) => (
            <PostCard key={post.id} post={post} eyebrow="Guide" />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-xl border border-line bg-white p-6 text-ink-muted">
          Guides are being published. Call <a href="tel:+2349033150460" className="font-medium text-accent">
            +234 903 315 0460
          </a>{" "}
          for advice in the meantime.
        </p>
      )}
    </div>
  );
}
