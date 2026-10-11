import {isSpaceOwner} from '../../_owner.js';
import {json,validSession,requireDb} from '../../_utils.js';
const sem=v=>Math.max(1,Math.min(8,Number.parseInt(v||'1',10)||1));
export async function onRequestGet({request,env,params}){try{requireDb(env);if(!env.SESSION_SECRET||!await validSession(request,params.id,env.SESSION_SECRET))return json({error:'ابتدا با رمز صفحه وارد شو.'},401);const n=sem(new URL(request.url).searchParams.get('semester'));const {results}=await env.DB.prepare('SELECT id,title,body,created_at AS createdAt FROM space_semester_notes WHERE space_id=? AND semester_number=? ORDER BY created_at DESC LIMIT 100').bind(params.id,n).all();return json({notes:results||[],semester:n})}catch(e){return json({error:'دریافت نوت‌ها انجام نشد.'},503)}}
export async function onRequestPost({request,env,params}){try{requireDb(env);if(!env.SESSION_SECRET||!await validSession(request,params.id,env.SESSION_SECRET))return json({error:'ابتدا با رمز صفحه وارد شو.'},401);let b;try{b=await request.json()}catch{return json({error:'فرم نوت معتبر نیست.'},400)}const title=String(b.title||'').trim().slice(0,100),body=String(b.body||'').trim().slice(0,150000),n=sem(b.semester);if(!title||!body)return json({error:'عنوان و متن نوت الزامی است.'},400);const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO space_semester_notes(id,space_id,semester_number,title,body) VALUES(?,?,?,?,?)').bind(id,params.id,n,title,body).run();return json({note:{id,title,body,semester:n,createdAt:new Date().toISOString()}},201)}catch(e){return json({error:'ذخیره نوت انجام نشد.'},503)}}

export async function onRequestDelete({request,env,params}){
 try{
  requireDb(env);
  if(!await isSpaceOwner(request,env,params.id))return json({error:'فقط سازنده صفحه اجازه حذف نوت را دارد.'},403);
  const noteId=new URL(request.url).searchParams.get('noteId');
  if(!noteId||!/^[0-9a-f-]{36}$/i.test(noteId))return json({error:'شناسه نوت معتبر نیست.'},400);
  const result=await env.DB.prepare('DELETE FROM space_semester_notes WHERE id=? AND space_id=?').bind(noteId,params.id).run();
  if(!result.meta?.changes)return json({error:'نوت پیدا نشد.'},404);
  return json({ok:true});
 }catch(e){return json({error:e.message||'حذف نوت انجام نشد.'},503)}
}
