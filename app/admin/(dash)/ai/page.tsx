import { db } from "@/db/index";
import { contentTopics, aiGenerations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const topics = await db.select().from(contentTopics).orderBy(desc(contentTopics.createdAt));
  const generations = await db.select({ 
    id: aiGenerations.id,
    topic: aiGenerations.topic,
    model: aiGenerations.model,
    status: aiGenerations.status,
    durationMs: aiGenerations.durationMs,
    createdAt: aiGenerations.createdAt
  }).from(aiGenerations).orderBy(desc(aiGenerations.createdAt));

  const topicsHtml = topics.length === 0 
    ? `<p>No content topics found.</p>`
    : `<div class="topics-grid">
        ${topics.map((topic) => `<div class="topic-card" key="${topic.id}">
          <h3>${topic.topic}</h3>
          <p><strong>Keyword:</strong> ${topic.keyword || "—"}</p>
          <p><strong>Category:</strong> ${topic.category}</p>
          <p><strong>Tone:</strong> ${topic.tone}</p>
          <p><strong>Target Words:</strong> ${topic.targetWords}</p>
          <p><strong>FAQ Count:</strong> ${topic.faqCount}</p>
          <p><strong>Status:</strong> ${topic.status}</p>
          <a href="/admin/ai/topics/${topic.id}/edit" class="btn btn-sm">Edit</a>
        </div>`).join("")}
      </div>`
  
  const generationsHtml = generations.length === 0
    ? `<p>No AI generation jobs found.</p>`
    : `<div class="generations-table">
        <table>
          <thead>
            <tr>
              <th>Topic</th>
              <th>Model</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${generations.map((gen) => `<tr key="${gen.id}">
              <td>${gen.topic}</td>
              <td>${gen.model || "—"}</td>
              <td>${gen.status}</td>
              <td>${gen.durationMs ? `${gen.durationMs}ms` : "—"}</td>
              <td>${new Date(gen.createdAt).toLocaleString()}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Studio - MoscoolTech Admin</title>
  <link rel="stylesheet" href="/css/admin-dashboard.css" />
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>AI Studio</h1>
      <div class="user-panel">
        <span>Admin</span>
        <a href="/admin/login?action=logout" class="btn-secondary">Logout</a>
      </div>
    </header>

    <section class="ai-topics">
      <h2>Content Topics (${topics.length})</h2>
      ${topicsHtml}
    </section>

    <section class="ai-generations">
      <h2>AI Generation Jobs (${generations.length})</h2>
      ${generationsHtml}
    </section>

    <section class="create-topic">
      <h3>Create Content Topic</h3>
      <form method="POST" action="/admin/ai/topics" class="topic-form">
        <input type="hidden" name="status" value="queued" />
        
        <div class="form-group">
          <label>Topic</label>
          <input type="text" name="topic" required />
        </div>

        <div class="form-group">
          <label>Keyword</label>
          <input type="text" name="keyword" />
        </div>

        <div class="form-group">
          <label>Category</label>
          <select name="category">
            <option value="guides">Guides</option>
            <option value="portfolio">Portfolio</option>
          </select>
        </div>

        <div class="form-group">
          <label>Tone</label>
          <select name="tone">
            <option value="practical">Practical</option>
            <option value="formal">Formal</option>
            <option value="friendly">Friendly</option>
          </select>
        </div>

        <div class="form-group">
          <label>Target Words</label>
          <input type="number" name="targetWords" value="1200" />
        </div>

        <div class="form-group">
          <label>FAQ Count</label>
          <input type="number" name="faqCount" value="4" />
        </div>

        <button type="submit" class="btn btn-primary">Create Topic</button>
        <button type="button" onclick="window.history.back()" class="btn btn-secondary">Cancel</button>
      </form>
    </section>
  </div>
</body>
</html>`;

  return new Response(html);
}