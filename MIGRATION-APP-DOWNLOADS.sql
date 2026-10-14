-- Run once in the production Cloudflare D1 database before enabling download tracking.
CREATE TABLE IF NOT EXISTS app_download_events (id INTEGER PRIMARY KEY AUTOINCREMENT, app_name TEXT NOT NULL CHECK(app_name IN ('abzar','daneshjuyan')), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')));
CREATE INDEX IF NOT EXISTS idx_app_download_events_date ON app_download_events(created_at);
