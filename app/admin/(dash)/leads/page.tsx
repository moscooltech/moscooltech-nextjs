import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "new", label: "New", tone: "text-ink" },
  { key: "contacted", label: "Contacted", tone: "text-accent-ink" },
  { key: "quoted", label: "Quoted", tone: "text-accent-ink" },
  { key: "won", label: "Won", tone: "text-trust" },
  { key: "lost", label: "Lost", tone: "text-ink-muted" },
] as const;

const STAGE_KEYS = STAGES.map((stage) => stage.key as string);

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status && STAGE_KEYS.includes(status) ? status : undefined;

  const leads = await db()
    .select({
      id: schema.contactSubmissions.id,
      name: schema.contactSubmissions.name,
      email: schema.contactSubmissions.email,
      phone: schema.contactSubmissions.phone,
      serviceNeeded: schema.contactSubmissions.serviceNeeded,
      createdAt: schema.contactSubmissions.createdAt,
      status: schema.leadStatuses.status,
      estimatedValue: schema.leadStatuses.estimatedValue,
    })
    .from(schema.contactSubmissions)
    .leftJoin(
      schema.leadStatuses,
      eq(schema.contactSubmissions.id, schema.leadStatuses.contactId),
    )
    .where(filter ? eq(schema.leadStatuses.status, filter) : undefined)
    .orderBy(desc(schema.contactSubmissions.createdAt))
    .limit(100);

  const [totals] = await db()
    .select({ total: count() })
    .from(schema.contactSubmissions);

  const [pipeline] = await db()
    .select({ open: sql<number>`coalesce(sum(${schema.leadStatuses.estimatedValue}), 0)` })
    .from(schema.leadStatuses)
    .where(
      sql`${schema.leadStatuses.status} in ('contacted', 'quoted')`,
    );

  const badge = (value: string | null) =>
    STAGES.find((stage) => stage.key === (value ?? "new")) ?? STAGES[0];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">CRM</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Leads board</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {Number(totals?.total ?? 0)} enquiries · ₦
            {Number(pipeline?.open ?? 0).toLocaleString("en-NG")} open value
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/leads"
            className={`rounded-full border px-3 py-1.5 ${
              filter ? "border-line text-ink-soft" : "border-ink bg-ink text-paper"
            }`}
          >
            All
          </Link>
          {STAGES.map((stage) => (
            <Link
              key={stage.key}
              href={`/admin/leads?status=${stage.key}`}
              className={`rounded-full border px-3 py-1.5 ${
                filter === stage.key ? "border-ink bg-ink text-paper" : "border-line text-ink-soft"
              }`}
            >
              {stage.label}
            </Link>
          ))}
        </nav>
      </header>

      {leads.length === 0 ? (
        <p className="card p-6 text-sm text-ink-muted">
          No leads{filter ? ` with status “${filter}”` : ""} yet. Submissions from the
          contact form appear here.
        </p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((lead) => {
                const stage = badge(lead.status);
                return (
                  <tr key={lead.id} className="align-top">
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      <a href={`mailto:${lead.email}`} className="block hover:text-accent">
                        {lead.email}
                      </a>
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="block text-xs text-ink-muted">
                          {lead.phone}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{lead.serviceNeeded || "General"}</td>
                    <td className={`px-4 py-3 font-medium ${stage.tone}`}>{stage.label}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {lead.estimatedValue ? `₦${lead.estimatedValue.toLocaleString("en-NG")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {new Date(lead.createdAt).toLocaleDateString("en-NG")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/leads/${lead.id}`} className="font-medium text-accent">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
