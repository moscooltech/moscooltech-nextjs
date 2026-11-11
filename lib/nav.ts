/**
 * Static, client-safe site constants. Kept free of server-only imports
 * (bindings) so client components like the header can use them.
 */

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

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/guides", label: "Guides" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/#contact", label: "Contact" },
] as const;
