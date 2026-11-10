# Handoff — Moscool Technical Services on Cloudflare Workers

Updated 2026-11-10. This file is for whoever picks this up next, especially an agent
with Cloudflare MCP server access. It records **why the rewrite exists**, **what is
finished and verified**, **what is still missing**, and **what is blocked on
credentials/tooling this environment did not have**.

Repository: <https://github.com/moscooltech/moscooltech-nextjs> (branch `master`)
Original app: `../moscooltech` — Flask, ~1,800-line `app.py`, Neon Postgres.

---

## 1. The intention

The original site is a Flask app for an HVAC / refrigeration / solar / electrical
business in Ogun & Lagos, Nigeria. It grew into a public site plus a small CRM, an AI
content studio and a news aggregator. It worked, but it needed a card-gated host and a
Postgres instance. The owner wants all of it to run **at $0/month with no payment card
on file, and stay that way**.

That constraint drives every other decision:

| Requirement | Consequence |
| --- | --- |
| No card, ever | Workers **Free** + D1 **Free** + KV free tier only. No R2, no Workers Image Resizing, no Hyperdrive, no paid Durable Objects, no Vercel/Netlify paid tiers. |
| Survive 100k req/day | Public pages are prerendered or ISR-cached; a page view runs no application code. |
| 10 ms CPU per invocation | No bcrypt/argon2 at login, no per-request HTML templating, no image processing. |
| 3 MiB compressed bundle | No headless browser, no large SDKs, no `next/image` runtime. |
| D1 Free: 500 MB, ~50 queries/invocation | Single-query list reads; `batch()` where several writes are needed. |
| SEO must not regress | Server-rendered HTML for every public URL, plus `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD, canonicals and 308 redirects for old URLs. |

**Functional target: full v1 parity** — public marketing site (services, portfolio,
guides with FAQ schema, marketplace, news), CRM (contact + feedback submissions, lead
statuses, notes), AI content studio (topics → generation → unpublished drafts), and the
news pipeline (fetch → review → publish → cleanup), with the Flask app's spam protection
(honeypot, Turnstile, per-IP rate limit) on every public form.

The development environment matters and is easy to forget: this was built in an
**Ubuntu proot inside Termux on an Android phone**. See §7.

---

## 2. Stack and why

| Choice | Reason |
| --- | --- |
| **vinext** (Next.js App Router on Vite 8 / Rolldown) | Next.js on Workers without the paid adapter. |
| **React Server Components** | Public pages static/ISR; admin dynamic but server-rendered (no client JS for tables and forms). |
| **TypeScript** | The data layer is the risky part; types catch schema drift. |
| **Tailwind v4** | No runtime CSS-in-JS (CPU budget), small output. |
| **Drizzle over D1** | Typed SQL with no Prisma engine binary (impossible on Workers Free). |
| **Zod** | Validates every form payload, and the model's JSON, before it reaches D1. |
| **Wrangler** for deploy/migrations/secrets | `cf` was deliberately skipped; Wrangler is the stable documented path. |

Rendering model — the part most likely to be broken by a careless edit:

- Public content routes → `revalidate = 300` (ISR) **plus** `revalidatePath()` after an
  admin save, so edits appear immediately without regenerating per visitor.
- `/_next/static/*` → asset store, which does **not** count toward 100k requests/day.
- Admin and API routes → dynamic, uncached. The admin layout is `force-dynamic` because
  every page there reads the session cookie.

---

## 3. Measured evidence

`wrangler deploy --dry-run` against the current tree — keep this as the regression
baseline; past ~2.4 MiB gzip it will stop deploying on Free.

```
Total Upload: 1455.88 KiB / gzip: 404.10 KiB     (limit 3 MiB gzip — 13% used)
SSR bundle: ssr/index.js  300.18 kB / gzip 95.05 kB
Server index.js           273.41 kB / gzip 73.29 kB
Build time: ~20 s (5 phases)
```

Production build (`sh scripts/cf-run.sh build`), all five phases green:

```
Pre-rendered 4 routes (19 skipped)
ISR (300s): /, /guides, /guides/:slug, /marketplace, /work/:slug
Dynamic:    /admin, /admin/leads, /admin/leads/:id, /admin/posts,
            /admin/posts/:id, /admin/posts/new, /admin/news, /admin/ai
API:        /api/contact, /api/cron, /api/feedback, /robots.txt,
            /sitemap.xml, /llms.txt
```

Note `/admin/login` is reported as `?` (unclassified) by vinext's static analysis — it
calls `isAuthenticated()`, so it is dynamic in practice.

---

## 4. What is done

### 4.1 Infrastructure and config
- `wrangler.jsonc` — Worker `moscooltech`, compat date `2026-11-09`, `nodejs_compat`,
  assets from `dist/client` with `run_worker_first` so `/_next/static/*` bypasses the
  Worker, observability on. **D1 `database_id` and KV `id` are placeholders** (§5).
  There is deliberately **no `triggers` block** — see §4.6.
- `vite.config.ts` — vinext with `kvDataAdapter()` (ISR cache in KV),
  `staticAssetsAdapter()` (CDN cache headers) and `prerender.routes: "*"`.
- `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `drizzle.config.ts`,
  `package-lock.json` (so CI can use `npm ci`).
- `scripts/setup-env.sh` (Node 22 into `/opt/node22`), `scripts/cf-run.sh` (build mirror,
  §7), `scripts/build-seed-sql.mjs`.
- `.github/workflows/deploy.yml` — migrations → build → deploy on push to `master`, with
  `NEXT_PUBLIC_*` supplied at build time from repository variables.

### 4.2 Data layer
- `db/schema.ts` — eleven tables: `posts`, `post_faqs`, `contact_submissions`,
  `lead_statuses`, `lead_notes`, `feedback_submissions`, `news_articles`,
  `content_topics`, `ai_generations`, `job_runs`, `rate_limits`. `rate_limits` is
  declared **before** the exported `schema` object; moving it breaks the Drizzle types.
- `db/index.ts` — `bindings()` reads the Worker `env` key-by-key inside `try/catch`.
  Load-bearing: at build-time prerender `cloudflare:workers` bindings do not exist and
  any property read throws, which used to fail the build. Do not "simplify" to `env.DB`.
- `db/queries.ts` — public reads, each wrapped in `safe()` so an unmigrated database
  renders an honest empty page instead of a 500.
- `migrations/0000_init.sql` — full DDL.
- `db/seed-data.json` + `db/seed.sql` — generated from `moscooltech/seed_data.py`:
  9 posts, 24 FAQs. Regenerate with the script rather than editing `seed.sql`.

### 4.3 Public site (Flask route parity)
| Route | File | Notes |
| --- | --- | --- |
| `/` | `app/page.tsx` | Home, services, contact form |
| `/guides` | `app/guides/page.tsx` | ISR index |
| `/guides/[slug]` | `app/guides/[slug]/page.tsx` | Article + FAQPage JSON-LD |
| `/work/[slug]` | `app/work/[slug]/page.tsx` | Portfolio case study |
| `/marketplace` | `app/marketplace/page.tsx` | ISR |
| `/post/[id]` | `app/post/[id]/page.tsx` | 308 redirect to `/guides/[slug]` |
| `robots.txt`, `sitemap.xml`, `llms.txt` | `app/*/route.ts` | Generated from D1 |

Also `app/layout.tsx` (HVACBusiness JSON-LD, GA4 when `GA_MEASUREMENT_ID` is set),
`app/not-found.tsx`, and components `site-header`, `site-footer`, `post-card`,
`article-body`, `contact-form`, `turnstile-widget`.

`<img>` is used everywhere, never `next/image` — Workers Image Optimization is paid.

### 4.4 Public API and spam protection
- `app/api/contact/route.ts` — Zod validation → honeypot field `company_website`
  (bots get a fake success) → per-IP fixed window (5 / 15 min) → Turnstile → insert into
  `contact_submissions`; a write failure returns "call us instead" rather than losing a
  lead silently.
- `app/api/feedback/route.ts` — same pattern into `feedback_submissions`.
- `lib/rate-limit.ts` — one `INSERT … ON CONFLICT … RETURNING` per check (D1 budget),
  **fails open** so a counter error never blocks a real enquiry.
- `lib/turnstile.ts` — server-side siteverify with the client IP; skips verification when
  `TURNSTILE_SECRET` is unset so local development works.

### 4.5 Admin (all pages are real server components)
- `lib/auth.ts` — single shared `ADMIN_PASSWORD`, compared in constant-ish time; session
  cookie is `<expiry>.<hmac-sha256>` over `admin:v1:<expiry>` via WebCrypto, 12 h TTL,
  HttpOnly + SameSite=Lax + Secure in production. **Deliberately not bcrypt** — 10 ms
  CPU budget. Requires `SESSION_SECRET`.
- `app/admin/actions.ts` — `loginAction`, `logoutAction`, `updateLeadAction`,
  `addLeadNoteAction`, `savePostAction`, `deletePostAction`, `createNewsAction`,
  `deleteNewsAction`, `fetchNewsAction`, `cleanupNewsAction`, `createTopicAction`,
  `generateTopicAction`, `requeueTopicAction`, `deleteTopicAction`.
- Pages, all `force-dynamic` and rendered from `db()` with server actions for writes:
  - `/admin` — overview: counts, pipeline by stage, open value, latest leads/posts/news.
  - `/admin/leads` — filterable board (status chips from `searchParams`), open value.
  - `/admin/leads/[id]` — enquiry detail, status + estimated value form, notes timeline.
  - `/admin/posts` — every post with type, state badge, edit and delete.
  - `/admin/posts/[id]`, `/admin/posts/new` — `components/admin/post-form.tsx`.
  - `/admin/news` — fetch / cleanup / add-by-hand / delete, with result banners.
  - `/admin/ai` — topic queue with per-topic generate + requeue + delete, recent runs.

Previous revision of this repo shipped those seven pages as `GET()` route handlers inside
`page.tsx` files, which never rendered. That is fixed; the build now classifies them as
dynamic pages (§3).

### 4.6 Jobs and AI
- `lib/news.ts` — `fetchNews()` (keyword-filtered NewsData.io pull, one `D1 batch()`) and
  `cleanupNews()` (30-day prune of API-fetched items only). Shared by admin and cron.
- `lib/ai.ts` — `generateDraft()` against any OpenAI-compatible `/chat/completions`,
  `response_format: json_object`, 25 s `AbortSignal.timeout`, output validated with Zod.
  Config: `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`.
- `lib/generate.ts` — turns one `content_topics` row into an **unpublished** draft post
  (+ FAQs, + `ai_generations` row), recording failures on the topic for requeue.
- `lib/jobs.ts` — `runJob(name)`, `alreadyRanToday()` and `jobStats()` over real
  `job_runs` columns (`id`, `job`, `ran_at`, `result`).
- `app/api/cron/route.ts` — `POST ?job=fetch_news|cleanup_news|generate_ai` authorised by
  a **constant-time** check against `bindings().CRON_SECRET`; fails closed when the secret
  is unset. `GET` returns recent runs.
- `generate_ai` drains at most **two** queued topics per invocation so one run cannot
  exceed the request timeout.

**`scheduled()` is not available.** vinext exports no scheduled handler (grep of the
installed package shows none), so a Cloudflare Cron Trigger would invoke a function that
does not exist. The `triggers` block was therefore removed; drive `/api/cron` from
cron-job.org, UptimeRobot or a GitHub Action. If a future vinext release adds
`scheduled()`, restore the three crons and dispatch on `event.cron`.

---

## 5. What is blocked (needs a human, or Cloudflare MCP)

No Cloudflare login or account ID exists in this container, and interactive OAuth cannot
run. Everything below is scripted and ready.

### 5.1 Ordered checklist

```sh
# 1. Auth (once)
npx wrangler login                      # or export CLOUDFLARE_API_TOKEN

# 2. Create both bindings, then paste the ids into wrangler.jsonc
npx wrangler d1 create moscooltech-db
npx wrangler kv namespace create VINEXT_KV_CACHE

# 3. Schema + content
npx wrangler d1 migrations apply moscooltech-db --remote
npx wrangler d1 execute moscooltech-db --remote --file=db/seed.sql

# 4. Secrets (never commit)
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET          # openssl rand -hex 32
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put NEWSDATA_API_KEY
npx wrangler secret put AI_API_KEY
npx wrangler secret put CRON_SECRET

# 5. Deploy
sh scripts/cf-run.sh deploy
```

Non-secret vars (`SITE_URL`, `BUSINESS_*`, `GOOGLE_REVIEW_URL`, `AI_PROVIDER`,
`AI_MODEL`, `AI_BASE_URL`) belong in a `"vars"` block in `wrangler.jsonc`.

### 5.2 The `NEXT_PUBLIC_*` trap

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_GA_MEASUREMENT_ID` are inlined at
**build** time. Setting them as Worker secrets does nothing — they must be present in the
build environment. The GitHub workflow reads them from repository **variables** for this
reason. If forms render without a Turnstile widget after deploy, this is why.

### 5.3 GitHub Actions

`.github/workflows/deploy.yml` exists but will fail until two repository secrets
(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) and the two variables above are set.
Adding a token is the owner's decision, not an agent's.

### 5.4 What an MCP-capable agent can do that this one could not

With `cloudflare-bindings`, `cloudflare-observability` and `cloudflare-docs` attached:

| Task | Instead of |
| --- | --- |
| `d1_database_create`, list databases, read the real `database_id` | dashboard + copy/paste |
| `d1_database_query` to apply `migrations/0000_init.sql` / `db/seed.sql` and verify row counts | `wrangler d1 execute` by hand |
| `kv_namespace_create` for `VINEXT_KV_CACHE`, read the id | dashboard |
| Write both ids into `wrangler.jsonc` | manual edit |
| `list_workers` to confirm the Worker and live version | dashboard |
| `query_worker_logs` for 1101 CPU-limit errors, D1 errors, 5xx spikes | guessing from a blank page |
| `search_cloudflare_docs` for current Free limits, `run_worker_first`, Turnstile siteverify | web search |

Still needs a human even with MCP: **creating the Turnstile widget** (site key + secret
are issued in the dashboard) and **choosing the admin password**.

---

## 6. Known gaps

- **Typecheck is not clean.** `npm run typecheck` reports Drizzle inference errors that
  the build ignores (Rolldown does not typecheck). No file uses `@ts-nocheck` any more,
  but this is suppressed-by-not-running noise, not a passing typecheck.
- `db/index.ts` `resetDb()` assigns `cached = null` before `cached` is declared further
  down the module. Works via hoisting, reads as a bug; move the declaration up.
- `app/api/hello/route.ts` is scaffold leftover — safe to delete.
- **Nothing has been deployed**, so no page has rendered against real D1/KV bindings.
  Build, prerender and bundle size are verified; runtime behaviour is not.
- Cloudflare Web Analytics must be switched on in the dashboard; it is not a code change.
  GA4 is wired to `GA_MEASUREMENT_ID` but unverified in a browser.
- `AI_PROVIDER` is informational only — the code speaks the OpenAI chat shape regardless.
- News `description` is rendered with `line-clamp-3`, which needs no plugin in Tailwind
  v4 but will silently do nothing if the utility is absent.

---

## 7. Environment quirks (proot / Android — will bite you)

The repo sits on Android shared storage, mounted **noexec**, and **cannot create
symlinks**.

- `npm install` in the repo fails on `node_modules/.bin`.
- Native addons (Rolldown, Lightning CSS) cannot be mapped from that path, so `npm run
  build` fails outside the wrapper.

| Path | Role |
| --- | --- |
| `~/storage/shared/work/moscooltech-next` | source of truth, git history |
| `/opt/node22` | Node 22 (system Node is 20; Cloudflare tooling needs ≥22) |
| `/opt/mt-build/moscooltech-next` | mirror where install/build/dev actually run |

Always `sh scripts/cf-run.sh install|dev|build|deploy`; scripts are invoked with `sh`
because the exec bit does not survive on this filesystem. On a normal Linux machine this
whole section is irrelevant — `npm ci && npm run build` works directly.

---

## 8. How to pick this up

1. Follow §5.1 to create bindings and deploy, then load `/`, `/guides`, a guide page,
   `/marketplace`, `/admin/login`, and submit a contact form against the live Worker.
2. Exercise the admin: move a lead through statuses, add a note, save a post, fetch news,
   add a hand-written item, queue a topic and generate a draft.
3. Wire the schedule (§4.6) and confirm `job_runs` fills up.
4. Re-run `wrangler deploy --dry-run` and compare with §3 before calling it done.

### File map
```
app/                    public pages, admin area, API routes
components/             header, footer, cards, forms, turnstile, admin post form
db/                     schema, binding accessor, queries, seed data
lib/                    auth, rate-limit, turnstile, site, slug, news, ai, generate, jobs
migrations/0000_init.sql
scripts/                setup-env.sh, cf-run.sh, build-seed-sql.mjs
.github/workflows/      deploy.yml
wrangler.jsonc          bindings (PLACEHOLDER ids), assets
vite.config.ts          vinext + cloudflare plugin + cache adapters
```

### Verification commands
```sh
sh scripts/cf-run.sh build                    # 5 green phases
npx wrangler deploy --dry-run --config dist/server/wrangler.json   # bundle budget
```
