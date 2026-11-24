/* Estação B12 — service worker. SUBIR A VERSÃO A CADA PUBLICAÇÃO. */
const CACHE = 'b12-v2.12.0';
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
/* ===================================================== A CAIXA DE AVISOS
   24/11/2026. Ele testou o push, chegou no celular, tocou — e o app abriu
   SEM MOSTRAR O TEXTO em lugar nenhum. Perguntou: "será que vai lá no
   sininho? Manda para onde?".

   Não ia para lugar nenhum. O aviso vivia só na bandeja do sistema: fechou,
   acabou. Um recado que some quando a pessoa toca nele não é um recado.

   Agora cada aviso é gravado aqui, antes de aparecer na bandeja, num banco
   do próprio navegador (IndexedDB — é o único que o service worker alcança;
   localStorage não existe aqui dentro). O app lê essa caixa quando abre e
   mostra tudo no sininho. */
const AV_BANCO = 'b12-avisos', AV_LOJA = 'recebidos';
function avBanco() {
  return new Promise((ok, nao) => {
    const p = indexedDB.open(AV_BANCO, 1);
    p.onupgradeneeded = () => {
      const db = p.result;
      if (!db.objectStoreNames.contains(AV_LOJA))
        db.createObjectStore(AV_LOJA, { keyPath: 'id' });
    };
    p.onsuccess = () => ok(p.result);
    p.onerror = () => nao(p.error);
  });
}
function avGuardar(d) {
  return avBanco().then(db => new Promise(ok => {
    const t = db.transaction(AV_LOJA, 'readwrite');
    t.objectStore(AV_LOJA).put({
      id: 'av' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      titulo: d.titulo || 'Estação B12',
      texto: d.texto || '',
      ir: d.ir || '/',
      importante: !!d.importante,
      em: new Date().toISOString(),
      lido: false
    });
    t.oncomplete = () => ok(true);
    t.onerror = () => ok(false);
  })).catch(() => false);
}

self.addEventListener('push', e => {
  let d = { titulo: 'Estação B12', texto: 'Você tem um aviso novo.', ir: '/' };
  try { if (e.data) d = Object.assign(d, e.data.json()); }
  catch (err) { try { d.texto = e.data.text(); } catch (e2) {} }

  /* SOM E TREMIDA. PWA não escolhe o arquivo de som — quem toca é o
     aparelho, com o som padrão de notificação. O que dá para mandar daqui:
       silent:false   → toca. Sem isto, o Android pode entregar mudo.
       renotify:true  → aviso novo com a mesma etiqueta TOCA DE NOVO em vez
                        de trocar o de baixo caladinho.
       vibrate        → padrão de tremida no Android; o iPhone ignora e usa
                        o dele. Um tranco curto para aviso comum, três para
                        o importante — dá para sentir no bolso, sem olhar.
     No iPhone, o som só existe com o app INSTALADO na tela de início: no
     Safari solto o push nem chega. É por isso que a vitrine insiste em
     instalar antes de pedir o aviso. */
  /* grava ANTES de mostrar: se a pessoa tocar e dispensar na mesma hora, o
     texto já está guardado no sininho */
  e.waitUntil(avGuardar(d).then(() => self.registration.showNotification(d.titulo, {
    body: d.texto,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || 'b12',
    renotify: !!d.tag,
    silent: false,
    vibrate: d.importante ? [200, 90, 200, 90, 200] : [160],
    requireInteraction: !!d.importante,
    timestamp: Date.now(),
    data: { ir: d.ir || '/' }
  })));
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
