/* =====================================================================
   Estação B12 — O CARTEIRO DOS AVISOS, RODANDO DE VERDADE

   Este teste não lê o código: ele LEVANTA a função `avisar` no Deno (o mesmo
   runtime do Supabase), põe no lugar do banco um Supabase de mentira que eu
   controlo, e confere o que sai do outro lado — inclusive o aviso já
   encriptado chegando no endereço do aparelho.

   POR QUE ASSIM
   Em 12/11/2026, na revisão de entrega, a varredura diária estava lendo
   COLUNAS que a sincronia abandonou em 06/10 (data, sentido, situacao). O
   estrago não era erro: era aviso errado com cara de certo — "faltam os
   horários de amanhã" todo dia, e toda reserva da história contada como
   pedido esperando. Nenhum teste de leitura de arquivo pegaria isso, porque
   o código estava sintaticamente perfeito. Só rodando contra dados é que
   aparece.

   De quebra isto prova a sintaxe do filtro `dados->>campo`, que era a minha
   dúvida real ao escrever o conserto: o teste imprime a URL que o cliente
   montou e exige a forma certa.
   ===================================================================== */
'use strict';
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const { spawn, execFileSync } = require('child_process');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PORTA_BANCO = 8913;
const PORTA_PUSH = 8915;
const PORTA_FUNCAO = 8000;          /* o padrão do Deno.serve */

/* O web-push SÓ fala TLS -- medido em 12/11/2026: endereço http:// morre com
   "wrong version number" antes de sair da máquina. Então o aparelho de
   mentira precisa de certificado, e o Deno roda com a trava de certificado
   solta SÓ para 127.0.0.1. Sem isso este teste provaria o nada. */
let CERTO = null;
try {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b12push-'));
  const chave = path.join(dir, 'k.pem'), cert = path.join(dir, 'c.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', chave, '-out', cert, '-days', '2', '-subj', '/CN=127.0.0.1',
    '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
  CERTO = { key: fs.readFileSync(chave), cert: fs.readFileSync(cert) };
} catch (e) { CERTO = null; }

let passou = 0, falhou = 0;
function ok(nome, cond, extra) {
  if (cond) { passou++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHA ' + nome + (extra ? '\n        ' + extra : '')); }
}

/* ---- datas, do mesmo jeito que a função calcula (America/Sao_Paulo) ---- */
const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const amanha = new Date(Date.parse(hoje + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);

/* ---- um par de chaves de aparelho DE VERDADE, senão o web-push não
        consegue encriptar e a falha seria do teste, não do código ---- */
const par = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const p256dh = par.publicKey.export({ type: 'spki', format: 'der' }).slice(-65)
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const authSecret = crypto.randomBytes(16)
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ---- o que o banco de mentira tem dentro ----
   saidas: hoje completo; AMANHÃ só com ida (falta a volta)
   reservas: 2 pedidas (uma já na escala), 1 confirmada na Ilha sem volta */
const SAIDAS = [
  { dados: { data: hoje,   hora: '09:00', sentido: 'ida' } },
  { dados: { data: hoje,   hora: '17:00', sentido: 'volta' } },
  { dados: { data: amanha, hora: '09:00', sentido: 'ida' } },
];
const RESERVAS = [
  { id: 'r1', dados: { situacao: 'pedida', nome: 'Ana', saidaId: null } },
  { id: 'r2', dados: { situacao: 'pedida', nome: 'Bia', saidaId: 'sd9' } },
  { id: 'r3', dados: { situacao: 'confirmada', nome: 'Caio', ida: hoje, volta: null,
                       saidaVoltaId: null } },
];

const urls = [];        /* tudo que a função pediu ao banco */
const pushes = [];      /* tudo que chegou no "aparelho" */
let vapidGuardado = null;

function corpoDe(req) {
  return new Promise(res => { let b = ''; req.on('data', d => b += d); req.on('end', () => res(b)); });
}

/* responde array ou objeto, conforme o maybeSingle() pediu */
function manda(req, res, linhas, status) {
  const objeto = (req.headers.accept || '').indexOf('pgrst.object') >= 0;
  res.writeHead(status || 200, { 'Content-Type': 'application/json' });
  if (objeto) res.end(JSON.stringify(linhas[0] || null));
  else res.end(JSON.stringify(linhas));
}

const banco = http.createServer(async (req, res) => {
  const u = decodeURIComponent(req.url);
  const corpo = await corpoDe(req);

  if (u.indexOf('/push/') === 0) {           /* o aparelho recebendo */
    pushes.push({ url: u, bytes: corpo.length, cab: req.headers });
    res.writeHead(201); return res.end('');
  }

  urls.push(req.method + ' ' + u);

  if (u.indexOf('/rest/v1/b12_segredos') === 0) {
    if (req.method === 'POST') {             /* a função gerando o par VAPID */
      try { vapidGuardado = JSON.parse(corpo).valor; } catch (e) {}
      res.writeHead(201, { 'Content-Type': 'application/json' }); return res.end('[]');
    }
    if (u.indexOf('id=eq.relogio') >= 0) return manda(req, res, [{ valor: { chave: 'selo-de-teste' } }]);
    if (u.indexOf('id=eq.vapid') >= 0)
      return manda(req, res, vapidGuardado ? [{ valor: vapidGuardado }] : []);
    return manda(req, res, []);
  }

  if (u.indexOf('/rest/v1/b12_saidas') === 0) {
    const casa = SAIDAS.filter(s => u.indexOf(s.dados.data) >= 0);
    return manda(req, res, casa);
  }

  if (u.indexOf('/rest/v1/b12_reservas') === 0) {
    const qual = u.indexOf('confirmada') >= 0 ? 'confirmada' : 'pedida';
    return manda(req, res, RESERVAS.filter(r => r.dados.situacao === qual));
  }

  if (u.indexOf('/rest/v1/b12_aparelhos') === 0) {    /* contagem: vai no cabeçalho */
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Range': '0-1/2' });
    return res.end('[]');
  }

  if (u.indexOf('/rest/v1/b12_avisos') === 0) {
    if (req.method === 'PATCH') { res.writeHead(204); return res.end(''); }
    const papeis = (u.match(/papel=in\.\(([^)]*)\)/) || [, ''])[1].replace(/"/g, '').split(',');
    const inscritos = papeis.indexOf('dono') >= 0
      ? [{ id: 'ap1', endpoint: 'https://127.0.0.1:' + PORTA_PUSH + '/push/ap1',
           p256dh: p256dh, auth: authSecret }]
      : [];
    return manda(req, res, inscritos);
  }

  res.writeHead(404); res.end('{}');
});

/* o "aparelho": recebe o aviso já cifrado */
const aparelho = CERTO && https.createServer(CERTO, async (req, res) => {
  pushes.push({ url: req.url, bytes: (await corpoDe(req)).length, cab: req.headers });
  res.writeHead(201); res.end('');
});

function espera(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pede(caminho, opc) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: PORTA_FUNCAO, path: caminho,
      method: (opc && opc.method) || 'GET', headers: (opc && opc.headers) || {} },
      res => { let b = ''; res.on('data', d => b += d);
               res.on('end', () => resolve({ status: res.statusCode, corpo: b })); });
    r.on('error', reject);
    if (opc && opc.body) r.write(opc.body);
    r.end();
  });
}

(async function () {
  console.log('\n=== O carteiro dos avisos, rodando de verdade ===\n');
  await new Promise(r => banco.listen(PORTA_BANCO, '127.0.0.1', r));
  if (aparelho) await new Promise(r => aparelho.listen(PORTA_PUSH, '127.0.0.1', r));
  else console.log('  AVISO: sem openssl -- as 3 provas de entrega não rodaram\n');

  const fn = spawn('deno', ['run', '-A', '--quiet', 'nuvem/funcoes/avisar/index.ts'], {
    cwd: RAIZ, env: Object.assign({}, process.env, {
      SUPABASE_URL: 'http://127.0.0.1:' + PORTA_BANCO,
      SUPABASE_SERVICE_ROLE_KEY: 'chave-de-servico-de-teste',
      VAPID_CONTATO: 'mailto:teste@estacaob12.com.br',
      /* o aparelho de mentira tem certificado próprio. A bandeira do Deno
         (--unsafely-ignore-certificate-errors) NÃO alcança o node:https, que
         é por onde o web-push sai -- medido: continuava "self-signed
         certificate". Esta variável alcança. Vale só para este processo de
         teste; nada disso existe no servidor. */
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let saida = '';
  fn.stdout.on('data', d => saida += d); fn.stderr.on('data', d => saida += d);

  /* espera a função subir */
  let viva = false;
  for (let i = 0; i < 60 && !viva; i++) {
    await espera(500);
    try { const r = await pede('/'); viva = r.status === 200; } catch (e) {}
  }
  ok('a função sobe no Deno', viva, saida.slice(0, 400));

  if (viva) {
    const r = await pede('/', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-b12-relogio': 'selo-de-teste' },
      body: JSON.stringify({ varrer: true }) });
    let j = {};
    try { j = JSON.parse(r.corpo); } catch (e) {}

    ok('o relógio é aceito sem ninguém logado', r.status === 200, r.corpo.slice(0, 200));
    ok('nenhuma consulta falhou', Array.isArray(j.problemas) && j.problemas.length === 0,
       'problemas: ' + JSON.stringify(j.problemas));

    /* ---- O QUE ESTAVA QUEBRADO: lê de dentro de `dados` ---- */
    const uSaidas = urls.filter(u => u.indexOf('b12_saidas') >= 0)[0] || '';
    ok('filtra a saída por dados->>data (e não pela coluna morta)',
       uSaidas.indexOf('dados->>data=in.') >= 0, uSaidas);
    ok('a saída apagada fica de fora', uSaidas.indexOf('apagado=eq.false') >= 0, uSaidas);
    const uRes = urls.filter(u => u.indexOf('b12_reservas') >= 0);
    ok('filtra a reserva por dados->>situacao',
       uRes.length === 2 && uRes.every(u => u.indexOf('dados->>situacao=eq.') >= 0),
       JSON.stringify(uRes));
    ok('a busca de quem está na Ilha tem teto de data',
       (uRes[1] || '').indexOf('dados->>ida=gte.') >= 0, uRes[1]);

    /* ---- os quatro avisos certos, com as contas certas ---- */
    ok('manda os 4 avisos do dia', j.avisos === 4, 'avisos: ' + j.avisos);
    if (!aparelho) console.log('  -- entrega não verificada (sem openssl)');
    else {
    ok('o aviso sai encriptado para o aparelho', pushes.length === 4,
       'chegaram ' + pushes.length);
    ok('vai assinado (VAPID no cabeçalho)',
       pushes.length > 0 && /vapid|WebPush/i.test(String(pushes[0].cab.authorization || '')),
       pushes.length ? String(pushes[0].cab.authorization).slice(0, 40) : '-');
    ok('o conteúdo vai cifrado, não em texto puro',
       pushes.length > 0 && pushes[0].bytes > 50 &&
       pushes[0].cab['content-encoding'] === 'aes128gcm',
       pushes.length ? pushes[0].cab['content-encoding'] + ' / ' + pushes[0].bytes + ' bytes' : '-');
    ok('a conta de mandados bate', j.mandados === 4, 'mandados: ' + j.mandados);
    }
    if (j.mandados !== 4) {
      console.log('        resposta: ' + JSON.stringify(j));
      console.log('        consultas de assinatura: ' +
        JSON.stringify(urls.filter(u => u.indexOf('b12_avisos') >= 0)));
    }

    /* ---- e a prova de que NÃO mente: com a grade montada, cala ---- */
    SAIDAS.push({ dados: { data: amanha, hora: '17:00', sentido: 'volta' } });
    RESERVAS[0].dados.saidaId = 'sd1';        /* o pedido entrou na escala */
    RESERVAS[2].dados.saidaVoltaId = 'sd2';   /* o Caio escolheu a volta */
    const r2 = await pede('/', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-b12-relogio': 'selo-de-teste' },
      body: JSON.stringify({ varrer: true }) });
    const j2 = JSON.parse(r2.corpo || '{}');
    ok('com tudo em ordem, sobra só o aviso de quem instalou',
       j2.avisos === 1, 'avisos: ' + j2.avisos);

    /* ---- e quando o banco RECUSA, não inventa aviso ---- */
    const guarda = banco.listeners('request');
    RESERVAS.length = 0; SAIDAS.length = 0;
    const r3 = await pede('/', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-b12-relogio': 'selo-de-teste' },
      body: JSON.stringify({ varrer: true }) });
    const j3 = JSON.parse(r3.corpo || '{}');
    ok('banco vazio de verdade = reclama dos horários (certo)',
       j3.avisos >= 1, 'avisos: ' + j3.avisos);
  }

  fn.kill('SIGKILL');
  await new Promise(r => banco.close(r));
  if (aparelho) await new Promise(r => aparelho.close(r));
  console.log('\n' + passou + ' passaram, ' + falhou + ' falharam\n');
  process.exit(falhou ? 1 : 0);
})();
