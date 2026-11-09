import { listGuides } from "@/db/queries";
import { business, siteUrl } from "@/lib/site";

export const revalidate = 300;

export async function GET() {
  const base = siteUrl();
  const biz = business();
  const guides = await listGuides(20);

  const lines = [
    `# ${biz.name}`,
    "",
    "> AC repair, refrigeration, solar and inverter installation, and electrical services",
    "> for homes and businesses in Lagos Mainland and Ogun State, Nigeria.",
    "",
    "## Services",
    "- Air conditioning: installation, servicing, repair and duct cleaning",
    "- Refrigeration: freezers, chillers, cold rooms and display cases",
    "- Solar: hybrid/off-grid system design, installation and maintenance",
    "- Inverters: installation, battery replacement and troubleshooting",
    "- Electrical: wiring, panels, safety inspections and upgrades",
    "",
    "## Service areas",
    "Lagos Mainland (Ikeja, Yaba, Surulere, Maryland, Gbagada, Ogba) and",
    "Ogun State (Magboro, Mowe, Ibafo).",
    "",
    "## Contact",
    `- Address: ${biz.address}, ${biz.locality}, ${biz.region}, Nigeria`,
    `- Phone / WhatsApp: ${biz.phone}`,
    `- Email: ${biz.email}`,
    `- Website: ${base}/`,
    "- Hours: Mon-Fri 08:00-18:00; 24/7 emergency line",
    "",
    "## Key pages",
    `- [Home](${base}/)`,
    `- [Guides and tips](${base}/guides)`,
    `- [Marketplace](${base}/marketplace)`,
  ];

  if (guides.length) {
    lines.push("", "## Guides");
    for (const guide of guides) {
      lines.push(`- [${guide.title}](${base}/guides/${guide.slug})`);
    }
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
