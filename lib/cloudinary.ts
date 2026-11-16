import { bindings } from "@/db";

/**
 * Cloudinary upload for AI-generated post images.
 *
 * Only the resulting URL is stored in D1 (`posts.image_url`); the binary lives
 * on Cloudinary's free tier. Two auth modes are supported:
 *
 *  - Signed (recommended): CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY +
 *    CLOUDINARY_API_SECRET, all set as Worker secrets. The signature is the
 *    SHA-1 of the sorted form params plus the secret, per Cloudinary's docs.
 *  - Unsigned: CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET (a preset
 *    restricted to the target folder). No secret involved.
 *
 * Unconfigured means "skip images" — callers treat null as a soft failure so
 * a missing key never blocks a post from being written.
 */

export type UploadResult = { url: string; publicId: string };

export function cloudinaryConfigured(): boolean {
  const b = bindings();
  if (!b.CLOUDINARY_CLOUD_NAME) return false;
  return Boolean(b.CLOUDINARY_UPLOAD_PRESET) || Boolean(b.CLOUDINARY_API_KEY && b.CLOUDINARY_API_SECRET);
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Uploads image bytes to Cloudinary and returns its delivery URL.
 * Throws on failure — callers wrap this in their own error handling.
 */
export async function uploadImage(bytes: Uint8Array, contentType = "image/png"): Promise<UploadResult> {
  const b = bindings();
  const cloud = b.CLOUDINARY_CLOUD_NAME;
  if (!cloud) throw new Error("CLOUDINARY_CLOUD_NAME is not configured.");

  const folder = b.CLOUDINARY_FOLDER || "moscool";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: contentType }), "image.png");
  form.append("folder", folder);

  if (b.CLOUDINARY_UPLOAD_PRESET) {
    form.append("upload_preset", b.CLOUDINARY_UPLOAD_PRESET);
  } else {
    if (!b.CLOUDINARY_API_KEY || !b.CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary signed upload needs CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
    }
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // Only non-file params participate in the signature, sorted alphabetically.
    const params: Array<[string, string]> = [
      ["folder", folder],
      ["timestamp", timestamp],
    ].sort(([a], [z]) => (a < z ? -1 : 1));
    const toSign = params.map(([key, value]) => `${key}=${value}`).join("&");
    form.append("api_key", b.CLOUDINARY_API_KEY);
    form.append("timestamp", timestamp);
    form.append("signature", await sha1Hex(`${toSign}${b.CLOUDINARY_API_SECRET}`));
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Cloudinary responded ${response.status}: ${text.slice(0, 200)}`);
  }
  const payload = JSON.parse(text) as { secure_url?: string; public_id?: string };
  if (!payload.secure_url) throw new Error("Cloudinary returned no secure_url.");
  return { url: payload.secure_url, publicId: payload.public_id ?? "" };
}
