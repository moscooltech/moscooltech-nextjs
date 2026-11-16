import { eq } from "drizzle-orm";
import { bindings, db, schema } from "@/db";
import { cloudinaryConfigured, uploadImage } from "./cloudinary";

/**
 * AI post images: Workers AI text-to-image → Cloudinary → posts.image_url.
 *
 * The Free plan's Workers AI allocation covers a few images a day, so one
 * image per generated post is well within budget. Everything here is soft:
 * an image failure logs a reason and leaves the post imageless rather than
 * failing the post itself.
 */

const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

export type ImageOutcome =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/** Builds an on-brand, safe image prompt from topic metadata. */
export function imagePrompt(topic: string, keyword?: string | null, category?: string | null): string {
  const subject =
    category === "portfolio"
      ? `A technical services job scene illustrating: ${topic}.`
      : `A clean editorial photo for a practical guide about: ${topic}.`;

  return [
    subject,
    keyword ? `Main subject: ${keyword}.` : "",
    "Air conditioning, refrigeration, solar, inverter or electrical engineering context,",
    "Lagos Nigeria setting, bright natural daylight, modern well-kept equipment,",
    "professional composition, high detail.",
    "No text, no words, no letters, no numbers, no watermark, no logo, no signature.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 900);
}

/** Normalises the various shapes a Workers AI image model can return. */
async function resultToBytes(result: unknown): Promise<Uint8Array> {
  if (result instanceof ReadableStream) {
    return new Uint8Array(await new Response(result).arrayBuffer());
  }
  if (result instanceof ArrayBuffer) return new Uint8Array(result);
  if (result instanceof Uint8Array) return result;

  const record = result as { image?: ReadableStream; data?: unknown } | null;
  if (record?.image instanceof ReadableStream) {
    return new Uint8Array(await new Response(record.image).arrayBuffer());
  }
  // Some models return base64 under `data` or `image` as string.
  const base64 =
    typeof record?.data === "string"
      ? record.data
      : typeof (result as { image?: unknown })?.image === "string"
        ? ((result as { image: string }).image)
        : null;
  if (base64) {
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }
  throw new Error("Unrecognised image model response shape.");
}

/**
 * Generates an image for a topic and attaches it to the post.
 * Never throws: failures come back as { ok: false, reason }.
 */
export async function attachImageToPost(
  postId: number,
  meta: { topic: string; keyword?: string | null; category?: string | null },
): Promise<ImageOutcome> {
  try {
    const ai = bindings().AI;
    if (!ai) return { ok: false, reason: "Workers AI binding unavailable" };
    if (!cloudinaryConfigured()) return { ok: false, reason: "Cloudinary not configured" };

    const result = await ai.run(IMAGE_MODEL, {
      prompt: imagePrompt(meta.topic, meta.keyword, meta.category),
      steps: 4,
    });
    const bytes = await resultToBytes(result);
    if (!bytes.length) return { ok: false, reason: "Image model returned no bytes" };

    const uploaded = await uploadImage(bytes);
    await db()
      .update(schema.posts)
      .set({ imageUrl: uploaded.url, imageAlt: meta.topic.slice(0, 140) })
      .where(eq(schema.posts.id, postId));
    return { ok: true, url: uploaded.url };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Unknown image error" };
  }
}
