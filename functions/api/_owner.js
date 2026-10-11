import {getStudent} from './_student.js';
export async function isSpaceOwner(request,env,spaceId){
 const student=await getStudent(request,env);
 if(!student)return false;
 // Older D1 installations may not yet have the owner column.
 // Missing ownership must disable deletion, never break asset listing/uploads.
 try{
  const row=await env.DB.prepare('SELECT owner_student_id FROM spaces WHERE id=?').bind(spaceId).first();
  return !!row?.owner_student_id && row.owner_student_id===student.id;
 }catch(error){
  if(/no such column:\s*owner_student_id/i.test(String(error?.message||error)))return false;
  throw error;
 }
}
