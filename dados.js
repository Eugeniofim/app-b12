/* ============================================================================
   Estação B12 — dados
   ----------------------------------------------------------------------------
   REAL: tudo em HIST vem da planilha "resist control" do cliente, lida em
   05/09/2026: 12.267 lançamentos de venda (ago/2015 a jul/2025), 712 de
   combustível e 443 de despesa. Nada aqui foi inventado.

   DEMONSTRAÇÃO: o movimento do mês corrente é gerado a partir da sazonalidade
   real, para o painel ter o que mostrar antes de existir uso de verdade.
   Toda tela que usa dado gerado diz isso na cara.
   ========================================================================== */

var B12 = window.B12 || {};

/* ---------------------------------------------------------------- identidade */
B12.EMPRESA = {
  nome: 'Estação B12',
  slogan: 'Sua conexão com a Ilha do Mel',
  frase: 'Seja bem-vindo, sua experiência começa aqui',
  endereco: 'Av. Beira-Mar, 3433 · Pontal do Paraná – PR',
  cep: '83255-000',
  lat: -25.566233, lon: -48.356609,
  whats: '5541999497113',
  cnpj: '42.727.723/0001-37',
  dono: 'Dhalsin',
};

/* ------------------------------------------------------- catálogo de serviços */
B12.PASSEIOS = [
  { id:'golfinhos', nome:'Baía dos Golfinhos e Ilha das Peças', dur:'4h', preco:180,
    foto:'fotos/passeio1.jpg', cor:'#12608E',
    resumo:'Encontro com golfinhos e parada na Ilha das Peças.',
    texto:'Saída pela baía de Paranaguá com parada para observar golfinhos em ambiente natural, e tempo em terra na Ilha das Peças.' },
  { id:'sebui', nome:'Reserva Ecológica do Sebuí', dur:'8h', preco:250,
    foto:'fotos/passeio2.jpg', cor:'#0E7A6E',
    resumo:'Dia inteiro em Guaraqueçaba, mata atlântica preservada.',
    texto:'Passeio de dia inteiro até a reserva particular do Sebuí, em Guaraqueçaba, com trilha e cachoeira.' },
  { id:'tour360', nome:'Tour 360°', dur:'5h', preco:200,
    foto:'fotos/passeio3.jpg', cor:'#155E8C',
    resumo:'A volta completa pela Ilha do Mel, vista do mar.',
    texto:'A volta completa na Ilha do Mel pelo mar, passando pelo Farol das Conchas, pela Fortaleza e pelas praias que só se vê de barco.' },
  { id:'galheta', nome:'Piscina Natural da Ilha da Galheta', dur:'3h', preco:150,
    foto:'fotos/passeio4.jpg', cor:'#0F8A78',
    resumo:'Trilha e praia paradisíaca, com água calma.',
    texto:'Travessia até a Ilha da Galheta, com tempo para banho na piscina natural e trilha curta.' },
];

/* Tabela do briefing — SERVIÇO NÁUTICO PREMIUM (lancha exclusiva).
   O valor fixo de até 3 passageiros funciona como mínimo. A CONFIRMAR. */
B12.TABELA = {
  dia:   { de:'08h30', ate:'18h00', fixo:180, pessoa:50 },
  tarde: { de:'18h00', ate:'20h00', fixo:260, pessoa:65 },
  noite: { de:'20h00', ate:'22h00', fixo:310, pessoa:80 },
};
B12.REGULAR = 60;      /* travessia comum, por pessoa — PENDENTE de confirmação */
B12.DIARIA  = 40;      /* estacionamento por dia — média da planilha */
B12.DESC_DINHEIRO = 0.05;
B12.IDADE_CORTESIA = 5;

B12.DESTINOS = ['Brasília', 'Encantadas'];

B12.PARCEIROS = [
  { nome:'Villa Verde',          tipo:'restaurante', comissao:0 },
  { nome:'Grajagan Surf Resort', tipo:'resort',      comissao:0 },
  { nome:'Ilha do Mel Lodges',   tipo:'pousada',     comissao:0 },
  { nome:'Village Mel',          tipo:'pousada',     comissao:0 },
  { nome:'Bossa Beach House',    tipo:'pousada',     comissao:0 },
  { nome:'Surfway',              tipo:'pousada',     comissao:0 },
  { nome:'Pousada das Gêmeas',   tipo:'pousada',     comissao:0 },
  { nome:'Casa da Ilha do Mel',  tipo:'pousada',     comissao:0 },
  { nome:'Plancton',             tipo:'pousada',     comissao:0 },
  { nome:'Yba',                  tipo:'pousada',     comissao:0 },
  { nome:'13 Luas',              tipo:'pousada',     comissao:0 },
];

B12.ATRACOES = [
  ['Farol das Conchas',              'Brasília',   'O cartão-postal da Ilha, com vista dos dois lados.'],
  ['Fortaleza N. Sra. dos Prazeres', 'Brasília',   'Forte do século XVIII, tombado.'],
  ['Gruta das Encantadas',           'Encantadas', 'A lenda das sereias, na ponta sul.'],
  ['Praia de Fora',                  'as duas vilas','A praia aberta, boa para surfe.'],
  ['Ilha da Galheta',                'de barco',   'Piscina natural, só se chega pelo mar.'],
];

/* ------------------------------- categorias do financeiro (lista do briefing) */
B12.ENTRADAS = ['Travessias','Passeios','Estacionamento','Comissões de hospedagem','Outras receitas'];
B12.SAIDAS   = ['Combustível','Manutenção','Operação/marinheiros','Impostos e taxas',
                'Despesas administrativas','Compras e fornecedores','Outras despesas'];
B12.CENTROS  = ['Lancha','Receptivo B12','Estacionamento','Administrativo'];

/* taxas de maquininha — valores de mercado, o cliente precisa confirmar as dele */
B12.TAXAS = { credito:0.0349, debito:0.0189, pix:0, dinheiro:0 };

/* contas fixas citadas no briefing */
B12.CONTAS_FIXAS = [
  { desc:'Salário marinheiro',   valor:2900, dia:5,  cat:'Operação/marinheiros',    centro:'Lancha' },
  { desc:'Aluguel Estação B12',  valor:3500, dia:10, cat:'Despesas administrativas',centro:'Receptivo B12' },
  { desc:'Contador',             valor:650,  dia:10, cat:'Despesas administrativas',centro:'Administrativo' },
  { desc:'DAS',                  valor:1180, dia:20, cat:'Impostos e taxas',        centro:'Administrativo' },
  { desc:'Água e luz',           valor:740,  dia:15, cat:'Despesas administrativas',centro:'Receptivo B12' },
  { desc:'Ambev',                valor:1450, dia:12, cat:'Compras e fornecedores',  centro:'Receptivo B12' },
  { desc:'Produtos de limpeza',  valor:380,  dia:12, cat:'Compras e fornecedores',  centro:'Receptivo B12' },
  { desc:'Empanadas',            valor:620,  dia:8,  cat:'Compras e fornecedores',  centro:'Receptivo B12' },
];

B12.EMBARCACOES = [
  { id:'l01', nome:'Lancha 01', capacidade:12, ativa:true, motor:'225 HP' },
];

/* ============================================================================
   HISTÓRICO REAL — planilha do cliente
   ========================================================================== */

/* [ano-mês, lançamentos, passageiros, receita travessia, receita estacionamento] */
B12.HIST_VENDAS = [
["2015-08",158,593,9400,0],["2015-09",208,602,10894,2115],["2015-10",274,988,16648,2585],
["2015-11",224,655,10668,1920],["2015-12",306,891,16383,6418],["2016-01",332,1191,23618,6615],
["2016-02",263,884,18940,5365],["2016-03",216,654,11975,4440],["2016-04",243,851,15205,2865],
["2016-05",123,307,4555,1045],["2016-06",118,298,3780,1020],["2016-07",210,496,8535,1825],
["2016-08",177,481,6635,2710],["2016-09",210,555,9095,2670],["2016-10",171,581,10515,2300],
["2016-11",221,614,10260,3095],["2016-12",326,1122,19465,7710],["2017-01",271,1007,17130,5235],
["2017-02",334,1028,20860,6835],["2017-03",231,798,15265,4030],["2017-04",254,903,16895,3420],
["2017-05",56,173,3395,725],["2017-06",23,0,0,850],["2017-07",172,530,8610,2155],
["2017-08",220,597,8385,2335],["2017-09",223,618,10905,2965],["2017-10",143,462,7845,1410],
["2017-11",273,756,13020,3865],["2017-12",278,843,15830,7080],["2018-01",362,1119,22300,7205],
["2018-02",273,894,18650,5600],["2018-03",207,691,14435,4305],["2018-04",210,625,11280,3045],
["2018-05",19,58,1355,0],["2018-10",10,26,590,310],["2018-11",131,417,9990,1670],
["2018-12",82,240,6990,715],["2019-02",2,7,150,0],["2019-03",127,333,6900,1530],
["2019-04",121,283,7475,1410],["2019-05",123,302,7235,945],["2019-06",141,392,9970,1680],
["2019-07",136,384,9459,1525],["2019-08",24,75,1675,865],["2019-12",4,11,325,290],
["2020-12",113,674,29065,12785],["2021-01",116,729,32390,9565],["2021-02",125,561,25150,8575],
["2021-03",30,124,7913,2155],["2021-06",70,280,12293,5190],["2021-07",59,282,12223,4066],
["2021-08",48,315,12530,4058],["2021-09",117,732,30682,9620],["2021-10",71,319,15700,6040],
["2021-11",140,624,29345,10196],["2021-12",190,1187,57490,25135],["2022-01",117,769,36191,12994],
["2024-02",97,466,25562,11695],["2024-03",132,662,35660,11950],["2024-04",102,507,25195,10055],
["2024-05",64,306,15680,5680],["2024-06",63,205,13860,5856],["2024-07",52,230,13270,4280],
["2024-08",187,853,42115,17917],["2024-09",69,350,21405,6060],["2024-10",92,512,25430,10435],
["2024-11",100,449,25310,9855],["2024-12",167,919,52015,29272],["2025-01",232,1170,68470,31810],
["2025-02",143,655,37571,17090],["2025-03",163,710,45390,19170],["2025-04",71,355,21220,8790],
["2025-05",73,354,19305,6880],["2025-06",30,119,7460,2400],["2025-07",79,283,19180,6990]
];

/* [ano-mês, R$, litros, abastecimentos] — 712 lançamentos, 50.784 L, R$ 213.436 */
B12.HIST_COMBUSTIVEL = [
["2016-04",3953,998,16],["2016-05",1578,399,8],["2016-06",1884,477,13],["2016-07",2992,757,21],
["2016-08",2709,686,15],["2016-09",2888,731,17],["2016-10",2934,743,17],["2016-11",3403,862,18],
["2016-12",4411,1098,22],["2017-01",4408,1100,23],["2017-02",5506,1380,31],["2017-03",3989,1000,24],
["2017-04",4327,1084,26],["2017-05",403,101,3],["2017-07",3833,961,18],["2017-08",4381,1098,27],
["2017-09",4314,1037,22],["2017-10",3112,741,21],["2017-11",4667,1112,27],["2017-12",6874,1604,35],
["2018-01",7446,1635,32],["2018-02",5930,1302,25],["2018-03",5402,1186,27],["2018-04",4966,1088,24],
["2018-05",375,81,2],["2018-10",300,62,1],["2018-11",2873,592,13],["2018-12",740,153,4],
["2019-06",200,43,1],["2021-10",3387,0,3]
];
B12.COMB_TOTAL = { linhas:712, litros:50784, valor:213436, precoLitro:4.20 };

/* [ano-mês, R$] — 443 lançamentos, R$ 236.570 */
B12.HIST_DESPESAS = [
["2016-08",3815],["2016-09",2093],["2016-10",1770],["2016-11",1804],["2016-12",3932],
["2017-01",9609],["2017-02",4456],["2017-03",1682],["2017-04",4483],["2017-05",5538],
["2017-06",4821],["2017-07",4451],["2017-08",4372],["2017-09",4691],["2017-10",4448],
["2017-11",3543],["2017-12",4451],["2018-01",5412],["2018-02",4828],["2018-03",3690],
["2018-04",3652],["2018-11",7010],["2018-12",1213],["2019-03",23500],["2019-04",3440],
["2019-06",400],["2019-07",2128],["2019-08",2326],["2021-05",50],["2021-06",1508]
];

/* maiores despesas nomeadas na planilha — usado no relatório de despesas */
B12.DESP_MAIORES = [
  ['Salário marinheiro',26650],['Aluguel Estação B12',21000],['Celular',4995],
  ['Lavagem da lancha',4350],['Marina Michel (4× lavagem)',4050],
  ['Peças, o-rings, retentores, óleos',3305],['GPS',2560],['Toldo',2500],['Guincho',2200],
  ['Óleos, filtros, correia dentada',2083],['Sinal do motor 225 HP',2000],
  ['Mão de obra lancha',3700]
];

/* origem do cliente, como está na planilha (a coluna "Cliente") */
B12.HIST_ORIGEM = [
  ['Direto (b12)',3719],['Náutico',2301],['Turista avulso',1702],['Hóspede de pousada',1635],
  ['Astral',1155],['Pacote Astral',615],['Grajagan',132],['Casamento',53],['Plancton',29],
  ['Yba',25],['Ilha do Mel Lodges',17],['Bossa',15],['13 Luas',14],['Village Mel',11]
];

B12.HIST_PAGAMENTO = [['credito',1277],['debito',436],['pix',339],['dinheiro',303],['transferencia',9]];
B12.HIST_FAIXAS    = [['08h-18h',9626],['18h-20h',1008],['20h-22h+',490],['antes 08h',186]];
B12.HIST_PAX       = [[1,3466],[2,1791],[3,879],[4,2095],[5,445],[6,816],[7,216],[8,606],
                      [9,123],[10,180],[11,67],[12,100]];

B12.HIST_RESUMO = {
  lancamentos:12267, passageiros:41090, receita:1741819,
  primeiro:'2015-08', ultimo:'2025-07',
  mesesComRegistro:75, mesesEmBranco:45, anoFaltando:2023,
  semDataValida:913
};

/* ============================================================================
   Movimento do mês corrente — GERADO a partir da sazonalidade real.
   Serve para o painel ter o que mostrar. Toda tela avisa que é demonstração.
   ========================================================================== */
B12.gerarMes = function (ano, mes) {
  /* peso sazonal tirado da média real de 2024-2025 por mês do ano */
  var peso = [1.00,.62,.66,.38,.30,.20,.28,.42,.33,.40,.40,.85][mes-1];
  var baseMes = 82000 * peso;                       /* receita típica do mês */
  var dias = new Date(ano, mes, 0).getDate();
  var sem = new Date(ano, mes-1, 1).getDay();
  var out = [], semente = ano*100+mes;
  function rnd(){ semente = (semente*9301+49297) % 233280; return semente/233280; }
  for (var d=1; d<=dias; d++){
    var dw = (sem + d - 1) % 7;
    var fds = (dw===5||dw===6||dw===0) ? 1.85 : 0.62;   /* fim de semana pesa mais */
    var r = baseMes/dias * fds * (0.72 + rnd()*0.56);
    var pax = Math.max(2, Math.round(r/58));
    out.push({
      dia:d,
      travessias: Math.max(1, Math.round(pax/3.4)),
      pax: pax,
      travessia: Math.round(r*0.70),
      estacionamento: Math.round(r*0.22),
      passeios: Math.round(rnd()*3*fds),
      passeio: Math.round(r*0.08),
      combustivel: Math.round(r*0.155)      /* 15,5% da receita, média real */
    });
  }
  return out;
};
