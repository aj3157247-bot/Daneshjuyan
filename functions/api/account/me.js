import {json} from '../_utils.js';
import {getStudent} from '../_student.js';
export async function onRequestGet({request,env}) { try { const student=await getStudent(request,env); return json({student:student||null}); } catch { return json({student:null}); } }
