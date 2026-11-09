import type { Metadata } from "next";
import { listPosts } from "@/db/queries";
import { PostCard } from "@/components/post-card";
import { business, siteUrl } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Marketplace — refurbished units and equipment",
  description:
    "Refurbished air conditioners, freezers and inverter equipment from Moscool Technical Services, with prices in Naira and delivery across Lagos and Ogun State.",
  alternates: { canonical: `${siteUrl()}/marketplace` },
};

export default async function MarketplacePage() {
  const items = await listPosts("sale", 60);
  const biz = business();

  return (
    <div className="container-page py-14">
      <header className="max-w-2xl">
        <p className="eyebrow">Marketplace</p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
          Checked units, honest prices.
        </h1>
        <p className="mt-4 text-lg leading-8 text-ink-soft">
          Refurbished and surplus equipment we have tested ourselves. Every item comes with
          the same 90-day warranty we give on repairs.
        </p>
      </header>

      {items.length ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} id={`item-${item.id}`} className="scroll-mt-24">
              <PostCard post={item} eyebrow={item.category} showPrice />
              {item.itemLink ? (
                <a
                  href={item.itemLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-accent hover:text-accent-ink"
                >
                  View listing →
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-line bg-white p-8">
          <h2 className="font-display text-xl font-semibold">Nothing listed right now</h2>
          <p className="mt-2 text-ink-soft">
            Stock changes weekly. Call{" "}
            <a href={biz.phoneHref} className="font-medium text-accent">
              {biz.phone}
            </a>{" "}
            and tell us what you are looking for.
          </p>
        </div>
      )}
    </div>
  );
}
