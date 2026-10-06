/* ============================================================================
   Testes do motor de sincronia — rodar com:  node testes/sincronia.test.js

   Não fala com o Supabase de verdade: um servidor de mentira guarda as linhas
   em memória. O que importa aqui é o COMPORTAMENTO, e cada teste reproduz um
   erro que já custou dado de cliente em outro app.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}

/* ----------------------------------------------------------- o banco falso */
function bancoFalso() {
  const linhas = {};     /* tabela → id → {id, dados, apagado, atualizado} */
  let relogio = 1000;
  let recusar = null;    /* tabela que devolve 401, para simular a funcionária */
  let atrasoEco = [];    /* linhas que a leitura vai devolver "atrasadas" */

  async function servir(url, opc) {
    opc = opc || {};
    const u = new URL(url, 'http://x');
    const tabela = u.pathname.split('/').pop();
    if (recusar && recusar[tabela]) return { ok: false, status: 401, json: async () => ({}) };

    if ((opc.method || 'GET') === 'POST') {
      const corpo = JSON.parse(opc.body);
      corpo.forEach(l => {
        relogio += 10;
        linhas[tabela] = linhas[tabela] || {};
        linhas[tabela][l.id] = { id: String(l.id), dados: l.dados, apagado: !!l.apagado,
                                 atualizado: new Date(relogio).toISOString() };
      });
      return { ok: true, status: 201, json: async () => ([]) };
    }
    const desde = decodeURIComponent((u.search.match(/atualizado=gt\.([^&]+)/) || [,''])[1]);
    let saida = Object.values(linhas[tabela] || {})
      .filter(l => l.atualizado > desde)
      .sort((a, b) => a.atualizado < b.atualizado ? -1 : 1);
    if (atrasoEco.length) { saida = saida.concat(atrasoEco); atrasoEco = []; }
    return { ok: true, status: 200, json: async () => saida };
  }
  return { servir, linhas, recusarTabela: t => { recusar = { [t]: 1 }; },
           injetarEco: l => atrasoEco.push(l) };
}

/* ------------------------------------------------------------- um aparelho */
function aparelho(banco, papel) {
  const guardado = {};
  const janela = {
    localStorage: {
      getItem: k => (k in guardado ? guardado[k] : null),
      setItem: (k, v) => { guardado[k] = String(v); },
      removeItem: k => { delete guardado[k]; }
    },
    document: { addEventListener(){}, querySelector: () => null, hidden: false },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval(){},
    fetch: banco.servir,
    AbortController: class { constructor(){ this.signal = {}; } abort(){} },
    WebSocket: class { constructor(){ setTimeout(()=>{}, 0); } send(){} close(){} },
    console,
  };
  janela.addEventListener = function(){};
  janela.window = janela;
  janela.B12 = {
    DB: { reservas: [], clientes: [], saidas: [], patio: [],
          lancamentos: [], contas: [], manutencoes: [], marinheiros: [],
          ajustes: { regular: 60 } },
    NUVEM: { url: 'http://banco', chave: 'k', ligada: true },
    nuvLogado: () => true,
    nuvQuem: () => ({ papel: papel || 'dono', email: 'x@y', id: 'u1' }),
    nuvToken: () => 't',
    nuvCabecalho: () => ({ apikey: 'k', Authorization: 'Bearer t', 'Content-Type': 'application/json' }),
    hoje: () => '2026-10-06',
    ehDemo: x => !!(x && (x.demo || x.origem === 'demo' ||
      /^(rs-demo-|rs-app-demo-|pt-demo-|mn-demo-|cl-demo-|s\d+$|v\d+$|c\d+b?$|r[12]$)/.test(x.id || ''))),
    redesenhar: () => { janela.B12.__redesenhou = (janela.B12.__redesenhou || 0) + 1; },
  };
  const ctx = vm.createContext(janela);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sincronia.js'), 'utf8'), ctx);
  return janela.B12;
}

const espera = ms => new Promise(r => setTimeout(r, ms));

(async function () {
  console.log('\n— a fila e o portão —');
  {
    const banco = bancoFalso(), A = aparelho(banco);
    A.DB.reservas.push({ id: 'rs-k7a', nome: 'Ana', pax: 2 });
    A.sincAgendar();                      /* antes do ritual: NÃO pode subir */
    await espera(1200);
    eh('não envia nada antes do primeiro ritual',
       Object.keys(banco.linhas).length === 0,
       'subiu ' + JSON.stringify(Object.keys(banco.linhas)));

    await A.sincAoAbrir();
    eh('depois do ritual, a reserva subiu',
       !!(banco.linhas.b12_reservas && banco.linhas.b12_reservas['rs-k7a']));
    eh('o objeto subiu INTEIRO (pax não se perdeu)',
       banco.linhas.b12_reservas['rs-k7a'].dados.pax === 2);
  }

  console.log('\n— dois aparelhos —');
  {
    const banco = bancoFalso();
    const A = aparelho(banco), B = aparelho(banco);
    A.DB.reservas.push({ id: 'rs-k7a', nome: 'Ana', pax: 2 });
    await A.sincAoAbrir();
    await B.sincAoAbrir();
    eh('o aparelho vazio recebeu a reserva', B.DB.reservas.length === 1);
    eh('recebeu com o conteúdo certo', B.DB.reservas[0] && B.DB.reservas[0].nome === 'Ana');

    /* B muda, A recebe */
    B.DB.reservas[0].pax = 5;
    B.sincAgendar(); await espera(1200);
    await A.sincAoAbrir();
    eh('a mudança do outro aparelho chegou', A.DB.reservas[0].pax === 5,
       'veio ' + A.DB.reservas[0].pax);

    /* apagar some nos dois, e não ressuscita */
    B.DB.reservas.length = 0;
    B.sincAgendar(); await espera(1200);
    await A.sincAoAbrir();
    eh('apagou num, sumiu no outro', A.DB.reservas.length === 0,
       'sobraram ' + A.DB.reservas.length);
    await A.sincAoAbrir();
    eh('e não ressuscita na leitura seguinte', A.DB.reservas.length === 0);
  }

  console.log('\n— o eco da própria subida (v111 do TI ARTES OS) —');
  {
    const banco = bancoFalso(), A = aparelho(banco);
    A.DB.reservas.push({ id: 'rs-k7a', nome: 'Ana', pax: 2 });
    await A.sincAoAbrir();
    const ref = A.DB.reservas[0];
    A.DB.reservas[0].pax = 9;             /* mudou de novo, ainda não subiu */
    /* o banco devolve a versão VELHA, atrasada */
    banco.injetarEco({ id: 'rs-k7a', dados: { id: 'rs-k7a', nome: 'Ana', pax: 2 },
                       apagado: false, atualizado: '2099-01-01T00:00:00Z' });
    await A.sincAoAbrir();
    eh('o eco atrasado NÃO regride o registro', A.DB.reservas[0].pax === 9,
       'virou ' + A.DB.reservas[0].pax);
    eh('a referência antiga continua sendo o mesmo objeto', A.DB.reservas[0] === ref);
  }

  console.log('\n— a funcionária não lê dinheiro —');
  {
    const banco = bancoFalso();
    const dono = aparelho(banco, 'dono');
    dono.DB.lancamentos.push({ id: 'ln-m3', valor: 1000 });
    dono.DB.reservas.push({ id: 'rs-k7a', nome: 'Ana' });
    await dono.sincAoAbrir();

    const eq = aparelho(banco, 'equipe');
    eq.DB.lancamentos.push({ id: 'ln-x9', valor: 7 });   /* nunca deve subir */
    await eq.sincAoAbrir();
    eh('a equipe recebe as reservas', eq.DB.reservas.length === 1);
    eh('a equipe NÃO puxa lançamentos', eq.DB.lancamentos.every(l => l.id !== 'ln-m3'),
       JSON.stringify(eq.DB.lancamentos));
    eh('a equipe NÃO envia lançamentos',
       !(banco.linhas.b12_lancamentos && banco.linhas.b12_lancamentos['ln-x9']));
    eh('e o lançamento do dono segue intacto no banco',
       banco.linhas.b12_lancamentos['ln-m3'].dados.valor === 1000);
  }

  console.log('\n— o que entra DURANTE o envio não se perde (v108) —');
  {
    const banco = bancoFalso(), A = aparelho(banco);
    await A.sincAoAbrir();
    for (let i = 0; i < 5; i++) A.DB.clientes.push({ id: 'cl-' + i, nome: 'C' + i });
    A.sincAgendar();
    await espera(300);
    A.DB.clientes.push({ id: 'cl-99', nome: 'entrou no meio' });  /* durante o POST */
    A.sincAgendar();
    await espera(1600);
    eh('os 5 primeiros subiram',
       [0,1,2,3,4].every(i => banco.linhas.b12_clientes && banco.linhas.b12_clientes['cl-'+i]));
    eh('e o que entrou no meio também subiu',
       !!(banco.linhas.b12_clientes && banco.linhas.b12_clientes['cl-99']));
  }

  console.log('\n— o dado de demonstração NUNCA sobe —');
  {
    const banco = bancoFalso(), A = aparelho(banco);
    A.DB.reservas.push({ id: 'rs-demo-3-1', nome: 'Demo', demo: true });
    A.DB.lancamentos.push({ id: 'ln-f1', valor: 999, demo: true });
    A.DB.lancamentos.push({ id: 'ln-v1', valor: 500 });        /* este é de verdade */
    A.DB.clientes.push({ id: 'cl-demo-9', nome: 'Fulano demo' });
    await A.sincAoAbrir();
    eh('reserva de demonstração não subiu',
       !(banco.linhas.b12_reservas && banco.linhas.b12_reservas['rs-demo-3-1']));
    eh('lançamento marcado demo não subiu',
       !(banco.linhas.b12_lancamentos && banco.linhas.b12_lancamentos['ln-f1']));
    eh('cliente com id de demonstração não subiu',
       !(banco.linhas.b12_clientes && banco.linhas.b12_clientes['cl-demo-9']));
    eh('mas o lançamento DE VERDADE subiu',
       !!(banco.linhas.b12_lancamentos && banco.linhas.b12_lancamentos['ln-v1']),
       'o filtro não pode engolir dado real');
  }

  console.log('\n— sem internet —');
  {
    const banco = bancoFalso(), A = aparelho(banco);
    await A.sincAoAbrir();
    const guardado = A.sincEstado();
    eh('o estado diz a verdade sobre o papel', guardado.papel === 'dono');
    eh('e sobre já ter feito o ritual', guardado.emDia === true);
  }

  console.log('\n' + (falhou ? '✗ ' : '✓ ') + ok + ' passaram, ' + falhou + ' falharam\n');
  process.exit(falhou ? 1 : 0);
})();
