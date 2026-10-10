import {json, requireDb} from './_utils.js';

const enc = new TextEncoder();
const COOKIE_NAME = 'dj_student';
const MAX_AGE = 30 * 24 * 60 * 60;

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return [...new Uint8Array(sig)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function makeStudentCookie(studentId, secret) {
  const payload = btoa(JSON.stringify({studentId, exp: Date.now() + MAX_AGE * 1000}))
    .replace(/=/g, '');
  const token = `${payload}.${await sign(payload, secret)}`;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearStudentCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function readStudentId(request, secret) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  let token;
  try { token = decodeURIComponent(match[1]); } catch { return null; }
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const supplied = token.slice(dot + 1);
  const expected = await sign(payload, secret);
  if (supplied.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(atob(payload));
    if (!data.studentId || !Number.isFinite(data.exp) || data.exp <= Date.now()) return null;
    return data.studentId;
  } catch { return null; }
}

export async function getStudent(request, env) {
  if (!env.SESSION_SECRET || !env.DB) return null;
  const id = await readStudentId(request, env.SESSION_SECRET);
  if (!id) return null;
  try {
    requireDb(env);
    const row = await env.DB.prepare(
      'SELECT id, first_name, surname FROM student_accounts WHERE id = ? LIMIT 1'
    ).bind(id).first();
    return row ? {id: row.id, firstName: row.first_name, surname: row.surname} : null;
  } catch { return null; }
}

export async function requireStudent(request, env) {
  const student = await getStudent(request, env);
  if (!student) return {error: json({error: 'برای ارسال پیام ابتدا وارد حساب دانشجویی شو.'}, 401)};
  return {student};
}
