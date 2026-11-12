/* ============================================================================
   LIGAR OS AVISOS NO CELULAR
   Na revisão de entrega de 12/11/2026 descobrimos que NENHUM turista
   conseguia ligar os avisos: o app gravava com "inserir OU atualizar" e o
   banco recusava (42501), porque no Postgres isso exige política de UPDATE
   e de SELECT — e dar SELECT ao visitante vazaria as chaves de push de todo
   mundo. Este teste segura as duas pontas do conserto.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}

const fs = require('fs'), path = require('path');
const fonte = fs.readFileSync(path.join(__dirname, '..', 'avisos.js'), 'utf8');

/* um mundo de mentira, só o suficiente para avLigar rodar */
function monta(opcoes) {
  const chamadas = [];
  const B12 = {
    NUVEM: { url: 'https://nuvem.teste', chave: 'CHAVE_PUBLICA', chavePush: 'BBBB' },
    avEstado: () => ({ pode: true }),
    nuvLogado: () => !!opcoes.logado,
    nuvQuem: () => (opcoes.logado ? { email: 'x@y', papel: opcoes.papelDaConta, id: 'uid-1' } : null),
    nuvCabecalho: () => ({ apikey: 'CHAVE_PUBLICA', Authorization: 'Bearer TOKEN_DA_CONTA',
                           'Content-Type': 'application/json' }),
    meuCadastro: () => ({ id: 'cli-9' }),
    pode: (p) => !!opcoes.pinLocal && (p === 'dono' || p === 'equipe'),
  };
  const janela = {
    B12, console, setTimeout, clearTimeout, btoa: (x) => Buffer.from(x, 'binary').toString('base64'),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    AbortController: class { constructor() { this.signal = {}; } abort() {} },
    TextEncoder,
    crypto: { subtle: { digest: async () => new Uint8Array(32).buffer } },
    Notification: { permission: 'granted', requestPermission: async () => 'granted' },
    navigator: {
      userAgent: 'node',
      serviceWorker: { addEventListener() {}, ready: Promise.resolve({ pushManager: {
        getSubscription: async () => ({ toJSON: () => ({
          endpoint: 'https://push.teste/abc', keys: { p256dh: 'P', auth: 'A' } }) }),
      } }) },
    },
    fetch: async (url, init) => {
      chamadas.push({ url, headers: init.headers, corpo: JSON.parse(init.body) });
      return { ok: true, status: 204, text: async () => '' };
    },
    atob: (x) => Buffer.from(x, 'base64').toString('binary'),
    /* avSuportado() exige os três: 'serviceWorker' in navigator,
       'PushManager' in window, 'Notification' in window */
    PushManager: function () {},
    MSStream: undefined,
  };
  janela.window = janela; janela.self = janela;
  new Function('window', 'self', 'B12', 'navigator', 'localStorage', 'fetch', 'Notification',
    'crypto', 'TextEncoder', 'AbortController', 'btoa', 'atob', 'console', 'setTimeout',
    'clearTimeout', fonte)(
    janela, janela, B12, janela.navigator, janela.localStorage, janela.fetch, janela.Notification,
    janela.crypto, TextEncoder, janela.AbortController, janela.btoa, janela.atob, console,
    setTimeout, clearTimeout);
  return { B12, chamadas };
}

(async () => {
  console.log('\n— o turista, que é quem mais usa —');
  {
    const { B12, chamadas } = monta({ logado: false, pinLocal: false });
    const r = await B12.avLigar({ papel: 'turista' });
    eh('consegue ligar', r.ok === true, JSON.stringify(r));
    eh('vai pela função, não pela tabela', /\/rpc\/b12_inscrever$/.test(chamadas[0].url),
       chamadas[0] && chamadas[0].url);
    eh('NÃO usa on_conflict (foi o que quebrava)',
       !chamadas.some(c => /on_conflict/.test(c.url)));
    eh('manda o endereço e as duas chaves do aparelho',
       chamadas[0].corpo.p_endpoint === 'https://push.teste/abc' &&
       chamadas[0].corpo.p_p256dh === 'P' && chamadas[0].corpo.p_auth === 'A');
    eh('não manda papel nenhum — quem decide é a função no banco',
       !('p_papel' in chamadas[0].corpo) && !('papel' in chamadas[0].corpo));
    eh('vai com a chave pública, não com token', chamadas[0].headers.Authorization === 'Bearer CHAVE_PUBLICA');
  }

  console.log('\n— o aparelho com PIN de dono mas SEM conta na nuvem —');
  {
    const { B12, chamadas } = monta({ logado: false, pinLocal: true });
    const r = await B12.avLigar();
    eh('pedir como dono é recusado, com a razão em português',
       !!r.erro && /login da nuvem/.test(r.erro), JSON.stringify(r));
    eh('e não chega a bater no banco para tomar 401', chamadas.length === 0,
       'melhor explicar do que mostrar um botão que dá erro');
  }
  {
    /* é o cartão da home, no celular de quem também é dono: a pergunta é
       "quero receber aviso de turista", e ela tem resposta */
    const { B12, chamadas } = monta({ logado: false, pinLocal: true });
    const r = await B12.avLigar({ papel: 'turista' });
    eh('mas o cartão do turista funciona no mesmo aparelho', r.ok === true, JSON.stringify(r));
    eh('entra como turista, que é a verdade sem conta', r.papel === 'turista');
    eh('PIN local NÃO vira papel na nuvem',
       !JSON.stringify(chamadas[0].corpo).includes('dono'),
       'PIN é a tranca do aparelho, não identidade no servidor');
  }

  console.log('\n— o dono, com a conta da nuvem aberta —');
  {
    const { B12, chamadas } = monta({ logado: true, papelDaConta: 'dono', pinLocal: true });
    const r = await B12.avLigar();
    eh('entra como dono', r.papel === 'dono', JSON.stringify(r));
    eh('vai pela tabela, com a conta dele', /b12_avisos/.test(chamadas[0].url));
    eh('leva o token da conta', chamadas[0].headers.Authorization === 'Bearer TOKEN_DA_CONTA');
    eh('amarra a assinatura na pessoa', chamadas[0].corpo.pessoa_id === 'uid-1');
  }

  console.log('\n— ninguém sobe de papel pela tela —');
  {
    const { B12 } = monta({ logado: true, papelDaConta: 'equipe', pinLocal: true });
    const r = await B12.avLigar({ papel: 'dono' });
    eh('a tela pedir "dono" não faz virar dono', r.papel === 'equipe', JSON.stringify(r));
  }
  {
    const { B12 } = monta({ logado: true, papelDaConta: 'dono', pinLocal: true });
    const r = await B12.avLigar({ papel: 'turista' });
    eh('mas o cartão do turista pode rebaixar', r.papel === 'turista');
  }

  console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
