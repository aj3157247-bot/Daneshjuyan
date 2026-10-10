-- Run these statements one at a time in Cloudflare D1 Console. Safe for existing records.
CREATE TABLE IF NOT EXISTS student_accounts (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Run this statement once. If it says duplicate column name, that column already exists and you can continue.
ALTER TABLE space_messages ADD COLUMN author_id TEXT;

CREATE INDEX IF NOT EXISTS idx_student_accounts_names ON student_accounts(first_name, surname);
