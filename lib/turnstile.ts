import { bindings } from "@/db";

const ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token. When TURNSTILE_SECRET is unset (local development)
 * verification is skipped so the forms stay usable without Cloudflare keys.
 */
export async function verifyTurnstile(
  token: string | null,
  remoteIp?: string,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = bindings().TURNSTILE_SECRET;
  if (!secret) return { ok: true, reason: "not-configured" };
  if (!token) return { ok: false, reason: "missing-token" };

  try {
    const body = new FormData();
    body.set("secret", secret);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);

    const response = await fetch(ENDPOINT, { method: "POST", body });
    const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    return data.success ? { ok: true } : { ok: false, reason: data["error-codes"]?.join(",") };
  } catch {
    // A network failure to Cloudflare's endpoint should never eat a real lead.
    return { ok: true, reason: "verify-unavailable" };
  }
}

export function turnstileSiteKey(): string {
  return bindings().TURNSTILE_SITE_KEY || "";
}
