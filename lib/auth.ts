import { cookies } from "next/headers";
import { bindings } from "@/db";

const COOKIE = "mt_admin";
const TTL_SECONDS = 12 * 60 * 60;

const encoder = new TextEncoder();

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Session token: `<expiry>.<hmac>`. HMAC-SHA256 over the expiry via WebCrypto —
 * deliberately not PBKDF2/bcrypt, because Workers Free only allows 10 ms of CPU
 * per request and a password hash would eat most of that budget.
 */
async function sign(secret: string, expiry: number) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`admin:v1:${expiry}`));
  return `${expiry}.${toHex(sig)}`;
}

function secret(): string | null {
  return bindings().SESSION_SECRET || null;
}

export function adminPasswordConfigured(): boolean {
  return Boolean(bindings().ADMIN_PASSWORD);
}

/** Constant-time-ish comparison to avoid leaking password length via timing. */
export function passwordMatches(candidate: string): boolean {
  const expected = bindings().ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = encoder.encode(candidate);
  const b = encoder.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export async function createSession(): Promise<void> {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET is not configured");
  const expiry = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const jar = await cookies();
  jar.set(COOKIE, await sign(key, expiry), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const key = secret();
  if (!key) return false;
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;

  const [expiryPart, signature] = raw.split(".");
  const expiry = Number(expiryPart);
  if (!Number.isFinite(expiry) || !signature) return false;
  if (expiry < Math.floor(Date.now() / 1000)) return false;

  const expected = await sign(key, expiry);
  if (expected.length !== raw.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ raw.charCodeAt(i);
  }
  return diff === 0;
}

export const SESSION_COOKIE = COOKIE;
