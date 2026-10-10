import {json,verifyPassword,requireDb} from '../_utils.js';
import {makeStudentCookie} from '../_student.js';
export async function onRequestPost({request,env}) {
 try { requireDb(env); if(!env.SESSION_SECRET)return json({error:'SESSION_SECRET در تنظیمات Cloudflare موجود نیست.'},503);
  let b;try{b=await request.json()}catch{return json({error:'اطلاعات ورود معتبر نیست.'},400)}
  const firstName=clean(b.firstName,40),surname=clean(b.surname,50),password=String(b.password||'');
  if(!firstName||!surname||!password)return json({error:'نام، تخلص و رمز را وارد کن.'},400);
  const {results}=await env.DB.prepare('SELECT id,first_name,surname,password_hash FROM student_accounts WHERE lower(first_name)=lower(?) AND lower(surname)=lower(?) LIMIT 30').bind(firstName,surname).all();
  let found=null; for(const row of results||[]){if(await verifyPassword(password,row.password_hash)){found=row;break}}
  if(!found)return json({error:'نام، تخلص یا رمز درست نیست.'},401);
  return json({student:{id:found.id,firstName:found.first_name,surname:found.surname}},200,{'Set-Cookie':await makeStudentCookie(found.id,env.SESSION_SECRET)});
 } catch(e) {const msg=String(e?.message||'');if(msg.includes('no such table: student_accounts'))return json({error:'جدول حساب‌های دانشجویی هنوز ساخته نشده؛ فایل MIGRATION-STUDENT-CHAT.sql را در D1 اجرا کن.'},503);return json({error:msg||'ورود انجام نشد.'},503)}
}
function clean(v,n){return String(v||'').trim().replace(/\s+/g,' ').slice(0,n)}
