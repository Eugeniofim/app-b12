/* ============================================================================
   VALENDO NÃO VOLTA ATRÁS

   16/11/2026, achado na tela do Eugênio e confirmado no banco.

   Ele apertou "Começar a usar valendo" na sexta. Hoje o app dele dizia de novo
   "modo demonstração", com 219 lançamentos e 46 reservas de mentira. No banco:

       demo = true        demoSaiuEm = NULL        gravado hoje 12:02

   A causa: `ajustes` desce da nuvem SUBSTITUINDO TUDO, e o modo demonstração
   mora dentro de `ajustes`. Aparelho novo nasce em demonstração; na primeira
   sincronia ele apagou o "valendo" de quem já era de verdade.

   Com o Dhalsin instalando em celular, iPad e laptop na quarta, isso jogaria a
   empresa inteira de volta para número inventado — no Caixa e no Painel, na
   frente dele. Daí a regra: começar a valer é decisão do dono e é de MÃO ÚNICA.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const sinc = fs.readFileSync(path.join(raiz, 'sincronia.js'), 'utf8');

/* recorta `aplicarLinha` e roda com um mundo de mentira */
function monta(ajustesLocais) {
  const i = sinc.indexOf('  function aplicarLinha(col, l) {');
  let n = 0, j = sinc.indexOf('{', i);
  let fim = -1;
  for (let k = j; k < sinc.length; k++) {
    if (sinc[k] === '{') n++;
    else if (sinc[k] === '}') { n--; if (!n) { fim = k + 1; break; } }
  }
  const corpo = sinc.slice(i, fim);
  const estado = { SOMBRA: {}, FILA: [], ENVIADOS: {}, limpou: 0 };
  const B12 = {
    DB: { ajustes: Object.assign({}, ajustesLocais) },
    sairDaDemo: function () { estado.limpou++; }
  };
  const fn = new Function('B12', 'SOMBRA', 'FILA', 'ENVIADOS', 'semPin', 'papelNuvem',
    corpo + '\n return aplicarLinha;')(
      B12, estado.SOMBRA, estado.FILA, estado.ENVIADOS,
      (a) => { const c = {}; Object.keys(a || {}).forEach(k => { if (k !== 'pins') c[k] = a[k]; }); return c; },
      () => 'dono');
  return { aplicar: fn, B12, estado };
}

console.log('\n— o caso que aconteceu de verdade —');
let m = monta({ demo: false, demoSaiuEm: '2026-11-13T18:00:00Z', diaria: 50 });
m.aplicar('ajustes', { dados: { demo: true, diaria: 50 } });
eh('aparelho novo em demonstração NÃO derruba quem já vale',
  m.B12.DB.ajustes.demo === false, String(m.B12.DB.ajustes.demo));
eh('e a data de quando começou a valer é preservada',
  m.B12.DB.ajustes.demoSaiuEm === '2026-11-13T18:00:00Z', m.B12.DB.ajustes.demoSaiuEm);
eh('não manda limpar nada: aqui já estava limpo', m.estado.limpou === 0);
eh('a sombra fica com o que CHEGOU, para subir o conserto por cima',
  m.estado.SOMBRA.__ajustes === JSON.stringify({ demo: true, diaria: 50 }),
  m.estado.SOMBRA.__ajustes);

console.log('\n— o contrário: o aparelho novo aprende que já vale —');
m = monta({ demo: true, diaria: 50 });
m.aplicar('ajustes', { dados: { demo: false, demoSaiuEm: '2026-11-13T18:00:00Z', diaria: 50 } });
eh('o aparelho em demonstração passa a valer', m.B12.DB.ajustes.demo === false);
eh('e LIMPA os registros de mentira dele na hora', m.estado.limpou === 1,
  m.estado.limpou + ' limpeza(s)');
eh('herdando a data de quando a empresa começou a valer',
  m.B12.DB.ajustes.demoSaiuEm === '2026-11-13T18:00:00Z');

console.log('\n— os dois ainda em demonstração: nada muda —');
m = monta({ demo: true, diaria: 50 });
m.aplicar('ajustes', { dados: { demo: true, diaria: 60 } });
eh('continua em demonstração', m.B12.DB.ajustes.demo === true);
eh('não limpa nada', m.estado.limpou === 0);
eh('e o resto dos ajustes desce normal', m.B12.DB.ajustes.diaria === 60);

console.log('\n— os dois já valendo: segue a vida —');
m = monta({ demo: false, demoSaiuEm: '2026-11-13T18:00:00Z', diaria: 50 });
m.aplicar('ajustes', { dados: { demo: false, demoSaiuEm: '2026-11-13T18:00:00Z', diaria: 70 } });
eh('continua valendo', m.B12.DB.ajustes.demo === false);
eh('não limpa de novo', m.estado.limpou === 0);
eh('e o preço novo chega', m.B12.DB.ajustes.diaria === 70);

console.log('\n— o resto dos ajustes não foi atrapalhado —');
m = monta({ demo: false, demoSaiuEm: '2026-11-13T18:00:00Z', diaria: 50, metaMensal: 1000 });
m.aplicar('ajustes', { dados: { demo: true, diaria: 55, metaMensal: 2000, regular: 60 } });
eh('a diária nova chega', m.B12.DB.ajustes.diaria === 55);
eh('a meta nova chega', m.B12.DB.ajustes.metaMensal === 2000);
eh('campo novo chega', m.B12.DB.ajustes.regular === 60);
eh('só o "valendo" é que não anda para trás', m.B12.DB.ajustes.demo === false);

console.log('\n— e o PIN continua fora da nuvem —');
m = monta({ demo: false, diaria: 50 });
m.aplicar('ajustes', { dados: { demo: false, diaria: 50, pins: { dono: '9999' } } });
eh('PIN que chega do banco não entra nos ajustes',
  m.B12.DB.ajustes.pins === undefined, JSON.stringify(m.B12.DB.ajustes.pins));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
