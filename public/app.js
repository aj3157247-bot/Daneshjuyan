const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let activeKind='page', joiningId=null, currentItem=null, notes=[], messages=[];
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(msg){$('#status').textContent=msg;$('#status').hidden=!msg}
function openCreate(){ $('#createForm').reset(); $('#createDialog').showModal() }
['#createTop','#createHero','#createEmpty'].forEach(s=>$(s).addEventListener('click',openCreate));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).close()));
$$('.tab').forEach(b=>b.addEventListener('click',()=>{activeKind=b.dataset.kind;$$('.tab').forEach(t=>t.classList.toggle('active',t===b));render()}));
$('#search').addEventListener('input',render);

async function api(path, options={}) {
 const res=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})},credentials:'same-origin'});
 let data={}; try{data=await res.json()}catch{}
 if(!res.ok) throw new Error(data.error||'درخواست انجام نشد');
 return data;
}
async function loadSpaces(){
 try { const d=await api('/api/spaces'); window.spaces=d.spaces||[]; status(''); render(); }
 catch(e){window.spaces=[];render();status('Backend هنوز آماده نیست یا پایگاه داده D1 وصل نشده است. این فهرست تا زمان اتصال Backend خالی می‌ماند.')}
}
$('#createForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=new FormData(e.currentTarget);
 const payload={kind:f.get('kind'),title:String(f.get('title')).trim(),university:String(f.get('university')).trim(),field:String(f.get('field')).trim(),semester:f.get('semester'),shift:f.get('shift'),password:String(f.get('password'))};
 try{const d=await api('/api/spaces',{method:'POST',body:JSON.stringify(payload)});$('#createDialog').close();activeKind=payload.kind;$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.kind===activeKind));$('#search').value='';status('صفحه/گروه ساخته شد. رمز را در جای امن نگه دار.');await loadSpaces();if(d.space)startJoin(d.space.id,true)}
 catch(err){status(err.message.includes('D1')?'برای ذخیره واقعی، D1 را تنظیم کن و schema.sql را اجرا کن.':err.message); }
});
function render(){
 const q=$('#search').value.trim().toLocaleLowerCase();
 const all=window.spaces||[];
 const shown=all.filter(x=>x.kind===activeKind&&[x.title,x.university,x.field,x.semester,x.shift].join(' ').toLocaleLowerCase().includes(q));
 $('#listing').innerHTML=shown.map(x=>`<article class="card"><div class="card-top"><div class="kind-icon">${x.kind==='page'?'▤':'☏'}</div><span class="badge">🔒 رمزدار</span></div><h3>${escapeHtml(x.title)}</h3><p>${x.kind==='page'?'صفحه اختصاصی صنف':'گروه گفتگو'}</p><div class="details"><span>${escapeHtml(x.university)}</span><span>${escapeHtml(x.field)}</span><span>${escapeHtml(x.semester)}</span><span>نوبت ${escapeHtml(x.shift)}</span></div><button class="enter" data-enter="${escapeHtml(x.id)}">🔑 ورود با رمز</button></article>`).join('');
 $('#empty').hidden=shown.length>0;$('#listing').hidden=shown.length===0;$('#emptyTitle').textContent=activeKind==='page'?'هنوز صفحه‌ای ساخته نشده':'هنوز گروهی ساخته نشده';
 $$('[data-enter]').forEach(b=>b.addEventListener('click',()=>startJoin(b.dataset.enter)));
}
function startJoin(id,created=false){joiningId=id;const item=(window.spaces||[]).find(x=>x.id===id);if(!item)return;$('#joinTitle').textContent=item.kind==='page'?'ورود به صفحه':'ورود به گروه';$('#joinDescription').textContent=`${item.title} • ${item.university} • ${item.field} • ${item.semester}`;$('#joinPassword').value='';$('#joinError').hidden=true;$('#joinDialog').showModal();if(created)$('#joinDescription').textContent+=' — برای بازکردن، همان رمز را وارد کن.'}
$('#joinForm').addEventListener('submit',async e=>{e.preventDefault();try{const d=await api(`/api/spaces/${encodeURIComponent(joiningId)}/join`,{method:'POST',body:JSON.stringify({password:$('#joinPassword').value})});$('#joinDialog').close();currentItem=d.space;openContent(d.space); }catch(err){$('#joinError').textContent=err.message||'رمز درست نیست یا دسترسی تأیید نشد.';$('#joinError').hidden=false;}});
async function openContent(item){$('#contentType').textContent=item.kind==='page'?'صفحه درسی':'گروه گفتگو';$('#contentTitle').textContent=item.title;$('#contentMeta').textContent=`${item.university} • ${item.field} • ${item.semester} • نوبت ${item.shift}`;notes=[];messages=[];renderNotes();renderMessages();showPanel('overview');$('#contentDialog').showModal();try{const d=await api(`/api/spaces/${encodeURIComponent(item.id)}/content`);if(!d.space)throw new Error('دسترسی تأیید نشد');const n=await api(`/api/spaces/${encodeURIComponent(item.id)}/notes`);notes=n.notes||[];renderNotes();const m=await api(`/api/spaces/${encodeURIComponent(item.id)}/messages`);messages=m.messages||[];renderMessages()}catch(e){status('ورود تأیید شد، اما دریافت محتوای سرور با خطا روبه‌رو شد: '+e.message)}}
function showPanel(name){$$('.inside-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));$$('.inside-panel').forEach(p=>p.hidden=p.id!=='panel-'+name)}
$$('.inside-tab').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.panel)));
$('#newNoteBtn').addEventListener('click',()=>$('#noteForm').hidden=!$('#noteForm').hidden);
$('#noteForm').addEventListener('submit',async e=>{e.preventDefault();try{const d=await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/notes`,{method:'POST',body:JSON.stringify({title:$('#noteTitle').value.trim(),body:$('#noteBody').value.trim()})});notes.unshift(d.note);$('#noteForm').reset();$('#noteForm').hidden=true;renderNotes()}catch(err){status('نوت ذخیره نشد: '+err.message)}});
function renderNotes(){$('#notesList').innerHTML=notes.length?notes.map(n=>`<article class="note-card"><h4>${escapeHtml(n.title)}</h4><p>${escapeHtml(n.body)}</p><small>${escapeHtml(n.createdAt||n.at||'')}</small><button class="secondary small" type="button" onclick="navigator.clipboard?.writeText(${JSON.stringify(n.body||'')}).then(()=>alert('نوت کپی شد'))">کپی نوت</button></article>`).join(''):'<p>هنوز نوتی اضافه نشده است. می‌توانی متن نوت را از موبایل کپی و اینجا بچسبانی.</p>'}
$('#chatForm').addEventListener('submit',async e=>{e.preventDefault();try{const body=$('#chatMessage').value.trim();const d=await api(`/api/spaces/${encodeURIComponent(currentItem.id)}/messages`,{method:'POST',body:JSON.stringify({body})});messages.push(d.message);$('#chatMessage').value='';renderMessages()}catch(err){status('پیام ارسال نشد: '+err.message)}});
function renderMessages(){$('#chatList').innerHTML=messages.map(m=>`<article class="message-card"><p>${escapeHtml(m.body)}</p><small>${escapeHtml(m.createdAt||m.at||'')}</small></article>`).join('')}
loadSpaces();
