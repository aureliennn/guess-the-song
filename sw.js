// Arcade Néon : service worker (réseau d'abord, cache en secours, jamais de page blanche).
const CACHE = 'arc-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// Safari refuse une page servie par le service worker si elle a subi une redirection : on la recopie proprement.
const clean = res => res.redirected ? res.blob().then(b => new Response(b, {status: res.status, statusText: res.statusText, headers: res.headers})) : res;
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arcade Néon</title>' +
  '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#07040f;color:#f4f0ff;font:16px system-ui,sans-serif;text-align:center;padding:20px;box-sizing:border-box">' +
  '<div><div style="font-size:44px">📡</div><h1 style="font-size:22px">Pas de connexion</h1><p style="color:#a79fc4">Le site n\'a pas pu être chargé. Vérifie ta connexion puis réessaie.</p>' +
  '<button onclick="location.reload()" style="padding:12px 22px;border:0;border-radius:12px;background:#b86bff;color:#fff;font-weight:700;font-size:16px">Réessayer</button></div></body>';
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const nav = r.mode === 'navigate';
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)).catch(() => {}); }
      return nav ? clean(res) : res;
    }).catch(() => caches.match(r, {ignoreSearch: true}).then(hit => {
      if (hit) return nav ? clean(hit) : hit;
      if (nav) return caches.match('./', {ignoreSearch: true}).then(h => h ? clean(h) : new Response(OFFLINE, {headers: {'Content-Type': 'text/html; charset=utf-8'}}));
      return new Response('', {status: 504, statusText: 'offline'});
    }))
  );
});
