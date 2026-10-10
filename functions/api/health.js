export async function onRequestGet({env}) {
  const out={app:'daneshjuyan',status:'ok',databaseConfigured:!!env.DB,storageConfigured:!!env.FILES,sessionSecretConfigured:!!env.SESSION_SECRET,adminConfigured:!!(env.YAR_OWNER_EMAIL&&env.YAR_ADMIN_PASSWORD&&env.YAR_ADMIN_SESSION_SECRET),timestamp:new Date().toISOString()};
  if(env.DB){
    try{
      await env.DB.prepare('SELECT 1').first();out.databaseStatus='connected';
      await env.DB.prepare('SELECT id FROM spaces LIMIT 1').first();
      await env.DB.prepare('SELECT id FROM space_semester_notes LIMIT 1').first();
      await env.DB.prepare('SELECT id FROM community_messages LIMIT 1').first();
      await env.DB.prepare('SELECT id FROM site_events LIMIT 1').first();
      out.schemaStatus='ready';
    }catch(e){out.databaseStatus='error';out.schemaStatus='missing_or_incomplete';out.schemaError='Run the latest schema.sql against the bound D1 database.';}
  }else out.databaseStatus='not_configured';
  return Response.json(out,{headers:{'Cache-Control':'no-store'}});
}
