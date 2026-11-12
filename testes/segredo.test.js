/* ============================================================================
   O PIN NÃO VIAJA — rodar com:  node testes/segredo.test.js

   Achado na revisão de 12/11/2026: os dois PINs (dono e equipe) ficavam
   gravados em texto aberto dentro de `B12.DB.ajustes`. E `ajustes` é uma das
   coleções que a sincronia manda para o banco — uma linha só, na tabela
   `b12_ajustes`, cuja política de leitura é a equipe INTEIRA:

       create policy ajustes_ler on public.b12_ajustes for select to authenticated
         using (public.b12_e_equipe());                 -- nuvem/01-esquema.sql

   Ou seja: qualquer marinheiro com conta podia ler o PIN do dono direto do
   Postgres. O dinheiro continuava trancado pela RLS das tabelas de lançamento
   e de contas, e nenhum membro de equipe tinha conta ainda — então ninguém
   foi mordido. Mas era um segredo andando onde não precisava.

   O PIN é a tranca DESTE aparelho, não um dado do negócio. Agora mora na
   chave `b12_pins` do localStorage, fora de tudo que sincroniza, fora do
   cofre e fora do arquivo de exportação.

   Estas verificações existem para que ele não volte sem ninguém perceber: o
   caminho de volta é fácil e silencioso — basta alguém escrever
   `B12.DB.ajustes.pins = ...` de novo, e nada quebra em lugar nenhum.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
function lê(f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }
/* comentário não é código: sem tirar, estas verificações casariam com os
   próprios comentários que mandam nunca gravar o PIN em ajustes */
function semComentario(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

const ACESSO = lê('acesso.js'), NUCLEO = lê('nucleo.js'), SINC = lê('sincronia.js');

/* ===================================================== 1. nada grava em ajustes */
console.log('\n— ninguém escreve o PIN dentro de ajustes —');

const JS = fs.readdirSync(path.join(__dirname, '..'))
  .filter(f => f.endsWith('.js'));
const culpados = JS.filter(f => /ajustes\s*(\.|\[['"])pins\b[^=]{0,40}=[^=]/.test(semComentario(lê(f))));
eh('nenhum arquivo do app grava ajustes.pins', culpados.length === 0,
   'gravam: ' + culpados.join(', '));

eh('o banco de fábrica não tem campo de senha em ajustes',
   !/pins\s*:/.test(semComentario(NUCLEO)),
   'vazio() com `pins: null` já basta para o campo subir para a nuvem');

eh('o PIN é lido de uma chave só dele no aparelho',
   /PINS\s*=\s*'b12_pins'/.test(ACESSO) &&
   /function pins\(\)[\s\S]{0,260}?localStorage\.getItem\(PINS\)/.test(ACESSO));

eh('a chave do PIN não é nenhuma das que a sincronia conhece',
   !/b12_pins/.test(SINC),
   'a sincronia só mexe nas chaves dela; o PIN não é uma delas');

eh('o carregar muda a casa do PIN de quem já usava',
   /B12\.pinsMigrar\(/.test(semComentario(NUCLEO)));

eh('e regrava o banco do aparelho na hora, sem esperar outro salvar',
   /tinhaPin[\s\S]{0,500}?localStorage\.setItem\(CHAVE/.test(NUCLEO),
   'senão o PIN fica em texto aberto dentro de b12_dados_v1');

eh('e a cópia que sai do app não leva senha',
   /delete d\.ajustes\.pins/.test(NUCLEO));

/* ============================================== 2. a mudança de casa, de verdade
   O acesso.js roda sozinho num mundo de mentira: o que interessa é que o PIN
   de quem já usava continue abrindo a porta depois da atualização. */
console.log('\n— quem já tinha PIN não perde o PIN —');
{
  const loja = {};
  const g = {
    localStorage: {
      getItem: k => (k in loja ? loja[k] : null),
      setItem: (k, v) => { loja[k] = String(v); },
      removeItem: k => { delete loja[k]; }
    },
    document: { addEventListener(){}, querySelector: () => null },
    setTimeout, clearTimeout, console
  };
  g.window = g;
  const ctx = vm.createContext(g);
  vm.runInContext(ACESSO, ctx);

  /* o banco deste aparelho, como estava antes de 12/11/2026 */
  g.B12.DB = { ajustes: { regular: 60, pins: { dono: '9981', equipe: '4422' } } };
  const migrou = g.B12.pinsMigrar(g.B12.DB.ajustes);

  eh('o PIN veio para a chave nova', migrou === true &&
     JSON.parse(loja.b12_pins || '{}').dono === '9981');
  eh('e SAIU de ajustes', !('pins' in g.B12.DB.ajustes),
     JSON.stringify(g.B12.DB.ajustes));
  eh('o resto de ajustes fica intacto', g.B12.DB.ajustes.regular === 60);

  /* um aparelho que ainda não atualizou manda o campo velho de volta: o PIN
     DESTE aparelho vale mais que o que chega de fora */
  const deFora = { pins: { dono: '0000', equipe: '1111' } };
  g.B12.pinsMigrar(deFora);
  eh('PIN que chega de fora não troca o PIN do aparelho',
     JSON.parse(loja.b12_pins).dono === '9981',
     'veio ' + loja.b12_pins);
  eh('e sai da linha que chegou', !('pins' in deFora));

  eh('rodar de novo sem PIN em ajustes não faz nada',
     g.B12.pinsMigrar({ regular: 60 }) === false);
}

/* =================================================== 3. o que a sincronia envia
   Banco de mentira, igual ao de testes/sincronia.test.js: o que importa é a
   LINHA que sai do aparelho. */
console.log('\n— o PIN não sobe para a nuvem —');

function bancoFalso() {
  const linhas = {};
  let relógio = 1000;
  async function servir(url, opc) {
    opc = opc || {};
    const u = new URL(url, 'http://x');
    const tabela = u.pathname.split('/').pop();
    if ((opc.method || 'GET') === 'POST') {
      JSON.parse(opc.body).forEach(l => {
        relógio += 10;
        linhas[tabela] = linhas[tabela] || {};
        linhas[tabela][l.id] = { id: String(l.id), dados: l.dados, apagado: !!l.apagado,
                                 atualizado: new Date(relógio).toISOString() };
      });
      return { ok: true, status: 201, json: async () => ([]) };
    }
    const desde = decodeURIComponent((u.search.match(/atualizado=gt\.([^&]+)/) || [,''])[1]);
    const saída = Object.values(linhas[tabela] || {})
      .filter(l => l.atualizado > desde)
      .sort((a, b) => a.atualizado < b.atualizado ? -1 : 1);
    return { ok: true, status: 200, json: async () => saída };
  }
  /* uma linha que já está no banco desde antes do conserto */
  function plantar(tabela, id, dados) {
    relógio += 10;
    linhas[tabela] = linhas[tabela] || {};
    linhas[tabela][id] = { id: String(id), dados: dados, apagado: false,
                           atualizado: new Date(relógio).toISOString() };
  }
  return { servir, linhas, plantar };
}

function aparelho(banco, papel) {
  const loja = {};
  const j = {
    localStorage: {
      getItem: k => (k in loja ? loja[k] : null),
      setItem: (k, v) => { loja[k] = String(v); },
      removeItem: k => { delete loja[k]; }
    },
    document: { addEventListener(){}, querySelector: () => null, hidden: false, activeElement: null },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval(){},
    fetch: banco.servir,
    AbortController: class { constructor(){ this.signal = {}; } abort(){} },
    WebSocket: class { send(){} close(){} },
    console, addEventListener(){}
  };
  j.window = j;
  j.B12 = {
    DB: { reservas: [], clientes: [], saidas: [], patio: [], lancamentos: [],
          contas: [], manutencoes: [], marinheiros: [], tarefas: [],
          ajustes: { regular: 60 } },
    NUVEM: { url: 'http://banco', chave: 'k', ligada: true },
    nuvLogado: () => true,
    nuvQuem: () => ({ papel: papel || 'dono', email: 'x@y', id: 'u1' }),
    nuvToken: () => 't',
    nuvCabecalho: () => ({ apikey: 'k', Authorization: 'Bearer t', 'Content-Type': 'application/json' }),
    hoje: () => '2026-11-12',
    ehDemo: () => false,
    redesenhar: () => {}
  };
  const ctx = vm.createContext(j);
  vm.runInContext(SINC, ctx);
  j.B12.__loja = loja;
  return j.B12;
}

const espera = ms => new Promise(r => setTimeout(r, ms));
const temPin = x => /"pins"/.test(JSON.stringify(x || null));

(async function () {
  {
    const banco = bancoFalso(), A = aparelho(banco);
    /* alguém pôs o PIN em ajustes de novo (ou é um banco antigo deste aparelho) */
    A.DB.ajustes.pins = { dono: '9981', equipe: '4422' };
    A.DB.reservas.push({ id: 'rs-k7a', nome: 'Ana', pax: 2 });
    await A.sincAoAbrir();

    eh('a linha de ajustes subiu', !!(banco.linhas.b12_ajustes && banco.linhas.b12_ajustes['1']));
    eh('e subiu SEM o PIN', !temPin(banco.linhas.b12_ajustes['1'].dados),
       JSON.stringify(banco.linhas.b12_ajustes['1'].dados));
    eh('o resto de ajustes subiu inteiro',
       banco.linhas.b12_ajustes['1'].dados.regular === 60);
    eh('nenhuma tabela do banco tem a palavra pins', !temPin(banco.linhas),
       'procure "pins" em ' + Object.keys(banco.linhas).join(', '));

    /* o cofre da nuvem leva o banco INTEIRO: é a outra porta de saída */
    const c = await A.cofreNuvem('mao');
    eh('a cópia da nuvem foi feita', !!(c && c.ok), JSON.stringify(c));
    eh('e a cópia da nuvem também não leva o PIN',
       !temPin(banco.linhas.b12_cofre),
       JSON.stringify(banco.linhas.b12_cofre));
    eh('mas leva o resto do banco',
       Object.values(banco.linhas.b12_cofre)[0].dados.reservas.length === 1);
  }

  console.log('\n— e a senha que JÁ está na nuvem sai de lá —');
  {
    const banco = bancoFalso();
    /* a linha que está no banco da B12 hoje, gravada antes do conserto */
    banco.plantar('b12_ajustes', '1', { regular: 60, metaMensal: 60000,
                                        pins: { dono: '9981', equipe: '4422' } });
    const dono = aparelho(banco);
    await dono.sincAoAbrir();

    eh('o aparelho do dono recebeu os ajustes', dono.DB.ajustes.metaMensal === 60000);
    eh('e NÃO deixou o PIN entrar no banco do aparelho',
       !('pins' in dono.DB.ajustes), JSON.stringify(dono.DB.ajustes));
    eh('a linha limpa subiu por cima: a senha saiu da nuvem',
       !temPin(banco.linhas.b12_ajustes['1'].dados),
       JSON.stringify(banco.linhas.b12_ajustes['1'].dados));
    eh('sem perder o que estava na linha',
       banco.linhas.b12_ajustes['1'].dados.metaMensal === 60000);
  }

  {
    const banco = bancoFalso();
    banco.plantar('b12_ajustes', '1', { regular: 60, pins: { dono: '9981', equipe: '4422' } });
    const eq = aparelho(banco, 'equipe');
    await eq.sincAoAbrir();
    eh('no aparelho da equipe o PIN também não entra',
       !('pins' in eq.DB.ajustes), JSON.stringify(eq.DB.ajustes));
    eh('e a equipe não fica com uma fila que o banco nunca vai aceitar',
       eq.sincEstado().fila === 0, 'fila com ' + eq.sincEstado().fila);
  }

  await espera(10);
  console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
