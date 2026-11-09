import { permanentRedirect } from "next/navigation";
import { getPostById } from "@/db/queries";

/**
 * Legacy Flask URL (/post/<id>). Kept as a 308 redirect so existing links and
 * search results land on the canonical slug URL instead of a duplicate page.
 */
export default async function LegacyPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) permanentRedirect("/guides");

  const post = await getPostById(numeric);
  if (!post) permanentRedirect("/guides");

  if (post.postType === "article") permanentRedirect(`/guides/${post.slug}`);
  if (post.postType === "sale") permanentRedirect(`/marketplace#item-${post.id}`);
  permanentRedirect(`/work/${post.slug}`);
}
