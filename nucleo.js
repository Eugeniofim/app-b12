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
    turistas: [],
    ajustes: {
      metaMensal: 60000,
      reservaMinima: 45000,     /* PENDENTE: a regra é do cliente */
      saldoInicial: 38500,
      taxas: B12.TAXAS,
      regular: B12.REGULAR,
      diaria: B12.DIARIA,
      tabela: B12.TABELA
    },
    semeado: false
  };
}

B12.carregar = function () {
  try { B12.DB = JSON.parse(localStorage.getItem(CHAVE)) || vazio(); }
  catch (e) { B12.DB = vazio(); }
  if (!B12.DB.ajustes) B12.DB.ajustes = vazio().ajustes;
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
                              (d.contas||[]).length + (d.saidas||[]).length; }
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

  D.semeado = true;
  try { localStorage.setItem(CHAVE, JSON.stringify(D)); } catch (e) {}
};
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
B12.novaReserva = function (r) {
  r.cod = 'B12-' + Math.floor(1000 + Math.random()*9000);
  r.criada = new Date().toISOString();
  r.situacao = 'pedida';
  B12.DB.reservas.unshift(r);
  B12.salvar();
  return r;
};

/* ------------------------------------------------------------------- saídas */
B12.saidasDoDia = function (iso, sentido) {
  return B12.DB.saidas.filter(function (s) {
    return s.data === iso && (!sentido || s.sentido === sentido);
  }).sort(function(a,b){ return a.hora < b.hora ? -1 : 1; });
};
