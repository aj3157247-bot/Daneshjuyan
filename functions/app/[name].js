// Human-readable app share pages. Bots receive Open Graph metadata; users get the download.
const APPS = {
  abzar: {
    title: 'دانش‌ابزار | دانلود ابزارهای آفلاین فارسی',
    description: 'دانلود اپلیکیشن دانش‌ابزار برای اندروید؛ ابزارهای کاربردی فارسی و دسترسی به امکانات آموزشی دانشجویان.',
    image: '/icons/daneshjuyan-2026-512.png',
    download: 'https://github.com/aj3157247-bot/Daneshjuyan/releases/download/v1.0.0/DaneshAbzar-v1.0.0.apk'
  },
  daneshjuyan: {
    title: 'دانشجویان | دانلود اپلیکیشن آموزشی',
    description: 'دانلود اپلیکیشن دانشجویان؛ دسترسی به صفحات، گروه‌ها، نوت‌ها و فایل‌های درسی دانشجویان افغانستان.',
    image: '/icons/daneshjuyan-header-2026.png',
    download: '/downloads/daneshjuyan.apk'
  }
};
const escapeHtml = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function onRequestGet({request,params}) {
  const name = String(params.name || '').toLowerCase();
  const app = Object.prototype.hasOwnProperty.call(APPS,name) ? APPS[name] : null;
  if (!app) return new Response('App not found', {status:404});
  const page = new URL(request.url);
  const download = new URL(app.download,page.origin).href;
  const image = new URL(app.image,page.origin).href;
  const title = escapeHtml(app.title);
  const description = escapeHtml(app.description);
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:site_name" content="دانشجویان"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${escapeHtml(page.href)}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:width" content="512"><meta property="og:image:height" content="512"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${escapeHtml(image)}"><style>body{font-family:system-ui,Tahoma,sans-serif;background:#eef8f5;color:#123b34;text-align:center;padding:40px 15px}main{background:white;max-width:430px;margin:auto;border-radius:24px;padding:28px;box-shadow:0 8px 25px #0001}img{width:130px;height:130px;object-fit:contain;border-radius:20px}a{display:inline-block;background:#087c68;color:white;text-decoration:none;padding:14px 28px;border-radius:14px;margin-top:20px}</style></head><body><main><img src="${escapeHtml(image)}" alt="لوگوی اپلیکیشن"><h1>${title}</h1><p>${description}</p><a href="${escapeHtml(download)}">دانلود اپلیکیشن (APK)</a></main></body></html>`;
  return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300','x-content-type-options':'nosniff'}});
}
