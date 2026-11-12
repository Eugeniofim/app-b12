/* ============================================================================
   A SOMA DO BALCÃO: IDA + VOLTA + ESTACIONAMENTO

   12/11/2026, achado pelo Eugênio na tela. O balcão mandava `diarias: 0` para
   B12.preco — fixo, no código. Resultado: a pessoa deixava o carro três dias,
   a tela mostrava só a travessia, e o estacionamento saía de graça da conta.

   A contagem usa B12.diariasDe, a MESMA do pátio, e não uma subtração de datas
   própria: se o pátio estiver na regra "24 horas" com tolerância, o balcão tem
   de dizer o mesmo número que a saída vai cobrar. Duas contas diferentes para
   o mesmo carro é briga no balcão.
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
const form = fs.readFileSync(path.join(raiz, 'formularios.js'), 'utf8');

/* ---------------------------------------------- um mundo de mentira mínimo */
function monta(ajustes) {
  const B12 = { DB: { ajustes: Object.assign({
    diaria: 50, regular: 60, descDinheiro: 0.05,
    patio: { regra: 'dia', tolerancia: 60 },
    tabela: { dia:   { de:'08h30', ate:'18h00', fixo:180, pessoa:50 },
              tarde: { de:'18h00', ate:'20h00', fixo:260, pessoa:70 },
              noite: { de:'20h00', ate:'22h00', fixo:310, pessoa:85 } }
  }, ajustes || {}) } };
  B12.instante = (d, h) => d + 'T' + (h || '12:00') + ':00';
  B12.horaBR = (iso) => iso ? iso.slice(11, 16) : '';
  function recorta(nome) {
    const i = nucleo.indexOf('B12.' + nome + ' = function');
    if (i < 0) throw new Error('não achei ' + nome);
    let n = 0; const j = nucleo.indexOf('{', i);
    for (let k = j; k < nucleo.length; k++) {
      if (nucleo[k] === '{') n++;
      else if (nucleo[k] === '}') { n--; if (!n) return nucleo.slice(i, k + 2); }
    }
    throw new Error('não fechou ' + nome);
  }
  new Function('B12', recorta('diariasDe') + recorta('diariasBalcao') + recorta('preco'))(B12);
  return B12;
}

console.log('\n— as diárias saem da mesma régua do pátio —');
const B = monta();
eh('12/11 19:32 até 15/11 = 3 diárias',
  B.diariasBalcao('2026-11-12', '19:32', '2026-11-15', '') === 3,
  String(B.diariasBalcao('2026-11-12', '19:32', '2026-11-15', '')));
eh('ida e volta no mesmo dia = 1 diária, nunca zero',
  B.diariasBalcao('2026-11-12', '08:00', '2026-11-12', '18:00') === 1);
eh('uma noite = 1 diária',
  B.diariasBalcao('2026-11-12', '19:32', '2026-11-13', '') === 1);
eh('sem data de volta não inventa diária',
  B.diariasBalcao('2026-11-12', '19:32', '', '') === 0);
eh('volta antes da ida não vira diária negativa',
  B.diariasBalcao('2026-11-15', '10:00', '2026-11-12', '') === 0);
eh('sem data de ida também não',
  B.diariasBalcao('', '10:00', '2026-11-15', '') === 0);

console.log('\n— a regra de 24 horas é respeitada, e não uma conta própria —');
const B24 = monta({ patio: { regra: '24h', tolerancia: 60 } });
eh('24h: 12/11 19:32 → 15/11 19:00 = 3 diárias',
  B24.diariasBalcao('2026-11-12', '19:32', '2026-11-15', '19:00') === 3,
  String(B24.diariasBalcao('2026-11-12', '19:32', '2026-11-15', '19:00')));
eh('24h: a tolerância de 60 min segura a virada',
  B24.diariasBalcao('2026-11-12', '19:32', '2026-11-13', '20:00') === 1,
  String(B24.diariasBalcao('2026-11-12', '19:32', '2026-11-13', '20:00')));
eh('24h: passou da tolerância, vira a diária',
  B24.diariasBalcao('2026-11-12', '19:32', '2026-11-13', '21:00') === 2,
  String(B24.diariasBalcao('2026-11-12', '19:32', '2026-11-13', '21:00')));

console.log('\n— a soma do caso que o Eugênio tinha na tela —');
const d = B.diariasBalcao('2026-11-12', '19:32', '2026-11-15', '');
const p = B.preco({ produto: 'regular', pax: 3, pagantes: 3, faixa: 'tarde', diarias: d, pg: 'pix' });
eh('a ida custa 3 × R$ 60 = R$ 180', p.travessia / p.trechos === 180, String(p.travessia / p.trechos));
eh('são dois trechos: ida e volta', p.trechos === 2);
eh('a travessia soma R$ 360', p.travessia === 360, String(p.travessia));
eh('o estacionamento soma 3 × R$ 50 = R$ 150', p.estacionamento === 150, String(p.estacionamento));
eh('o total é R$ 510, e não R$ 360', p.travessia + p.estacionamento === 510,
  String(p.travessia + p.estacionamento));

console.log('\n— sem carro não existe estadia —');
const semCarro = B.preco({ produto: 'regular', pax: 3, pagantes: 3, faixa: 'dia', diarias: 0, pg: 'pix' });
eh('nenhuma diária entra quando não há placa', semCarro.estacionamento === 0);
eh('e a travessia continua inteira', semCarro.travessia === 360);

console.log('\n— a tela do balcão usa isso de verdade —');
eh('o balcão não manda mais "diarias: 0" fixo',
  !/diarias: 0, pg: form\.querySelector/.test(form),
  'voltou o zero no código');
eh('o balcão conta as diárias pela função do pátio',
  /B12\.diariasBalcao\(ida, hora\.value, volta, horaV\)/.test(form));
eh('só conta quando existe placa',
  /var diarias = placa \? B12\.diariasBalcao/.test(form));
eh('mudar a data da volta recalcula a tela',
  /\[name=volta\],\[name=horaVolta\],\[name=placa\]/.test(form));
eh('a conta aparece aberta, linha por linha',
  /id="conta-balcao"/.test(form) && /'Estacionamento · '/.test(form));
eh('a linha da ida e a da volta aparecem separadas',
  /'Ida · '/.test(form) && /'Volta · mesma tabela'/.test(form));
eh('carro sem data de volta é avisado, não somado como zero calado',
  /id="carro-sem-volta"/.test(form));
eh('o total da faixa verde inclui o estacionamento',
  /var total = travessia \+ cons\.total \+ estac;/.test(form));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
