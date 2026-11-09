import { bindings } from "@/db";

export const SERVICES = [
  {
    slug: "air-conditioning",
    name: "Air Conditioning",
    blurb: "Split, cassette and window units — installation, servicing, gas recharge and compressor work.",
  },
  {
    slug: "refrigeration",
    name: "Refrigeration",
    blurb: "Freezers, chillers, display cases and cold rooms for homes, shops and pharmacies.",
  },
  {
    slug: "solar",
    name: "Solar",
    blurb: "Hybrid and off-grid design from a real load audit, not a guess at panel count.",
  },
  {
    slug: "inverters",
    name: "Inverters",
    blurb: "Installation, battery replacement and honest sizing for Nigerian outages.",
  },
  {
    slug: "electrical",
    name: "Electrical",
    blurb: "Wiring, panels, changeovers and safety inspections done to standard.",
  },
] as const;

export const SERVICE_AREAS = [
  "Ikeja",
  "Yaba",
  "Surulere",
  "Maryland",
  "Gbagada",
  "Ogba",
  "Magboro",
  "Mowe",
  "Ibafo",
] as const;

/** NAP data — kept identical to the Google Business Profile listing. */
export function business() {
  const env = bindings();
  const address = env.BUSINESS_ADDRESS || "16, Oredegbe Street, Off Ogundele Street, Agbado Station";
  const locality = env.BUSINESS_LOCALITY || "Ifo";
  const region = env.BUSINESS_REGION || "Ogun State";
  const phone = env.BUSINESS_PHONE || "+2349033150460";
  const email = env.BUSINESS_EMAIL || "dayotunde25@gmail.com";
  const digits = phone.replace(/[^0-9]/g, "");

  return {
    name: "Moscool Technical Services",
    address,
    locality,
    region,
    country: "NG",
    phone,
    phoneHref: `tel:+${digits.replace(/^0+/, "")}`,
    whatsapp: `https://wa.me/${digits}`,
    email,
    hours: "Mon–Fri 08:00–18:00 · 24/7 emergency line",
    reviewUrl:
      env.GOOGLE_REVIEW_URL ||
      "https://www.google.com/maps/search/?api=1&query=Moscool+Technical+Services+16+Oredegbe+Street+Agbado+Station+Ifo+Ogun+State",
  };
}

export function siteUrl(): string {
  return (bindings().SITE_URL || "https://moscooltech.workers.dev").replace(/\/$/, "");
}

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/guides", label: "Guides" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/#contact", label: "Contact" },
] as const;
