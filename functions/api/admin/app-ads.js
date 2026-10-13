import {json,requireDb} from '../_utils.js';
import {isAdmin,adminRequired} from '../_admin.js';
export async function onRequest({request,env}) {
 try {
  if(!await isAdmin(request,env))return adminRequired();requireDb(env);
  if(request.method==='GET') {
   const q=await env.DB.prepare('SELECT * FROM app_ads ORDER BY sort_order ASC,created_at DESC').all();return json({ads:q.results||[]});
  }
  if(request.method==='POST') {
   const b=await request.json();const title=String(b.title||'').trim(),target=String(b.targetUrl||'').trim();
   if(!title||!/^https?:\/\//i.test(target))return json({error:'عنوان و لینک معتبر لازم است.'},400);
   const image=String(b.imageUrl||'').trim();if(image&&!/^https?:\/\//i.test(image))return json({error:'لینک تصویر معتبر نیست.'},400);
   const id=crypto.randomUUID();
   await env.DB.prepare('INSERT INTO app_ads(id,title,description,image_url,target_url,status,sort_order) VALUES(?,?,?,?,?,?,?)').bind(id,title.slice(0,120),String(b.description||'').slice(0,300),image.slice(0,500),target.slice(0,500),'active',Number.isFinite(Number(b.sortOrder))?Math.max(-10000,Math.min(10000,Math.trunc(Number(b.sortOrder)))):0).run();
   return json({ok:true,id});
  }
  return json({error:'روش نامعتبر است.'},405);
 }catch(e){return json({error:e.message||'خطا'},503)}
}
