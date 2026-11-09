import { db } from "@/db/index";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const postId = parseInt(params.id);
  const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);

  if (!post[0]) {
    return new Response("Post not found", { status: 404 });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Edit Post - ${post[0].title} - MoscoolTech Admin</title>
  <link rel="stylesheet" href="/css/admin-dashboard.css" />
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>Edit Post</h1>
      <div class="user-panel">
        <span>Admin</span>
        <a href="/admin/login?action=logout" class="btn-secondary">Logout</a>
      </div>
    </header>

    <section class="post-editor">
      <form method="POST" action="/admin/posts/${post[0].id}" class="post-form">
        <input type="hidden" name="id" value="${post[0].id}" />
        
        <div class="form-group">
          <label>Title</label>
          <input type="text" name="title" value="${post[0].title}" required />
        </div>

        <div class="form-group">
          <label>Slug</label>
          <input type="text" name="slug" value="${post[0].slug}" required />
        </div>

        <div class="form-group">
          <label>Category</label>
          <input type="text" name="category" value="${post[0].category}" required />
        </div>

        <div class="form-group">
          <label>Post Type</label>
          <select name="postType">
            <option value="portfolio" ${post[0].postType === "portfolio" ? "selected" : ""}>Portfolio</option>
            <option value="guide" ${post[0].postType === "guide" ? "selected" : ""}>Guide</option>
          </select>
        </div>

        <div class="form-group">
          <label>Published</label>
          <select name="published">
            <option value="true" ${post[0].published ? "selected" : ""}>Yes</option>
            <option value="false" ${!post[0].published ? "selected" : ""}>No</option>
          </select>
        </div>

        <div class="form-group">
          <label>Price</label>
          <input type="number" name="price" value="${post[0].price || 0}" />
        </div>

        <div class="form-group">
          <label>Currency</label>
          <input type="text" name="currency" value="${post[0].currency || "NGN"}" />
        </div>

        <div class="form-group">
          <label>Negotiable</label>
          <select name="negotiable">
            <option value="true" ${post[0].negotiable ? "selected" : ""}>Yes</option>
            <option value="false" ${!post[0].negotiable ? "selected" : ""}>No</option>
          </select>
        </div>

        <div class="form-group">
          <label>Item Link</label>
          <input type="url" name="itemLink" value="${post[0].itemLink || ""}" />
        </div>

        <div class="form-group">
          <label>Video URL</label>
          <input type="url" name="videoUrl" value="${post[0].videoUrl || ""}" />
        </div>

        <h4>Content</h4>
        <textarea name="content" rows="10" required>${post[0].content}</textarea>

        <div class="form-group">
          <label>Meta Description</label>
          <input type="text" name="metaDescription" value="${post[0].metaDescription || ""}" />
        </div>

        <div class="form-group">
          <label>Image URL</label>
          <input type="url" name="imageUrl" value="${post[0].imageUrl || ""}" />
        </div>

        <div class="form-group">
          <label>Image Alt</label>
          <input type="text" name="imageAlt" value="${post[0].imageAlt || ""}" />
        </div>

        <button type="submit" class="btn btn-primary">Save Post</button>
        <button type="button" onclick="window.history.back()" class="btn btn-secondary">Cancel</button>
      </form>
    </section>
  </div>
</body>
</html>`;

  return new Response(html);
}