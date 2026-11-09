-- Initial schema for Moscool Technical Services on D1 (SQLite).
-- Apply with: npx wrangler d1 migrations apply moscooltech-db --remote

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  image_url TEXT,
  image_alt TEXT,
  video_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  post_type TEXT NOT NULL DEFAULT 'portfolio',
  price REAL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  negotiable INTEGER NOT NULL DEFAULT 1,
  item_link TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_idx ON posts (slug);
CREATE INDEX IF NOT EXISTS posts_type_published_idx ON posts (post_type, published, created_at);

CREATE TABLE IF NOT EXISTS post_faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS post_faqs_post_idx ON post_faqs (post_id, position);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_needed TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS contact_created_idx ON contact_submissions (created_at);

CREATE TABLE IF NOT EXISTS lead_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL UNIQUE REFERENCES contact_submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new',
  estimated_value REAL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS lead_statuses_contact_idx ON lead_statuses (contact_id);

CREATE TABLE IF NOT EXISTS lead_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES contact_submissions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS lead_notes_contact_idx ON lead_notes (contact_id, created_at);

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS news_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  pub_date TEXT NOT NULL,
  source_id TEXT,
  image_url TEXT,
  api_source TEXT NOT NULL DEFAULT 'manual',
  article_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS news_article_id_idx ON news_articles (article_id);
CREATE INDEX IF NOT EXISTS news_pub_date_idx ON news_articles (pub_date);

CREATE TABLE IF NOT EXISTS content_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  keyword TEXT,
  category TEXT NOT NULL DEFAULT 'guides',
  tone TEXT NOT NULL DEFAULT 'practical',
  target_words INTEGER NOT NULL DEFAULT 1200,
  faq_count INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'queued',
  post_id INTEGER,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  generated_at TEXT
);
CREATE INDEX IF NOT EXISTS content_topics_status_idx ON content_topics (status);

CREATE TABLE IF NOT EXISTS ai_generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error TEXT,
  post_id INTEGER,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job TEXT NOT NULL,
  ran_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  result TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
