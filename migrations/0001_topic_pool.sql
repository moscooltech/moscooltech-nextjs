-- Topic pool for the daily auto-poster.
-- The pool used to live in lib/daily-topics.ts; it is a table now so the
-- system can refill itself: when the queue runs dry, the Worker asks Workers
-- AI to plan the next batch (source='ai') under editorial rules, seeded with
-- the first 30 hand-curated topics (source='curated').

CREATE TABLE IF NOT EXISTS topic_pool (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  keyword TEXT,
  category TEXT NOT NULL DEFAULT 'guides',
  tone TEXT NOT NULL DEFAULT 'practical',
  target_words INTEGER NOT NULL DEFAULT 1200,
  faq_count INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'queued',
  source TEXT NOT NULL DEFAULT 'curated',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS topic_pool_status_idx ON topic_pool (status);

INSERT INTO topic_pool (topic, keyword) VALUES
  ('How to Choose the Right AC Size for a Room in Nigeria (BTU Guide)', 'ac btu size for room'),
  ('Split vs Window AC: Which Suits a Nigerian Home Better?', 'split or window air conditioner'),
  ('Why Your AC Keeps Tripping the Circuit Breaker', 'air conditioner trips breaker'),
  ('Do Inverter Air Conditioners Really Save Electricity in Nigeria?', 'inverter ac power saving'),
  ('Getting Your AC Ready for Harmattan Dust', 'harmattan air conditioner maintenance'),
  ('Where to Place an AC Outdoor Unit in a Nigerian Compound', 'ac outdoor unit placement'),
  ('Buying a Used or Refurbished AC Without Getting Burned', 'used ac buying tips'),
  ('AC Gas Top-Up vs Leak Repair: What You Actually Need', 'ac gas refilling'),
  ('Floor Standing ACs for Shops and Halls: Pros, Cons and Costs', 'floor standing air conditioner'),
  ('How Often Should Commercial ACs Be Serviced? A Business Owner''s Schedule', 'commercial ac servicing schedule'),
  ('Deep Freezer Buying Guide for Nigerian Homes and Shops', 'deep freezer buying guide'),
  ('Freezer Running but Not Freezing? Causes and Fixes', 'freezer not freezing'),
  ('Cold Room Basics for Small Food Businesses in Nigeria', 'cold room installation'),
  ('How to Keep a Display Chiller Working in a Busy Shop', 'display chiller maintenance'),
  ('Fridge Not Cooling After a Power Outage? Start Here', 'fridge stopped cooling after power outage'),
  ('Protecting Your Fridge and TV From Voltage Surges', 'fridge voltage surge protector'),
  ('Manual vs Automatic Changeover Switch: Which Should You Install?', 'changeover switch installation'),
  ('How to Size a Home Inverter Before Buying One', 'how to size an inverter'),
  ('Monocrystalline vs Polycrystalline Panels for Nigerian Roofs', 'types of solar panels'),
  ('What Size Solar System Can Power a Fridge and a TV?', 'solar that can carry fridge and tv'),
  ('Lithium vs Tubular Batteries: Which Lasts Longer in Nigeria?', 'lithium vs tubular battery'),
  ('Why a Load Audit Should Come Before Any Solar Purchase', 'load audit for solar'),
  ('Hybrid vs Off-Grid Solar: Picking the Right Setup for Your Home', 'hybrid solar system nigeria'),
  ('Common Solar Inverter Faults and What They Mean', 'solar inverter problems'),
  ('Keeping Solar Panels Clean Through Harmattan: Does It Matter?', 'solar panel cleaning'),
  ('Seven Electrical Warning Signs You Should Never Ignore at Home', 'electrical warning signs home'),
  ('What House Grounding Does — and Why Nigerian Homes Need It', 'house grounding earthing'),
  ('Why Lights Flicker in Your House and When to Call an Electrician', 'flickering lights causes'),
  ('MCB vs RCCB: Which Protects Your Home From What?', 'mcb vs rccb'),
  ('Wiring a Small Shop Safely: What Your Electrician Should Do', 'shop wiring safety');
