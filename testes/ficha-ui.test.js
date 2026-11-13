/* ============================================================================
   A FICHA DO CLIENTE PRECISA PARECER UMA FICHA

   13/11/2026: "Tá meio feio e não muito UI e UX. Ajeita isso. A ficha do
   cliente tem que estar bem sinalizada ali que é ficha do cliente."

   Duas coisas estavam erradas:

   1. A ficha era um título de seção solto com campos avulsos embaixo. Nada
      dizia "isto é um documento". Agora é um CARTÃO com cabeçalho, ícone de
      ficha e um selo de estado.

   2. Em tela larga o painel inteiro escorre em COLUNA DE JORNAL
      (column-count 2 e 3). Coluna de jornal serve para texto que se lê
      escorrendo; um formulário se preenche numa ordem. A ficha estava sendo
      picada em três pedaços — o campo VOLTA no topo da coluna do meio — e a
      linha de um atendimento ficava com o nome numa coluna e a placa noutra.

   Medido no ar, em 1400px: cartão 548px na coluna 1, lista 798px na coluna 2,
   sem rolagem lateral.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'estilo.css'), 'utf8');
const umaLinha = css.replace(/\n/g, ' ');

console.log('\n— a ficha se apresenta como ficha —');
eh('existe o cartão da ficha', /class = 'ficha-cartao'|className = 'ficha-cartao'/.test(adm));
eh('com cabeçalho próprio', /class="ficha-topo"/.test(adm));
eh('escrito "Ficha do cliente"', /<b>Ficha do cliente<\/b>/.test(adm));
eh('com o ícone de documento', /class="ficha-ico"/.test(adm));
eh('e a legenda que lembra o bloquinho de papel',
  /Na mesma ordem da ficha de papel/.test(adm));
eh('tem um selo de estado', /class="ficha-selo">NOVA</.test(adm));
eh('o formulário fica DENTRO do cartão', /cartao\.appendChild\(caixa\)/.test(adm));
eh('não sobrou o título solto de antes', !/<h2>Cadastro do cliente<\/h2>/.test(adm));

console.log('\n— o cartão tem desenho, não só um retângulo —');
eh('tem borda e canto arredondado', /\.ficha-cartao\{[^}]*border-radius:16px/.test(umaLinha));
eh('o cabeçalho se separa do corpo por uma linha',
  /\.ficha-topo\{[^}]*border-bottom:1px solid/.test(umaLinha));
eh('o ícone tem fundo da marca', /\.ficha-ico\{[^}]*background:var\(--turq-700\)/.test(umaLinha));
eh('funciona no tema claro também', /body:not\(\.adm\) \.ficha-cartao\{/.test(css));
eh('o ícone alcança 38px (não é um pontinho)', /\.ficha-ico\{[^}]*width:38px/.test(umaLinha));

console.log('\n— a coluna de jornal não corta mais nada ao meio —');
['.pes', '.pessoas', '.conta', '.previa', '.horas', '.hgrupo', '.tabela'].forEach(function (sel) {
  eh('"' + sel + '" é indivisível',
    new RegExp('#adm-corpo \\' + sel + '[,{]').test(umaLinha.replace(/\s+/g, ' ')),
    'pode ser partido entre duas colunas');
});
eh('a ficha atravessa as colunas inteira',
  /#adm-corpo \.ficha-cartao\{column-span:all\}/.test(umaLinha.replace(/\s+/g, ' ')));

console.log('\n— o Cadastro ganha layout de formulário, não de jornal —');
eh('o painel marca qual aba está aberta', /raiz\.dataset\.aba = abaAtual/.test(adm));
eh('o Cadastro desliga a coluna de jornal',
  /#adm-corpo\[data-aba="balcao"\]\{column-count:auto/.test(umaLinha.replace(/\s+/g, ' ')));
eh('e vira duas colunas de verdade',
  /grid-template-columns:minmax\(0,560px\) minmax\(0,1fr\)/.test(umaLinha.replace(/\s+/g, ' ')));
eh('a ficha fica na primeira coluna',
  /\[data-aba="balcao"\] \.ficha-cartao\{grid-column:1/.test(umaLinha.replace(/\s+/g, ' ')));
eh('o resto vai para a segunda',
  /\[data-aba="balcao"\] > \*\{grid-column:2/.test(umaLinha.replace(/\s+/g, ' ')));

console.log('\n— e o CSS continua íntegro —');
eh('as chaves estão equilibradas',
  (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length);

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
