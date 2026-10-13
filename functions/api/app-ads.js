import {json,requireDb} from './_utils.js';
export async function onRequestGet({env}) {
 try {
  requireDb(env);
  const q=await env.DB.prepare("SELECT id,title,description,image_url AS imageUrl,target_url AS targetUrl FROM app_ads WHERE status='active' ORDER BY sort_order ASC,created_at DESC LIMIT 200").all();
  return json({ads:q.results||[]},200,{'Cache-Control':'no-store'});
 } catch(e) { return json({error:'App advertisements temporarily unavailable'},503); }
}
