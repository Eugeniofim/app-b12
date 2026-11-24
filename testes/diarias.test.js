/* ============================================================================
   QUANTAS DIÁRIAS O CARRO DEVE

   24/11/2026, e é dinheiro saindo:

     "multiplicar pelos dias e não diárias, seria referente ao dia da chegada
      e partida... por exemplo chegou dia 25 e voltou dia 27 — então são 3
      diárias."

   O app contava a DIFERENÇA entre as datas: 27 − 25 = 2. Mas o carro ocupou
   a vaga no 25, no 26 e no 27. São três dias de pátio.

   O erro custava UMA DIÁRIA EM CADA CARRO. Com 10 carros por dia a R$ 50,
   eram R$ 500 por dia saindo de graça — e ninguém reclamaria, porque o
   cliente só vê o número final.

   Três lugares contavam, e os três precisavam mudar junto, senão a tela do
   balcão diria 3 e a saída do carro cobraria 2.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const nucleo = fs.readFileSync(path.join(raiz, 'nucleo.js'), 'utf8');
const acesso = fs.readFileSync(path.join(raiz, 'acesso.js'), 'utf8');

function pega(nome, assinatura) {
  const i = nucleo.indexOf(nome);
  return new Function('B12', 'return ' + nucleo.slice(
    nucleo.indexOf(assinatura, i), nucleo.indexOf('\n};', i) + 2));
}

console.log('\n— B12.diarias: a conta da reserva —');
const diarias = pega('B12.diarias = function', 'function (ida, volta)')();
eh('25 → 27 são 3 diárias, não 2', diarias('2026-11-25', '2026-11-27') === 3,
  'é o exemplo dele, com as palavras dele');
eh('entrou e saiu no mesmo dia é 1', diarias('2026-11-25', '2026-11-25') === 1);
eh('uma noite são 2', diarias('2026-11-25', '2026-11-26') === 2);
eh('o mês inteiro são 30, não 29', diarias('2026-11-01', '2026-11-30') === 30);
eh('sem data de volta não inventa número', diarias('2026-11-25', '') === 1);
eh('e a virada do mês conta certo', diarias('2026-11-29', '2026-12-02') === 4);
eh('a virada do ano também', diarias('2026-12-30', '2027-01-02') === 4);

console.log('\n— B12.diariasDe: a conta que cobra na saída do pátio —');
const B12 = {
  DB: { ajustes: { patio: { regra: 'dia', tolerancia: 60 } } },
  instante: (d, h) => d + 'T' + (h || '12:00') + ':00.000Z',
  horaBR: () => '12:00'
};
const diariasDe = pega('B12.diariasDe = function', 'function (reg, ate)')(B12);
eh('entrou 25, saiu 27 → 3', diariasDe({ entrada: '2026-11-25' }, '2026-11-27') === 3,
  'se esta não mudasse junto, a tela diria 3 e a saída cobraria 2');
eh('mesmo dia → 1', diariasDe({ entrada: '2026-11-25' }, '2026-11-25') === 1);
eh('nunca devolve 0', diariasDe({ entrada: '2026-11-27' }, '2026-11-25') >= 1,
  'data invertida não pode virar carro de graça');

console.log('\n— a regra de 24 horas NÃO muda —');
B12.DB.ajustes.patio.regra = '24h';
eh('24 h é tempo corrido, e aí 25→27 são 2 blocos de 24 h',
  diariasDe({ entrada: '2026-11-25', entradaEm: '2026-11-25T12:00:00.000Z' },
            '2026-11-27T12:00:00.000Z') === 2,
  'as duas regras contam coisas diferentes DE PROPÓSITO: uma é dia de calendário, a outra é relógio');
B12.DB.ajustes.patio.regra = 'dia';

console.log('\n— a tela precisa dizer a mesma coisa que a conta —');
eh('o exemplo nos Ajustes foi corrigido',
  /entrou dia 25, saiu dia 27 = 3 diárias/.test(acesso),
  'o rótulo antigo ensinava 2 e o app cobraria 3: pior que nenhum exemplo');
eh('e o balcão usa a mesma função do pátio',
  /return B12\.diariasDe\(falso, B12\.instante\(volta, horaVolta \|\| hora \|\| '12:00'\)\);/.test(nucleo),
  'duas contas separadas é como a tela e a cobrança passam a discordar');

console.log('\n— o valor do carro —');
const valorPatio = pega('B12.valorPatio = function', 'function (reg, ate)')(
  Object.assign({}, B12, { diariasDe: (r, a) => diariasDe(r, a) }));
eh('3 diárias de R$ 50 dão R$ 150',
  valorPatio({ entrada: '2026-11-25', diaria: 50 }, '2026-11-27').total === 150);
eh('e o combinado continua ganhando da diária',
  valorPatio({ entrada: '2026-11-25', diaria: 50, combinado: 100 }, '2026-11-27').total === 100,
  'o preço combinado na hora vale pela estadia toda, não por dia');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
