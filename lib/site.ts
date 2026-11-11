import { bindings } from "@/db";
import { NAV, SERVICES, SERVICE_AREAS } from "./nav";

export { NAV, SERVICES, SERVICE_AREAS };

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
