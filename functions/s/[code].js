import {onRequestGet as renderShare} from '../share.js';
export async function onRequestGet(context){
 const code=context.params.code;
 if(!/^[0-9a-f]{10}$/.test(code))return new Response('Link not found',{status:404});
 if(!context.env.DB)return new Response('Link service unavailable',{status:503});
 try{
  const row=await context.env.DB.prepare('SELECT target FROM short_links WHERE code=?').bind(code).first();
  if(!row)return new Response('Link not found',{status:404});
  const url=new URL('/share?'+row.target,context.request.url);
  const response=await renderShare({...context,request:new Request(url.href,{headers:context.request.headers})});
  // Keep the short URL in the browser after navigation, while retaining share parameters in JS.
  const html=await response.text();
  const patched=html.replace('<script>location.replace(', '<script>sessionStorage.setItem("dj_short_destination",'+JSON.stringify('/s/'+code)+');location.replace(');
  return new Response(patched,{status:response.status,headers:response.headers});
 }catch(e){console.error('short link lookup',e);return new Response('Link service unavailable',{status:503})}
}
