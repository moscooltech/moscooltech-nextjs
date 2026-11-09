import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content").notNull(),
    metaDescription: text("meta_description"),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    videoUrl: text("video_url"),
    category: text("category").default("general").notNull(),
    postType: text("post_type").default("portfolio").notNull(),
    price: real("price"),
    currency: text("currency").default("NGN").notNull(),
    negotiable: integer("negotiable", { mode: "boolean" }).default(true).notNull(),
    itemLink: text("item_link"),
    published: integer("published", { mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at").default(now).notNull(),
    updatedAt: text("updated_at").default(now).notNull(),
  },
  (t) => [
    uniqueIndex("posts_slug_idx").on(t.slug),
    index("posts_type_published_idx").on(t.postType, t.published, t.createdAt),
  ],
);

export const postFaqs = sqliteTable(
  "post_faqs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    position: integer("position").default(0).notNull(),
  },
  (t) => [index("post_faqs_post_idx").on(t.postId, t.position)],
);

export const contactSubmissions = sqliteTable(
  "contact_submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    serviceNeeded: text("service_needed"),
    message: text("message").notNull(),
    createdAt: text("created_at").default(now).notNull(),
  },
  (t) => [index("contact_created_idx").on(t.createdAt)],
);

export const leadStatuses = sqliteTable(
  "lead_statuses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contactSubmissions.id, { onDelete: "cascade" }),
    status: text("status").default("new").notNull(),
    estimatedValue: real("estimated_value"),
    updatedAt: text("updated_at").default(now).notNull(),
  },
  (t) => [uniqueIndex("lead_statuses_contact_idx").on(t.contactId)],
);

export const leadNotes = sqliteTable(
  "lead_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contactSubmissions.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: text("created_at").default(now).notNull(),
  },
  (t) => [index("lead_notes_contact_idx").on(t.contactId, t.createdAt)],
);

export const feedbackSubmissions = sqliteTable("feedback_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").default(now).notNull(),
});

export const newsArticles = sqliteTable(
  "news_articles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description"),
    link: text("link").notNull(),
    pubDate: text("pub_date").notNull(),
    sourceId: text("source_id"),
    imageUrl: text("image_url"),
    apiSource: text("api_source").default("manual").notNull(),
    articleId: text("article_id"),
    createdAt: text("created_at").default(now).notNull(),
  },
  (t) => [
    uniqueIndex("news_article_id_idx").on(t.articleId),
    index("news_pub_date_idx").on(t.pubDate),
  ],
);

export const contentTopics = sqliteTable(
  "content_topics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    topic: text("topic").notNull(),
    keyword: text("keyword"),
    category: text("category").default("guides").notNull(),
    tone: text("tone").default("practical").notNull(),
    targetWords: integer("target_words").default(1200).notNull(),
    faqCount: integer("faq_count").default(4).notNull(),
    status: text("status").default("queued").notNull(),
    postId: integer("post_id"),
    error: text("error"),
    createdAt: text("created_at").default(now).notNull(),
    generatedAt: text("generated_at"),
  },
  (t) => [index("content_topics_status_idx").on(t.status)],
);

export const aiGenerations = sqliteTable("ai_generations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topic: text("topic").notNull(),
  provider: text("provider"),
  model: text("model"),
  status: text("status").default("success").notNull(),
  error: text("error"),
  postId: integer("post_id"),
  durationMs: integer("duration_ms"),
  createdAt: text("created_at").default(now).notNull(),
});

export const jobRuns = sqliteTable("job_runs", {
  id: text("id").primaryKey(),
  job: text("job").notNull(),
  ranAt: text("ran_at").default(now).notNull(),
  result: text("result"),
});

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").default(0).notNull(),
  windowStart: integer("window_start").notNull(),
});

export const schema = {
  posts,
  postFaqs,
  contactSubmissions,
  leadStatuses,
  leadNotes,
  feedbackSubmissions,
  newsArticles,
  contentTopics,
  aiGenerations,
  jobRuns,
};

export type Post = typeof posts.$inferSelect;
export type PostFaq = typeof postFaqs.$inferSelect;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type ContentTopic = typeof contentTopics.$inferSelect;
export type AiGeneration = typeof aiGenerations.$inferSelect;
