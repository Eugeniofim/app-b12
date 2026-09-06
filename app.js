/* ============================================================================
   Estação B12 — roteador, partida e atualização
   A fórmula das 9 peças da Ti Artes está aqui: registro do service worker sem
   cache, conferência ao voltar para o app, trava da primeira visita, e o
   redesenho na mão quando o destino é a tela onde já se está.
   ========================================================================== */
var B12 = window.B12 || {};

(function () {

/* ------------------------------------------------------------------ rotas */
var TELAS = ['inicio','travessias','passeios','ilha','previsao','promocoes',
             'reservas','equipe','adm'];
var atual = 'inicio';

B12.ir = function (nome) {
  if (nome === 'mais') return abrirMais();
  if (TELAS.indexOf(nome) < 0) nome = 'inicio';

  /* o portão: dono entra no painel; dono e equipe entram na operação */
  if (nome === 'adm' && !B12.pode('dono'))
    return B12.portao('dono', function () { B12.ir('adm'); });
  if (nome === 'equipe' && !B12.pode('equipe'))
    return B12.portao('equipe', function (papel) { B12.ir(papel === 'dono' ? 'equipe' : 'equipe'); });

  /* peça 9: destino igual ao atual redesenha na mão, senão nada acontece */
  if (nome === atual) { pintar(nome); return; }
  atual = nome;

  document.querySelectorAll('.tela.on').forEach(function (t) { t.classList.remove('on'); });
  var alvo = document.getElementById('t-' + nome);
  if (alvo) alvo.classList.add('on');

  document.body.classList.toggle('adm', nome === 'adm');
  document.querySelector('meta[name=theme-color]')
    .setAttribute('content', nome === 'adm' ? '#071A28' : '#0B2A4A');

  document.querySelectorAll('.navb').forEach(function (b) { b.classList.remove('on'); });
  var nb = document.getElementById('n-' + nome);
  if (nb) nb.classList.add('on');

  pintar(nome);
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (location.hash !== '#/' + nome) history.replaceState(null, '', '#/' + nome);
};

function pintar(nome) {
  if (nome === 'reservas') B12.pintarReservas();
  if (nome === 'previsao') B12.telaPrevisao();
  if (nome === 'equipe')   B12.pintarEquipe();
  if (nome === 'adm')      { B12.admDesenhar(); quemEntrou(); }
}
function quemEntrou() {
  var q = document.getElementById('adm-papel');
  if (q) q.textContent = B12.papel() === 'dono' ? 'Proprietário' : 'Equipe';
}

/* menu "Mais" — leva às duas outras caras do app */
function abrirMais() {
  var q = document.createElement('div');
  q.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(6,23,38,.62);' +
    'display:flex;align-items:flex-end;backdrop-filter:blur(3px)';
  q.innerHTML =
    '<div style="background:var(--carta);width:100%;max-width:560px;margin:0 auto;' +
    'border-radius:20px 20px 0 0;padding:18px 16px calc(22px + env(safe-area-inset-bottom));' +
    'animation:sobe .3s cubic-bezier(.22,.61,.36,1) both">' +
    '<div style="width:38px;height:4px;border-radius:99px;background:var(--risco);margin:0 auto 16px"></div>' +
    '<h3 style="font-size:17px;margin-bottom:3px">Mais</h3>' +
    '<p style="font-size:13px;color:var(--tinta-2);margin-bottom:14px">Estação B12 · Pontal do Paraná</p>' +
    item('recuperar','Já tenho um código','Mostrar uma reserva feita em outro aparelho') +
    item('previsao','Previsão da Ilha','Os próximos sete dias, ao vivo') +
    item('ilha','Ilha do Mel','Praias, parceiros e como chegar') +
    '<div style="height:1px;background:var(--risco);margin:6px 0 12px"></div>' +
    item('b12','Área da B12','Equipe e proprietário · acesso com PIN') +
    '<button class="btn sec" id="b-fechar-mais">Fechar</button></div>';
  document.body.appendChild(q);
  q.querySelectorAll('[data-mais]').forEach(function (b) {
    b.onclick = function () {
      q.remove();
      var d = b.dataset.mais;
      if (d === 'recuperar') return B12.formRecuperar(function () { B12.ir('reservas'); });
      if (d === 'b12') return B12.portao('equipe', function (papel) { B12.ir(papel === 'dono' ? 'adm' : 'equipe'); });
      B12.ir(d);
    };
  });
  q.querySelector('#b-fechar-mais').onclick = function () { q.remove(); };
  q.onclick = function (e) { if (e.target === q) q.remove(); };
}
function item(id, titulo, sub) {
  return '<button class="escolha" data-mais="' + id + '" style="width:100%;margin-bottom:9px">' +
    '<div><b>' + titulo + '</b><small>' + sub + '</small></div>' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>';
}

/* ------------------------------------------------------- instalar o app */
/* Android e computador entregam um pedido de instalação que a gente guarda e
   dispara no botão. O iPhone não entrega nada: lá a gente ensina o caminho. */
var pedidoInstalar = null;
function ehIphone() { return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream; }
function jaInstalado() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function convite() {
  var cx = document.getElementById('instalar'); if (!cx) return;
  if (jaInstalado()) { cx.hidden = true; return; }
  var quando = 0; try { quando = +localStorage.getItem('b12_instalar_depois') || 0; } catch (e) {}
  if (quando && Date.now() < quando) { cx.hidden = true; return; }
  var btn = document.getElementById('instalar-btn'), como = document.getElementById('instalar-como');
  if (pedidoInstalar) {
    cx.hidden = false; btn.textContent = 'Instalar';
    btn.onclick = function () {
      pedidoInstalar.prompt();
      pedidoInstalar.userChoice.then(function () { pedidoInstalar = null; cx.hidden = true; });
    };
  } else if (ehIphone()) {
    cx.hidden = false; btn.textContent = 'Como';
    como.textContent = 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.';
    btn.onclick = function () {
      como.innerHTML = '1. Toque no ícone <b>Compartilhar</b> (o quadrado com a seta para cima).<br>' +
        '2. Role e toque em <b>Adicionar à Tela de Início</b>.<br>3. Toque em <b>Adicionar</b>.';
      btn.hidden = true;
    };
  } else { cx.hidden = true; }
  document.getElementById('instalar-x').onclick = function () {
    cx.hidden = true;
    try { localStorage.setItem('b12_instalar_depois', String(Date.now() + 7*86400000)); } catch (e) {}
  };
}
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault(); pedidoInstalar = e; convite();
});
window.addEventListener('appinstalled', function () {
  pedidoInstalar = null; var cx = document.getElementById('instalar'); if (cx) cx.hidden = true;
});

/* --------------------------------------------------- atualização do código */
var NOVA = null, recarregando = false;
var jaTinhaControlador = ('serviceWorker' in navigator) && !!navigator.serviceWorker.controller;

function ocupado() {
  var a = document.activeElement;
  if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return true;
  var campos = document.querySelectorAll('input,textarea');
  for (var i = 0; i < campos.length; i++) {
    var c = campos[i];
    if (c.type === 'checkbox' || c.type === 'radio') { if (c.checked !== c.defaultChecked) return true; }
    else if (c.value && c.value !== c.defaultValue) return true;
  }
  /* select nao tem defaultValue: compara com a opcao marcada no HTML */
  var sels = document.querySelectorAll('select');
  for (var j = 0; j < sels.length; j++) {
    var o = sels[j].selectedOptions[0];
    if (o && !o.defaultSelected && sels[j].selectedIndex !== 0) return true;
  }
  return !!document.querySelector('[data-mais]');   /* folha "Mais" aberta */
}
function mostrarNova(w) { NOVA = w; document.getElementById('barra-nova').classList.add('on'); }
function aplicarNova() {
  if (recarregando) return; recarregando = true;
  document.getElementById('barra-nova').classList.remove('on');
  try { if (NOVA) NOVA.postMessage({ tipo: 'assumir' }); } catch (e) {}
  setTimeout(function () { try { location.reload(); } catch (e) {} }, 1500);
}

function ligarAtualizacao() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol.indexOf('http') !== 0) return;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then(function () { return navigator.serviceWorker.ready; })
    .then(function (reg) {
      /* já tem versão nova esperando: se ninguém está digitando, troca sozinho */
      if (reg.waiting && navigator.serviceWorker.controller) {
        if (!ocupado()) { NOVA = reg.waiting; aplicarNova(); } else { mostrarNova(reg.waiting); }
      }
      reg.addEventListener('updatefound', function () {
        var novo = reg.installing; if (!novo) return;
        novo.addEventListener('statechange', function () {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) {
            if (!ocupado()) { location.reload(); } else { mostrarNova(novo); }
          }
        });
      });
      var ultima = 0;
      function checar() {
        var ag = Date.now(); if (ag - ultima < 60000) return; ultima = ag;
        reg.update()['catch'](function () {});
      }
      checar();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) checar(); });
      window.addEventListener('focus', checar);
      window.addEventListener('online', checar);
      setInterval(checar, 30 * 60 * 1000);
    })['catch'](function () {});

  var trocou = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!jaTinhaControlador) return;      /* primeira visita não é atualização */
    if (trocou) return; trocou = true;
    try { location.reload(); } catch (e) {}
  });
}

/* ---------------------------------------------------------------- partida */
function comecar() {
  B12.carregar();

  /* conteúdo que depende de dados */
  B12.pintarPasseios();
  B12.montarFormulario();

  document.getElementById('cx-atracoes').innerHTML =
    '<table class="tabela">' + B12.ATRACOES.map(function (a) {
      return '<tr><td><b>' + a[0] + '</b><div style="font-size:11.5px;color:var(--tinta-3);' +
        'margin-top:2px">' + a[2] + '</div></td><td class="n" style="color:var(--tinta-3);' +
        'font-weight:600">' + a[1] + '</td></tr>'; }).join('') + '</table>';

  document.getElementById('grade-parceiros').innerHTML =
    B12.PARCEIROS.slice(0, 8).map(function (p) {
      return '<div>' + p.nome + '<small>' + p.tipo + '</small></div>'; }).join('');

  /* o oceano em WebGL, no herói e atrás do topo do ADM */
  B12.oceano(document.getElementById('agua-heroi'), { escuro: false });
  B12.oceano(document.getElementById('adm-topo'),   { escuro: true });

  /* cliques declarados no HTML */
  document.querySelectorAll('[data-ir]').forEach(function (b) {
    b.onclick = function () { B12.ir(b.dataset.ir); };
  });
  document.getElementById('b-previsao').onclick = function () { B12.ir('previsao'); };
  document.getElementById('b-avisos').onclick   = function () { B12.ir('promocoes'); };
  document.getElementById('b-perfil').onclick   = function () { B12.ir('reservas'); };
  document.getElementById('b-atualizar').onclick = aplicarNova;
  document.getElementById('b-mais-acoes').onclick = function () { B12.menuMais(); };
  document.getElementById('b-sair').onclick = B12.sair;
  document.getElementById('b-ajustes').onclick = function () { B12.formAjustes(function () { B12.admDesenhar(); }); };
  document.getElementById('b-sair-equipe').onclick = B12.sair;

  B12.buscarClima();
  ligarAtualizacao();
  convite();

  window.addEventListener('hashchange', function () {
    var h = (location.hash || '').replace('#/', '');
    if (h && h !== atual) B12.ir(h);
  });
  var h = (location.hash || '').replace('#/', '');
  if (h && TELAS.indexOf(h) >= 0) B12.ir(h);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', comecar);
else comecar();

})();
