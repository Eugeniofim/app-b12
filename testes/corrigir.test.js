/* ============================================================================
   CORRIGIR UM ATENDIMENTO

   12/11/2026. "Daí o Dhalsin precisa editar isso aí, às vezes, né?" — e o app
   NÃO TINHA ISSO. A ficha da reserva era retrato, com botão "Fechar". Nome
   trocado, data de volta mudada, placa errada: não havia conserto em lugar
   nenhum do app.

   O risco que estes testes guardam: um atendimento de balcão mora em QUATRO
   lugares (reserva, ficha do cliente, carro no pátio, lançamento no caixa).
   Corrigir só a reserva deixa os outros três mentindo — o pátio cobrando até
   a data velha e o Financeiro contando dinheiro que ninguém pagou.
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
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');

function recorta(fonte, nome) {
  const i = fonte.indexOf('B12.' + nome + ' = function');
  if (i < 0) throw new Error('não achei ' + nome);
  let n = 0; const j = fonte.indexOf('{', i);
  for (let k = j; k < fonte.length; k++) {
    if (fonte[k] === '{') n++;
    else if (fonte[k] === '}') { n--; if (!n) return fonte.slice(i, k + 2); }
  }
  throw new Error('não fechou ' + nome);
}

/* ------------------------------------------- um atendimento inteiro, falso */
function mundo() {
  const B12 = { DB: {
    ajustes: { diaria: 50, regular: 60, patio: { regra: 'dia', tolerancia: 60 } },
    reservas: [{ id: 'r1', cod: 'B12-9', nome: 'Eugênio Texeira Fim', zap: '41991566444',
      pax: 3, pagantes: 3, criancas: 0, ida: '2026-11-12', hora: '19:32',
      volta: '2026-11-15', horaVolta: '', placa: 'AXP67D8', destino: 'Brasília',
      pousada: '', pg: 'pix', total: 510, consumoTotal: 0, obs: '',
      clienteId: 'c1', patioId: 'v1', lancamentoId: 'l1', apagado: false }],
    clientes: [{ id: 'c1', nome: 'Eugênio Texeira Fim', whats: '41991566444', pousada: '' }],
    patio: [{ id: 'v1', placa: 'AXP67D8', entrada: '2026-11-12', entradaEm: '2026-11-12T19:32:00',
      saidaPrevista: '2026-11-15', saidaReal: null, diaria: 50, nome: 'Eugênio Texeira Fim' }],
    lancamentos: [{ id: 'l1', data: '2026-11-12', valor: 510, pg: 'pix', desc: 'antigo' }]
  }};
  let salvou = 0;
  B12.salvar = () => { salvou++; };
  B12.reservaPorId = (id) => B12.DB.reservas.filter(r => r.id === id)[0] || null;
  B12.instante = (d, h) => d + 'T' + (h || '12:00') + ':00';
  B12.horaBR = (iso) => iso ? iso.slice(11, 16) : '';
  new Function('B12', recorta(nucleo, 'diariasDe') + recorta(nucleo, 'diariasBalcao') +
                      recorta(nucleo, 'editarReserva'))(B12);
  B12.salvou = () => salvou;
  return B12;
}

console.log('\n— a correção anda nos quatro lugares —');
let B = mundo();
let r = B.editarReserva('r1', { volta: '2026-11-18' });
eh('aceitou a mudança', r.ok === true, r.erro);
eh('a reserva tem a volta nova', B.DB.reservas[0].volta === '2026-11-18');
eh('o CARRO no pátio também', B.DB.patio[0].saidaPrevista === '2026-11-18',
  B.DB.patio[0].saidaPrevista);
eh('e a estadia foi recontada: 12 → 18 = 6 diárias',
  B.DB.reservas[0].estacionamento === 6, String(B.DB.reservas[0].estacionamento));
eh('gravou no aparelho', B.salvou() === 1);
eh('e disse o que mudou', r.mudou.includes('volta'), JSON.stringify(r.mudou));

B = mundo();
B.editarReserva('r1', { nome: 'Eugênio Teixeira Fim', zap: '41999990000' });
eh('o nome novo chega na FICHA do cliente',
  B.DB.clientes[0].nome === 'Eugênio Teixeira Fim', B.DB.clientes[0].nome);
eh('o telefone novo também', B.DB.clientes[0].whats === '41999990000');
eh('e o nome no carro do pátio', B.DB.patio[0].nome === 'Eugênio Teixeira Fim');

B = mundo();
B.editarReserva('r1', { total: 420, pg: 'dinheiro' });
eh('o valor novo chega no LANÇAMENTO do caixa',
  B.DB.lancamentos[0].valor === 420, String(B.DB.lancamentos[0].valor));
eh('a forma de pagamento também', B.DB.lancamentos[0].pg === 'dinheiro');
eh('e a descrição do lançamento é refeita',
  /3 pagantes · 3 no veículo/.test(B.DB.lancamentos[0].desc), B.DB.lancamentos[0].desc);

B = mundo();
B.DB.reservas[0].consumoTotal = 60;
B.editarReserva('r1', { total: 500 });
eh('o consumo não vira travessia no caixa: 500 − 60 = 440',
  B.DB.lancamentos[0].valor === 440, String(B.DB.lancamentos[0].valor));

B = mundo();
B.editarReserva('r1', { placa: 'abc1d23' });
eh('a placa sobe para maiúscula', B.DB.reservas[0].placa === 'ABC1D23');
eh('e troca no carro do pátio', B.DB.patio[0].placa === 'ABC1D23');

console.log('\n— o que a correção recusa —');
B = mundo();
eh('volta antes da ida é recusada',
  B.editarReserva('r1', { volta: '2026-11-10' }).erro != null);
eh('e nada foi alterado na recusa', B.DB.reservas[0].volta === '2026-11-15');
eh('nome vazio é recusado', B.editarReserva('r1', { nome: '   ' }).erro != null);
eh('valor negativo é recusado', B.editarReserva('r1', { total: -5 }).erro != null);
eh('reserva que não existe é recusada', B.editarReserva('nada', {}).erro != null);
B = mundo(); B.DB.reservas[0].apagado = true;
eh('reserva apagada não se edita', B.editarReserva('r1', { nome: 'X' }).erro != null);

console.log('\n— carro que já saiu não é mexido —');
B = mundo();
B.DB.patio[0].saidaReal = '2026-11-14';
B.editarReserva('r1', { volta: '2026-11-20' });
eh('o carro que já saiu mantém a saída prevista',
  B.DB.patio[0].saidaPrevista === '2026-11-15', B.DB.patio[0].saidaPrevista);

console.log('\n— pagantes nunca passam do número de pessoas —');
B = mundo();
B.editarReserva('r1', { pax: 2, pagantes: 7 });
eh('7 pagantes em 2 pessoas vira 2', B.DB.reservas[0].pagantes === 2,
  String(B.DB.reservas[0].pagantes));
eh('e as crianças são o que sobra', B.DB.reservas[0].criancas === 0);

console.log('\n— a tela existe e está ao alcance —');
eh('existe a tela de correção', /B12\.formEditarReserva = function/.test(form));
eh('ela salva pela função que cuida dos quatro lugares',
  /aoSalvar: function \(d\) \{ return B12\.editarReserva\(id, d\); \}/.test(form));
eh('a ficha da reserva ganhou o botão Corrigir', /id="fc-editar"/.test(form));
eh('e o botão abre a tela de correção',
  /B12\.formEditarReserva\(id, function/.test(form));
eh('a linha do atendimento no Cadastro abre a ficha',
  /data-abrir="' \+ r\.id \+ '"/.test(adm));
eh('e a linha avisa que dá para corrigir', /toque para corrigir/.test(adm));
eh('o botão do WhatsApp não abre a ficha junto',
  /ev\.stopPropagation\(\);\s*\/\* o WhatsApp/.test(adm));
eh('a tela diz que a correção mexe em mais lugares',
  /anda junto na ficha da ' \+\s*'pessoa, no carro do pátio e no caixa/.test(form));
eh('e mostra como achar atendimento de outro dia',
  /De outro dia\? Use a busca lá em cima/.test(adm));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
