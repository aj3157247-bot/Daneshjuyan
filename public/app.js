const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let activeKind = 'page', joiningId = null, currentItem = null, notes = [], messages = [], assets = {files: [], photos: []};
const activeSemester = () => Number($('#activeSemester')?.value || 1);
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(msg) { $('#status').textContent = msg; $('#status').hidden = !msg; }
function adminStatus(msg) { $('#adminStatus').textContent = msg; $('#adminStatus').hidden = false; }
async function openCreate() { const me=await refreshStudent(); if(!me){openAccount();return;}  $('#createForm').reset(); $('#createError').hidden = true; $('#createSubmit').disabled = false; $('#createSubmit').textContent = 'ساختن'; $('#createDialog').showModal(); }
['#createTop','#createHero','#createEmpty'].forEach(s => $(s).addEventListener('click', openCreate));
$$('[data-close]').forEach(b => b.addEventListener('click', () => $('#'+b.dataset.close).close()));
$$('.tab').forEach(b => b.addEventListener('click', () => { activeKind = b.dataset.kind; $$('.tab').forEach(t => t.classList.toggle('active', t === b)); render(); }));
$('#search').addEventListener('input', render);
async function api(path, options = {}) {
  const headers = {...(options.headers || {})};
  if (!(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {...options, headers, credentials: 'same-origin'});
  let data = {}; try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || 'درخواست انجام نشد.');
  return data;
}
async function loadSpaces() {
  try { const d = await api('/api/spaces'); window.spaces = d.spaces || []; status(''); render(); }
  catch { window.spaces = []; render(); status('Backend یا پایگاه داده D1 هنوز آماده نیست.'); }
}
$('#createForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = new FormData(e.currentTarget);
  const payload = {kind:f.get('kind'), title:String(f.get('title')).trim(), university:String(f.get('university')).trim(), field:String(f.get('field')).trim(), semester:f.get('semester'), shift:f.get('shift'), password:String(f.get('password'))};
  const submit = $('#createSubmit'); submit.disabled = true; submit.textContent = 'در حال ساخت…'; $('#createError').hidden = true;
  try { const d = await api('/api/spaces', {method:'POST', body:JSON.stringify(payload)}); $('#createDialog').close(); activeKind = payload.kind; $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.kind === activeKind)); $('#search').value = ''; status('ساخته شد. رمز را در جای امن نگه دار.'); await loadSpaces(); if (d.space) startJoin(d.space.id, true); }
  catch (err) { $('#createError').textContent = err.message || 'ساخت انجام نشد؛ دوباره تلاش کن.'; $('#createError').hidden = false; }
  finally { submit.disabled = false; submit.textContent = 'ساختن'; }
});
function render() {
  const q = $('#search').value.trim().toLocaleLowerCase(); const all = window.spaces || [];
  const shown = all.filter(x => x.kind === activeKind && [x.title,x.university,x.field,x.semester,x.shift].join(' ').toLocaleLowerCase().includes(q));
  $('#listing').innerHTML = shown.map(x => `<article class="card ${x.kind==='page'?'page-card':'group-card'}"><div class="cover-art"><span class="cover-symbol">${x.kind==='page'?'▤':'☏'}</span><span class="badge">🔒 خصوصی</span></div><div class="card-body"><div class="card-avatar">${x.kind==='page'?'📚':'👥'}</div><h3>${escapeHtml(x.title)}</h3><p>${x.kind==='page'?'صفحه درسی · نوت‌ها و منابع':'گروه صنفی · گفتگو و هماهنگی'}</p><div class="details"><span>${escapeHtml(x.university)}</span><span>${escapeHtml(x.field)}</span><span>${escapeHtml(x.semester)}</span><span>نوبت ${escapeHtml(x.shift)}</span></div><button class="enter" data-enter="${escapeHtml(x.id)}">${x.kind==='page'?'مشاهده صفحه':'ورود به گروه'}　›</button></div></article>`).join('');
  $('#empty').hidden = shown.length > 0; $('#listing').hidden = shown.length === 0; $('#emptyTitle').textContent = activeKind === 'page' ? 'هنوز صفحه‌ای ساخته نشده' : 'هنوز گروهی ساخته نشده';
  // Card navigation is handled by a single delegated listener below.

}
// Delegated navigation survives card re-rendering and taps on nested elements.
document.addEventListener('click', e => {
  const button = e.target.closest('[data-enter]');
  if (!button) return;
  e.preventDefault();
  e.stopPropagation();
  try { startJoin(button.getAttribute('data-enter')); }
  catch (error) { console.error('Open page/group:', error); alert('بازکردن صفحه یا گروه ممکن نشد. صفحه را تازه‌سازی کن.'); }
});
function startJoin(id, created = false) {
  joiningId = id; const item = (window.spaces || []).find(x => x.id === id); if (!item) return;
  $('#joinTitle').textContent = item.kind === 'page' ? 'ورود به صفحه' : 'ورود به گروه'; $('#joinDescription').textContent = `${item.title} • ${item.university} • ${item.field} • ${item.semester}`; $('#joinPassword').value = ''; $('#joinError').hidden = true; $('#joinDialog').showModal();
  if (created) $('#joinDescription').textContent += ' — برای بازکردن، همان رمز را وارد کن.';
}
$('#joinForm').addEventListener('submit', async e => {
  e.preventDefault(); try { const d = await api(`/api/spaces/${encodeURIComponent(joiningId)}/join`, {method:'POST', body:JSON.stringify({password:$('#joinPassword').value})}); $('#joinDialog').close(); currentItem = d.space; await openContent(d.space); }
  catch (err) { $('#joinError').textContent = err.message || 'رمز درست نیست یا دسترسی تأیید نشد.'; $('#joinError').hidden = false; }
});
async function openContent(item) {
  currentItem = item; const isPage = item.kind === 'page'; const dlg = $('#contentDialog'); dlg.dataset.kind = item.kind; dlg.classList.toggle('page-view', isPage); dlg.classList.toggle('group-view', !isPage); $('#contentType').textContent = isPage ? 'صفحه درسی' : 'گروه صنفی'; $('#contentTitle').textContent = item.title; $('#contentMeta').textContent = `${item.university} • ${item.field} • ${item.semester} • نوبت ${item.shift}`; $('#activeSemester').value = '1'; notes = []; messages = []; assets = {files:[],photos:[]}; renderNotes(); renderMessages(); renderAssets();
  $('#panel-overview h3').textContent = isPage ? 'به صفحه صنف خوش آمدی' : 'به گروه صنف خوش آمدی'; $('#panel-overview > p').textContent = isPage ? 'نوت‌ها، منابع، عکس‌ها و اطلاعیه‌های این صنف را در یک صفحه دنبال کن.' : 'برای هماهنگی با هم‌صنفی‌ها گفتگو کن، فایل بفرست و خاطرات گروه را نگه‌دار.'; $('#panel-overview .private-banner').textContent = isPage ? '📚 صفحه اختصاصی صنف؛ منابع درسی و پست‌ها به تفکیک سمستر' : '👥 گروه خصوصی صنف؛ گفتگو و هماهنگی اعضا';
  $$('[data-panel=overview]').forEach(b => b.textContent = isPage ? 'درباره صفحه' : 'نمای کلی'); $$('[data-panel=notes]').forEach(b => b.textContent = isPage ? 'نوت‌های درسی' : 'نوت‌ها'); $$('[data-panel=files]').forEach(b => b.textContent = 'فایل‌ها'); $$('[data-panel=photos]').forEach(b => b.textContent = isPage ? 'عکس‌ها' : 'خاطرات'); $$('[data-panel=chat]').forEach(b => b.textContent = isPage ? '📰 پست‌ها' : '💬 گفتگو'); $('#panel-chat h3').textContent = isPage ? 'پست‌ها و اطلاعیه‌های صفحه' : 'گفتگوی اعضا'; $('#chatMessage').placeholder = isPage ? 'اطلاعیه یا مطلب درسی خود را بنویس…' : 'پیامی برای هم‌صنفی‌ها بنویس…'; $('#chatForm button[type=submit]').textContent = isPage ? 'انتشار پست' : 'ارسال پیام'; $('#panel-chat .form-hint').textContent = isPage ? 'پست‌ها برای اعضای واردشده در این صفحه نمایش داده می‌شوند.' : 'پیام‌های گروه برای اعضای واردشده نمایش داده می‌شوند.'; // Keep page tools on pages, but make groups a dedicated chat screen.
  $$('.inside-tab').forEach(b => { b.hidden = !isPage && b.dataset.panel !== 'chat'; });
  $('#activeSemester').closest('.semester-picker').hidden = !isPage;
  $('#contentMeta').hidden = !isPage;
  showPanel('chat'); dlg.showModal();
  try { await api(`/api/spaces/${encodeURIComponent(item.id)}/content`); await loadSemesterContent(); const m = await api(`/api/spaces/${encodeURIComponent(item.id)}/messages`); messages = m.messages || []; renderMessages(); }
  catch (err) { status('محتوا بارگذاری نشد: ' + err.message); }
}
async function loadSemesterContent() {
  if (!currentItem) return; const n = activeSemester();
  try { const d = await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/semester-notes?semester=${n}`); notes = d.notes || []; renderNotes(); }
  catch (err) { notes = []; renderNotes(); status('نوت‌ها بارگذاری نشد: ' + err.message); }
  try { assets = await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/assets?semester=${n}`); renderAssets(); }
  catch (err) { assets = {files:[],photos:[]}; renderAssets(); status('فهرست فایل‌ها بارگذاری نشد: ' + err.message); }
}
$('#activeSemester').addEventListener('change', loadSemesterContent);
function showPanel(name) { $$('.inside-tab').forEach(b => b.classList.toggle('active', b.dataset.panel === name)); $$('.inside-panel').forEach(p => p.hidden = p.id !== 'panel-' + name); }
$$('.inside-tab').forEach(b => b.addEventListener('click', () => showPanel(b.dataset.panel)));
$('#newNoteBtn').addEventListener('click', () => $('#noteForm').hidden = !$('#noteForm').hidden);
$('#noteForm').addEventListener('submit', async e => {
  e.preventDefault(); try { const d = await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/semester-notes`, {method:'POST', body:JSON.stringify({title:$('#noteTitle').value.trim(), body:$('#noteBody').value.trim(), semester:activeSemester()})}); notes.unshift(d.note); $('#noteForm').reset(); $('#noteForm').hidden = true; renderNotes(); }
  catch (err) { status('نوت ذخیره نشد: ' + err.message); }
});
function renderNotes() {
  $('#notesList').innerHTML = notes.length ? notes.map(n => `<article class="note-card"><h4>${escapeHtml(n.title)}</h4><p>${escapeHtml(n.body)}</p><small>${escapeHtml(n.createdAt || '')}</small><button class="secondary small" type="button" data-copy-note="${escapeHtml(n.id)}">کپی نوت</button></article>`).join('') : '<p>هنوز نوتی اضافه نشده است. می‌توانی نوت را از موبایل کپی و اینجا بچسبانی.</p>';
  $$('[data-copy-note]').forEach(b => b.addEventListener('click', async () => { const n = notes.find(x => x.id === b.dataset.copyNote); try { await navigator.clipboard.writeText(n?.body || ''); alert('نوت کپی شد.'); } catch { alert('کپی خودکار ممکن نشد؛ متن را انتخاب و کپی کن.'); } }));
}
$('#chatForm').addEventListener('submit', async e => { e.preventDefault(); try { const body = $('#chatMessage').value.trim(); const d = await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/messages`, {method:'POST', body:JSON.stringify({body})}); messages.push(d.message); $('#chatMessage').value = ''; renderMessages(); } catch (err) { status('پیام ارسال نشد: ' + err.message); } });
function renderMessages() { $('#chatList').innerHTML = messages.map(m => `<article class="message-card"><p>${escapeHtml(m.body)}</p><small>${escapeHtml(m.createdAt || '')}</small></article>`).join('') || '<p>هنوز پیامی فرستاده نشده است.</p>'; }
async function uploadAsset(form, type) {
  if (!currentItem) return; const input = form.querySelector('input[type=file]'); if (!input.files?.[0]) return;
  const fd = new FormData(); fd.append('file', input.files[0]); fd.append('type', type); fd.append('semester', String(activeSemester()));
  if (type === 'photo') fd.append('caption', $('#photoCaption').value.trim()); else fd.append('title', $('#fileTitle').value.trim());
  try { const res = await fetch(`/api/spaces/${encodeURIComponent(currentItem.id)}/assets`, {method:'POST', body:fd, credentials:'same-origin'}); let d = {}; try { d = await res.json(); } catch {} if (!res.ok) throw new Error(d.error || 'آپلود انجام نشد.'); form.reset(); await loadSemesterContent(); status(type === 'photo' ? 'عکس اضافه شد.' : 'فایل آپلود شد.'); }
  catch (err) { status(err.message); }
}
$('#fileUploadForm').addEventListener('submit', e => { e.preventDefault(); uploadAsset(e.currentTarget, 'file'); });
$('#photoUploadForm').addEventListener('submit', e => { e.preventDefault(); uploadAsset(e.currentTarget, 'photo'); });
function renderAssets() {
  const fs = assets.files || [], ps = assets.photos || [];
  $('#filesList').innerHTML = fs.length ? fs.map(f => `<article class="note-card"><h4>${escapeHtml(f.title || f.fileName)}</h4><p>${escapeHtml(f.fileName)} • ${Math.max(1, Math.round((f.fileSize || 0)/1024))} KB</p><a class="download-link" href="/api/spaces/${encodeURIComponent(currentItem.id)}/asset/${encodeURIComponent(f.id)}">دانلود فایل</a></article>`).join('') : '<p>در این سمستر هنوز فایلی اضافه نشده است.</p>';
  $('#photosList').innerHTML = ps.length ? ps.map(p => `<article class="note-card photo-card"><img loading="lazy" alt="${escapeHtml(p.caption || p.fileName)}" src="/api/spaces/${encodeURIComponent(currentItem.id)}/asset/${encodeURIComponent(p.id)}?inline=1"><b>${escapeHtml(p.fileName)}</b><p>${escapeHtml(p.caption || '')}</p><a class="download-link" href="/api/spaces/${encodeURIComponent(currentItem.id)}/asset/${encodeURIComponent(p.id)}">دانلود عکس</a></article>`).join('') : '<p>هنوز خاطره‌ای ثبت نشده است.</p>';
}
let currentStudent=null;
async function refreshStudent(){try{const d=await api('/api/account/me');currentStudent=d.student||null;}catch{currentStudent=null;}$('#accountTop').textContent=currentStudent?`👤 ${currentStudent.firstName}`:'👤 ورود / ثبت‌نام';$('#accountGreeting').textContent=currentStudent?`وارد شده: ${currentStudent.firstName} ${currentStudent.surname}`:'برای ساخت صفحه، گروه و ارسال پیام ثبت‌نام کن.';$('#accountForm').hidden=!!currentStudent;$('#studentLogout').hidden=!currentStudent;return currentStudent;}
function openAccount(){$('#accountError').hidden=true;$('#accountDialog').showModal();}
$('#accountTop').addEventListener('click',async()=>{await refreshStudent();openAccount();});
$('#accountForm').addEventListener('submit',async e=>{e.preventDefault();await accountAction('register');});
$('#studentLogin').addEventListener('click',()=>accountAction('login'));
async function accountAction(action){const error=$('#accountError');error.hidden=true;try{const d=await api('/api/account/'+action,{method:'POST',body:JSON.stringify({firstName:$('#studentFirst').value.trim(),surname:$('#studentSurname').value.trim(),password:$('#studentPassword').value})});$('#studentPassword').value='';await refreshStudent();$('#accountDialog').close();status(`خوش آمدی ${d.student.firstName} ${d.student.surname}`);}catch(e){error.textContent=e.message;error.hidden=false;}}
$('#studentLogout').addEventListener('click',async()=>{await api('/api/account/logout',{method:'POST'});await refreshStudent();$('#accountDialog').close();});
refreshStudent();
const communityDialog = $('#communityDialog');
const communityList = $('#communityList');
let communityLastSignature = '';
function communityTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('fa-AF', {hour:'2-digit', minute:'2-digit'}); }
function communityDay(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fa-AF', {year:'numeric',month:'long',day:'numeric'}); }
function communityAvatar(name) { return (name || 'د').trim().charAt(0); }
function updateCommunityAccess() { const signedIn = !!currentStudent; $('#communityForm').hidden = !signedIn; $('#communityJoin').hidden = signedIn; }
$('#communityTop').addEventListener('click', async () => { communityDialog.showModal(); await refreshStudent(); updateCommunityAccess(); await loadCommunity(true); });
$('#communityJoin').addEventListener('click', () => { communityDialog.close(); openAccount(); });
$('#communityRefresh').addEventListener('click', () => loadCommunity(true));
async function loadCommunity(force=false) {
 try {
  const d = await api('/api/community'); const items = d.messages || [];
  const signature = JSON.stringify(items);
  if (signature === communityLastSignature && !force) return;
  const atBottom = communityList.scrollHeight - communityList.scrollTop - communityList.clientHeight < 130;
  communityLastSignature = signature;
  let previousDay = '';
  communityList.innerHTML = items.length ? items.map(m => {
   const day = communityDay(m.createdAt);
   const separator = day && day !== previousDay ? `<div class="chat-date"><span>${escapeHtml(day)}</span></div>` : '';
   previousDay = day;
   const name = m.displayName || 'دانشجو';
   return `${separator}<article class="chat-message"><div class="chat-avatar" aria-hidden="true">${escapeHtml(communityAvatar(name))}</div><div class="chat-bubble"><div class="chat-author">${escapeHtml(name)}</div><p>${escapeHtml(m.body)}</p><time>${escapeHtml(communityTime(m.createdAt))}</time></div></article>`;
  }).join('') : '<div class="chat-empty"><div>💬</div><strong>گفتگو را آغاز کن!</strong><p>هنوز پیامی ارسال نشده است. اولین نفری باش که سلام می‌کند.</p></div>';
  $('#communityStatus').hidden = true;
  if (atBottom || force) communityList.scrollTop = communityList.scrollHeight;
 } catch (e) { $('#communityStatus').textContent = e.message; $('#communityStatus').hidden = false; }
}
$('#communityForm').addEventListener('submit', async e => {
 e.preventDefault(); if(!await refreshStudent()){ communityDialog.close();openAccount();return; }
 const send = $('#communityForm button[type=submit]'); send.disabled = true;
 try { await api('/api/community', {method:'POST', body:JSON.stringify({body:$('#communityText').value.trim()})}); $('#communityText').value = ''; await loadCommunity(true); }
 catch (err) { $('#communityStatus').textContent = err.message; $('#communityStatus').hidden = false; }
 finally { send.disabled = false; }
});
setInterval(async () => { if ($('#communityDialog').open) await loadCommunity(); if ($('#contentDialog').open && currentItem) { try { const d = await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/messages`); messages = d.messages || []; renderMessages(); } catch {} } }, 5000);
function trackPage() { let visitor = localStorage.getItem('dj_visitor_id'); if (!visitor) { visitor = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/-/g,''); localStorage.setItem('dj_visitor_id', visitor); } fetch('/api/track', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({visitorId:visitor, path:location.pathname})}).catch(() => {}); }
trackPage();
loadSpaces();
