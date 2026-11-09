import Link from "next/link";
import { latestNews, listGuides, listPosts } from "@/db/queries";
import { PostCard } from "@/components/post-card";
import { ContactForm } from "@/components/contact-form";
import { SERVICE_AREAS, SERVICES, business } from "@/lib/site";
import { turnstileSiteKey } from "@/lib/turnstile";

export const revalidate = 300;

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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80rem_40rem_at_110%_-20%,var(--color-accent-soft),transparent_60%)]"
        />
        <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="flex flex-col gap-7">
            <p className="eyebrow">Lagos Mainland &amp; Ogun State · Since 2014</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              Cooling, power and wiring that
              <span className="text-accent"> keep working</span>.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-ink-soft">
              AC repair, commercial refrigeration, solar and inverter installations, and
              electrical work — diagnosed properly, quoted in writing, and backed by a
              90-day warranty on parts and labour.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a href={biz.phoneHref} className="btn-primary">
                Call {biz.phone}
              </a>
              <a href={biz.whatsapp} target="_blank" rel="noreferrer" className="btn-ghost">
                Message on WhatsApp
              </a>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 text-sm sm:grid-cols-4">
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

          <div className="card flex flex-col justify-center gap-4 bg-ink p-7 text-paper">
            <p className="eyebrow text-accent">Same-day service</p>
            <h2 className="font-display text-2xl font-semibold leading-snug">
              Tell us what failed. We&apos;ll tell you what it costs before we start.
            </h2>
            <ul className="flex flex-col gap-2 text-sm text-paper/85">
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
            <a href="#contact" className="btn-primary mt-1 self-start">
              Request a quote
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ services */}
      <section id="services" className="container-page py-16">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">What we do</p>
          <h2 className="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
            Five trades, one accountable team.
          </h2>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, index) => (
            <article key={service.slug} className="card flex flex-col gap-2 p-6">
              <span className="font-display text-xs font-semibold text-accent">
                0{index + 1}
              </span>
              <h3 className="font-display text-lg font-semibold">{service.name}</h3>
              <p className="text-sm leading-6 text-ink-muted">{service.blurb}</p>
            </article>
          ))}
          <article className="card flex flex-col justify-between gap-3 bg-trust-soft p-6">
            <h3 className="font-display text-lg font-semibold text-trust">Businesses &amp; landlords</h3>
            <p className="text-sm leading-6 text-trust/80">
              Quarterly maintenance plans with written per-unit reports and priority response.
            </p>
            <a href="#contact" className="text-sm font-semibold text-trust underline underline-offset-4">
              Ask about a plan
            </a>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------- case studies */}
      {caseStudies.length ? (
        <section className="container-page py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-3">
              <p className="eyebrow">Recent work</p>
              <h2 className="font-display text-3xl font-semibold">Job notes from real callouts</h2>
            </div>
            <a href="#contact" className="text-sm font-medium text-accent hover:text-accent-ink">
              Book a visit →
            </a>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((post) => (
              <PostCard key={post.id} post={post} eyebrow="Case study" />
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- guides */}
      {guides.length ? (
        <section className="container-page py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-3">
              <p className="eyebrow">Guides</p>
              <h2 className="font-display text-3xl font-semibold">
                Prices and process, written down
              </h2>
            </div>
            <Link href="/guides" className="text-sm font-medium text-accent hover:text-accent-ink">
              All guides →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((post) => (
              <PostCard key={post.id} post={post} eyebrow="Guide" />
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------------- news */}
      {news.length ? (
        <section className="container-page py-12">
          <p className="eyebrow">Industry news</p>
          <h2 className="mt-3 font-display text-2xl font-semibold">What&apos;s moving in the trade</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {news.map((item) => (
              <li key={item.id} className="py-4">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                >
                  <span className="font-medium text-ink hover:text-accent">{item.title}</span>
                  <span className="text-xs text-ink-muted">{item.sourceId}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ contact */}
      <section id="contact" className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-5">
            <p className="eyebrow">Get in touch</p>
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
    </>
  );
}
