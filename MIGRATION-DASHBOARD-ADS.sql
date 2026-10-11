CREATE TABLE IF NOT EXISTS visitor_analytics (
  id TEXT PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  page_path TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'XX',
  device TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_created ON visitor_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_page ON visitor_analytics(page_path);

CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  target_url TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'all' CHECK (placement IN ('all','home','community','space')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS ad_events (
  id TEXT PRIMARY KEY,
  ad_id TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression','click')),
  visitor_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON ad_events(ad_id,event_type,created_at DESC);
