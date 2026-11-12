/* ============================================================================
   Estação B12 — avisos no celular (Web Push)

   Três verdades que precisam ficar visíveis na tela, não escondidas no código:

   1. Só chega em quem INSTALOU o app na tela de início. No iPhone isso não é
      recomendação, é regra do sistema: sem instalar, o botão nem aparece.
   2. Quem decide é a pessoa. O navegador pergunta uma vez; se ela disser não,
      não dá para perguntar de novo — tem de ir nos ajustes do aparelho.
   3. Sem a nuvem ligada não há carteiro. A assinatura é guardada no banco da
      B12; quem empurra é a função no servidor.
   ========================================================================== */
var B12 = window.B12 || {};

(function () {

function nuvem() { return B12.NUVEM && B12.NUVEM.url && B12.NUVEM.chave ? B12.NUVEM : null; }
/* o portão mora no nuvemlogin.js; aqui só garanto que existe */
if (!B12.nuvLogado) B12.nuvLogado = function () { return false; };

/* o app está instalado na tela de início? */
B12.avInstalado = function () {
  try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  catch (e) { return false; }
};
/* este aparelho sabe receber aviso? */
B12.avSuportado = function () {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};
function ehIphone() { return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream; }

/* o retrato do estado, em português, para a tela mostrar sem adivinhar */
B12.avEstado = function (opc) {
  opc = opc || {};
  if (!B12.avSuportado()) {
    return { pode: false, ligado: false, motivo: 'Este navegador não recebe aviso no celular.' };
  }
  if (ehIphone() && !B12.avInstalado()) {
    return { pode: false, ligado: false, precisaInstalar: true,
      motivo: 'No iPhone o aviso só funciona com o app instalado na tela de início.' };
  }
  if (!nuvem()) {
    return { pode: false, ligado: false, semNuvem: true,
      motivo: 'A nuvem da B12 ainda não está ligada. Sem ela, não há quem empurre o aviso.' };
  }
  /* A tranca do banco é clara: sem conta, só dá para assinar como turista.
     Enquanto o login na nuvem não existir, o dono e a equipe não conseguem
     assinar — e é melhor dizer isso do que mostrar um botão que dá erro. */
  /* 12/11/2026 — quem pede explicitamente 'turista' (o cartão da home) não
     pode ser barrado por falta de login de DONO. No celular do Eugênio, que
     tem o PIN do proprietário, o cartão do turista dizia "falta o login da
     nuvem" — uma resposta que não é a pergunta que ele fez. */
  var papel = opc.papel === 'turista' ? 'turista'
            : (B12.pode && B12.pode('equipe')) ? 'equipe' : 'turista';
  if (papel !== 'turista' && !B12.nuvLogado()) {
    return { pode: false, ligado: false, semLogin: true,
      motivo: 'Falta o login da nuvem. Sem ele, o banco não aceita a inscrição do dono ' +
              'nem da equipe — só a de quem viaja.' };
  }

  var p = Notification.permission;
  if (p === 'denied') {
    return { pode: false, ligado: false, negado: true,
      motivo: 'Você bloqueou os avisos. Para voltar atrás, é nos ajustes do aparelho — o app não consegue perguntar de novo.' };
  }
  return { pode: true, ligado: p === 'granted' && !!B12.avAssinaturaLocal(), permissao: p };
};

/* a assinatura que este aparelho guardou, para a tela saber se já está ligado */
var CHAVE_LOCAL = 'b12_aviso_id';
B12.avAssinaturaLocal = function () {
  try { return localStorage.getItem(CHAVE_LOCAL) || null; } catch (e) { return null; }
};

/* base64url -> bytes, que é como o navegador quer a chave pública */
function paraBytes(b64) {
  var s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  var cru = atob(s), a = new Uint8Array(cru.length);
  for (var i = 0; i < cru.length; i++) a[i] = cru.charCodeAt(i);
  return a;
}
function paraB64(buf) {
  var b = new Uint8Array(buf), s = '';
  for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/* um id estável por aparelho, tirado do próprio endereço da assinatura */
async function digital(texto) {
  var d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return paraB64(d).slice(0, 32);
}

/* Liga: pede a permissão, assina no navegador e guarda no banco da B12. */
B12.avLigar = async function (opc) {
  opc = opc || {};
  var e = B12.avEstado(opc);
  if (!e.pode) return { erro: e.motivo };

  var permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    return { erro: permissao === 'denied'
      ? 'Você recusou. Para ligar depois, é nos ajustes do aparelho.'
      : 'Ficou sem resposta. Toque de novo quando quiser.' };
  }

  var reg = await navigator.serviceWorker.ready;
  var assin = await reg.pushManager.getSubscription();
  if (!assin) {
    assin = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: paraBytes(B12.NUVEM.chavePush)
    });
  }
  var j = assin.toJSON();
  var id = await digital(j.endpoint);

  /* ================================================================
     12/11/2026 — DOIS DEFEITOS AQUI, e o segundo impedia QUALQUER
     turista de ligar os avisos desde sempre.

     1) O papel saía do PIN local. PIN é a tranca deste aparelho, não é
        identidade na nuvem. No celular do Eugênio, logado como dono pelo
        PIN mas SEM conta na nuvem, o app mandava papel='dono' com a chave
        pública — e o banco recusou, certíssimo. Agora o papel vem da
        SESSÃO DA NUVEM; sem sessão, é turista, que é a verdade.

     2) A gravação usava "inserir OU atualizar" (on_conflict), porque o
        mesmo aparelho reassina toda vez que reabre o app. No Postgres
        isso exige política de UPDATE **e de SELECT**, e dar SELECT ao
        visitante vazaria o endereço e as chaves de push de todos os
        aparelhos. Medido: INSERT puro = 201, com on_conflict = 401.
        Agora quem não tem conta chama a função `b12_inscrever`, que faz
        só essa operação, sempre como turista, e não devolve nada.

     Dono e equipe continuam pelo caminho normal: com sessão eles têm as
     políticas de ler e atualizar, e o on_conflict funciona.
     ================================================================ */
  var temSessao = !!(B12.nuvLogado && B12.nuvLogado());
  var papelNuvem = temSessao ? ((B12.nuvQuem() || {}).papel || 'turista') : 'turista';
  /* opc.papel só pode REBAIXAR (o cartão do turista pede 'turista'); subir
     para dono/equipe depende da conta, nunca do que a tela pedir */
  if (opc.papel === 'turista') papelNuvem = 'turista';

  var apelido = opc.apelido || apelidoDoAparelho();
  var clienteId = (B12.meuCadastro && B12.meuCadastro() || {}).id || null;
  var ctrl = new AbortController();
  /* prazo: sem isto, sinal fraco deixa o botão "ligar avisos" girando para
     sempre — foi assim que o login da Melissa travou (app-um-so, peça 7) */
  var corta = setTimeout(function () { ctrl.abort(); }, 12000);
  var r;

  if (!temSessao) {
    /* ---- sem conta: a porta do visitante, pela função ---- */
    try {
      r = await fetch(B12.NUVEM.url + '/rest/v1/rpc/b12_inscrever', {
        method: 'POST', signal: ctrl.signal,
        headers: { apikey: B12.NUVEM.chave, Authorization: 'Bearer ' + B12.NUVEM.chave,
                   'Content-Type': 'application/json' },
        body: JSON.stringify({ p_id: id, p_endpoint: j.endpoint,
          p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
          p_apelido: apelido, p_cliente_id: clienteId })
      });
    } catch (e) {
      clearTimeout(corta);
      return { erro: e && e.name === 'AbortError'
        ? 'A internet está lenta demais. Tente de novo daqui a pouco.'
        : 'Não consegui falar com o servidor dos avisos.' };
    }
    clearTimeout(corta);
    if (!r.ok) {
      var t1 = await r.text();
      return { erro: 'O banco recusou a inscrição (' + r.status + '). ' + t1.slice(0, 90) };
    }
    try { localStorage.setItem(CHAVE_LOCAL, id); } catch (er) {}
    return { ok: true, id: id, papel: 'turista' };
  }

  /* ---- com conta: dono e equipe, pelo caminho normal ---- */
  var corpo = {
    id: id, endpoint: j.endpoint,
    p256dh: j.keys.p256dh, auth: j.keys.auth,
    papel: papelNuvem,
    apelido: apelido,
    cliente_id: clienteId,
    pessoa_id: (B12.nuvQuem() || {}).id || null,
    ativo: true, erros: 0
  };
  var cab = B12.nuvCabecalho();
  cab.Prefer = 'resolution=merge-duplicates,return=minimal';
  try {
    r = await fetch(B12.NUVEM.url + '/rest/v1/b12_avisos?on_conflict=endpoint', {
      method: 'POST', headers: cab, body: JSON.stringify(corpo), signal: ctrl.signal
    });
  } catch (e) {
    return { erro: e && e.name === 'AbortError'
      ? 'A internet está lenta demais. Tente de novo daqui a pouco.'
      : 'Não consegui falar com o servidor dos avisos.' };
  } finally { clearTimeout(corta); }
  if (!r.ok) {
    var txt = await r.text();
    return { erro: 'O banco recusou a inscrição (' + r.status + '). ' + txt.slice(0, 90) };
  }
  try { localStorage.setItem(CHAVE_LOCAL, id); } catch (er) {}
  return { ok: true, id: id, papel: corpo.papel };
};

/* Desliga: tira a assinatura do navegador e apaga a marca deste aparelho. */
B12.avDesligar = async function () {
  try {
    var reg = await navigator.serviceWorker.ready;
    var assin = await reg.pushManager.getSubscription();
    if (assin) await assin.unsubscribe();
  } catch (e) {}
  try { localStorage.removeItem(CHAVE_LOCAL); } catch (e) {}
  return { ok: true };
};

function apelidoDoAparelho() {
  var u = navigator.userAgent;
  var qual = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad'
           : /Android/.test(u) ? 'Android' : /Macintosh/.test(u) ? 'Mac'
           : /Windows/.test(u) ? 'Windows' : 'Aparelho';
  return qual + (B12.avInstalado() ? ' (app)' : ' (navegador)');
}

/* --------------------------------------------------- chamar o carteiro
   Quem manda é a função no servidor, e ela só obedece ao dono — confere no
   banco, não na palavra. Daqui só sai o pedido. */
async function chamarCarteiro(corpo) {
  if (!nuvem()) return { erro: 'A nuvem não está ligada.' };
  if (!B12.nuvLogado()) return { erro: 'Faça o login da nuvem primeiro.' };
  var ctrl = new AbortController();
  var corta = setTimeout(function () { ctrl.abort(); }, 20000);
  try {
    var r = await fetch(B12.NUVEM.url + '/functions/v1/avisar', {
      method: 'POST', signal: ctrl.signal,
      headers: B12.nuvCabecalho(),
      body: JSON.stringify(corpo)
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) return { erro: d.erro || ('O servidor recusou (' + r.status + ').') };
    return d;
  } catch (e) {
    return { erro: 'Não consegui falar com o servidor. Tente de novo.' };
  } finally { clearTimeout(corta); }
}

/* um aviso de teste, para ele ver o celular apitar */
B12.avTestar = function () {
  return chamarCarteiro({
    papel: 'dono', tag: 'teste',
    titulo: 'Estação B12', ir: '/#/adm',
    texto: 'Funcionou. É assim que os avisos vão chegar para você.'
  });
};
/* a varredura: o servidor olha o dia e manda só o que precisa */
B12.avVarrer = function () { return chamarCarteiro({ varrer: true }); };
/* um aviso escrito por ele */
B12.avMandar = function (o) { return chamarCarteiro(o || {}); };

/* O aviso do painel: para todos os clientes, ou só para o celular do dono.
   'turista' alcança quem instalou e aceitou; 'dono' é o teste dele mesmo. */
B12.avEnviar = function (o) {
  o = o || {};
  return chamarCarteiro({
    papel: o.para === 'eu' ? 'dono' : 'turista',
    tag: 'b12-' + (o.para === 'eu' ? 'teste' : 'cliente'),
    titulo: String(o.titulo || 'Estação B12').slice(0, 48),
    texto: String(o.texto || '').slice(0, 180),
    ir: o.ir || '/'
  }).then(function (r) {
    if (r && r.ok) return { ok: true, enviados: r.mandados || 0, falhas: r.falhas || 0 };
    return { erro: (r && (r.erro || r.mensagem)) || 'o carteiro não respondeu' };
  }).catch(function (e) { return { erro: String(e && e.message || e) }; });
};

/* o service worker pede para reinscrever quando o navegador troca a assinatura */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function (ev) {
    if (ev.data && ev.data.tipo === 'reinscrever' && B12.avAssinaturaLocal()) {
      B12.avLigar().catch(function () {});
    }
  });
}

window.B12 = B12;

})();

/* ------------------------------------------------------------- e-mail
   O outro canal. Push chega em quem instalou; e-mail chega em quem deu o
   endereço. São públicos diferentes, e o Dhalsin manda os dois do mesmo
   lugar. Quem não aceitou receber NÃO entra na lista — a trava é no
   servidor, não nesta linha. */
B12.emailEnviar = function (o) {
  o = o || {};
  if (!B12.NUVEM || !B12.NUVEM.url) return Promise.resolve({ erro: 'A nuvem não está ligada.' });
  if (!B12.nuvLogado || !B12.nuvLogado())
    return Promise.resolve({ erro: 'Entre na nuvem para mandar e-mail.' });

  var ctrl = new AbortController();
  var corta = setTimeout(function () { ctrl.abort(); }, 60000);  /* envio em lote demora */
  return fetch(B12.NUVEM.url + '/functions/v1/email', {
    method: 'POST', signal: ctrl.signal, headers: B12.nuvCabecalho(),
    body: JSON.stringify({ titulo: o.titulo, texto: o.texto,
                           para: o.para || 'clientes', meuEmail: o.meuEmail || '',
                           /* para:'escolhidos' manda só para estes clientes. Quem
                              monta a lista de verdade continua sendo o servidor,
                              lendo o banco — daqui só vão os ids. */
                           ids: Array.isArray(o.ids) ? o.ids.slice(0, 300) : undefined })
  }).then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && j.ok) return { ok: true, enviados: j.enviados, falhas: j.falhas, naLista: j.naLista };
      return { erro: (j && j.erro) || 'O servidor de e-mail não respondeu.' };
    })
    .catch(function (e) {
      return { erro: e && e.name === 'AbortError'
        ? 'Demorou demais. Confira na sua conta do Resend se os e-mails saíram.'
        : 'Não consegui falar com o servidor de e-mail.' };
    })
    .finally(function () { clearTimeout(corta); });
};

/* Quantos clientes receberiam um e-mail hoje. */
B12.emailLista = function () {
  return (B12.DB.clientes || []).filter(function (c) {
    return c.email && String(c.email).indexOf('@') > 0 && c.aceitaOfertas;
  });
};
