import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

export function GET() {
  const base = siteUrl();
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /api/",
    "",
    "Allow: /post/",
    "Allow: /guides",
    "Allow: /marketplace",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
