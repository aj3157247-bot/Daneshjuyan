راهنمای حذف امن صفحه و گروه

فقط ۲ فایل کد در این ZIP تغییر کرده است. فایل‌های قبلی را با همین مسیرها جایگزین کنید.

مهم: این تغییر به تنهایی مالک صفحه قدیمی «سمستر دوم حقوق» را تعیین نمی‌کند.
هیچ‌کس صرفاً با دانستن رمز صفحه مالک نمی‌شود.

برای فعال شدن حذف، ستون owner_student_id در جدول spaces باید وجود داشته باشد.
اگر قبلاً MIGRATION-SPACE-OWNER.sql را اجرا نکرده‌اید، پس از تهیه نسخه پشتیبان D1 فقط یک بار اجرا کنید:
ALTER TABLE spaces ADD COLUMN owner_student_id TEXT;
CREATE INDEX IF NOT EXISTS idx_spaces_owner_student ON spaces(owner_student_id);

برای صفحه قدیمی، پس از اطمینان از شناسه حساب سازنده و شناسه صفحه، مالکیت را دستی تعیین کنید:
SELECT id,first_name,surname FROM student_accounts;
SELECT id,title,kind,owner_student_id FROM spaces;
UPDATE spaces SET owner_student_id='YOUR_STUDENT_ID' WHERE id='YOUR_SPACE_ID' AND owner_student_id IS NULL;

شناسه‌ها را با مقادیر واقعی جایگزین کنید. اگر owner_student_id از قبل مقدار دارد، بدون بررسی تغییر ندهید.
برای صفحات و گروه‌های جدید، هنگام ساخت توسط حساب دانشجویی، شناسه مالک ثبت می‌شود (به شرط وجود ستون).
حذف دائمی است؛ پیش از استفاده از آن از D1 بکاپ بگیرید.
