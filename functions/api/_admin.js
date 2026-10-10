import { json } from './_utils.js';
const enc = new TextEncoder();
function bytesToHex(a){return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))))}
function same(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
export async function createAdminToken(secret){const payload=btoa(JSON.stringify({role:'owner',exp:Date.now()+8*60*60*1000})).replace(/=/g,'');return `${payload}.${await sign(payload,secret)}`}
export async function isAdmin(request,env){const secret=env.YAR_ADMIN_SESSION_SECRET;if(!secret)return false;const auth=request.headers.get('X-DJ-Admin-Session')||'';const dot=auth.lastIndexOf('.');if(dot<1)return false;const payload=auth.slice(0,dot),sig=auth.slice(dot+1);if(!same(sig,await sign(payload,secret)))return false;try{const data=JSON.parse(atob(payload));return data.role==='owner'&&data.exp>Date.now()}catch{return false}}
export function adminRequired(){return json({error:'برای این کار ورود مدیر اصلی لازم است.'},401)}
