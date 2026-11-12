/* ============================================================================
   AS PENDÊNCIAS DA TELA "HOJE" E OS CARTÕES QUE LIGAM O APP

   Achado na revisão de entrega de 12/11/2026, duas horas antes de entregar:

   1. `pendenciasDeConfig` comparava o OBJETO devolvido por `B12.avEstado()`
      com o TEXTO 'ligado'. Objeto nunca é igual a texto, então a linha
      "Ligar os avisos no celular" NUNCA saía da lista. O Dhalsin ligaria o
      aviso e o app seguiria cobrando dele para sempre.

   2. `blocoNuvem` e `blocoAvisos` estavam escritos, completos e CHAMADOS POR
      NINGUÉM. A linha de pendências mandava o dono para a aba Dados para
      "Entrar na nuvem" e lá não havia botão; a Agenda mandava ele ligar o
      aviso "em Notificações" e lá só havia o envio para cliente. Ou seja: o
      login da nuvem e o aviso no celular do dono eram INALCANÇÁVEIS pela
      tela — as duas únicas coisas que faltavam para entregar.

   Nenhum dos dois dava erro em lugar nenhum. É por isso que existe teste.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}

const fs = require('fs'), path = require('path');
const fonte = fs.readFileSync(path.join(__dirname, '..', 'adm.js'), 'utf8');

/* ---------------------------------------------- 1. as linhas não voltaram */
console.log('\n— as linhas do conserto continuam no lugar —');

eh('a pendência lê .ligado (e não compara objeto com texto)',
  /B12\.avEstado\(\)\.ligado/.test(fonte));

eh('ninguém mais compara avEstado() com um texto',
  !/avEstado\(\)\s*[!=]==?\s*['"]/.test(fonte),
  'voltou a comparar objeto com texto');

eh('pDados desenha o cartão da nuvem',
  /function pDados\(raiz\)\s*\{[\s\S]{0,400}?blocoNuvem\(raiz\)/.test(fonte));

eh('pAvisos desenha o cartão do aviso do dono',
  /function pAvisos\(raiz\)\s*\{[\s\S]{0,1200}?blocoAvisos\(raiz\)/.test(fonte));

eh('o cartão da nuvem abre o formulário de login',
  /function blocoNuvem\(raiz\)[\s\S]{0,1600}?B12\.formNuvemEntrar\(/.test(fonte));

eh('o cartão do aviso chama quem liga o aviso',
  /function blocoAvisos\(raiz\)[\s\S]{0,4000}?B12\.avLigar\(/.test(fonte));

eh('a pendência do aviso leva para a aba que TEM o botão',
  /'Ligar os avisos no celular'[\s\S]{0,120}?aba: 'avisos'/.test(fonte));

eh('a pendência da nuvem leva para a aba que TEM o botão',
  /'Entrar na nuvem'[\s\S]{0,120}?aba: 'dados'/.test(fonte));

/* -------------------------------- 2. o comportamento, não só o texto fonte
   Recorta a função de verdade do arquivo e roda com um mundo de mentira.
   É o único jeito de provar que a linha SOME quando o aviso está ligado. */
console.log('\n— a linha some quando a coisa já está feita —');

function recorta(nome) {
  const i = fonte.indexOf('function ' + nome + '(');
  if (i < 0) throw new Error('não achei ' + nome);
  let n = 0, j = fonte.indexOf('{', i);
  for (let k = j; k < fonte.length; k++) {
    if (fonte[k] === '{') n++;
    else if (fonte[k] === '}') { n--; if (!n) return fonte.slice(i, k + 1); }
  }
  throw new Error('não fechou ' + nome);
}

function roda(mundo) {
  const postos = [];
  const sandbox = {
    B12: mundo,
    bloco: function (html) {
      postos.push(html);
      return { querySelectorAll: function () { return []; } };
    },
    raizFalsa: { appendChild: function () {} }
  };
  const fn = new Function('B12', 'bloco', 'raiz',
    recorta('pendenciasDeConfig') + '\n return pendenciasDeConfig(raiz);');
  fn(sandbox.B12, sandbox.bloco, sandbox.raizFalsa);
  return postos.join('');
}

const tudoPendente = roda({
  emDemo: () => true,
  nuvLogado: () => false,
  avEstado: () => ({ pode: true, ligado: false })
});
eh('tudo pendente: aparecem as 3 coisas',
  /demonstração/.test(tudoPendente) && /Entrar na nuvem/.test(tudoPendente) &&
  /Ligar os avisos/.test(tudoPendente), tudoPendente.slice(0, 120));
eh('tudo pendente: o contador diz 3', />3<\/span>/.test(tudoPendente));

const soAviso = roda({
  emDemo: () => false,
  nuvLogado: () => true,
  avEstado: () => ({ pode: true, ligado: false })
});
eh('só o aviso falta: sobra 1 linha, e é a do aviso',
  /Ligar os avisos/.test(soAviso) && !/Entrar na nuvem/.test(soAviso) &&
  !/demonstração/.test(soAviso));

/* ESTE é o que estava quebrado: com o aviso LIGADO a linha tinha que sumir */
const nadaFalta = roda({
  emDemo: () => false,
  nuvLogado: () => true,
  avEstado: () => ({ pode: true, ligado: true })
});
eh('aviso LIGADO + nuvem ligada + fora da demo = nenhuma pendência',
  nadaFalta === '', 'ainda cobra: ' + nadaFalta.slice(0, 160));

const soDemo = roda({
  emDemo: () => true,
  nuvLogado: () => true,
  avEstado: () => ({ pode: true, ligado: true })
});
eh('só a demonstração falta: sobra 1 linha, e é a dela',
  /demonstração/.test(soDemo) && !/Ligar os avisos/.test(soDemo));

/* aparelho que NÃO sabe receber aviso não pode virar cobrança eterna */
const semSuporte = roda({
  emDemo: () => false,
  nuvLogado: () => true,
  avEstado: () => ({ pode: false, ligado: false, motivo: 'navegador não recebe aviso' })
});
eh('aparelho que não recebe aviso ainda aparece na lista (com o motivo na aba)',
  /Ligar os avisos/.test(semSuporte));

/* ------------------------- 3. os dois cartões produzem botão de verdade
   Não basta serem chamados: têm que render o botão que a pessoa aperta.
   Rodados no mesmo recorte-e-executa, com um mundo de mentira. */
console.log('\n— os cartões rendem o botão que a pessoa aperta —');

function rodaBloco(nome, mundo) {
  const postos = [];
  function blocoFalso(html) {
    postos.push(html);
    return {
      querySelector: function () { return { onclick: null }; },
      querySelectorAll: function () { return []; }
    };
  }
  const fn = new Function('B12', 'bloco', 'esc', 'raiz',
    recorta(nome) + '\n return ' + nome + '(raiz);');
  fn(mundo, blocoFalso, (x) => String(x), { appendChild: function () {} });
  return postos.join('');
}

const nuvemFora = rodaBloco('blocoNuvem', {
  nuvLogado: () => false,
  nuvQuem: () => null
});
eh('fora da nuvem: o cartão mostra o botão Entrar',
  /id="b-nv"/.test(nuvemFora) && /Entrar/.test(nuvemFora), nuvemFora.slice(0, 140));

const nuvemDentro = rodaBloco('blocoNuvem', {
  nuvLogado: () => true,
  nuvQuem: () => ({ email: 'dono@exemplo.com', papel: 'dono' })
});
eh('dentro da nuvem: o cartão diz quem está ligado',
  /dono@exemplo\.com/.test(nuvemDentro) && /Gerenciar/.test(nuvemDentro));

const avisoDesligado = rodaBloco('blocoAvisos', {
  avEstado: () => ({ pode: true, ligado: false, permissao: 'default' }),
  ocupar: () => function () {},
  avLigar: () => Promise.resolve({}),
  aviso: () => {},
  admDesenhar: () => {}
});
eh('aviso desligado: aparece o botão "Quero receber avisos"',
  /id="b-av-on"/.test(avisoDesligado) && /Quero receber avisos/.test(avisoDesligado),
  avisoDesligado.slice(0, 140));

const avisoLigado = rodaBloco('blocoAvisos', {
  avEstado: () => ({ pode: true, ligado: true, permissao: 'granted' }),
  ocupar: () => function () {},
  avTestar: () => Promise.resolve({ mandados: 1 }),
  avVarrer: () => Promise.resolve({ avisos: 0 }),
  avDesligar: () => Promise.resolve({}),
  aviso: () => {},
  admDesenhar: () => {}
});
eh('aviso ligado: aparece o botão de mandar um teste',
  /id="b-av-teste"/.test(avisoLigado) && /pilula dentro/.test(avisoLigado));

const iphoneSemInstalar = rodaBloco('blocoAvisos', {
  avEstado: () => ({ pode: false, ligado: false, precisaInstalar: true,
    motivo: 'No iPhone o aviso só funciona com o app instalado.' })
});
eh('iPhone sem instalar: explica a tela de início em vez de botão quebrado',
  /Tela de In/.test(iphoneSemInstalar) && !/id="b-av-on"/.test(iphoneSemInstalar));

/* ---------------------------------- 4. o botão + foi eliminado
   12/11/2026. Mais cedo hoje eu tirei o + de baixo da bolha do Assistente;
   horas depois o Eugênio mandou eliminar o botão inteiro, porque todo item do
   menu dele virou aba. Este bloco guarda a remoção COMPLETA: botão que some do
   HTML mas continua sendo procurado no JS derruba a tela inteira. */
console.log('\n— o botão + saiu de todos os lugares —');

const html4 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const app4  = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const css4  = fs.readFileSync(path.join(__dirname, '..', 'estilo.css'), 'utf8');
const form4 = fs.readFileSync(path.join(__dirname, '..', 'formularios.js'), 'utf8');

eh('saiu do HTML', !/mais-btn|b-mais-acoes/.test(html4));
eh('o app não procura mais por ele (getElementById de nada = tela branca)',
  !/b-mais-acoes/.test(app4));
eh('o menu que ele abria saiu do código', !/B12\.menuMais/.test(form4));
eh('e o ajudante que só ele usava também', !/function acao\(id, titulo/.test(form4));
eh('o estilo saiu inteiro, inclusive das telas largas', !/mais-btn/.test(css4));
eh('as chaves do CSS continuam equilibradas',
  (css4.match(/\{/g) || []).length === (css4.match(/\}/g) || []).length);

eh('o Assistente volta para o canto de baixo',
  /\.ia-bolha-flut\{position:fixed;right:12px;bottom:calc\(84px/.test(css4));

console.log('\n— e nada ficou sem caminho —');
const adm4 = fs.readFileSync(path.join(__dirname, '..', 'adm.js'), 'utf8');
eh('entrada de dinheiro: Financeiro → Lançamentos',
  /B12\.formLancamento\('entrada'/.test(adm4));
eh('saída de dinheiro: Financeiro → Lançamentos',
  /B12\.formLancamento\('saida'/.test(adm4));
eh('manutenção: Estação B12 → Manutenção', /B12\.formManutencao\(/.test(adm4));
eh('carro entrando: Cadastro → Estacionamento', /\+ Carro entrando/.test(adm4));
eh('cliente chegou: Cadastro → Náutico é o próprio formulário',
  /B12\.formBalcao\(function \(res\)/.test(adm4));
eh('cadastrar cliente: Cadastro → Clientes', /\+ Cadastrar cliente/.test(adm4));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
