/* ============================================================================
   "A DEFINIR" — A VOLTA E O PAGAMENTO

   24/11/2026, manhã da entrega. O Eugênio, olhando os campos vazios:
   "deixar opção a definir" e "deixar a forma de pagamento A DEFINIR tb".

   Os dois têm a mesma raiz: na B12 o cliente PAGA NA SAÍDA e muitas vezes
   ainda não sabe o dia da volta. Sem uma opção com nome:

   · o campo de volta vazio podia ser "ainda não sei" ou "esqueci de
     preencher", e quem atende não sabia o que fazer;
   · a forma de pagamento vinha marcada como Pix por ser o primeiro da lista,
     e o relatório "Como as pessoas pagaram" virava invenção.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const form = fs.readFileSync(path.join(raiz, 'formularios.js'), 'utf8');
const nucleo = fs.readFileSync(path.join(raiz, 'nucleo.js'), 'utf8');
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');

/* a lista de pagamentos, lida do arquivo */
const PAG = new Function(form.slice(form.indexOf('var PAGAMENTOS = ['),
  form.indexOf('];', form.indexOf('var PAGAMENTOS = [')) + 2) + ' return PAGAMENTOS;')();

console.log('\n— a forma de pagamento —');
eh('"A definir" está na lista', PAG.some(p => p[0] === 'adefinir'));
eh('com esse nome exato', (PAG.filter(p => p[0] === 'adefinir')[0] || [])[1] === 'A definir');
eh('fica por último, depois das formas de verdade',
  PAG[PAG.length - 1][0] === 'adefinir',
  PAG.map(p => p[0]).join(' · '));
eh('as cinco formas antigas continuam',
  ['pix', 'dinheiro', 'credito', 'debito', 'transferencia'].every(k => PAG.some(p => p[0] === k)));
eh('nenhuma chave repetida', new Set(PAG.map(p => p[0])).size === PAG.length);

console.log('\n— o dinheiro continua contando certo —');
const B12 = { DB: { ajustes: { taxas: { credito: 0.0399, debito: 0.0199 }, descDinheiro: 0.05 } } };
eh('"a definir" não ganha desconto de dinheiro',
  !/o\.pg === 'adefinir'/.test(nucleo) && /o\.pg === 'dinheiro'/.test(nucleo),
  'o desconto só pode olhar dinheiro');
eh('e taxa desconhecida vale zero, não quebra',
  (B12.DB.ajustes.taxas['adefinir'] || 0) === 0);

console.log('\n— a tela escreve nome, não chave —');
const pgNome = new Function('return ' + nucleo.slice(nucleo.indexOf('function (k) {',
  nucleo.indexOf('B12.pgNome')), nucleo.indexOf('};', nucleo.indexOf('B12.pgNome')) + 1))();
eh('"adefinir" vira "A definir"', pgNome('adefinir') === 'A definir');
eh('"credito" vira "Cartão de crédito" (antes saía cru)',
  pgNome('credito') === 'Cartão de crédito');
eh('"transferencia" ganha acento', pgNome('transferencia') === 'Transferência');
eh('chave desconhecida não vira vazio', pgNome('xyz') === 'xyz');
eh('e sem chave nenhuma mostra um traço', pgNome('') === '—');
eh('o relatório "Como as pessoas pagaram" usa o nome',
  /linhaBarra\(B12\.pgNome\(k\)/.test(adm));
eh('a tabela da maquininha também', /<td>' \+ B12\.pgNome\(f\.pg\)/.test(adm));

console.log('\n— a volta a definir —');
eh('a caixinha existe no balcão',
  /marca\('A volta fica a definir', 'voltaADefinir', false/.test(form));
eh('e na tela de corrigir', /marca\('A volta fica a definir', 'voltaADefinir', !r\.volta/.test(form));
eh('marcar apaga e tranca os dois campos',
  /c\.disabled = on;\s*if \(on\) c\.value = '';/.test(form),
  'dois jeitos de dizer a mesma coisa na tela gera dado contraditório');
eh('digitar uma data desmarca a caixinha',
  /if \(c\.value && aDef\.checked\) \{ aDef\.checked = false; aplicaDef\(\); \}/.test(form));
eh('a ajuda avisa que ela CONTINUA na lista de quem precisa marcar',
  /continua na lista de ' \+\s*'quem precisa marcar a volta/.test(form),
  'a pessoa ainda precisa voltar: "a definir" dá nome, não silencia o aviso');

console.log('\n— o aviso do carro muda de tom, mas não some —');
eh('quando é escolha, o recado explica em vez de cobrar',
  /Volta <b>a definir<\/b>: a estadia do carro vai ser contada na saída/.test(form));
eh('quando é esquecimento, continua cobrando',
  /falta a <b>data da volta<\/b>/.test(form));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
