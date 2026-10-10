import {json} from '../_utils.js';
import {clearStudentCookie} from '../_student.js';
export async function onRequestPost(){return json({ok:true},200,{'Set-Cookie':clearStudentCookie()});}
