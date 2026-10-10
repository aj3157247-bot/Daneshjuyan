-- Migration for the currently deployed legacy Daneshjuyan D1 database.
-- BACK UP the D1 database before running this script.
-- The live database already has columns kind and title; it is missing field.

ALTER TABLE spaces ADD COLUMN field TEXT;

-- Copy values from the old schema into the fields used by the current API.
UPDATE spaces
SET title = COALESCE(NULLIF(title, ''), name),
    field = COALESCE(NULLIF(field, ''), major),
    kind = CASE
      WHEN lower(COALESCE(type, '')) IN ('group', 'chat', 'گروه') THEN 'group'
      ELSE 'page'
    END;

-- Keep legacy columns populated for compatibility with the existing database.
UPDATE spaces
SET name = COALESCE(NULLIF(name, ''), title),
    major = COALESCE(NULLIF(major, ''), field),
    type = kind;
