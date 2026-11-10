import { bindings } from "@/db";
import { isJobName, jobStats, runJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * HTTP entrypoint for the background jobs.
 *
 * vinext does not expose a `scheduled()` handler, so Cloudflare Cron Triggers
 * cannot call these directly. Point an external scheduler (cron-job.org,
 * UptimeRobot, a GitHub Action) at:
 *
 *   POST /api/cron?job=fetch_news     with header  x-cron-secret: <CRON_SECRET>
 *
 * Failing closed matters: with no CRON_SECRET configured the endpoint is inert
 * rather than open to the internet.
 */
function authorised(request: Request): boolean {
  const expected = bindings().CRON_SECRET;
  if (!expected) return false;

  const given = request.headers.get("x-cron-secret") ?? "";
  if (given.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request): Promise<Response> {
  if (!authorised(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const job = new URL(request.url).searchParams.get("job") ?? "";
  if (!isJobName(job)) {
    return Response.json(
      { error: "Unknown job", jobs: ["fetch_news", "cleanup_news", "generate_ai"] },
      { status: 400 },
    );
  }

  try {
    const outcome = await runJob(job);
    return Response.json({ job, ...outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ job, error: message }, { status: 500 });
  }
}

/** Recent run history, for the admin dashboard and for smoke checks. */
export async function GET(request: Request): Promise<Response> {
  if (!authorised(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ runs: await jobStats() });
}
