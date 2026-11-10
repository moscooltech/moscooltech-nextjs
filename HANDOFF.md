# Handoff — Moscool Technical Services on Cloudflare Workers

Written 2026-11-10. This file is for whoever picks this up next, especially an agent
with Cloudflare MCP server access. It records **why the rewrite exists**, **what is
actually finished**, **what is broken**, and **what is blocked on credentials/tooling
that this environment did not have**.

Repository: <https://github.com/moscooltech/moscooltech-nextjs> (branch `master`)
Original app: `../moscooltech` — Flask, ~1,800-line `app.py`, Neon Postgres.

---

## 1. The intention

The original site is a Flask app owned by an HVAC / refrigeration / solar business in
Nigeria. It had grown into a full public site plus a small CRM, an AI content studio and
a news aggregator. It worked, but it needed a paid-or-card-gated host and a Postgres
instance. The owner wants the whole thing to run **at $0/month with no payment card on
file, and stay that way**.

That single constraint drives every other decision:

| Requirement | Consequence |
| --- | --- |
| No card, ever | Cloudflare Workers **Free** + D1 **Free** + Workers KV Free tier only. No R2, no Workers Image Resizing, no Hyperdrive, no paid Durable Objects, no Vercel/Netlify pro tiers. |
| Must survive 100k req/day | Public pages must be prerendered or ISR-cached. A page view may not run application code. |
| 10 ms CPU per invocation | No bcrypt/argon2 at login. No heavy HTML templating per request. No image processing. |
| 3 MiB compressed bundle | No headless browser, no large SDKs, no `next/image` runtime. |
| 5 Cron Triggers | Three used, two spare. |
| D1 Free: 500 MB, ~50 queries/invocation | All list reads are single queries; a batch counts as one. |
| SEO must not regress | Server-rendered HTML for every public URL, `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD, canonical URLs, 308 redirects for old URLs. |

**Functional target: full v1 parity** — the public marketing site (services, portfolio,
guides hub with FAQ schema, marketplace, news), the CRM (contact + feedback submissions,
lead statuses, lead notes), the AI content studio (topics → queued generation → drafts),
and the news pipeline (fetch → review → publish → cleanup) — plus the spam protection the
Flask app had (honeypot, Turnstile, per-IP rate limit) on every public form.

The owner's environment also matters and is easy to forget: this was developed in an
**Ubuntu proot inside Termux on an Android phone**. That constraint is permanent until
the work moves to a normal machine, so §7 documents it.

---

## 2. Stack and why

| Choice | Reason |
| --- | --- |
| **vinext** (Next.js App Router API surface on Vite 8 / Rolldown) | Next.js on Workers without the paid adapter; `next build` output works with Workers' asset + RSC model. Confirmed by measurement, see §3. |
| **React Server Components** | Public pages are static/ISR; admin pages are dynamic but still server-rendered. |
| **TypeScript** | The data layer is the risky part; types catch schema drift. |
| **Tailwind CSS v4** | No runtime CSS-in-JS (CPU budget), tiny output. |
| **Drizzle ORM over D1** | Typed SQL, no Prisma engine binary (impossible on Workers Free). |
| **Zod** | Validate every form payload at the edge before touching D1. |
| **Wrangler** for deploy/migrations/secrets/cron | `cf` CLI was deliberately skipped — Wrangler is the stable, documented path and needs no extra tooling. |

Rendering model, which is the part most likely to be broken by a careless edit:

- Public content routes → `export const revalidate = 300` (ISR) **plus**
  `revalidatePath()` after an admin save, so edits appear within minutes and the 100k/day
  budget is not spent regenerating on every visit.
- `/_next/static/*` → served from the Workers asset store, which does **not** count
  toward the request limit.
- Admin and API routes → dynamic, no caching.

---

## 3. Measured evidence (Gate 0)

Taken with `wrangler deploy --dry-run` on this exact tree. Keep these numbers as the
regression baseline — if a change pushes the bundle past ~2.4 MiB gzip, it will not
deploy on Free.

```
Total Upload: 932.79 KiB / gzip: 280.38 KiB      (limit 3 MiB gzip — 9% used)
SSR bundle: index.js  299.89 kB / gzip 94.97 kB
Build time: ~30 s
```

Production build (`sh scripts/cf-run.sh build`):

```
Pre-rendered 4 routes (19 skipped)
ISR (revalidate 300): /, /guides, /guides/:slug, /marketplace, /work/:slug
Dynamic: API routes, /admin/*
```

---

## 4. What is done

### 4.1 Infrastructure and config
- `wrangler.jsonc` — Worker `moscooltech`, compat date `2026-11-09`, `nodejs_compat`,
  assets from `dist/client` with `run_worker_first` so `/_next/static/*` bypasses the
  Worker, 3 cron triggers (`23 4 * * *`, `41 4 * * *`, `13 */6 * * *`), observability on.
  **The D1 `database_id` and KV `id` are placeholders** (`00000000000000000000000000000000`
  and `00000000-0000-0000-0000-000000000000`) — see §5.
- `vite.config.ts` — vinext with `kvDataAdapter()` (ISR cache in KV),
  `staticAssetsAdapter()` (CDN cache headers via the asset binding), `prerender.routes: "*"`.
- `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `drizzle.config.ts`.
- `scripts/setup-env.sh` — installs Node 22 into `/opt/node22`.
- `scripts/cf-run.sh` — mirrors the tree to `/opt/mt-build` and runs npm there. Required;
  see §7.
- `.gitignore` excludes `node_modules`, `dist`, `.wrangler`, `.env*`, `dev.vars`.

### 4.2 Data layer
- `db/schema.ts` — eleven tables: `posts`, `post_faqs`, `contact_submissions`,
  `lead_statuses`, `lead_notes`, `feedback_submissions`, `news_articles`,
  `content_topics`, `ai_generations`, `job_runs`, `rate_limits`. Note `rate_limits` is
  declared **before** the exported `schema` object; moving it breaks the Drizzle types.
- `db/index.ts` — `bindings()` reads the Worker `env` key-by-key inside a `try/catch`.
  This is load-bearing: at build-time prerender `cloudflare:workers` bindings do not exist
  and any property read throws, which used to fail the whole build. Do not "simplify" this
  into `env.DB`.
- `db/queries.ts` — `listPosts`, `listGuides`, `getPostBySlug`, `getPostById`,
  `faqsForPost`, `relatedPosts`, `latestNews`, `allPublishedPosts`, `postsByIds`, each
  wrapped in a `safe()` helper that returns empty data instead of throwing when bindings
  are absent.
- `migrations/0000_init.sql` — full DDL, applied with `wrangler d1 migrations apply`.
- `db/seed-data.json` + `db/seed.sql` — generated from the Flask app's
  `moscooltech/seed_data.py` by `scripts/build-seed-sql.mjs`: 9 posts, 24 FAQs. Regenerate
  rather than hand-editing `seed.sql`.

### 4.3 Public site (parity with Flask routes)
| Route | File | Notes |
| --- | --- | --- |
| `/` | `app/page.tsx` | Home, services, contact form |
| `/guides` | `app/guides/page.tsx` | ISR index |
| `/guides/[slug]` | `app/guides/[slug]/page.tsx` | Article + FAQPage JSON-LD |
| `/work/[slug]` | `app/work/[slug]/page.tsx` | Portfolio case study |
| `/marketplace` | `app/marketplace/page.tsx` | ISR |
| `/post/[id]` | `app/post/[id]/page.tsx` | 308 redirect to `/guides/[slug]` |
| `robots.txt`, `sitemap.xml`, `llms.txt` | `app/*/route.ts` | Generated from D1 |

Also: `app/layout.tsx` (HVACBusiness JSON-LD, GA4 tag when `GA_MEASUREMENT_ID` is set),
`app/not-found.tsx`, and components `site-header`, `site-footer`, `post-card`,
`article-body`, `contact-form`, `turnstile-widget`.

`<img>` is used everywhere, not `next/image` — Workers Image Optimization is a paid
feature. Do not "fix" this.

### 4.4 Public API and spam protection
- `app/api/contact/route.ts` — zod validation → honeypot field `company_website`
  (silently succeeds for bots) → per-IP fixed window (`5 / 15 min`) → Turnstile verify →
  insert into `contact_submissions`; returns a "call us instead" error on write failure so
  a lead is never lost silently.
- `app/api/feedback/route.ts` — same pattern into `feedback_submissions`.
- `lib/rate-limit.ts` — one `INSERT … ON CONFLICT … RETURNING` per call (D1 50-query
  budget), **fails open** so a counter error never blocks a real enquiry.
- `lib/turnstile.ts` — server-side siteverify with the client IP.

### 4.5 Admin
- `lib/auth.ts` — single shared `ADMIN_PASSWORD`, compared in constant-ish time; session
  is `<expiry>.<hmac-sha256>` over `admin:v1:<expiry>` via WebCrypto, 12 h TTL, HttpOnly +
  SameSite=Lax + Secure in production. **Deliberately not bcrypt** — 10 ms CPU budget.
  Requires `SESSION_SECRET`.
- `app/admin/login/page.tsx`, `app/admin/actions.ts` — `loginAction`, `logoutAction`,
  `updateLeadAction`, `addLeadNoteAction`, `savePostAction`, `deletePostAction`,
  `deleteNewsAction`, `fetchNewsAction`, `cleanupNewsAction`.
- `app/admin/(dash)/layout.tsx` + `page.tsx` — auth gate and dashboard home.
- **Working:** `leads/page.tsx`, `leads/[id]/page.tsx` (status + notes),
  `posts/page.tsx`, `posts/[id]/page.tsx`, `posts/new/page.tsx`,
  `components/admin/post-form.tsx`. These are real server components and are included in
  the green build.
- **Broken / stub:** `app/admin/(dash)/news/page.tsx` and `app/admin/(dash)/ai/page.tsx`.
  Both export `GET()` returning an HTML string — a **Route Handler inside a `page.tsx`**,
  which never renders as a page. They also post to endpoints that do not exist
  (`/admin/ai/topics`, `/admin/news`, `/admin/news/[id]`) and link a stylesheet
  (`/css/admin-dashboard.css`) that is not in the repo. Treat both as UI sketches: rewrite
  them as server components calling server actions, mirroring the posts pages.

### 4.6 Cron / background jobs
- `app/api/cron/route.ts` — `POST ?job=fetch_news|cleanup_news|generate_ai` guarded by an
  `x-cron-secret` header; idempotency via `job_runs`; `GET` returns per-job stats.
  **Three defects, see §6.1.**

---

## 5. What is blocked (needs a human, or an agent with Cloudflare MCP)

Nothing below could be completed from this container: there is no Cloudflare login here,
no account ID, and the interactive OAuth flow cannot run. Everything is nonetheless
scripted and ready.

### 5.1 Ordered checklist

```sh
# 1. Auth (once)
npx wrangler login                      # or export CLOUDFLARE_API_TOKEN

# 2. Create the two bindings, then paste the ids into wrangler.jsonc
npx wrangler d1 create moscooltech-db
npx wrangler kv namespace create VINEXT_KV_CACHE

# 3. Schema + content
npx wrangler d1 migrations apply moscooltech-db --remote
npx wrangler d1 execute moscooltech-db --remote --file=db/seed.sql

# 4. Secrets (never commit)
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET          # e.g. openssl rand -hex 32
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put NEWSDATA_API_KEY
npx wrangler secret put AI_API_KEY
npx wrangler secret put CRON_SECRET

# 5. Deploy
sh scripts/cf-run.sh deploy                     # = vinext-cloudflare deploy
```

Non-secret vars (`SITE_URL`, `BUSINESS_*`, `GOOGLE_REVIEW_URL`, `AI_PROVIDER`,
`AI_MODEL`, `AI_BASE_URL`) belong in a `"vars"` block in `wrangler.jsonc`.

### 5.2 The `NEXT_PUBLIC_*` trap

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is inlined at **build** time. Setting it as a Worker
secret does nothing — it must be present in the build environment (shell env or `.env`
read by Vite). If forms render without a widget after deploy, this is why.

### 5.3 What an MCP-capable agent can do that this one could not

The Cloudflare MCP servers remove the credential blocker entirely. With, e.g., the
official `cloudflare-bindings`, `cloudflare-observability` and `cloudflare-docs` servers
attached:

| Task | Instead of |
| --- | --- |
| `d1_database_create` / list databases, read the real `database_id` | dashboard + copy/paste |
| `d1_database_query` to apply `migrations/0000_init.sql` and `db/seed.sql`, and to verify row counts afterwards | `wrangler d1 execute` by hand |
| `kv_namespace_create` for `VINEXT_KV_CACHE`, read the id | dashboard |
| Write the two ids into `wrangler.jsonc` | manual edit |
| `list_workers` / deployment status to confirm the Worker exists and which version is live | dashboard |
| `query_worker_logs` (Loki) to debug 10 ms CPU-limit 1101 errors, D1 errors and 5xx spikes | guessing from a blank page |
| `search_cloudflare_docs` for the current Free-plan limits, `run_worker_first` semantics and Turnstile siteverify shape | web search |

Two things still need a human even with MCP: **creating the Turnstile widget**
(site key + secret key are issued in the dashboard) and **entering the admin password**
unless the agent is trusted with it. Everything else above is automatable.

Deliberately not done, and worth deciding on separately: a **GitHub Actions workflow** for
CI deploy. It needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repository secrets,
and pushing that token is the owner's call, not an agent's.

---

## 6. Known defects and rough edges

### 6.1 `app/api/cron/route.ts` — highest priority
1. `CRON_SECRET = "moscooltech-cron-2026-free"` is **hardcoded** instead of read from
   `bindings().CRON_SECRET`. The repo is public, so the guard is currently decorative.
2. The `job_runs` idempotency check selects **every** row and ignores `todayStart`;
   `fetch_news` therefore permanently reports "already run today" after its first success.
   It should be a `WHERE job_name = ? AND started_at >= ?` query.
3. Cron Triggers invoke a `scheduled()` export with a `CronTriggerEvent`, not an HTTP POST
   with `?job=`. There is no `scheduled` handler in this project. Either confirm vinext
   exposes one (and dispatch on `event.cron`), or drop the `triggers` block and drive
   `/api/cron` from an external scheduler. **Unverified** — verify before relying on it.
4. `generate_ai` reads `process.env.OPENAI_API_KEY` while everything else uses
   `bindings()`; under `nodejs_compat` this may be unpopulated. Use `bindings().AI_API_KEY`
   and honour `AI_BASE_URL`/`AI_MODEL`.

### 6.2 Other
- `app/admin/(dash)/news/page.tsx` and `ai/page.tsx` are non-functional route-handler
  stubs — see §4.5. Until they are rewritten, news review and AI topic creation have no
  UI, so v1 parity is **not** complete even though the tables and actions exist.
- `npm run typecheck` reports a large number of Drizzle inference errors that the build
  does not care about (Vite/Rolldown does not typecheck). Only `app/api/cron/route.ts`
  carries `// @ts-nocheck`. This is suppressed noise, not a clean typecheck — do not
  report it as passing.
- `db/index.ts` `resetDb()` assigns `cached = null` before `cached` is declared further
  down the module. It works via hoisting but reads as a bug; move the declaration up.
- `app/api/hello/route.ts` is scaffold leftover — safe to delete.
- No analytics verification: the GA4 tag is wired to `GA_MEASUREMENT_ID` but Cloudflare
  Web Analytics has to be switched on in the dashboard (it is not a code change).
- Nothing has been deployed yet, so **no page has ever been rendered against real D1
  bindings**. Prerender and build are verified; runtime behaviour is not.

---

## 7. Environment quirks (proot / Android — will bite you)

The repo sits on Android shared storage, which is mounted **noexec** and **cannot create
symlinks**.

- `npm install` in the repo fails on `node_modules/.bin`.
- Native addons (Rolldown, Lightning CSS) cannot be mapped from that path, so `npm run
  build` fails outside the wrapper.

Therefore:

| Path | Role |
| --- | --- |
| `~/storage/shared/work/moscooltech-next` | source of truth, git history |
| `/opt/node22` | Node 22 (system Node is 20; Cloudflare tooling needs ≥22) |
| `/opt/mt-build/moscooltech-next` | mirror where install/build/dev actually run |

Always: `sh scripts/cf-run.sh install|dev|build|deploy`. The scripts are invoked with
`sh` because the exec bit does not survive on this filesystem. On a normal Linux machine
none of this is needed — `npm install && npm run build` works directly, and §7 can be
ignored.

---

## 8. How to pick this up

1. Read §6.1 and fix the cron route first — it is public and cheap to get wrong.
2. Rewrite the two admin stubs (§4.5) so news and AI actually work; that closes parity.
3. Follow §5.1 to create bindings and deploy, then load `/`, `/guides`, a guide page,
   `/marketplace`, `/admin/login`, and submit a contact form against the live Worker.
4. Re-run `wrangler deploy --dry-run` and compare against §3 before calling it done.

### File map
```
app/                    public pages, admin area, API routes
components/             header, footer, cards, forms, turnstile
db/                     schema, binding accessor, queries, seed data
lib/                    auth, rate limit, turnstile, site constants
migrations/0000_init.sql
scripts/                setup-env.sh, cf-run.sh, build-seed-sql.mjs
wrangler.jsonc          bindings (PLACEHOLDER ids), crons, assets
vite.config.ts          vinext + cloudflare plugin + cache adapters
```

### Verification commands
```sh
sh scripts/cf-run.sh build            # must print the 5 green phases
npx wrangler deploy --dry-run         # must stay well under 3 MiB gzip
```
