const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let activeKind = 'page', joiningId = null, currentItem = null, notes = [], messages = [], assets = {files: [], photos: []}, currentStudent = null, accountMode = 'register';
const activeSemester = () => Number($('#activeSemester')?.value || 1);
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(msg) { $('#status').textContent = msg; $('#status').hidden = !msg; }
function adminStatus(msg) { $('#adminStatus').textContent = msg; $('#adminStatus').hidden = false; }
function openCreate() { $('#createForm').reset(); $('#createError').hidden = true; $('#createSubmit').disabled = false; $('#createSubmit').textContent = 'ساختن'; $('#createDialog').showModal(); }
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
function updateAccountUi() {
  const btn=$('#accountTop');
  if(currentStudent){btn.textContent=`👤 ${currentStudent.firstName} ${currentStudent.surname}`;$('#accountForm').hidden=true;$('#accountSignedIn').hidden=false;$('#signedInName').textContent=`${currentStudent.firstName} ${currentStudent.surname}`;$('#accountTitle').textContent='حساب دانشجویی';}
  else {btn.textContent='👤 حساب دانشجویی';$('#accountForm').hidden=false;$('#accountSignedIn').hidden=true;setAccountMode(accountMode);}
  $('#chatForm button[type=submit]').disabled=!currentStudent;
  $('#chatMessage').disabled=!currentStudent;
  $('#chatLoginHint').textContent=currentStudent?`پیام با نام ${currentStudent.firstName} ${currentStudent.surname} ارسال می‌شود.`:'برای ارسال پیام، ابتدا حساب دانشجویی بساز یا وارد حساب خود شو.';
}
function setAccountMode(mode){accountMode=mode;$('#accountTitle').textContent=mode==='register'?'ساخت حساب دانشجویی':'ورود به حساب دانشجویی';$('#accountSubmit').textContent=mode==='register'?'ساخت حساب':'ورود';$('#accountModeText').textContent=mode==='register'?'قبلاً حساب ساخته‌ای؟':'هنوز حساب نداری؟';$('#accountModeToggle').textContent=mode==='register'?'ورود به حساب':'ساخت حساب جدید';$('#studentPassword').autocomplete=mode==='register'?'new-password':'current-password';}
async function refreshStudent(){try{const d=await api('/api/account/me');currentStudent=d.student||null;}catch{currentStudent=null;}updateAccountUi();}
$('#accountTop').addEventListener('click',()=>{if(!currentStudent)setAccountMode(accountMode);$('#accountError').hidden=true;$('#accountDialog').showModal();});
$('#accountModeToggle').addEventListener('click',()=>{setAccountMode(accountMode==='register'?'login':'register');$('#accountError').hidden=true;});
$('#accountForm').addEventListener('submit',async e=>{e.preventDefault();const payload={firstName:$('#studentFirstName').value.trim(),surname:$('#studentSurname').value.trim(),password:$('#studentPassword').value};const btn=$('#accountSubmit');btn.disabled=true;$('#accountError').hidden=true;try{const d=await api(accountMode==='register'?'/api/account/register':'/api/account/login',{method:'POST',body:JSON.stringify(payload)});currentStudent=d.student;$('#studentPassword').value='';updateAccountUi();$('#accountDialog').close();status(`خوش آمدی ${currentStudent.firstName} ${currentStudent.surname}. حالا می‌توانی در گفتگوها پیام بفرستی.`);if($('#communityDialog').open)await loadCommunity();if($('#contentDialog').open&&currentItem){const m=await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/messages`);messages=m.messages||[];renderMessages();}}catch(err){$('#accountError').textContent=err.message;$('#accountError').hidden=false;}finally{btn.disabled=false;}});
$('#accountLogout').addEventListener('click',async()=>{try{await api('/api/account/logout',{method:'POST',body:'{}'});}catch{}currentStudent=null;updateAccountUi();$('#accountDialog').close();status('از حساب دانشجویی خارج شدی.');});

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
  $$('[data-enter]').forEach(b => b.addEventListener('click', () => startJoin(b.dataset.enter)));
}
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
  $$('[data-panel=overview]').forEach(b => b.textContent = isPage ? 'درباره صفحه' : 'نمای کلی'); $$('[data-panel=notes]').forEach(b => b.textContent = isPage ? 'نوت‌های درسی' : 'نوت‌ها'); $$('[data-panel=files]').forEach(b => b.textContent = 'فایل‌ها'); $$('[data-panel=photos]').forEach(b => b.textContent = isPage ? 'عکس‌ها' : 'خاطرات'); $$('[data-panel=chat]').forEach(b => b.textContent = isPage ? '📰 پست‌ها' : '💬 گفتگو'); $('#panel-chat h3').textContent = isPage ? 'پست‌ها و اطلاعیه‌های صفحه' : 'گفتگوی اعضا'; $('#chatRoomTitle').textContent=item.title; $('#chatRoomSub').textContent=`${item.university} • ${item.field} • ${item.semester} • گفتگوی خصوصی`;  $('#chatMessage').placeholder = isPage ? 'اطلاعیه یا مطلب درسی خود را بنویس…' : 'پیامی برای هم‌صنفی‌ها بنویس…'; $('#chatForm button[type=submit]').textContent = isPage ? 'انتشار پست' : 'ارسال پیام'; $('#panel-chat .form-hint').textContent = isPage ? 'پست‌ها برای اعضای واردشده در این صفحه نمایش داده می‌شوند.' : 'پیام‌های گروه برای اعضای واردشده نمایش داده می‌شوند.'; showPanel('chat'); dlg.showModal();
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
$('#chatForm').addEventListener('submit', async e => { e.preventDefault(); try { const body = $('#chatMessage').value.trim(); const d = await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/messages`, {method:'POST', body:JSON.stringify({body})}); messages.push(d.message); $('#chatMessage').value = ''; renderMessages(); } catch (err) { status('پیام ارسال نشد: ' + err.message); if(err.message.includes('حساب دانشجویی')){accountMode='login';setAccountMode('login');$('#accountDialog').showModal();} } });
function renderMessages() { const isGroup=currentItem?.kind==='group'; $('#chatList').innerHTML = messages.map(m => `<article class="message-card ${currentStudent&&m.authorId===currentStudent.id?'own-message':'other-message'}"><b class="message-author">${escapeHtml(m.authorName || 'عضو قبلی')}</b><p>${escapeHtml(m.body)}</p><small>${escapeHtml(m.createdAt || '')}</small></article>`).join('') || '<p class="chat-empty">هنوز پیامی فرستاده نشده است. اولین پیام را بنویس!</p>'; if(isGroup)$('#chatList').scrollTop=$('#chatList').scrollHeight; }
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
$('#communityTop').addEventListener('click', async () => { $('#communityDialog').showModal(); await loadCommunity(); });
async function loadCommunity() { try { const d = await api('/api/community'); $('#communityList').innerHTML = (d.messages || []).map(m => `<article class="message-card"><b>${escapeHtml(m.displayName)}</b><p>${escapeHtml(m.body)}</p><small>${escapeHtml(m.createdAt || '')}</small></article>`).join('') || '<p>هنوز پیامی ثبت نشده است.</p>'; } catch (e) { $('#communityStatus').textContent = e.message; $('#communityStatus').hidden = false; } }
$('#communityForm').addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/community', {method:'POST', body:JSON.stringify({body:$('#communityText').value.trim()})}); $('#communityText').value = ''; await loadCommunity(); } catch (err) { $('#communityStatus').textContent = err.message; $('#communityStatus').hidden = false; if(err.message.includes('حساب دانشجویی')){accountMode='login';$('#accountDialog').showModal();} } });
setInterval(async () => { if ($('#communityDialog').open) await loadCommunity(); if ($('#contentDialog').open && currentItem) { try { const d = await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/messages`); messages = d.messages || []; renderMessages(); } catch {} } }, 5000);
function trackPage() { let visitor = localStorage.getItem('dj_visitor_id'); if (!visitor) { visitor = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/-/g,''); localStorage.setItem('dj_visitor_id', visitor); } fetch('/api/track', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({visitorId:visitor, path:location.pathname})}).catch(() => {}); }
trackPage();
refreshStudent();
loadSpaces();
