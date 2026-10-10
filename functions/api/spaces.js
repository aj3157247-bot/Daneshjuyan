import {json,hashPassword,requireDb} from './_utils.js';
export async function onRequestGet({env}){
 try{
  requireDb(env);
  const {results}=await env.DB.prepare('SELECT id,kind,title,university,field,semester,shift,created_at AS createdAt FROM spaces ORDER BY created_at DESC LIMIT 300').all();
  return json({spaces:results||[]});
 }catch(e){return json({error:e.message||'Database error'},503)}
}
export async function onRequestPost({request,env}){
 try{
  requireDb(env);
  let body;try{body=await request.json()}catch{return json({error:'داده‌های فرم معتبر نیست.'},400)}
  const kind=['page','group'].includes(body.kind)?body.kind:null;
  const title=clean(body.title,80),university=clean(body.university,100),field=clean(body.field,100),semester=clean(body.semester,30),shift=clean(body.shift,30)||'مشخص نشده',password=String(body.password||'');
  if(!kind||!title||!university||!field||!semester||password.length<6||password.length>72)return json({error:'همه مشخصات لازم را درست وارد کن؛ رمز باید حداقل ۶ حرف باشد.'},400);
  if(!env.SESSION_SECRET)return json({error:'تنظیم SESSION_SECRET در Cloudflare Pages لازم است؛ در Settings > Variables آن را اضافه کن.'},503);
  const id=crypto.randomUUID(),passwordHash=await hashPassword(password);
  // Support both the current schema and older live D1 tables that still have name/major/type columns.
  const info=await env.DB.prepare('PRAGMA table_info(spaces)').all();
  const available=new Set((info.results||[]).map(c=>c.name));
  const values={id,kind,title,university,field,semester,shift,password_hash:passwordHash,name:title,major:field,type:kind};
  const columns=Object.keys(values).filter(k=>available.has(k));
  if(!columns.includes('id')||!columns.includes('password_hash'))return json({error:'ساختار جدول spaces کامل نیست؛ فایل MIGRATION-D1-NO-R2.sql را اجرا کن.'},503);
  await env.DB.prepare(`INSERT INTO spaces (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).bind(...columns.map(k=>values[k])).run();
  return json({space:{id,kind,title,university,field,semester,shift}},201);
 }catch(e){return json({error:e.message||'ساخت مورد انجام نشد'},503)}
}
function clean(v,max){return String(v||'').trim().slice(0,max)}
