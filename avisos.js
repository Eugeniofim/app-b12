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
B12.avEstado = function () {
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
  var papel = (B12.pode && B12.pode('equipe')) ? 'equipe' : 'turista';
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
  var e = B12.avEstado();
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

  var corpo = {
    id: id, endpoint: j.endpoint,
    p256dh: j.keys.p256dh, auth: j.keys.auth,
    papel: opc.papel || (B12.pode && B12.pode('dono') ? 'dono'
                        : B12.pode && B12.pode('equipe') ? 'equipe' : 'turista'),
    apelido: opc.apelido || apelidoDoAparelho(),
    cliente_id: (B12.meuCadastro && B12.meuCadastro() || {}).id || null,
    ativo: true, erros: 0
  };
  /* com sessão o cabeçalho leva o token; sem sessão, a chave pública — e aí o
     banco só aceita turista, que é exatamente o desenho */
  if (B12.nuvLogado()) corpo.pessoa_id = (B12.nuvQuem() || {}).id || null;
  var cab = B12.nuvCabecalho ? B12.nuvCabecalho()
          : { apikey: B12.NUVEM.chave, Authorization: 'Bearer ' + B12.NUVEM.chave,
              'Content-Type': 'application/json' };
  cab.Prefer = 'resolution=merge-duplicates,return=minimal';
  var r = await fetch(B12.NUVEM.url + '/rest/v1/b12_avisos?on_conflict=endpoint', {
    method: 'POST', headers: cab, body: JSON.stringify(corpo)
  });
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
