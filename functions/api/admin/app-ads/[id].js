import {json,requireDb} from '../../_utils.js';
import {isAdmin,adminRequired} from '../../_admin.js';
export async function onRequest({request,env,params}){
 try{
  if(!await isAdmin(request,env))return adminRequired();requireDb(env);
  const id=params.id;
  if(request.method==='DELETE') {await env.DB.prepare('DELETE FROM app_ads WHERE id=?').bind(id).run();return json({ok:true})}
  if(request.method==='PATCH') {
   const b=await request.json();
   if(b.action==='toggle') {await env.DB.prepare("UPDATE app_ads SET status=CASE WHEN status='active' THEN 'paused' ELSE 'active' END WHERE id=?").bind(id).run();return json({ok:true})}
   if(b.action==='edit'){
    const title=String(b.title||'').trim(),target=String(b.targetUrl||'').trim(),image=String(b.imageUrl||'').trim();
    if(!title||!/^https?:\/\//i.test(target)||(image&&!/^https?:\/\//i.test(image)))return json({error:'اطلاعات تبلیغ معتبر نیست.'},400);
    await env.DB.prepare('UPDATE app_ads SET title=?,description=?,image_url=?,target_url=?,sort_order=? WHERE id=?').bind(title.slice(0,120),String(b.description||'').slice(0,300),image.slice(0,500),target.slice(0,500),Math.max(-10000,Math.min(10000,Math.trunc(Number(b.sortOrder)||0))),id).run();return json({ok:true});
   }
  }
  return json({error:'عملیات نامعتبر است.'},405);
 }catch(e){return json({error:e.message||'خطا'},503)}
}
