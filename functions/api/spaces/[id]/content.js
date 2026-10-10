import {json,validSession,requireDb} from '../../_utils.js';
export async function onRequestGet({request,env,params}) {
 try {requireDb(env);if(!env.SESSION_SECRET)return json({error:'SESSION_SECRET تنظیم نشده است.'},503);if(!await validSession(request,params.id,env.SESSION_SECRET))return json({error:'برای دیدن محتوای خصوصی، رمز را وارد کن.'},401);
 const space=await env.DB.prepare('SELECT id,kind,title,university,field,semester,shift FROM spaces WHERE id=?').bind(params.id).first();if(!space)return json({error:'صفحه یا گروه پیدا نشد.'},404);
 return json({space});}catch(e){return json({error:e.message||'خطای سرور'},503)}
}
