"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/lib/nav";

type Props = {
  phone: string;
  phoneHref: string;
};

/**
 * Public site header. Client-side because of the mobile menu and the
 * scroll-condensed state; the server wrapper passes NAP data in as props
 * (bindings are not reachable from client code).
 */
export function HeaderClient({ phone, phoneHref }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelId = "mobile-menu";
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Condense once the page is scrolled (paint-only property changes).
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 12));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Close the menu on route change and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      data-scrolled={scrolled ? "true" : "false"}
      className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md transition-[box-shadow,background-color] duration-200 ease-out data-[scrolled=true]:bg-paper/95 data-[scrolled=true]:shadow-[0_1px_0_var(--color-line),0_12px_32px_-24px_rgba(13,21,32,0.4)]"
    >
      <div className="container-page relative flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Moscool Technical Services home"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-sm font-bold text-paper transition-transform duration-200 ease-out">
            <span aria-hidden="true" className="transition-transform duration-200 ease-out">
              M
            </span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold tracking-tight">Moscool</span>
            <span className="text-[11px] text-ink-muted">Technical Services</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href !== "/#contact" && pathname === item.href ? "page" : undefined}
              className="nav-link transition-colors duration-150 ease-out hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href={phoneHref} className="btn-primary px-4 py-2 text-sm">
            <span aria-hidden="true">☎</span>
            <span className="hidden sm:inline">{phone}</span>
            <span className="sm:hidden">Call</span>
          </a>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 touch-hitbox place-items-center rounded-lg text-ink md:hidden"
          >
            {/* Hamburger that morphs into an X (transform-only). */}
            <span aria-hidden="true" className="relative block h-3.5 w-5">
              <MenuBar className={open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"} />
              <MenuBar className={open ? "top-1/2 -translate-y-1/2 opacity-0" : "top-1/2 -translate-y-1/2"} />
              <MenuBar className={open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"} />
            </span>
          </button>
        </div>

        {/* Mobile menu: paired panel + scrim, 200ms ease-out, origin at the
            trigger corner (skill: be origin-aware, don't scale from 0). */}
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className={`fixed inset-0 z-30 bg-ink/25 backdrop-blur-[2px] transition-opacity duration-200 ease-out md:hidden ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        <div
          id={panelId}
          className={`absolute inset-x-3 top-[calc(100%+0.5rem)] z-40 origin-top-right rounded-2xl border border-line bg-paper-raised p-2 shadow-[0_24px_48px_-24px_rgba(13,21,32,0.4)] transition-[opacity,transform] duration-200 ease-out md:hidden ${
            open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.98] opacity-0"
          }`}
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                ref={index === 0 ? firstLinkRef : undefined}
                className="rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-accent-soft hover:text-accent-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function MenuBar({ className }: { className: string }) {
  return (
    <span
      className={`absolute left-0 h-0.5 w-full rounded-full bg-ink transition-[top,transform,opacity] duration-200 ease-out ${className ?? ""}`}
    />
  );
}
