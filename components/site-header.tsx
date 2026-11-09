import Link from "next/link";
import { NAV, business } from "@/lib/site";

export function SiteHeader() {
  const biz = business();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Moscool Technical Services home">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-sm font-bold text-paper">
            M
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold tracking-tight">Moscool</span>
            <span className="text-[11px] text-ink-muted">Technical Services</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-accent">
              {item.label}
            </Link>
          ))}
        </nav>

        <a href={biz.phoneHref} className="btn-primary px-4 py-2 text-sm">
          <span aria-hidden="true">☎</span>
          <span className="hidden sm:inline">{biz.phone}</span>
          <span className="sm:hidden">Call</span>
        </a>
      </div>
    </header>
  );
}
