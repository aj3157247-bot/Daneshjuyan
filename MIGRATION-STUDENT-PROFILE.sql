-- Run each statement once in Cloudflare D1 Console. Existing accounts remain unchanged.
ALTER TABLE student_accounts ADD COLUMN university TEXT;
ALTER TABLE student_accounts ADD COLUMN field TEXT;
