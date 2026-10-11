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
  try { const d = await api('/api/spaces'); window.spaces = d.spaces || []; status(''); render(); if(!window._sharedSpaceOpened){window._sharedSpaceOpened=true;openSharedDestination();} }
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
  $('#listing').innerHTML = shown.map(x => `<article class="card ${x.kind==='page'?'page-card':'group-card'}"><div class="cover-art"><span class="cover-symbol">${x.kind==='page'?'▤':'☏'}</span><span class="badge">🔒 خصوصی</span></div><div class="card-body"><div class="card-avatar">${x.kind==='page'?'📚':'👥'}</div><h3>${escapeHtml(x.title)}</h3><p>${x.kind==='page'?'صفحه درسی · نوت‌ها و منابع':'گروه صنفی · گفتگو و هماهنگی'}</p><div class="details"><span>${escapeHtml(x.university)}</span><span>${escapeHtml(x.field)}</span><span>${escapeHtml(x.semester)}</span><span>نوبت ${escapeHtml(x.shift)}</span></div><button class="enter" data-enter="${escapeHtml(x.id)}">${x.kind==='page'?'مشاهده صفحه':'ورود به گروه'}　›</button><button class="share-card" type="button" data-share-space="${escapeHtml(x.id)}">🔗 اشتراک‌گذاری</button>${x.canDelete?`<button class="secondary small" type="button" data-delete-space="${escapeHtml(x.id)}">🗑 حذف ${x.kind==='page'?'صفحه':'گروه'}</button>`:''}</div></article>`).join('');
  $('#empty').hidden = shown.length > 0; $('#listing').hidden = shown.length === 0; $('#emptyTitle').textContent = activeKind === 'page' ? 'هنوز صفحه‌ای ساخته نشده' : 'هنوز گروهی ساخته نشده';
  $$('[data-enter]').forEach(b => b.addEventListener('click', () => startJoin(b.dataset.enter)));
  $$('[data-share-space]').forEach(b => b.addEventListener('click', () => shareLink(new URL('/share?space='+encodeURIComponent(b.dataset.shareSpace),location.origin).href, 'صفحه یا گروه دانشجویان')));
  $$('[data-delete-space]').forEach(b=>b.addEventListener('click',()=>deleteOwnedSpace(b.dataset.deleteSpace)));
}
async function deleteOwnedSpace(id){
 const item=(window.spaces||[]).find(x=>x.id===id);if(!item||!item.canDelete)return;
 const type=item.kind==='page'?'صفحه':'گروه';
 if(!confirm(`اخطار: با حذف «${item.title}»، ${type} و تمام پست‌ها، عکس‌ها، فایل‌ها و اطلاعات مرتبط با آن برای همیشه حذف می‌شوند و قابل بازگردانی نیستند. آیا مطمئن هستی؟`))return;
 try{await api('/api/spaces?id='+encodeURIComponent(id),{method:'DELETE'});if(currentItem?.id===id){$('#contentDialog').close();currentItem=null;}await loadSpaces();status(`${type} برای همیشه حذف شد.`);}catch(err){alert('حذف انجام نشد: '+err.message);}
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
  $$('[data-panel=overview]').forEach(b => b.textContent = isPage ? 'درباره صفحه' : 'نمای کلی'); $$('[data-panel=notes]').forEach(b => b.textContent = isPage ? 'نوت‌های درسی' : 'نوت‌ها'); $$('[data-panel=files]').forEach(b => b.textContent = 'فایل‌ها'); $$('[data-panel=photos]').forEach(b => b.textContent = isPage ? 'عکس‌ها' : 'خاطرات'); $$('[data-panel=chat]').forEach(b => b.textContent = isPage ? '📰 پست‌ها' : '💬 گفتگو'); $('#panel-chat h3').textContent = isPage ? 'پست‌ها و اطلاعیه‌های صفحه' : 'گفتگوی اعضا'; $('#chatMessage').placeholder = isPage ? 'اطلاعیه یا مطلب درسی خود را بنویس…' : 'پیامی برای هم‌صنفی‌ها بنویس…'; $('#chatForm button[type=submit]').textContent = isPage ? 'انتشار پست' : 'ارسال پیام'; ($('#panel-chat .form-hint') || {textContent:''}).textContent = isPage ? 'پست‌ها برای اعضای واردشده در این صفحه نمایش داده می‌شوند.' : 'پیام‌های گروه برای اعضای واردشده نمایش داده می‌شوند.'; // Keep page tools on pages, but make groups a dedicated chat screen.
  $$('.inside-tab').forEach(b => { b.hidden = !isPage && b.dataset.panel !== 'chat'; });
  $('#activeSemester').closest('.semester-picker').hidden = !isPage;
  $('#contentMeta').hidden = !isPage;
  let shareButton = $('#shareCurrentSpace'); if(!shareButton){shareButton=document.createElement('button');shareButton.id='shareCurrentSpace';shareButton.type='button';shareButton.className='secondary small';shareButton.textContent='🔗 اشتراک‌گذاری';$('#contentTitle').after(shareButton);}
  shareButton.onclick=()=>shareLink(new URL('/share?space='+encodeURIComponent(item.id),location.origin).href,item.title);
  let deleteButton=$('#deleteCurrentSpace');if(!deleteButton){deleteButton=document.createElement('button');deleteButton.id='deleteCurrentSpace';deleteButton.type='button';deleteButton.className='secondary small';deleteButton.textContent='🗑 حذف صفحه / گروه';shareButton.after(deleteButton);}
  const owned=(window.spaces||[]).find(x=>x.id===item.id);deleteButton.hidden=!owned?.canDelete;deleteButton.onclick=()=>deleteOwnedSpace(item.id);
  showPanel('chat'); dlg.showModal(); renderAds('space', dlg);
  try { await api(`/api/spaces/${encodeURIComponent(item.id)}/content`); await loadSemesterContent(); const m = await api(`/api/spaces/${encodeURIComponent(item.id)}/messages`); messages = m.messages || []; renderMessages(); await navigateSharedContent(); }
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
  $('#notesList').innerHTML = notes.length ? notes.map(n => `<article class="note-card"><div class="note-top"><h4>${escapeHtml(n.title)}</h4><div class="share-item-actions"><button class="secondary small" type="button" data-copy-note="${escapeHtml(n.id)}">📋 کپی نوت</button><button class="secondary small" type="button" data-share-note="${escapeHtml(n.id)}">🔗 اشتراک نوت</button></div></div><p>${escapeHtml(n.body)}</p><small>${escapeHtml(n.createdAt || '')}</small></article>`).join('') : '<p>هنوز نوتی اضافه نشده است. می‌توانی نوت را از موبایل کپی و اینجا بچسبانی.</p>';
  $$('[data-share-note]').forEach(b=>b.addEventListener('click',()=>shareContent('note',b.dataset.shareNote,notes.find(n=>n.id===b.dataset.shareNote)?.title)));
  $$('[data-copy-note]').forEach(b => b.addEventListener('click', async () => { const n = notes.find(x => x.id === b.dataset.copyNote); try { await navigator.clipboard.writeText(n?.body || ''); alert('نوت کپی شد.'); } catch { alert('کپی خودکار ممکن نشد؛ متن را انتخاب و کپی کن.'); } }));
}
// Post photos use the existing private photo storage, so they also appear in the Photos tab.
const postPhotoPattern = /^\[\[DJ_PHOTO:([0-9a-f-]{36})\]\](?:\n|$)/i;
function postParts(body) { const value=String(body||''); const match=value.match(postPhotoPattern); return {photoId:match?.[1]||null,text:match?value.slice(match[0].length):value}; }
function photoUrl(id) { return `/api/spaces/${encodeURIComponent(currentItem.id)}/asset/${encodeURIComponent(id)}?inline=1`; }
$('#chatForm').addEventListener('submit', async e => {
  e.preventDefault(); const button=e.currentTarget.querySelector('button[type=submit]');
  const input=$('#postPhoto'), file=input?.files?.[0], text=$('#chatMessage').value.trim();
  if (!text && !file) {status('متن یا عکس انتخاب کن.');return;}
  button.disabled=true;
  try {
    let photoId=null;
    if(file){
      const fd=new FormData();fd.append('file',file);fd.append('type','photo');fd.append('semester',String(activeSemester()));fd.append('caption',text.slice(0,250));
      const res=await fetch(`/api/spaces/${encodeURIComponent(currentItem.id)}/assets`,{method:'POST',body:fd,credentials:'same-origin'});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'عکس بارگذاری نشد.');photoId=data.id;
    }
    const body=photoId?`[[DJ_PHOTO:${photoId}]]\n${text}`:text;
    const d=await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/messages`,{method:'POST',body:JSON.stringify({body})});
    messages.push(d.message);$('#chatForm').reset();renderMessages();
    if(photoId){await loadSemesterContent();showPanel('chat');}
    status('');
  }catch(err){status('انتشار پست انجام نشد: '+err.message);}
  finally{button.disabled=false;}
});
function renderMessages() {
 $('#chatList').innerHTML=messages.map(m=>{const post=postParts(m.body);return `<article class="message-card" data-message-id="${escapeHtml(m.id)}"><div class="share-item-actions"><button class="secondary small" type="button" data-share-post="${escapeHtml(m.id)}">🔗 اشتراک ${currentItem?.kind==='page'?'پست':'پیام'}</button></div>${post.photoId?`<button type="button" class="photo-preview-trigger" data-photo-open="${photoUrl(post.photoId)}" aria-label="بزرگ‌نمایی عکس پست"><img class="post-photo" loading="lazy" src="${photoUrl(post.photoId)}" alt="عکس پست"></button>`:''}${post.text?`<p>${escapeHtml(post.text)}</p>`:''}<small>${escapeHtml(m.createdAt||'')}</small></article>`;}).join('')||'<p>هنوز پیامی فرستاده نشده است.</p>';
 $$('[data-share-post]').forEach(b=>b.addEventListener('click',()=>shareContent('post',b.dataset.sharePost,currentItem?.title)));
}
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
  const fs = assets.files || [], ps = assets.photos || [], canDelete = !!assets.canDelete;
  $('#filesList').innerHTML = fs.length ? fs.map(f => `<article class="note-card"><h4>${escapeHtml(f.title || f.fileName)}</h4><p>${escapeHtml(f.fileName)} • ${Math.max(1, Math.round((f.fileSize || 0)/1024))} KB</p><div class="share-item-actions"><a class="download-link" href="/api/spaces/${encodeURIComponent(currentItem.id)}/asset/${encodeURIComponent(f.id)}">دانلود فایل</a><button class="secondary small" type="button" data-share-file="${escapeHtml(f.id)}">🔗 اشتراک فایل</button>${canDelete?`<button class="secondary small" type="button" data-delete-asset="${escapeHtml(f.id)}" data-delete-type="file">🗑 حذف فایل</button>`:''}</div></article>`).join('') : '<p>در این سمستر هنوز فایلی اضافه نشده است.</p>';
  $$('[data-share-file]').forEach(b=>b.addEventListener('click',()=>shareContent('file',b.dataset.shareFile,fs.find(f=>f.id===b.dataset.shareFile)?.title)));

  $('#photosList').innerHTML = ps.length ? ps.map(p => `<article class="note-card photo-card"><button type="button" class="photo-preview-trigger" data-photo-open="${photoUrl(p.id)}" data-photo-caption="${escapeHtml(p.caption || p.fileName)}" aria-label="نمایش عکس در اندازه بزرگ"><img loading="lazy" alt="${escapeHtml(p.caption || p.fileName)}" src="${photoUrl(p.id)}"></button><p class="photo-caption">${escapeHtml(p.caption || '')}</p><a class="download-link" href="/api/spaces/${encodeURIComponent(currentItem.id)}/asset/${encodeURIComponent(p.id)}">دانلود عکس</a>${canDelete?`<button class="secondary small" type="button" data-delete-asset="${escapeHtml(p.id)}" data-delete-type="photo">🗑 حذف عکس</button>`:''}</article>`).join('') : '<p>هنوز عکسی ثبت نشده است.</p>';
  $$('[data-delete-asset]').forEach(b=>b.addEventListener('click',async()=>{
    const type=b.dataset.deleteType;
    if(!confirm(`آیا از حذف دائمی ${type==='photo'?'این عکس':'این فایل'} مطمئن هستی؟`))return;
    b.disabled=true;
    try{await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/assets/${encodeURIComponent(b.dataset.deleteAsset)}?type=${type}`,{method:'DELETE'});await loadSemesterContent();status('مورد حذف شد.');}
    catch(e){status(e.message);b.disabled=false;}
  }));
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
$('#shareCommunity').addEventListener('click', () => shareLink(new URL('/share?community=1',location.origin).href,'گروه عمومی دانشجویان'));
$('#communityTop').addEventListener('click', async () => { communityDialog.showModal(); renderAds('community', communityDialog.querySelector('.chat-shell')); await refreshStudent(); updateCommunityAccess(); await loadCommunity(true); });
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

function adVisitor(){let v=localStorage.getItem('dj_visitor_id');if(!v){v=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}${Math.random()}`).replace(/-/g,'');localStorage.setItem('dj_visitor_id',v)}return v}
async function renderAds(placement,host){if(!host)return;try{const d=await api('/api/ads?placement='+encodeURIComponent(placement));const ads=d.ads||[];let slot=host.querySelector(':scope > .dj-ad-slot[data-placement="'+placement+'"]');if(!slot){slot=document.createElement('div');slot.className='dj-ad-slot';slot.dataset.placement=placement;host.prepend(slot)}slot.innerHTML=ads.slice(0,1).map(a=>`<a class="dj-ad" href="${escapeHtml(a.targetUrl)}" target="_blank" rel="sponsored noopener" data-ad-id="${escapeHtml(a.id)}"><img src="${escapeHtml(a.imageUrl||'/logo.svg')}" alt=""><span class="dj-ad-copy"><small>تبلیغات</small><b>${escapeHtml(a.title)}</b><p>${escapeHtml(a.description||'')}</p></span><span class="dj-ad-cta">مشاهده ↗</span></a>`).join('');ads.slice(0,1).forEach(a=>fetch('/api/ads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adId:a.id,eventType:'impression',visitorId:adVisitor()})}).catch(()=>{}));slot.querySelectorAll('[data-ad-id]').forEach(a=>a.addEventListener('click',()=>{navigator.sendBeacon?.('/api/ads',new Blob([JSON.stringify({adId:a.dataset.adId,eventType:'click',visitorId:adVisitor()})],{type:'application/json'}))||fetch('/api/ads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adId:a.dataset.adId,eventType:'click',visitorId:adVisitor()}),keepalive:true}).catch(()=>{})}))}catch{}}

function trackPage() { let visitor = localStorage.getItem('dj_visitor_id'); if (!visitor) { visitor = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/-/g,''); localStorage.setItem('dj_visitor_id', visitor); } fetch('/api/track', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({visitorId:visitor, path:location.pathname})}).catch(() => {}); }
trackPage();
renderAds('home', document.querySelector('.toolbar')?.parentElement);
loadSpaces();

async function shareLink(url,title){
 try { if(navigator.share){await navigator.share({title,url});return;} } catch(e){if(e.name==='AbortError')return;}
 try {await navigator.clipboard.writeText(url);alert('لینک کپی شد؛ حالا می‌توانی آن را برای دوستانت بفرستی.');}
 catch {window.prompt('لینک اشتراک‌گذاری را کپی کن:',url);}
}
function openSharedDestination(){
 const query=new URLSearchParams(location.search);
 if(query.get('community')==='1'){$('#communityTop')?.click();return;}
 const id=query.get('space'); if(!id)return;
 const item=(window.spaces||[]).find(x=>x.id===id);
 if(item)startJoin(id);
}
window.addEventListener('load',()=>setTimeout(openSharedDestination,1000));

// Item links open their parent private space first; access checks remain server-side.
function shareContent(kind,id,title){
 if(!currentItem||!id)return;
 const u=new URL('/share',location.origin);
 u.searchParams.set('space',currentItem.id);
 u.searchParams.set('item',kind);
 u.searchParams.set('itemId',id);
 if(kind==='note'||kind==='file')u.searchParams.set('semester',String(activeSemester()));
 shareLink(u.href,title||'محتوای دانشجویان');
}
async function navigateSharedContent(){
 const q=new URLSearchParams(location.search);
 if(!currentItem||q.get('space')!==currentItem.id)return;
 const kind=q.get('item'),id=q.get('itemId');if(!id||!['note','file','post'].includes(kind))return;
 if(kind==='note'||kind==='file'){
  const sem=Number(q.get('semester'));
  if(Number.isInteger(sem)&&sem>=1&&sem<=8&&sem!==activeSemester()){
   $('#activeSemester').value=String(sem);await loadSemesterContent();
  }
 }
 showPanel(kind==='note'?'notes':kind==='file'?'files':'chat');
 const list=kind==='note'?notes:kind==='file'?(assets.files||[]):messages;
 if(!list.some(x=>String(x.id)===id))return;
 const container=kind==='note'?'#notesList':kind==='file'?'#filesList':'#chatList';
 const idx=list.findIndex(x=>String(x.id)===id);
 const card=document.querySelector(container)?.children[idx];
 if(card){card.classList.add('shared-target');setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'center'}),150);}
}

// Shared photo lightbox for posts and the Photos tab.
document.addEventListener('click',e=>{
 const trigger=e.target.closest('[data-photo-open]');if(!trigger)return;
 const viewer=document.getElementById('photoViewer');
 const img=document.getElementById('photoViewerImage');
 img.src=trigger.dataset.photoOpen;
 img.alt=trigger.dataset.photoCaption||'عکس بزرگ';
 document.getElementById('photoViewerCaption').textContent=trigger.dataset.photoCaption||'';
 viewer.showModal();
});
document.getElementById('photoViewerClose').addEventListener('click',()=>document.getElementById('photoViewer').close());
document.getElementById('photoViewer').addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.close();});
document.getElementById('photoViewer').addEventListener('close',()=>{document.getElementById('photoViewerImage').removeAttribute('src');});
