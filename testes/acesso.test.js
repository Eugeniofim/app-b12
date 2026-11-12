/* ============================================================================
   RECUPERAR O PIN — a porta dos fundos do app.
   Um jeito de entrar sem o PIN é, por definição, um jeito de entrar sem o
   PIN. Estas verificações existem para que ninguém afrouxe isso depois sem
   perceber: a conta da nuvem é quem diz quem a pessoa é, e o PAPEL vem do
   banco, nunca da tela.
   ========================================================================== */
'use strict';
const fs = require('fs'), p = require('path');
const src = fs.readFileSync(p.join(__dirname, '..', 'acesso.js'), 'utf8');
/* Comentário não é código. Sem tirar, a verificação "o PIN atual nunca é
   mostrado" casa com o comentário que diz justamente para nunca mostrar o
   PIN atual — e o teste reprova o acerto. Armadilha paga em 12/11/2026. */
const codigo = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
let ok = 0, falhou = 0;
function eh(nome, cond, porque) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (porque ? '\n         → ' + porque : '')); }
}

console.log('\n— a porta existe —');
eh('tem o link "Esqueci meu PIN"', /portao-esqueci/.test(src));
eh('a recuperação passa pela conta da nuvem', /B12\.nuvEntrar\(/.test(src));

console.log('\n— e ela não é frouxa —');
eh('sem nuvem configurada, não recupera',
   /if \(!B12\.NUVEM \|\| !B12\.NUVEM\.url\)[\s\S]{0,320}?Fale com quem instalou/.test(src),
   'aparelho sem nuvem não tem como conferir quem é a pessoa');
eh('conta que não é do dono NÃO abre a área do dono',
   /papelMinimo === 'dono' && quem\.papel !== 'dono'/.test(src),
   'quem decide o papel é o banco (nuvPapel), não a tela');
eh('o PIN atual nunca é mostrado nem enviado',
   !/PIN atual|seu PIN é|pins\(\)\.dono *\+/.test(codigo));
eh('a sessão só é aberta DEPOIS de guardar o PIN novo',
   src.indexOf('B12.DB.ajustes.pins =') < src.lastIndexOf("B12.entrar(papel)"),
   'entrar antes de gravar deixaria a porta aberta com o PIN velho');
eh('as tentativas erradas continuam travando',
   /registraErro\(\)/.test(src) && /MAX_ERROS/.test(src));
eh('acertar limpa o contador de erro', /limpaErros\(\)/.test(src));

console.log('\n— o PIN novo —');
const re = /\/\^\[0-9\]\{(\d),(\d)\}\$\//.exec(src);
eh('exige de 4 a 6 números', !!re && re[1] === '4' && re[2] === '6');
if (re) {
  const regra = new RegExp('^[0-9]{' + re[1] + ',' + re[2] + '}$');
  eh('"123" é curto demais', regra.test('123') === false);
  eh('"1234" serve', regra.test('1234') === true);
  eh('"123456" serve', regra.test('123456') === true);
  eh('"1234567" é longo demais', regra.test('1234567') === false);
  eh('"12a4" não serve', regra.test('12a4') === false);
  eh('vazio não serve', regra.test('') === false);
}
eh('pede o PIN duas vezes', /np-1/.test(src) && /np-2/.test(src),
   'digitar errado uma vez só trancaria a porta do dono');
eh('não bateu, não grava', /não bateram/.test(src));

console.log('\n— trocar um PIN não apaga o outro —');
eh('guarda o PIN da outra pessoa junto',
   /\{ dono: a, equipe: outro\.equipe \}/.test(src) &&
   /\{ dono: outro\.dono, equipe: a \}/.test(src),
   'gravar só {dono:a} apagaria o PIN da equipe');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
