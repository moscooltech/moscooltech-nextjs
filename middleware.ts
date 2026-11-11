import { NextResponse, type NextRequest } from "next/server";

/**
 * Global security middleware.
 *
 * 1. Security headers on every Worker-served response. (Static assets bypass
 *    the Worker entirely — they get the same baseline from `public/_headers`.)
 * 2. Cross-site request protection for the public form endpoints: a browser
 *    form POST from another origin is the classic CSRF vector. Cron is
 *    exempt because it authenticates with `x-cron-secret` and has no origin.
 */

const CSP = [
  "default-src 'self'",
  // Inline scripts: the pre-paint enhancement gate and JSON-LD blocks.
  // Inline styles: React's style attributes. A nonce pipeline is not
  // available in this RSC setup; everything else is locked to 'self'.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": CSP,
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "x-frame-options": "DENY",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

/** Form endpoints that must be same-origin POSTs. */
const FORM_ENDPOINTS = ["/api/contact", "/api/feedback"];

function applySecurityHeaders(headers: Headers): Headers {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return headers;
}

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  // Same-origin enforcement for the lead/feedback forms.
  if (
    request.method === "POST" &&
    FORM_ENDPOINTS.some((endpoint) => request.nextUrl.pathname === endpoint)
  ) {
    const originHost = hostOf(request.headers.get("origin")) ?? hostOf(request.headers.get("referer"));
    if (!originHost || originHost !== request.headers.get("host")) {
      return new NextResponse(JSON.stringify({ error: "Cross-origin submissions are not allowed." }), {
        status: 403,
        headers: applySecurityHeaders(
          new Headers({ "content-type": "application/json", "cache-control": "no-store" }),
        ),
      });
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response.headers);
  return response;
}

export const config = {
  // Everything except immutable build assets (those never reach the Worker).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
