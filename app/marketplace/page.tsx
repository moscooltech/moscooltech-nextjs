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
      <header className="reveal max-w-2xl">
        <p className="eyebrow eyebrow-rule">Marketplace</p>
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
          {items.map((item, index) => (
            <div key={item.id} id={`item-${item.id}`} className="scroll-mt-24">
              <PostCard post={item} eyebrow={item.category} showPrice className="reveal" style={{ "--reveal-delay": `${index * 70}ms` } as React.CSSProperties} />
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
        <div className="reveal card mt-10 flex flex-col items-start gap-3 p-8" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent-ink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9ZM12 12l8.5-4.5M12 12v9M3.5 7.5 12 12" />
            </svg>
          </span>
          <h2 className="font-display text-xl font-semibold">Nothing listed right now</h2>
          <p className="text-ink-soft">
            Stock changes weekly. Call{" "}
            <a href={biz.phoneHref} className="font-medium text-accent">
              {biz.phone}
            </a>{" "}
            — or send us a message — and tell us what you are looking for. We source, test and
            install.
          </p>
          <a href={biz.whatsapp} target="_blank" rel="noreferrer" className="btn-primary mt-1 self-start">
            Ask on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
