import { allPublishedPosts } from "@/db/queries";
import { siteUrl } from "@/lib/site";

export const revalidate = 300;

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const base = siteUrl();
  const posts = await allPublishedPosts();

  // Home lastmod reflects the newest content, not "today", so the date means
  // something to a crawler.
  const newest = posts.reduce(
    (latest, post) => (post.updatedAt > latest ? post.updatedAt : latest),
    new Date(0).toISOString(),
  );
  const lastmod = (newest || new Date().toISOString()).slice(0, 10);

  const staticPages: Array<[string, string]> = [
    ["/", "1.0"],
    ["/guides", "0.8"],
    ["/marketplace", "0.8"],
  ];

  const urls = [
    ...staticPages.map(
      ([path, priority]) =>
        `  <url>\n    <loc>${base}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`,
    ),
    ...posts.map((post) => {
      const path =
        post.postType === "article"
          ? `/guides/${post.slug}`
          : post.postType === "sale"
            ? "/marketplace"
            : `/work/${post.slug}`;
      const priority = post.postType === "article" ? "0.8" : "0.7";
      return `  <url>\n    <loc>${escape(base + path)}</loc>\n    <lastmod>${post.updatedAt.slice(0, 10)}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
    }),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
