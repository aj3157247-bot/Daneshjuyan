// Persistent short links stored in the existing Cloudflare D1 binding (DB).
const allowed = ['space','community','item','itemId','semester','tool'];
const json = (body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequestPost({request,env}) {
 if(!env.DB)return json({error:'D1 database is not configured'},503);
 let data;try{data=await request.json()}catch{return json({error:'Invalid JSON'},400)}
 let url;try{url=new URL(data.url,request.url)}catch{return json({error:'Invalid URL'},400)}
 if(url.origin!==new URL(request.url).origin||url.pathname!=='/share')return json({error:'Only local share links are allowed'},400);
 const q=new URLSearchParams();for(const key of allowed)if(url.searchParams.has(key))q.set(key,url.searchParams.get(key));
 if(!q.has('space')&&!q.has('community')&&!q.has('tool'))return json({error:'Unsupported share link'},400);
 if(q.toString().length>700)return json({error:'Link too long'},400);
 const canonical=q.toString();
 try{
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS short_links (code TEXT PRIMARY KEY, target TEXT NOT NULL UNIQUE, created_at TEXT DEFAULT CURRENT_TIMESTAMP)').run();
  const existing=await env.DB.prepare('SELECT code FROM short_links WHERE target=?').bind(canonical).first();
  if(existing)return json({url:new URL('/s/'+existing.code,request.url).href});
  for(let attempt=0;attempt<5;attempt++){
   const bytes=crypto.getRandomValues(new Uint8Array(7));
   const code=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').slice(0,10);
   try{await env.DB.prepare('INSERT INTO short_links (code,target) VALUES (?,?)').bind(code,canonical).run();return json({url:new URL('/s/'+code,request.url).href})}
   catch(e){const row=await env.DB.prepare('SELECT code FROM short_links WHERE target=?').bind(canonical).first();if(row)return json({url:new URL('/s/'+row.code,request.url).href});}
  }
  return json({error:'Could not generate a unique link'},500);
 }catch(e){console.error('short link create',e);return json({error:'Short link service unavailable'},503)}
}
