import {json,hashPassword,requireDb} from './_utils.js';
import {requireStudent,getStudent} from './_student.js';
import {isSpaceOwner} from './_owner.js';
export async function onRequestGet({request,env}){
 try{
  requireDb(env);
  const {results}=await env.DB.prepare('SELECT id,kind,title,university,field,semester,shift,created_at AS createdAt FROM spaces ORDER BY created_at DESC LIMIT 300').all();
  const student=await getStudent(request,env);
  let owned=new Set();
  if(student){try{const r=await env.DB.prepare('SELECT id FROM spaces WHERE owner_student_id=?').bind(student.id).all();owned=new Set((r.results||[]).map(x=>x.id));}catch(e){if(!/no such column:\s*owner_student_id/i.test(String(e?.message||e)))throw e;}}
  return json({spaces:(results||[]).map(x=>({...x,canDelete:owned.has(x.id)}))});
 }catch(e){return json({error:e.message||'Database error'},503)}
}
export async function onRequestPost({request,env}){
 try{
  requireDb(env);
  const auth=await requireStudent(request,env); if(auth.error)return auth.error;
  let body;try{body=await request.json()}catch{return json({error:'داده‌های فرم معتبر نیست.'},400)}
  const kind=['page','group'].includes(body.kind)?body.kind:null;
  const title=clean(body.title,80),university=clean(body.university,100),field=clean(body.field,100),semester=clean(body.semester,30),shift=clean(body.shift,30)||'مشخص نشده',password=String(body.password||'');
  if(!kind||!title||!university||!field||!semester||password.length<6||password.length>72)return json({error:'همه مشخصات لازم را درست وارد کن؛ رمز باید حداقل ۶ حرف باشد.'},400);
  if(!env.SESSION_SECRET)return json({error:'تنظیم SESSION_SECRET در Cloudflare Pages لازم است؛ در Settings > Variables آن را اضافه کن.'},503);
  const id=crypto.randomUUID(),passwordHash=await hashPassword(password);
  // Support both the current schema and older live D1 tables that still have name/major/type columns.
  const info=await env.DB.prepare('PRAGMA table_info(spaces)').all();
  const available=new Set((info.results||[]).map(c=>c.name));
  const values={id,kind,title,university,field,semester,shift,password_hash:passwordHash,owner_student_id:auth.student.id,name:title,major:field,type:kind};
  const columns=Object.keys(values).filter(k=>available.has(k));
  if(!columns.includes('id')||!columns.includes('password_hash'))return json({error:'ساختار جدول spaces کامل نیست؛ فایل MIGRATION-D1-NO-R2.sql را اجرا کن.'},503);
  await env.DB.prepare(`INSERT INTO spaces (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).bind(...columns.map(k=>values[k])).run();
  return json({space:{id,kind,title,university,field,semester,shift}},201);
 }catch(e){return json({error:e.message||'ساخت مورد انجام نشد'},503)}
}
function clean(v,max){return String(v||'').trim().slice(0,max)}

export async function onRequestDelete({request,env}){
 try{
  requireDb(env);
  const id=new URL(request.url).searchParams.get('id');
  if(!id||!/^[0-9a-f-]{36}$/i.test(id))return json({error:'شناسه صفحه یا گروه معتبر نیست.'},400);
  if(!await isSpaceOwner(request,env,id))return json({error:'فقط سازنده اصلی این صفحه یا گروه اجازه حذف دارد.'},403);
  // Delete only the requested space's related records. Do not alter other spaces.
  const existing=await env.DB.prepare('SELECT id FROM spaces WHERE id=?').bind(id).first();
  if(!existing)return json({error:'صفحه یا گروه پیدا نشد.'},404);
  const tables=['space_messages','space_notes','space_files','space_photos'];
  const available=new Set((await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(x=>x.name));
  const statements=[];
  if(available.has('space_asset_blobs')){
   for(const t of ['space_files','space_photos'])if(available.has(t))statements.push(env.DB.prepare(`DELETE FROM space_asset_blobs WHERE asset_id IN (SELECT id FROM ${t} WHERE space_id=?)`).bind(id));
  }
  for(const t of tables)if(available.has(t))statements.push(env.DB.prepare(`DELETE FROM ${t} WHERE space_id=?`).bind(id));
  if(available.has('space_semester_notes'))statements.push(env.DB.prepare('DELETE FROM space_semester_notes WHERE space_id=?').bind(id));
  statements.push(env.DB.prepare('DELETE FROM spaces WHERE id=? AND owner_student_id=?').bind(id,(await getStudent(request,env)).id));
  await env.DB.batch(statements);
  return json({ok:true});
 }catch(e){return json({error:e.message||'حذف انجام نشد.'},503)}
}
