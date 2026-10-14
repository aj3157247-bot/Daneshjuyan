// Permanent short, meaningful URLs for app downloads.
// Update the destination here when publishing a new APK version.
const DOWNLOADS = {
  abzar: 'https://github.com/aj3157247-bot/Daneshjuyan/releases/download/v1.0.0/DaneshAbzar-v1.0.0.apk',
  daneshjuyan: '/downloads/daneshjuyan.apk'
};
export async function onRequestGet({request, params}) {
  const name = String(params.name || '').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(DOWNLOADS, name)) {
    return new Response('App not found', {status: 404});
  }
  const target = new URL(DOWNLOADS[name], request.url);
  return Response.redirect(target.toString(), 302);
}
