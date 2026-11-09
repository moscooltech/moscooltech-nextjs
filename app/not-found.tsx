import Link from "next/link";
import { business } from "@/lib/site";

export default function NotFound() {
  const biz = business();

  return (
    <div className="container-page flex min-h-[60vh] flex-col justify-center py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">That page has moved on.</h1>
      <p className="mt-4 max-w-lg text-lg text-ink-soft">
        The link may be old or mistyped. Start from the home page, browse the guides, or just
        call us — we answer.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
        <Link href="/guides" className="btn-ghost">
          Read the guides
        </Link>
        <a href={biz.phoneHref} className="btn-ghost">
          Call {biz.phone}
        </a>
      </div>
    </div>
  );
}
