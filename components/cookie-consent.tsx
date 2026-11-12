"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mt-cookie-consent";

/**
 * Cookie consent banner.
 *
 * Honest by design: this site sets no advertising or tracking cookies — the
 * only cookie is the strictly-necessary admin session cookie, which ordinary
 * visitors never receive. The banner records the visitor's choice in
 * localStorage so it stays away afterwards, and documents that choice for
 * whenever optional analytics are added (they must check this key first).
 */
export function CookieConsent() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = "accepted"; // storage unavailable (private mode) — stay quiet
    }
    if (stored) return;

    // Let the page settle before the banner slides in.
    const timer = window.setTimeout(() => setVisible(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  const choose = (value: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* private mode — banner simply re-asks next visit */
    }
    setVisible(false);
  };

  if (pathname.startsWith("/admin") || !visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 sm:left-1/2 sm:right-auto sm:w-[34rem] sm:-translate-x-1/2"
    >
      <div className="banner-in card translate-y-0 rounded-2xl border-ink/10 bg-paper-raised p-4 shadow-[0_24px_48px_-16px_rgba(13,21,32,0.35)] sm:p-5">
        <p className="text-sm leading-6 text-ink-soft">
          <span className="font-semibold text-ink">Cookies:</span> this site sets no ads or
          tracking cookies, and analytics is cookieless. The only cookie keeps the owner&rsquo;s
          dashboard logged in. Your choice is remembered on this device.{" "}
          <Link
            href="/privacy#cookies"
            className="font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-150 ease-out hover:text-accent-ink"
          >
            Privacy policy
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={() => choose("accepted")} className="btn-primary px-4 py-2 text-sm">
            That&rsquo;s fine
          </button>
          <button type="button" onClick={() => choose("declined")} className="btn-ghost px-4 py-2 text-sm">
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
