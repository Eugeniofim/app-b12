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
var CUSTO_ENTRADA = 5.40 / 1000000;
var CUSTO_SAIDA   = 27.00 / 1000000;
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
  return (uso.input_tokens || 0) * CUSTO_ENTRADA + (uso.output_tokens || 0) * CUSTO_SAIDA;
};
function cobrar(uso) {
  var x = ia();
  x.gasto = Math.round((x.gasto + B12.iaCusto(uso)) * 10000) / 10000;
  x.perguntas++;
  B12.salvar();
}

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

  { name: 'ver_app', description: 'Informações do próprio app e da marca: endereço, QR code, senhas, como instalar no celular, o que cada aba faz, onde baixar o Excel, como a marca é usada.',
    input_schema: { type: 'object', properties: { assunto: { type: 'string', description: 'endereco, senhas, instalar, abas, excel, marca, nuvem, qr' } } } },

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
             diaria_estacionamento: a.diaria,
             regra_da_diaria: a.patio,
             crianca_nao_paga_ate: a.idadeCortesia,
             desconto_no_dinheiro_por_cento: Math.round((a.descDinheiro || 0) * 100),
             taxas_da_maquininha_por_cento: Object.keys(a.taxas || {}).reduce(function (o, k) {
               o[k] = Math.round((a.taxas[k] || 0) * 10000) / 100; return o; }, {}),
             conferido_pelo_dono: !!a.precosConferidos };
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
    var t = {
      endereco: 'O app abre em https://app.estacaob12.com.br, um endereço dentro do domínio da própria B12. O link antigo do GitHub redireciona sozinho.',
      qr: 'O QR code dos 5.000 cartões e do banner aponta para esse endereço e nunca precisa ser trocado. O arquivo para a gráfica é qr-app-estacaob12-com-br.svg.',
      senhas: 'O cliente não tem senha. A área da B12 fica escondida em Mais → Área da B12. Há dois PINs: o do proprietário abre tudo, o da equipe abre só a operação, sem números de dinheiro. Os dois se trocam em Ajustes.',
      instalar: 'No iPhone: abrir o endereço no Safari, tocar em Compartilhar e escolher "Adicionar à Tela de Início". No Android o próprio app oferece o botão Instalar. Depois disso ele abre como um app, com ícone.',
      abas: 'O painel tem: Hoje (os seis números do dia), Escala (as saídas e quem confirma as reservas), Painel (o mês), Preços (você manda nos valores), Gestão, Caixa, Lançamentos, Clientes, Pátio, Manutenção, Contas, Relatórios, Dados (baixar Excel e PDF), Operação, Prospecção, Mensagens, Inteligência e o Assistente.',
      excel: 'Aba Dados: escolhe o período e baixa o Excel completo com 8 abas, o PDF para o contador, o PDF da lista de clientes e a cópia de segurança. Tudo abre no Excel e no Google Planilhas.',
      marca: 'A marca oficial da B12 é o ESTAÇÃO B12 com o farol, em stencil. Está no topo do app, no painel, no ticket e no PIN. O ícone do app é o farol branco sobre o azul da marca.',
      nuvem: 'Por enquanto os dados ficam guardados neste aparelho. Quando a nuvem for ligada, o celular e o computador passam a mostrar a mesma coisa na hora, e o backup passa a ser automático no servidor.',
    };
    var k = String(a.assunto || '').toLowerCase();
    return t[k] ? { assunto: k, resposta: t[k] } : t;
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

B12.iaFerramenta = function (nome, entrada) {
  entrada = entrada || {};
  try {
    if (LEITURAS[nome]) return LEITURAS[nome](entrada);
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
    'COMO RESPONDER',
    '- Português do Brasil, direto, sem enrolação. Frases curtas.',
    '- Ele não é programador: nada de palavra técnica. Diga "o app", "a tela", "a aba".',
    '- Antes de dar qualquer número, BUSQUE com as ferramentas. Nunca invente valor, nome ou data.',
    '- Valores em reais, no formato R$ 1.234. Datas em dia/mês.',
    '- Quando a resposta for uma lista, use no máximo 5 itens e diga o total.',
    '- Se a pergunta for sobre o próprio app (senha, endereço, como instalar, onde baixar o Excel), use ver_app.',
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

B12.iaChamar = function (mensagens) {
  var url = endereco();
  if (!url) return Promise.reject(new Error('O assistente ainda não foi ligado neste app.'));
  var ctrl = new AbortController(), corta = setTimeout(function () { ctrl.abort(); }, 45000);
  return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ max_tokens: 1500, system: sistema(), tools: FERRAMENTAS, messages: mensagens }) })
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

B12.iaLimpar = function () { var x = ia(); x.historico = []; B12.salvar(); };
B12.iaRecarregar = function (valor) {
  var x = ia(), v = Number(valor);
  if (!(v > 0)) return { erro: 'Informe um valor maior que zero.' };
  x.saldo = Math.round((x.saldo + v) * 100) / 100; B12.salvar();
  return { ok: true, saldo: B12.iaSaldo() };
};
/* o cofre responde neste endereço? serve para a tela avisar antes de ele perguntar */
B12.iaTestar = function () {
  var c = (B12.IA && B12.IA.cofre) || '';
  if (!c) return Promise.resolve({ ligado: false, motivo: 'sem cofre' });
  var ctrl = new AbortController(); setTimeout(function () { ctrl.abort(); }, 8000);
  return fetch(c.replace(/\/$/, '') + '/estado', { signal: ctrl.signal })
    .then(function (r) { return r.json(); })
    .then(function (j) { return { ligado: !!j.claude, motivo: j.claude ? '' : 'cofre sem chave' }; })
    .catch(function () { return { ligado: false, motivo: 'endereço ainda não liberado no cofre' }; });
};

B12.iaDados = function () {
  var x = ia();
  return { saldo: B12.iaSaldo(), posto: x.saldo, gasto: Math.round(x.gasto * 100) / 100,
           perguntas: x.perguntas, media: x.perguntas ? x.gasto / x.perguntas : 0,
           ligado: !!endereco(), conversa: x.historico.length };
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

B12.IA_FERRAMENTAS = FERRAMENTAS;
})();
