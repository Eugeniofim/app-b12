/* ============================================================================
   O BOTÃO DAS ONDAS NA TELA INICIAL

   12/11/2026, pedido do Eugênio. "Ver as ondas para o surf" só existia dentro
   de Previsão, e quem surfa não abre "previsão do fim de semana" para procurar
   swell. Agora a tela inicial também leva lá.

   O que isso quebrou e este teste segura: a tela de ondas passou a ter DUAS
   portas de entrada, e a seta "Voltar" dela era fixa em `previsao`. Quem
   entrasse pela tela inicial voltaria para uma tela onde nunca esteve.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}

const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const appjs = fs.readFileSync(path.join(raiz, 'app.js'), 'utf8');

/* recorta uma <section class="tela"> inteira pelo id */
function tela(id) {
  const i = html.indexOf('id="t-' + id + '"');
  if (i < 0) throw new Error('não achei a tela ' + id);
  const comeco = html.lastIndexOf('<section', i);
  const fim = html.indexOf('</section>', i);
  return html.slice(comeco, fim);
}

console.log('\n— o botão está na tela inicial —');

const inicio = tela('inicio');
eh('a tela inicial leva para as ondas',
  /data-ir="ondas"/.test(inicio));
eh('e está escrito o que a pessoa procura',
  /Ver as ondas para o surf/.test(inicio));
eh('é botão de verdade, não texto solto',
  /<button[^>]*data-ir="ondas"/.test(inicio));
eh('fica logo depois do cartão do clima, onde já estão Mar e Vento',
  inicio.indexOf('id="cl-vento"') < inicio.indexOf('data-ir="ondas"') &&
  inicio.indexOf('data-ir="ondas"') < inicio.indexOf('id="zap-inicio"'));

eh('a porta antiga continua existindo: Previsão também leva lá',
  /data-ir="ondas"/.test(tela('previsao')),
  'a tela de Previsão perdeu o botão');

eh('a tela de ondas existe mesmo',
  /id="t-ondas"/.test(html));
eh('"ondas" é uma rota conhecida do app',
  /'ondas'/.test(appjs.slice(0, appjs.indexOf('B12.ir ='))));

/* ---------------------------------------------- a seta de voltar, medida */
console.log('\n— a seta Voltar leva de volta para onde a pessoa estava —');

const B12 = {};
new Function('B12', appjs.slice(appjs.indexOf('var VOLTA_DE'),
  appjs.indexOf('};', appjs.indexOf('B12.voltaDe =')) + 2))(B12);

eh('existe a função que decide',
  typeof B12.voltaDe === 'function');

eh('veio da tela inicial → volta para a tela inicial',
  B12.voltaDe('ondas', 'inicio') === 'inicio',
  String(B12.voltaDe('ondas', 'inicio')));

eh('veio da Previsão → volta para a Previsão',
  B12.voltaDe('ondas', 'previsao') === 'previsao',
  String(B12.voltaDe('ondas', 'previsao')));

eh('veio de um lugar que não é porta → cai na Previsão, não em lugar nenhum',
  B12.voltaDe('ondas', 'passeios') === 'previsao',
  String(B12.voltaDe('ondas', 'passeios')));

eh('tela de uma porta só não mexe na seta fixa do HTML',
  B12.voltaDe('promocoes', 'inicio') === null,
  String(B12.voltaDe('promocoes', 'inicio')));

eh('o roteador usa a função em vez de repetir a conta',
  /var volta = B12\.voltaDe\(nome, anterior\)/.test(appjs));

eh('e guarda de onde veio antes de trocar de tela',
  /anterior = atual;\s*\n\s*atual = nome;/.test(appjs));

/* a seta do HTML precisa existir e ser achável pelo seletor que o app usa */
const ondas = tela('ondas');
eh('a seta da tela de ondas é achável pelo seletor do app',
  /<div class="topo-tela"><button class="volta" data-ir="[a-z]+"/.test(ondas),
  'o seletor .topo-tela .volta[data-ir] não acha nada');

/* O trecho do botão + saiu daqui em 12/11/2026: o Eugênio mandou eliminar o
   botão, e a cobertura da REMOÇÃO dele está em testes/painel.test.js. O
   ajudante abaixo veio de lá e continua servindo à conferência do clima. */
const css = fs.readFileSync(path.join(raiz, 'estilo.css'), 'utf8');
function regra(seletor) {
  const i = css.indexOf(seletor + '{');
  if (i < 0) throw new Error('não achei a regra ' + seletor);
  return css.slice(i, css.indexOf('}', i));
}

/* ------------------------------------------- a frase do botao do clima */
console.log('\n— o botão do clima cabe na caixa —');

eh('a frase é a que o Eugênio pediu',
  /Ver previsão do tempo na Ilha do Mel/.test(inicio));
eh('sem quebra forçada: com <br> o texto caía em 6 linhas',
  !/Ver previsão<br>do tempo/.test(inicio));
eh('e a caixa foi alargada para caber em 3 linhas',
  /max-width:104px/.test(regra('.clima .ver')),
  'com 92px a frase ocupa 5 linhas (98px de alto)');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
