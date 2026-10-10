const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORAGE = 'daneshjuyan_simple_demo_v1';
let items = [];
let activeKind = 'page';
let joiningId = null;
let unlockedIds = [];

try { items = JSON.parse(localStorage.getItem(STORAGE) || '[]'); } catch { items = []; }
try { unlockedIds = JSON.parse(localStorage.getItem('daneshjuyan_unlocked_demo_v1') || '[]'); } catch { unlockedIds = []; }
const save = () => localStorage.setItem(STORAGE, JSON.stringify(items));
const saveUnlocked = () => localStorage.setItem('daneshjuyan_unlocked_demo_v1', JSON.stringify(unlockedIds));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openCreate(){ $('#createForm').reset(); $('#createDialog').showModal(); }
['#createTop','#createHero','#createEmpty'].forEach(sel => $(sel).addEventListener('click', openCreate));
$$('[data-close]').forEach(b => b.addEventListener('click', () => $('#'+b.dataset.close).close()));
$$('.tab').forEach(b => b.addEventListener('click', () => {
  activeKind = b.dataset.kind; $$('.tab').forEach(t=>t.classList.toggle('active',t===b)); render();
}));
$('#search').addEventListener('input', render);

$('#createForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const item = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random())),
    kind: f.get('kind'), title: String(f.get('title')).trim(),
    university: String(f.get('university')).trim(), field: String(f.get('field')).trim(),
    semester: f.get('semester'), shift: f.get('shift'), password: String(f.get('password')),
    createdAt: new Date().toISOString()
  };
  if (!item.title || !item.university || !item.field || !item.semester || item.password.length < 4) return;
  items.unshift(item); save(); $('#createDialog').close(); activeKind=item.kind;
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.kind===activeKind));
  $('#search').value=''; render();
});

function render(){
  const q = $('#search').value.trim().toLocaleLowerCase();
  const shown = items.filter(x => x.kind===activeKind && [x.title,x.university,x.field,x.semester,x.shift].join(' ').toLocaleLowerCase().includes(q));
  $('#listing').innerHTML = shown.map(x => `
    <article class="card">
      <div class="card-top"><div class="kind-icon">${x.kind==='page'?'▤':'☏'}</div><span class="badge">🔒 رمزدار</span></div>
      <h3>${escapeHtml(x.title)}</h3>
      <p>${x.kind==='page'?'صفحه اختصاصی صنف':'گروه گفتگو'}</p>
      <div class="details"><span>${escapeHtml(x.university)}</span><span>${escapeHtml(x.field)}</span><span>${escapeHtml(x.semester)}</span><span>نوبت ${escapeHtml(x.shift)}</span></div>
      <button class="enter" data-enter="${escapeHtml(x.id)}">🔑 وارد شدن با رمز</button>
    </article>`).join('');
  $('#empty').hidden = shown.length !== 0;
  $('#listing').hidden = shown.length === 0;
  $$('[data-enter]').forEach(b=>b.addEventListener('click',()=>startJoin(b.dataset.enter)));
}
function startJoin(id){
  joiningId=id; const item=items.find(x=>x.id===id); if(!item)return;
  if (unlockedIds.includes(id)) { showContent(item); return; }
  $('#joinTitle').textContent = item.kind==='page'?'ورود به صفحه':'ورود به گروه';
  $('#joinDescription').textContent = `${item.title} — ${item.university}، ${item.field}، ${item.semester}`;
  $('#joinPassword').value=''; $('#joinError').hidden=true; $('#joinDialog').showModal();
}
$('#joinForm').addEventListener('submit', e=>{
  e.preventDefault(); const item=items.find(x=>x.id===joiningId); if(!item)return;
  if($('#joinPassword').value !== item.password){ $('#joinError').hidden=false; return; }
  $('#joinDialog').close();
  if (!unlockedIds.includes(item.id)) unlockedIds.push(item.id);
  saveUnlocked();
  showContent(item);
});
function showContent(item){
  $('#contentType').textContent=item.kind==='page'?'صفحه صنف':'گروه گفتگو';
  $('#contentTitle').textContent=item.title;
  $('#contentMeta').textContent=`${item.university} • ${item.field} • ${item.semester} • نوبت ${item.shift}`;
  $('#insideHeading').textContent=item.kind==='page'?'محتوای صفحه صنف':'گفتگوی گروه';
  $('#insideText').textContent=item.kind==='page'?'در نسخه کامل، نوت‌ها و فایل‌های درسی اینجا نمایش داده می‌شوند.':'در نسخه کامل، پیام‌های اعضای مجاز اینجا نمایش داده می‌شوند.';
  $('#contentDialog').showModal();
}
render();
