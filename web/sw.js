// Service worker: guarda la cáscara de la app para abrirla rápido. La API nunca se cachea.
const CACHE = 'gokubot-v1'
const SHELL = ['/app/', '/app/manifest.webmanifest', '/app/icon-192.png']
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r }).catch(() => caches.match(e.request)))
})
