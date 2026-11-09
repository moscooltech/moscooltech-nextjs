import { bindings } from "@/db";

/**
 * Fixed-window rate limiter backed by D1.
 *
 * D1 allows 50 queries per invocation, so this costs one statement per call and
 * is used sparingly (public forms and admin login only). A failure to write the
 * counter must never block a legitimate submission, so errors fail open.
 */
export async function consume(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);

  try {
    const row = await bindings()
      .DB.prepare(
        `INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END,
           window_start = ?2
         RETURNING count`,
      )
      .bind(bucket, windowStart)
      .first<{ count: number }>();

    const count = row?.count ?? 1;
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

/** Best-effort client IP. Cloudflare always sets CF-Connecting-IP. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
