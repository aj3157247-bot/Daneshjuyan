import {getStudent} from './_student.js';
export async function isSpaceOwner(request,env,spaceId){
 const student=await getStudent(request,env);
 if(!student)return false;
 const row=await env.DB.prepare('SELECT owner_student_id FROM spaces WHERE id=?').bind(spaceId).first();
 return !!row?.owner_student_id && row.owner_student_id===student.id;
}
