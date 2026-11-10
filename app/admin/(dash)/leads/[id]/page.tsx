import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { addLeadNoteAction, updateLeadAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const STAGES = ["new", "contacted", "quoted", "won", "lost"] as const;

const field =
  "rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent";

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const contactId = Number(id);
  if (!Number.isInteger(contactId)) notFound();

  const rows = await db()
    .select()
    .from(schema.contactSubmissions)
    .where(eq(schema.contactSubmissions.id, contactId))
    .limit(1);
  const lead = rows[0];
  if (!lead) notFound();

  const [statusRows, notes] = await Promise.all([
    db()
      .select()
      .from(schema.leadStatuses)
      .where(eq(schema.leadStatuses.contactId, contactId))
      .limit(1),
    db()
      .select()
      .from(schema.leadNotes)
      .where(eq(schema.leadNotes.contactId, contactId))
      .orderBy(desc(schema.leadNotes.createdAt))
      .limit(50),
  ]);

  const current = statusRows[0];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/leads" className="text-sm text-ink-muted hover:text-accent">
            ← Leads board
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">{lead.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Received {new Date(lead.createdAt).toLocaleString("en-NG")}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`mailto:${lead.email}`} className="btn-ghost px-4 py-2 text-sm">
            Email
          </a>
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} className="btn-primary px-4 py-2 text-sm">
              Call
            </a>
          ) : null}
        </div>
      </header>

      {error === "value" ? (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-ink">
          Estimated value must be a positive number.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Enquiry</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">Email</dt>
              <dd className="mt-0.5">{lead.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">Phone</dt>
              <dd className="mt-0.5">{lead.phone || "Not provided"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-ink-muted">Service</dt>
              <dd className="mt-0.5">{lead.serviceNeeded || "Not specified"}</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Message</p>
            <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{lead.message}</p>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Pipeline</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Current status:{" "}
            <span className="font-medium text-ink">{current?.status ?? "new"}</span>
          </p>

          <form action={updateLeadAction} className="mt-4 flex flex-col gap-3 text-sm">
            <input type="hidden" name="contact_id" value={contactId} />

            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Status</span>
              <select name="status" defaultValue={current?.status ?? "new"} className={field}>
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage[0].toUpperCase() + stage.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-medium">Estimated value (₦)</span>
              <input
                name="estimated_value"
                type="number"
                min="0"
                step="1000"
                defaultValue={current?.estimatedValue ?? ""}
                className={field}
              />
            </label>

            <button type="submit" className="btn-primary self-start">
              Save
            </button>
          </form>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">Notes ({notes.length})</h2>

        <form action={addLeadNoteAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="contact_id" value={contactId} />
          <textarea
            name="body"
            rows={3}
            required
            maxLength={2000}
            placeholder="What was discussed? Next follow-up?"
            className={`${field} w-full`}
          />
          <button type="submit" className="btn-primary self-start">
            Add note
          </button>
        </form>

        {notes.length ? (
          <ul className="mt-6 flex flex-col divide-y divide-line">
            {notes.map((note) => (
              <li key={note.id} className="py-3">
                <p className="whitespace-pre-line text-sm text-ink-soft">{note.body}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {new Date(note.createdAt).toLocaleString("en-NG")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">No notes yet.</p>
        )}
      </section>
    </div>
  );
}
