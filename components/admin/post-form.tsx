import type { Post } from "@/db/schema";
import { savePostAction } from "@/app/admin/actions";

const TYPES = [
  { value: "portfolio", label: "Portfolio / case study" },
  { value: "article", label: "Guide article" },
  { value: "sale", label: "Marketplace item" },
];

const field = "rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent";

export function PostForm({ post }: { post?: Post }) {
  return (
    <form action={savePostAction} className="flex flex-col gap-5">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Title</span>
          <input name="title" defaultValue={post?.title} required maxLength={200} className={field} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Type</span>
          <select name="post_type" defaultValue={post?.postType ?? "portfolio"} className={field}>
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Category</span>
          <input name="category" defaultValue={post?.category ?? "general"} className={field} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Meta description (160 chars)</span>
          <input
            name="meta_description"
            defaultValue={post?.metaDescription ?? ""}
            maxLength={160}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Image URL</span>
          <input
            name="image_url"
            defaultValue={post?.imageUrl ?? ""}
            placeholder="https://res.cloudinary.com/…"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Image alt text</span>
          <input name="image_alt" defaultValue={post?.imageAlt ?? ""} className={field} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Price (₦)</span>
          <input
            name="price"
            type="number"
            min="0"
            step="100"
            defaultValue={post?.price ?? ""}
            className={field}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">External listing URL</span>
          <input name="item_link" defaultValue={post?.itemLink ?? ""} className={field} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Content</span>
        <span className="text-xs text-ink-muted">
          Line prefixes: <code>## </code> heading, <code>### </code> subheading, <code>- </code> list
          item, <code>**bold**</code>. Blank line separates paragraphs.
        </span>
        <textarea
          name="content"
          defaultValue={post?.content}
          required
          rows={18}
          className={`${field} font-mono text-[13px] leading-6`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={post?.published ?? false} />
          Published
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="negotiable" defaultChecked={post?.negotiable ?? true} />
          Price negotiable
        </label>
      </div>

      <button type="submit" className="btn-primary self-start">
        {post ? "Save changes" : "Create post"}
      </button>
    </form>
  );
}
