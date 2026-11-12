/* ============================================================================
   VISÃO GERAL — a conta que o painel do Dhalsin mostra.
   O painel é bonito e por isso é perigoso: número errado num gráfico bonito
   parece verdade. Este teste monta um mês inventado, com números que dá para
   conferir de cabeça, e exige que a conta bata.
   ========================================================================== */
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const fs = require('fs'), p = require('path');
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}

/* só as funções puras do nucleo.js, sem navegador */
const fonte = fs.readFileSync(p.join(__dirname, '..', 'nucleo.js'), 'utf8');
const corte = fonte.indexOf('VISÃO GERAL — o negócio inteiro');
if (corte < 0) { console.log('FALHOU: a visão geral sumiu do nucleo.js'); process.exit(1); }
const B12 = {
  hoje: () => '2026-11-12',
  mesAtual: () => '2026-11',
  MESNOME: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto',
            'Setembro','Outubro','Novembro','Dezembro'],
  diaMais: (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); },
  DB: null,
};
new Function('B12', fonte.slice(fonte.lastIndexOf('/* =====', corte)))(B12);

/* ---------------------------------------------------------- o mês inventado
   4 reservas, 3 saídas, 2 carros, 3 lançamentos. Tudo somável na mão. */
B12.DB = {
  clientes: [
    { id:'c1', nome:'Ana',   cidade:'Curitiba' },
    { id:'c2', nome:'Bruno', cidade:'Curitiba' },
    { id:'c3', nome:'Caio',  cidade:'Joinville' },
  ],
  reservas: [
    /* 01/11/2026 cai num domingo: 02 é SEGUNDA e 07 é SÁBADO */
    { ida:'2026-11-02', pax:4, criancas:1, destino:'Encantadas', pousada:'Pousada Mar', clienteId:'c1', nome:'Ana' },
    { ida:'2026-11-07', pax:6, criancas:0, destino:'Encantadas', pousada:'Pousada Mar', clienteId:'c2', nome:'Bruno' },
    { ida:'2026-11-07', pax:2, criancas:0, destino:'Brasília',   pousada:'',            clienteId:'c3', nome:'Caio' },
    { ida:'2026-10-30', pax:9, criancas:0, destino:'Encantadas', pousada:'',            clienteId:'c1', nome:'Ana' }, /* FORA do mês */
  ],
  saidas: [
    { data:'2026-11-02', hora:'09:30', vagas:12, ocupadas:4,  sentido:'ida' },
    { data:'2026-11-07', hora:'09:30', vagas:12, ocupadas:8,  sentido:'ida' },
    { data:'2026-11-07', hora:'16:00', vagas:12, ocupadas:0,  sentido:'volta' }, /* saiu vazia */
    { data:'2026-10-30', hora:'09:30', vagas:12, ocupadas:9,  sentido:'ida' },   /* FORA */
  ],
  patio: [
    { entrada:'2026-11-02', saidaReal:'2026-11-04' },            /* 3 diárias */
    { entrada:'2026-11-07', saidaPrevista:'2026-11-08', saidaReal:null }, /* 2 diárias */
    { entrada:'2026-10-20', saidaReal:'2026-10-22' },            /* FORA */
  ],
  lancamentos: [
    { data:'2026-11-02', tipo:'entrada', valor:480, cat:'Travessias',     pg:'pix' },
    { data:'2026-11-07', tipo:'entrada', valor:960, cat:'Travessias',     pg:'cartao' },
    { data:'2026-11-07', tipo:'entrada', valor:140, cat:'Estacionamento', pg:'pix' },
    { data:'2026-11-05', tipo:'saida',   valor:300, cat:'Combustível',    centro:'lancha' },
    { data:'2026-10-30', tipo:'entrada', valor:999, cat:'Travessias',     pg:'pix' }, /* FORA */
  ],
};

const v = B12.visaoGeral('2026-11-01', '2026-11-30');

console.log('\n— o período corta certo —');
eh('não conta a reserva de outubro', v.pessoas === 12, 'deu ' + v.pessoas + ', esperava 4+6+2');
eh('não conta o lançamento de outubro', v.entradas === 1580, 'deu ' + v.entradas);
eh('não conta o carro de outubro', v.carros === 2, 'deu ' + v.carros);
eh('conta as crianças separado', v.criancas === 1);

console.log('\n— travessia —');
eh('saída vazia NÃO conta como travessia feita', v.travessias === 2, 'deu ' + v.travessias);
eh('mas os lugares dela entram na ocupação', v.lugares === 36, 'deu ' + v.lugares);
eh('ocupação = 12 de 36 = 33%', Math.round(v.ocupacao * 100) === 33, 'deu ' + v.ocupacao);
eh('separa por horário', v.porHorario['09h'].pessoas === 12 && v.porHorario['16h'].pessoas === 0);
eh('separa por destino', v.porDestino['Encantadas'] === 10 && v.porDestino['Brasília'] === 2);

console.log('\n— dia da semana (o que o Dhalsin quer saber) —');
eh('02/11/2026 é segunda', B12.diaDaSemana('2026-11-02') === 1);
eh('07/11/2026 é sábado',  B12.diaDaSemana('2026-11-07') === 6);
eh('os sete dias aparecem sempre, mesmo vazios', v.porDiaSemana.length === 7);
eh('sábado somou 8 pessoas', v.porDiaSemana[6].total === 8, 'deu ' + v.porDiaSemana[6].total);
eh('segunda somou 4', v.porDiaSemana[1].total === 4);
eh('domingo ficou zerado', v.porDiaSemana[0].total === 0);
eh('quarta aparece zerada, não some', v.porDiaSemana[3].total === 0 && v.porDiaSemana[3].dias === 0);
eh('a média usa só os dias que existiram', v.porDiaSemana[6].media === 8, 'deu ' + v.porDiaSemana[6].media);
eh('o melhor dia da semana é sábado', v.melhorDiaSemana.nome === 'Sábado');

console.log('\n— pátio —');
eh('somou 3 + 2 diárias', v.diarias === 5, 'deu ' + v.diarias);

console.log('\n— dinheiro: sai do lançamento, nunca da reserva —');
eh('entradas somam 480+960+140', v.entradas === 1580);
eh('saídas somam 300', v.saidasDinheiro === 300);
eh('travessia e estacionamento separados',
   v.porCat['Travessias'] === 1440 && v.porCat['Estacionamento'] === 140);
eh('separa por forma de pagamento', v.porPg['pix'] === 620 && v.porPg['cartao'] === 960);
eh('quanto cada pessoa deixou', Math.round(v.porPessoa) === 132, 'deu ' + v.porPessoa);

console.log('\n— de onde vem a gente —');
eh('cidade vem da ficha do cliente', v.topCidades[0].nome === 'Curitiba' && v.topCidades[0].v === 10);
eh('pousada parceira somada', v.topPousadas[0].nome === 'Pousada Mar' && v.topPousadas[0].v === 10);
eh('quem mais trouxe gente no período', v.topClientes[0].nome === 'Bruno' && v.topClientes[0].v === 6);

console.log('\n— o caso que quebra gráfico: período sem nada —');
const z = B12.visaoGeral('2025-01-01', '2025-01-31');
eh('devolve zero, não NaN', z.pessoas === 0 && z.entradas === 0 && z.ocupacao === 0);
eh('e se diz vazio em vez de fingir', z.vazio === true);
eh('os sete dias continuam lá', z.porDiaSemana.length === 7);
eh('um dia só não vira divisão por zero', B12.visaoGeral('2026-11-07','2026-11-07').dias === 1);

console.log('\n— fuso: data é do relógio da parede, não de Londres —');
eh('01 de novembro continua sendo 01 de novembro',
   B12.diaDaSemana('2026-11-01') === 0, 'domingo');
eh('diasEntre conta as duas pontas', B12.diasEntre('2026-11-01','2026-11-03') === 3);

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
