// Dynamic Open Graph metadata for shared links. Content stays protected by existing password checks.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function onRequest({request,env}) {
  const url = new URL(request.url);
  const response = await env.ASSETS.fetch(request);
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return response;
  let title = 'دانشجویان | صفحه‌ها و گروه‌ها';
  let description = 'فضای گفتگو، گروه‌های دانشجویی و منابع درسی افغانستان';
  const spaceId = url.searchParams.get('space');
  const kind = url.searchParams.get('item');
  const itemId = url.searchParams.get('itemId');
  if (url.searchParams.get('community') === '1') {
    title = 'گروه عمومی دانشجویان افغانستان | دانشجویان';
    description = 'گفتگوی عمومی و تبادل تجربه میان دانشجویان افغانستان';
  } else if (spaceId && env.DB) {
    try {
      const space = await env.DB.prepare('SELECT id,kind,title,university,field,semester FROM spaces WHERE id=?').bind(spaceId).first();
      if (space) {
        title = `${space.kind === 'group' ? 'گروه' : 'صفحه درسی'} ${space.title} | دانشجویان`;
        description = [space.university,space.field,space.semester].filter(Boolean).join(' • ');
        if (itemId && ['note','file','post'].includes(kind)) {
          let item;
          if (kind === 'note') {
            item = await env.DB.prepare('SELECT title FROM space_semester_notes WHERE id=? AND space_id=?').bind(itemId,spaceId).first();
            if (!item) item = await env.DB.prepare('SELECT title FROM space_notes WHERE id=? AND space_id=?').bind(itemId,spaceId).first();
          } else if (kind === 'file') {
            item = await env.DB.prepare('SELECT title,file_name FROM space_files WHERE id=? AND space_id=?').bind(itemId,spaceId).first();
          } else {
            item = await env.DB.prepare('SELECT id FROM space_messages WHERE id=? AND space_id=?').bind(itemId,spaceId).first();
          }
          if (item) {
            if (kind === 'note') title = `نوت کامل ${item.title} | دانشجویان`;
            else if (kind === 'file') title = `فایل درسی ${item.title || item.file_name} | دانشجویان`;
            else title = `پیام از گروه ${space.title} | دانشجویان`;
            description = `در ${space.title} • ${description}`;
          }
        }
      }
    } catch (e) { /* Keep general metadata when DB is unavailable. */ }
  }
  const image = new URL('/icons/daneshjuyan-header-2026.png',url.origin).href;
  const tags = `<meta property="og:type" content="website"><meta property="og:site_name" content="دانشجویان"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(url.href)}"><meta property="og:image" content="${escape(image)}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">`;
  const html = (await response.text()).replace(/<title>[^<]*<\/title>/i, `<title>${escape(title)}</title>`).replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escape(description)}">`).replace('</head>',`${tags}</head>`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store');
  return new Response(html,{status:response.status,headers});
}
