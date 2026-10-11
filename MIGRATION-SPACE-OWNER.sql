-- Execute once in Cloudflare D1 SQL console.
ALTER TABLE spaces ADD COLUMN owner_student_id TEXT;
CREATE INDEX IF NOT EXISTS idx_spaces_owner_student ON spaces(owner_student_id);
-- Existing pages: manually assign the creator's student_accounts.id:
-- UPDATE spaces SET owner_student_id='STUDENT_ID' WHERE id='SPACE_ID';
-- Never assign ownership merely because someone knows a shared page password.
