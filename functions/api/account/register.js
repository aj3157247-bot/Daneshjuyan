import {json,hashPassword,requireDb} from '../_utils.js';
import {makeStudentCookie} from '../_student.js';
export async function onRequestPost({request,env}) {
 try { requireDb(env); if(!env.SESSION_SECRET)return json({error:'SESSION_SECRET در تنظیمات Cloudflare موجود نیست.'},503);
  let b; try{b=await request.json()}catch{return json({error:'اطلاعات حساب معتبر نیست.'},400)}
  const firstName=clean(b.firstName,40), surname=clean(b.surname,50), password=String(b.password||''), university=clean(b.university,100), field=clean(b.field,100);
  if(firstName.length<2||surname.length<2)return json({error:'نام و تخلص باید هرکدام دست‌کم ۲ حرف داشته باشند.'},400);
  if(!university||!field)return json({error:'دانشگاه و رشته تحصیلی را وارد کن.'},400);
  if(password.length<6||password.length>72)return json({error:'رمز حساب باید بین ۶ تا ۷۲ حرف باشد.'},400);
  const id=crypto.randomUUID(), passwordHash=await hashPassword(password);
  await env.DB.prepare('INSERT INTO student_accounts(id,first_name,surname,password_hash,university,field) VALUES(?,?,?,?,?,?)').bind(id,firstName,surname,passwordHash,university,field).run();
  return json({student:{id,firstName,surname,university,field}},201,{'Set-Cookie':await makeStudentCookie(id,env.SESSION_SECRET)});
 } catch(e) { const msg=String(e?.message||''); if(msg.includes('no such column: university')||msg.includes('has no column named university')||msg.includes('has no column named field'))return json({error:'ابتدا فایل MIGRATION-STUDENT-PROFILE.sql را در D1 اجرا کن.'},503); if(msg.includes('no such table: student_accounts'))return json({error:'جدول حساب‌های دانشجویی هنوز ساخته نشده؛ فایل MIGRATION-STUDENT-CHAT.sql را در D1 اجرا کن.'},503); return json({error:msg||'ساخت حساب انجام نشد.'},503); }
}
function clean(v,n){return String(v||'').trim().replace(/\s+/g,' ').slice(0,n)}
