// Count clicks on APK download links (not confirmed completed downloads).
const targets = {abzar:'https://github.com/aj3157247-bot/Daneshjuyan/releases/download/v1.0.0/DaneshAbzar-v1.0.0.apk',daneshjuyan:'/downloads/daneshjuyan.apk'};
export async function onRequestGet({request,env,params,waitUntil}) {
 const name=String(params.name||'').toLowerCase();
 if(!Object.prototype.hasOwnProperty.call(targets,name))return new Response('Not found',{status:404});
 const destination=new URL(targets[name],request.url).href;
 if(env.DB){const save=env.DB.prepare('INSERT INTO app_download_events (app_name) VALUES (?)').bind(name).run().catch(()=>{});if(typeof waitUntil==='function')waitUntil(save);else await save;}
 return Response.redirect(destination,302);
}
