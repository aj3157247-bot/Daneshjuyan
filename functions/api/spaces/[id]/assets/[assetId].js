import {json,requireDb} from '../../../_utils.js';
import {isSpaceOwner} from '../../../_owner.js';
export async function onRequestDelete({request,env,params}){
 try{
  requireDb(env);
  if(!await isSpaceOwner(request,env,params.id))return json({error:'فقط سازنده اصلی صفحه اجازه حذف دارد.'},403);
  const type=new URL(request.url).searchParams.get('type');
  if(type!=='photo'&&type!=='file')return json({error:'نوع مورد نامعتبر است.'},400);
  const table=type==='photo'?'space_photos':'space_files';
  const found=await env.DB.prepare(`SELECT id FROM ${table} WHERE id=? AND space_id=?`).bind(params.assetId,params.id).first();
  if(!found)return json({error:'مورد پیدا نشد.'},404);
  await env.DB.batch([
   env.DB.prepare(`DELETE FROM ${table} WHERE id=? AND space_id=?`).bind(params.assetId,params.id),
   env.DB.prepare('DELETE FROM space_asset_blobs WHERE asset_id=?').bind(params.assetId)
  ]);
  return json({ok:true});
 }catch(e){return json({error:e.message||'حذف انجام نشد.'},503)}
}
