import { db } from "@/db/index";
import { contactSubmissions, leadStatuses, leadNotes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const leadId = parseInt(params.id);
  const lead = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, leadId)).limit(1);

  if (!lead[0]) {
    return new Response("Lead not found", { status: 404 });
  }

  const notes = await db.select().from(leadNotes).where(eq(leadNotes.contactId, leadId)).orderBy(desc(leadNotes.createdAt));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lead Detail - ${lead[0].name} - MoscoolTech Admin</title>
  <link rel="stylesheet" href="/css/admin-dashboard.css" />
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>Lead Detail</h1>
      <div class="user-panel">
        <span>Admin</span>
        <a href="/admin/login?action=logout" class="btn-secondary">Logout</a>
      </div>
    </header>

    <section class="lead-detail">
      <div class="detail-section">
        <h2>Contact Information</h2>
        <p><strong>Name:</strong> ${lead[0].name}</p>
        <p><strong>Email:</strong> ${lead[0].email}</p>
        <p><strong>Phone:</strong> ${lead[0].phone || "Not provided"}</p>
        <p><strong>Service Needed:</strong> ${lead[0].serviceNeeded || "Not specified"}</p>
      </div>

      <div class="detail-section">
        <h2>Pipeline Status</h2>
        <p><strong>Current Status:</strong> ${leadStatuses.status || "new"}</p>
        <p><strong>Estimated Value:</strong> $${lead[0].estimatedValue || 0}</p>
      </div>

      <div class="detail-section">
        <h2>Notes</h2>
        ${notes.length === 0 ? `<p>No notes yet.</p>` : `
          <ul>
            ${notes.map((note) => `<li key="${note.id}"><p>${note.body}</p><p><small>${new Date(note.createdAt).toLocaleString()}</small></p></li>`).join("")}
          </ul>
        `}
      </div>

      <section class="add-note">
        <h3>Add Note</h3>
        <form method="POST" action="/admin/leads/${lead[0].id}/note">
          <textarea name="body" rows="3" placeholder="Add a note..." required></textarea>
          <button type="submit" class="btn btn-primary">Add Note</button>
        </form>
      </section>
    </section>
  </div>
</body>
</html>`;

  return new Response(html);
}