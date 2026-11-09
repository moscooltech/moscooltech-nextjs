import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Never prerendered: every page here reads the session cookie.
export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/ai", label: "AI studio" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <nav aria-label="Admin" className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-white hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-ink-muted hover:text-accent">
            View site
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost px-3 py-1.5 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
