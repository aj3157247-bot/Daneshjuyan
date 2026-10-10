-- Daneshjuyan repair + no-R2 migration. Safe to run repeatedly on Cloudflare D1.
-- Run this whole file in D1 Console. It does not delete existing pages, groups, notes or messages.

CREATE TABLE IF NOT EXISTS space_semester_notes (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_semester_notes_lookup ON space_semester_notes(space_id, semester_number, created_at DESC);

CREATE TABLE IF NOT EXISTS space_files (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  title TEXT NOT NULL,
  object_key TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_space_files_space_semester ON space_files(space_id, semester_number, created_at DESC);

CREATE TABLE IF NOT EXISTS space_photos (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  caption TEXT NOT NULL DEFAULT '',
  object_key TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_space_photos_space_semester ON space_photos(space_id, semester_number, created_at DESC);

-- Binary content is stored separately to keep the existing file metadata tables compatible.
CREATE TABLE IF NOT EXISTS space_asset_blobs (
  asset_id TEXT PRIMARY KEY,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- This migration intentionally does not alter the existing spaces table or delete data.
-- If your old spaces table lacks the field column, run this once separately: ALTER TABLE spaces ADD COLUMN field TEXT;
