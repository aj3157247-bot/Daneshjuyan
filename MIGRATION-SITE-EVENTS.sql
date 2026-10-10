-- ایجاد جدول ثبت بازدیدها برای داشبورد آمار
CREATE TABLE IF NOT EXISTS site_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  page_path TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_site_events_created
ON site_events(created_at DESC);
