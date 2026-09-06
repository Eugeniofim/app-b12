/* Estação B12 — service worker. SUBIR A VERSÃO A CADA PUBLICAÇÃO. */
const CACHE = 'b12-v1.6.1';
const ESSENCIAL = ['./', './index.html', './estilo.css', './dados.js', './nucleo.js',
  './oceano.js', './formularios.js', './acesso.js', './mensagens.js', './turista.js', './adm.js', './app.js', './manifest.webmanifest',
  './fotos/heroi.jpg', './fotos/farol.jpg', './fotos/passeio1.jpg', './fotos/passeio2.jpg',
  './fotos/passeio3.jpg', './fotos/passeio4.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENCIAL)).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  if (e.data && e.data.tipo === 'assumir') self.skipWaiting();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;   /* clima vai direto pra rede */
  const ehApp = req.mode === 'navigate' || req.destination === 'document' ||
                /\/(index\.html)?$/.test(new URL(req.url).pathname);
  const pedido = ehApp
    ? fetch(new Request(req.url, {cache:'no-store', credentials:'same-origin'}))
    : fetch(req);
  e.respondWith(pedido.then(res => {
      if (res && res.ok) { const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(()=>{}); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
});
