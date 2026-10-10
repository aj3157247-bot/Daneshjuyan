import {json,validSession,requireDb} from '../../_utils.js';
// D1-only storage: keep each asset below D1's per-row limits; no R2 account/payment required.
const MAX=900*1024;
const allowedDocs=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain']);
const allowedImages=new Set(['image/jpeg','image/png','image/webp']);
const sem=v=>Math.max(1,Math.min(8,Number.parseInt(v||'1',10)||1));
export async function onRequestGet({request,env,params}){
 try{
  requireDb(env);
  if(!env.SESSION_SECRET||!await validSession(request,params.id,env.SESSION_SECRET))return json({error:'ابتدا با رمز صفحه وارد شو.'},401);
  const n=sem(new URL(request.url).searchParams.get('semester'));
  const [f,p]=await Promise.all([
   env.DB.prepare('SELECT id,title,file_name AS fileName,mime_type AS mimeType,file_size AS fileSize,created_at AS createdAt FROM space_files WHERE space_id=? AND semester_number=? ORDER BY created_at DESC LIMIT 100').bind(params.id,n).all(),
   env.DB.prepare('SELECT id,caption,file_name AS fileName,mime_type AS mimeType,file_size AS fileSize,created_at AS createdAt FROM space_photos WHERE space_id=? AND semester_number=? ORDER BY created_at DESC LIMIT 100').bind(params.id,n).all()
  ]);
  return json({files:f.results||[],photos:(p.results||[]).map(x=>({...x,url:`/api/spaces/${encodeURIComponent(params.id)}/asset/${encodeURIComponent(x.id)}?inline=1`})),semester:n});
 }catch(e){return json({error:'فهرست فایل‌ها بارگذاری نشد. فایل MIGRATION-D1-NO-R2.sql را در D1 اجرا کن.'},503)}
}
export async function onRequestPost({request,env,params}){
 try{
  requireDb(env);
  if(!env.SESSION_SECRET||!await validSession(request,params.id,env.SESSION_SECRET))return json({error:'ابتدا با رمز صفحه وارد شو.'},401);
  const form=await request.formData(),file=form.get('file'),type=String(form.get('type')||'file'),n=sem(form.get('semester'));
  const caption=String(form.get('caption')||'').trim().slice(0,250),title=String(form.get('title')||file?.name||'').trim().slice(0,120);
  if(!(file instanceof File)||!file.size)return json({error:'فایل را انتخاب کن.'},400);
  if(file.size>MAX)return json({error:'برای ذخیره بدون R2، اندازه هر فایل باید کمتر از 900 کیلوبایت باشد.'},413);
  const mime=file.type||'application/octet-stream';
  if(type==='photo'?!allowedImages.has(mime):!allowedDocs.has(mime))return json({error:type==='photo'?'فقط JPG، PNG و WEBP مجاز است.':'فقط PDF، Word، PowerPoint و TXT مجاز است.'},415);
  const id=crypto.randomUUID(),cleanName=file.name.replace(/[\\/\r\n\0]/g,'_').slice(0,180),bytes=new Uint8Array(await file.arrayBuffer());
  const blob=env.DB.prepare('INSERT INTO space_asset_blobs(asset_id,data) VALUES(?,?)').bind(id,bytes);
  let meta;
  if(type==='photo')meta=env.DB.prepare('INSERT INTO space_photos(id,space_id,semester_number,caption,object_key,file_name,mime_type,file_size) VALUES(?,?,?,?,?,?,?,?)').bind(id,params.id,n,caption,'',cleanName,mime,file.size);
  else meta=env.DB.prepare('INSERT INTO space_files(id,space_id,semester_number,title,object_key,file_name,mime_type,file_size) VALUES(?,?,?,?,?,?,?,?)').bind(id,params.id,n,title||cleanName,'',cleanName,mime,file.size);
  await env.DB.batch([meta,blob]);
  return json({ok:true,id,title:title||cleanName,fileName:cleanName,type,semester:n},201);
 }catch(e){return json({error:e.message||'آپلود فایل انجام نشد.'},503)}
}
