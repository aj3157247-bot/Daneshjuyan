import {json,validSession,requireDb} from '../../_utils.js';
import {requireStudent} from '../../_student.js';
import {isSpaceOwner} from '../../_owner.js';
export async function onRequestGet({request,env,params}) {
 try { requireDb(env); if(!env.SESSION_SECRET||!await validSession(request,params.id,env.SESSION_SECRET))return json({error:'برای دیدن گفتگو باید رمز گروه را وارد کنی.'},401);
  const {results}=await env.DB.prepare(`SELECT m.id,m.body,m.created_at AS createdAt,m.author_id AS authorId,
   CASE WHEN u.id IS NULL THEN 'عضو قبلی' ELSE trim(u.first_name || ' ' || u.surname) END AS authorName
   FROM space_messages m LEFT JOIN student_accounts u ON u.id=m.author_id WHERE m.space_id=? ORDER BY m.created_at DESC LIMIT 100`).bind(params.id).all();
  return json({messages:(results||[]).reverse()});
 } catch(e) { const msg=String(e?.message||''); if(msg.includes('no such column: m.author_id')||msg.includes('no such table: student_accounts'))return json({error:'ساختار چت هنوز به‌روزرسانی نشده؛ فایل MIGRATION-STUDENT-CHAT.sql را اجرا کن.'},503);return json({error:msg||'خطا در دریافت پیام‌ها'},503); }
}
export async function onRequestPost({request,env,params}) {
 try { requireDb(env); if(!env.SESSION_SECRET||!await validSession(request,params.id,env.SESSION_SECRET))return json({error:'برای ارسال پیام باید رمز گروه را وارد کنی.'},401);
  const auth=await requireStudent(request,env); if(auth.error)return auth.error;
  let b;try{b=await request.json()}catch{return json({error:'پیام معتبر نیست.'},400)}
  const body=String(b.body||'').trim().slice(0,2000);if(!body)return json({error:'متن پیام خالی است.'},400);
  const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO space_messages(id,space_id,body,author_id) VALUES(?,?,?,?)').bind(id,params.id,body,auth.student.id).run();
  return json({message:{id,body,authorId:auth.student.id,authorName:`${auth.student.firstName} ${auth.student.surname}`,createdAt:new Date().toISOString()}},201);
 } catch(e) {const msg=String(e?.message||'');if(msg.includes('no such column: author_id')||msg.includes('no such table: student_accounts'))return json({error:'ساختار چت هنوز به‌روزرسانی نشده؛ فایل MIGRATION-STUDENT-CHAT.sql را اجرا کن.'},503);return json({error:msg||'ارسال پیام انجام نشد.'},503)}
}

// Only the verified owner of this specific space may delete its posts/messages.
export async function onRequestDelete({request,env,params}) {
 try {
  requireDb(env);
  const id=new URL(request.url).searchParams.get('id');
  if(!id||!/^[0-9a-f-]{36}$/i.test(id))return json({error:'شناسه پست معتبر نیست.'},400);
  if(!await isSpaceOwner(request,env,params.id))return json({error:'فقط سازنده صفحه یا گروه می‌تواند پست‌ها را حذف کند.'},403);
  const result=await env.DB.prepare('DELETE FROM space_messages WHERE id=? AND space_id=?').bind(id,params.id).run();
  if(!result.meta?.changes)return json({error:'پست پیدا نشد.'},404);
  return json({ok:true});
 } catch(e) {return json({error:e.message||'حذف انجام نشد.'},503)}
}
