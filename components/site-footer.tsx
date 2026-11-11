import Link from "next/link";
import { NAV, SERVICE_AREAS, SERVICES, business } from "@/lib/site";

export function SiteFooter() {
  const biz = business();

  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="flex flex-col gap-3">
          <span className="font-display text-lg font-semibold">{biz.name}</span>
          <address className="not-italic text-sm leading-6 text-ink-muted">
            {biz.address}
            <br />
            {biz.locality}, {biz.region}, Nigeria
          </address>
          <div className="flex flex-col gap-1 text-sm">
            <a href={biz.phoneHref} className="font-medium text-ink hover:text-accent">
              {biz.phone}
            </a>
            <a href={`mailto:${biz.email}`} className="text-ink-muted hover:text-accent">
              {biz.email}
            </a>
          </div>
          <p className="text-xs text-ink-muted">{biz.hours}</p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="eyebrow">Services</span>
          {SERVICES.map((service) => (
            <Link key={service.slug} href="/#services" className="w-fit text-ink-soft transition-colors duration-150 ease-out hover:text-accent">
              {service.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="eyebrow">Pages</span>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="w-fit text-ink-soft transition-colors duration-150 ease-out hover:text-accent">
              {item.label}
            </Link>
          ))}
          <Link href="/llms.txt" className="w-fit text-ink-soft transition-colors duration-150 ease-out hover:text-accent">
            llms.txt
          </Link>
          <Link href="/privacy" className="w-fit text-ink-soft transition-colors duration-150 ease-out hover:text-accent">
            Privacy policy
          </Link>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="eyebrow">We cover</span>
          <p className="text-ink-soft leading-6">
            Lagos Mainland ({SERVICE_AREAS.slice(0, 6).join(", ")}) and Ogun State (
            {SERVICE_AREAS.slice(6).join(", ")}).
          </p>
          <a
            href={biz.reviewUrl}
            target="_blank"
            rel="noreferrer"
            className="group/review mt-1 flex w-fit items-center gap-1.5 font-medium text-accent"
          >
            <span className="transition-colors duration-150 ease-out group-hover/review:text-accent-ink">
              Leave a Google review
            </span>
            <span aria-hidden="true" className="transition-transform duration-200 ease-out group-hover/review:translate-x-1">
              →
            </span>
          </a>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {biz.name}. All rights reserved.</p>
          <p>Air conditioning · Refrigeration · Solar · Inverters · Electrical</p>
        </div>
      </div>
    </footer>
  );
}
