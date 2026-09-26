/* Estação B12 — service worker. SUBIR A VERSÃO A CADA PUBLICAÇÃO. */
const CACHE = 'b12-v1.52.0';
/* o index pede os arquivos carimbados (x.js?v=1.27.0); guardo os mesmos endereços */
const V = CACHE.replace('b12-v', '');
const ESSENCIAL = ['./', './index.html', './estilo.css?v=' + V, './marca.js?v=' + V, './dados.js?v=' + V, './nucleo.js?v=' + V,
  './exportar.js?v=' + V, './oceano.js?v=' + V, './formularios.js?v=' + V, './acesso.js?v=' + V, './mensagens.js?v=' + V, './turista.js?v=' + V, './assistente.js?v=' + V, './adm.js?v=' + V, './app.js?v=' + V, './manifest.webmanifest',
  './compartilhar.jpg', './fotos/heroi.jpg', './fotos/farol.jpg', './fotos/ilha-heroi.jpg', './fotos/travessia.jpg',
  './fotos/p-golfinhos.jpg', './fotos/p-sebui.jpg', './fotos/p-tour360.jpg', './fotos/ilha-galheta.jpg'];
/* as outras fotos entram no cache na primeira vez que são vistas (fetch abaixo) */

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
