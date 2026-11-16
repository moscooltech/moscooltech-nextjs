/**
 * Curated topic pool for the daily auto-poster.
 *
 * Editorial rules (content-strategy methodology):
 *  - 100% "searchable" content: every topic answers a question people in
 *    Lagos/Ogun actually type into Google (buyer-stage modifiers like
 *    "how to", "vs", "why", "without", "after").
 *  - One primary keyword per topic, worked into the title naturally.
 *  - Nigerian context in every prompt so the draft generator produces
 *    locally-specific, non-generic copy (NEPA, harmattan, Naira reality).
 *  - The pool rotates across the four service lines — AC, refrigeration,
 *    solar/inverter, electrical — so the blog doesn't develop a one-note
 *    topic distribution.
 *  - Deliberately does NOT overlap the existing evergreen guides:
 *    ac-repair-in-lagos, ac-service-and-maintenance-guide,
 *    inverter-battery-replacement, hvac-maintenance-contracts.
 *
 * The daily job marks a topic "used" by inserting a content_topics row with
 * the same text, so a topic never repeats until the pool is refilled.
 */

export type DailyTopicSeed = {
  topic: string;
  keyword: string;
  /** All daily posts are guides — portfolio posts must stay human-made. */
  category?: "guides";
  tone?: string;
  targetWords?: number;
  faqCount?: number;
};

export const DAILY_TOPIC_POOL: DailyTopicSeed[] = [
  // --- Air conditioning -----------------------------------------------------
  {
    topic: "How to Choose the Right AC Size for a Room in Nigeria (BTU Guide)",
    keyword: "ac btu size for room",
  },
  {
    topic: "Split vs Window AC: Which Suits a Nigerian Home Better?",
    keyword: "split or window air conditioner",
  },
  {
    topic: "Why Your AC Keeps Tripping the Circuit Breaker",
    keyword: "air conditioner trips breaker",
  },
  {
    topic: "Do Inverter Air Conditioners Really Save Electricity in Nigeria?",
    keyword: "inverter ac power saving",
  },
  {
    topic: "Getting Your AC Ready for Harmattan Dust",
    keyword: "harmattan air conditioner maintenance",
  },
  {
    topic: "Where to Place an AC Outdoor Unit in a Nigerian Compound",
    keyword: "ac outdoor unit placement",
  },
  {
    topic: "Buying a Used or Refurbished AC Without Getting Burned",
    keyword: "used ac buying tips",
  },
  {
    topic: "AC Gas Top-Up vs Leak Repair: What You Actually Need",
    keyword: "ac gas refilling",
  },
  {
    topic: "Floor Standing ACs for Shops and Halls: Pros, Cons and Costs",
    keyword: "floor standing air conditioner",
  },
  {
    topic: "How Often Should Commercial ACs Be Serviced? A Business Owner's Schedule",
    keyword: "commercial ac servicing schedule",
  },

  // --- Refrigeration ----------------------------------------------------------
  {
    topic: "Deep Freezer Buying Guide for Nigerian Homes and Shops",
    keyword: "deep freezer buying guide",
  },
  {
    topic: "Freezer Running but Not Freezing? Causes and Fixes",
    keyword: "freezer not freezing",
  },
  {
    topic: "Cold Room Basics for Small Food Businesses in Nigeria",
    keyword: "cold room installation",
  },
  {
    topic: "How to Keep a Display Chiller Working in a Busy Shop",
    keyword: "display chiller maintenance",
  },
  {
    topic: "Fridge Not Cooling After a Power Outage? Start Here",
    keyword: "fridge stopped cooling after power outage",
  },
  {
    topic: "Protecting Your Fridge and TV From Voltage Surges",
    keyword: "fridge voltage surge protector",
  },

  // --- Solar & inverter -------------------------------------------------------
  {
    topic: "Manual vs Automatic Changeover Switch: Which Should You Install?",
    keyword: "changeover switch installation",
  },
  {
    topic: "How to Size a Home Inverter Before Buying One",
    keyword: "how to size an inverter",
  },
  {
    topic: "Monocrystalline vs Polycrystalline Panels for Nigerian Roofs",
    keyword: "types of solar panels",
  },
  {
    topic: "What Size Solar System Can Power a Fridge and a TV?",
    keyword: "solar that can carry fridge and tv",
  },
  {
    topic: "Lithium vs Tubular Batteries: Which Lasts Longer in Nigeria?",
    keyword: "lithium vs tubular battery",
  },
  {
    topic: "Why a Load Audit Should Come Before Any Solar Purchase",
    keyword: "load audit for solar",
  },
  {
    topic: "Hybrid vs Off-Grid Solar: Picking the Right Setup for Your Home",
    keyword: "hybrid solar system nigeria",
  },
  {
    topic: "Common Solar Inverter Faults and What They Mean",
    keyword: "solar inverter problems",
  },
  {
    topic: "Keeping Solar Panels Clean Through Harmattan: Does It Matter?",
    keyword: "solar panel cleaning",
  },

  // --- Electrical ---------------------------------------------------------------
  {
    topic: "Seven Electrical Warning Signs You Should Never Ignore at Home",
    keyword: "electrical warning signs home",
  },
  {
    topic: "What House Grounding Does — and Why Nigerian Homes Need It",
    keyword: "house grounding earthing",
  },
  {
    topic: "Why Lights Flicker in Your House and When to Call an Electrician",
    keyword: "flickering lights causes",
  },
  {
    topic: "MCB vs RCCB: Which Protects Your Home From What?",
    keyword: "mcb vs rccb",
  },
  {
    topic: "Wiring a Small Shop Safely: What Your Electrician Should Do",
    keyword: "shop wiring safety",
  },
];
