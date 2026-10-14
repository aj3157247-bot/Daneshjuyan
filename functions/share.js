// Dedicated share endpoint: metadata is rendered on the server for WhatsApp/Telegram.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const destination = new URL('/', url.origin);
  for (const key of ['space','community','item','itemId','semester']) {
    if (p.has(key)) destination.searchParams.set(key, p.get(key));
  }
  let title = 'دانشجویان | صفحه‌ها و گروه‌ها';
  let description = 'گروه‌های دانشجویی و منابع درسی افغانستان';
  if (p.get('tool') === 'pdf') {
    destination.pathname='/tools/pdf-converter.html';
    title='تبدیل PDF فارسی و دری به Word و TXT | ابزار رایگان دانشجویان';
    description='فایل PDF فارسی، دری یا اسکن‌شده را به Word قابل ویرایش و متن TXT تبدیل کنید؛ با تشخیص متن OCR، پشتیبانی از راست‌به‌چپ و پیش‌نمایش برای اصلاح نتیجه. کیفیت خروجی به فایل اصلی بستگی دارد.';
  } else if (p.get('community') === '1') {
    title = 'گروه عمومی دانشجویان افغانستان | دانشجویان';
    description = 'گفتگو و تبادل معلومات میان دانشجویان افغانستان';
  } else if (p.get('space') && env.DB) {
    try {
      const id = p.get('space');
      const space = await env.DB.prepare('SELECT id, kind, title, university, field, semester FROM spaces WHERE id = ?').bind(id).first();
      if (space) {
        title = `${space.kind === 'group' ? 'گروه' : 'صفحه درسی'} ${space.title} | دانشجویان`;
        description = [space.university, space.field, space.semester].filter(Boolean).join(' • ');
        const itemId = p.get('itemId');
        const kind = p.get('item');
        if (itemId && kind === 'note') {
          let note = await env.DB.prepare('SELECT title FROM space_semester_notes WHERE id = ? AND space_id = ?').bind(itemId,id).first();
          if (!note) note = await env.DB.prepare('SELECT title FROM space_notes WHERE id = ? AND space_id = ?').bind(itemId,id).first();
          if (note) title = `نوت کامل ${note.title} | دانشجویان`;
        } else if (itemId && kind === 'file') {
          const file = await env.DB.prepare('SELECT title, file_name FROM space_files WHERE id = ? AND space_id = ?').bind(itemId,id).first();
          if (file) title = `فایل درسی ${file.title || file.file_name} | دانشجویان`;
        } else if (itemId && kind === 'post') {
          const post = await env.DB.prepare('SELECT id FROM space_messages WHERE id = ? AND space_id = ?').bind(itemId,id).first();
          if (post) title = `پیام از ${space.title} | دانشجویان`;
        }
      }
    } catch (error) {
      console.error('Share preview metadata lookup failed', error);
    }
  }
  const image = new URL('/icons/daneshjuyan-header-2026.png', url.origin).href;
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:site_name" content="دانشجویان"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url.href)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="512"><meta property="og:image:height" content="512"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(image)}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta http-equiv="refresh" content="1;url=${esc(destination.href)}"></head><body style="font-family:system-ui;text-align:center;padding:3rem"><h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="${esc(destination.href)}">ورود به دانشجویان</a></p><script>location.replace(${JSON.stringify(destination.href).replace(/</g,'\\u003c')});</script></body></html>`;
  return new Response(html, {headers: {'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','x-robots-tag':'noindex'}});
}
