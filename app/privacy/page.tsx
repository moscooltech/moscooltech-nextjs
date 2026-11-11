import type { Metadata } from "next";
import Link from "next/link";
import { business, siteUrl } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Moscool Technical Services collects, uses, stores and protects the personal information you share through this website, and the choices you have.",
  alternates: { canonical: `${siteUrl()}/privacy` },
};

const SECTIONS = [
  {
    id: "who-we-are",
    heading: "1. Who we are",
    body: (
      <>
        <p>
          This website is operated by <strong>Moscool Technical Services</strong> (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;), a technical services business in {`Ifo, Ogun State`}, Nigeria. We are the
          &ldquo;data controller&rdquo; for the personal information described in this policy.
        </p>
        <p>
          You can reach us any time about your data:{" "}
          <a href={`mailto:${business().email}`}>{business().email}</a> ·{" "}
          <a href={business().phoneHref}>{business().phone}</a>. Our workshop address is in the
          footer of every page.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    heading: "2. What we collect",
    body: (
      <ul>
        <li>
          <strong>Contact form / quote requests.</strong> The name, email address, phone number,
          service needed and message you type into the form — plus the date it was sent.
        </li>
        <li>
          <strong>Feedback form.</strong> The name, email, subject and message you send.
        </li>
        <li>
          <strong>Rate-limit records.</strong> A short-lived counter keyed to your IP address so we
          can slow down abuse of the forms. It is not used to profile you and is not linked to your
          enquiries.
        </li>
        <li>
          <strong>Admin session cookie.</strong> A single strictly-necessary cookie
          (<code>mt_admin</code>) that keeps the owner&rsquo;s dashboard logged in. It is set only
          after a successful password sign-in, is HttpOnly, Secure, and expires after 12 hours. It
          is never set for ordinary visitors.
        </li>
        <li>
          <strong>Your consent choice.</strong> Whether you accepted or declined cookies is stored
          in your browser&rsquo;s localStorage so we don&rsquo;t ask you again. It is not sent to
          our servers.
        </li>
      </ul>
    ),
  },
  {
    id: "why",
    heading: "3. Why we use it (and our legal basis)",
    body: (
      <ul>
        <li>
          <strong>To reply to your enquiry and do the work you ask for</strong> — performance of a
          contract, or steps taken at your request before a contract.
        </li>
        <li>
          <strong>To keep the website and forms working and abuse-free</strong> (rate limiting,
          bot checks) — our legitimate interest in operating a safe service.
        </li>
        <li>
          <strong>To improve the content</strong> (e.g. which guides people read, in aggregate) —
          our legitimate interest. We do not run advertising or cross-site tracking.
        </li>
      </ul>
    ),
  },
  {
    id: "where-stored",
    heading: "4. Where it is stored and who processes it",
    body: (
      <>
        <p>
          Form submissions are stored in a managed database (Cloudflare D1) and are visible only to
          Moscool Technical Services staff through the admin dashboard. Traffic to and from the site
          is encrypted (HTTPS/TLS), and the database is encrypted at rest by our hosting provider.
        </p>
        <p>
          We use Cloudflare, Inc. to host and protect this website. When enabled, Cloudflare
          Turnstile may run a private bot-check — it is not advertising and does not profile you.
          We never sell, rent or trade your personal information, and we do not share it with
          advertisers.
        </p>
      </>
    ),
  },
  {
    id: "how-long",
    heading: "5. How long we keep it",
    body: (
      <ul>
        <li>Quote requests and leads: up to 24 months after our last contact with you.</li>
        <li>Feedback: up to 12 months.</li>
        <li>Rate-limit counters: minutes to hours — then they are gone.</li>
        <li>Your cookie-consent choice: until you clear your browser storage.</li>
      </ul>
    ),
  },
  {
    id: "cookies",
    heading: "6. Cookies",
    body: (
      <>
        <p>
          This site sets <strong>no advertising or tracking cookies</strong>. The only cookie is the
          strictly-necessary admin login cookie described in section 2, which ordinary visitors
          never receive. Your cookie banner choice is kept in your browser&rsquo;s localStorage.
        </p>
        <p>
          If we ever add optional analytics, it will be off until you press &ldquo;Accept&rdquo; in
          the cookie banner, and you can change your mind by clearing your browser storage for this
          site.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    heading: "7. Your rights",
    body: (
      <>
        <p>
          Under applicable Nigerian law (including the Nigeria Data Protection Act 2023) and, where
          it applies to you, the GDPR, you can ask us to:
        </p>
        <ul>
          <li>give you a copy of the personal information we hold about you;</li>
          <li>correct anything that is wrong;</li>
          <li>delete it (we may keep what the law requires us to keep);</li>
          <li>stop or restrict how we use it; or</li>
          <li>object to processing based on our legitimate interests.</li>
        </ul>
        <p>
          Email <a href={`mailto:${business().email}`}>{business().email}</a> or call{" "}
          <a href={business().phoneHref}>{business().phone}</a> and we will respond within a
          reasonable time. You may also complain to the Nigeria Data Protection Commission (NDPC).
        </p>
      </>
    ),
  },
  {
    id: "children",
    heading: "8. Children",
    body: (
      <p>
        Our services are aimed at adults, homes and businesses. We do not knowingly collect
        information from children under 18. If you believe a child sent us their details, contact us
        and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "9. Changes to this policy",
    body: (
      <p>
        We post any changes on this page and update the date below. Significant changes will also be
        announced on the site.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  const updated = "11 November 2026";

  return (
    <div className="container-page py-14">
      <header className="reveal max-w-3xl">
        <p className="eyebrow eyebrow-rule">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Privacy policy</h1>
        <p className="mt-4 text-lg leading-8 text-ink-soft">
          Plain language: what we collect through this website, why, how long we keep it, and how to
          get it deleted. Last updated <time dateTime="2026-11-11">{updated}</time>.
        </p>
        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="text-accent hover:text-accent-ink">
              {section.heading.replace(/^\d+\.\s/, "")}
            </a>
          ))}
        </nav>
      </header>

      <article className="reveal article-body mt-10 max-w-3xl" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2>{section.heading}</h2>
            {section.body}
          </section>
        ))}

        <section>
          <h2>10. Contact</h2>
          <p>
            Questions about anything here? Email{" "}
            <a href={`mailto:${business().email}`}>{business().email}</a>, call{" "}
            <a href={business().phoneHref}>{business().phone}</a>, or use the{" "}
            <Link href="/#contact" className="text-accent hover:text-accent-ink">
              contact form
            </Link>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
