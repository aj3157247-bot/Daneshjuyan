import {json,verifyPassword,makeSession,cookieHeader,requireDb} from '../../_utils.js';
export async function onRequestPost({request,env,params}) {
 try {
  requireDb(env); if(!env.SESSION_SECRET) return json({error:'مدیر سایت باید SESSION_SECRET را در Cloudflare تنظیم کند.'},503);
  let body; try{body=await request.json()}catch{return json({error:'رمز را وارد کن.'},400)}
  const row=await env.DB.prepare('SELECT id,kind,title,university,field,semester,shift,password_hash FROM spaces WHERE id=?').bind(params.id).first();
  if(!row)return json({error:'این صفحه یا گروه پیدا نشد.'},404);
  if(!await verifyPassword(String(body.password||''),row.password_hash))return json({error:'رمز واردشده درست نیست.'},401);
  const token=await makeSession(row.id,env.SESSION_SECRET);const {password_hash,...space}=row;
  return json({space},200,{'Set-Cookie':cookieHeader(token)});
 }catch(e){return json({error:e.message||'ورود انجام نشد.'},503)}
}
