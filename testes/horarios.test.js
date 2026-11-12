/* ============================================================================
   HORÁRIO NENHUM É DE FÁBRICA

   12/11/2026, regra do Eugênio: "não deixar horários prontos... horários
   sempre editáveis". A tela de montar o dia mostrava uma grade vinda do
   código: dava para ligar, desligar e acrescentar — mas não para MUDAR nem
   TIRAR nenhum horário. Quem monta o dia ficava preso à grade de alguém.

   A única exceção, e ela é de propósito: horário que JÁ TEM PASSAGEIRO não se
   edita nem se apaga. Mudar esse é furar a viagem de quem já comprou.
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
const css = fs.readFileSync(path.join(raiz, 'estilo.css'), 'utf8');
const nucleo = fs.readFileSync(path.join(raiz, 'nucleo.js'), 'utf8');

/* recorta só o montador de chip e roda, para ver o HTML que sai */
const i = form.indexOf('  function chip(sentido, h, ligado, presa) {');
const fim = form.indexOf('\n  }', i) + 4;
const chip = new Function(form.slice(i, fim) + ' return chip;')();

console.log('\n— cada horário traz o ✎ e o × —');
const livre = chip('ida', '08:30', true, false);
eh('o horário aparece', /08:30/.test(livre));
eh('tem botão de mudar a hora', /data-edita/.test(livre));
eh('tem botão de tirar da lista', /data-tira/.test(livre));
eh('vem ligado quando já está no dia', /class="hchip on/.test(livre));
eh('os três andam juntos numa pastilha só', /class="hgrupo/.test(livre));
eh('o leitor de tela sabe o que cada botão faz',
  /aria-label="Mudar o horário de 08:30"/.test(livre) &&
  /aria-label="Tirar o horário de 08:30"/.test(livre));

const desligado = chip('volta', '16:00', false, false);
eh('horário sugerido e ainda não escolhido vem desligado',
  !/class="hchip on/.test(desligado));

console.log('\n— quem já tem passageiro fica trancado —');
const presa = chip('ida', '10:00', true, true);
eh('não dá para mudar a hora', !/data-edita/.test(presa));
eh('não dá para tirar da lista', !/data-tira/.test(presa));
eh('o botão fica desabilitado de verdade', /disabled/.test(presa));
eh('e a tela diz por quê', /·com gente/.test(presa));

console.log('\n— o comportamento está ligado na tela —');
eh('o ✎ abre um campo de hora de verdade',
  /ed\.type = 'time'/.test(form));
eh('Enter confirma e Escape desiste',
  /ev\.key === 'Enter'/.test(form) && /ev\.key === 'Escape'/.test(form));
eh('não deixa criar dois horários iguais',
  /Já existe um horário de/.test(form));
eh('depois de editar, a lista se reordena',
  /function ordenar\(\)/.test(form) && /ordenar\(\); sincronizar\(\);/.test(form));
eh('o × tira o horário e recalcula o que vai ser salvo',
  /bX\.onclick = function \(\) \{ g\.remove\(\); sincronizar\(\); \}/.test(form));
eh('quem acrescenta um horário usa o MESMO montador',
  /tmp\.innerHTML = chip\(sentido, h, true, false\)/.test(form));
eh('e o horário novo já nasce com ✎ e ×',
  /caixa\.appendChild\(g\); ligarGrupo\(g\); ordenar\(\)/.test(form));

console.log('\n— a tela explica, em português —');
eh('diz o que cada coisa faz',
  /muda a hora · <b>×<\/b> tira da lista/.test(form));

console.log('\n— a grade do código é só sugestão —');
eh('a grade do dono manda, e a do código é o último recurso',
  /B12\.DB\.ajustes\.grade \|\| B12\.GRADE_PADRAO/.test(nucleo));
eh('salvar exige pelo menos um horário, mas não impõe quais',
  /Marque pelo menos um horário de ida ou de volta/.test(form));

console.log('\n— o dedo alcança os botõezinhos —');
eh('✎ e × têm 44px de altura',
  /\.hmini\{[^}]*min-height:44px/.test(css.replace(/\n/g, '')));
eh('e ficam mais largos no celular',
  /@media \(pointer:coarse\)\{ \.hmini\{width:38px\} \}/.test(css));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
