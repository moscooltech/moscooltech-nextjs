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
    default: "Moscool Technical Services — AC, Refrigeration, Solar & Electrical in Lagos",
    template: "%s | Moscool Technical Services",
  },
  description:
    "AC repair, refrigeration, solar and inverter installation, and electrical services for homes and businesses in Lagos Mainland and Ogun State. 24/7 emergency line.",
  keywords: [
    "AC repair Lagos",
    "refrigeration repair Lagos",
    "solar installation Nigeria",
    "inverter installation Lagos",
    "electrician Lagos Mainland",
  ],
  openGraph: {
    type: "website",
    siteName: "Moscool Technical Services",
    locale: "en_NG",
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
    "@type": "HVACBusiness",
    name: biz.name,
    url: base,
    telephone: biz.phone,
    email: biz.email,
    image: `${base}/og.png`,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
