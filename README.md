# Moscool Technical Services — Next.js on Cloudflare Workers

Rewrite of the Flask app in `../moscooltech` as a Next.js App Router project that runs
on Cloudflare Workers (free plan, no payment card), with D1 as the database.

Stack: **vinext** (Next.js API surface on Vite) · React Server Components · TypeScript ·
Tailwind CSS v4 · Drizzle ORM over D1 · Zod · deployed with Wrangler.

The full plan, decisions and acceptance criteria live in `../nextjs-cloudflare-spec.md`.

## Rendering model (why this matters)

Workers Free allows **10 ms CPU per invocation**. Every public page is therefore
prerendered / ISR-cached so a normal visit touches no application code. Only the admin
area and form endpoints render dynamically.

- Public content routes: `export const revalidate = 300` plus `revalidatePath()` after
  an admin save, so edits appear within minutes without per-visitor regeneration.
- Static assets (`/_next/static/*`) are served from Cloudflare's asset store, which does
  not count toward the 100k requests/day limit.

## Local environment (proot / Android — read this first)

This repo lives on Android shared storage, which is mounted **noexec** and **cannot create
symlinks**. Two consequences:

1. `npm install` inside the repo fails on `node_modules/.bin` symlinks.
2. Native addons (Rolldown, Lightning CSS) cannot be mapped from that path, so
   `vite build` cannot run there.

Both are solved by building from a mirrored copy on an exec-capable filesystem:

| Path | Role |
| --- | --- |
| `~/work/moscooltech-next` (this repo) | source of truth, git history, editing |
| `/opt/node22` | Node 22 toolchain (system Node is 20; Cloudflare tooling needs ≥22) |
| `/opt/mt-build/moscooltech-next` | mirror where `npm install` / `build` / `dev` actually run |

Use the wrappers instead of calling npm directly:

```sh
sh scripts/setup-env.sh   # once per container: installs Node 22 to /opt/node22
sh scripts/cf-run.sh install
sh scripts/cf-run.sh dev      # dev server (http://localhost:3001)
sh scripts/cf-run.sh build    # production build
sh scripts/cf-run.sh deploy   # build + deploy to the Worker (needs auth, see below)
```

`cf-run.sh` mirrors the working tree to `/opt/mt-build` before every run, so edit files
here and just re-run it. Note the scripts are invoked with `sh` — the exec bit does not
survive on this filesystem.

## Cloudflare setup

One-time, in the Cloudflare dashboard (no card required for any of it):

```sh
# from /opt, with the mirrored tree
npx wrangler login                       # or export CLOUDFLARE_API_TOKEN in CI
npx wrangler d1 create moscooltech-db    # copy the database_id into wrangler.jsonc
npx wrangler kv namespace create VINEXT_KV_CACHE   # copy id into wrangler.jsonc
npx wrangler d1 migrations apply moscooltech-db --remote
```

Secrets (never commit these):

```sh
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put NEWSDATA_API_KEY
npx wrangler secret put AI_API_KEY
npx wrangler secret put CRON_SECRET
```

### Environment variables

| Name | Needed for |
| --- | --- |
| `ADMIN_PASSWORD` | admin login (single password, no user table) |
| `SESSION_SECRET` | HMAC key for the signed session cookie |
| `TURNSTILE_SECRET` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | spam protection on public forms |
| `NEWSDATA_API_KEY` | news fetching |
| `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL` | AI content studio |
| `SITE_URL` | canonical URLs, sitemap, `llms.txt` |
| `BUSINESS_ADDRESS`, `BUSINESS_LOCALITY`, `BUSINESS_REGION`, `BUSINESS_PHONE`, `BUSINESS_EMAIL` | local SEO / NAP data |
| `GOOGLE_REVIEW_URL` | review CTA |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 |
| `CRON_SECRET` | authenticates scheduled invocations |

## Automation

**Jobs.** There are three background jobs — `fetch_news`, `cleanup_news` and
`generate_ai` — all served by `POST /api/cron?job=<name>` and guarded by the
`CRON_SECRET` header (`x-cron-secret`).

`vinext` does not expose a `scheduled()` handler, so a Cloudflare Cron Trigger would
call a function that does not exist and `wrangler.jsonc` therefore has no `triggers`
block. Schedule the endpoint from cron-job.org, UptimeRobot or a GitHub Action instead:

```sh
curl -sS -X POST "https://moscooltech.workers.dev/api/cron?job=fetch_news" \
  -H "x-cron-secret: $CRON_SECRET"
```

Each job records itself in `job_runs` and is skipped once per UTC day; delete that row
to force a retry. The admin pages also run the news jobs directly, without the secret.

**Deploy.** `.github/workflows/deploy.yml` applies D1 migrations, builds and deploys on
every push to `master`. It needs two repository secrets — `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` — plus two repository variables —
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Those two are
inlined at build time, so a Worker secret is too late for them.

## Scripts

| Command | What it does |
| --- | --- |
| `sh scripts/setup-env.sh` | downloads Node 22 into `/opt/node22` |
| `sh scripts/cf-run.sh install` | mirrors the tree and runs `npm install` |
| `sh scripts/cf-run.sh dev` | dev server with HMR |
| `sh scripts/cf-run.sh build` | production build (RSC + SSR + client, prerender, ISR) |
| `sh scripts/cf-run.sh deploy` | builds and deploys the Worker |
