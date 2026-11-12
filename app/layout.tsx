import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollReveal } from "@/components/scroll-reveal";
import { FloatingActions } from "@/components/floating-actions";
import { CookieConsent } from "@/components/cookie-consent";
import { business, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    // 57 chars — inside the 50–60 range the audit tools check.
    default: "Moscool Technical Services | AC, Solar & Electrical Lagos",
    template: "%s | Moscool Technical Services",
  },
  // 147 chars — inside the 120–160 range.
  description:
    "AC repair, refrigeration, solar, inverter and electrical services for homes and businesses across Lagos Mainland & Ogun State. 24/7 emergency line.",
  keywords: [
    "AC repair Lagos",
    "refrigeration repair Lagos",
    "solar installation Nigeria",
    "inverter installation Lagos",
    "electrician Lagos Mainland",
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/favicon-32.png"],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Moscool Technical Services",
    locale: "en_NG",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Moscool Technical Services — Smart Solutions. Reliable Service.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Moscool Technical Services | AC, Solar & Electrical Lagos",
    description:
      "AC repair, refrigeration, solar, inverter and electrical services for homes and businesses across Lagos Mainland & Ogun State. 24/7 emergency line.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbf9f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const biz = business();
  const base = siteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HVACBusiness",
        "@id": `${base}/#business`,
        name: biz.name,
        url: base,
        telephone: biz.phone,
        email: biz.email,
        image: [`${base}/og.png`],
        logo: `${base}/logo/moscool-mark-512.png`,
        address: {
          "@type": "PostalAddress",
          streetAddress: biz.address,
          addressLocality: biz.locality,
          addressRegion: biz.region,
          addressCountry: "NG",
        },
        areaServed: ["Lagos Mainland", "Ogun State"],
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "08:00",
            closes: "18:00",
          },
        ],
        priceRange: "₦₦",
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: "Moscool Technical Services",
        inLanguage: "en-NG",
        publisher: { "@id": `${base}/#business` },
      },
    ],
  };

  return (
    <html lang="en-NG">
      <body className="flex min-h-dvh flex-col">
        {/* Progressive-enhancement gate: scroll-reveal hidden states only
            apply when JS is running. Runs before any content paints. */}
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        {/* Self-hosted variable fonts — the identity of the whole site. */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/space-grotesk-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <FloatingActions whatsapp={biz.whatsapp} />
        <CookieConsent />
        <ScrollReveal />
        {/* Cloudflare Web Analytics — free, cookieless, aggregate-only. No
            consent gate needed (no cookies, no cross-site tracking). */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: "14a0727f1229428d9a2f11532570ae2a" })}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
