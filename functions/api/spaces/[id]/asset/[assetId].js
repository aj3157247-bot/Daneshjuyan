import {validSession,requireDb,json} from '../../../_utils.js';
import {getStudent} from '../../../_student.js';
export async function onRequestGet({request,env,params}){
 try{
  requireDb(env);
  if(!env.SESSION_SECRET||!await validSession(request,params.id,env.SESSION_SECRET))return json({error:'دسترسی نیاز به رمز صفحه دارد.'},401);
  if(!await getStudent(request,env))return json({error:'برای دانلود یا مشاهده فایل‌ها و عکس‌ها ابتدا ثبت‌نام کن و وارد حساب دانشجویی شو.'},401);
  let row=await env.DB.prepare('SELECT id,file_name AS fileName,mime_type AS mimeType FROM space_files WHERE id=? AND space_id=?').bind(params.assetId,params.id).first();
  if(!row)row=await env.DB.prepare('SELECT id,file_name AS fileName,mime_type AS mimeType FROM space_photos WHERE id=? AND space_id=?').bind(params.assetId,params.id).first();
  if(!row)return json({error:'فایل پیدا نشد.'},404);
  const blob=await env.DB.prepare('SELECT data FROM space_asset_blobs WHERE asset_id=?').bind(row.id).first();
  if(!blob?.data)return json({error:'محتوای فایل پیدا نشد؛ فایل را دوباره بارگذاری کن.'},404);
  const inline=new URL(request.url).searchParams.get('inline')==='1'&&row.mimeType.startsWith('image/');
  const headers=new Headers({'Content-Type':row.mimeType,'Content-Disposition':`${inline?'inline':'attachment'}; filename="${String(row.fileName).replace(/["\r\n]/g,'_')}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  // D1 returns BLOB values as arrays of byte numbers; Response(array) corrupts images.
  const bytes = blob.data instanceof ArrayBuffer ? new Uint8Array(blob.data)
    : ArrayBuffer.isView(blob.data) ? new Uint8Array(blob.data.buffer,blob.data.byteOffset,blob.data.byteLength)
    : Array.isArray(blob.data) ? new Uint8Array(blob.data)
    : null;
  if(!bytes)return json({error:'فرمت فایل ذخیره‌شده نامعتبر است.'},503);
  return new Response(bytes,{headers});
 }catch(e){return json({error:'دریافت فایل ناموفق بود.'},503)}
}
