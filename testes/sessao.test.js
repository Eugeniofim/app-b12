/* ============================================================================
   A SESSÃO DA NUVEM NÃO PODE MENTIR NEM MORRER CALADA

   13/11/2026. O Eugênio ligou a nuvem e a tela ficou assim:
     Estação → Dados:     "Ligado como eugeniofim@gmail.com · dono"
     Notificações:        "Faça o login da nuvem primeiro."
   E nada — nada — tinha subido para o banco: 0 clientes, 0 reservas.

   Dois defeitos, um em cima do outro:

   1. `nuvQuem()` devolvia o nome guardado SEM olhar a validade, enquanto
      `nuvLogado()` conferia o prazo. Duas funções lendo a mesma sessão e
      discordando: por isso uma tela dizia ligado e a outra não.

   2. O token do Supabase vale 1 HORA, e `nuvRenovar` só era chamado dentro de
      `nuvAcordar`, que roda UMA VEZ, ao abrir o app. Num app instalado, que
      fica dias na memória sem recarregar, a nuvem funcionava por uma hora e
      depois parava calada — `sincPronta()` virava falso e a fila nunca saía.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const fonte = fs.readFileSync(path.join(raiz, 'nuvemlogin.js'), 'utf8');

/* ------------------------------------------------- um navegador de mentira */
function monta(opc) {
  opc = opc || {};
  const guardado = {};
  const chamadas = [];
  const janela = {
    B12: { NUVEM: { url: 'https://nuvem.teste', chave: 'CHAVE_PUBLICA', ligada: true } },
    localStorage: {
      getItem: (k) => (k in guardado ? guardado[k] : null),
      setItem: (k, v) => { guardado[k] = String(v); },
      removeItem: (k) => { delete guardado[k]; }
    },
    setTimeout: (f, t) => setTimeout(f, 0),
    clearTimeout: () => {},
    setInterval: () => 0,
    AbortController: function () { this.signal = {}; this.abort = () => {}; },
    addEventListener: () => {},
    fetch: async (url, o) => {
      chamadas.push({ url, corpo: o && o.body });
      if (/refresh_token/.test(url)) {
        if (opc.refreshRecusado) return { ok: false, status: 400, json: async () => ({}) };
        if (opc.refreshSemRede) throw new Error('rede fora');
        return { ok: true, status: 200, json: async () => ({
          access_token: 'TOKEN_NOVO', refresh_token: 'R2', expires_in: 3600,
          user: { email: 'eu@b12.com', id: 'u1' } }) };
      }
      return { ok: true, status: 200, json: async () => ({}), text: async () => '"dono"' };
    },
    document: { addEventListener: () => {} }
  };
  janela.window = janela;
  const fn = new Function('window', 'localStorage', 'fetch', 'setTimeout', 'clearTimeout',
    'setInterval', 'AbortController', 'document',
    fonte + '\n; return window.B12;');
  const B12 = fn(janela, janela.localStorage, janela.fetch, janela.setTimeout,
    janela.clearTimeout, janela.setInterval, janela.AbortController, janela.document);
  return { B12, guardado, chamadas };
}

function sessaoVencida(extra) {
  return Object.assign({ access_token: 'VELHO', refresh_token: 'R1',
    expira: Date.now() - 60000, email: 'eu@b12.com', user_id: 'u1', papel: 'dono' }, extra || {});
}

console.log('\n— o cartão não pode dizer "ligado" com sessão vencida —');
let m = monta();
m.B12.NUVEM.sessao = sessaoVencida();
eh('nuvLogado() vê que venceu', m.B12.nuvLogado() === false);
eh('e nuvQuem() AGORA também', m.B12.nuvQuem().expirado === true,
  'voltou a mentir: ' + JSON.stringify(m.B12.nuvQuem()));
eh('mas ainda diz de quem era a sessão', m.B12.nuvQuem().email === 'eu@b12.com');
eh('e se dá para religar sozinho', m.B12.nuvQuem().podeRenovar === true);

m = monta();
m.B12.NUVEM.sessao = { access_token: 'BOM', refresh_token: 'R1', expira: Date.now() + 600000,
  email: 'eu@b12.com', user_id: 'u1', papel: 'dono' };
eh('sessão viva não aparece como expirada', m.B12.nuvQuem().expirado === false);
eh('sem sessão nenhuma, nuvQuem devolve nada',
  (function () { const x = monta(); return x.B12.nuvQuem() === null; })());

console.log('\n— a sessão se renova sozinha —');
(async function () {
  let a = monta();
  a.guardado['b12_nuvem_sessao'] = JSON.stringify(sessaoVencida());
  a.B12.NUVEM.sessao = sessaoVencida();
  const deu = await a.B12.nuvGarantir();
  eh('vencida + refresh_token = renova', deu === true);
  eh('e o token novo ficou valendo', a.B12.nuvLogado() === true);
  eh('bateu no endereço de refresh',
    a.chamadas.some(c => /grant_type=refresh_token/.test(c.url)));

  let b = monta();
  b.B12.NUVEM.sessao = { access_token: 'BOM', expira: Date.now() + 600000, email: 'x' };
  const antes = b.chamadas.length;
  eh('sessão viva não gasta chamada à toa',
    (await b.B12.nuvGarantir()) === true && b.chamadas.length === antes);

  let c = monta();
  eh('sem sessão nenhuma, não inventa', (await c.B12.nuvGarantir()) === false);

  /* duas chamadas juntas não podem virar dois refresh: o segundo invalida o
     token do primeiro e derruba a pessoa */
  let d = monta();
  d.guardado['b12_nuvem_sessao'] = JSON.stringify(sessaoVencida());
  d.B12.NUVEM.sessao = sessaoVencida();
  await Promise.all([d.B12.nuvGarantir(), d.B12.nuvGarantir(), d.B12.nuvGarantir()]);
  eh('três pedidos ao mesmo tempo = UM refresh só',
    d.chamadas.filter(x => /refresh_token/.test(x.url)).length === 1,
    d.chamadas.filter(x => /refresh_token/.test(x.url)).length + ' refresh');

  console.log('\n— rede fora não derruba ninguém, banco recusando derruba —');
  let e = monta({ refreshSemRede: true });
  e.guardado['b12_nuvem_sessao'] = JSON.stringify(sessaoVencida());
  await e.B12.nuvAcordar();
  eh('internet caiu: a sessão FICA (o túnel do ônibus não desloga)',
    !!e.guardado['b12_nuvem_sessao'],
    'apagou a sessão por causa da rede');

  let f = monta({ refreshRecusado: true });
  f.guardado['b12_nuvem_sessao'] = JSON.stringify(sessaoVencida());
  await f.B12.nuvAcordar();
  eh('o banco recusou o refresh: aí sim a sessão acaba',
    !f.guardado['b12_nuvem_sessao'] && !f.B12.NUVEM.sessao,
    'ficou um zumbi dizendo que está ligado');

  console.log('\n— quem leva 401 tenta renovar e repete uma vez —');
  let g = monta();
  g.guardado['b12_nuvem_sessao'] = JSON.stringify(sessaoVencida());
  g.B12.NUVEM.sessao = sessaoVencida();
  let vezes = 0;
  const r = await g.B12.nuvComSessao(async function () {
    vezes++;
    return vezes === 1 ? { status: 401 } : { status: 200 };
  });
  eh('repetiu depois de renovar', vezes === 2 && r.status === 200,
    vezes + ' tentativa(s), status ' + r.status);

  let h = monta();
  h.B12.NUVEM.sessao = { access_token: 'BOM', expira: Date.now() + 600000, email: 'x' };
  let n2 = 0;
  await h.B12.nuvComSessao(async function () { n2++; return { status: 200 }; });
  eh('deu certo de primeira: não repete à toa', n2 === 1);

  /* ---------------------------------------- as linhas que ligam tudo */
  console.log('\n— o vigia está ligado no app —');
  const app = fs.readFileSync(path.join(raiz, 'app.js'), 'utf8');
  const sinc = fs.readFileSync(path.join(raiz, 'sincronia.js'), 'utf8');
  const avi = fs.readFileSync(path.join(raiz, 'avisos.js'), 'utf8');
  const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');

  eh('existe o vigia da sessão', /B12\.nuvVigiar = function/.test(fonte));
  eh('ele renova quando o app volta para a frente',
    /visibilitychange[\s\S]{0,120}conferir/.test(fonte));
  eh('e de tempos em tempos', /setInterval\(conferir/.test(fonte));
  eh('com trava de rajada', /Date\.now\(\) - ultima < 30000/.test(fonte));
  eh('o app liga o vigia ao abrir', /if \(B12\.nuvVigiar\) B12\.nuvVigiar\(\)/.test(app));

  console.log('\n— a sincronia espera a sessão de pé —');
  eh('existe o portão com renovação', /async function sessaoDePe\(\)/.test(sinc));
  eh('enviar espera por ele', /if \(!await sessaoDePe\(\)\) return;/.test(sinc));
  eh('o ritual de abertura também', /if \(!await sessaoDePe\(\)\) return \{ erro: 'sem sessão' \}/.test(sinc));
  eh('e o envio repete uma vez no 401',
    /if \(r\.status === 401 && B12\.nuvGarantir && await B12\.nuvGarantir\(\)\) r = await enviar\(\)/.test(sinc));

  console.log('\n— avisos e e-mail renovam antes de desistir —');
  eh('mandar aviso tenta renovar', /if \(B12\.nuvGarantir\) await B12\.nuvGarantir\(\);/.test(avi));
  eh('e o e-mail virou assíncrono para poder esperar',
    /B12\.emailEnviar = async function/.test(avi));
  eh('a recusa explica que foi a sessão, não a falta de login',
    /A sessão da nuvem venceu/.test(avi));

  console.log('\n— o cartão da nuvem mostra os três estados —');
  eh('mostra quando venceu', /A sessão da nuvem venceu/.test(adm));
  eh('mostra quando está ligado', /Ligado como <b>/.test(adm));
  eh('e mostra quando nunca ligou', /Ligue a nuvem/.test(adm));

  console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
