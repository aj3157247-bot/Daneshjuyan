-- Daneshjuyan initial Cloudflare D1 schema.
-- Run this against a D1 database before enabling the matching API routes.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'fa',
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'class_admin', 'admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS universities (
  id TEXT PRIMARY KEY,
  name_fa TEXT NOT NULL,
  name_ps TEXT,
  name_en TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name_fa TEXT NOT NULL,
  name_ps TEXT,
  name_en TEXT,
  semester_count INTEGER NOT NULL DEFAULT 8 CHECK (semester_count BETWEEN 1 AND 16),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 16),
  title TEXT NOT NULL,
  UNIQUE(program_id, semester_number)
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  shift TEXT NOT NULL CHECK (shift IN ('day', 'night')),
  class_name TEXT NOT NULL,
  join_code_hash TEXT,
  created_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS class_members (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  member_role TEXT NOT NULL DEFAULT 'student'
    CHECK (member_role IN ('student', 'class_admin')),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  approved_at TEXT,
  PRIMARY KEY(class_id, user_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS study_resources (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body_text TEXT,
  file_key TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS resource_reactions (
  resource_id TEXT NOT NULL REFERENCES study_resources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'save')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(resource_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS resource_comments (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES study_resources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible'
    CHECK (status IN ('visible', 'hidden')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS chat_groups (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  university_id TEXT REFERENCES universities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'university', 'public')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected', 'archived')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS class_photos (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_programs_university ON programs(university_id);
CREATE INDEX IF NOT EXISTS idx_semesters_program ON semesters(program_id);
CREATE INDEX IF NOT EXISTS idx_classes_semester ON classes(semester_id);
CREATE INDEX IF NOT EXISTS idx_members_user_status ON class_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_resources_class_status ON study_resources(class_id, status);
CREATE INDEX IF NOT EXISTS idx_photos_class_status ON class_photos(class_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_group_created ON chat_messages(group_id, created_at);


-- Simple pages and groups used by the current homepage.
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('page','group')),
  title TEXT NOT NULL,
  university TEXT NOT NULL,
  field TEXT NOT NULL,
  semester TEXT NOT NULL,
  shift TEXT NOT NULL DEFAULT 'مشخص نشده',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_spaces_kind_created ON spaces(kind, created_at DESC);

CREATE TABLE IF NOT EXISTS space_notes (id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS idx_space_notes_space ON space_notes(space_id, created_at DESC);
CREATE TABLE IF NOT EXISTS space_messages (id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS idx_space_messages_space ON space_messages(space_id, created_at DESC);

-- Features for the integrated student platform (safe to run repeatedly).
CREATE TABLE IF NOT EXISTS space_files (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  title TEXT NOT NULL,
  object_key TEXT NOT NULL,
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
  object_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_space_photos_space_semester ON space_photos(space_id, semester_number, created_at DESC);
CREATE TABLE IF NOT EXISTS community_messages (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_community_messages_created ON community_messages(status, created_at DESC);
CREATE TABLE IF NOT EXISTS site_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  page_path TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_site_events_created ON site_events(created_at DESC);
CREATE TABLE IF NOT EXISTS space_semester_notes (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_semester_notes_lookup ON space_semester_notes(space_id, semester_number, created_at DESC);
