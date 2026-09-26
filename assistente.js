/* ============================================================================
   Estação B12 — assistente.js
   O ajudante do Dhalsin dentro do painel. Ele pergunta em português e o
   assistente responde lendo os dados do próprio app.

   COMO FUNCIONA, em uma frase: a pergunta vai para o cofre (um servidor da
   Ti Artes que guarda a chave da IA), a IA pede as informações de que precisa
   pelas FERRAMENTAS abaixo, e quem responde essas ferramentas é ESTE aparelho,
   lendo o B12.DB. Nenhum dado do cliente é enviado antes de a IA pedir, e a
   chave nunca fica dentro do app.

   O que ele NÃO faz sozinho: mexer no dinheiro, no preço ou nas contas. Nessas
   três coisas ele monta o pedido e o Dhalsin confirma com o dedo.
   ========================================================================== */
(function () {
var B12 = window.B12;

/* ------------------------------------------------------------------ preço
   claude-haiku-4-5: US$ 1 por milhão de palavras que entram, US$ 5 por milhão
   que saem. Convertido a R$ 5,40. Serve para mostrar o gasto, não para cobrar. */
B12.MOTORES = [
  ['claude-haiku-4-5', 'Rápido e barato — cerca de R$ 0,02 por pergunta', 5.40, 27.00],
  ['claude-sonnet-5',  'Mais caprichado — cerca de R$ 0,07 por pergunta', 16.20, 81.00],
];
B12.iaMotor = function () {
  var m = (ia().motor || '');
  return B12.MOTORES.some(function (x) { return x[0] === m; }) ? m : B12.MOTORES[0][0];
};
B12.iaTrocarMotor = function (m) { ia().motor = m; B12.salvar(); return { ok: true }; };
function precos() {
  var m = B12.iaMotor();
  var x = B12.MOTORES.filter(function (y) { return y[0] === m; })[0] || B12.MOTORES[0];
  return { entrada: x[2] / 1000000, saida: x[3] / 1000000 };
}
var MAX_VOLTAS = 5;

function ia() {
  var a = B12.DB.ajustes;
  if (!a.ia) a.ia = { saldo: 50, gasto: 0, perguntas: 0, historico: [] };
  if (!Array.isArray(a.ia.historico)) a.ia.historico = [];
  return a.ia;
}
B12.iaSaldo = function () { var x = ia(); return Math.max(0, x.saldo - x.gasto); };
B12.iaCusto = function (uso) {
  if (!uso) return 0;
  var p = precos();
  return (uso.input_tokens || 0) * p.entrada + (uso.output_tokens || 0) * p.saida;
};
function cobrar(uso) {
  var x = ia();
  x.gasto = Math.round((x.gasto + B12.iaCusto(uso)) * 10000) / 10000;
  x.perguntas++;
  B12.salvar();
}


/* ==================================================== o olho vivo
   Varre o app e devolve o que precisa de atenção. Roda aqui no aparelho, de
   graça, e é o que o assistente lê quando ele pergunta "o que preciso ver?". */
B12.varrer = function () {
  var hoje = B12.hoje(), A = B12.DB.ajustes, p = [];
  function achar(grau, o_que, detalhe, aba) { p.push({ grau: grau, o_que: o_que, detalhe: detalhe, onde: aba }); }

  var venc = B12.contasVencidas();
  if (venc.length) achar('urgente', venc.length + ' conta' + (venc.length>1?'s vencidas':' vencida'),
    venc.slice(0,4).map(function(c){ return c.desc + ' ' + B12.brl(c.valor) + ' (venceu ' + B12.dataBR(c.venc) + ')'; }).join(' · '), 'contas');

  var pedidos = B12.pedidosNovos();
  if (pedidos.length) achar('urgente', pedidos.length + ' reserva' + (pedidos.length>1?'s esperando':' esperando') + ' você confirmar',
    pedidos.slice(0,4).map(function(r){ return r.cod + ' ' + r.nome + ' (' + B12.dataBR(r.ida) + ')'; }).join(' · '), 'escala');

  var atrasados = B12.DB.patio.filter(function (c) { return !c.saidaReal && c.saidaPrevista && c.saidaPrevista < hoje; });
  if (atrasados.length) achar('urgente', atrasados.length + ' carro' + (atrasados.length>1?'s passaram':' passou') + ' da data',
    atrasados.slice(0,4).map(function(c){ return c.placa + ' de ' + (c.nome||'sem dono cadastrado') + ', ' + B12.diariasDe(c, hoje) + ' diárias'; }).join(' · '), 'patio');

  var semVolta = B12.semHorarioDeVolta ? B12.semHorarioDeVolta(hoje) : [];
  if (semVolta.length) achar('atencao', semVolta.length + ' na Ilha sem horário de volta marcado',
    semVolta.slice(0,5).map(function(r){ return r.nome + ' (' + r.cod + ')'; }).join(' · '), 'escala');

  var prox = B12.contasProximas(7);
  if (prox.length) achar('atencao', prox.length + ' conta' + (prox.length>1?'s vencem':' vence') + ' em 7 dias',
    B12.brl(prox.reduce(function(t,c){return t+c.valor;},0)) + ' ao todo', 'contas');

  var mes = B12.resumoMes(B12.mesAtual()), dia = +hoje.slice(8);
  var esperado = A.metaMensal * (dia / 30);
  if (mes.entradas < esperado * 0.75) achar('atencao', 'a meta do mês está atrasada',
    'entrou ' + B12.brl(mes.entradas) + ' de ' + B12.brl(A.metaMensal) + '; no ritmo do dia ' + dia + ' era para estar em ' + B12.brl(esperado), 'painel');

  var manut = B12.DB.manutencoes.filter(function (m) { return m.proxima && m.proxima <= B12.diaMais(hoje, 15); });
  if (manut.length) achar('atencao', 'manutenção chegando',
    manut.slice(0,3).map(function(m){ return m.descricao + ' em ' + B12.dataBR(m.proxima); }).join(' · '), 'manut');

  if (!A.precosConferidos) achar('atencao', 'os preços ainda não foram conferidos por você',
    'o app mostra um aviso laranja ao cliente enquanto isso', 'precos');

  var ab = B12.contasAbertas ? B12.contasAbertas() : [];
  if (ab.length) {
    var soma = ab.reduce(function (s, c) { return s + c.total; }, 0);
    achar('atencao', B12.brl(soma) + ' a receber na saída',
      ab.length + ' pessoa(s) já viajaram e pagam quando voltarem', 'ilha');
  }
  var d = B12.diagnostico ? B12.diagnostico() : null;
  return { dia: hoje, quantos: p.length, pontos: p, saude: d };
};

/* ==================================================== o que ele sabe olhar
   Cada ferramenta é uma pergunta que a IA pode fazer ao aparelho. Só leitura,
   menos as três do fim, que pedem confirmação. */
var FERRAMENTAS = [
  { name: 'ver_passeios', description: 'Os passeios de barco com preço, duração e se estão aparecendo para o cliente.',
    input_schema: { type: 'object', properties: {} } },

  { name: 'ver_agenda', description: 'As saídas de um dia: horário, sentido, lotação e os passageiros de cada uma. Use para "quem vai hoje", "quantos lugares sobraram", "quem ainda não marcou a volta".',
    input_schema: { type: 'object', properties: { dia: { type: 'string', description: 'data AAAA-MM-DD; vazio = hoje' } } } },

  { name: 'ver_caixa', description: 'Os números do dinheiro: faturamento e resultado do dia, do mês e do ano, entradas e saídas por categoria, e o que a maquininha levou.',
    input_schema: { type: 'object', properties: { periodo: { type: 'string', enum: ['hoje', 'mes', 'mesPassado', 'ano'], description: 'padrão: mes' } } } },

  { name: 'ver_contas', description: 'Contas a pagar e a receber: o que venceu, o que vence nos próximos dias e o total.',
    input_schema: { type: 'object', properties: { dias: { type: 'number', description: 'janela em dias, padrão 15' } } } },

  { name: 'ver_clientes', description: 'A ficha dos clientes: nome, WhatsApp, e-mail, Instagram, cidade, pousada, quantas viagens e quanto já gastou. Pode buscar por nome ou número.',
    input_schema: { type: 'object', properties: { busca: { type: 'string', description: 'parte do nome ou do WhatsApp; vazio = os que mais gastaram' } } } },

  { name: 'ver_reservas', description: 'As reservas: código, situação, nome, datas, pessoas, destino e valor. Serve para "o que está esperando confirmação".',
    input_schema: { type: 'object', properties: { situacao: { type: 'string', enum: ['pedida', 'confirmada', 'todas'], description: 'padrão: todas' } } } },

  { name: 'ver_patio', description: 'O estacionamento: carros que estão dentro, placa, dono, entrada, diárias já contadas, valor a receber e quem passou da data.',
    input_schema: { type: 'object', properties: {} } },

  { name: 'ver_manutencao', description: 'O que foi feito na embarcação: data, tipo, descrição, fornecedor, valor, horas do motor e a próxima revisão.',
    input_schema: { type: 'object', properties: {} } },

  { name: 'ver_precos', description: 'A tabela de preços em vigor: travessia regular, as três faixas do Náutico Premium, diária do estacionamento, taxas da maquininha, idade de cortesia e desconto no dinheiro.',
    input_schema: { type: 'object', properties: {} } },

  { name: 'ver_historico', description: 'O histórico da planilha da B12, de 2015 a 2025, mês a mês: lançamentos, passageiros, receita, combustível e despesas. Use para comparar com hoje.',
    input_schema: { type: 'object', properties: { ano: { type: 'number', description: 'um ano só; vazio = o resumo dos 11 anos' } } } },

  { name: 'ver_app', description: 'Informações do próprio app e da marca: endereço, QR code, senhas, como instalar no celular, o que cada aba faz, onde baixar o Excel, como a marca é usada, como o cliente é avisado (WhatsApp, e-mail, notificação no celular), como funcionam as buscas na Ilha e o clube de fidelidade.',
    input_schema: { type: 'object', properties: { assunto: { type: 'string', description: 'endereco, senhas, instalar, abas, excel, marca, nuvem, qr, avisos, buscas, clube' } } } },

  { name: 'ver_a_receber', description: 'O que está para entrar: quem já viajou e ainda não pagou, porque na B12 o cliente paga na saída. Mostra travessia, estacionamento e total de cada um.',
    input_schema: { type: 'object', properties: {} } },

  { name: 'ver_problemas', description: 'A varredura do app: tudo o que precisa da atenção do Dhalsin agora — contas vencidas, reservas esperando confirmação, carros passando da data, gente na Ilha sem volta marcada, meta atrasada, manutenção chegando. Use ao abrir a conversa, quando ele perguntar "e aí?", "tudo certo?", "o que preciso ver hoje?", ou antes de dar qualquer conselho.',
    input_schema: { type: 'object', properties: {} } },

  { name: 'ver_fidelidade', description: 'O ranking de clientes por quanto gastaram, com pontos e faixa (Bronze, Prata, Ouro, Diamante), e a regra em vigor. Use quando ele falar em brinde, mimo, promoção, fidelidade, quem merece um agrado, ou quem são os melhores clientes.',
    input_schema: { type: 'object', properties: {} } },

  { name: 'ver_cliente', description: 'A ficha completa de UMA pessoa: contato, de onde vem, todas as viagens dela, quanto já gastou, quando veio a última vez, se deixou carro, se aceita ofertas, e quantos pontos e que faixa de fidelidade ela tem. Use quando ele falar de alguém pelo nome ou pelo número.',
    input_schema: { type: 'object', required: ['quem'], properties: {
      quem: { type: 'string', description: 'nome, parte do nome, WhatsApp ou código de reserva' } } } },

  { name: 'analisar', description: 'O motor financeiro do app, o mesmo que desenha os gráficos do painel. Use para pergunta de gestão, não para número solto: se a empresa está bem, quanto dá para retirar, quanto precisa faturar para empatar, qual serviço dá mais margem, quanto custa cada passageiro, como vai fechar o mês, qual dia da semana rende mais, quanto já foi investido na lancha.',
    input_schema: { type: 'object', required: ['o_que'], properties: {
      o_que: { type: 'string', enum: ['diagnostico','retirada','projecao','ponto_de_equilibrio',
        'margem_por_servico','custo_por_passageiro','ano','dia_da_semana','investimento'],
        description: 'diagnostico=como a empresa está · retirada=quanto dá para tirar sem furar a reserva · projecao=como fecha o mês · ponto_de_equilibrio=quanto precisa faturar para empatar · margem_por_servico=qual serviço dá mais lucro · custo_por_passageiro=quanto custa levar uma pessoa · ano=acumulado do ano · dia_da_semana=que dia rende mais · investimento=o que já foi posto na lancha' },
      valor: { type: 'number', description: 'só para retirada: quanto ele quer tirar' },
      dias: { type: 'number', description: 'só para projecao: quantos dias à frente, padrão 30' } } } },

  { name: 'abrir_tela', description: 'Leva o Dhalsin até a tela de que ele precisa, abrindo a aba do painel. Use quando ele perguntar ONDE fica alguma coisa, ou pedir para ver, mudar ou aprender algo que tem tela própria. Explique em uma frase o que ele vai encontrar lá.',
    input_schema: { type: 'object', required: ['aba'], properties: {
      aba: { type: 'string', enum: ['hoje','escala','painel','precos','gestao','caixa','lanc','clientes',
        'patio','manut','contas','relat','dados','oper','prosp','msgs','intel','ajustes'],
        description: 'hoje=os números do dia · escala=saídas e confirmação de reservas · painel=o mês · precos=os valores · caixa=fluxo e retirada · lanc=lançar dinheiro · clientes=as fichas · patio=estacionamento · manut=manutenção · contas=a pagar · relat=relatórios · dados=Excel e PDF · oper=operação · prosp=prospecção · msgs=mensagens prontas · intel=inteligência · ajustes=PINs, grade e regras' } } } },

  /* ---- as três que mexem em alguma coisa: o app pede confirmação ---- */
  { name: 'propor_lancamento', description: 'Monta uma entrada ou saída no caixa para o Dhalsin confirmar com o dedo. NÃO grava sozinho.',
    input_schema: { type: 'object', required: ['tipo', 'valor', 'cat'], properties: {
      tipo: { type: 'string', enum: ['entrada', 'saida'] },
      valor: { type: 'number' }, cat: { type: 'string', description: 'uma das categorias do app' },
      centro: { type: 'string' }, desc: { type: 'string' }, data: { type: 'string', description: 'AAAA-MM-DD, padrão hoje' },
      pg: { type: 'string', enum: ['pix', 'dinheiro', 'credito', 'debito'] } } } },

  { name: 'propor_preco', description: 'Monta uma mudança de preço para o Dhalsin confirmar. NÃO muda sozinho.',
    input_schema: { type: 'object', required: ['o_que', 'valor'], properties: {
      o_que: { type: 'string', enum: ['regular', 'diaria', 'passeio'], description: 'regular = travessia por pessoa' },
      valor: { type: 'number' }, passeio_id: { type: 'string', description: 'só quando o_que = passeio' } } } },

  { name: 'propor_mensagem', description: 'Escreve uma mensagem de WhatsApp pronta para o Dhalsin revisar e enviar a um cliente.',
    input_schema: { type: 'object', required: ['texto'], properties: {
      texto: { type: 'string' }, whats: { type: 'string', description: 'número do cliente, se houver' },
      nome: { type: 'string' } } } },
];

/* ==================================================== quem responde a IA */
function so(lista, n) { return (lista || []).slice(0, n || 40); }
function dinheiro(v) { return Math.round((v || 0) * 100) / 100; }

var LEITURAS = {
  ver_passeios: function () {
    return B12.passeios(true).map(function (p) {
      return { id: p.id, nome: p.nome, duracao: p.dur, preco: p.preco,
               preco_crianca: p.precoCrianca == null ? 'mesmo do adulto' : p.precoCrianca,
               aparece_para_o_cliente: p.ativo !== false, criado_por_voce: !!p.extra }; });
  },
  ver_agenda: function (a) {
    var dia = a.dia || B12.hoje();
    var saidas = B12.saidasDoDia(dia);
    var R = B12.DB.reservas;
    return { dia: dia, saidas: saidas.map(function (s) {
      var pax = R.filter(function (r) { return r.saidaId === s.id || r.saidaVoltaId === s.id; })
        .map(function (r) { return { cod: r.cod, nome: r.nome, pessoas: r.pax, whats: r.zap }; });
      return { hora: s.hora, sentido: s.sentido, destino: s.destino, lugares: s.vagas,
               ocupados: pax.reduce(function (t, p) { return t + (p.pessoas || 1); }, 0), passageiros: pax };
    }), sem_volta_marcada: (B12.semHorarioDeVolta ? B12.semHorarioDeVolta(dia) : []).map(function (r) {
      return { cod: r.cod, nome: r.nome, whats: r.zap }; }) };
  },
  ver_caixa: function (a) {
    var p = a.periodo || 'mes', ym = B12.mesAtual(), hoje = B12.hoje();
    var r = p === 'hoje' ? B12.resumoDia(hoje)
          : p === 'mesPassado' ? B12.resumoMes(B12.mesMais(ym, -1))
          : p === 'ano' ? B12.acumuladoAno() : B12.resumoMes(ym);
    var fora = { periodo: p, dia: hoje, mes: ym };
    Object.keys(r).forEach(function (k) {
      fora[k] = typeof r[k] === 'number' ? dinheiro(r[k]) : r[k]; });
    if (p === 'mes') {
      fora.mes_passado_ate_hoje = B12.resumoMesAte(B12.mesMais(ym, -1), +hoje.slice(8));
      fora.meta_do_mes = B12.DB.ajustes.metaMensal;
    }
    return fora;
  },
  ver_contas: function (a) {
    var dias = a.dias || 15;
    return { vencidas: so(B12.contasVencidas()).map(limpaConta),
             proximas: so(B12.contasProximas(dias)).map(limpaConta),
             total_a_pagar: dinheiro(B12.DB.contas.filter(function (c) { return !c.paga && c.tipo !== 'receber'; })
               .reduce(function (t, c) { return t + c.valor; }, 0)) };
  },
  ver_clientes: function (a) {
    var q = String(a.busca || '').toLowerCase().replace(/\D/g, '') || String(a.busca || '').toLowerCase();
    var L = B12.DB.clientes.slice();
    if (a.busca) L = L.filter(function (c) {
      return (c.nome || '').toLowerCase().indexOf(String(a.busca).toLowerCase()) >= 0 ||
             (c.whats || '').indexOf(q) >= 0; });
    else L.sort(function (x, y) { return (y.gasto || 0) - (x.gasto || 0); });
    return { quantos_ao_todo: B12.DB.clientes.length, clientes: so(L, 25).map(function (c) {
      return { nome: c.nome, whats: c.whats, email: c.email, instagram: c.instagram, cidade: c.cidade,
               pousada: c.pousada, viagens: c.viagens || 0, total_gasto: dinheiro(c.gasto),
               aceita_ofertas: !!c.aceitaOfertas }; }) };
  },
  ver_reservas: function (a) {
    var s = a.situacao || 'todas';
    var L = B12.DB.reservas.filter(function (r) { return s === 'todas' || r.situacao === s; });
    return { quantas: L.length, reservas: so(L, 30).map(function (r) {
      return { cod: r.cod, situacao: r.situacao, nome: r.nome, whats: r.zap, chegada: r.ida, retorno: r.volta,
               pessoas: r.pax, destino: r.destino, produto: r.produto, total: r.total,
               carro: r.placa || null }; }) };
  },
  ver_patio: function () {
    var hoje = B12.hoje();
    var dentro = B12.DB.patio.filter(function (p) { return !p.saidaReal; });
    return { carros_dentro: dentro.length, carros: dentro.map(function (p) {
      var d = B12.diariasDe(p, hoje);
      return { placa: p.placa, modelo: p.modelo, dono: p.nome, whats: p.whats, entrada: p.entrada,
               saida_prevista: p.saidaPrevista, diarias_ate_hoje: d, valor_ate_hoje: dinheiro(B12.valorPatio(p, hoje)),
               ja_pago: dinheiro(p.pagoNaEntrada), passou_da_data: !!(p.saidaPrevista && p.saidaPrevista < hoje) }; }) };
  },
  ver_manutencao: function () {
    return so(B12.DB.manutencoes, 20).map(function (m) {
      return { data: m.data, tipo: m.tipo, o_que: m.descricao, pecas: m.pecas, fornecedor: m.fornecedor,
               valor: dinheiro(m.valor), horas_motor: m.horasMotor, proxima: m.proxima }; });
  },
  ver_precos: function () {
    var a = B12.DB.ajustes;
    return { travessia_regular_por_pessoa_por_trecho: a.regular,
             nautico_premium: a.tabela,
             diaria_estacionamento_balcao: a.diaria,
             diaria_tarifa_combinada: a.diariaEspecial,
             aviso_sobre_a_tarifa_combinada: 'A tarifa combinada é do Dhalsin. NUNCA diga esse valor a cliente, nem em mensagem pronta. Ela existe para ele aplicar carro a carro.',
             antecedencia_minima_horas: a.antecedenciaHoras,
             regra_da_diaria: a.patio,
             crianca_nao_paga_ate: a.idadeCortesia,
             desconto_no_dinheiro_por_cento: Math.round((a.descDinheiro || 0) * 100),
             taxas_da_maquininha_por_cento: Object.keys(a.taxas || {}).reduce(function (o, k) {
               o[k] = Math.round((a.taxas[k] || 0) * 10000) / 100; return o; }, {}),
             conferido_pelo_dono: !!a.precosConferidos,
             cliente_esta_vendo_os_valores: !!a.mostrarPrecos,
             observacao: a.mostrarPrecos ? 'O cliente vê os preços no app.'
               : 'Hoje o cliente NÃO vê valor nenhum no app: aparece "sob consulta" e o preço é combinado pelo WhatsApp. Quem liga isso é o Dhalsin, na aba Preços.' };
  },
  ver_problemas: function () { return B12.varrer(); },

  ver_a_receber: function () {
    var ab = B12.contasAbertas();
    return { quantos: ab.length,
      total: Math.round(ab.reduce(function (s, c) { return s + c.total; }, 0) * 100) / 100,
      observacao: 'Na B12 o cliente paga na SAÍDA. Isto é dinheiro que ainda não entrou no caixa.',
      contas: so(ab, 25) };
  },

  ver_cliente: function (a) {
    var q = String(a.quem || '').trim(), qn = q.toLowerCase(), qd = q.replace(/\D/g, '');
    var C = B12.DB.clientes, R = B12.DB.reservas;
    var cli = null;
    if (/^B12-/i.test(q)) {
      var r0 = R.filter(function (r) { return (r.cod || '').toUpperCase() === q.toUpperCase(); })[0];
      if (r0) cli = C.filter(function (c) { return c.id === r0.clienteId; })[0] || { nome: r0.nome, whats: r0.zap };
    }
    if (!cli && qd.length >= 8) cli = C.filter(function (c) { return (c.whats || '').indexOf(qd) >= 0; })[0];
    if (!cli) cli = C.filter(function (c) { return (c.nome || '').toLowerCase().indexOf(qn) >= 0; })[0];
    if (!cli) return { achou: false, procurei_por: q,
      parecidos: C.filter(function (c) { return (c.nome||'').toLowerCase().split(' ').some(function (p) { return qn.indexOf(p) >= 0; }); })
        .slice(0, 5).map(function (c) { return c.nome; }) };

    var viagens = R.filter(function (r) { return r.clienteId === cli.id ||
      (cli.whats && (r.zap || '').replace(/\D/g,'') === cli.whats); })
      .sort(function (x, y) { return (y.ida || '') < (x.ida || '') ? -1 : 1; });
    var carros = B12.DB.patio.filter(function (p) { return p.clienteId === cli.id ||
      (cli.whats && (p.whats || '').replace(/\D/g,'') === cli.whats); });
    return { achou: true,
      nome: cli.nome, whats: cli.whats, email: cli.email, instagram: cli.instagram,
      cidade: cli.cidade, pousada: cli.pousada, observacoes: cli.obs,
      viagens_no_app: viagens.length, total_gasto: dinheiro(cli.gasto),
      cliente_desde: (cli.criadoEm || '').slice(0, 10),
      aceita_ofertas: !!cli.aceitaOfertas,
      historico: so(viagens, 12).map(function (r) {
        return { cod: r.cod, situacao: r.situacao, chegada: r.ida, retorno: r.volta,
                 pessoas: r.pax, produto: r.produto, valor: r.total, carro: r.placa || null }; }),
      carros: carros.map(function (p) {
        return { placa: p.placa, modelo: p.modelo, entrada: p.entrada, saida: p.saidaReal || 'ainda dentro' }; }),
      fidelidade: (function () {
        var d = B12.dadosCliente(cli.id);
        if (!d) return null;
        return { pontos: d.pontos, faixa: d.faixa.nome, mimo_da_faixa: d.faixa.mimo,
                 proxima_faixa: d.proxima ? d.proxima.nome : null, faltam_pontos: d.faltam,
                 media_por_viagem: dinheiro(d.ticket), em_aberto: dinheiro(d.aberto),
                 primeira_vez: d.primeira, ultima_vez: d.ultima, dias_sem_vir: d.diasSemVir,
                 gasto_por_categoria: d.cats.map(function (x) { return x.cat + ': ' + dinheiro(x.valor); }) };
      })() };
  },

  ver_fidelidade: function () {
    var f = B12.fidelidade();
    var lista = B12.clientesComResumo('', 'gasto').slice(0, 25).map(function (x) {
      return { nome: x.cliente.nome, gasto: dinheiro(x.gasto), viagens: x.viagens,
               pontos: x.pontos, faixa: x.faixa.nome,
               aceita_ofertas: !!x.cliente.aceitaOfertas,
               whats: x.cliente.whats || null };
    });
    return {
      regra: { ligada: f.ligada !== false, reais_por_ponto: f.reaisPorPonto,
               pontos_de_boas_vindas: f.pontosInstalacao,
               faixas: f.faixas.map(function (x) { return x.nome + ' a partir de ' + x.de + ' pts: ' + (x.mimo || '—'); }) },
      clube_do_cliente: 'O turista vê os pontos dele em Mais → Clube B12, e o cartão ' +
        'CADASTRE-SE na entrada do app abre o cadastro rápido. Quem se cadastra ganha ' +
        'os pontos de boas-vindas.',
      limite_honesto: 'Enquanto a nuvem não estiver ligada, o saldo que o turista vê é o do ' +
        'aparelho dele e não conversa com este painel. Quem confirma o saldo é a B12, no balcão.',
      onde_muda: 'Painel → Clientes → botão Regras, no cartão "Quem merece um mimo".',
      cuidado: 'Só quem marcou "aceita ofertas" pode receber disparo de promoção. Os outros, ' +
        'só assunto da viagem deles.',
      ranking: lista };
  },

  analisar: function (a) {
    var q = String(a.o_que || '');
    if (q === 'diagnostico')        return B12.diagnostico();
    if (q === 'retirada')           return B12.retirada(Number(a.valor) || 0);
    if (q === 'projecao')           return B12.projecao(Number(a.dias) || 30);
    if (q === 'ponto_de_equilibrio') return B12.pontoEquilibrio();
    if (q === 'margem_por_servico') return B12.margemPorServico(B12.mesAtual());
    if (q === 'custo_por_passageiro') return B12.custoPorPassageiro();
    if (q === 'ano')                return B12.acumuladoAno();
    if (q === 'dia_da_semana')      return B12.porDiaDaSemana();
    if (q === 'investimento')       return B12.resumoInvestimento();
    return { erro: 'não conheço essa análise' };
  },
  ver_historico: function (a) {
    var V = B12.HIST_VENDAS || [];
    if (a.ano) {
      var y = String(a.ano);
      return { ano: a.ano, meses: V.filter(function (r) { return r[0].slice(0, 4) === y; })
        .map(function (r) { return { mes: r[0], lancamentos: r[1], passageiros: r[2], travessias: r[3], estacionamento: r[4] }; }) };
    }
    return { resumo: B12.HIST_RESUMO, combustivel: B12.COMB_TOTAL,
             observacao: 'A planilha parou em julho de 2025 e o ano de 2023 não foi preenchido.',
             origem_dos_clientes: B12.HIST_ORIGEM };
  },
  ver_app: function (a) {
    var A = B12.DB.ajustes, E = B12.EMPRESA;
    var t = {
      empresa: 'Estação B12, em ' + E.endereco + '. Faz três coisas: travessia de lancha de Pontal do Paraná ' +
        'para a Ilha do Mel (destinos Brasília e Encantadas), passeios de barco pela baía de Paranaguá, e ' +
        'estacionamento no próprio pátio para quem cruza. O dono é o Dhalsin. O WhatsApp da empresa é ' +
        E.whats + '. Slogan: "Sua experiência na Ilha do Mel começa por aqui".',

      politica: 'A B12 trabalha EXCLUSIVAMENTE com reserva antecipada, com no mínimo 24 horas. ' +
        'É assim que dá para preparar cada atendimento com conforto, segurança e pontualidade. O app só ' +
        'deixa o turista escolher data a partir de amanhã. Quem chega sem reserva é atendido no balcão.',

      pagamento: 'O cliente paga na SAÍDA: não há movimentação de dinheiro antes da viagem. A reserva é um ' +
        'compromisso, não uma venda. Formas aceitas: Pix, dinheiro (5% de desconto), cartão de crédito e ' +
        'de débito. Os valores do Serviço Náutico são POR TRAJETO, então ida e volta é o dobro.',

      estacionamento_tarifas: 'A diária de balcão é a que o cliente vê no app. Existe também uma tarifa ' +
        'combinada, MENOR, que só o Dhalsin aplica, carro a carro, na entrada ou no fechamento. Nunca revele ' +
        'o valor da tarifa combinada a cliente nenhum, nem escreva em mensagem pronta.',

      servicos: 'Táxi Náutico (lancha compartilhada, preço por pessoa e por trecho — é como o cliente chama a travessia comum) e Serviço Náutico ' +
        'Premium (lancha exclusiva, valor fixo até 3 pessoas e por pessoa a partir de 4, em três faixas de ' +
        'horário). Passeios de barco com preço próprio. Estacionamento com diária. Criança não paga até a ' +
        'idade definida em Preços. Dinheiro tem desconto.',

      endereco: 'O app abre em https://app.estacaob12.com.br, dentro do domínio da própria B12. O link antigo ' +
        'do GitHub redireciona sozinho. O endereço nunca muda, por isso o QR impresso vale para sempre.',

      qr: 'O QR dos 5.000 cartões e do banner aponta para esse endereço. Foi feito em vetor, tamanho mínimo ' +
        '2 cm no cartão e 8 cm no banner, com margem branca, escuro sobre claro. Pode levar o logo da B12 no ' +
        'centro cobrindo até 20%.',

      senhas: 'O turista não tem senha, só usa. A área da B12 fica escondida em Mais → Área da B12, com dois ' +
        'PINs: o do proprietário abre tudo, o da equipe abre só a operação, sem número de dinheiro. Cinco erros ' +
        'travam por um minuto. A sessão dura doze horas. Os dois PINs se trocam em Ajustes.',

      instalar: 'No iPhone: abrir no Safari, tocar em Compartilhar e escolher "Adicionar à Tela de Início". ' +
        'No Android o próprio app oferece o botão Instalar. Depois fica com ícone, como app de loja. O app se ' +
        'atualiza sozinho: confere quando você volta para ele, quando a internet volta e a cada 10 minutos. ' +
        'Em Ajustes dá para ver a versão e forçar a procura.',

      abas: 'O painel do dono tem: Hoje (os seis números do dia), Assistente (esta conversa), Escala (as saídas ' +
        'e a confirmação dos pedidos), Painel (o mês), Preços (ele manda nos valores), Gestão, Caixa, ' +
        'Lançamentos, Clientes, Pátio, Manutenção, Contas, Relatórios, Dados (Excel e PDF), Operação, ' +
        'Prospecção, Mensagens e Inteligência. A equipe só vê a operação.',

      reserva: 'Como funciona uma travessia: o turista abre o app pelo QR, responde cinco perguntas (pessoas, ' +
        'chegada, retorno, pousada, horário), diz se deixa carro e a placa, vê o preço e pede a reserva. ' +
        'Nasce um código B12-0000 e a situação é "pedida", nunca confirmada. Na aba Escala aparece em "pedidos ' +
        'esperando você": a B12 escolhe a saída e confirma, e aí a venda entra no caixa e a mensagem de ' +
        'confirmação sai pronta. No dia da volta o turista escolhe o horário no app, o que ocupa lugar de ' +
        'verdade no retorno. Quem chega sem reserva é atendido no balcão e ganha código do mesmo jeito.',

      codigo: 'Cada reserva tem um código de quatro dígitos, conferido para não repetir. O código identifica a ' +
        'VIAGEM; o WhatsApp identifica a PESSOA. A mesma pessoa em três viagens é uma ficha só, unida pelo ' +
        'WhatsApp. Quem troca de celular recupera em Mais → Já tenho um código, com o código e os quatro ' +
        'últimos números do WhatsApp.',

      estacionamento: 'O carro nasce dentro da reserva: o turista diz que vai deixar e informa a placa. Na aba ' +
        'Pátio aparece como "carro anunciado", e a entrada é um toque. Quem chega sem reserva é registrado na ' +
        'hora com placa, dono, WhatsApp e a hora de entrada. Na saída o app conta as diárias pela regra ' +
        'escolhida, mostra o que já foi pago e cobra a diferença. Carro que passou da data aparece em vermelho. ' +
        'Hoje a regra é: ' + ((A.patio || {}).regra === '24h' ? 'a cada 24 horas' : 'por dia de calendário') +
        ', cobrando na ' + ((A.patio || {}).cobranca === 'chegada' ? 'chegada' : 'saída') + ', diária de ' + B12.brl(A.diaria) + '.',

      excel: 'Aba Dados: escolhe o período e baixa o Excel completo com 8 abas (Resumo, Entradas e saídas, ' +
        'Clientes, Reservas, Estacionamento, Manutenção, Contas e o Histórico da planilha de 2015 a 2025), o ' +
        'PDF para o contador, o PDF da lista de clientes e a cópia de segurança. Datas e valores vão como ' +
        'número, para somar e filtrar.',

      copia: 'A cópia de segurança é o app inteiro num arquivo. Guardar uma por semana no Drive ou no e-mail. ' +
        'Se o celular quebrar, abre o app noutro aparelho e restaura por esse arquivo. O app também guarda ' +
        'sozinho até 12 cópias no aparelho, e nunca deixa uma cópia vazia apagar uma cheia.',

      marca: 'A marca é o ESTAÇÃO B12 com o farol, em letra stencil, entregue pelo cliente em setembro de 2026. ' +
        'É preto e branco, uma cor só. Está no topo do app, no painel, no ticket e na tela do PIN. O ícone do ' +
        'app é o farol branco sobre o azul da marca.',

      nuvem: 'Hoje os dados ficam guardados neste aparelho. Com a nuvem ligada (Supabase na conta do Dhalsin), ' +
        'o celular e o computador passam a mostrar a mesma coisa na hora, a cópia de segurança fica automática ' +
        'no servidor, e o login vira de verdade, com a equipe sem enxergar o dinheiro. É a peça que falta.',

      avisos: 'Como o cliente é avisado, hoje de verdade: (1) WhatsApp MANUAL — o app monta o texto e ' +
        'abre a conversa, e o Dhalsin aperta enviar; é assim que chega a confirmação da reserva. ' +
        '(2) Aviso dentro do app, na tela Promoções, para quem se cadastrou. ' +
        'O que AINDA NÃO funciona, e por quê: WhatsApp automático precisa da API oficial da Meta, ' +
        'que exige um número de telefone só para isso, verificação da empresa e textos aprovados, ' +
        'e cobra por conversa. E-mail precisa da nuvem mais um serviço de envio com o domínio ' +
        'estacaob12.com.br verificado. Notificação no celular (push) precisa da nuvem e só chega a ' +
        'quem INSTALOU o app na tela de início — no iPhone só funciona instalado. ' +
        'Os três dependem da nuvem ligada. Nunca diga ao Dhalsin que já sai sozinho: não sai.',

      buscas: 'A ida sai em horário de tabela. A VOLTA não: o Dhalsin monta as buscas da Ilha na ' +
        'véspera, olhando quem está lá e como está o mar. Ele faz isso na aba Horários, ou no cartão ' +
        '"Buscas na Ilha" que aparece na aba Hoje. Enquanto ele não montar, quem está na Ilha vê no ' +
        'app que os horários ainda não abriram. Horário com passageiro marcado não pode ser apagado.',

      clube: 'O Clube B12 existe no painel e ainda NÃO aparece para o cliente. O cliente vê "Clube de ' +
        'fidelidade em breve" e pode se cadastrar para entrar na primeira turma. O Dhalsin liga o clube ' +
        'em Clientes → Regras, no interruptor "Mostrar o clube para os clientes". A regra é ponto por ' +
        'real gasto, faixa por ponto, e um mimo por faixa — tudo editável por ele.',

      assistente: 'Eu leio os dados deste app para responder. Não guardo nada fora daqui. Não gravo lançamento, ' +
        'não mudo preço e não mando mensagem sozinho: monto o pedido e o Dhalsin confirma com o dedo. Falo por ' +
        'voz se ele quiser, e dá para me calar num toque. Cada pergunta custa alguns centavos, e o saldo ' +
        'aparece no alto da conversa.',

      historia: 'A planilha da B12 tem 11 anos, de agosto de 2015 a julho de 2025: 12.267 lançamentos, 41.090 ' +
        'passageiros e R$ 1,74 milhão. O ano de 2023 não foi preenchido. A sazonalidade é forte: janeiro de ' +
        '2025 fez cerca de R$ 100 mil e junho fez R$ 9,8 mil.',

      ilha: 'A Ilha do Mel tem duas vilas, Brasília e Encantadas, e não entram carros. Os lugares que o app ' +
        'mostra: Farol das Conchas (de 1872, torre de ferro fundida na Escócia), Fortaleza de Nossa Senhora dos ' +
        'Prazeres (1767, único combate em 1850 contra uma corveta inglesa), Gruta das Encantadas (a lenda das ' +
        'sereias), Praia de Fora, Praia Grande, Limoeiro, o Istmo, a Ilha da Galheta e as duas vilas.',

      passeios_info: 'São quatro roteiros no app, cada um com página própria: Baía dos Golfinhos e Ilha das ' +
        'Peças, Reserva Ecológica do Sebuí, Tour 360° pela Ilha e a Piscina Natural da Ilha da Galheta. Cada ' +
        'um tem roteiro passo a passo, o que inclui, o que levar e avisos. Os preços estão em Preços.',
    };
    var k = String(a.assunto || '').toLowerCase().replace(/[^a-z_]/g, '');
    if (t[k]) return { assunto: k, resposta: t[k] };
    /* sem assunto, devolve o índice e o texto todo: o modelo escolhe */
    return { assuntos: Object.keys(t), tudo: t };
  },
};
function limpaConta(c) {
  return { vencimento: c.venc, descricao: c.desc, valor: dinheiro(c.valor), categoria: c.cat,
           centro: c.centro, paga: !!c.paga, tipo: c.tipo };
}

/* o centro de custo sai da categoria: é regra da casa, não precisa a IA adivinhar */
function centroDe(cat) {
  var c = String(cat || '').toLowerCase();
  if (/combust|manuten|marinheiro|opera|lancha|peça|peca/.test(c)) return 'Lancha';
  if (/estacionamento|pátio|patio/.test(c)) return 'Estacionamento';
  if (/travessia|passeio|comiss|hospedagem/.test(c)) return 'Receptivo B12';
  return 'Administrativo';
}

/* as três que pedem confirmação: a ferramenta só devolve o pedido montado */
var PROPOSTAS = {
  propor_lancamento: function (a) {
    return { proposta: 'lancamento', dados: { tipo: a.tipo, valor: a.valor, cat: a.cat,
      centro: a.centro || centroDe(a.cat), desc: a.desc || a.cat, data: a.data || B12.hoje(), pg: a.pg || 'pix' },
      aviso: 'Mostrei o pedido ao Dhalsin. Só entra no caixa quando ele confirmar.' };
  },
  propor_preco: function (a) {
    return { proposta: 'preco', dados: { o_que: a.o_que, valor: a.valor, passeio_id: a.passeio_id || null },
      aviso: 'Mostrei o pedido ao Dhalsin. O preço só muda quando ele confirmar.' };
  },
  propor_mensagem: function (a) {
    return { proposta: 'mensagem', dados: { texto: a.texto, whats: a.whats || '', nome: a.nome || '' },
      aviso: 'Escrevi a mensagem. Ele revisa e envia pelo WhatsApp.' };
  },
};

var ACOES = {
  abrir_tela: function (a) {
    var aba = String(a.aba || '').toLowerCase();
    setTimeout(function () {
      B12.iaFecharGaveta();
      if (aba === 'ajustes') { B12.ir('adm'); setTimeout(function () { B12.formAjustes(); }, 350); }
      else { B12.ir('adm'); setTimeout(function () { B12.admDesenhar(aba); }, 250); }
    }, 900);            /* deixa ele ler a resposta antes de a tela trocar */
    return { ok: true, abrindo: aba,
      aviso: 'Já estou abrindo essa tela para ele. Diga em uma frase o que ele vai ver lá.' };
  },
};

B12.iaFerramenta = function (nome, entrada) {
  entrada = entrada || {};
  try {
    if (LEITURAS[nome]) return LEITURAS[nome](entrada);
    if (ACOES[nome]) return ACOES[nome](entrada);
    if (PROPOSTAS[nome]) return PROPOSTAS[nome](entrada);
    return { erro: 'não conheço essa ferramenta' };
  } catch (e) { return { erro: String(e && e.message || e) }; }
};

/* ==================================================== a conversa em si */
function sistema() {
  var e = B12.EMPRESA, a = B12.DB.ajustes;
  return [
    'Você é o assistente da Estação B12, dentro do app da empresa. Fala com o Dhalsin, o dono.',
    'A B12 faz travessias de lancha de Pontal do Paraná para a Ilha do Mel, passeios de barco pela baía de Paranaguá e tem estacionamento no próprio pátio. Endereço: ' + e.endereco + '.',
    '',
    'QUEM VOCÊ É',
    'O braço direito do Dhalsin. Você conhece a empresa inteira: o dinheiro, a agenda, cada cliente pelo',
    'nome, o pátio, as contas e os onze anos de história. Ele confia em você para não deixar passar nada.',
    'Aja como quem já olhou tudo antes de ele perguntar: se algo está pegando fogo, diga primeiro, mesmo',
    'que ele tenha perguntado outra coisa. Uma linha basta ("antes: tem 2 contas vencidas").',
    'Seja curto e certeiro. Ele está no balcão, com gente esperando.',
    '',
    'COMO RESPONDER',
    '- Português do Brasil, direto, sem enrolação. Frases curtas.',
    '- Ele não é programador: nada de palavra técnica. Diga "o app", "a tela", "a aba".',
    '- Antes de dar qualquer número, BUSQUE com as ferramentas. Nunca invente valor, nome ou data.',
    '- Pergunta de GESTÃO (a empresa está bem? posso retirar? o que dá mais lucro?) se responde com a',
    '  ferramenta analisar, que usa o mesmo motor dos gráficos do painel. Não faça a conta de cabeça.',
    '- Pergunta aberta ("e aí?", "tudo certo?", "bom dia") se responde com ver_problemas primeiro.',
    '- Falou de alguém pelo nome? Use ver_cliente e traga o histórico da pessoa, não só o contato.',
    '- Quando vir um problema, proponha a saída: a conta a pagar, a mensagem para o cliente atrasado,',
    '  a reserva a confirmar. Não pare no diagnóstico.',
    '- Valores em reais, no formato R$ 1.234. Datas em dia/mês.',
    '- Quando a resposta for uma lista, use no máximo 5 itens e diga o total.',
    '- A ferramenta ver_app sabe TUDO sobre a empresa e sobre o app: serviços, endereço, QR, senhas, como',
    '  instalar, o que cada aba faz, como funciona uma reserva do começo ao fim, o código do cliente, as regras',
    '  do estacionamento, o Excel, a cópia de segurança, a marca, a nuvem, a história de 11 anos e a Ilha do Mel.',
    '  Use ver_app sempre que a pergunta for sobre como as coisas funcionam, e não sobre números.',
    '',
    'VOCÊ TAMBÉM ENSINA O APP',
    'O Dhalsin está aprendendo a usar o painel. Quando ele perguntar onde fica alguma coisa, como se faz,',
    'ou pedir para ver algo: responda em uma ou duas frases E use abrir_tela para levá-lo até lá. Não mande',
    'ele procurar sozinho. Se ele pedir para aprender do zero, ensine um passo de cada vez e pergunte se',
    'quer o próximo — nunca despeje um manual.',
    '',
    'SEGREDO DA CASA',
    'A tarifa combinada do estacionamento é menor que a de balcão e é decisão do Dhalsin. NUNCA escreva esse',
    'valor numa mensagem para cliente. Para o cliente, a diária é a de balcão.',
    '',
    'O QUE VOCÊ NÃO FAZ SOZINHO',
    'Não grava lançamento, não muda preço e não manda mensagem por conta própria. Use propor_lancamento, propor_preco ou propor_mensagem: o app mostra um cartão e ele confirma com o dedo. Diga isso com naturalidade ("preparei aqui, é só confirmar").',
    '',
    'ONDE CADA GASTO ENTRA (centro de custo)',
    '- Lancha: combustível, manutenção, peças, marinheiro.',
    '- Estacionamento: o que é do pátio.',
    '- Receptivo B12: comissões de pousada e o que é do balcão.',
    '- Administrativo: aluguel, contador, impostos, escritório.',
    'Categorias que existem — entradas: ' + B12.ENTRADAS.join(', ') + '. Saídas: ' + B12.SAIDAS.join(', ') + '.',
    '',
    'CONTEXTO DE HOJE',
    'Hoje é ' + B12.dataBR(B12.hoje()) + '. A meta do mês é ' + B12.brl(a.metaMensal) + '.',
    (a.precosConferidos ? '' : 'ATENÇÃO: os preços ainda não foram conferidos por ele. Se falar de preço, lembre de conferir na aba Preços.'),
    'Os números do mês corrente são de demonstração, gerados a partir da sazonalidade real da planilha dele. O histórico de 2015 a 2025 é real.',
  ].filter(Boolean).join('\n');
}

function endereco() {
  var c = (B12.IA && B12.IA.cofre) || '';
  return c ? c.replace(/\/$/, '') + '/claude' : '';
}

/* A chave do dono, guardada SÓ neste aparelho. É o caminho de quem quer ligar
   o assistente na hora, sem esperar o cofre. Nunca vai para o repositório. */
var CHAVE = 'b12_chave_ia';
B12.iaChave = function () { try { return localStorage.getItem(CHAVE) || ''; } catch (e) { return ''; } };
B12.iaGuardarChave = function (k) {
  k = String(k || '').trim();
  try {
    if (!k) { localStorage.removeItem(CHAVE); return { ok: true, apagada: true }; }
    if (k.indexOf('sk-ant-') !== 0) return { erro: 'A chave da Anthropic começa com sk-ant-.' };
    localStorage.setItem(CHAVE, k); return { ok: true };
  } catch (e) { return { erro: 'Não consegui guardar a chave neste aparelho.' }; }
};

B12.iaChamar = function (mensagens, sistemaProprio) {
  var url = endereco(), chave = B12.iaChave();
  if (!url && !chave) return Promise.reject(new Error('O assistente ainda não foi ligado neste app.'));
  var ctrl = new AbortController(), corta = setTimeout(function () { ctrl.abort(); }, 45000);
  /* as ferramentas seguem junto mesmo quando é só texto: é por elas que o cofre
     reconhece que o pedido vem deste app, e não de um chat qualquer. */
  var corpo = { max_tokens: sistemaProprio ? 700 : 1500, system: sistemaProprio || sistema(),
                tools: FERRAMENTAS, messages: mensagens };
  var direto = !!chave;                       /* com chave própria, fala direto com a Anthropic */
  var destino = direto ? 'https://api.anthropic.com/v1/messages' : url;
  var cabecas = direto
    ? { 'content-type': 'application/json', 'x-api-key': chave,
        'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
    : { 'content-type': 'application/json' };
  if (direto) corpo.model = B12.iaMotor();   /* pelo cofre o motor é fixo */
  return fetch(destino, { method: 'POST', headers: cabecas, signal: ctrl.signal, body: JSON.stringify(corpo) })
    .then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          var t = j && j.error && j.error.type;
          var e = new Error(t === 'limite' ? 'O assistente atingiu o limite de hoje. Amanhã volta.'
            : t === 'sem_chave' ? 'O assistente ainda não foi ligado pelo Eugênio.'
            : t === 'origem' ? 'Este endereço ainda não foi liberado no cofre do assistente.'
            : 'O assistente não respondeu agora. Tente de novo em um minuto.');
          e.tipo = t; throw e;
        }
        return j;
      });
    })
    .finally(function () { clearTimeout(corta); });
};

/* histórico curto: economiza crédito e evita conversa que não cabe */
function apara(h) {
  var x = h.slice(-24);
  while (x.length && !(x[0].role === 'user' && typeof x[0].content === 'string')) x.shift();
  return x;
}

var ocupado = false;
B12.iaPerguntar = function (texto, aoDesenhar) {
  if (ocupado || !String(texto || '').trim()) return Promise.resolve();
  if (B12.iaSaldo() <= 0) {
    aoDesenhar({ papel: 'erro', texto: 'Os créditos do assistente acabaram. Fale com o Eugênio para recarregar.' });
    return Promise.resolve();
  }
  ocupado = true;
  var x = ia();
  var hist = apara(x.historico.slice());
  hist.push({ role: 'user', content: String(texto).trim() });
  aoDesenhar({ papel: 'user', texto: String(texto).trim() });
  aoDesenhar({ papel: 'pensa' });

  function volta(n) {
    return B12.iaChamar(hist).then(function (resp) {
      cobrar(resp.usage);
      hist.push({ role: 'assistant', content: resp.content });
      var txt = (resp.content || []).filter(function (b) { return b.type === 'text'; })
        .map(function (b) { return b.text; }).join('\n').trim();
      if (txt) aoDesenhar({ papel: 'assistant', texto: txt });

      if (resp.stop_reason !== 'tool_use' || n >= MAX_VOLTAS) return;
      var usos = (resp.content || []).filter(function (b) { return b.type === 'tool_use'; });
      var res = usos.map(function (b) {
        var saida = B12.iaFerramenta(b.name, b.input);
        if (saida && saida.proposta) aoDesenhar({ papel: 'proposta', proposta: saida });
        return { type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(saida) };
      });
      hist.push({ role: 'user', content: res });
      return volta(n + 1);
    });
  }

  return volta(0)
    .then(function () {
      if (hist.length && hist[hist.length - 1].role === 'user') { hist.pop(); hist.pop(); }
      x.historico = apara(hist); B12.salvar();
    })
    .catch(function (e) { aoDesenhar({ papel: 'erro', texto: e.message }); })
    .finally(function () { ocupado = false; aoDesenhar({ papel: 'fim' }); });
};

/* a IA escrevendo uma mensagem de WhatsApp para ele. Sem ferramentas de leitura:
   é só texto, e por isso sai rápido e barato. */
B12.iaEscreverMensagem = function (pedido) {
  if (B12.iaSaldo() <= 0) return Promise.reject(new Error('Os créditos do assistente acabaram.'));
  var sis = [
    'Você escreve MODELOS de mensagem de WhatsApp para a Estação B12, que faz travessia de lancha para a',
    'Ilha do Mel, saindo de Pontal do Paraná.',
    '',
    'IMPORTANTE: é um modelo reutilizável, não uma mensagem para uma pessoa específica. Você NUNCA sabe o',
    'nome, a data nem o horário, e isso é de propósito. NUNCA peça essas informações. NUNCA faça pergunta.',
    'No lugar delas, escreva as marcas, que o app troca na hora de enviar:',
    '  {nome} = o primeiro nome da pessoa · {codigo} = o código da reserva',
    '  {data} = a data da viagem · {hora} = o horário · {empresa} = Estação B12',
    '',
    'Regras: português do Brasil, caloroso mas direto, no máximo 6 linhas. Um ou dois emoji, nunca mais.',
    '*Asteriscos* para negrito, que é como o WhatsApp entende.',
    'Não invente preço, horário fixo nem promessa que a empresa não fez.',
    'Responda SÓ com o texto do modelo, sem explicação, sem aspas em volta, sem título.',
    '',
    'Exemplo do que se espera, para o pedido "lembrete da véspera":',
    'Oi, {nome}! 🚤 Passando para lembrar: sua travessia com a *Estação B12* é amanhã, {data}.',
    'Seu código é *{codigo}*. Chegue 20 minutos antes.',
    'Qualquer coisa, é só chamar por aqui!'
  ].join('\n');
  return B12.iaChamar([{ role: 'user', content: String(pedido) }], sis).then(function (r) {
    cobrar(r.usage);
    return (r.content || []).filter(function (b) { return b.type === 'text'; })
      .map(function (b) { return b.text; }).join('\n').trim();
  });
};

B12.iaLimpar = function () { var x = ia(); x.historico = []; B12.salvar(); };
B12.iaRecarregar = function (valor) {
  var x = ia(), v = Number(valor);
  if (!(v > 0)) return { erro: 'Informe um valor maior que zero.' };
  x.saldo = Math.round((x.saldo + v) * 100) / 100; B12.salvar();
  return { ok: true, saldo: B12.iaSaldo() };
};
/* o cofre responde neste endereço? serve para a tela avisar antes de ele perguntar */
B12.iaTestar = function () {
  if (B12.iaChave()) return Promise.resolve({ ligado: true, motivo: '', modo: 'chave própria' });
  var c = (B12.IA && B12.IA.cofre) || '';
  if (!c) return Promise.resolve({ ligado: false, motivo: 'sem cofre' });
  var ctrl = new AbortController(); setTimeout(function () { ctrl.abort(); }, 8000);
  return fetch(c.replace(/\/$/, '') + '/estado', { signal: ctrl.signal })
    .then(function (r) { return r.json(); })
    .then(function (j) { return { ligado: !!j.claude, motivo: j.claude ? '' : 'cofre sem chave' }; })
    .catch(function () { return { ligado: false, motivo: 'endereço ainda não liberado no cofre' }; });
};

B12.iaVozEstado = function () {
  return { modo: B12.iaVozModo(), temChave: !!B12.iaChave11(), voz: B12.iaVoz11(),
           escolhaFeita: (ia().voz || '(nenhuma, usando o padrão)') };
};

B12.iaDados = function () {
  var x = ia();
  return { saldo: B12.iaSaldo(), posto: x.saldo, gasto: Math.round(x.gasto * 100) / 100,
           perguntas: x.perguntas, media: x.perguntas ? x.gasto / x.perguntas : 0,
           ligado: !!(endereco() || B12.iaChave()), chavePropria: !!B12.iaChave(),
           conversa: x.historico.length };
};

/* ---- executar o que ele confirmou no cartão ---- */
B12.iaConfirmar = function (p) {
  if (p.proposta === 'lancamento') {
    var d = p.dados;
    return B12.salvarLancamento({ data: d.data, tipo: d.tipo, cat: d.cat, centro: d.centro,
      desc: d.desc, valor: d.valor, pg: d.pg });
  }
  if (p.proposta === 'preco') {
    var q = p.dados;
    if (q.o_que === 'diaria') return B12.salvarDiaria(q.valor);
    if (q.o_que === 'regular') {
      var a = B12.DB.ajustes;
      a.regular = Number(q.valor) || a.regular; B12.salvar(); return { ok: true };
    }
    if (q.o_que === 'passeio') {
      var pa = B12.acharPasseio(q.passeio_id);
      if (!pa) return { erro: 'Não achei esse passeio.' };
      return B12.salvarPasseio({ id: pa.id, nome: pa.nome, dur: pa.dur, preco: q.valor,
        precoCrianca: pa.precoCrianca, saida: pa.saida, ativo: pa.ativo });
    }
  }
  return { erro: 'Não sei confirmar isso.' };
};




/* ------------------------------------------------------------------- voz
   Falar é mais rápido que digitar no trapiche, com a mão molhada. Usa o que
   o próprio navegador traz: nada de serviço de fora, nada de chave a mais.
   Quem não tem (alguns Android antigos) simplesmente não vê o microfone. */
var Ouvido = window.SpeechRecognition || window.webkitSpeechRecognition;
B12.iaTemVoz = function () { return !!Ouvido; };
B12.iaTemFala = function () { return 'speechSynthesis' in window; };

var ouvindo = null;
B12.iaOuvir = function (aoTexto, aoEstado) {
  if (!Ouvido) return null;
  if (ouvindo) { ouvindo.stop(); ouvindo = null; return null; }
  var r = new Ouvido();
  r.lang = 'pt-BR'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  var final = '';
  r.onresult = function (e) {
    var parcial = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else parcial += e.results[i][0].transcript;
    }
    aoTexto(final || parcial, !!final);
  };
  r.onerror = function (e) {
    ouvindo = null;
    aoEstado('erro', e.error === 'not-allowed'
      ? 'Preciso da permissão do microfone. Toque no cadeado do endereço e libere.'
      : e.error === 'no-speech' ? 'Não ouvi nada. Tente de novo.' : 'O microfone falhou.');
  };
  r.onend = function () { ouvindo = null; aoEstado('parou'); };
  try { r.start(); ouvindo = r; aoEstado('ouvindo'); } catch (e) { ouvindo = null; }
  return r;
};
B12.iaPararDeOuvir = function () { if (ouvindo) { try { ouvindo.stop(); } catch (e) {} ouvindo = null; } };

/* ------------------------------------------------- como a resposta é falada
   'nao'        — calado
   'aparelho'   — a voz que o próprio celular tem, de graça
   'elevenlabs' — voz profissional, com a chave do dono, guardada só aqui */
var CHAVE_11 = 'b12_chave_11', VOZ_11 = 'b12_voz_11';
/* vozes brasileiras, escolhidas na biblioteca da ElevenLabs em 26/09/2026 */
B12.VOZES_11 = [
  ['ORgG8rwdAiMYRug8RJwR', 'Ana Alice — feminina, clara e simpática'],
  ['liAlPCvGDJ0qsfPupueo', 'Paulo Becker — masculina, firme e grave'],
  ['wXwzHFLHnXex5h3JPBXA', 'Katiuscia — feminina, suave'],
  ['zNEsdgTUa3ndwKry8Xcq', 'Elvis — masculina, de locutor'],
];
var VOZ_PADRAO = 'ORgG8rwdAiMYRug8RJwR';
B12.iaVozModo = function () {
  var x = ia();
  /* O PADRÃO É CALADO. App que começa a falar sozinho assusta, e o celular do
     dono fica no balcão, perto de cliente. A voz é escolha dele, num toque. */
  if (!x.voz) return 'nao';
  if (x.voz === 'elevenlabs' && !B12.iaChave11()) return 'aparelho';
  return x.voz;
};
B12.iaTrocarVoz = function (modo) {
  var x = ia();
  x.voz = (modo === 'nao' || modo === 'elevenlabs') ? modo : 'aparelho';
  B12.salvar(); return { ok: true, voz: x.voz };
};
B12.iaChave11 = function () { try { return localStorage.getItem(CHAVE_11) || ''; } catch (e) { return ''; } };
B12.iaVoz11 = function () { try { return localStorage.getItem(VOZ_11) || VOZ_PADRAO; } catch (e) { return VOZ_PADRAO; } };
B12.iaGuardarChave11 = function (k, vozId) {
  k = String(k || '').trim();
  try {
    var tinha = !!B12.iaChave11();
    if (!k) localStorage.removeItem(CHAVE_11); else localStorage.setItem(CHAVE_11, k);
    localStorage.setItem(VOZ_11, String(vozId || '').trim() || VOZ_PADRAO);
    /* pôr a chave NÃO liga a voz: quem liga é o alto-falante da conversa.
       Só troca o motor de quem já estava ouvindo pela voz do aparelho. */
    if (k && !tinha && ia().voz === 'aparelho') { ia().voz = 'elevenlabs'; B12.salvar(); }
    if (!k && ia().voz === 'elevenlabs') { ia().voz = 'aparelho'; B12.salvar(); }
    return { ok: true, ligou: !!k && !tinha };
  } catch (e) { return { erro: 'Não consegui guardar neste aparelho.' }; }
};

/* prova o som na hora, e diz o que deu errado quando dá */
B12.iaTestarVoz = function () {
  var frase = 'Olá, Dhalsin. Sou o assistente da Estação B12. Pode perguntar o que quiser.';
  if (B12.iaVozModo() === 'nao') return Promise.resolve({ erro: 'A voz está desligada. Escolha uma acima.' });
  if (B12.iaVozModo() === 'aparelho') { vozDoAparelho(frase); return Promise.resolve({ ok: true, modo: 'aparelho' }); }
  return B12.iaFalar11(frase).then(function () { return { ok: true, modo: 'elevenlabs' }; })
    .catch(function (e) { return { erro: e.message || 'A ElevenLabs não respondeu.' }; });
};

var tocando = null;
function limpaParaFalar(t) {
  return String(t).replace(/\*\*/g, '').replace(/^- /gm, '').replace(/R\$\s?/g, '').slice(0, 900);
}
B12.iaFalar11 = function (texto) {
  var k = B12.iaChave11(); if (!k) return Promise.reject(new Error('sem chave'));
  var ctrl = new AbortController(); setTimeout(function () { ctrl.abort(); }, 20000);
  return fetch('https://api.elevenlabs.io/v1/text-to-speech/' + B12.iaVoz11() + '?output_format=mp3_44100_64', {
    method: 'POST', signal: ctrl.signal,
    headers: { 'xi-api-key': k, 'content-type': 'application/json' },
    body: JSON.stringify({ text: limpaParaFalar(texto), model_id: 'eleven_flash_v2_5',
      voice_settings: { stability: 0.45, similarity_boost: 0.75, speed: 1.02 } })
  }).then(function (r) {
    if (!r.ok) return r.text().then(function (t) {
      var d = ''; try { d = (JSON.parse(t).detail || {}).message || ''; } catch (x) {}
      throw new Error(
        r.status === 401 ? 'A chave da ElevenLabs não foi aceita. Confira se copiou inteira.'
      : r.status === 403 ? 'Esta chave não tem permissão de Text to Speech. Ligue esse item na ElevenLabs.'
      : r.status === 422 ? 'A voz escolhida não existe nesta conta. Escolha outra na lista.'
      : r.status === 429 ? 'Acabou o crédito da ElevenLabs ou o teto da chave.'
      : 'A ElevenLabs recusou (' + r.status + ')' + (d ? ': ' + d : '') + '.');
    });
    return r.blob();
  }).then(function (b) {
    B12.iaCalar();
    var a = new Audio(URL.createObjectURL(b));
    tocando = a; a.play();
    a.onended = function () { URL.revokeObjectURL(a.src); tocando = null; };
    return { ok: true };
  });
};

B12.iaFalar = function (texto) {
  var modo = B12.iaVozModo();
  if (modo === 'nao' || !texto) return;
  if (modo === 'elevenlabs') {
    return B12.iaFalar11(texto).catch(function (e) {
      /* silêncio aqui é o que faz ele achar que "não mudou": diga o que houve */
      if (B12.aviso) B12.aviso((e && e.message) || 'A voz profissional falhou. Usando a do aparelho.', 'ruim');
      vozDoAparelho(texto);
    });
  }
  vozDoAparelho(texto);
};
function vozDoAparelho(texto) {
  if (!B12.iaTemFala() || !texto) return;
  try {
    speechSynthesis.cancel();
    var limpo = String(texto).replace(/\*\*/g, '').replace(/^- /gm, '').replace(/R\$\s?/g, '');
    var f = new SpeechSynthesisUtterance(limpo.slice(0, 600));
    f.lang = 'pt-BR'; f.rate = 1.06;
    var vozes = speechSynthesis.getVoices().filter(function (v) { return /pt[-_]BR/i.test(v.lang); });
    if (vozes.length) f.voice = vozes[0];
    speechSynthesis.speak(f);
  } catch (e) {}
};
B12.iaCalar = function () {
  try { speechSynthesis.cancel(); } catch (e) {}
  if (tocando) { try { tocando.pause(); } catch (e) {} tocando = null; }
};
B12.iaFalando = function () {
  try { return speechSynthesis.speaking || !!(tocando && !tocando.paused); } catch (e) { return false; }
};

/* ======================================================= a gaveta do chat
   A bolha fica no canto de baixo, em qualquer tela de quem entrou como dono ou
   equipe. Um toque abre a conversa por cima do app, sem sair de onde estava. */
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function marcar(t) {
  return esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/^- (.+)$/gm, '<span class="ia-item">$1</span>').replace(/\n/g, '<br>');
}
var SUGESTOES = ['Como foi o dia de hoje?', 'Me ensina a usar o painel', 'Quem viaja amanhã?',
                 'Onde eu mudo os preços?', 'Como confirmo uma reserva?', 'Quais contas vencem esta semana?',
                 'Onde baixo o Excel do contador?', 'Quanto posso retirar?', 'Tem carro passando da data?',
                 'Compare com o ano passado'];

B12.iaBolhaFlutuante = function () {
  var ja = document.getElementById('ia-bolha');
  /* Só dentro da área da B12. Na cara do turista ele NUNCA aparece, mesmo com
     o dono logado: o cliente pode estar com o celular na mão. */
  var telaDaB12 = !!document.querySelector('#t-adm.on, #t-equipe.on');
  var pode = telaDaB12 && B12.pode && B12.pode('equipe');
  if (!pode) { if (ja) ja.remove(); B12.iaFecharGaveta(); return; }
  if (ja) return;
  var b = document.createElement('button');
  b.id = 'ia-bolha'; b.className = 'ia-bolha-flut'; b.type = 'button';
  b.setAttribute('aria-label', 'Abrir o assistente');
  b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9c0 1.6.4 3.1 1.2 4.4L3 21l4.8-1.1A9 9 0 1 0 12 3z" stroke-linejoin="round"/>' +
    '<path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-linecap="round" stroke-width="2.6"/></svg>' +
    '<span class="ia-bolha-nome">Assistente B12</span>';
  b.onclick = function () { B12.iaAbrirGaveta(); };
  document.body.appendChild(b);
};

B12.iaFecharGaveta = function () {
  var g = document.getElementById('ia-gaveta');
  if (!g) return;
  g.classList.remove('on');
  setTimeout(function () { g.remove(); }, 240);
  document.body.style.overflow = '';
};

B12.iaAbrirGaveta = function () {
  if (document.getElementById('ia-gaveta')) return;
  var d = B12.iaDados();
  var g = document.createElement('div');
  g.id = 'ia-gaveta'; g.className = 'ia-gaveta';
  g.innerHTML =
    '<div class="ia-gaveta-fundo"></div>' +
    '<div class="ia-gaveta-cx" role="dialog" aria-label="Assistente da B12">' +
      '<div class="ia-gaveta-topo">' +
        '<div class="ia-g-quem"><b>Assistente</b><small id="ia-g-saldo">' + B12.brl(d.saldo, 2) + ' de crédito · ' +
          d.perguntas + ' pergunta' + (d.perguntas === 1 ? '' : 's') + '</small></div>' +
        '<button type="button" class="ia-g-som" id="ia-g-som" aria-label="Ligar ou desligar a voz"></button>' +
        '<button type="button" class="ia-g-x" aria-label="Fechar">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
        '<path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
      '</div>' +
      '<div class="ia-g-medidor"><i style="width:' + (d.posto ? Math.max(0, Math.min(100, d.saldo/d.posto*100)).toFixed(1) : 0) + '%"></i></div>' +
      '<div class="ia-g-conversa" id="ia-g-conversa" aria-live="polite"></div>' +
      '<div class="ia-sugestoes" id="ia-g-sug">' + SUGESTOES.map(function (s) {
        return '<button type="button" class="ia-sug" data-gsug="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<form class="ia-barra" id="ia-g-barra">' +
        (B12.iaTemVoz() ? '<button type="button" class="ia-microfone" id="ia-g-voz" aria-label="Falar em vez de digitar">' +
          '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/>' +
          '<path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke-linecap="round"/></svg></button>' : '') +
        '<input id="ia-g-campo" placeholder="' + (B12.iaTemVoz() ? 'Pergunte ou toque no microfone…' : 'Pergunte alguma coisa…') + '" autocomplete="off" aria-label="Sua pergunta">' +
        '<button type="submit" class="ia-enviar" aria-label="Perguntar">' +
        '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</form>' +
    '</div>';
  document.body.appendChild(g);
  requestAnimationFrame(function () { g.classList.add('on'); });
  document.body.style.overflow = 'hidden';

  var area = g.querySelector('#ia-g-conversa');
  function desce() { area.scrollTop = area.scrollHeight; }
  function bolha(m) {
    if (m.papel === 'fim') { var p = area.querySelector('.ia-pensa'); if (p) p.remove(); atualizaSaldo(); return desce(); }
    var v = area.querySelector('.ia-vazio'); if (v) v.remove();
    var pensa = area.querySelector('.ia-pensa'); if (pensa && m.papel !== 'pensa') pensa.remove();
    var el = document.createElement('div');
    if (m.papel === 'pensa') { el.className = 'ia-bolha ia-pensa'; el.innerHTML = '<span></span><span></span><span></span>'; }
    else if (m.papel === 'proposta') { el.className = 'ia-proposta'; el.innerHTML = B12.iaCartao(m.proposta); }
    else { el.className = 'ia-bolha ia-' + (m.papel === 'user' ? 'eu' : m.papel === 'erro' ? 'erro' : 'ele');
           el.innerHTML = marcar(m.texto);
           if (m.papel === 'assistant') B12.iaFalar(m.texto); }
    area.appendChild(el); desce();
    if (m.papel === 'proposta') B12.iaLigarCartao(el, m.proposta);
  }
  function atualizaSaldo() {
    var x = B12.iaDados();
    var s = g.querySelector('#ia-g-saldo');
    if (s) s.textContent = B12.brl(x.saldo, 2) + ' de crédito · ' + x.perguntas + ' pergunta' + (x.perguntas === 1 ? '' : 's');
    var m = g.querySelector('.ia-g-medidor i');
    if (m) m.style.width = (x.posto ? Math.max(0, Math.min(100, x.saldo/x.posto*100)).toFixed(1) : 0) + '%';

  }
  var porVoz = false;
  function perguntar(t, deVoz) {
    porVoz = !!deVoz;
    var c = g.querySelector('#ia-g-campo'); c.value = ''; c.blur();
    B12.iaPerguntar(t, bolha);
  }
  g.querySelector('#ia-g-barra').onsubmit = function (e) { e.preventDefault(); perguntar(g.querySelector('#ia-g-campo').value); };
  g.querySelectorAll('[data-gsug]').forEach(function (b) { b.onclick = function () { perguntar(b.dataset.gsug); }; });
  var som = g.querySelector('#ia-g-som');
  function pintarSom() {
    var m = B12.iaVozModo(), ligado = m !== 'nao';
    som.classList.toggle('mudo', !ligado);
    som.title = ligado ? (m === 'elevenlabs' ? 'Voz profissional ligada' : 'Voz do aparelho ligada') : 'Voz desligada';
    som.setAttribute('aria-pressed', ligado ? 'true' : 'false');
    som.innerHTML = ligado
      ? '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" stroke-linejoin="round"/>' +
        '<path d="M16.5 8.5a5 5 0 0 1 0 7" stroke-linecap="round"/></svg>' +
        (m === 'elevenlabs' ? '<i class="ia-som-pro">pro</i>' : '')
      : '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" stroke-linejoin="round"/>' +
        '<path d="M17 9.5l4 5M21 9.5l-4 5" stroke-linecap="round"/></svg>';
  }
  pintarSom();
  som.onclick = function () {
    var m = B12.iaVozModo();
    if (m === 'nao') B12.iaTrocarVoz(B12.iaChave11() ? 'elevenlabs' : 'aparelho');
    else { B12.iaCalar(); B12.iaTrocarVoz('nao'); }
    pintarSom();
    B12.aviso(B12.iaVozModo() === 'nao' ? 'Voz desligada.' : 'Voz ligada.', 'bom');
  };

  var voz = g.querySelector('#ia-g-voz');
  if (voz) voz.onclick = function () {
    var campo = g.querySelector('#ia-g-campo');
    if (voz.classList.contains('on')) { B12.iaPararDeOuvir(); return; }
    B12.iaCalar();
    B12.iaOuvir(function (t, pronto) {
      campo.value = t;
      if (pronto && t.trim()) { voz.classList.remove('on'); perguntar(t, true); }
    }, function (estado, msg) {
      voz.classList.toggle('on', estado === 'ouvindo');
      if (estado === 'erro') bolha({ papel: 'erro', texto: msg });
    });
  };
  g.querySelector('.ia-g-x').onclick = function () { B12.iaCalar(); B12.iaPararDeOuvir(); B12.iaFecharGaveta(); };
  g.querySelector('.ia-gaveta-fundo').onclick = function () { B12.iaCalar(); B12.iaPararDeOuvir(); B12.iaFecharGaveta(); };

  /* o que já foi conversado */
  var h = (B12.DB.ajustes.ia || {}).historico || [];
  h.forEach(function (m) {
    if (m.role === 'user' && typeof m.content === 'string') bolha({ papel: 'user', texto: m.content });
    else if (m.role === 'assistant' && Array.isArray(m.content)) {
      var t = m.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim();
      if (t) bolha({ papel: 'assistant', texto: t });
    }
  });
  if (!area.children.length) {
    var v = B12.varrer(), urg = v.pontos.filter(function (p) { return p.grau === 'urgente'; });
    area.innerHTML = v.quantos
      ? '<div class="ia-atencao"><b>' + (urg.length ? 'Precisa de você agora' : 'De olho hoje') + '</b>' +
        v.pontos.slice(0, 4).map(function (p) {
          return '<span class="ia-ponto ' + p.grau + '">' + esc(p.o_que) + '</span>'; }).join('') +
        '<small>Toque para eu explicar qualquer um.</small></div>'
      : '<div class="ia-vazio"><b>Tudo em ordem por aqui</b>' +
        '<p>Nenhuma conta vencida, nenhuma reserva esperando. Pergunte o que quiser.</p></div>';
    area.querySelectorAll('.ia-ponto').forEach(function (b) {
      b.onclick = function () { perguntar('Me explica isso: ' + b.textContent + '. O que eu faço?'); };
    });
  }
  desce();
  B12.iaTestar().then(function (e) {
    if (!e.ligado && !area.querySelector('.ia-erro')) bolha({ papel: 'erro',
      texto: 'O assistente ainda não foi ligado. Em Ajustes, ponha a chave da Anthropic ou peça ao Eugênio para liberar o endereço no cofre.' });
  });
};
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') B12.iaFecharGaveta(); });

B12.iaCartao = function (p) {
  var d = p.dados;
  if (p.proposta === 'lancamento') {
    return '<h4>' + (d.tipo === 'entrada' ? 'Entrada no caixa' : 'Saída do caixa') + '</h4>' +
      '<table class="tabela"><tr><td>Valor</td><td class="n">' + B12.brl(d.valor) + '</td></tr>' +
      '<tr><td>Categoria</td><td class="n">' + esc(d.cat) + '</td></tr>' +
      '<tr><td>Centro de custo</td><td class="n">' + esc(d.centro) + '</td></tr>' +
      '<tr><td>Descrição</td><td class="n">' + esc(d.desc) + '</td></tr>' +
      '<tr><td>Data</td><td class="n">' + B12.dataBR(d.data) + '</td></tr>' +
      '<tr><td>Pagamento</td><td class="n">' + esc(d.pg) + '</td></tr></table>' +
      '<div class="ia-acoes"><button type="button" class="btn pri peq" data-ok>Confirmar</button>' +
      '<button type="button" class="btn sec peq" data-nao>Agora não</button></div>';
  }
  if (p.proposta === 'preco') {
    var nome = d.o_que === 'regular' ? 'Travessia regular, por pessoa'
      : d.o_que === 'diaria' ? 'Diária do estacionamento'
      : 'Passeio: ' + ((B12.acharPasseio(d.passeio_id) || {}).nome || d.passeio_id);
    return '<h4>Mudar preço</h4><table class="tabela"><tr><td>' + esc(nome) + '</td>' +
      '<td class="n">' + B12.brl(d.valor) + '</td></tr></table>' +
      '<div class="ia-acoes"><button type="button" class="btn pri peq" data-ok>Confirmar</button>' +
      '<button type="button" class="btn sec peq" data-nao>Agora não</button></div>';
  }
  return '<h4>Mensagem pronta</h4><p class="ia-msg">' + esc(d.texto).replace(/\n/g, '<br>') + '</p>' +
    '<div class="ia-acoes"><button type="button" class="btn zap peq" data-zap>Enviar pelo WhatsApp</button>' +
    '<button type="button" class="btn sec peq" data-nao>Agora não</button></div>';
};

B12.iaLigarCartao = function (el, p) {
  var ok = el.querySelector('[data-ok]'), nao = el.querySelector('[data-nao]'), zap = el.querySelector('[data-zap]');
  function feito(txt) { el.classList.add('feito'); el.querySelector('.ia-acoes').innerHTML = '<span class="ia-feito">' + txt + '</span>'; }
  if (ok) ok.onclick = function () {
    var r = B12.iaConfirmar(p);
    if (r && r.erro) return B12.aviso(r.erro, 'ruim');
    feito('Feito.'); B12.aviso('Pronto, já está no app.', 'bom');
  };
  if (zap) zap.onclick = function () {
    var n = String(p.dados.whats || B12.EMPRESA.whats).replace(/\D/g, '');
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(p.dados.texto), '_blank');
    feito('Aberto no WhatsApp.');
  };
  if (nao) nao.onclick = function () { feito('Deixado de lado.'); };
};

B12.IA_FERRAMENTAS = FERRAMENTAS;
})();
