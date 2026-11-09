import { db } from "@/db/index";
import { newsArticles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const allNews = await db.select().from(newsArticles).orderBy(desc(newsArticles.pubDate));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>News Management - MoscoolTech Admin</title>
  <link rel="stylesheet" href="/css/admin-dashboard.css" />
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>News Management</h1>
      <div class="user-panel">
        <span>Admin</span>
        <a href="/admin/login?action=logout" class="btn-secondary">Logout</a>
      </div>
    </header>

    <section class="news-list">
      <h2>News Articles (${allNews.length})</h2>
      ${allNews.length === 0 ? `<p>No news articles found.</p>` : `
        <div class="news-grid">
          ${allNews.map((article) => `
            <article class="news-card" key="${article.id}">
              <h3>${article.title}</h3>
              <p>${article.description || "No description"}</p>
              <div class="news-meta">
                <span>${article.sourceId || "—"}</span>
                <span>${new Date(article.pubDate).toLocaleDateString()}</span>
              </div>
              <a href="/admin/news/${article.id}/edit" class="btn btn-sm">Edit</a>
              <form method="POST" action="/admin/news/${article.id}" onsubmit="return confirm('Delete this news article?')">
                <button type="submit" class="btn btn-danger btn-sm">Delete</button>
              </form>
            </article>
          `).join("")}
        </div>
      `}
    </section>

    <section class="add-news">
      <h3>Add News Article</h3>
      <form method="POST" action="/admin/news" class="news-form">
        <input type="hidden" name="apiSource" value="manual" />
        
        <div class="form-group">
          <label>Title</label>
          <input type="text" name="title" required />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="3" required></textarea>
        </div>

        <div class="form-group">
          <label>Link</label>
          <input type="url" name="link" required />
        </div>

        <div class="form-group">
          <label>Source ID</label>
          <input type="text" name="sourceId" />
        </div>

        <div class="form-group">
          <label>Article ID</label>
          <input type="text" name="articleId" />
        </div>

        <button type="submit" class="btn btn-primary">Add News</button>
        <button type="button" onclick="window.history.back()" class="btn btn-secondary">Cancel</button>
      </form>
    </section>
  </div>
</body>
</html>`;

  return new Response(html);
}