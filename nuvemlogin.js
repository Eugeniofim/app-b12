/* ============================================================================
   Estação B12 — o login da nuvem

   O PIN continua sendo a porta do dia a dia: rápido, no balcão, sem teclado.
   Este login é outra coisa — é o que o BANCO entende. Sem ele, o Supabase não
   sabe quem está pedindo e recusa tudo o que não seja de turista.

   Um portão nomeado, `B12.nuvLogado()`, em vez de espalhar a checagem.
   ========================================================================== */
var B12 = window.B12 || {};

(function () {

var CHAVE = 'b12_nuvem_sessao';
var PRAZO = 12000;                  /* nenhuma chamada de rede sem prazo */

function comPrazo(url, opc) {
  opc = opc || {};
  var ctrl = new AbortController();
  var corta = setTimeout(function () { ctrl.abort(); }, PRAZO);
  return fetch(url, Object.assign({ signal: ctrl.signal }, opc))
    .finally(function () { clearTimeout(corta); });
}

function guardar(s) {
  try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch (e) {}
  B12.NUVEM.sessao = s;
}
function lido() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; }
}

/* ---------------------------------------------------------------- o portão */
B12.nuvLogado = function () {
  var s = B12.NUVEM && B12.NUVEM.sessao;
  return !!(s && s.access_token && s.expira > Date.now());
};
/* 13/11/2026 — ESTE ERA O DEFEITO QUE FAZIA O APP MENTIR.

   `nuvQuem()` devolvia o nome guardado SEM olhar a validade. Então a aba
   Dados dizia "Ligado como eugeniofim@gmail.com · dono" enquanto a aba
   Notificações, que usa `nuvLogado()`, dizia "Faça o login da nuvem primeiro".
   As duas liam a MESMA sessão; uma conferia o prazo e a outra não.

   Agora vem o campo `expirado`, e quem desenha a tela diz a verdade. */
B12.nuvQuem = function () {
  var s = B12.NUVEM && B12.NUVEM.sessao;
  if (!s) return null;
  return { email: s.email, papel: s.papel || 'equipe', id: s.user_id,
           expirado: !B12.nuvLogado(), podeRenovar: !!s.refresh_token };
};
B12.nuvToken = function () {
  return B12.nuvLogado() ? B12.NUVEM.sessao.access_token : null;
};
/* o cabeçalho de toda chamada ao banco: com sessão vai o token, senão a chave pública */
B12.nuvCabecalho = function () {
  var t = B12.nuvToken();
  return { apikey: B12.NUVEM.chave,
           Authorization: 'Bearer ' + (t || B12.NUVEM.chave),
           'Content-Type': 'application/json' };
};

/* ------------------------------------------------------------------ entrar */
B12.nuvEntrar = async function (email, senha) {
  if (!B12.NUVEM || !B12.NUVEM.url) return { erro: 'A nuvem não está configurada.' };
  var r;
  try {
    r = await comPrazo(B12.NUVEM.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: B12.NUVEM.chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(email || '').trim(), password: senha })
    });
  } catch (e) {
    return { erro: 'A internet não respondeu. Tente de novo em um instante.' };
  }
  var d = await r.json().catch(function () { return {}; });
  if (!r.ok) {
    return { erro: /Invalid login/i.test(d.error_description || d.msg || '')
      ? 'E-mail ou senha não conferem.'
      : (d.error_description || d.msg || 'Não consegui entrar (' + r.status + ').') };
  }

  var s = {
    access_token: d.access_token, refresh_token: d.refresh_token,
    expira: Date.now() + (Number(d.expires_in) || 3600) * 1000 - 60000,
    email: (d.user || {}).email, user_id: (d.user || {}).id
  };
  B12.NUVEM.sessao = s;

  /* que papel o banco diz que esta pessoa tem? Quem manda é o banco. */
  var papel = await B12.nuvPapel();
  if (papel === 'ninguem') {
    B12.NUVEM.sessao = null;
    return { erro: 'Esta conta entrou, mas não tem papel na B12. Fale com o proprietário.' };
  }
  s.papel = papel;
  /* entrou: o aparelho faz o primeiro ritual com o banco antes de qualquer
     envio. Sem isso, o catálogo de fábrica deste aparelho subiria por cima
     do que já existe lá. */
  setTimeout(function () { if (B12.sincAoAbrir) B12.sincAoAbrir(); }, 300);
  guardar(s);
  return { ok: true, papel: papel, email: s.email };
};

/* o papel vem do banco, nunca do aparelho */
B12.nuvPapel = async function () {
  try {
    var r = await comPrazo(B12.NUVEM.url + '/rest/v1/rpc/b12_papel', {
      method: 'POST', headers: B12.nuvCabecalho(), body: '{}'
    });
    if (!r.ok) return 'ninguem';
    var t = await r.text();
    return JSON.parse(t) || 'ninguem';
  } catch (e) { return 'ninguem'; }
};

/* --------------------------------------------------------------- renovar */
B12.nuvRenovar = async function () {
  var s = lido();
  if (!s || !s.refresh_token) return false;
  try {
    var r = await comPrazo(B12.NUVEM.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: B12.NUVEM.chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    });
    if (!r.ok) {
      /* o banco recusou o refresh (token revogado ou vencido de vez): aí sim
         a sessão acabou, e o app tem de parar de dizer que está ligado */
      if (r.status === 400 || r.status === 401) B12.nuvSair();
      return false;
    }
    var d = await r.json();
    guardar({ access_token: d.access_token, refresh_token: d.refresh_token,
      expira: Date.now() + (Number(d.expires_in) || 3600) * 1000 - 60000,
      email: (d.user || {}).email || s.email, user_id: (d.user || {}).id || s.user_id,
      papel: s.papel });
    return true;
  } catch (e) {
    /* rede fora NÃO é sessão inválida: derrubar a pessoa no túnel do ônibus
       seria o pior atendimento possível. A sessão fica. */
    return false;
  }
};

/* ------------------------------------------- manter a sessão de pé
   13/11/2026 — O SEGUNDO DEFEITO, e o que fazia "nada subir".

   O token do Supabase vale 1 HORA. `nuvRenovar` só era chamado de dentro de
   `nuvAcordar`, e `nuvAcordar` só roda UMA VEZ, quando o app abre. Num app
   instalado, que fica dias na memória sem recarregar (é o normal no celular),
   a nuvem funcionava por uma hora e depois parava calada: a sincronia via
   `sincPronta()` falso e simplesmente não enviava, sem erro na tela.

   `nuvGarantir()` é o portão de verdade: antes de qualquer conversa com o
   banco, garante que existe token vivo — renovando se for preciso. */
var renovando = null;
B12.nuvGarantir = async function () {
  if (!B12.NUVEM || !B12.NUVEM.url) return false;
  if (B12.nuvLogado()) return true;
  if (!B12.NUVEM.sessao && !lido()) return false;
  /* duas chamadas ao mesmo tempo não podem virar dois refresh: o segundo
     invalidaria o token do primeiro */
  if (!renovando) renovando = B12.nuvRenovar().finally(function () { renovando = null; });
  return await renovando;
};

/* Quem fala com o banco e leva 401 tenta UMA vez renovar e repetir. Sem isto,
   a primeira chamada depois da hora virada falha e a pessoa não entende. */
B12.nuvComSessao = async function (fazer) {
  await B12.nuvGarantir();
  var r = await fazer();
  if (r && r.status === 401 && await B12.nuvGarantir()) r = await fazer();
  return r;
};

/* ====================================== REDEFINIR A SENHA (16/11/2026)
   Faltava a peça que fecha o ciclo: quem esquece a senha da nuvem recebe um
   e-mail do Supabase e o link traz, no endereço:

     https://app.estacaob12.com.br/#access_token=...&type=recovery

   Sem uma tela que entenda isso, o link caía no app e não acontecia nada —
   e o Eugênio ficou travado no sábado por causa disto. Agora o app reconhece
   o link, abre "escolha a senha nova" e grava no banco.

   Vale para o Dhalsin, para a equipe e para todo cliente futuro. */
B12.nuvRecuperacaoNaURL = function () {
  var h = String(location.hash || '').replace(/^#/, '');
  if (!h || (h.indexOf('access_token') < 0 && h.indexOf('error') < 0)) return null;
  var p = {};
  h.split('&').forEach(function (par) {
    var i = par.indexOf('=');
    if (i > 0) { try { p[par.slice(0, i)] = decodeURIComponent(par.slice(i + 1).replace(/\+/g, ' ')); } catch (e) {} }
  });
  /* link vencido ou já usado: o Supabase manda o motivo no mesmo lugar */
  if (p.error || p.error_description) {
    return { erro: /expired/i.test(p.error_description || p.error || '')
      ? 'Esse link já venceu. Peça um novo para quem cuida do app.'
      : (p.error_description || 'O link não serve mais.') };
  }
  if (p.type !== 'recovery' || !p.access_token) return null;
  return { access_token: p.access_token, refresh_token: p.refresh_token || '' };
};

/* o link traz uma sessão de verdade, curta: é com ela que a senha é trocada */
B12.nuvAceitarRecuperacao = function (p) {
  if (!p || !p.access_token) return false;
  B12.NUVEM.sessao = { access_token: p.access_token, refresh_token: p.refresh_token,
    expira: Date.now() + 3600000 - 60000, email: '', user_id: '' };
  return true;
};

B12.nuvTrocarSenha = async function (nova) {
  nova = String(nova || '');
  if (nova.length < 8) return { erro: 'A senha precisa de pelo menos 8 letras ou números.' };
  if (!B12.nuvLogado()) return { erro: 'O link venceu. Peça outro e tente de novo.' };
  var r;
  try {
    r = await comPrazo(B12.NUVEM.url + '/auth/v1/user', {
      method: 'PUT', headers: B12.nuvCabecalho(), body: JSON.stringify({ password: nova })
    });
  } catch (e) {
    return { erro: 'A internet não respondeu. Tente de novo em um instante.' };
  }
  var d = await r.json().catch(function () { return {}; });
  if (!r.ok) {
    return { erro: /same.*password/i.test(d.msg || d.error_description || '')
      ? 'Essa é a senha que já estava valendo. Escolha outra.'
      : (d.msg || d.error_description || 'Não consegui trocar a senha (' + r.status + ').') };
  }
  /* trocou: a sessão vira uma sessão normal, com o papel que o banco disser */
  var s = B12.NUVEM.sessao;
  s.email = (d || {}).email || s.email;
  s.user_id = (d || {}).id || s.user_id;
  s.papel = await B12.nuvPapel();
  if (s.papel === 'ninguem') {
    B12.nuvSair();
    return { erro: 'A senha foi trocada, mas esta conta não tem papel na B12. Fale com o proprietário.' };
  }
  guardar(s);
  setTimeout(function () { if (B12.sincAoAbrir) B12.sincAoAbrir(); }, 300);
  return { ok: true, email: s.email, papel: s.papel };
};

/* ------------------------------------------- pedir o link da senha
   16/11/2026. O botão "Send password recovery" do painel do Supabase manda o
   link para o SITE URL do projeto — que aqui é `os.eugeniofim.com`, o app do
   estúdio, compartilhado com todos os outros clientes. Trocar o Site URL
   quebraria os demais.

   Então quem pede o link é o PRÓPRIO APP, dizendo para onde o link volta
   (`redirect_to`). Assim o Dhalsin pede do app dele, recebe o e-mail e cai no
   app dele. Ninguém precisa do painel, e vale para todo cliente. */
B12.nuvPedirSenha = async function (email) {
  email = String(email || '').trim();
  if (!email || email.indexOf('@') < 0) return { erro: 'Escreva o e-mail da conta.' };
  if (!B12.NUVEM || !B12.NUVEM.url) return { erro: 'A nuvem não está configurada.' };
  var volta = location.origin + location.pathname;
  var r;
  try {
    r = await comPrazo(B12.NUVEM.url + '/auth/v1/recover?redirect_to=' + encodeURIComponent(volta), {
      method: 'POST',
      headers: { apikey: B12.NUVEM.chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
  } catch (e) {
    return { erro: 'A internet não respondeu. Tente de novo em um instante.' };
  }
  /* o Supabase responde 200 mesmo para e-mail que não existe, de propósito:
     senão esta tela viraria um jeito de descobrir quem tem conta. A gente
     repete esse cuidado no recado. */
  if (!r.ok && r.status !== 200) {
    var d = await r.json().catch(function () { return {}; });
    if (r.status === 429) return { erro: 'Você pediu muitas vezes seguidas. Espere um minuto.' };
    return { erro: d.msg || d.error_description || 'Não consegui pedir o link (' + r.status + ').' };
  }
  return { ok: true, email: email };
};

B12.nuvSair = function () {
  try { localStorage.removeItem(CHAVE); } catch (e) {}
  if (B12.NUVEM) B12.NUVEM.sessao = null;
};

/* ------------------------------------------------------- ao abrir o app */
B12.nuvAcordar = async function () {
  if (!B12.NUVEM || !B12.NUVEM.url) return false;
  var s = lido();
  if (!s) return false;
  B12.NUVEM.sessao = s;
  if (s.expira > Date.now()) return true;
  var deu = await B12.nuvRenovar();
  /* 13/11/2026: sessão morta E sem como renovar não pode continuar montada.
     Era isso que deixava o app dizendo "ligado" com um token de dias atrás.
     Se a renovação falhou por rede (o refresh_token continua lá), a sessão
     FICA — derrubar alguém porque o ônibus entrou no túnel é o pior
     atendimento possível. Só cai quando o banco recusa o refresh. */
  if (!deu && !lido()) { B12.NUVEM.sessao = null; }
  return deu;
};

/* o relógio da sessão: renova antes de vencer, e sempre que o app volta para
   a frente da tela (que no celular é quando ele de fato acorda) */
B12.nuvVigiar = function () {
  if (B12.nuvVigiar.ligado) return; B12.nuvVigiar.ligado = true;
  var ultima = 0;
  function conferir() {
    if (Date.now() - ultima < 30000) return;        /* trava de rajada */
    ultima = Date.now();
    if (B12.NUVEM && (B12.NUVEM.sessao || lido())) B12.nuvGarantir();
  }
  setInterval(conferir, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) conferir(); });
  window.addEventListener('focus', conferir);
  window.addEventListener('online', conferir);
};

window.B12 = B12;

})();
