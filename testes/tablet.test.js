/* ============================================================================
   O TABLET

   24/11/2026, manhã da entrega: o Dhalsin instalou no tablet e "ficou tamanho
   menor". Medido num iPad de 820px: o app ocupava 560px com 130px de branco de
   cada lado, e SEM a moldura que o desktop ganha a partir de 900px. Uma coluna
   espremida no meio da tela, sem nada explicando o vazio.

   A causa é uma linha: `.app{max-width:560px}` vale em QUALQUER largura, e o
   painel só se solta a partir de 1100px. A faixa de 700 a 1099 — exatamente a
   do tablet — não tinha dono.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'estilo.css'), 'utf8');
const umaLinha = css.replace(/\s+/g, ' ');

console.log('\n— a faixa do tablet existe —');
eh('o painel se solta dos 560px no tablet',
  /@media \(min-width: 700px\) and \(max-width: 1099px\)\{[^}]*body\.adm \.app\{max-width:none\}/.test(umaLinha),
  'sem isto o painel fica numa coluna de 560 no meio do iPad');
eh('e a moldura do painel também',
  /body\.adm \.proto\{max-width:none\}/.test(umaLinha));
eh('o topo e as abas ganham respiro nas bordas',
  /body\.adm \.adm-topo\{padding-left:18px/.test(umaLinha));
eh('o lado do turista cresce no tablet em pé',
  /@media \(min-width: 700px\) and \(max-width: 899px\)\{ body:not\(\.adm\) \.app\{max-width:720px\}/.test(umaLinha),
  '560px num iPad de 820 deixa 130px de branco de cada lado');

console.log('\n— o que já funcionava não foi mexido —');
eh('o celular continua sem regra nova (a faixa começa em 700px)',
  /min-width: 700px/.test(css) && !/min-width: ?[0-6][0-9][0-9]px\) and \(max-width/.test(css));
eh('o desktop grande continua com 1180px',
  /@media \(min-width: 1100px\)\{ body\.adm \.app\{max-width:1180px\}/.test(umaLinha));
eh('e a moldura de telefone do turista continua a partir de 900px',
  /@media \(min-width: 900px\)\{ body:not\(\.adm\)\{background:radial-gradient/.test(umaLinha));

console.log('\n— o Cadastro em duas colunas cabe no tablet deitado —');
eh('o grid do Cadastro começa em 940px, não em 1100',
  /@media \(min-width: 940px\)\{ body\.adm #adm-corpo\[data-aba="balcao"\]\{column-count:auto;display:grid/.test(umaLinha),
  'em 1100 o iPad deitado (1024) ficaria sem as duas colunas');
eh('a ficha fica na primeira coluna',
  /\[data-aba="balcao"\] \.ficha-cartao\{grid-column:1/.test(umaLinha));
eh('e não sobrou o grid duplicado no bloco de 1100',
  (umaLinha.match(/\[data-aba="balcao"\]\{column-count:auto/g) || []).length === 1,
  'duas definições iguais em media queries diferentes brigam entre si');

console.log('\n— o CSS continua íntegro —');
eh('as chaves estão equilibradas',
  (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length);
eh('nenhuma faixa deixa buraco entre 700 e 1100',
  /max-width: 899px/.test(css) && /min-width: 900px/.test(css),
  'uma faixa terminando em 899 exige a seguinte começando em 900');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
