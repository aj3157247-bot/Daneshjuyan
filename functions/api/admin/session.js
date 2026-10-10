import {json} from '../_utils.js';import {isAdmin} from '../_admin.js';
export async function onRequestGet({request,env}){return isAdmin(request,env)?json({ok:true,role:'owner'}):json({ok:false},401)}
