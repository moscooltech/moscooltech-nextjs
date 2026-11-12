import Link from "next/link";
import type { CSSProperties } from "react";
import { latestNews, listGuides, listPosts } from "@/db/queries";
import { PostCard } from "@/components/post-card";
import { ContactForm } from "@/components/contact-form";
import { SERVICE_AREAS, SERVICES, business } from "@/lib/site";
import { turnstileSiteKey } from "@/lib/turnstile";

export const revalidate = 300;

/* Inline stroke icons for the service cards — no icon library, no extra bytes. */
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "air-conditioning": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-6 w-6">
      <path d="M12 2.5v19M3.8 7.25l16.4 9.5M20.2 7.25 3.8 16.75M9.3 4.4 12 7l2.7-2.6M9.3 19.6 12 17l2.7 2.6" />
    </svg>
  ),
  refrigeration: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-6 w-6">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <path d="M6.5 9.5h11M9.5 5.5v2.2M9.5 12.8v3.6" />
    </svg>
  ),
  solar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-6 w-6">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9" />
    </svg>
  ),
  inverters: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-6 w-6">
      <rect x="2.5" y="7.5" width="16.5" height="9.5" rx="2" />
      <path d="M21.8 10.6v3.2M11.8 9.5 9.3 13h3.2l-2.5 3.7" />
    </svg>
  ),
  electrical: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-6 w-6">
      <path d="M9 6.5V2.8M15 6.5V2.8M6.8 6.5h10.4v4.2a5.2 5.2 0 0 1-10.4 0V6.5ZM12 15.9v5.3" />
    </svg>
  ),
};

const MARQUEE_ITEMS = [
  "AC repair & servicing",
  "Commercial refrigeration",
  "Solar & inverter systems",
  "Electrical wiring & panels",
  "24/7 emergency line",
  "90-day warranty",
  "Written quotes",
  "Same-day commercial response",
];

/* Visible FAQ — the questions customers actually ask on the phone. Rendered
   on the page (real content, not hidden filler) and mirrored in FAQPage
   JSON-LD below for AI answer engines. */
const FAQS = [
  {
    q: "How much does AC repair cost in Lagos?",
    a: "It depends on the fault — a gas top-up is a very different job from a compressor replacement. We diagnose the unit first, then give you a written quote before any work starts, so the price you see is the price you pay. Our AC repair guide lists typical 2026 price ranges for the common faults.",
  },
  {
    q: "Do you offer emergency or same-day service?",
    a: "Yes. We run a 24/7 emergency line, and commercial refrigeration callouts with stock at risk jump the queue — often attended within 2–4 hours. Standard bookings are scheduled for the same or next working day.",
  },
  {
    q: "Which areas do you cover?",
    a: "Lagos Mainland — Ikeja, Yaba, Surulere, Maryland, Gbagada and Ogba — plus Ogun State, including Magboro, Mowe and Ibafo. Our workshop is at Agbado Station, right on the Lagos–Ogun corridor.",
  },
  {
    q: "What warranty comes with your work?",
    a: "Every job carries a 90-day warranty covering both parts and labour. Refurbished equipment sold through our marketplace carries the same warranty, which is rare for second-hand units.",
  },
  {
    q: "Do you handle commercial refrigeration?",
    a: "Yes — freezers, chillers, display cases and cold rooms for shops, restaurants and pharmacies. We also run quarterly maintenance plans with written per-unit reports and priority response for businesses and landlords.",
  },
  {
    q: "Do you install solar and inverter systems?",
    a: "We design hybrid and off-grid solar from a real load audit, not a guess at panel count — and we install inverters with honest sizing for Nigerian outages. Battery replacement and changeover wiring are part of the same service.",
  },
];

const stagger = (index: number): CSSProperties => ({ "--reveal-delay": `${index * 70}ms` } as CSSProperties);
const heroDelay = (ms: number): CSSProperties => ({ "--hero-delay": `${ms}ms` } as CSSProperties);

export default async function HomePage() {
  const [caseStudies, guides, news] = await Promise.all([
    listPosts("portfolio", 3),
    listGuides(3),
    latestNews(3),
  ]);
  const biz = business();

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-line">
        {/* Ambient depth: pre-blurred radial gradients (no CSS filter cost),
            slow drift via linear alternate (constant ambient motion). */}
        <div
          aria-hidden="true"
          className="ambient-blob -top-32 right-[-10%] h-[34rem] w-[34rem] bg-[radial-gradient(closest-side,rgba(194,65,12,0.13),transparent)]"
        />
        <div
          aria-hidden="true"
          className="ambient-blob bottom-[-14rem] left-[-12%] h-[30rem] w-[30rem] bg-[radial-gradient(closest-side,rgba(20,83,45,0.09),transparent)]"
          style={{ animationDuration: "17s", animationDelay: "-7s" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(var(--color-line)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 [mask-image:radial-gradient(60rem_28rem_at_75%_0%,#000,transparent_70%)]"
        />

        <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="flex flex-col gap-7">
            <p className="eyebrow eyebrow-rule hero-in" style={heroDelay(0)}>
              Lagos Mainland &amp; Ogun State · Since 2014
            </p>
            <h1
              className="hero-in font-display text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl"
              style={heroDelay(90)}
            >
              Cooling, power and wiring that
              <span className="text-accent"> keep working</span>.
            </h1>
            <p className="hero-in max-w-xl text-lg leading-8 text-ink-soft" style={heroDelay(180)}>
              AC repair, commercial refrigeration, solar and inverter installations, and
              electrical work — diagnosed properly, quoted in writing, and backed by a
              90-day warranty on parts and labour.
            </p>

            <div className="hero-in flex flex-wrap items-center gap-3" style={heroDelay(270)}>
              <a href={biz.phoneHref} className="btn-primary">
                Call {biz.phone}
              </a>
              <a href={biz.whatsapp} target="_blank" rel="noreferrer" className="btn-ghost">
                <WhatsAppGlyph className="h-4 w-4 text-trust" />
                Message on WhatsApp
              </a>
            </div>

            <dl
              className="hero-in mt-2 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 text-sm sm:grid-cols-4"
              style={heroDelay(360)}
            >
              {[
                ["24/7", "Emergency line"],
                ["90 days", "Parts & labour warranty"],
                ["2–4 hrs", "Commercial response"],
                ["Free", "Load audits"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-lg font-semibold text-ink">{value}</dt>
                  <dd className="text-ink-muted">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            className="hero-in card relative flex flex-col justify-center gap-4 overflow-hidden bg-ink p-7 text-paper"
            style={heroDelay(430)}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(28rem_16rem_at_100%_0%,rgba(194,65,12,0.28),transparent_65%)]"
            />
            <p className="eyebrow relative text-accent">Same-day service</p>
            <h2 className="relative font-display text-2xl font-semibold leading-snug">
              Tell us what failed. We&apos;ll tell you what it costs before we start.
            </h2>
            <ul className="relative flex flex-col gap-2 text-sm text-paper/85">
              {[
                "Written quote before any work begins",
                "Refrigerant leaks found and sealed, never just topped up",
                "Commercial freezers prioritised — stock waits for nobody",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contact" className="btn-primary relative mt-1 self-start">
              Request a quote
            </a>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- marquee trust bar */}
      <div className="marquee border-b border-line bg-paper-raised py-3.5" aria-label="What we stand behind">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1 || undefined}
              className="flex items-center gap-11 pr-11"
            >
              {MARQUEE_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-11 whitespace-nowrap text-sm font-medium text-ink-soft">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------ services */}
      <section id="services" className="container-page py-16">
        <div className="reveal flex flex-col gap-3">
          <p className="eyebrow eyebrow-rule">What we do</p>
          <h2 className="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
            Five trades, one accountable team.
          </h2>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, index) => (
            <article
              key={service.slug}
              className="reveal card card-hover group flex flex-col gap-3 p-6"
              style={stagger(index)}
            >
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent-ink transition-colors duration-200 ease-out group-hover:bg-accent group-hover:text-white">
                  {SERVICE_ICONS[service.slug]}
                </span>
                <span
                  aria-hidden="true"
                  className="font-display text-3xl font-semibold leading-none text-line transition-colors duration-200 ease-out group-hover:text-accent-soft"
                >
                  0{index + 1}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold">{service.name}</h3>
              <p className="text-sm leading-6 text-ink-muted">{service.blurb}</p>
            </article>
          ))}
          <article
            className="reveal card flex flex-col justify-between gap-3 bg-trust-soft p-6"
            style={stagger(5)}
          >
            <h3 className="font-display text-lg font-semibold text-trust">Businesses &amp; landlords</h3>
            <p className="text-sm leading-6 text-trust/80">
              Quarterly maintenance plans with written per-unit reports and priority response.
            </p>
            <a
              href="#contact"
              className="group/link flex items-center gap-1.5 text-sm font-semibold text-trust"
            >
              <span className="underline decoration-trust/40 underline-offset-4 transition-colors duration-150 ease-out group-hover/link:decoration-trust">
                Ask about a plan
              </span>
              <span aria-hidden="true" className="transition-transform duration-200 ease-out group-hover/link:translate-x-1">
                →
              </span>
            </a>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------- case studies */}
      {caseStudies.length ? (
        <section className="container-page py-12">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-3">
              <p className="eyebrow eyebrow-rule">Recent work</p>
              <h2 className="font-display text-3xl font-semibold">Job notes from real callouts</h2>
            </div>
            <a href="#contact" className="text-sm font-medium text-accent hover:text-accent-ink">
              Book a visit →
            </a>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((post, index) => (
              <PostCard key={post.id} post={post} eyebrow="Case study" className="reveal" style={stagger(index)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- guides */}
      {guides.length ? (
        <section className="container-page py-12">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-3">
              <p className="eyebrow eyebrow-rule">Guides</p>
              <h2 className="font-display text-3xl font-semibold">
                Prices and process, written down
              </h2>
            </div>
            <Link href="/guides" className="text-sm font-medium text-accent hover:text-accent-ink">
              All guides →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((post, index) => (
              <PostCard key={post.id} post={post} eyebrow="Guide" className="reveal" style={stagger(index)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------------- news */}
      {news.length ? (
        <section className="container-page py-12">
          <div className="reveal">
            <p className="eyebrow eyebrow-rule">Industry news</p>
            <h2 className="mt-3 font-display text-2xl font-semibold">What&apos;s moving in the trade</h2>
          </div>
          <ul className="reveal mt-6 divide-y divide-line border-y border-line" style={stagger(1)}>
            {news.map((item) => (
              <li key={item.id} className="group/py py-4">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                >
                  <span className="font-medium text-ink transition-colors duration-150 ease-out group-hover/py:text-accent">
                    {item.title}
                  </span>
                  <span className="text-xs text-ink-muted">{item.sourceId}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --------------------------------------------------------------- FAQ */}
      <section className="container-page py-12">
        <div className="reveal max-w-2xl">
          <p className="eyebrow eyebrow-rule">Common questions</p>
          <h2 className="mt-3 font-display text-3xl font-semibold">
            Answers before you even call.
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {FAQS.map((item, index) => (
            <article
              key={item.q}
              className="reveal card card-hover p-6"
              style={{ "--reveal-delay": `${index * 60}ms` } as CSSProperties}
            >
              <h3 className="font-display text-base font-semibold text-ink">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ contact */}
      <section id="contact" className="container-page py-16">
        <div className="reveal grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-5">
            <p className="eyebrow eyebrow-rule">Get in touch</p>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Two hours to a reply, same day to a visit.
            </h2>
            <p className="text-ink-soft">
              Describe the fault or the job. For commercial refrigeration with stock at risk,
              say so and you jump the queue.
            </p>
            <dl className="mt-2 flex flex-col gap-4 text-sm">
              <div>
                <dt className="font-semibold text-ink">Workshop</dt>
                <dd className="text-ink-muted">
                  {biz.address}, {biz.locality}, {biz.region}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Phone / WhatsApp</dt>
                <dd>
                  <a href={biz.phoneHref} className="text-accent hover:text-accent-ink">
                    {biz.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Areas covered</dt>
                <dd className="text-ink-muted">{SERVICE_AREAS.join(" · ")}</dd>
              </div>
            </dl>
          </div>
          <ContactForm siteKey={turnstileSiteKey()} />
        </div>
      </section>

      {/* FAQPage structured data — mirrors the visible FAQ above. Google
          retired FAQ rich results (May 2026); this markup now serves AI
          answer engines and other semantic consumers. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
