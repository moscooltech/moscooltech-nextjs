import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "../actions";
import { adminPasswordConfigured, isAuthenticated } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  invalid: "That password is not correct.",
  rate: "Too many attempts. Try again in 15 minutes.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthenticated()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Single-password access. Sessions last 12 hours.
        </p>

        {!adminPasswordConfigured() ? (
          <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
            ADMIN_PASSWORD is not set on this Worker yet. Add it with{" "}
            <code className="font-mono text-xs">wrangler secret put ADMIN_PASSWORD</code>.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
            {ERRORS[error] || "Sign-in failed. Try again."}
          </p>
        ) : null}

        <form action={loginAction} className="card mt-6 flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Password</span>
            <input
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className="rounded-lg border border-line bg-paper px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          <button type="submit" className="btn-primary">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
