import { db } from "@/db/index";
import { contactSubmissions, leadStatuses } from "@/db/schema";
import { eq, count, avg } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  let query = db.select({
    id: contactSubmissions.id,
    name: contactSubmissions.name,
    email: contactSubmissions.email,
    phone: contactSubmissions.phone,
    serviceNeeded: contactSubmissions.serviceNeeded,
    status: leadStatuses.status,
    createdAt: contactSubmissions.createdAt,
  })
    .from(contactSubmissions)
    .leftJoin(leadStatuses, eq(contactSubmissions.id, leadStatuses.contactId));

  if (statusFilter) {
    query = query.where(eq(leadStatuses.status, statusFilter as string));
  }

  query = query.orderBy(desc(contactSubmissions.createdAt));

  const leads = await query;

  // Compute stats - these will be embedded as plain values
  const [{ count: totalCount }] = await db.select({ count: count() }).from(contactSubmissions);
  const [{ avg: avgValue }] = await db.select({ avg: avg(leadStatuses.estimatedValue) }).from(leadStatuses);
  const [{ count: statusCount }] = await db
    .select({ count: count() })
    .from(leadStatuses);

  // Format the average value as a string
  const formattedAvg = `$${String(avgValue || 0).replace(/\$(\d{3}(?=\d{2}\dyear)/g, '$1,').replace(/\d(?=(\d{3})+(?!\d))/g, ',')}`;

  const leadsTable = leads.length === 0
    ? `<p>No leads found.</p>`
    : `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Service Needed</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map((lead) => `
            <tr key="${lead.id}">
              <td>${lead.name}</td>
              <td>${lead.email}</td>
              <td>${lead.phone || "-"}</td>
              <td>${lead.serviceNeeded || "—"}</td>
              <td>${lead.status || "new"}</td>
              <td>${new Date(lead.createdAt).toLocaleDateString()}</td>
              <td>
                <a href="/admin/leads/${lead.id}/edit" class="btn btn-sm">Edit</a>
                <form method="POST" action="/admin/leads/${lead.id}" onsubmit="return confirm('Delete this lead?')">
                  <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                </form>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;

  const statsHtml = `
    <div class="stat-card">
      <h3>${totalCount}</h3>
      <p>Total Leads</p>
    </div>
    <div class="stat-card">
      <h3>${statusCount}</h3>
      <p>Statuses</p>
    </div>
    <div class="stat-card">
      <h3>${formattedAvg}</h3>
      <p>Avg Est. Value</p>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Leads Board - MoscoolTech Admin</title>
  <link rel="stylesheet" href="/css/admin-dashboard.css" />
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>Leads Board</h1>
      <div class="user-panel">
        <span>Admin</span>
        <a href="/admin/login?action=logout" class="btn-secondary">Logout</a>
      </div>
    </header>

    <section class="leads-list">
      <h2>All Leads (${leads.length})</h2>
      ${leadsTable}
    </section>

    <section class="stats-grid">
      ${statsHtml}
    </section>
  </div>
</body>
</html>`;

  return new Response(html);
}