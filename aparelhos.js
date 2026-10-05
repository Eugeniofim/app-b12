/* ============================================================================
   Estação B12 — contagem de aparelhos

   Responde "quantos aparelhos têm o app?". PWA não passa por loja, então não
   existe contador de download: o que existe é isto — uma linha anônima por
   aparelho, com quando apareceu, quando foi visto e se está na tela de início.

   O que NÃO vai junto: nome, telefone, e-mail, posição. O id é um número
   sorteado aqui dentro. É contagem, não rastreamento — e se alguém apagar os
   dados do navegador, vira um aparelho novo. O número é uma boa estimativa,
   não um censo, e o painel diz isso com todas as letras.
   ========================================================================== */
(function () {
  'use strict';

  var CHAVE = 'b12_aparelho';
  var CHAVE_VISTO = 'b12_aparelho_visto';
  var ESPACO = 6 * 60 * 60 * 1000;   /* no máximo de 6 em 6 horas */

  function id() {
    try {
      var v = localStorage.getItem(CHAVE);
      if (v) return v;
      v = (crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'ap' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(CHAVE, v);
      return v;
    } catch (e) { return null; }
  }

  /* Instalado = aberto fora do navegador. É o que o iPhone exige para receber
     aviso, então aqui as duas coisas quase sempre andam juntas. */
  function instalado() {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
             navigator.standalone === true;
    } catch (e) { return false; }
  }

  function plataforma() {
    var u = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(u)) return 'iphone';
    if (/Android/i.test(u)) return 'android';
    return 'computador';
  }

  async function temAvisos() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
      if (Notification.permission !== 'granted') return false;
      var reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return false;
      return !!(await reg.pushManager.getSubscription());
    } catch (e) { return false; }
  }

  /* Anuncia este aparelho. Nunca lança, nunca trava a tela: se a rede estiver
     fora, simplesmente não conta hoje. */
  B12.apAnunciar = async function (forcado) {
    if (!B12.NUVEM || !B12.NUVEM.url || !B12.NUVEM.chave) return;
    var meu = id();
    if (!meu) return;

    if (!forcado) {
      try {
        var ult = +(localStorage.getItem(CHAVE_VISTO) || 0);
        if (Date.now() - ult < ESPACO) return;
      } catch (e) {}
    }

    var corpo = {
      id: meu,
      papel: (B12.pode && B12.pode('dono')) ? 'dono'
           : (B12.pode && B12.pode('equipe')) ? 'equipe' : 'turista',
      instalado: instalado(),
      avisos: await temAvisos(),
      plataforma: plataforma(),
      visto_em: new Date().toISOString()
    };

    var cab = B12.nuvCabecalho ? B12.nuvCabecalho()
            : { apikey: B12.NUVEM.chave, Authorization: 'Bearer ' + B12.NUVEM.chave,
                'Content-Type': 'application/json' };
    cab.Prefer = 'resolution=merge-duplicates,return=minimal';

    var corta = new AbortController();
    var relogio = setTimeout(function () { corta.abort(); }, 8000);
    try {
      var r = await fetch(B12.NUVEM.url + '/rest/v1/b12_aparelhos?on_conflict=id', {
        method: 'POST', headers: cab, body: JSON.stringify(corpo), signal: corta.signal
      });
      if (r.ok) { try { localStorage.setItem(CHAVE_VISTO, String(Date.now())); } catch (e) {} }
    } catch (e) {
      /* rede fora não é erro que mereça tela: o aparelho conta na próxima vez */
    } finally { clearTimeout(relogio); }
  };

  /* O número para o painel do dono. Só o dono logado consegue ler — a trava é
     do Postgres, não desta linha. */
  B12.apContagem = async function () {
    if (!B12.NUVEM || !B12.NUVEM.url) return { erro: 'semNuvem' };
    if (!B12.nuvLogado || !B12.nuvLogado()) return { erro: 'semLogin' };
    var corta = new AbortController();
    var relogio = setTimeout(function () { corta.abort(); }, 12000);
    try {
      var r = await fetch(B12.NUVEM.url + '/rest/v1/rpc/b12_contagem_aparelhos', {
        method: 'POST', headers: B12.nuvCabecalho(), body: '{}', signal: corta.signal
      });
      if (!r.ok) return { erro: 'recusado', status: r.status };
      var j = await r.json();
      return { ok: true, n: (Array.isArray(j) ? j[0] : j) || {} };
    } catch (e) {
      return { erro: 'rede' };
    } finally { clearTimeout(relogio); }
  };

  /* Uma vez ao abrir, e de novo quando a pessoa volta para o app. */
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () { B12.apAnunciar(); });
  else B12.apAnunciar();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) B12.apAnunciar();
  });
})();
