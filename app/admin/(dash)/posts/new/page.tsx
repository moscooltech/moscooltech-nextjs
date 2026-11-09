import { db } from "@/db/index";
import { posts } from "@/db/schema";
import { eq, max } from "drizzle-orm";

export async function GET(request: Request) {
  const lastPost = await db.select({ id: posts.id }).from(posts).orderBy(desc(posts.id)).limit(1);
  const newId = lastPost[0]?.id ? lastPost[0].id + 1 : 1;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Post - MoscoolTech Admin</title>
  <link rel="stylesheet" href="/css/admin-dashboard.css" />
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>New Post</h1>
      <div class="user-panel">
        <span>Admin</span>
        <a href="/admin/login?action=logout" class="btn-secondary">Logout</a>
      </div>
    </header>

    <section class="post-editor">
      <form method="POST" action="/admin/posts" class="post-form">
        <input type="hidden" name="id" value="${newId}" />
        
        <div class="form-group">
          <label>Title</label>
          <input type="text" name="title" required />
        </div>

        <div class="form-group">
          <label>Slug</label>
          <input type="text" name="slug" required />
        </div>

        <div class="form-group">
          <label>Category</label>
          <input type="text" name="category" value="general" required />
        </div>

        <div class="form-group">
          <label>Post Type</label>
          <select name="postType">
            <option value="portfolio">Portfolio</option>
            <option value="guide">Guide</option>
          </select>
        </div>

        <div class="form-group">
          <label>Published</label>
          <select name="published">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div class="form-group">
          <label>Price</label>
          <input type="number" name="price" value="0" />
        </div>

        <div class="form-group">
          <label>Currency</label>
          <input type="text" name="currency" value="NGN" />
        </div>

        <div class="form-group">
          <label>Negotiable</label>
          <select name="negotiable">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div class="form-group">
          <label>Item Link</label>
          <input type="url" name="itemLink" />
        </div>

        <div class="form-group">
          <label>Video URL</label>
          <input type="url" name="videoUrl" />
        </div>

        <h4>Content</h4>
        <textarea name="content" rows="10" required></textarea>

        <div class="form-group">
          <label>Meta Description</label>
          <input type="text" name="metaDescription" />
        </div>

        <div class="form-group">
          <label>Image URL</label>
          <input type="url" name="imageUrl" />
        </div>

        <div class="form-group">
          <label>Image Alt</label>
          <input type="text" name="imageAlt" />
        </div>

        <button type="submit" class="btn btn-primary">Create Post</button>
        <button type="button" onclick="window.history.back()" class="btn btn-secondary">Cancel</button>
      </form>
    </section>
  </div>
</body>
</html>`;

  return new Response(html);
}