/* Estação B12 — service worker. SUBIR A VERSÃO A CADA PUBLICAÇÃO. */
const CACHE = 'b12-v1.61.0';
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

/* ======================================================= AVISOS NO CELULAR
   O empurrão chega aqui mesmo com o app fechado. O servidor manda um JSON
   com titulo, texto e para onde levar quando a pessoa tocar. */
self.addEventListener('push', e => {
  let d = { titulo: 'Estação B12', texto: 'Você tem um aviso novo.', ir: '/' };
  try { if (e.data) d = Object.assign(d, e.data.json()); }
  catch (err) { try { d.texto = e.data.text(); } catch (e2) {} }

  e.waitUntil(self.registration.showNotification(d.titulo, {
    body: d.texto,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || 'b12',
    renotify: !!d.tag,
    requireInteraction: !!d.importante,
    data: { ir: d.ir || '/' }
  }));
});

/* tocou no aviso: traz o app para a frente na tela certa, sem abrir outra aba */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.ir) || '/';
  e.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(lista => {
    for (const c of lista) {
      if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) {
        c.navigate(destino).catch(()=>{});
        return c.focus();
      }
    }
    return self.clients.openWindow(destino);
  }));
});

/* o navegador trocou a assinatura sozinho: a página reinscreve na próxima abertura */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil(self.clients.matchAll({ includeUncontrolled:true }).then(lista => {
    lista.forEach(c => c.postMessage({ tipo: 'reinscrever' }));
  }));
});
