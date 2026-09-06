/* ============================================================================
   Estação B12 — núcleo
   ----------------------------------------------------------------------------
   Camada de dados e de conta. Nenhuma tela mexe em localStorage direto: tudo
   passa por aqui. Trocar este arquivo por um que fale com o Supabase é o único
   passo para o app sair do aparelho e ir para a nuvem — o resto não muda.

   Traz também o cofre de cópias da regra Ti Artes: guarda sozinho, e tem as
   duas travas que impedem o vazio de comer o cheio.
   ========================================================================== */
var B12 = window.B12 || {};

/* ------------------------------------------------------------------ utilidades */
B12.brl = function (v, casas) {
  return 'R$ ' + Number(v||0).toLocaleString('pt-BR',
    { minimumFractionDigits: casas||0, maximumFractionDigits: casas||0 });
};
B12.n = function (v) { return Number(v||0).toLocaleString('pt-BR'); };
B12.pct = function (v) { return (v>0?'+':'') + (v*100).toFixed(1).replace('.',',') + '%'; };

/* data pelo relógio da parede, nunca por UTC (peça 10 da fórmula) */
B12.hoje = function () {
  var d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
};
B12.mesAtual = function () { return B12.hoje().slice(0,7); };
B12.mesMais = function (ym, n) {
  var p = ym.split('-').map(Number), d = new Date(p[0], p[1]-1+n, 1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
};
B12.diaMais = function (iso, n) {
  var p = iso.split('-').map(Number), d = new Date(p[0], p[1]-1, p[2]+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
};
B12.dataBR = function (iso) { if(!iso) return ''; var p=iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; };
B12.MESNOME = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
B12.mesBR = function (ym) { var p=ym.split('-'); return B12.MESNOME[+p[1]-1]+'/'+p[0].slice(2); };

/* ============================================================ banco no aparelho */
var CHAVE = 'b12_dados_v1', COFRE = 'b12_cofre_v1';

B12.DB = null;

function vazio() {
  return {
    versao: 1,
    reservas: [],        /* pedidas pelo turista */
    lancamentos: [],     /* entradas e saídas do financeiro */
    contas: [],          /* a pagar e a receber */
    saidas: [],          /* viagens programadas (operação) */
    clientes: [],        /* ficha de quem viaja: contato e histórico */
    patio: [],           /* carros no estacionamento: entrada e saída */
    manutencoes: [],     /* o que foi feito na embarcação */
    ajustes: {
      metaMensal: 60000,
      reservaMinima: 45000,     /* PENDENTE: a regra é do cliente */
      saldoInicial: 38500,
      taxas: B12.TAXAS,
      regular: B12.REGULAR,
      diaria: B12.DIARIA,
      tabela: B12.TABELA,
      pins: null,                 /* null = usa o PIN padrão de demonstração */
      grade: null                 /* null = usa B12.GRADE_PADRAO */
    },
    semeado: false
  };
}

B12.carregar = function () {
  try { B12.DB = JSON.parse(localStorage.getItem(CHAVE)) || vazio(); }
  catch (e) { B12.DB = vazio(); }
  if (!B12.DB.ajustes) B12.DB.ajustes = vazio().ajustes;
  ['clientes','patio','manutencoes','lancamentos','contas','saidas','reservas'].forEach(function (k) {
    if (!Array.isArray(B12.DB[k])) B12.DB[k] = [];
  });
  if (!B12.DB.semeado) { B12.semear(); }
  return B12.DB;
};

B12.salvar = function () {
  try { localStorage.setItem(CHAVE, JSON.stringify(B12.DB)); }
  catch (e) { console.warn('não coube no aparelho', e); }
  B12.cofreGuardar('auto');
};

/* --------------------------------------------------------------------- cofre */
function cofreLer(){ try{ return JSON.parse(localStorage.getItem(COFRE)) || {copias:[]}; }
                     catch(e){ return {copias:[]}; } }
function cofrePeso(d){ return (d.reservas||[]).length + (d.lancamentos||[]).length +
                              (d.contas||[]).length + (d.saidas||[]).length +
                              (d.clientes||[]).length + (d.patio||[]).length +
                              (d.manutencoes||[]).length; }
var cofreUltimo = 0;
B12.cofreGuardar = function (motivo) {
  var agora = Date.now();
  if (motivo === 'auto' && agora - cofreUltimo < 120000) return false;   /* no máximo a cada 2 min */
  cofreUltimo = agora;
  var d = B12.DB, peso = cofrePeso(d), c = cofreLer(), dia = B12.hoje();
  var maiorTudo = Math.max.apply(null, [0].concat(c.copias.map(function(x){return x.peso||0})));
  var maiorHoje = Math.max.apply(null, [0].concat(
    c.copias.filter(function(x){return x.dia===dia}).map(function(x){return x.peso||0})));
  /* as duas travas: vazio não come cheio, e perda de metade é suspeita */
  if (peso === 0 && maiorTudo > 0) return false;
  if (peso > 0 && maiorHoje > 0 && peso < maiorHoje*0.5 && motivo !== 'mao') return false;
  c.copias.unshift({ em:new Date().toISOString(), dia:dia, peso:peso, motivo:motivo,
                     dados:JSON.parse(JSON.stringify(d)) });
  c.copias = c.copias.slice(0, 12);
  try { localStorage.setItem(COFRE, JSON.stringify(c)); return true; }
  catch (e) { c.copias = c.copias.slice(0,4);
              try{ localStorage.setItem(COFRE, JSON.stringify(c)); }catch(e2){} return false; }
};
B12.cofreCopias = function(){ return cofreLer().copias.map(function(x){
  return { em:x.em, dia:x.dia, peso:x.peso, motivo:x.motivo }; }); };

/* ==================================================== semente de demonstração */
B12.semear = function () {
  var D = B12.DB, hoje = B12.hoje(), ym = B12.mesAtual();
  var ano = +ym.slice(0,4), mes = +ym.slice(5,7);
  var diaHoje = +hoje.slice(8,10);

  /* mês anterior inteiro + mês corrente até hoje, para haver comparação */
  var ymAnt = B12.mesMais(ym, -1);
  [[ymAnt, 99], [ym, diaHoje]].forEach(function (par) {
    var y = +par[0].slice(0,4), mm = +par[0].slice(5,7), ate = par[1];
    B12.gerarMes(y, mm).forEach(function (m) {
      if (m.dia > ate) return;
      var data = par[0] + '-' + String(m.dia).padStart(2,'0');
      if (m.travessia) D.lancamentos.push(lanc(data,'entrada','Travessias','Lancha',
        m.travessias+' travessias · '+m.pax+' passageiros', m.travessia, pgSorteado(m.dia)));
      if (m.estacionamento) D.lancamentos.push(lanc(data,'entrada','Estacionamento','Estacionamento',
        'Diárias do dia', m.estacionamento, pgSorteado(m.dia+1)));
      if (m.passeio) D.lancamentos.push(lanc(data,'entrada','Passeios','Lancha',
        m.passeios+' passeios vendidos', m.passeio, pgSorteado(m.dia+2)));
      if (m.combustivel) D.lancamentos.push(lanc(data,'saida','Combustível','Lancha',
        'Abastecimento', m.combustivel, 'dinheiro'));
      /* uma comissão de pousada de vez em quando */
      if (m.dia % 9 === 0) D.lancamentos.push(lanc(data,'entrada','Comissões de hospedagem',
        'Receptivo B12','Comissão de hospedagem', Math.round(m.travessia*0.06)+180, 'pix'));
    });
    /* as fixas do mês anterior entram já pagas */
    if (par[1] === 99) B12.CONTAS_FIXAS.forEach(function (c) {
      D.lancamentos.push(lanc(par[0]+'-'+String(c.dia).padStart(2,'0'),'saida',c.cat,c.centro,c.desc,c.valor,'pix'));
    });
  });

  /* despesas fixas do mês, com as que já venceram marcadas como pagas */
  B12.CONTAS_FIXAS.forEach(function (c, i) {
    var venc = ym + '-' + String(c.dia).padStart(2,'0');
    var paga = c.dia <= diaHoje;
    D.contas.push({ id:'c'+i, tipo:'pagar', desc:c.desc, valor:c.valor, venc:venc,
      cat:c.cat, centro:c.centro, fixa:true, paga:paga, avisar:true });
    if (paga) D.lancamentos.push(lanc(venc,'saida',c.cat,c.centro,c.desc,c.valor,'pix'));
    /* e a do mês que vem, ainda em aberto */
    D.contas.push({ id:'c'+i+'b', tipo:'pagar', desc:c.desc, valor:c.valor,
      venc:B12.mesMais(ym,1)+'-'+String(c.dia).padStart(2,'0'),
      cat:c.cat, centro:c.centro, fixa:true, paga:false, avisar:true });
  });

  /* manutenção pontual e uma conta a receber de parceiro */
  D.lancamentos.push(lanc(B12.diaMais(hoje,-6),'saida','Manutenção','Lancha',
    'Troca de óleo e filtros', 1180, 'credito'));
  D.contas.push({ id:'r1', tipo:'receber', desc:'Comissão de hospedagem · Grajagan',
    valor:1840, venc:B12.diaMais(hoje,9), cat:'Comissões de hospedagem',
    centro:'Receptivo B12', paga:false, avisar:true });
  D.contas.push({ id:'r2', tipo:'receber', desc:'Pacote fechado · casamento na Ilha',
    valor:4200, venc:B12.diaMais(hoje,22), cat:'Outras receitas',
    centro:'Lancha', paga:false, avisar:true });

  /* saídas programadas para hoje e amanhã (o que a equipe opera) */
  ['08:30','10:00','11:30','13:00','15:00','17:00','19:00'].forEach(function (h,i) {
    D.saidas.push({ id:'s'+i, data:hoje, hora:h, embarcacao:'l01', destino: i%2?'Encantadas':'Brasília',
      sentido:'ida', vagas:12, ocupadas: Math.max(0, 11-i*2 + (i%3)), marinheiro:'Ismael' });
  });
  ['09:30','12:00','16:00','18:00','20:30'].forEach(function (h,i) {
    D.saidas.push({ id:'v'+i, data:hoje, hora:h, embarcacao:'l01', destino:'Pontal do Sul',
      sentido:'volta', vagas:12, ocupadas: Math.max(0, 9-i*2), marinheiro:'Ismael' });
  });

  semearOperacao(D, hoje);

  D.semeado = true;
  try { localStorage.setItem(CHAVE, JSON.stringify(D)); } catch (e) {}
};

/* ---- clientes, passageiros do dia, pátio e manutenção (demonstração) ---- */
function semearOperacao(D, hoje) {
  var NOMES = ['Ana Paula Ribeiro','Marcelo Tavares','Juliana Nunes','Rafael Prado',
    'Camila Bittencourt','Eduardo Salles','Patrícia Lemos','Thiago Moreira',
    'Fernanda Klein','Bruno Carvalho','Larissa Fontes','Gustavo Andrade',
    'Vanessa Duarte','Rodrigo Peixoto'];
  var POUS = B12.PARCEIROS.map(function (p) { return p.nome; });
  var CIDADES = ['Curitiba','São Paulo','Joinville','Londrina','Ponta Grossa',
    'Maringá','Florianópolis','Cascavel'];
  var sem = 7;
  function r(n) { sem = (sem * 9301 + 49297) % 233280; return Math.floor(sem / 233280 * n); }

  NOMES.forEach(function (nome, i) {
    var pn = nome.toLowerCase().split(' ')[0];
    D.clientes.push({
      id: 'cl-demo-' + i, nome: nome,
      whats: '41' + (90000000 + r(9999999)),
      email: pn + '@exemplo.com.br',
      instagram: i % 3 === 0 ? pn + '.viagens' : '',
      pousada: i % 4 === 0 ? '' : POUS[r(POUS.length)],
      cidade: CIDADES[r(CIDADES.length)],
      obs: '', aceitaOfertas: i % 3 !== 1,
      consentidoEm: i % 3 !== 1 ? new Date().toISOString() : null,
      criadoEm: new Date().toISOString(),
      viagens: 1 + r(4), gasto: 180 + r(9) * 120
    });
  });

  /* passageiros distribuídos nas saídas de hoje */
  var idas = D.saidas.filter(function (s) { return s.data === hoje && s.sentido === 'ida'; });
  var voltas = D.saidas.filter(function (s) { return s.data === hoje && s.sentido === 'volta'; });
  idas.forEach(function (s, i) {
    var quantos = 1 + r(3);
    s.ocupadas = 0;
    for (var k = 0; k < quantos; k++) {
      var c = D.clientes[(i * 3 + k) % D.clientes.length];
      var pax = 1 + r(3);
      if (s.ocupadas + pax > s.vagas) break;
      s.ocupadas += pax;
      D.reservas.push({
        id: 'rs-demo-' + i + '-' + k, cod: 'B12-' + (2000 + i * 40 + k * 7), origem: 'demo',
        nome: c.nome, zap: c.whats, email: c.email, pax: pax, criancas: 0,
        ida: hoje, volta: k % 2 ? B12.diaMais(hoje, 2) : hoje,
        destino: s.destino, pousada: c.pousada,
        produto: 'Travessia regular', faixa: '08h30 às 18h00',
        estacionamento: 0, pg: 'Pix', total: pax * 120,
        situacao: 'confirmada', saidaId: s.id,
        saidaVoltaId: (k % 2 === 0 && i % 2 === 0) ? (voltas[i % voltas.length] || {}).id : null,
        criada: new Date().toISOString()
      });
    }
  });
  voltas.forEach(function (s) {
    s.ocupadas = D.reservas.filter(function (x) { return x.saidaVoltaId === s.id; })
      .reduce(function (t, x) { return t + x.pax; }, 0);
  });

  /* carros no pátio */
  [['ABC1D23','Gol','prata',3,'A02'],['QRS4E56','Onix','branco',1,'A05'],
   ['MNO7F89','HB20','preto',5,'B01'],['XYZ2G34','Compass','cinza',2,'']]
  .forEach(function (v, i) {
    var c = D.clientes[i * 3];
    D.patio.push({
      id: 'pt-demo-' + i, placa: v[0], modelo: v[1], cor: v[2],
      clienteId: c.id, nome: c.nome, whats: c.whats,
      entrada: B12.diaMais(hoje, -v[3]),
      saidaPrevista: B12.diaMais(hoje, i === 2 ? -1 : 1 + i),
      vaga: v[4], diaria: B12.DIARIA, saidaReal: null, pago: false, valorPago: 0,
      criadoEm: new Date().toISOString()
    });
  });

  /* manutenções recentes */
  [['Troca de óleo e filtros','óleo, 2 filtros','preventiva',480,-22],
   ['Revisão da rabeta','retentores, o-rings','corretiva',1180,-9],
   ['GPS náutico novo','GPS 7 polegadas','investimento',2560,-40]]
  .forEach(function (m, i) {
    D.manutencoes.push({
      id: 'mn-demo-' + i, data: B12.diaMais(hoje, m[4]), embarcacao: 'l01',
      tipo: m[2], descricao: m[0], pecas: m[1], fornecedor: 'Marina Michel',
      valor: m[3], horasMotor: 1200 + i * 40, proxima: '',
      criadoEm: new Date().toISOString()
    });
    D.lancamentos.push(lanc(B12.diaMais(hoje, m[4]), 'saida',
      m[2] === 'investimento' ? 'Compras e fornecedores' : 'Manutenção', 'Lancha',
      m[0], m[3], 'pix'));
    if (m[2] === 'investimento') D.lancamentos[0].investimento = true;
  });
}
function lanc(data,tipo,cat,centro,desc,valor,pg){
  return { id:'l'+Math.random().toString(36).slice(2,9), data:data, tipo:tipo, cat:cat,
           centro:centro, desc:desc, valor:Math.round(valor), pg:pg||'pix', origem:'demo' };
}
function pgSorteado(n){ var f=['credito','credito','debito','pix','credito','dinheiro','pix']; return f[n%7]; }

/* ============================================================ motor de preço */
B12.faixaHora = function (hhmm) {
  if (!hhmm) return 'dia';
  var h = +String(hhmm).slice(0,2);
  if (h >= 20) return 'noite';
  if (h >= 18) return 'tarde';
  if (h >= 8)  return 'dia';
  return 'fora';
};
/* Devolve {trecho, total, detalhe} ou null quando é sob consulta. */
B12.preco = function (o) {
  var faixa = o.faixa || 'dia';
  if (faixa === 'fora') return null;
  var t = B12.DB.ajustes.tabela[faixa];
  var pagantes = Math.max(0, (o.pax||0) - (o.criancas||0));
  var trecho;
  if (o.produto === 'nautico') {
    /* até 3 é valor fixo; de 4 em diante é por pessoa, com o fixo servindo de mínimo,
       senão um grupo de 4 com 2 crianças pagaria menos que um casal */
    trecho = (o.pax <= 3) ? t.fixo : Math.max(t.fixo, t.pessoa * pagantes);
  } else {
    trecho = B12.DB.ajustes.regular * pagantes;
  }
  var trechos = o.soIda ? 1 : 2;
  var travessia = trecho * trechos;
  var estac = o.diarias ? B12.DB.ajustes.diaria * o.diarias : 0;
  var sub = travessia + estac;
  var desc = (o.pg === 'dinheiro') ? Math.round(sub * B12.DESC_DINHEIRO) : 0;
  return { trecho:trecho, trechos:trechos, travessia:travessia, estacionamento:estac,
           desconto:desc, total:sub - desc, pagantes:pagantes, faixaTxt:t.de+' às '+t.ate };
};
B12.diarias = function (ida, volta) {
  if (!ida || !volta) return 1;
  var d = (new Date(volta+'T12:00') - new Date(ida+'T12:00')) / 86400000;
  return d > 0 ? Math.round(d) : 1;
};

/* ======================================================== motor do financeiro */
function noMes(l, ym){ return l.data.slice(0,7) === ym; }

B12.resumoMes = function (ym) {
  var L = B12.DB.lancamentos.filter(function(l){ return noMes(l, ym); });
  var r = { entradas:0, saidas:0, porCat:{}, porCentro:{}, porPg:{}, taxa:0 };
  L.forEach(function (l) {
    if (l.tipo === 'entrada') {
      r.entradas += l.valor;
      r.porPg[l.pg] = (r.porPg[l.pg]||0) + l.valor;
      r.taxa += l.valor * (B12.DB.ajustes.taxas[l.pg] || 0);
    } else {
      r.saidas += l.valor;
      r.porCentro[l.centro] = (r.porCentro[l.centro]||0) + l.valor;
    }
    r.porCat[l.cat] = (r.porCat[l.cat]||0) + l.valor;
  });
  r.taxa = Math.round(r.taxa);
  r.lucro = r.entradas - r.saidas - r.taxa;
  r.margem = r.entradas ? r.lucro / r.entradas : 0;
  return r;
};

/* mesmo período: só até o dia N do mês, para comparar laranja com laranja */
B12.resumoMesAte = function (ym, diaLimite) {
  var lim = ym + '-' + String(diaLimite).padStart(2,'0');
  var L = B12.DB.lancamentos.filter(function (l) {
    return l.data.slice(0,7) === ym && l.data <= lim; });
  var e = 0, s = 0;
  L.forEach(function (l) { if (l.tipo === 'entrada') e += l.valor; else s += l.valor; });
  return { entradas:e, saidas:s, lucro:e-s };
};

B12.resumoDia = function (iso) {
  var L = B12.DB.lancamentos.filter(function(l){ return l.data === iso; });
  var r = { faturamento:0, combustivel:0, saidas:0, travessias:0, pax:0, passeios:0 };
  L.forEach(function (l) {
    if (l.tipo === 'entrada') {
      r.faturamento += l.valor;
      var m = /(\d+) travessias · (\d+) passageiros/.exec(l.desc||'');
      if (m) { r.travessias += +m[1]; r.pax += +m[2]; }
      var p = /(\d+) passeios/.exec(l.desc||''); if (p) r.passeios += +p[1];
    } else {
      r.saidas += l.valor;
      if (l.cat === 'Combustível') r.combustivel += l.valor;
    }
  });
  r.resultado = r.faturamento - r.saidas;
  return r;
};

B12.periodo = function (de, ate) {
  var L = B12.DB.lancamentos.filter(function(l){ return l.data >= de && l.data <= ate; });
  var e=0,s=0; L.forEach(function(l){ if(l.tipo==='entrada') e+=l.valor; else s+=l.valor; });
  return { entradas:e, saidas:s, lucro:e-s };
};

/* saldo de caixa hoje = saldo inicial + tudo que já entrou − tudo que já saiu */
B12.saldo = function () {
  var s = B12.DB.ajustes.saldoInicial;
  B12.DB.lancamentos.forEach(function(l){ s += (l.tipo==='entrada' ? l.valor : -l.valor); });
  return Math.round(s);
};

/* projeção: saldo daqui a N dias, somando contas com data */
B12.projecao = function (dias) {
  var lim = B12.diaMais(B12.hoje(), dias), hoje = B12.hoje();
  var s = B12.saldo(), aPagar = 0, aReceber = 0;
  B12.DB.contas.forEach(function (c) {
    if (c.paga || c.venc <= hoje || c.venc > lim) return;
    if (c.tipo === 'pagar') aPagar += c.valor; else aReceber += c.valor;
  });
  /* receita esperada no período, pela sazonalidade real */
  var prev = B12.receitaPrevista(hoje, lim);
  return { saldoHoje:s, aPagar:aPagar, aReceber:aReceber, previsto:prev,
           fim: Math.round(s - aPagar + aReceber + prev) };
};

/* quanto a empresa deve faturar entre duas datas, pela sazonalidade real */
B12.receitaPrevista = function (de, ate) {
  var total = 0, d = de;
  var guarda = 0;
  while (d < ate && guarda++ < 400) {
    d = B12.diaMais(d, 1);
    var mes = +d.slice(5,7), dw = new Date(d+'T12:00').getDay();
    var peso = [1.00,.62,.66,.38,.30,.20,.28,.42,.33,.40,.40,.85][mes-1];
    var dias = new Date(+d.slice(0,4), mes, 0).getDate();
    var fds = (dw===5||dw===6||dw===0) ? 1.85 : 0.62;
    total += (82000*peso/dias) * fds * 0.92;      /* 0,92: só o que é receita líquida de caixa */
  }
  return Math.round(total);
};

/* ---------------------------------------------- "Quanto posso retirar?" (D14) */
B12.retirada = function (pedido) {
  var p60 = B12.projecao(60), min = B12.DB.ajustes.reservaMinima;
  var disponivel = p60.fim - min;
  var seguro = Math.max(0, Math.floor(disponivel/500)*500);
  return {
    pedido: pedido,
    saldoHoje: p60.saldoHoje,
    aPagar: p60.aPagar,
    aReceber: p60.aReceber,
    previsto: p60.previsto,
    em60: p60.fim,
    reservaMinima: min,
    seguro: seguro,
    ok: pedido <= seguro,
    faltaria: Math.max(0, pedido - seguro)
  };
};

/* ------------------------------------------------------------ histórico real */
B12.histPorAno = function () {
  var a = {};
  B12.HIST_VENDAS.forEach(function (m) {
    var y = +m[0].slice(0,4);
    a[y] = a[y] || { meses:0, lanc:0, pax:0, trav:0, est:0, comb:0, desp:0 };
    a[y].meses++; a[y].lanc+=m[1]; a[y].pax+=m[2]; a[y].trav+=m[3]; a[y].est+=m[4];
  });
  B12.HIST_COMBUSTIVEL.forEach(function (m) { var y=+m[0].slice(0,4); if(a[y]) a[y].comb+=m[1]; });
  B12.HIST_DESPESAS.forEach(function (m) { var y=+m[0].slice(0,4); if(a[y]) a[y].desp+=m[1]; });
  var out = [];
  for (var y=2015; y<=2025; y++) {
    var o = a[y] || { meses:0,lanc:0,pax:0,trav:0,est:0,comb:0,desp:0 };
    o.ano = y; o.receita = o.trav + o.est;
    o.media = o.meses ? Math.round(o.receita/o.meses) : 0;
    o.porPax = o.pax ? Math.round(o.trav/o.pax) : 0;
    o.custo = o.comb + o.desp;
    out.push(o);
  }
  return out;
};
B12.histMes = function (ym) {
  var m = B12.HIST_VENDAS.filter(function(x){ return x[0]===ym; })[0];
  return m ? { lanc:m[1], pax:m[2], trav:m[3], est:m[4], receita:m[3]+m[4] } : null;
};
/* mesmo mês, todos os anos com registro (pedido H1) */
B12.mesmoMes = function (mes) {
  var out = [];
  B12.HIST_VENDAS.forEach(function (m) {
    if (+m[0].slice(5,7) === mes) out.push({ ano:+m[0].slice(0,4), receita:m[3]+m[4], pax:m[2] });
  });
  return out.sort(function(a,b){ return a.ano-b.ano; });
};

/* --------------------------------------------------- "Como está a empresa?" */
B12.diagnostico = function () {
  var ym = B12.mesAtual(), r = B12.resumoMes(ym);
  var diaHoje = +B12.hoje().slice(8);
  var ant = B12.resumoMesAte(B12.mesMais(ym,-1), diaHoje);
  var f = [];
  if (ant.entradas > 0) {
    var d = (r.entradas - ant.entradas) / ant.entradas;
    f.push('Até o dia ' + diaHoje + ', seu faturamento está ' + B12.pct(d) +
           ' em relação ao mesmo ponto do mês passado.');
  }
  var trav = r.porCat['Travessias']||0;
  if (r.entradas) f.push('As travessias são ' + Math.round(trav/r.entradas*100) + '% da receita do mês.');
  if (r.taxa) f.push('A maquininha levou ' + B12.brl(r.taxa) + ' este mês, ' +
                     (r.entradas? (r.taxa/r.entradas*100).toFixed(1).replace('.',',') : 0) + '% do que entrou.');
  var comb = r.porCat['Combustível']||0;
  if (comb && r.entradas) f.push('O combustível ficou em ' + Math.round(comb/r.entradas*100) + '% da receita.');
  var mes = +ym.slice(5,7), mm = B12.mesmoMes(mes);
  if (mm.length > 1) {
    var melhor = mm.reduce(function(a,b){ return b.receita>a.receita?b:a; });
    f.push('No histórico, o melhor ' + B12.MESNOME[mes-1] + ' foi o de ' + melhor.ano +
           ', com ' + B12.brl(melhor.receita) + '.');
  }
  var ret = B12.retirada(0);
  f.push(ret.seguro > 0
    ? 'Hoje dá para retirar com segurança até ' + B12.brl(ret.seguro) + ' sem furar a reserva.'
    : 'Neste momento não há folga sobre a reserva mínima. Não é hora de retirar.');
  var prox = B12.contasProximas(7);
  if (prox.length) f.push('Nos próximos 7 dias vencem ' + prox.length + ' contas, somando ' +
    B12.brl(prox.reduce(function(s,c){return s+c.valor;},0)) + '.');
  return f;
};

B12.contasProximas = function (dias) {
  var hoje = B12.hoje(), lim = B12.diaMais(hoje, dias);
  return B12.DB.contas.filter(function (c) {
    return !c.paga && c.tipo==='pagar' && c.venc >= hoje && c.venc <= lim;
  }).sort(function(a,b){ return a.venc < b.venc ? -1 : 1; });
};
B12.contasVencidas = function () {
  var hoje = B12.hoje();
  return B12.DB.contas.filter(function(c){ return !c.paga && c.tipo==='pagar' && c.venc < hoje; });
};

/* ------------------------------------------------------------------ reservas */
/* O código da reserva identifica a VIAGEM. Nunca se repete dentro deste banco:
   sorteia 4 dígitos e confere contra todas as reservas já existentes. Se um dia
   os 9.000 códigos acabarem, passa a 5 dígitos. Na nuvem, quem gera é o servidor. */
B12.gerarCodigo = function () {
  var usados = {};
  B12.DB.reservas.forEach(function (x) { usados[x.cod] = 1; });
  var c, tentativas = 0;
  do { c = 'B12-' + Math.floor(1000 + Math.random() * 9000); }
  while (usados[c] && ++tentativas < 200);
  if (usados[c]) { do { c = 'B12-' + Math.floor(10000 + Math.random() * 90000); } while (usados[c]); }
  return c;
};
B12.novaReserva = function (r) {
  r.id = novoId('rs');
  r.cod = B12.gerarCodigo();
  r.criada = new Date().toISOString();
  r.situacao = 'pedida';        /* pedida -> confirmada -> concluída (ou cancelada) */
  r.origem = 'app';             /* feita pelo turista neste aparelho */
  r.saidaId = null;             /* a B12 coloca numa saída de ida ao confirmar */
  r.saidaVoltaId = null;        /* o turista escolhe no dia da volta */
  r.placa = String(r.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  B12.DB.reservas.unshift(r);
  B12.salvar();
  return r;
};

/* ---- o caminho entre o cliente e a B12 ---- */
B12.minhasReservas = function () {
  return B12.DB.reservas.filter(function (r) { return r.origem === 'app' || r.recuperada; });
};
B12.reservaPorId = function (id) {
  return B12.DB.reservas.filter(function (r) { return r.id === id || r.cod === id; })[0] || null;
};
/* pedidos que chegaram e a B12 ainda não colocou em nenhuma saída */
B12.pedidosNovos = function () {
  return B12.DB.reservas.filter(function (r) {
    return !r.saidaId && r.situacao === 'pedida';
  }).sort(function (a, b) { return a.ida < b.ida ? -1 : 1; });
};
B12.confirmarReserva = function (reservaId, saidaId) {
  var r = B12.reservaPorId(reservaId);
  var s = B12.DB.saidas.filter(function (x) { return x.id === saidaId; })[0];
  if (!r || !s) return { erro: 'Reserva ou saída não encontrada.' };
  var ocup = B12.DB.reservas.filter(function (x) { return x.saidaId === saidaId; })
    .reduce(function (t, x) { return t + (x.pax || 1); }, 0);
  if (ocup + (r.pax || 1) > s.vagas) return { erro: 'A saída das ' + s.hora + ' está lotada.' };
  r.saidaId = saidaId; r.situacao = 'confirmada'; r.confirmadaEm = new Date().toISOString();
  s.ocupadas = ocup + (r.pax || 1);
  /* a venda entra no financeiro sozinha, sem digitar de novo */
  if (r.total && !r.lancamentoId) {
    var l = B12.salvarLancamento({ data: r.ida, tipo: 'entrada', cat: 'Travessias', centro: 'Lancha',
      desc: (r.pax || 1) + ' travessias · ' + (r.pax || 1) + ' passageiros · ' + r.nome,
      valor: r.total, pg: String(r.pg || 'pix').toLowerCase().indexOf('cart') >= 0 ? 'credito'
        : String(r.pg || 'pix').toLowerCase().indexOf('dinheiro') >= 0 ? 'dinheiro' : 'pix',
      embarcacao: s.embarcacao });
    if (l.ok) r.lancamentoId = l.lancamento.id;
  }
  B12.salvar();
  return { ok: true, reserva: r, saida: s };
};
B12.marcarVolta = function (reservaId, saidaVoltaId) {
  var r = B12.reservaPorId(reservaId);
  var s = B12.DB.saidas.filter(function (x) { return x.id === saidaVoltaId; })[0];
  if (!r || !s) return { erro: 'Horário não encontrado.' };
  var ocup = B12.DB.reservas.filter(function (x) { return x.saidaVoltaId === saidaVoltaId && x.id !== r.id; })
    .reduce(function (t, x) { return t + (x.pax || 1); }, 0);
  if (ocup + (r.pax || 1) > s.vagas) return { erro: 'O retorno das ' + s.hora + ' já está lotado.' };
  if (r.saidaVoltaId) {                       /* trocou de horário: libera o anterior */
    var ant = B12.DB.saidas.filter(function (x) { return x.id === r.saidaVoltaId; })[0];
    if (ant) ant.ocupadas = Math.max(0, ant.ocupadas - (r.pax || 1));
  }
  r.saidaVoltaId = saidaVoltaId; r.voltaMarcadaEm = new Date().toISOString();
  s.ocupadas = ocup + (r.pax || 1);
  B12.salvar();
  return { ok: true, reserva: r, saida: s };
};
/* carros que devem chegar: reservas com placa, chegando hoje ou antes, ainda fora do pátio */
B12.carrosPrevistos = function (iso) {
  iso = iso || B12.hoje();
  var noPatio = {};
  B12.DB.patio.forEach(function (v) { if (!v.saidaReal) noPatio[v.placa] = 1; });
  return B12.DB.reservas.filter(function (r) {
    return r.placa && r.ida <= iso && r.situacao !== 'cancelada' && !noPatio[r.placa] && !r.patioId;
  });
};
B12.darEntradaDaReserva = function (reservaId) {
  var r = B12.reservaPorId(reservaId);
  if (!r || !r.placa) return { erro: 'Essa reserva não tem placa.' };
  var e = B12.entradaPatio({ placa: r.placa, nome: r.nome, whats: r.zap,
    entrada: B12.hoje(), saidaPrevista: r.volta || '', diaria: B12.DB.ajustes.diaria });
  if (e.erro) return e;
  r.patioId = e.veiculo.id;
  B12.salvar();
  return e;
};
B12.situacaoTxt = function (r) {
  if (r.situacao === 'cancelada') return 'cancelada';
  if (r.saidaVoltaId) {
    var s = B12.DB.saidas.filter(function (x) { return x.id === r.saidaVoltaId; })[0];
    return 'volta marcada' + (s ? ' às ' + s.hora : '');
  }
  if (r.situacao === 'confirmada') {
    var i = B12.DB.saidas.filter(function (x) { return x.id === r.saidaId; })[0];
    return 'confirmada' + (i ? ' · saída ' + i.hora : '');
  }
  return 'aguardando a B12';
};

/* ------------------------------------------------------------------- saídas */
/* A grade padrão: o que a lancha faz todo dia quando ninguém mudou nada.
   Um dia sem escala própria ganha a grade na hora em que alguém olha para ele. */
B12.GRADE_PADRAO = { ida: ['08:30','10:00','11:30','13:00','15:00','17:00'],
                     volta: ['09:30','12:00','16:00','18:00'], vagas: 12 };
B12.materializarDia = function (iso) {
  if (iso < B12.hoje()) return false;                       /* passado não ganha grade */
  if (B12.DB.saidas.some(function (s) { return s.data === iso; })) return false;
  var g = B12.DB.ajustes.grade || B12.GRADE_PADRAO;
  g.ida.forEach(function (h) { B12.DB.saidas.push({ id: novoId('sd'), data: iso, hora: h, sentido: 'ida',
    destino: 'Brasília', embarcacao: 'l01', marinheiro: '', vagas: g.vagas || 12, ocupadas: 0, grade: true }); });
  g.volta.forEach(function (h) { B12.DB.saidas.push({ id: novoId('sd'), data: iso, hora: h, sentido: 'volta',
    destino: 'Pontal do Sul', embarcacao: 'l01', marinheiro: '', vagas: g.vagas || 12, ocupadas: 0, grade: true }); });
  B12.salvar();
  return true;
};
B12.saidasDoDia = function (iso, sentido) {
  B12.materializarDia(iso);
  return B12.DB.saidas.filter(function (s) {
    return s.data === iso && (!sentido || s.sentido === sentido);
  }).sort(function(a,b){ return a.hora < b.hora ? -1 : 1; });
};

/* achar uma reserva pelo código + 4 últimos números do WhatsApp */
B12.acharReserva = function (cod, zap4) {
  var c = String(cod || '').toUpperCase().replace(/\s/g, '');
  if (/^\d{4}$/.test(c)) c = 'B12-' + c;
  var z = String(zap4 || '').replace(/\D/g, '').slice(-4);
  var r = B12.DB.reservas.filter(function (x) {
    return x.cod === c && String(x.zap || '').replace(/\D/g, '').slice(-4) === z;
  })[0];
  if (r) { r.recuperada = true; B12.salvar(); }
  return r || null;
};


/* ============================================================================
   ENTRADA DE DADOS — tudo o que o Dhalsin e a equipe digitam
   Cada função guarda, devolve o registro criado e reflete no financeiro quando
   for o caso. Nenhuma tela grava direto: passa por aqui.
   ========================================================================== */

function novoId(pref) { return pref + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
B12.novoId = novoId;

/* --------------------------------------------------------------- clientes */
B12.salvarCliente = function (c) {
  if (!c.nome || !String(c.nome).trim()) return { erro: 'O nome é obrigatório.' };
  var zap = String(c.whats || '').replace(/\D/g, '');
  if (zap && zap.length < 10) return { erro: 'O WhatsApp parece incompleto.' };
  var ja = c.id && B12.DB.clientes.filter(function (x) { return x.id === c.id; })[0];
  var reg = ja || { id: novoId('cl'), criadoEm: new Date().toISOString(), gasto: 0, viagens: 0 };
  reg.nome = String(c.nome).trim();
  reg.whats = zap;
  reg.email = String(c.email || '').trim().toLowerCase();
  reg.instagram = String(c.instagram || '').trim().replace(/^@/, '');
  reg.pousada = c.pousada || '';
  reg.cidade = String(c.cidade || '').trim();
  reg.obs = String(c.obs || '').trim();
  reg.aceitaOfertas = !!c.aceitaOfertas;   /* separado do aceite de uso, por lei */
  reg.consentidoEm = c.aceitaOfertas ? new Date().toISOString() : (reg.consentidoEm || null);
  reg.atualizadoEm = new Date().toISOString();
  if (!ja) B12.DB.clientes.unshift(reg);
  B12.salvar();
  return { ok: true, cliente: reg };
};
B12.buscarClientes = function (termo) {
  var t = String(termo || '').trim().toLowerCase();
  if (!t) return B12.DB.clientes.slice(0, 60);
  return B12.DB.clientes.filter(function (c) {
    return (c.nome + ' ' + c.whats + ' ' + c.email + ' ' + c.instagram + ' ' + (c.pousada||''))
      .toLowerCase().indexOf(t) >= 0;
  }).slice(0, 60);
};
B12.apagarCliente = function (id) {
  /* a pessoa tem direito de sumir: some o contato, o histórico fica sem nome */
  B12.DB.clientes = B12.DB.clientes.filter(function (c) { return c.id !== id; });
  B12.DB.lancamentos.forEach(function (l) {
    if (l.clienteId === id) { l.clienteId = null; l.desc = l.desc + ' (cliente apagado)'; }
  });
  B12.salvar();
};
B12.histCliente = function (id) {
  var L = B12.DB.lancamentos.filter(function (l) { return l.clienteId === id; });
  return { viagens: L.length, gasto: L.reduce(function (s, l) { return s + l.valor; }, 0), lista: L };
};

/* ------------------------------------------------------------ lançamentos */
/* Um só caminho para entrada e saída. `investimento` separa compra de barco
   de custo de operar — sem isso o lucro do mês mente. */
B12.salvarLancamento = function (l) {
  var v = Number(String(l.valor).replace(/\./g, '').replace(',', '.')) || 0;
  if (v <= 0) return { erro: 'Informe um valor maior que zero.' };
  if (!l.data) return { erro: 'Informe a data.' };
  if (!l.cat) return { erro: 'Escolha a categoria.' };
  var ja = l.id && B12.DB.lancamentos.filter(function (x) { return x.id === l.id; })[0];
  var reg = ja || { id: novoId('l'), criadoEm: new Date().toISOString() };
  reg.data = l.data;
  reg.tipo = l.tipo === 'entrada' ? 'entrada' : 'saida';
  reg.cat = l.cat;
  reg.centro = l.centro || 'Administrativo';
  reg.desc = String(l.desc || l.cat).trim();
  reg.valor = Math.round(v * 100) / 100;
  reg.pg = l.pg || 'pix';
  reg.responsavel = l.responsavel || '';
  reg.embarcacao = l.embarcacao || '';
  reg.clienteId = l.clienteId || null;
  reg.investimento = !!l.investimento;
  reg.obs = String(l.obs || '').trim();
  reg.origem = ja ? reg.origem : 'mao';
  if (!ja) B12.DB.lancamentos.unshift(reg);
  B12.salvar();
  return { ok: true, lancamento: reg };
};
B12.apagarLancamento = function (id) {
  B12.DB.lancamentos = B12.DB.lancamentos.filter(function (l) { return l.id !== id; });
  B12.salvar();
};
/* o último lançamento de uma categoria, para o botão "repetir" */
B12.ultimoDe = function (cat) {
  return B12.DB.lancamentos.filter(function (l) { return l.cat === cat && l.origem === 'mao'; })
    .sort(function (a, b) { return a.data < b.data ? 1 : -1; })[0] || null;
};

/* ------------------------------------------------------------- manutenção */
B12.salvarManutencao = function (m) {
  var v = Number(String(m.valor).replace(/\./g, '').replace(',', '.')) || 0;
  if (!m.descricao || !String(m.descricao).trim()) return { erro: 'Descreva o que foi feito.' };
  if (v <= 0) return { erro: 'Informe o valor.' };
  var reg = {
    id: novoId('mn'), data: m.data || B12.hoje(),
    embarcacao: m.embarcacao || 'l01',
    tipo: m.tipo || 'corretiva',           /* preventiva · corretiva · investimento */
    descricao: String(m.descricao).trim(),
    pecas: String(m.pecas || '').trim(),
    fornecedor: String(m.fornecedor || '').trim(),
    valor: Math.round(v * 100) / 100,
    horasMotor: Number(m.horasMotor) || null,
    proxima: m.proxima || '',
    criadoEm: new Date().toISOString()
  };
  B12.DB.manutencoes.unshift(reg);
  /* toda manutenção vira saída no financeiro, sem digitar duas vezes */
  B12.salvarLancamento({
    data: reg.data, tipo: 'saida',
    cat: reg.tipo === 'investimento' ? 'Compras e fornecedores' : 'Manutenção',
    centro: 'Lancha',
    desc: reg.descricao + (reg.pecas ? ' · ' + reg.pecas : ''),
    valor: reg.valor, pg: m.pg || 'pix', embarcacao: reg.embarcacao,
    investimento: reg.tipo === 'investimento'
  });
  /* se marcou a próxima revisão, já entra como conta a pagar prevista */
  if (reg.proxima) {
    B12.DB.contas.push({ id: novoId('c'), tipo: 'pagar',
      desc: 'Revisão prevista · ' + reg.descricao, valor: reg.valor,
      venc: reg.proxima, cat: 'Manutenção', centro: 'Lancha', paga: false, avisar: true });
  }
  B12.salvar();
  return { ok: true, manutencao: reg };
};
B12.resumoManutencao = function () {
  var M = B12.DB.manutencoes;
  var r = { total: 0, investimento: 0, preventiva: 0, corretiva: 0, ultima: null, proxima: null };
  M.forEach(function (m) {
    r.total += m.valor;
    r[m.tipo] = (r[m.tipo] || 0) + m.valor;
    if (!r.ultima || m.data > r.ultima.data) r.ultima = m;
    if (m.proxima && (!r.proxima || m.proxima < r.proxima)) r.proxima = m.proxima;
  });
  return r;
};

/* ---------------------------------------------------------- estacionamento */
/* O pátio é operação diária: carro entra, fica N diárias, sai e paga. */
B12.entradaPatio = function (v) {
  var placa = String(v.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (placa.length < 6) return { erro: 'Placa incompleta.' };
  if (B12.DB.patio.some(function (x) { return x.placa === placa && !x.saidaReal; }))
    return { erro: 'Esse carro já está no pátio.' };
  var reg = {
    id: novoId('pt'), placa: placa,
    modelo: String(v.modelo || '').trim(),
    cor: String(v.cor || '').trim(),
    clienteId: v.clienteId || null,
    nome: String(v.nome || '').trim(),
    whats: String(v.whats || '').replace(/\D/g, ''),
    entrada: v.entrada || B12.hoje(),
    saidaPrevista: v.saidaPrevista || '',
    vaga: String(v.vaga || '').trim(),
    diaria: Number(v.diaria) || B12.DB.ajustes.diaria,
    saidaReal: null, pago: false, valorPago: 0,
    criadoEm: new Date().toISOString()
  };
  B12.DB.patio.unshift(reg);
  B12.salvar();
  return { ok: true, veiculo: reg };
};
B12.diariasDe = function (reg, ate) {
  var fim = ate || reg.saidaReal || B12.hoje();
  var d = (new Date(fim + 'T12:00') - new Date(reg.entrada + 'T12:00')) / 86400000;
  return Math.max(1, Math.round(d) || 1);
};
B12.saidaPatio = function (id, pg) {
  var reg = B12.DB.patio.filter(function (x) { return x.id === id; })[0];
  if (!reg) return { erro: 'Veículo não encontrado.' };
  if (reg.saidaReal) return { erro: 'Esse carro já saiu.' };
  reg.saidaReal = B12.hoje();
  var dias = B12.diariasDe(reg);
  reg.valorPago = dias * reg.diaria;
  reg.pago = true;
  B12.salvarLancamento({
    data: reg.saidaReal, tipo: 'entrada', cat: 'Estacionamento', centro: 'Estacionamento',
    desc: 'Placa ' + reg.placa + ' · ' + dias + (dias > 1 ? ' diárias' : ' diária'),
    valor: reg.valorPago, pg: pg || 'pix', clienteId: reg.clienteId
  });
  B12.salvar();
  return { ok: true, veiculo: reg, dias: dias, valor: reg.valorPago };
};
B12.patioHoje = function () {
  return B12.DB.patio.filter(function (v) { return !v.saidaReal; })
    .sort(function (a, b) { return a.entrada < b.entrada ? -1 : 1; });
};
B12.patioResumo = function () {
  var dentro = B12.patioHoje();
  var aReceber = dentro.reduce(function (s, v) { return s + B12.diariasDe(v) * v.diaria; }, 0);
  var vencendo = dentro.filter(function (v) {
    return v.saidaPrevista && v.saidaPrevista <= B12.hoje(); });
  return { dentro: dentro.length, aReceber: Math.round(aReceber), vencendo: vencendo };
};

/* --------------------------------------- atendimento de balcão (chegou agora) */
/* A pessoa chega sem reserva. Um caminho só: cria a ficha, lança a venda e,
   se deixar carro, abre o pátio. É a tela mais usada da operação. */
B12.atenderBalcao = function (a) {
  var res = B12.salvarCliente({
    nome: a.nome, whats: a.whats, email: a.email, instagram: a.instagram,
    pousada: a.pousada, cidade: a.cidade, aceitaOfertas: a.aceitaOfertas
  });
  if (res.erro) return res;
  var cli = res.cliente;

  var p = B12.preco({ produto: a.produto || 'regular', pax: a.pax || 1,
    criancas: a.criancas || 0, faixa: a.faixa || B12.faixaHora(a.hora),
    diarias: 0, pg: a.pg });
  var valor = p ? p.travessia : Number(a.valorManual) || 0;
  if (valor <= 0) return { erro: 'Horário fora da tabela: informe o valor combinado.' };

  B12.salvarLancamento({
    data: a.data || B12.hoje(), tipo: 'entrada', cat: 'Travessias', centro: 'Lancha',
    desc: (a.pax || 1) + ' travessias · ' + (a.pax || 1) + ' passageiros · ' + cli.nome,
    valor: valor, pg: a.pg || 'pix', responsavel: a.responsavel || '',
    embarcacao: 'l01', clienteId: cli.id
  });
  cli.viagens = (cli.viagens || 0) + 1;
  cli.gasto = (cli.gasto || 0) + valor;

  var veic = null;
  if (a.placa) {
    var e = B12.entradaPatio({ placa: a.placa, modelo: a.modelo, cor: a.cor,
      clienteId: cli.id, nome: cli.nome, whats: cli.whats,
      saidaPrevista: a.saidaPrevista, vaga: a.vaga });
    if (!e.erro) veic = e.veiculo;
  }
  B12.salvar();
  return { ok: true, cliente: cli, valor: valor, veiculo: veic };
};

/* ------------------------------------------------ investimento x operação */
B12.resumoInvestimento = function () {
  var L = B12.DB.lancamentos.filter(function (l) { return l.investimento; });
  var porAno = {};
  L.forEach(function (l) { var a = l.data.slice(0,4); porAno[a] = (porAno[a]||0) + l.valor; });
  return { total: L.reduce(function (s,l) { return s+l.valor; }, 0), itens: L, porAno: porAno };
};
/* o resumo do mês passa a excluir investimento do custo de operar */
B12.resumoMesOperacional = function (ym) {
  var r = B12.resumoMes(ym);
  var inv = B12.DB.lancamentos.filter(function (l) {
    return l.data.slice(0,7) === ym && l.investimento; })
    .reduce(function (s, l) { return s + l.valor; }, 0);
  r.investimento = inv;
  r.saidasOperacao = r.saidas - inv;
  r.lucroOperacional = r.entradas - r.saidasOperacao - r.taxa;
  return r;
};


/* ============================================================================
   GESTÃO — os números que mudam decisão
   ========================================================================== */

/* Ponto de equilíbrio: quantos passageiros por mês só para pagar o que é fixo. */
B12.pontoEquilibrio = function () {
  var fixos = B12.DB.contas.filter(function (c) { return c.fixa && c.tipo === 'pagar'; });
  var vistos = {}, mensal = 0;
  fixos.forEach(function (c) { if (vistos[c.desc]) return; vistos[c.desc] = 1; mensal += c.valor; });

  var ym = B12.mesAtual(), r = B12.resumoMes(ym);
  var pax = 0;
  B12.DB.lancamentos.forEach(function (l) {
    if (l.data.slice(0,7) !== ym) return;
    var m = /· (\d+) passageiros/.exec(l.desc || ''); if (m) pax += +m[1];
  });
  var receitaPax = r.porCat['Travessias'] || 0;
  var ticket = pax ? receitaPax / pax : B12.DB.ajustes.regular * 2;

  /* combustível come uma fatia de cada real que entra */
  var comb = r.porCat['Combustível'] || 0;
  var fatiaComb = r.entradas ? comb / r.entradas : 0.155;
  var taxaMedia = r.entradas ? r.taxa / r.entradas : 0.025;
  var margem = 1 - fatiaComb - taxaMedia;            /* o que sobra de cada real para os fixos */

  var receitaNec = margem > 0 ? mensal / margem : 0;
  return {
    fixosMensais: Math.round(mensal),
    ticketMedio: Math.round(ticket),
    fatiaCombustivel: fatiaComb,
    taxaMedia: taxaMedia,
    margemContribuicao: margem,
    receitaNecessaria: Math.round(receitaNec),
    passageirosNecessarios: ticket > 0 ? Math.ceil(receitaNec / ticket) : 0,
    receitaAtual: r.entradas,
    passageirosAtuais: pax,
    coberto: r.entradas >= receitaNec
  };
};

/* Margem por serviço: receita menos o que aquele serviço custa. */
B12.margemPorServico = function (ym) {
  ym = ym || B12.mesAtual();
  var r = B12.resumoMes(ym);
  var comb = r.porCat['Combustível'] || 0;
  var manut = r.porCat['Manutenção'] || 0;
  var custoBarco = comb + manut;                     /* só travessia e passeio consomem barco */
  var trav = r.porCat['Travessias'] || 0;
  var pass = r.porCat['Passeios'] || 0;
  var est  = r.porCat['Estacionamento'] || 0;
  var com  = r.porCat['Comissões de hospedagem'] || 0;
  var base = trav + pass || 1;
  return [
    { nome:'Travessias',   receita:trav, custo: Math.round(custoBarco * trav/base) },
    { nome:'Passeios',     receita:pass, custo: Math.round(custoBarco * pass/base) },
    { nome:'Estacionamento', receita:est, custo: 0 },
    { nome:'Comissões',    receita:com,  custo: 0 }
  ].filter(function (x) { return x.receita > 0; })
   .map(function (x) { x.lucro = x.receita - x.custo;
     x.margem = x.receita ? x.lucro / x.receita : 0; return x; })
   .sort(function (a,b) { return b.lucro - a.lucro; });
};

/* Custo de combustível por passageiro, do histórico real e do mês. */
B12.custoPorPassageiro = function () {
  var H = B12.HIST_RESUMO, C = B12.COMB_TOTAL;
  var ym = B12.mesAtual(), r = B12.resumoMes(ym), pax = 0;
  B12.DB.lancamentos.forEach(function (l) {
    if (l.data.slice(0,7) !== ym) return;
    var m = /· (\d+) passageiros/.exec(l.desc || ''); if (m) pax += +m[1];
  });
  return {
    historico: C.litros ? C.valor / H.passageiros : 0,
    mes: pax ? (r.porCat['Combustível'] || 0) / pax : 0,
    paxMes: pax
  };
};

/* Acumulado do ano contra o mesmo período do ano anterior, pelo histórico real. */
B12.acumuladoAno = function (ano) {
  function ate(a, mesLim) {
    var t = 0, n = 0;
    B12.HIST_VENDAS.forEach(function (m) {
      if (+m[0].slice(0,4) === a && +m[0].slice(5,7) <= mesLim) { t += m[3] + m[4]; n++; }
    });
    return { total: t, meses: n };
  }
  var serie = [];
  for (var m = 1; m <= 12; m++) serie.push({ mes: m, atual: ate(ano, m), anterior: ate(ano-1, m) });
  return serie;
};

/* Dia da semana que mais rende, pelo movimento lançado. */
B12.porDiaDaSemana = function () {
  var d = [0,0,0,0,0,0,0], n = [0,0,0,0,0,0,0];
  B12.DB.lancamentos.forEach(function (l) {
    if (l.tipo !== 'entrada') return;
    var dw = new Date(l.data + 'T12:00').getDay();
    d[dw] += l.valor; n[dw]++;
  });
  var nomes = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  return d.map(function (v, i) { return { dia: nomes[i], total: Math.round(v), lanc: n[i] }; });
};
