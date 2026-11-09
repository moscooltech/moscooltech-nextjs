import { db } from "@/db/index";
import { posts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { TurnstileWidget } from "@/components/turnstile-widget";

export async function GET(request: Request) {
  const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Posts - MoscoolTech Admin</title>
  <link rel="stylesheet" href="/css/admin-dashboard.css" />
</head>
<body>
  <div class="admin-container">
    <header class="admin-header">
      <h1>Posts</h1>
      <div class="user-panel">
        <span>Admin</span>
        <a href="/admin/login?action=logout" class="btn-secondary">Logout</a>
      </div>
    </header>

    <section class="posts-list">
      <h2>All Posts ({allPosts.length})</h2>
      {allPosts.length === 0 && <p>No posts found.</p>}
      <div class="posts-grid">
        {allPosts.map((post) => (
          <article class="post-card" key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.content?.substring(0, 150)}${post.content.length > 150 ? "..." : ""}</p>
            <div class="post-meta">
              <span>{post.category}</span>
              <span>{post.postType}</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <a href="/admin/posts/${post.id}/edit" class="btn btn-sm">Edit</a>
            <form method="POST" action="/admin/posts/${post.id}" onsubmit="return confirm('Delete this post?')">
              <button type="submit" class="btn btn-danger btn-sm">Delete</button>
            </form>
          </article>
        ))}
      </div>
    </section>

    <a href="/admin/posts/new" class="btn">New Post</a>
  </div>
</body>
</html>`
  );
}