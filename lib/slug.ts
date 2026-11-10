import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 240) || "article"
  );
}

/** Appends -2, -3, … until the slug is free (or the caller's own post). */
export async function uniqueSlug(title: string, ignoreId?: number): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const existing = await db()
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.slug, candidate))
      .limit(1);
    if (!existing.length || existing[0].id === ignoreId) return candidate;
    candidate = `${base.slice(0, 230)}-${i}`;
  }
  return `${base.slice(0, 230)}-${Date.now()}`;
}
