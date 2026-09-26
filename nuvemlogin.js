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
B12.nuvQuem = function () {
  var s = B12.NUVEM && B12.NUVEM.sessao;
  return s ? { email: s.email, papel: s.papel || 'equipe', id: s.user_id } : null;
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
    if (!r.ok) return false;
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
  return await B12.nuvRenovar();
};

window.B12 = B12;

})();
