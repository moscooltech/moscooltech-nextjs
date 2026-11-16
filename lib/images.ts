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

/**
 * Scene templates keyed by what the topic is about. The prompt must stay
 * purely visual: title-like phrasing ("how to", "guide") makes schnell bake
 * garbled lettering into the image, and negative phrasing ("no text") biases
 * it toward text — so neither ever appears here.
 */
function sceneFor(topic: string, keyword?: string | null): string {
  const hay = `${topic} ${keyword ?? ""}`.toLowerCase();

  if (/\bac\b|air condition|btu|hvac|split|cooling/.test(hay)) {
    return "a modern wall-mounted split air conditioner on a clean light-coloured wall of a tidy bright living room, its outdoor condenser unit on the wall below";
  }
  if (/freezer|fridge|refrigerat|chiller|cold room/.test(hay)) {
    return "a clean stainless steel commercial freezer and a glass-front display chiller stocked with bottled drinks, inside a tidy small neighbourhood shop";
  }
  if (/solar|panel|inverter|battery|lithium|tubular|hybrid|off-grid|changeover|load audit/.test(hay)) {
    return "dark rooftop solar photovoltaic panels mounted neatly on a residential roof under a clear sky, with a wall-mounted inverter and battery unit beside a doorway below";
  }
  if (/electr|wir|\bmcb\b|\brccb\b|breaker|ground|earth|flicker|surge|voltage|shock|switch/.test(hay)) {
    return "a tidy modern electrical distribution board with neat rows of small circuit breakers and colour-coded wiring inside an indoor panel";
  }
  return "a well-organised technician's workbench with professional air-conditioning gauges and electrical tools neatly arranged";
}

/** Builds an on-brand, purely visual image prompt from topic metadata. */
export function imagePrompt(topic: string, keyword?: string | null, category?: string | null): string {
  const scene =
    category === "portfolio"
      ? `a skilled technician in a plain navy polo shirt at work, ${sceneFor(topic, keyword)}`
      : sceneFor(topic, keyword);

  return [
    `Professional photograph of ${scene},`,
    "natural daylight, realistic detail, sharp focus,",
    "high-quality editorial photography for a home-services company in Lagos, Nigeria.",
  ].join(" ");
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
