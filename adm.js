/* ============================================================================
   Estação B12 — painel do proprietário
   Nove painéis: Hoje · Painel · Caixa · Lançamentos · Contas · Relatórios ·
   Operação · Prospecção · Inteligência.
   Os números do mês corrente são de demonstração; os do histórico são reais,
   da planilha do cliente. Cada tela diz qual é qual.
   ========================================================================== */
var B12 = window.B12 || {};

(function () {
var NS = 'http://www.w3.org/2000/svg';
function el(t, a) { var e = document.createElementNS(NS, t);
  for (var k in a) e.setAttribute(k, a[k]); return e; }
function txt(e, s) { e.textContent = s; return e; }
/* dica ao passar o mouse e ao tocar: o valor nunca depende só da cor ou da altura */
function dica(el, texto) {
  var t = document.createElementNS(NS, 'title'); t.textContent = texto; el.appendChild(t);
  el.style.cursor = 'pointer';
  el.addEventListener('click', function (ev) {
    var svg = el.ownerSVGElement; if (!svg) return;
    var ant = svg.querySelector('.dica-toque'); if (ant) ant.remove();
    var b = el.getBBox(), g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'dica-toque');
    var x = b.x + b.width / 2, y = Math.max(12, b.y - 8);
    var r = document.createElementNS(NS, 'rect'), l = document.createElementNS(NS, 'text');
    l.setAttribute('x', x); l.setAttribute('y', y); l.setAttribute('text-anchor', 'middle');
    l.setAttribute('fill', '#E6F0F5'); l.setAttribute('font-size', '11'); l.setAttribute('font-weight', '700');
    l.textContent = texto; g.appendChild(r); g.appendChild(l); svg.appendChild(g);
    var lb = l.getBBox(); r.setAttribute('x', lb.x - 6); r.setAttribute('y', lb.y - 3);
    r.setAttribute('width', lb.width + 12); r.setAttribute('height', lb.height + 6);
    r.setAttribute('rx', 5); r.setAttribute('fill', '#071A28'); r.setAttribute('stroke', '#57D8C8'); r.setAttribute('stroke-width', '1');
    setTimeout(function () { if (g.parentNode) g.remove(); }, 2600);
    ev.stopPropagation();
  });
  return el;
}
function cor(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
var C = { turq:'#14A99A', turq3:'#57D8C8', azul:'#3C86B8', gelo3:'#6C8FA3',
          risco:'#1B4157', bom:'#2FA76A', ruim:'#D2564A', aten:'#D9932B' };

/* ---------------------------------------------------- número que sobe sozinho */
function subirNumero(nodo, alvo, fmt, ms) {
  /* sem animação quando a pessoa pediu menos movimento, e quando a tela está
     escondida — ali o requestAnimationFrame não roda e o número ficaria em 0 */
  if (document.hidden || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    nodo.textContent = fmt(alvo); return;
  }
  var t0 = performance.now(); ms = ms || 850;
  (function passo(t) {
    var k = Math.min(1, (t - t0) / ms);
    var e = 1 - Math.pow(1 - k, 3);
    nodo.textContent = fmt(alvo * e);
    if (k < 1) requestAnimationFrame(passo); else nodo.textContent = fmt(alvo);
  })(t0);
}
B12.animarPlacar = function (raiz) {
  (raiz || document).querySelectorAll('[data-sobe]').forEach(function (n) {
    var alvo = parseFloat(n.getAttribute('data-sobe'));
    var tipo = n.getAttribute('data-fmt') || 'brl';
    subirNumero(n, alvo, tipo === 'brl' ? function(v){return B12.brl(v);} :
      tipo === 'pct' ? function(v){return v.toFixed(0)+'%';} :
      function(v){return Math.round(v).toLocaleString('pt-BR');});
  });
};

/* ------------------------------------------------------------------ gráficos */
function eixoY(s, L, R, T, ph, max, fmt) {
  for (var i = 0; i <= 4; i++) {
    var v = max * i / 4, y = T + ph - (v / max) * ph;
    s.appendChild(el('line', { x1:L, x2:R, y1:y, y2:y, stroke:C.risco, 'stroke-width':1 }));
    s.appendChild(txt(el('text', { x:L-6, y:y+3.5, 'text-anchor':'end', fill:C.gelo3,
      'font-size':9, 'font-family':'ui-monospace,monospace' }), fmt(v)));
  }
}
function kk(v) { return v >= 1000 ? Math.round(v/1000) + 'k' : String(Math.round(v)); }

/* barras empilhadas (duas séries) */
function grafBarras(alvo, dados, opc) {
  opc = opc || {};
  var W = 480, H = opc.altura || 190, L = 40, R = 6, T = 10, B = 26;
  var pw = W-L-R, ph = H-T-B;
  var s = el('svg', { viewBox:'0 0 '+W+' '+H, class:'graf', role:'img' });
  var max = opc.max || Math.max.apply(null, dados.map(function(d){ return (d.a||0)+(d.b||0); })) * 1.14 || 1;
  eixoY(s, L, W-R, T, ph, max, kk);
  var bw = pw / dados.length;
  dados.forEach(function (d, i) {
    var x = L + i*bw + bw*0.18, w = bw*0.64;
    function y(v){ return T + ph - (v/max)*ph; }
    if (d.vazio) {
      s.appendChild(dica(el('rect', { x:x, y:T, width:w, height:ph, fill:C.aten, opacity:.14, rx:2 }),
        (d.rot ? d.rot + ': ' : '') + 'sem registro'));
    } else {
      var ra = el('rect', { x:x, y:y(d.a), width:w, height:Math.max(ph-(y(d.a)-T),1),
        fill:d.cor || C.turq, rx:2 });
      dica(ra, (d.rot ? d.rot + ': ' : '') + B12.brl(d.a) + (d.b ? ' + ' + B12.brl(d.b) : ''));
      s.appendChild(ra);
      if (d.b) s.appendChild(dica(el('rect', { x:x, y:y(d.a+d.b), width:w,
        height:Math.max(y(d.a)-y(d.a+d.b),0), fill:C.azul, rx:2 }),
        (d.rot ? d.rot + ': ' : '') + B12.brl(d.b) + ' (total ' + B12.brl(d.a+d.b) + ')'));
      if (d.destaque) s.appendChild(txt(el('text', { x:x+w/2, y:y(d.a+(d.b||0))-5,
        'text-anchor':'middle', fill:C.turq3, 'font-size':10, 'font-weight':'700' }),
        B12.brl(d.a+(d.b||0))));
    }
    if (d.rot) s.appendChild(txt(el('text', { x:L+i*bw+bw/2, y:H-9, 'text-anchor':'middle',
      fill:C.gelo3, 'font-size':9, 'font-family':'ui-monospace,monospace' }), d.rot));
  });
  alvo.appendChild(s);
  /* desenho entrando */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    s.querySelectorAll('rect').forEach(function (r, i) {
      var h = +r.getAttribute('height'), y = +r.getAttribute('y');
      r.setAttribute('height', 0); r.setAttribute('y', y + h);
      setTimeout(function () {
        r.style.transition = 'height .55s cubic-bezier(.22,.61,.36,1), y .55s cubic-bezier(.22,.61,.36,1)';
        r.setAttribute('height', h); r.setAttribute('y', y);
      }, 40 + i * 22);
    });
  }
  return s;
}

/* linha com área (projeção de caixa) */
function grafLinha(alvo, pontos, opc) {
  opc = opc || {};
  var W = 480, H = opc.altura || 170, L = 42, R = 8, T = 12, B = 24;
  var pw = W-L-R, ph = H-T-B;
  var s = el('svg', { viewBox:'0 0 '+W+' '+H, class:'graf', role:'img' });
  var vals = pontos.map(function(p){ return p.v; });
  var max = Math.max.apply(null, vals) * 1.12, min = Math.min(0, Math.min.apply(null, vals) * 1.15);
  function y(v){ return T + ph - ((v-min)/(max-min))*ph; }
  function x(i){ return L + (i/(pontos.length-1))*pw; }
  for (var i=0;i<=4;i++){ var v = min + (max-min)*i/4;
    s.appendChild(el('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),stroke:C.risco,'stroke-width':1}));
    s.appendChild(txt(el('text',{x:L-6,y:y(v)+3.5,'text-anchor':'end',fill:C.gelo3,
      'font-size':9,'font-family':'ui-monospace,monospace'}), kk(v))); }
  if (min < 0) s.appendChild(el('line',{x1:L,x2:W-R,y1:y(0),y2:y(0),stroke:C.ruim,
    'stroke-width':1.4,'stroke-dasharray':'4 3'}));
  var d = pontos.map(function(p,i){ return (i?'L':'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
  var area = d + ' L ' + x(pontos.length-1).toFixed(1) + ' ' + y(min) + ' L ' + x(0) + ' ' + y(min) + ' Z';
  s.appendChild(el('path',{ d:area, fill:C.turq, opacity:.14 }));
  var lin = el('path',{ d:d, fill:'none', stroke:C.turq3, 'stroke-width':2.4,
    'stroke-linejoin':'round', 'stroke-linecap':'round' });
  s.appendChild(lin);
  pontos.forEach(function (p, i) {
    s.appendChild(dica(el('circle',{ cx:x(i), cy:y(p.v), r:9, fill:'transparent' }),
      (p.rot || ('ponto ' + (i+1))) + ': ' + B12.brl(p.v)));
    if (!p.marca) return;
    s.appendChild(el('circle',{ cx:x(i), cy:y(p.v), r:4, fill:C.turq3, stroke:'#071A28','stroke-width':2 }));
    s.appendChild(txt(el('text',{ x:x(i), y:y(p.v)-10,'text-anchor': i>pontos.length-3?'end':'middle',
      fill:C.turq3,'font-size':10,'font-weight':'700' }), B12.brl(p.v)));
  });
  pontos.forEach(function (p, i) {
    if (!p.rot) return;
    s.appendChild(txt(el('text',{ x:x(i), y:H-7,'text-anchor':'middle',fill:C.gelo3,
      'font-size':9,'font-family':'ui-monospace,monospace' }), p.rot));
  });
  alvo.appendChild(s);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var comp = lin.getTotalLength();
    lin.style.strokeDasharray = comp; lin.style.strokeDashoffset = comp;
    setTimeout(function(){ lin.style.transition='stroke-dashoffset 1.1s ease-out';
      lin.style.strokeDashoffset = 0; }, 60);
  }
  return s;
}

/* rosca de participação */
function grafRosca(alvo, fatias) {
  var W=160,H=160,r=62,cx=80,cy=80, total = fatias.reduce(function(s,f){return s+f.v;},0)||1;
  var s = el('svg',{ viewBox:'0 0 '+W+' '+H, class:'graf', role:'img',
    style:'max-width:160px;margin:0 auto' });
  var ang = -Math.PI/2;
  fatias.forEach(function (f, i) {
    var a = f.v/total * Math.PI*2, fim = ang + a;
    var x1=cx+r*Math.cos(ang), y1=cy+r*Math.sin(ang), x2=cx+r*Math.cos(fim), y2=cy+r*Math.sin(fim);
    var arco = el('path',{ d:'M '+cx+' '+cy+' L '+x1.toFixed(2)+' '+y1.toFixed(2)+
      ' A '+r+' '+r+' 0 '+(a>Math.PI?1:0)+' 1 '+x2.toFixed(2)+' '+y2.toFixed(2)+' Z',
      fill:f.cor, opacity:0 });
    dica(arco, (f.nome || '') + ': ' + B12.brl(f.v) + ' (' + Math.round(f.v/total*100) + '%)');
    s.appendChild(arco);
    setTimeout(function(){ arco.style.transition='opacity .4s'; arco.setAttribute('opacity',1); }, 60+i*80);
    ang = fim;
  });
  s.appendChild(el('circle',{ cx:cx, cy:cy, r:r*0.58, fill:'#0C2637' }));
  alvo.appendChild(s);
}

/* ============================================================== os painéis */
var ABAS = [
  ['hoje','Hoje'], ['ia','Assistente'], ['balcao','Balcão'], ['ilha','Na Ilha'], ['escala','Horários'], ['painel','Painel'], ['precos','Preços'], ['gestao','Gestão'],
  ['caixa','Caixa'], ['lanc','Lançamentos'],
  ['clientes','Clientes'], ['patio','Pátio'], ['manut','Manutenção'],
  ['contas','Contas'], ['relat','Relatórios'], ['dados','Dados'], ['oper','Operação'],
  ['prosp','Prospecção'], ['msgs','Mensagens'], ['intel','Inteligência']
];
var abaAtual = 'hoje';

B12.admDesenhar = function (aba) {
  abaAtual = aba || abaAtual;
  var raiz = document.getElementById('adm-corpo');
  var barra = document.getElementById('adm-abas');
  barra.innerHTML = ABAS.map(function (a) {
    return '<button class="aba'+(a[0]===abaAtual?' on':'')+'" data-aba="'+a[0]+'">'+a[1]+'</button>';
  }).join('');
  barra.querySelectorAll('.aba').forEach(function (b) {
    b.onclick = function () { B12.admDesenhar(b.dataset.aba);
      barra.scrollTo({ left: b.offsetLeft - 60, behavior:'smooth' }); };
  });
  /* leva a aba escolhida para dentro da vista, e tira o esmaecido no fim da tira */
  var ativa = barra.querySelector('.aba.on');
  if (ativa) barra.scrollLeft = Math.max(0, ativa.offsetLeft - 60);
  function fim() { barra.classList.toggle('fim', barra.scrollLeft + barra.clientWidth >= barra.scrollWidth - 4); }
  barra.onscroll = fim; fim();
  raiz.innerHTML = '';
  ({ hoje:pHoje, painel:pPainel, caixa:pCaixa, lanc:pLanc, contas:pContas,
     relat:pRelat, oper:pOper, prosp:pProsp, intel:pIntel,
     clientes:pClientes, patio:pPatio, manut:pManut, gestao:pGestao,
     escala:pEscala, msgs:pMsgs, dados:pDados, precos:pPrecos, ia:pIA, ilha:pNaIlha, balcao:pBalcao }[abaAtual] || pHoje)(raiz);
  B12.animarPlacar(raiz);
  B12.ligarLupa('');
  raiz.scrollIntoView({ block:'nearest' });
};

/* ------------------------------------------------------------------- LUPA
   Uma caixa só, no topo, que vale em qualquer aba. O balcão digita o código
   do voucher e a pessoa aparece. Também acha por nome, WhatsApp e placa.
   A mesma caixa serve o painel do dono e a tela da equipe — muda só o sufixo
   dos ids, porque as duas telas existem ao mesmo tempo no HTML. */
var lupasLigadas = {};
B12.ligarLupa = function (suf) {
  suf = suf || '';
  var cx = document.getElementById('q-reserva' + suf);
  var res = document.getElementById('q-res' + suf);
  var lim = document.getElementById('q-limpa' + suf);
  if (!cx || !res) return;
  if (lupasLigadas[suf]) { pintarLupa(suf, cx.value); return; }
  lupasLigadas[suf] = true;

  cx.oninput = function () { pintarLupa(suf, cx.value); };
  cx.onkeydown = function (ev) {
    if (ev.key === 'Escape') { cx.value = ''; pintarLupa(suf, ''); cx.blur(); }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      var um = res.querySelector('[data-res]');
      if (um) um.click();
    }
  };
  if (lim) lim.onclick = function () { cx.value = ''; pintarLupa(suf, ''); cx.focus(); };
};

function pintarLupa(suf, termo) {
  var res = document.getElementById('q-res' + suf);
  var lim = document.getElementById('q-limpa' + suf);
  if (!res) return;
  var t = String(termo || '').trim();
  if (lim) lim.hidden = !t;
  if (t.length < 2) { res.hidden = true; res.innerHTML = ''; return; }

  var achados = B12.buscarReservas(t);
  res.hidden = false;
  if (!achados.length) {
    res.innerHTML = '<div class="lr-vazio">Nada com &ldquo;' + esc(t) + '&rdquo;. ' +
      'Tente só os quatro números do código.</div>';
    return;
  }
  var hoje = B12.hoje(), dono = B12.pode('dono');
  res.innerHTML = achados.map(function (r) {
    var conta = dono ? B12.contaDaReserva(r.id) : null;
    var aberta = conta && !(conta.jaPago && !conta.estacionamento) && conta.total > 0;
    var quando = r.ida === hoje ? 'hoje' : B12.dataBR(r.ida);
    return '<button type="button" data-res="' + r.id + '">' +
      '<span><span class="lr-cod">' + esc(r.cod) + '</span>' +
      '<span class="lr-nome">' + esc(r.nome) + '</span>' +
      '<span class="lr-sub">' + r.pax + (r.pax > 1 ? ' pessoas' : ' pessoa') +
        ' · ida ' + quando + (r.placa ? ' · ' + esc(r.placa) : '') + '</span></span>' +
      (aberta ? '<span class="lr-cod" style="color:var(--ouro)">a receber</span>' : '') +
      '</button>';
  }).join('');
  res.querySelectorAll('[data-res]').forEach(function (b) {
    b.onclick = function () {
      B12.fichaReserva(b.dataset.res, function () {
        if (suf) { if (B12.pintarEquipe) B12.pintarEquipe(); }
        else B12.admDesenhar();
      });
    };
  });
}

function bloco(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }

/* ------------------------------------------------------------------- HOJE */
function pHoje(raiz) {
  var hoje = B12.hoje(), r = B12.resumoDia(hoje), mes = B12.resumoMes(B12.mesAtual());
  var venc = B12.contasVencidas(), prox = B12.contasProximas(7);
  blocoLembretes(raiz);
  raiz.appendChild(bloco(
    '<div class="placar entra">' +
    tile(r.faturamento,'Faturamento','brl','destaque') +
    tile(r.travessias,'Travessias','n') +
    tile(r.pax,'Passageiros','n') +
    tile(r.passeios,'Passeios','n') +
    tile(r.combustivel,'Combustível','brl') +
    tile(r.resultado,'Resultado','brl','destaque') +
    '</div>' +
    (function () {
      var ab = B12.contasAbertas();
      if (!ab.length) return '';
      var soma = ab.reduce(function (s, c) { return s + c.total; }, 0);
      return '<button type="button" class="ia-atalho entra" data-ir-receber ' +
        'style="border-color:var(--atencao)">' +
        '<div class="ia-atalho-ico" style="background:linear-gradient(150deg,#E5A43B,#B87A1C)">' +
        '<svg viewBox="0 0 24 24"><path d="M3 7h18v10H3z" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="12" r="2.6"/></svg></div>' +
        '<div class="ia-atalho-txt"><b>A receber na saída: ' + B12.brl(soma) + '</b>' +
        '<small>' + ab.length + ' pessoa' + (ab.length > 1 ? 's' : '') + ' já viajaram e pagam quando voltarem</small></div>' +
        '<svg class="ia-atalho-seta" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>';
    })() +
    '<button type="button" class="ia-atalho entra" data-ia-abrir>' +
      '<div class="ia-atalho-ico"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9c0 1.6.4 3.1 1.2 4.4L3 21l4.8-1.1A9 9 0 1 0 12 3z" stroke-linejoin="round"/>' +
      '<path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-linecap="round" stroke-width="2.6"/></svg></div>' +
      '<div class="ia-atalho-txt"><b>Pergunte ao assistente</b>' +
      '<small>"Como foi o dia?" · "Quem viaja amanhã?" · "Quanto posso retirar?"</small></div>' +
      '<svg class="ia-atalho-seta" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '</button>' +
    '<div class="cx entra entra-1"><h3>O mês até agora <span class="selo-demo">demonstração</span></h3>' +
    '<p>Entrou ' + B12.brl(mes.entradas) + ', saiu ' + B12.brl(mes.saidas) +
    ', e a maquininha levou ' + B12.brl(mes.taxa) + '.</p>' +
    '<div class="medidor' + (mes.entradas < B12.DB.ajustes.metaMensal*0.6 ? ' aviso':'') + '">' +
    '<i style="width:' + Math.min(100, mes.entradas/B12.DB.ajustes.metaMensal*100).toFixed(1) + '%"></i></div>' +
    '<p style="margin-top:7px;font-size:12px">Meta do mês: ' + B12.brl(B12.DB.ajustes.metaMensal) +
    ' · falta ' + B12.brl(Math.max(0, B12.DB.ajustes.metaMensal - mes.entradas)) + '</p></div>' +
    (venc.length ?
      '<div class="cx aviso entra entra-2"><h3>' + venc.length + ' conta' + (venc.length>1?'s':'') +
      ' vencida' + (venc.length>1?'s':'') + '</h3><p>' +
      venc.map(function(c){ return c.desc + ' · ' + B12.brl(c.valor); }).join('<br>') + '</p></div>' : '') +
    (prox.length ?
      '<div class="cx entra entra-3"><h3>Vence nos próximos 7 dias</h3>' +
      prox.map(function (c) { return '<div class="linha" style="margin-top:8px"><span class="tag">' +
        B12.dataBR(c.venc).slice(0,5) + '</span><div class="d"><b>' + c.desc + '</b>' +
        '<small>' + c.cat + '</small></div><span class="v sai">' + B12.brl(c.valor) + '</span></div>'; }).join('') +
      '</div>' : '')
  ));
  /* os horários: hoje, e amanhã enquanto não estiverem montados */
  raiz.appendChild(blocoHorarios(hoje));
  var manha = B12.diaMais(hoje, 1);
  if (!B12.saidasDoDia(manha, 'volta').length || !B12.saidasDoDia(manha, 'ida').length) {
    raiz.appendChild(blocoHorarios(manha));
  }

  var g = document.createElement('div'); g.className = 'cx entra entra-4';
  g.innerHTML = '<h3>Últimos 14 dias <span class="selo-demo">demonstração</span></h3>';
  raiz.appendChild(g);
  var serie = [];
  for (var i = 13; i >= 0; i--) {
    var d = B12.diaMais(hoje, -i), rr = B12.resumoDia(d);
    serie.push({ a: rr.faturamento, rot: (i%3===0? d.slice(8) : ''), destaque: i===0 });
  }
  grafBarras(g, serie, { altura:150 });
  var atalho = raiz.querySelector('[data-ia-abrir]');
  if (atalho) atalho.onclick = function () { B12.admDesenhar('ia'); };
  var rec = raiz.querySelector('[data-ir-receber]');
  if (rec) rec.onclick = function () { B12.admDesenhar('ilha'); };
}

function tile(v, k, fmt, cls) {
  return '<div class="pl ' + (cls||'') + '"><div class="v num" data-sobe="' + v +
    '" data-fmt="' + fmt + '">' + (fmt==='brl'?B12.brl(0):'0') + '</div><div class="k">' + k + '</div></div>';
}
/* ----------------------------------------------------------------- PAINEL */
function pPainel(raiz) {
  var ym = B12.mesAtual(), hoje = B12.hoje();
  var mes = B12.resumoMes(ym);
  var diaMesN = +hoje.slice(8);
  var ant = B12.resumoMesAte(B12.mesMais(ym,-1), diaMesN);   /* mesmo período, não o mês todo */
  var antCheio = B12.resumoMes(B12.mesMais(ym,-1));
  var dia = B12.resumoDia(hoje);
  var sem = B12.periodo(B12.diaMais(hoje,-6), hoje);
  var diaMes = +hoje.slice(8), diasNoMes = new Date(+ym.slice(0,4), +ym.slice(5,7), 0).getDate();
  var previsao = Math.round(mes.entradas / diaMes * diasNoMes);
  var varMes = ant.entradas ? (mes.entradas - ant.entradas)/ant.entradas : 0;

  raiz.appendChild(bloco(
    '<div class="grade2 entra">' +
      mini('Hoje', B12.brl(dia.faturamento), dia.travessias + ' travessias') +
      mini('Semana', B12.brl(sem.entradas), 'últimos 7 dias') +
      mini('Mês', B12.brl(mes.entradas), diaMes + ' de ' + diasNoMes + ' dias') +
      mini('Lucro estimado', B12.brl(mes.lucro), 'margem ' + (mes.margem*100).toFixed(0) + '%') +
    '</div>' +
    '<div class="cx entra entra-1"><h3>Entradas e saídas do mês</h3>' +
      linhaBarra('Entradas', mes.entradas, mes.entradas, C.bom) +
      linhaBarra('Saídas', mes.saidas, mes.entradas, C.ruim) +
      linhaBarra('Taxa de cartão', mes.taxa, mes.entradas, C.aten) +
      '<div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:11px;' +
      'border-top:1px solid var(--noite-risco);font-size:17px;font-weight:750">' +
      '<span>Sobrou</span><span style="color:' + (mes.lucro>=0?C.turq3:C.ruim) + '">' +
      B12.brl(mes.lucro) + '</span></div></div>' +
    '<div class="grade2 entra entra-2">' +
      mini('Saldo em caixa', B12.brl(B12.saldo()), 'hoje') +
      mini('Contra o mês passado', B12.pct(varMes),
        ant.entradas ? 'até o dia ' + diaMesN + ', dos dois meses' : 'sem base') +
      mini('Previsão de fechamento', B12.brl(previsao),
        antCheio.entradas ? 'mês passado fechou ' + B12.brl(antCheio.entradas) : 'no ritmo de hoje') +
      mini('Meta do mês', B12.brl(B12.DB.ajustes.metaMensal),
        Math.round(mes.entradas/B12.DB.ajustes.metaMensal*100) + '% atingido') +
    '</div>'
  ));
  var g = document.createElement('div'); g.className = 'cx entra entra-3';
  g.innerHTML = '<h3>De onde vem a receita do mês</h3>';
  raiz.appendChild(g);
  var cats = ['Travessias','Estacionamento','Passeios','Comissões de hospedagem'];
  var cores = [C.turq, C.azul, C.turq3, C.aten];
  var fat = cats.map(function (c, i) { return { v: mes.porCat[c]||0, cor: cores[i], nome:c }; })
                .filter(function(f){ return f.v > 0; });
  grafRosca(g, fat);
  g.appendChild(bloco('<div class="leg">' + fat.map(function (f) {
    return '<span><i style="background:' + f.cor + '"></i>' + f.nome + ' · ' +
      Math.round(f.v/mes.entradas*100) + '%</span>'; }).join('') + '</div>'));
}
function mini(k, v, s) {
  return '<div class="mini"><div class="k">' + k + '</div><div class="v num">' + v +
    '</div><div class="s">' + s + '</div></div>';
}
function linhaBarra(nome, v, base, c) {
  var p = base ? Math.min(100, v/base*100) : 0;
  return '<div style="margin-top:11px"><div style="display:flex;justify-content:space-between;' +
    'font-size:13px;margin-bottom:5px"><span>' + nome + '</span><b class="num">' + B12.brl(v) + '</b></div>' +
    '<div class="medidor"><i style="width:' + p.toFixed(1) + '%;background:' + c + '"></i></div></div>';
}

/* ------------------------------------------------------------------ CAIXA */
function pCaixa(raiz) {
  var p7 = B12.projecao(7), p15 = B12.projecao(15), p30 = B12.projecao(30), p60 = B12.projecao(60);
  raiz.appendChild(bloco(
    '<div class="cx entra"><h3>Quanto você terá disponível</h3>' +
    '<p>Somando o que está em caixa, as contas com data marcada e a receita esperada pela ' +
    'sazonalidade real dos seus 11 anos.</p></div>' +
    '<div class="placar entra entra-1">' +
      tile(p7.fim,'Em 7 dias','brl') + tile(p15.fim,'Em 15 dias','brl') +
      tile(p30.fim,'Em 30 dias','brl') + tile(p60.fim,'Em 60 dias','brl',
        p60.fim < B12.DB.ajustes.reservaMinima ? 'alerta' : 'destaque') +
      tile(p60.aPagar,'A pagar (60d)','brl') + tile(p60.aReceber,'A receber (60d)','brl') +
    '</div>'
  ));
  var g = document.createElement('div'); g.className = 'cx entra entra-2';
  g.innerHTML = '<h3>A curva dos próximos 60 dias</h3>';
  raiz.appendChild(g);
  var pts = [];
  for (var d = 0; d <= 60; d += 5) {
    var pr = B12.projecao(d);
    pts.push({ v: pr.fim, rot: d%15===0 ? (d===0?'hoje':d+'d') : '', marca: d===60 });
  }
  grafLinha(g, pts, { altura:170 });
  g.appendChild(bloco('<div class="leg"><span><i style="background:' + C.turq3 +
    '"></i>saldo projetado</span><span><i style="background:' + C.ruim +
    '"></i>linha do zero</span></div>'));

  /* quanto posso retirar */
  var q = document.createElement('div'); q.className = 'cx entra entra-3';
  q.innerHTML =
    '<h3>Quanto posso retirar?</h3>' +
    '<p>Digite quanto quer tirar da empresa. A conta é aritmética, não é palpite: dá para ' +
    'abrir e ver de onde veio cada número.</p>' +
    '<label>Quero retirar</label>' +
    '<input id="q-valor" type="number" step="500" value="10000" inputmode="numeric">' +
    '<div id="q-resposta"></div>';
  raiz.appendChild(q);
  var campo = q.querySelector('#q-valor');
  function responder() {
    var v = Math.max(0, +campo.value || 0), r = B12.retirada(v);
    q.querySelector('#q-resposta').innerHTML =
      '<div class="cx ' + (r.ok ? 'bom' : 'aviso') + '" style="margin:14px 0 0">' +
      '<h3>' + (r.ok ? 'Retirada segura: ' + B12.brl(r.seguro)
                     : B12.brl(v) + ' comprometeria sua reserva') + '</h3>' +
      '<p>' + (r.ok
        ? 'Depois de tirar ' + B12.brl(v) + ', ainda sobram ' + B12.brl(r.em60 - v) +
          ' em 60 dias, acima da reserva mínima de ' + B12.brl(r.reservaMinima) + '.'
        : 'O máximo seguro hoje é ' + B12.brl(r.seguro) + '. Tirar ' + B12.brl(v) +
          ' deixaria ' + B12.brl(r.faltaria) + ' abaixo da reserva de baixa temporada.') +
      '</p></div>' +
      '<table class="tabela" style="margin-top:12px">' +
      lin('Saldo em caixa hoje', r.saldoHoje) +
      lin('Receita esperada em 60 dias', r.previsto) +
      lin('Contas a receber', r.aReceber) +
      lin('Contas a pagar', -r.aPagar) +
      lin('Reserva de baixa temporada', -r.reservaMinima) +
      '<tr><td style="font-weight:750">Folga para retirada</td><td class="n" style="color:' +
      (r.seguro>0?C.turq3:C.ruim) + '">' + B12.brl(r.seguro) + '</td></tr></table>' +
      '<p style="font-size:11.5px;color:var(--gelo-3);margin-top:10px">A reserva mínima está em ' +
      B12.brl(r.reservaMinima) + ' porque janeiro faz dez vezes junho. O valor certo é o que o ' +
      'Dhalsin considerar intocável — é uma pergunta aberta.</p>';
  }
  campo.oninput = responder; responder();
}
function lin(nome, v) {
  return '<tr><td>' + nome + '</td><td class="n" style="color:' +
    (v<0?C.ruim:'inherit') + '">' + (v<0?'− ':'') + B12.brl(Math.abs(v)) + '</td></tr>';
}

/* ------------------------------------------------------------ LANÇAMENTOS */
var filtroLanc = 'todos';
function pLanc(raiz) {
  var ym = B12.mesAtual();
  var L = B12.DB.lancamentos.filter(function (l) { return l.data.slice(0,7) === ym; })
    .filter(function (l) { return filtroLanc === 'todos' || l.tipo === filtroLanc; })
    .sort(function (a,b) { return a.data < b.data ? 1 : -1; });
  var r = B12.resumoMes(ym);
  raiz.appendChild(bloco(
    '<div class="grade2 entra">' +
      mini('Entradas do mês', B12.brl(r.entradas), B12.DB.lancamentos.filter(function(l){
        return l.data.slice(0,7)===ym && l.tipo==='entrada';}).length + ' lançamentos') +
      mini('Saídas do mês', B12.brl(r.saidas), B12.DB.lancamentos.filter(function(l){
        return l.data.slice(0,7)===ym && l.tipo==='saida';}).length + ' lançamentos') +
    '</div>' +
    '<div style="display:flex;gap:6px;padding:0 12px" class="entra entra-1">' +
    ['todos','entrada','saida'].map(function (f) {
      return '<button class="aba' + (filtroLanc===f?' on':'') + '" data-f="' + f + '">' +
        (f==='todos'?'Tudo':f==='entrada'?'Entradas':'Saídas') + '</button>'; }).join('') +
    '</div>'
  ));
  raiz.querySelectorAll('[data-f]').forEach(function (b) {
    b.onclick = function () { filtroLanc = b.dataset.f; B12.admDesenhar('lanc'); };
  });
  var acoes = bloco('<div class="grade2" style="margin:12px">' +
    '<button class="btn pri" style="margin:0" id="b-nova-entrada">+ Entrada</button>' +
    '<button class="btn sec" style="margin:0" id="b-nova-saida">+ Saída</button></div>');
  raiz.appendChild(acoes);
  acoes.querySelector('#b-nova-entrada').onclick = function () {
    B12.formLancamento('entrada', {}, function(){ B12.admDesenhar('lanc'); }); };
  acoes.querySelector('#b-nova-saida').onclick = function () {
    B12.formLancamento('saida', {}, function(){ B12.admDesenhar('lanc'); }); };
  var lista = document.createElement('div'); lista.className = 'lista entra entra-2';
  lista.innerHTML = L.length ? L.map(function (l) {
    return '<div class="linha toca" data-lanc="' + l.id + '">' +
      '<span class="tag">' + B12.dataBR(l.data).slice(0,5) + '</span>' +
      '<div class="d"><b>' + l.desc + '</b><small>' + l.cat + ' · ' + l.centro + ' · ' + l.pg +
      (l.investimento ? ' <span class="pilula inv">investimento</span>' : '') +
      (l.origem === 'mao' ? '' : ' · automático') + '</small></div>' +
      '<span class="v ' + (l.tipo==='entrada'?'ent':'sai') + '">' +
      (l.tipo==='entrada'?'+':'−') + ' ' + B12.brl(l.valor) + '</span></div>';
  }).join('') : '<div class="vazio"><b>Nada lançado ainda</b>' +
    '<p>Toque em + Entrada ou + Saída para o primeiro lançamento do mês.</p></div>';
  raiz.appendChild(lista);
  lista.querySelectorAll('[data-lanc]').forEach(function (li) {
    li.onclick = function () {
      var l = B12.DB.lancamentos.filter(function(x){ return x.id === li.dataset.lanc; })[0];
      if (!l) return;
      B12.formLancamento(l.tipo, l, function(){ B12.admDesenhar('lanc'); });
    };
  });
  raiz.appendChild(bloco(
    '<div class="cx nota"><h3>Como isso vai funcionar de verdade</h3>' +
    '<p>A reserva do turista vira entrada sozinha. Para o resto, a tela de digitação é de ' +
    'teclado: Tab anda, Enter salva e abre a linha de baixo, a data já vem preenchida e a ' +
    'categoria repete a última. Também dá para colar linhas direto do Excel.</p></div>'));
}

/* ----------------------------------------------------------------- CONTAS */
function pContas(raiz) {
  var hoje = B12.hoje();
  var pagar = B12.DB.contas.filter(function(c){ return c.tipo==='pagar' && !c.paga; })
    .sort(function(a,b){ return a.venc < b.venc ? -1 : 1; });
  var receber = B12.DB.contas.filter(function(c){ return c.tipo==='receber' && !c.paga; })
    .sort(function(a,b){ return a.venc < b.venc ? -1 : 1; });
  var somaP = pagar.reduce(function(s,c){return s+c.valor;},0);
  var somaR = receber.reduce(function(s,c){return s+c.valor;},0);
  raiz.appendChild(bloco(
    '<div class="grade2 entra">' +
      mini('A pagar', B12.brl(somaP), pagar.length + ' contas em aberto') +
      mini('A receber', B12.brl(somaR), receber.length + ' contas') +
    '</div>' +
    '<div class="cx aviso entra entra-1"><h3>O lembrete que o cliente pediu</h3>' +
    '<p>Cada conta marcada avisa no app e por e-mail no dia certo, e monta a mensagem pronta ' +
    'de WhatsApp. Envio automático pelo WhatsApp exige a API oficial da Meta, com custo por ' +
    'conversa — por isso o disparo fica a um toque, não sozinho.</p></div>'
  ));
  raiz.appendChild(bloco('<div class="faixa-sec"><div class="tit"><h2>A pagar</h2></div></div>'));
  var l1 = document.createElement('div'); l1.className = 'lista entra entra-2';
  l1.innerHTML = pagar.map(function (c) {
    var atrasada = c.venc < hoje, perto = c.venc <= B12.diaMais(hoje,7);
    return '<div class="linha"><span class="tag" style="' +
      (atrasada?'background:#3A1B18;color:#E88A7E':perto?'background:#33270F;color:#F0B95C':'') + '">' +
      B12.dataBR(c.venc).slice(0,5) + '</span><div class="d"><b>' + c.desc + '</b>' +
      '<small>' + c.cat + ' · ' + c.centro + (c.fixa?' · fixa':'') + '</small></div>' +
      '<span class="v sai">' + B12.brl(c.valor) + '</span></div>';
  }).join('') || '<div class="vazio"><b>Nenhuma conta em aberto</b></div>';
  raiz.appendChild(l1);
  raiz.appendChild(bloco('<div class="faixa-sec"><div class="tit"><h2>A receber</h2></div></div>'));
  var l2 = document.createElement('div'); l2.className = 'lista entra entra-3';
  l2.innerHTML = receber.map(function (c) {
    return '<div class="linha"><span class="tag">' + B12.dataBR(c.venc).slice(0,5) + '</span>' +
      '<div class="d"><b>' + c.desc + '</b><small>' + c.cat + '</small></div>' +
      '<span class="v ent">' + B12.brl(c.valor) + '</span></div>';
  }).join('') || '<div class="vazio"><b>Nada a receber</b></div>';
  raiz.appendChild(l2);
}

/* ------------------------------------------------------------- RELATÓRIOS */
function pRelat(raiz) {
  var ym = B12.mesAtual(), r = B12.resumoMes(ym);
  /* taxa de cartão por forma */
  var formas = Object.keys(r.porPg).map(function (p) {
    return { pg:p, v:r.porPg[p], taxa: Math.round(r.porPg[p] * (B12.DB.ajustes.taxas[p]||0)) };
  }).sort(function(a,b){ return b.v - a.v; });
  raiz.appendChild(bloco(
    '<div class="cx entra"><h3>Quanto a maquininha levou <span class="selo-demo">demonstração</span></h3>' +
    '<p>O cliente pediu para "analisar qual porcentagem". Metade do faturamento histórico dele ' +
    'passa por crédito, então cada ponto de taxa vale dinheiro.</p>' +
    '<div class="rolagem"><table class="tabela" style="margin-top:11px">' +
    '<tr><th>Forma</th><th style="text-align:right">Recebido</th>' +
    '<th style="text-align:right">Taxa</th><th style="text-align:right">Custo</th></tr>' +
    formas.map(function (f) {
      return '<tr><td>' + f.pg + '</td><td class="n">' + B12.brl(f.v) + '</td>' +
        '<td class="n">' + ((B12.DB.ajustes.taxas[f.pg]||0)*100).toFixed(2).replace('.',',') + '%</td>' +
        '<td class="n" style="color:' + (f.taxa?C.ruim:C.bom) + '">' +
        (f.taxa? '− '+B12.brl(f.taxa) : 'zero') + '</td></tr>'; }).join('') +
    '<tr><td style="font-weight:750">Total</td><td class="n">' + B12.brl(r.entradas) +
    '</td><td></td><td class="n" style="color:' + C.ruim + '">− ' + B12.brl(r.taxa) + '</td></tr>' +
    '</table></div>' +
    '<p style="font-size:11.5px;margin-top:9px">As taxas usadas são de mercado. Trocar pelas ' +
    'reais da maquininha dele é um campo em Ajustes.</p></div>'
  ));
  /* de onde vêm os clientes — dado REAL */
  var g = document.createElement('div'); g.className = 'cx entra entra-1';
  g.innerHTML = '<h3>De onde vêm os clientes <span class="selo-demo selo-real">dado real</span></h3>' +
    '<p>Da coluna "Cliente" da planilha, com 12.267 lançamentos. Hoje esse campo mistura ' +
    'pousada, tipo de cliente e nome de pessoa — no app vira campo separado, e o relatório ' +
    'de comissão de hospedagem passa a existir.</p>';
  raiz.appendChild(g);
  var maxO = B12.HIST_ORIGEM[0][1];
  g.appendChild(bloco('<div style="margin-top:12px">' + B12.HIST_ORIGEM.slice(0,10).map(function (o) {
    return '<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;' +
      'font-size:12.5px;margin-bottom:4px"><span>' + o[0] + '</span><b class="num">' +
      B12.n(o[1]) + '</b></div><div class="medidor"><i style="width:' +
      (o[1]/maxO*100).toFixed(1) + '%"></i></div></div>'; }).join('') + '</div>'));

  /* resultado por serviço */
  var s = document.createElement('div'); s.className = 'cx entra entra-2';
  s.innerHTML = '<h3>Resultado por serviço</h3>';
  raiz.appendChild(s);
  var cats = B12.ENTRADAS.map(function (c) { return { nome:c, v: r.porCat[c]||0 }; })
    .filter(function(x){ return x.v>0; });
  s.appendChild(bloco('<div class="rolagem"><table class="tabela" style="margin-top:8px">' +
    cats.map(function (c) {
      return '<tr><td>' + c.nome + '</td><td class="n">' + B12.brl(c.v) + '</td>' +
        '<td class="n" style="color:var(--gelo-3)">' + Math.round(c.v/r.entradas*100) + '%</td></tr>';
    }).join('') + '</table></div>'));

  /* despesas reais nomeadas */
  var d = document.createElement('div'); d.className = 'cx entra entra-3';
  d.innerHTML = '<h3>Maiores despesas do histórico <span class="selo-demo selo-real">dado real</span></h3>' +
    '<p>Somadas das 443 despesas lançadas na planilha, que totalizam ' +
    B12.brl(236570) + '.</p>' +
    '<div class="rolagem"><table class="tabela" style="margin-top:10px">' +
    B12.DESP_MAIORES.map(function (x) {
      return '<tr><td>' + x[0] + '</td><td class="n">' + B12.brl(x[1]) + '</td></tr>'; }).join('') +
    '</table></div>';
  raiz.appendChild(d);
}

/* ---------------------------------------------------------------- OPERAÇÃO */
function pOper(raiz) {
  var hoje = B12.hoje();
  var idas = B12.saidasDoDia(hoje,'ida'), voltas = B12.saidasDoDia(hoje,'volta');
  var pax = idas.reduce(function(s,x){return s+x.ocupadas;},0);
  var comb = B12.COMB_TOTAL;
  raiz.appendChild(bloco(
    '<div class="placar entra">' +
      tile(idas.length,'Saídas hoje','n') + tile(pax,'Passageiros','n') +
      tile(voltas.length,'Retornos','n') +
    '</div>' +
    '<div class="cx entra entra-1"><h3>Lancha 01 <span class="selo-demo selo-real">combustível real</span></h3>' +
    '<div class="rolagem"><table class="tabela" style="margin-top:8px">' +
    '<tr><td>Motor</td><td class="n">225 HP</td></tr>' +
    '<tr><td>Capacidade</td><td class="n">12 passageiros</td></tr>' +
    '<tr><td>Abastecimentos no histórico</td><td class="n">' + B12.n(comb.linhas) + '</td></tr>' +
    '<tr><td>Litros queimados</td><td class="n">' + B12.n(comb.litros) + ' L</td></tr>' +
    '<tr><td>Gasto com combustível</td><td class="n">' + B12.brl(comb.valor) + '</td></tr>' +
    '<tr><td>Preço médio do litro</td><td class="n">R$ ' +
      comb.precoLitro.toFixed(2).replace('.',',') + '</td></tr>' +
    '</table></div>' +
    '<p style="font-size:11.5px;margin-top:9px">O preço médio é de 2015 a 2021, que é o período ' +
    'em que a aba Combustível foi preenchida. Hoje o litro está bem acima disso.</p></div>'
  ));
  raiz.appendChild(bloco('<div class="faixa-sec"><div class="tit"><h2>Saídas de hoje</h2>' +
    '<button>Ida</button></div></div>'));
  var l = document.createElement('div'); l.className = 'lista entra entra-2';
  l.innerHTML = idas.map(function (s) {
    var cheio = s.ocupadas / s.vagas;
    return '<div class="linha"><span class="tag">' + s.hora + '</span>' +
      '<div class="d"><b>' + s.destino + '</b><small>' + s.marinheiro + ' · ' +
      s.ocupadas + ' de ' + s.vagas + ' lugares</small>' +
      '<div class="medidor" style="margin-top:6px"><i style="width:' + (cheio*100).toFixed(0) +
      '%;background:' + (cheio>0.85?C.aten:C.turq) + '"></i></div></div></div>';
  }).join('');
  raiz.appendChild(l);

  raiz.appendChild(bloco('<div class="faixa-sec"><div class="tit"><h2>Horários de retorno</h2></div>' +
    '<p style="font-size:12.5px;color:var(--gelo-3);padding:0 0 8px">São estes que o turista vê ' +
    'no app dele no dia da volta, para escolher o seu.</p></div>'));
  var l2 = document.createElement('div'); l2.className = 'lista entra entra-3';
  l2.innerHTML = voltas.map(function (s) {
    return '<div class="linha"><span class="tag">' + s.hora + '</span><div class="d">' +
      '<b>Retorno para Pontal do Sul</b><small>' + s.ocupadas + ' de ' + s.vagas +
      ' lugares reservados</small></div></div>'; }).join('');
  raiz.appendChild(l2);
}

/* -------------------------------------------------------------- PROSPECÇÃO */
function pProsp(raiz) {
  /* funil do exemplo do próprio briefing */
  var funil = [
    ['Notificações enviadas', 1240, C.azul],
    ['Abriram o app', 486, '#1E7FA8'],
    ['Viram um passeio', 97, C.turq],
    ['Fizeram reserva', 31, C.turq3]
  ];
  raiz.appendChild(bloco(
    '<div class="cx entra"><h3>Campanha "Fim de Semana na Ilha" <span class="selo-demo">exemplo do briefing</span></h3>' +
    '<p>É o quadro que o cliente desenhou no documento: da notificação até o dinheiro. ' +
    'Marketing medido, não propaganda no escuro.</p></div>' +
    '<div class="cx entra entra-1">' + funil.map(function (f, i) {
      return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;' +
        'font-size:13px;margin-bottom:5px"><span>' + f[0] + '</span><b class="num">' + B12.n(f[1]) +
        '</b></div><div class="medidor"><i style="width:' + (f[1]/funil[0][1]*100).toFixed(1) +
        '%;background:' + f[2] + '"></i></div>' +
        (i ? '<div style="font-size:10.5px;color:var(--gelo-3);margin-top:4px">' +
          (f[1]/funil[i-1][1]*100).toFixed(1).replace('.',',') + '% de quem estava no passo anterior</div>' : '') +
        '</div>'; }).join('') +
    '<div style="display:flex;justify-content:space-between;padding-top:12px;' +
    'border-top:1px solid var(--noite-risco);font-size:18px;font-weight:750">' +
    '<span>Vendeu</span><span style="color:' + C.turq3 + '">' + B12.brl(5580) + '</span></div>' +
    '<p style="font-size:11.5px;color:var(--gelo-3);margin-top:8px">Custo por reserva: ' +
    B12.brl(0) + ' — a notificação é do próprio app, não é anúncio pago.</p></div>' +
    '<div class="cx entra entra-2"><h3>O que o app consegue saber</h3>' +
    '<div class="rolagem"><table class="tabela" style="margin-top:6px">' +
    [['quantas pessoas abriram o app','sim'],['quantas viram um passeio','sim'],
     ['quantas reservaram','sim'],['qual passeio vende mais','sim'],
     ['qual promoção converte mais','sim'],['quantos turistas voltaram','sim'],
     ['quanto cada cliente gastou','sim']].map(function (x) {
      return '<tr><td>' + x[0] + '</td><td class="n" style="color:' + C.turq3 + '">' + x[1] + '</td></tr>';
    }).join('') + '</table></div></div>' +
    '<div class="cx aviso entra entra-3"><h3>Como o aviso chega hoje — e o que falta</h3>' +
    '<p>O quadro acima é o plano do briefing. Hoje, de verdade, funciona assim:</p>' +
    '<table class="tabela" style="margin-top:10px">' +
      '<tr><td><b>WhatsApp</b><div class="sub-lin">você toca no botão e a conversa abre com o ' +
        'texto pronto</div></td><td class="n" style="color:' + C.turq3 + '">funciona</td></tr>' +
      '<tr><td><b>Aviso dentro do app</b><div class="sub-lin">aparece em Promoções para quem ' +
        'se cadastrou</div></td><td class="n" style="color:' + C.turq3 + '">funciona</td></tr>' +
      '<tr><td><b>WhatsApp automático</b><div class="sub-lin">precisa da API oficial da Meta: ' +
        'um número só para isso e textos aprovados</div></td><td class="n" style="color:' + C.aten + '">falta</td></tr>' +
      '<tr><td><b>E-mail</b><div class="sub-lin">precisa da nuvem e do domínio verificado ' +
        'para enviar</div></td><td class="n" style="color:' + C.aten + '">falta</td></tr>' +
      '<tr><td><b>Notificação no celular</b><div class="sub-lin">precisa da nuvem, e a pessoa ' +
        'tem de ter instalado o app na tela de início</div></td><td class="n" style="color:' + C.aten + '">falta</td></tr>' +
    '</table>' +
    '<p style="margin-top:10px">Os três que faltam dependem da mesma coisa: ligar a nuvem. ' +
    'Enquanto isso, nada sai sozinho — e o app não promete ao cliente o que ainda não faz.</p></div>'
  ));
}

/* ------------------------------------------------------------ INTELIGÊNCIA */
function pIntel(raiz) {
  var anos = B12.histPorAno(), R = B12.HIST_RESUMO;
  raiz.appendChild(bloco(
    '<div class="cx entra"><h3>Como está a empresa? <span class="selo-demo selo-real">lê os dados</span></h3>' +
    '<div style="margin-top:10px">' + B12.diagnostico().map(function (f) {
      return '<p style="font-size:13.5px;line-height:1.55;padding:7px 0;border-bottom:' +
        '1px solid var(--noite-risco)">' + f + '</p>'; }).join('') + '</div>' +
    '<p style="font-size:11.5px;color:var(--gelo-3);margin-top:10px">Este texto é montado por ' +
    'conta, lendo os lançamentos. A versão que escreve em linguagem livre usa inteligência ' +
    'artificial e entra numa fase à parte, com a chave do próprio dono.</p></div>' +
    '<div class="placar entra entra-1">' +
      tile(R.lancamentos,'Lançamentos','n') + tile(R.passageiros,'Passageiros','n') +
      tile(R.receita,'Receita registrada','brl','destaque') +
      tile(R.mesesComRegistro,'Meses com registro','n') +
      tile(R.mesesEmBranco,'Meses em branco','n','alerta') +
      tile(11,'Anos de história','n') +
    '</div>'
  ));
  var g = document.createElement('div'); g.className = 'cx entra entra-2';
  g.innerHTML = '<h3>Receita por ano <span class="selo-demo selo-real">dado real</span></h3>' +
    '<p>Média por mês efetivamente registrado. Comparar o total de cada ano seria mentira: ' +
    '2023 não tem uma linha e outros anos têm um mês só.</p>';
  raiz.appendChild(g);
  grafBarras(g, anos.map(function (a) {
    return { a: a.media, rot: "'" + String(a.ano).slice(2), vazio: a.meses === 0,
             cor: a.ano >= 2024 ? C.turq : '#4E7E96', destaque: a.ano === 2025 };
  }), { altura:180 });
  g.appendChild(bloco('<div class="leg"><span><i style="background:' + C.turq +
    '"></i>anos recentes</span><span><i style="background:#4E7E96"></i>anos antigos</span>' +
    '<span><i style="background:' + C.aten + ';opacity:.35"></i>sem registro</span></div>'));

  /* mesmo mês, ano a ano */
  var mes = +B12.mesAtual().slice(5,7);
  var mm = B12.mesmoMes(mes);
  var h = document.createElement('div'); h.className = 'cx entra entra-3';
  h.innerHTML = '<h3>' + B12.MESNOME[mes-1] + ', ano a ano <span class="selo-demo selo-real">dado real</span></h3>' +
    '<p>A comparação honesta que o cliente pediu: o mesmo mês contra ele mesmo.</p>';
  raiz.appendChild(h);
  if (mm.length) {
    grafBarras(h, mm.map(function (m, i) {
      return { a:m.receita, rot:"'"+String(m.ano).slice(2), destaque: i===mm.length-1 };
    }), { altura:150 });
  } else {
    h.appendChild(bloco('<p style="margin-top:10px">Não há ' + B12.MESNOME[mes-1] +
      ' registrado em nenhum ano da planilha.</p>'));
  }

  /* tabela por ano */
  var t = document.createElement('div'); t.className = 'cx entra entra-4';
  t.innerHTML = '<h3>Os onze anos, em números</h3>' +
    '<div class="rolagem"><table class="tabela" style="margin-top:8px;min-width:430px">' +
    '<tr><th>Ano</th><th style="text-align:right">Meses</th><th style="text-align:right">Passageiros</th>' +
    '<th style="text-align:right">Receita</th><th style="text-align:right">Por mês</th>' +
    '<th style="text-align:right">Por passageiro</th></tr>' +
    anos.map(function (a) {
      if (!a.meses) return '<tr><td>' + a.ano + '</td><td class="n" colspan="5" ' +
        'style="text-align:center;color:' + C.aten + '">sem nenhum registro</td></tr>';
      return '<tr><td>' + a.ano + '</td><td class="n">' + a.meses + '</td>' +
        '<td class="n">' + B12.n(a.pax) + '</td><td class="n">' + B12.brl(a.receita) + '</td>' +
        '<td class="n">' + B12.brl(a.media) + '</td><td class="n">' + B12.brl(a.porPax) + '</td></tr>';
    }).join('') + '</table></div>';
  raiz.appendChild(t);

  raiz.appendChild(bloco(
    '<div class="cx aviso entra entra-5"><h3>O que a planilha revelou</h3>' +
    '<p><b>A planilha parou em julho de 2025</b>, há mais de um ano. 2023 inteiro não existe. ' +
    'E há 902 linhas com valor e sem data, incluindo somas misturadas no meio dos lançamentos. ' +
    'Nada disso impede a importação, mas cada caso precisa de uma regra combinada antes.</p></div>'));
}


/* ============================================================== CLIENTES */
var buscaCli = '', ordemCli = 'gasto';
function pClientes(raiz) {
  var todos = B12.DB.clientes;
  var achados = B12.clientesComResumo(buscaCli, ordemCli);
  var comZap = todos.filter(function (c) { return c.whats; }).length;
  var comOfertas = todos.filter(function (c) { return c.aceitaOfertas; }).length;
  var comInsta = todos.filter(function (c) { return c.instagram; }).length;
  var fid = B12.fidelidade();

  raiz.appendChild(bloco(
    '<div class="placar entra">' +
      tile(todos.length,'Clientes','n','destaque') +
      tile(todos.reduce(function(s,c){return s+(c.gasto||0);},0),'Já gastaram','brl','destaque') +
      tile(todos.reduce(function(s,c){return s+(c.viagens||0);},0),'Viagens','n') +
      tile(comOfertas,'Aceitam ofertas','n') +
      tile(comZap,'Com WhatsApp','n') +
      tile(comInsta,'Com Instagram','n') +
    '</div>'
  ));

  /* quem merece um mimo: as cinco maiores faixas que já autorizaram promoção */
  if (fid.ligada) {
    var topo = B12.clientesComResumo('', 'gasto')
      .filter(function (x) { return x.cliente.aceitaOfertas && x.pontos > 0; }).slice(0, 5);
    var m = bloco(
      '<div class="cx entra entra-1"><div class="cx-topo"><h3>Quem merece um mimo</h3>' +
      '<button class="mini-btn" id="b-fid">Regras</button></div>' +
      '<p style="margin-bottom:10px">Os que mais gastaram <b>e</b> já autorizaram promoção. ' +
      'Cada ' + B12.brl(fid.reaisPorPonto) + ' vale 1 ponto.</p>' +
      (topo.length
        ? '<div class="mimos">' + topo.map(function (x) {
            return '<button type="button" class="mimo" data-mimo="' + x.cliente.id + '">' +
              '<span class="mimo-faixa">' + esc(x.faixa.nome) + '</span>' +
              '<span class="mimo-nome">' + esc(x.cliente.nome) + '</span>' +
              '<span class="mimo-sub">' + B12.brl(x.gasto) + ' · ' + x.pontos + ' pts</span>' +
              '</button>';
          }).join('') + '</div>'
        : '<div class="ajuda">Ninguém ainda: ou não gastaram, ou não autorizaram promoção. ' +
          'O aceite entra no cadastro.</div>') +
      '</div>');
    raiz.appendChild(m);
    m.querySelector('#b-fid').onclick = function () {
      B12.formFidelidade(function () { B12.admDesenhar('clientes'); }); };
    m.querySelectorAll('[data-mimo]').forEach(function (b) {
      b.onclick = function () {
        B12.fichaCliente(b.dataset.mimo, function () { B12.admDesenhar('clientes'); }); };
    });
  }

  var ORDENS = [['gasto','Mais gastaram'],['viagens','Mais viagens'],
                ['novos','Mais recentes'],['nome','A a Z']];
  var b = bloco('<div class="busca">' +
    '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4" stroke-linecap="round"/></svg>' +
    '<input id="q-cli" placeholder="buscar por nome, WhatsApp, e-mail ou pousada" value="' +
    buscaCli.replace(/"/g,'&quot;') + '"></div>' +
    '<div class="abas abas-mini">' + ORDENS.map(function (o) {
      return '<button class="aba' + (ordemCli===o[0]?' on':'') + '" data-ord="' + o[0] + '">' +
        o[1] + '</button>'; }).join('') + '</div>' +
    '<div style="padding:0 12px"><button class="btn pri" style="margin:0" id="b-novo-cli">' +
    '+ Cadastrar cliente</button></div>');
  raiz.appendChild(b);
  var campo = b.querySelector('#q-cli');
  campo.oninput = function () {
    buscaCli = campo.value;
    var pos = campo.selectionStart;
    B12.admDesenhar('clientes');
    var novo = document.getElementById('q-cli');
    if (novo) { novo.focus(); novo.setSelectionRange(pos, pos); }
  };
  b.querySelectorAll('[data-ord]').forEach(function (x) {
    x.onclick = function () { ordemCli = x.dataset.ord; B12.admDesenhar('clientes'); }; });
  b.querySelector('#b-novo-cli').onclick = function () {
    B12.formCliente(null, function () { B12.admDesenhar('clientes'); }); };

  var lista = document.createElement('div'); lista.className = 'lista';
  lista.innerHTML = achados.length ? achados.map(function (x) {
    var c = x.cliente;
    return '<div class="linha toca" data-cli="' + c.id + '">' +
      '<span class="tag">' + (c.nome[0] || '?').toUpperCase() + '</span>' +
      '<div class="d"><b>' + esc(c.nome) +
        (fid.ligada && x.pontos > 0 ? ' <span class="pilula dentro">' + esc(x.faixa.nome) + '</span>' : '') +
        (c.aceitaOfertas ? ' <span class="pilula dentro">ofertas ok</span>' : '') + '</b>' +
      '<small>' + [c.whats ? fmtZap(c.whats) : null, c.email || null,
        c.instagram ? '@' + c.instagram : null, c.cpf ? 'CPF ok' : null].filter(Boolean).join(' · ') +
      (c.pousada ? '<br>' + esc(c.pousada) : '') +
      (c.origem === 'app' ? ' <span class="pilula dentro">pelo app</span>' : '') + '</small></div>' +
      '<div style="text-align:right"><div class="v">' + B12.brl(x.gasto) + '</div>' +
      '<small style="font-size:10.5px;color:var(--gelo-3)">' + x.viagens +
      (x.viagens === 1 ? ' viagem' : ' viagens') +
      (fid.ligada && x.pontos > 0 ? ' · ' + x.pontos + ' pts' : '') +
      '</small></div></div>';
  }).join('') : '<div class="vazio">' +
    '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
    '<b>' + (buscaCli ? 'Ninguém com esse nome' : 'Nenhum cliente ainda') + '</b>' +
    '<p>' + (buscaCli ? 'Tente outra busca.' :
      'Cada pessoa que chega vira uma ficha aqui, com contato e histórico de quanto gastou.') + '</p></div>';
  raiz.appendChild(lista);
  lista.querySelectorAll('[data-cli]').forEach(function (li) {
    li.onclick = function () {
      B12.fichaCliente(li.dataset.cli, function () { B12.admDesenhar('clientes'); });
    };
  });
  raiz.appendChild(bloco(
    '<div class="cx nota"><h3>Por que o aceite fica separado</h3>' +
    '<p>WhatsApp e e-mail a B12 usa para operar a viagem, e isso a lei permite sem pedir nada. ' +
    'Mandar promoção é outra coisa: precisa do aceite, e ele fica guardado com data e hora. ' +
    'Mil cadastros com aceite valem mais que cinco mil contatos sem, porque só com os ' +
    'primeiros dá para disparar campanha.</p></div>'));
}
function fmtZap(z) {
  var d = String(z).replace(/\D/g,'');
  if (d.length === 11) return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
  return z;
}

/* ================================================================= PÁTIO */
function pPatio(raiz) {
  var r = B12.patioResumo(), dentro = B12.patioHoje();
  var sairam = B12.DB.patio.filter(function (v) { return v.saidaReal; }).slice(0, 12);
  var mes = B12.resumoMes(B12.mesAtual());

  raiz.appendChild(bloco(
    '<div class="placar entra">' +
      tile(r.dentro,'Carros no pátio','n','destaque') +
      tile(r.aReceber,'A receber na saída','brl') +
      tile(r.vencendo.length,'Passaram do dia','n', r.vencendo.length ? 'alerta' : '') +
      tile(mes.porCat['Estacionamento']||0,'Recebido no mês','brl','destaque') +
      tile(B12.DB.ajustes.diaria,'Diária','brl') +
      '<div class="pl"><div class="v" style="font-size:13px;line-height:1.3;padding-top:3px">' +
      ((B12.DB.ajustes.patio||{}).regra === '24h' ? 'a cada 24 h' : 'por dia') + '<br>' +
      ((B12.DB.ajustes.patio||{}).cobranca === 'chegada' ? 'cobra na chegada' : 'cobra na saída') +
      '</div><div class="k">Regra (Ajustes)</div></div>' +
    '</div>' +
    '<div style="padding:0 12px"><button class="btn pri" style="margin:0" id="b-carro">' +
    '+ Carro entrando</button></div>'
  ));
  raiz.querySelector('#b-carro').onclick = function () {
    B12.formEntradaPatio(function () { B12.admDesenhar('patio'); }); };

  /* ---- carros que a reserva já anunciou e ainda não entraram ---- */
  var prev = B12.carrosPrevistos();
  if (prev.length) {
    var cxP = bloco('<div class="cx nota"><h3>' + prev.length + ' carro' + (prev.length > 1 ? 's' : '') +
      ' anunciado' + (prev.length > 1 ? 's' : '') + ' na reserva</h3>' +
      '<p>O passageiro informou a placa ao reservar. Quando ele chegar, é um toque.</p>' +
      '<div class="lista" style="margin:12px 0 0">' + prev.map(function (r) {
        return '<div class="linha"><span class="tag">' + r.placa + '</span><div class="d"><b>' + r.nome +
          '</b><small>chega ' + B12.dataBR(r.ida) + (r.volta ? ' · sai ' + B12.dataBR(r.volta) : '') +
          ' · ' + r.estacionamento + ' diária(s) previstas</small></div>' +
          '<button class="mini-btn" data-entra="' + r.id + '">Deu entrada</button></div>';
      }).join('') + '</div></div>');
    raiz.appendChild(cxP);
    cxP.querySelectorAll('[data-entra]').forEach(function (b) {
      b.onclick = function () {
        var e = B12.darEntradaDaReserva(b.dataset.entra);
        if (e.erro) { b.textContent = e.erro; return; }
        B12.admDesenhar('patio');
      };
    });
  }

  if (r.vencendo.length) raiz.appendChild(bloco(
    '<div class="cx aviso"><h3>' + r.vencendo.length + ' carro' +
    (r.vencendo.length>1?'s passaram':' passou') + ' da saída prevista</h3><p>' +
    r.vencendo.map(function(v){ return v.placa + ' · previsto para ' + B12.dataBR(v.saidaPrevista); })
      .join('<br>') + '</p></div>'));

  raiz.appendChild(bloco('<div class="faixa-sec"><div class="tit"><h2>No pátio agora</h2></div></div>'));
  var l1 = document.createElement('div'); l1.className = 'lista';
  l1.innerHTML = dentro.length ? dentro.map(function (v) {
    var c = B12.valorPatio(v), atrasado = v.saidaPrevista && v.saidaPrevista < B12.hoje();
    return '<div class="linha toca" data-sai="' + v.id + '">' +
      '<span class="tag">' + v.placa + '</span>' +
      '<div class="d"><b>' + (v.nome || 'sem nome') +
      (atrasado ? ' <span class="pilula vencendo">passou do dia</span>' :
       ' <span class="pilula dentro">' + c.dias + (c.dias>1?' diárias':' diária') + '</span>') +
      (c.pago ? ' <span class="pilula inv">pago na chegada</span>' : '') + '</b>' +
      '<small>' + [v.modelo, v.cor, v.vaga ? 'vaga ' + v.vaga : null].filter(Boolean).join(' · ') +
      '<br>entrou ' + B12.dataBR(v.entrada) + (v.entradaEm ? ' às ' + B12.horaBR(v.entradaEm) : '') +
      (v.saidaPrevista ? ' · sai ' + B12.dataBR(v.saidaPrevista) : '') + '</small></div>' +
      '<div style="text-align:right"><div class="v">' + B12.brl(c.resta) + '</div>' +
      '<small style="font-size:10px;color:var(--gelo-3)">' + (c.resta ? 'a cobrar · ' : 'quitado · ') +
      'toque para dar saída</small></div></div>';
  }).join('') : '<div class="vazio"><b>Pátio vazio</b>' +
    '<p>Quando um carro entrar, registre a placa aqui e o app cobra sozinho na saída.</p></div>';
  raiz.appendChild(l1);
  l1.querySelectorAll('[data-sai]').forEach(function (li) {
    li.onclick = function () {
      B12.confirmarSaidaPatio(li.dataset.sai, function () { B12.admDesenhar('patio'); }); };
  });

  if (sairam.length) {
    raiz.appendChild(bloco('<div class="faixa-sec"><div class="tit"><h2>Saíram</h2></div></div>'));
    var l2 = document.createElement('div'); l2.className = 'lista';
    l2.innerHTML = sairam.map(function (v) {
      return '<div class="linha"><span class="tag">' + v.placa + '</span>' +
        '<div class="d"><b>' + (v.nome || 'sem nome') + '</b><small>' +
        B12.dataBR(v.entrada) + ' a ' + B12.dataBR(v.saidaReal) + '</small></div>' +
        '<span class="v ent">' + B12.brl(v.valorPago) + '</span></div>';
    }).join('');
    raiz.appendChild(l2);
  }
}

/* ============================================================ MANUTENÇÃO */
function pManut(raiz) {
  var M = B12.DB.manutencoes, r = B12.resumoManutencao(), inv = B12.resumoInvestimento();
  var comb = B12.COMB_TOTAL;
  raiz.appendChild(bloco(
    '<div class="placar entra">' +
      tile(r.total,'Gasto em manutenção','brl') +
      tile(r.investimento||0,'Investimento','brl','destaque') +
      tile(r.corretiva||0,'Corretiva','brl') +
      tile(r.preventiva||0,'Preventiva','brl') +
      tile(M.length,'Registros','n') +
      tile(inv.total,'Total investido','brl','destaque') +
    '</div>' +
    '<div style="padding:0 12px"><button class="btn pri" style="margin:0" id="b-manut">' +
    '+ Registrar manutenção</button></div>'
  ));
  raiz.querySelector('#b-manut').onclick = function () {
    B12.formManutencao(function () { B12.admDesenhar('manut'); }); };

  if (r.proxima) raiz.appendChild(bloco(
    '<div class="cx aviso"><h3>Próxima revisão em ' + B12.dataBR(r.proxima) + '</h3>' +
    '<p>Já entrou nas contas a pagar. O app avisa quando estiver perto.</p></div>'));

  raiz.appendChild(bloco(
    '<div class="cx nota"><h3>Por que separar investimento de manutenção</h3>' +
    '<p>Trocar óleo é custo de operar: sai do lucro do mês. Comprar um motor, um toldo ou um ' +
    'GPS é investimento: fica no barco e não deveria derrubar o resultado daquele mês. ' +
    'Nas suas despesas antigas isso está tudo junto — março de 2019 aparece com R$ 23.500, ' +
    'quatro vezes qualquer outro mês, quase certamente por causa de uma compra grande.</p></div>'));

  raiz.appendChild(bloco('<div class="faixa-sec"><div class="tit"><h2>Histórico</h2></div></div>'));
  var l = document.createElement('div'); l.className = 'lista';
  l.innerHTML = M.length ? M.map(function (m) {
    return '<div class="linha"><span class="tag">' + B12.dataBR(m.data).slice(0,5) + '</span>' +
      '<div class="d"><b>' + m.descricao +
      (m.tipo === 'investimento' ? ' <span class="pilula inv">investimento</span>' : '') + '</b>' +
      '<small>' + [m.pecas, m.fornecedor, m.horasMotor ? m.horasMotor + 'h de motor' : null]
        .filter(Boolean).join(' · ') + '</small></div>' +
      '<span class="v sai">' + B12.brl(m.valor) + '</span></div>';
  }).join('') : '<div class="vazio"><b>Nenhuma manutenção registrada</b>' +
    '<p>Cada conserto, revisão ou equipamento novo entra aqui e vira saída no financeiro sozinho.</p></div>';
  raiz.appendChild(l);

  raiz.appendChild(bloco(
    '<div class="cx"><h3>Combustível no histórico <span class="selo-demo selo-real">dado real</span></h3>' +
    '<div class="rolagem"><table class="tabela" style="margin-top:8px">' +
    '<tr><td>Abastecimentos</td><td class="n">' + B12.n(comb.linhas) + '</td></tr>' +
    '<tr><td>Litros</td><td class="n">' + B12.n(comb.litros) + ' L</td></tr>' +
    '<tr><td>Total gasto</td><td class="n">' + B12.brl(comb.valor) + '</td></tr>' +
    '<tr><td>Preço médio do litro</td><td class="n">R$ ' +
      comb.precoLitro.toFixed(2).replace('.',',') + '</td></tr>' +
    '</table></div></div>'));
}


/* ================================================================= GESTÃO */
function pGestao(raiz) {
  var pe = B12.pontoEquilibrio();
  var marg = B12.margemPorServico();
  var cpp = B12.custoPorPassageiro();
  var ano = +B12.mesAtual().slice(0,4);
  var sem = B12.porDiaDaSemana();

  /* ---------- 1. ponto de equilíbrio: o número que mais muda decisão ---------- */
  var falta = Math.max(0, pe.receitaNecessaria - pe.receitaAtual);
  var paxFalta = pe.ticketMedio ? Math.ceil(falta / pe.ticketMedio) : 0;
  raiz.appendChild(bloco(
    '<div class="cx ' + (pe.coberto ? 'bom' : 'aviso') + ' entra">' +
    '<h3>' + (pe.coberto
      ? 'Este mês já pagou as contas fixas'
      : 'Faltam ' + B12.n(paxFalta) + ' passageiros para pagar as contas do mês') + '</h3>' +
    '<p>' + (pe.coberto
      ? 'Tudo o que entrar de agora em diante é lucro, tirando combustível e taxa.'
      : 'Suas contas fixas somam ' + B12.brl(pe.fixosMensais) + ' por mês. Com o ticket de ' +
        B12.brl(pe.ticketMedio) + ' por passageiro, e descontando combustível e maquininha, ' +
        'você precisa faturar ' + B12.brl(pe.receitaNecessaria) + ' só para empatar.') + '</p>' +
    '<div class="medidor' + (pe.coberto ? '' : ' aviso') + '" style="margin-top:12px">' +
    '<i style="width:' + Math.min(100, pe.receitaAtual / (pe.receitaNecessaria||1) * 100).toFixed(1) +
    '%"></i></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:11.5px;margin-top:6px;' +
    'color:var(--gelo-3)"><span>' + B12.brl(pe.receitaAtual) + ' faturado</span>' +
    '<span>empata em ' + B12.brl(pe.receitaNecessaria) + '</span></div></div>' +
    '<div class="grade2 entra entra-1">' +
      mini('Contas fixas por mês', B12.brl(pe.fixosMensais), 'salário, aluguel, DAS, contador…') +
      mini('Ticket por passageiro', B12.brl(pe.ticketMedio), 'média do mês') +
      mini('Cada real que entra', (pe.margemContribuicao*100).toFixed(0) + '%',
        'sobra depois de combustível e taxa') +
      mini('Passageiros para empatar', B12.n(pe.passageirosNecessarios),
        'hoje: ' + B12.n(pe.passageirosAtuais)) +
    '</div>'
  ));

  /* ---------- 2. margem por serviço: onde está o lucro, não a receita ---------- */
  var g = document.createElement('div'); g.className = 'cx entra entra-2';
  g.innerHTML = '<h3>Onde está o lucro, não a receita</h3>' +
    '<p>Receita alta com margem baixa engana. Aqui o combustível e a manutenção são ' +
    'rateados entre travessia e passeio, que são os que consomem barco.</p>';
  raiz.appendChild(g);
  if (marg.length) {
    grafBarras(g, marg.map(function (m) {
      return { a:m.lucro, b:m.custo, rot:m.nome.slice(0,7), destaque:false };
    }), { altura:160 });
    g.appendChild(bloco('<div class="leg"><span><i style="background:' + C.turq +
      '"></i>o que sobra</span><span><i style="background:' + C.azul + '"></i>o que custa</span></div>' +
      '<div class="rolagem"><table class="tabela" style="margin-top:12px">' +
      '<tr><th>Serviço</th><th style="text-align:right">Receita</th>' +
      '<th style="text-align:right">Sobra</th><th style="text-align:right">Margem</th></tr>' +
      marg.map(function (m) {
        return '<tr><td>' + m.nome + '</td><td class="n">' + B12.brl(m.receita) + '</td>' +
          '<td class="n" style="color:' + (m.lucro>0?C.turq3:C.ruim) + '">' + B12.brl(m.lucro) + '</td>' +
          '<td class="n">' + (m.margem*100).toFixed(0) + '%</td></tr>'; }).join('') +
      '</table></div>'));
  }

  /* ---------- 3. custo de combustível por passageiro ---------- */
  raiz.appendChild(bloco(
    '<div class="grade2 entra entra-3">' +
      mini('Combustível por passageiro', B12.brl(Math.round(cpp.mes)), 'neste mês') +
      mini('No histórico', B12.brl(Math.round(cpp.historico)),
        '41.090 passageiros, 50.784 litros') +
    '</div>' +
    '<div class="cx entra entra-3"><h3>Por que este número importa</h3>' +
    '<p>É o único custo que cresce a cada passageiro. Se ele subir e o preço não, a margem ' +
    'some sem ninguém perceber. No histórico da B12 dá ' +
    B12.brl(Math.round(cpp.historico)) + ' de combustível por pessoa transportada.</p></div>'
  ));

  /* ---------- 4. acumulado do ano contra o ano anterior ---------- */
  var a = document.createElement('div'); a.className = 'cx entra entra-4';
  a.innerHTML = '<h3>' + ano + ' contra ' + (ano-1) +
    ' <span class="selo-demo selo-real">dado real</span></h3>' +
    '<p>Acumulado mês a mês, dos dois anos, pela planilha. Onde um ano não tem registro, ' +
    'a linha para: não inventamos zero.</p>';
  raiz.appendChild(a);
  var acum = B12.acumuladoAno(2025);   /* último ano com dado real na planilha */
  var pontos = acum.filter(function (x) { return x.atual.meses || x.anterior.meses; })
    .map(function (x) { return { v: x.atual.total, rot: B12.MESNOME[x.mes-1],
      marca: x.mes === 7 }; });
  if (pontos.length > 1) {
    grafLinha(a, pontos, { altura:160 });
    var t2025 = acum[6].atual.total, t2024 = acum[6].anterior.total;
    a.appendChild(bloco('<div class="rolagem"><table class="tabela" style="margin-top:10px">' +
      '<tr><td>Acumulado até julho de 2025</td><td class="n">' + B12.brl(t2025) + '</td></tr>' +
      '<tr><td>Mesmo período de 2024</td><td class="n">' + B12.brl(t2024) + '</td></tr>' +
      '<tr><td style="font-weight:750">Diferença</td><td class="n" style="color:' +
      (t2025>=t2024?C.turq3:C.ruim) + '">' + (t2024 ? B12.pct((t2025-t2024)/t2024) : '—') +
      '</td></tr></table></div>'));
  }

  /* ---------- 5. dia da semana ---------- */
  var d = document.createElement('div'); d.className = 'cx entra entra-5';
  d.innerHTML = '<h3>Que dia da semana rende mais</h3>' +
    '<p>Serve para escolher quando abrir mais horário e quando mandar promoção.</p>';
  raiz.appendChild(d);
  var ordem = [1,2,3,4,5,6,0];   /* segunda a domingo */
  grafBarras(d, ordem.map(function (i) {
    var x = sem[i];
    return { a:x.total, rot:x.dia.slice(0,3),
      cor: (i===0||i===6||i===5) ? C.turq : '#4E7E96' };
  }), { altura:150 });
  d.appendChild(bloco('<div class="leg"><span><i style="background:' + C.turq +
    '"></i>fim de semana</span><span><i style="background:#4E7E96"></i>meio de semana</span></div>'));

  /* ---------- 6. investimento acumulado ---------- */
  var inv = B12.resumoInvestimento();
  raiz.appendChild(bloco(
    '<div class="cx entra entra-6"><h3>Investido na embarcação</h3>' +
    '<p>Separado do custo de operar. É o quanto já foi posto no barco em motor, equipamento ' +
    'e melhoria — dinheiro que ficou, não que sumiu.</p>' +
    '<div style="font-size:30px;font-weight:750;margin-top:10px;color:var(--turq-300)">' +
    B12.brl(inv.total) + '</div>' +
    (inv.itens.length ? '<div class="rolagem"><table class="tabela" style="margin-top:10px">' +
      inv.itens.slice(0,8).map(function (l) {
        return '<tr><td>' + l.desc + '</td><td class="n">' + B12.brl(l.valor) + '</td></tr>';
      }).join('') + '</table></div>'
      : '<p style="margin-top:8px">Nada marcado como investimento ainda. Ao lançar uma saída, ' +
        'marque a caixinha "é investimento" quando for motor, toldo, GPS ou reforma.</p>') +
    '</div>'
  ));
}


/* ================================================================ ESCALA */
var diaEscala = null;
/* --------------------------------------------------------- HORÁRIOS DO DIA
   A ida sai do trapiche da B12; a volta é a lancha indo buscar na Ilha. Os
   dois o Dhalsin monta na véspera. Este bloco é o lugar disso, e aparece em
   Horários e em Hoje — porque é ali que ele está quando lembra. */
function blocoHorarios(dia) {
  var idas = B12.saidasDoDia(dia, 'ida'), voltas = B12.saidasDoDia(dia, 'volta');
  var d = B12.naIlha(dia) || {};
  var voltam = (d.voltam || []).reduce(function (t, p) { return t + (p.pessoas || 1); }, 0);
  var hoje = B12.hoje();
  var quando = dia === hoje ? 'hoje' : dia === B12.diaMais(hoje, 1) ? 'amanhã' : B12.dataBR(dia);
  var falta = !idas.length || !voltas.length;

  function tira(lista, rotulo) {
    return '<div style="margin-top:10px"><div class="sub-lin" style="margin-bottom:6px">' + rotulo + '</div>' +
      (lista.length
        ? '<div class="horas">' + lista.map(function (s) {
            return '<span class="hchip on">' + s.hora +
              (s.ocupadas ? ' · ' + s.ocupadas : '') + '</span>'; }).join('') + '</div>'
        : '<div class="ajuda" style="margin:0">nenhum horário aberto</div>') + '</div>';
  }

  var b = bloco(
    '<div class="cx ' + (falta ? 'aviso' : 'nota') + ' entra entra-2">' +
    '<div class="cx-topo"><h3>Horários · ' + quando + '</h3>' +
    '<button class="mini-btn" data-horarios="' + dia + '">' + (falta ? 'Montar' : 'Mudar') + '</button></div>' +
    (falta
      ? '<p>Falta montar ' + (!idas.length && !voltas.length ? 'as idas e as voltas'
          : !idas.length ? 'as idas' : 'as voltas') + ' de ' + quando +
        '. Enquanto não montar, o passageiro vê no app que os horários ainda não abriram.</p>'
      : '<p>' + idas.length + ' de ida e ' + voltas.length + ' de volta' +
        (voltam ? ' · ' + voltam + (voltam > 1 ? ' pessoas voltam' : ' pessoa volta') : '') + '.</p>') +
    tira(idas, 'Idas — levar para a Ilha') +
    tira(voltas, 'Voltas — buscar na Ilha') +
    '</div>');
  b.querySelectorAll('[data-horarios]').forEach(function (x) {
    x.onclick = function () {
      B12.formHorariosDia(x.dataset.horarios, function () { B12.admDesenhar(); });
    };
  });
  return b;
}
/* o nome antigo continua valendo em quem já chamava */
function blocoBuscas(dia) { return blocoHorarios(dia); }

/* ------------------------------------------------------------- LEMBRETES
   O que o Dhalsin precisa fazer hoje, em cima da tela, cada linha com o
   botão que resolve. É o aviso que o app consegue dar sem nuvem: aparece
   quando ele abre. */
function blocoLembretes(raiz) {
  var hoje = B12.hoje(), amanha = B12.diaMais(hoje, 1);
  var itens = [];

  function add(urgente, texto, rotulo, acao) {
    itens.push({ urgente: urgente, texto: texto, rotulo: rotulo, acao: acao });
  }

  /* 1. os horários da véspera — é a rotina dele */
  [[amanha, 'amanhã'], [hoje, 'hoje']].forEach(function (par) {
    var dia = par[0], nome = par[1];
    var i = B12.saidasDoDia(dia, 'ida').length, v = B12.saidasDoDia(dia, 'volta').length;
    if (i && v) return;
    add(dia === hoje, 'Faltam os horários de ' + nome +
      (!i && !v ? ' (ida e volta)' : !i ? ' (ida)' : ' (volta)'),
      'Montar', function () { B12.formHorariosDia(dia, function () { B12.admDesenhar(); }); });
  });

  /* 2. quem está na Ilha sem volta marcada */
  var d = B12.naIlha(hoje) || {};
  if ((d.semVolta || []).length) {
    add(true, d.semVolta.length + (d.semVolta.length > 1 ? ' pessoas estão' : ' pessoa está') +
      ' na Ilha sem horário de volta', 'Ver', function () { B12.admDesenhar('ilha'); });
  }

  /* 3. quem chega e quem volta hoje */
  var chegam = (d.chegam || []).reduce(function (t, p) { return t + (p.pessoas || 1); }, 0);
  var voltam = (d.voltam || []).reduce(function (t, p) { return t + (p.pessoas || 1); }, 0);
  if (chegam) add(false, chegam + (chegam > 1 ? ' pessoas chegam' : ' pessoa chega') + ' hoje',
    'Ver', function () { B12.admDesenhar('ilha'); });
  if (voltam) add(false, voltam + (voltam > 1 ? ' pessoas voltam' : ' pessoa volta') + ' hoje',
    'Ver', function () { B12.admDesenhar('ilha'); });

  /* 4. pedidos esperando confirmação */
  var novos = B12.pedidosNovos();
  if (novos.length) add(true, novos.length + ' pedido' + (novos.length > 1 ? 's' : '') +
    ' de reserva esperando você confirmar', 'Confirmar',
    function () { B12.admDesenhar('escala'); });

  /* 5. contas vencidas */
  var venc = B12.contasVencidas();
  if (venc.length) add(true, venc.length + ' conta' + (venc.length > 1 ? 's vencidas' : ' vencida'),
    'Ver', function () { B12.admDesenhar('contas'); });

  /* 6. carros passando da data */
  var atrasados = (B12.patioHoje() || []).filter(function (v) {
    return v.saidaPrevista && v.saidaPrevista < hoje; });
  if (atrasados.length) add(false, atrasados.length + ' carro' + (atrasados.length > 1 ? 's' : '') +
    ' passou da data no pátio', 'Ver', function () { B12.admDesenhar('patio'); });

  if (!itens.length) {
    raiz.appendChild(bloco('<div class="cx nota entra entra-1"><h3>Nada pendente</h3>' +
      '<p>Os horários estão montados, ninguém está na Ilha sem volta e não há conta vencida. ' +
      'Bom dia de trabalho.</p></div>'));
    return;
  }
  itens.sort(function (a, b) { return (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0); });

  var urgentes = itens.filter(function (x) { return x.urgente; }).length;
  var b = bloco(
    '<div class="cx ' + (urgentes ? 'aviso' : 'nota') + ' entra entra-1">' +
    '<div class="cx-topo"><h3>Seus lembretes</h3>' +
    '<span style="font-size:12px;color:var(--gelo-3)">' + itens.length + '</span></div>' +
    '<div class="lembretes">' + itens.map(function (x, i) {
      return '<div class="lb' + (x.urgente ? ' urgente' : '') + '">' +
        '<span class="lb-ponto"></span><span class="lb-txt">' + esc(x.texto) + '</span>' +
        '<button type="button" class="mini-btn" data-lb="' + i + '">' + x.rotulo + '</button></div>';
    }).join('') + '</div></div>');
  b.querySelectorAll('[data-lb]').forEach(function (btn) {
    btn.onclick = function () { itens[Number(btn.dataset.lb)].acao(); };
  });
  raiz.appendChild(b);
}

function pEscala(raiz) {
  var dia = diaEscala || B12.hoje();
  var e = B12.escalaDoDia(dia);
  var totalIda = e.idas.reduce(function (t, x) { return t + x.pax; }, 0);
  var totalVolta = e.voltas.reduce(function (t, x) { return t + x.pax; }, 0);
  var pendentes = B12.semHorarioDeVolta(dia);

  raiz.appendChild(bloco(
    '<div style="display:flex;gap:8px;align-items:center;padding:12px" class="entra">' +
    '<button class="btn sec" style="margin:0;width:auto;padding:11px 14px" id="b-ontem">‹</button>' +
    '<input type="date" id="d-escala" value="' + dia + '" style="flex:1;text-align:center">' +
    '<button class="btn sec" style="margin:0;width:auto;padding:11px 14px" id="b-amanha">›</button>' +
    '</div>' +
    '<div class="placar entra entra-1">' +
      tile(e.idas.length,'Saídas de ida','n') +
      tile(totalIda,'Passageiros indo','n','destaque') +
      tile(e.voltas.length,'Saídas de volta','n') +
      tile(totalVolta,'Passageiros voltando','n','destaque') +
      tile(pendentes.length,'Sem volta marcada','n', pendentes.length ? 'alerta' : '') +
      tile(B12.EMBARCACOES.length,'Embarcações','n') +
    '</div>' +
    '<div class="grade2" style="margin:12px">' +
    '<button class="btn pri" style="margin:0" id="b-nova-ida">+ Saída de ida</button>' +
    '<button class="btn sec" style="margin:0" id="b-nova-volta">+ Saída de volta</button></div>'
  ));
  var campo = raiz.querySelector('#d-escala');
  campo.onchange = function () { diaEscala = campo.value; B12.admDesenhar('escala'); };
  raiz.querySelector('#b-ontem').onclick = function () {
    diaEscala = B12.diaMais(dia, -1); B12.admDesenhar('escala'); };
  raiz.querySelector('#b-amanha').onclick = function () {
    diaEscala = B12.diaMais(dia, 1); B12.admDesenhar('escala'); };
  raiz.querySelector('#b-nova-ida').onclick = function () { formSaida('ida', dia); };
  raiz.querySelector('#b-nova-volta').onclick = function () { formSaida('volta', dia); };

  raiz.appendChild(blocoHorarios(dia));

  /* ---- pedidos que chegaram pelo app e ainda não têm saída ---- */
  var novos = B12.pedidosNovos();
  if (novos.length) {
    var cxN = bloco('<div class="cx nota"><h3>' + novos.length + ' pedido' + (novos.length > 1 ? 's' : '') +
      ' de reserva esperando você</h3><p>Chegaram pelo app. Escolha a saída e confirme: o passageiro ' +
      'entra na escala e a venda entra no caixa.</p>' +
      '<div class="lista" style="margin:12px 0 0">' + novos.map(function (r) {
        var idasDoDia = B12.saidasDoDia(r.ida, 'ida');
        return '<div class="cx" style="margin:0 0 9px;padding:12px;background:var(--noite-3)">' +
          '<div style="display:flex;gap:10px;align-items:flex-start">' +
          '<span class="tag">' + r.cod + '</span><div style="flex:1;min-width:0">' +
          '<b>' + r.nome + '</b><div style="font-size:11.5px;color:var(--gelo-3);margin-top:2px">' +
          r.pax + (r.pax > 1 ? ' pessoas' : ' pessoa') + ' · ' + r.destino + ' · ' + B12.dataBR(r.ida) +
          (r.volta ? ' a ' + B12.dataBR(r.volta) : '') + ' · ' + r.faixa +
          (r.placa ? ' · 🚗 ' + r.placa : '') + (r.total != null ? ' · ' + B12.brl(r.total) : '') +
          '</div></div></div>' +
          (idasDoDia.length ?
            '<div style="display:flex;gap:8px;margin-top:10px;align-items:center">' +
            '<select data-sel="' + r.id + '" style="flex:1;padding:10px 12px">' +
            idasDoDia.map(function (sd) {
              var oc = B12.DB.reservas.filter(function (x) { return x.saidaId === sd.id; })
                .reduce(function (t, x) { return t + (x.pax || 1); }, 0);
              return '<option value="' + sd.id + '">' + sd.hora + ' · ' + sd.destino + ' · ' +
                (sd.vagas - oc) + ' lugares</option>'; }).join('') + '</select>' +
            '<button class="mini-btn" data-conf="' + r.id + '">Confirmar</button></div>'
            : '<div style="font-size:12px;color:var(--atencao);margin-top:9px">Não há saída de ida em ' +
              B12.dataBR(r.ida) + '. Crie uma acima e volte aqui.</div>') +
          '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<button class="mini-btn" style="background:#25D366;color:#04240F" data-zapnovo="' + r.id + '">WhatsApp</button>' +
          '</div></div>';
      }).join('') + '</div></div>');
    raiz.appendChild(cxN);
    cxN.querySelectorAll('[data-conf]').forEach(function (b) {
      b.onclick = function () {
        var sel = cxN.querySelector('[data-sel="' + b.dataset.conf + '"]');
        var res = B12.confirmarReserva(b.dataset.conf, sel.value);
        if (res.erro) { b.textContent = res.erro; return; }
        B12.admDesenhar('escala');
        B12.folhaMensagem('confirmacao', { nome: res.reserva.nome, whats: res.reserva.zap,
          cod: res.reserva.cod, ida: res.reserva.ida, volta: res.reserva.volta,
          hora: res.saida.hora, pax: res.reserva.pax, total: res.reserva.total });
      };
    });
    cxN.querySelectorAll('[data-zapnovo]').forEach(function (b) {
      b.onclick = function () {
        var r = B12.reservaPorId(b.dataset.zapnovo);
        B12.escolherMensagem({ nome: r.nome, whats: r.zap, cod: r.cod, ida: r.ida, volta: r.volta,
          pax: r.pax, total: r.total });
      };
    });
  }

  if (pendentes.length) {
    var av = bloco('<div class="cx aviso"><h3>' + pendentes.length + ' pessoa' +
      (pendentes.length>1?'s voltam':' volta') + ' hoje sem horário marcado</h3>' +
      '<p>Mande a lista de horários para elas escolherem.</p>' +
      '<div class="lista" style="margin:12px 0 0">' + pendentes.map(function (r) {
        return '<div class="linha toca" data-pend="' + (r.id || r.cod) + '">' +
          '<span class="tag">' + r.cod + '</span><div class="d"><b>' + r.nome + '</b>' +
          '<small>' + r.pax + (r.pax>1?' pessoas':' pessoa') + '</small></div>' +
          '<span class="pilula vencendo">avisar</span></div>'; }).join('') + '</div></div>');
    raiz.appendChild(av);
    av.querySelectorAll('[data-pend]').forEach(function (li) {
      li.onclick = function () {
        var r = pendentes.filter(function (x) { return (x.id||x.cod) === li.dataset.pend; })[0];
        B12.folhaMensagem('volta', { nome:r.nome, whats:r.zap, cod:r.cod,
          horarios: e.voltas.map(function (v) { return v.saida.hora +
            (v.pax >= v.saida.vagas ? ' (lotado)' : ''); }) });
      };
    });
  }

  desenhaSentido(raiz, 'Indo para a Ilha', e.idas, dia, 'ida');
  desenhaSentido(raiz, 'Voltando da Ilha', e.voltas, dia, 'volta');

  var fim = bloco('<div style="padding:0 12px 12px">' +
    '<button class="btn sec" style="margin:0" id="b-escala-zap">' +
    'Mandar a escala para o marinheiro</button></div>');
  raiz.appendChild(fim);
  fim.querySelector('#b-escala-zap').onclick = function () {
    var linhas = e.idas.concat(e.voltas).map(function (x) {
      return x.saida.hora + ' — ' + x.saida.destino + ' — ' + x.pax +
        (x.pax === 1 ? ' passageiro' : ' passageiros'); });
    B12.folhaMensagem('grupo', { data: dia, linhas: linhas.length ? linhas : ['sem saídas'] });
  };
}

function desenhaSentido(raiz, titulo, lista, dia, sentido) {
  raiz.appendChild(bloco('<div class="faixa-sec"><div class="tit"><h2>' + titulo + '</h2>' +
    '<span style="font-size:11.5px;color:var(--gelo-3)">' + lista.length +
    (lista.length === 1 ? ' saída' : ' saídas') + '</span></div></div>'));
  if (!lista.length) {
    raiz.appendChild(bloco('<div class="vazio" style="padding:26px"><b>Nenhuma saída marcada</b>' +
      '<p>Toque no botão acima para criar o primeiro horário do dia.</p></div>'));
    return;
  }
  var cx = document.createElement('div'); cx.className = 'lista';
  cx.innerHTML = lista.map(function (x) {
    var s = x.saida, cheio = x.pax / s.vagas;
    return '<div class="cx" style="margin:0 0 10px;padding:13px">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
      '<div class="horario">' + s.hora + '</div>' +
      '<div style="flex:1;min-width:0"><b style="font-size:14.5px">' + s.destino + '</b>' +
      '<div style="font-size:11.5px;color:var(--gelo-3);margin-top:2px">' +
      (s.marinheiro ? s.marinheiro + ' · ' : '') + x.pax + ' de ' + s.vagas + ' lugares</div>' +
      '<div class="medidor" style="margin-top:7px"><i style="width:' +
      Math.min(100, cheio*100).toFixed(0) + '%;background:' +
      (cheio >= 1 ? C.ruim : cheio > 0.8 ? C.aten : C.turq) + '"></i></div></div>' +
      '<button class="mini-btn" data-msgsaida="' + s.id + '">avisar</button></div>' +
      (x.passageiros.length ? '<div class="passageiros">' + x.passageiros.map(function (p) {
        return '<div class="pass" data-pass="' + (p.id || p.cod) + '">' +
          '<span class="pnome">' + p.nome + '</span>' +
          '<span class="ppax">' + p.pax + 'p</span>' +
          (p.zap ? '<button class="zapzinho" data-zap="' + (p.id || p.cod) + '" ' +
            'aria-label="Falar com ' + p.nome + '">' +
            '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">' +
            '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/>' +
            '</svg></button>' : '') + '</div>'; }).join('') + '</div>'
        : '<div class="semninguem">Ninguém marcado neste horário ainda</div>') +
      '</div>';
  }).join('');
  raiz.appendChild(cx);
  cx.querySelectorAll('[data-zap]').forEach(function (b) {
    b.onclick = function (ev) {
      ev.stopPropagation();
      var p = B12.DB.reservas.filter(function (r) {
        return (r.id || r.cod) === b.dataset.zap; })[0];
      if (p) B12.escolherMensagem({ nome:p.nome, whats:p.zap, cod:p.cod,
        ida:p.ida, volta:p.volta, pax:p.pax, total:p.total });
    };
  });
  cx.querySelectorAll('[data-msgsaida]').forEach(function (b) {
    b.onclick = function () {
      var x = lista.filter(function (y) { return y.saida.id === b.dataset.msgsaida; })[0];
      if (!x) return;
      B12.folhaMensagem('grupo', { data: dia,
        linhas: [x.saida.hora + ' — ' + x.saida.destino + ' — ' + x.pax + ' passageiros'],
        obs: 'Saída ' + (sentido === 'ida' ? 'para a Ilha' : 'de volta') + '.' });
    };
  });
}

function formSaida(sentido, dia) {
  B12.folha({
    titulo: sentido === 'ida' ? 'Nova saída de ida' : 'Nova saída de volta',
    sub: sentido === 'ida' ? 'Leva os passageiros para a Ilha' : 'Traz os passageiros da Ilha',
    corpo:
      B12.f_campo('Horário', 'hora', { tipo:'time', valor: sentido==='ida'?'08:30':'17:00', obrig:true }) +
      B12.f_campo('Data', 'data', { tipo:'date', valor: dia, obrig:true }) +
      B12.f_lista('Destino', 'destino', sentido === 'ida'
        ? B12.DESTINOS : ['Pontal do Sul'], sentido === 'ida' ? 'Brasília' : 'Pontal do Sul') +
      B12.f_lista('Embarcação', 'embarcacao',
        B12.EMBARCACOES.map(function (e) { return [e.id, e.nome]; }), 'l01') +
      B12.f_campo('Marinheiro', 'marinheiro', { dica:'quem leva', max:30 }) +
      B12.f_campo('Lugares', 'vagas', { tipo:'number', modo:'numeric', valor:B12.CAPACIDADE, passo:'1' }) +
      B12.f_campo('Observação', 'obs', { dica:'opcional', max:80 }),
    acao: 'Criar saída',
    aoSalvar: function (d) { d.sentido = sentido; return B12.novaSaida(d); },
    depois: function () { B12.admDesenhar('escala'); }
  });
}

/* ============================================================== MENSAGENS */
function pMsgs(raiz) {
  raiz.appendChild(bloco(
    '<div class="cx entra"><h3>Mensagens prontas</h3>' +
    '<p>Onze modelos escritos para o WhatsApp, com o nome e os dados da pessoa já ' +
    'preenchidos. O app monta o texto e abre a conversa. <b>Quem aperta enviar é você.</b> ' +
    'Disparo sozinho de verdade só com a API oficial da Meta, que tem custo por conversa.</p></div>'
  ));
  /* as dele primeiro: são as que ele escreveu e usa mais */
  var minhas = B12.minhasMensagens();
  raiz.appendChild(bloco(
    '<div class="faixa-sec"><div class="tit"><h2>Minhas mensagens</h2>' +
    '<span style="font-size:12px;color:var(--gelo-3)">' + minhas.length + '</span></div></div>' +
    (minhas.length
      ? '<div class="lista" id="lista-minhas">' + minhas.map(function (m) {
          return '<div class="linha"><div class="d" data-minha="' + m.id + '" style="cursor:pointer">' +
            '<b>' + esc(m.nome) + '</b><small>' + esc(m.texto.replace(/\*/g, '').slice(0, 60)) + '…</small></div>' +
            '<div style="display:flex;gap:6px;flex:none">' +
            '<button type="button" class="mini-btn" data-edit="' + m.id + '">Editar</button>' +
            '<button type="button" class="mini-btn" data-apagar="' + m.id + '">Apagar</button></div></div>'; }).join('') + '</div>'
      : '<div class="cx" style="margin-top:0"><p>Você ainda não escreveu nenhuma. ' +
        'Crie as suas: aquela do bom dia, a de mau tempo, a de agradecer depois da viagem.</p></div>') +
    '<div style="padding:0 12px">' +
    '<button type="button" class="btn pri" id="b-nova-msg">Criar uma mensagem</button></div>' +
    '<div class="faixa-sec"><div class="tit"><h2>Modelos de fábrica</h2></div></div>'
  ));

  var l = document.createElement('div'); l.className = 'lista';
  l.innerHTML = B12.MODELOS.map(function (m) {
    return '<div class="linha toca" data-modelo="' + m.id + '">' +
      '<span class="tag" style="background:' + m.cor + '22;color:' + m.cor + '" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' +
      '</span><div class="d"><b>' + m.nome + '</b><small>' + m.quando + '</small></div>' +
      '<svg class="seta" viewBox="0 0 24 24" width="17" height="17" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></div>';
  }).join('');
  raiz.appendChild(l);
  l.querySelectorAll('[data-modelo]').forEach(function (li) {
    li.onclick = function () {
      var cli = B12.DB.clientes[0];
      B12.folhaMensagem(li.dataset.modelo, cli
        ? { nome: cli.nome, whats: cli.whats, cod: 'B12-4821', ida: B12.hoje(),
            volta: B12.diaMais(B12.hoje(), 3), pax: 2, total: 240 }
        : { nome: 'Ana', cod: 'B12-4821', ida: B12.hoje(), pax: 2, total: 240 });
    };
  });
  raiz.appendChild(bloco(
    '<div class="cx nota"><h3>Como usar no dia a dia</h3>' +
    '<p>Na aba <b>Escala</b>, cada passageiro tem um botão verde do WhatsApp ao lado do nome. ' +
    'Toque nele e escolha o modelo: confirmar, lembrar da véspera, mandar os horários de volta ' +
    'ou avisar que o mar virou. Na aba <b>Clientes</b>, o mesmo vale para quem já viajou.</p></div>'));

  function re() { B12.admDesenhar('msgs'); }
  function abrirMinha(m) {
    var texto = B12.preencherMensagem(m.texto, {});
    B12.folha({ titulo: m.nome, sub: m.quando,
      corpo: '<div class="balao">' + esc(texto).replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</div>' +
        '<div class="ajuda" style="margin-top:12px">As marcas {nome}, {codigo}, {data} e {hora} são trocadas ' +
        'pelos dados da pessoa quando você manda pela ficha dela.</div>',
      acao: 'Copiar texto', aoSalvar: function () { B12.copiar(texto); return { ok: true }; },
      depois: function () { B12.aviso('Copiado. Cole no WhatsApp.', 'bom'); } });
  }
  function editor(m) {
    B12.folha({
      titulo: m ? 'Editar mensagem' : 'Nova mensagem',
      sub: 'Ela fica guardada e você usa quando quiser',
      corpo:
        '<input type="hidden" name="id" value="' + (m ? m.id : '') + '">' +
        B12.f_campo('Nome da mensagem', 'nome', { valor: m ? m.nome : '', obrig: true, max: 40,
          dica: 'Bom dia do embarque' }) +
        B12.f_campo('Quando usar', 'quando', { valor: m ? m.quando : '', max: 60,
          dica: 'na véspera da viagem' }) +
        '<label for="c-texto">Texto</label>' +
        '<textarea id="c-texto" name="texto" rows="7" placeholder="Oi, {nome}! ...">' +
        (m ? esc(m.texto) : '') + '</textarea>' +
        '<div class="ajuda">Use *asteriscos* para negrito. As marcas {nome}, {codigo}, {data} e {hora} ' +
        'viram os dados da pessoa na hora de enviar.</div>' +
        '<button type="button" class="btn sec" id="b-ia-escreve" style="margin-top:12px">' +
        'Pedir para a IA escrever</button>' +
        '<div class="ajuda" id="ia-msg-aviso"></div>',
      acao: m ? 'Salvar' : 'Criar mensagem',
      aoAbrir: function (form) {
        var b = form.querySelector('#b-ia-escreve'), av = form.querySelector('#ia-msg-aviso');
        b.onclick = function () {
          var assunto = form.querySelector('[name=nome]').value.trim() ||
                        form.querySelector('[name=quando]').value.trim();
          if (!assunto) { av.textContent = 'Escreva antes o nome ou o "quando usar", para eu saber do que se trata.';
            av.style.color = 'var(--ruim)'; return; }
          b.disabled = true; b.textContent = 'Escrevendo…'; av.textContent = ''; av.style.color = '';
          B12.iaEscreverMensagem('Escreva a mensagem de WhatsApp para: ' + assunto +
            '. Contexto: ' + (form.querySelector('[name=quando]').value.trim() || 'uso geral') + '.')
            .then(function (t) {
              form.querySelector('[name=texto]').value = t;
              av.textContent = 'Pronto. Leia, ajuste o que quiser e salve.'; av.style.color = 'var(--bom)';
            })
            .catch(function (e) { av.textContent = e.message; av.style.color = 'var(--ruim)'; })
            .finally(function () { b.disabled = false; b.textContent = 'Pedir para a IA escrever'; });
        };
      },
      aoSalvar: function (d) { return B12.salvarMinhaMensagem(d); },
      depois: function () { re(); B12.aviso('Mensagem guardada.', 'bom'); }
    });
  }
  var bn = raiz.querySelector('#b-nova-msg');
  if (bn) bn.onclick = function () { editor(null); };
  raiz.querySelectorAll('[data-minha]').forEach(function (b) {
    b.onclick = function () { abrirMinha(minhas.filter(function (x) { return x.id === b.dataset.minha; })[0]); };
  });
  raiz.querySelectorAll('[data-edit]').forEach(function (b) {
    b.onclick = function () { editor(minhas.filter(function (x) { return x.id === b.dataset.edit; })[0]); };
  });
  raiz.querySelectorAll('[data-apagar]').forEach(function (b) {
    b.onclick = function () {
      var m = minhas.filter(function (x) { return x.id === b.dataset.apagar; })[0];
      if (confirm('Apagar a mensagem "' + m.nome + '"?')) { B12.apagarMinhaMensagem(m.id); re(); }
    };
  });
}


/* ------------------------------------------------------------------ DADOS
   Tudo sai do app: Excel, PDF para o contador e cópia completa. */
function pDados(raiz) {
  var n = B12.contagens(), cofre = B12.cofreCopias();
  var opcoes = [['tudo','Tudo, desde o começo'],['mes','Este mês'],['mesPassado','Mês passado'],['ano','Este ano']];
  raiz.appendChild(bloco(
    '<div class="cx entra"><h3>Seus dados saem do app quando você quiser</h3>' +
    '<p>Tudo o que está no painel pode ser baixado em Excel, em PDF para o contador e numa cópia completa ' +
    'para guardar. Hoje o banco mora neste aparelho; com a nuvem ligada ele mora no servidor, e continua ' +
    'saindo por aqui do mesmo jeito.</p>' +
    '<div class="placar" style="margin-top:12px">' +
    tile(n.clientes,'Clientes','n') + tile(n.lancamentos,'Lançamentos','n') + tile(n.reservas,'Reservas','n') +
    tile(n.patio,'Carros','n') + tile(n.manutencoes,'Manutenções','n') + tile(n.contas,'Contas','n') + '</div>' +
    '<label for="exp-periodo" style="margin-top:14px">Período</label>' +
    '<select id="exp-periodo">' + opcoes.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select>' +
    '<div class="ajuda">Vale para lançamentos, reservas, pátio, manutenção e contas. A lista de clientes e o histórico da planilha vão sempre inteiros.</div>' +
    '<button type="button" class="btn pri" id="b-xlsx">Baixar o Excel completo (.xlsx)</button>' +
    '<button type="button" class="btn sec" id="b-pdf-cont">PDF para o contador</button>' +
    '<button type="button" class="btn sec" id="b-pdf-cli">PDF da lista de clientes</button>' +
    '<div id="exp-aviso" class="ajuda" style="margin-top:10px"></div>' +
    '<p style="font-size:12px;margin-top:10px">O Excel tem 8 abas: Resumo, Entradas e saídas, Clientes, Reservas, ' +
    'Estacionamento, Manutenção, Contas e o Histórico da planilha (2015 a 2025). Datas e valores vão como número, ' +
    'para o contador somar e filtrar.</p></div>' +

    '<div class="cx entra entra-1"><h3>Cópia de segurança</h3>' +
    '<p>A cópia completa (.json) é o app inteiro num arquivo. Guarde uma por semana no Drive ou no e-mail. ' +
    'Se o celular quebrar, abra o app noutro aparelho e restaure a partir dela.</p>' +
    '<button type="button" class="btn sec" id="b-json">Baixar a cópia completa (.json)</button>' +
    '<label class="btn sec arquivo" for="i-json">Restaurar de um arquivo' +
    '<input type="file" id="i-json" accept=".json,application/json"></label>' +
    '<h4 style="margin-top:16px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--gelo-3)">Cópias automáticas neste aparelho</h4>' +
    '<p style="font-size:12px;margin:4px 0 8px">O app guarda sozinho até 12 cópias, e nunca deixa uma cópia vazia apagar uma cheia.</p>' +
    (cofre.length ? '<table class="tabela">' + cofre.map(function (c, i) {
      var d = new Date(c.em);
      return '<tr><td><b>' + B12.dataBR(c.dia) + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') +
        '</b><div style="font-size:11.5px;color:var(--gelo-3)">' + c.peso + ' registros · ' + (c.motivo === 'mao' ? 'antes de restaurar' : 'automática') + '</div></td>' +
        '<td class="n"><button type="button" class="mini-btn" data-cofre="' + i + '">Voltar para esta</button></td></tr>'; }).join('') + '</table>'
      : '<p style="font-size:12px;color:var(--gelo-3)">Ainda não há cópias.</p>') +
    '</div>'
  ));

  function avisar(t, ok) {
    var a = document.getElementById('exp-aviso');
    a.textContent = t; a.style.color = ok ? 'var(--bom)' : 'var(--ruim)';
    a.setAttribute('role', ok ? 'status' : 'alert');
    B12.aviso(t, ok ? 'bom' : 'ruim');            /* o mesmo retorno do resto do app */
  }
  function per() { return document.getElementById('exp-periodo').value; }
  document.getElementById('b-xlsx').onclick = function () {
    var r = B12.exportarExcel(per());
    avisar('Excel gerado: ' + r.linhas + ' lançamentos e ' + r.clientes + ' clientes, ' + Math.round(r.bytes/1024) + ' KB. Procure na pasta de downloads.', true);
  };
  document.getElementById('b-pdf-cont').onclick = function () {
    var r = B12.exportarPDFContador(per());
    avisar('PDF gerado: ' + r.paginas + ' página' + (r.paginas > 1 ? 's' : '') + '. Procure na pasta de downloads.', true);
  };
  document.getElementById('b-pdf-cli').onclick = function () {
    var r = B12.exportarPDFClientes();
    avisar('PDF de clientes gerado: ' + r.paginas + ' página' + (r.paginas > 1 ? 's' : '') + '.', true);
  };
  document.getElementById('b-json').onclick = function () {
    var r = B12.baixarCopia();
    avisar('Cópia completa gerada, ' + Math.round(r.bytes/1024) + ' KB. Guarde num lugar seguro.', true);
  };
  document.getElementById('i-json').onchange = function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    B12.lerCopia(f, function (r) {
      if (r.erro) return avisar(r.erro, false);
      var c = r.contagens, aqui = B12.contagens();
      var ok = confirm('Restaurar esta cópia?\n\nAqui hoje: ' + aqui.lancamentos + ' lançamentos · ' + aqui.clientes + ' clientes\n' +
        'No arquivo: ' + c.lancamentos + ' lançamentos · ' + c.clientes + ' clientes\n\nO que está aqui vai para as cópias automáticas antes da troca.');
      if (!ok) return;
      var x = B12.restaurar(r.copia);
      if (x.erro) return avisar(x.erro, false);
      B12.admDesenhar('dados');
      setTimeout(function () { avisar('Cópia restaurada: ' + x.contagens.lancamentos + ' lançamentos e ' + x.contagens.clientes + ' clientes.', true); }, 50);
    });
    ev.target.value = '';
  };
  raiz.querySelectorAll('[data-cofre]').forEach(function (b) {
    b.onclick = function () {
      var c = cofre[+b.dataset.cofre];
      if (!confirm('Voltar para a cópia de ' + B12.dataBR(c.dia) + ' (' + c.peso + ' registros)?\n\nO que está aqui agora vai para as cópias automáticas antes.')) return;
      var x = B12.cofreVoltar(+b.dataset.cofre);
      if (x.erro) return alert(x.erro);
      B12.admDesenhar('dados');
    };
  });
}


/* ----------------------------------------------------------------- PREÇOS
   O dono manda nos valores. Nada de preço fixo no código. */
function pPrecos(raiz) {
  var A = B12.DB.ajustes, T = A.tabela, P = B12.passeios(true);
  function re() { B12.admDesenhar('precos'); }
  raiz.appendChild(bloco(
    '<div class="cx entra"><h3>Você manda nos preços</h3>' +
    '<p>Tudo o que o cliente vê de valor sai daqui. Mudou, valeu na hora para quem abrir o app.</p>' +
    (A.precosConferidos ? '' :
      '<div class="cx aviso" style="margin:12px 0 0"><h3>Confira uma vez</h3><p>Os valores abaixo vieram do seu documento e da ' +
      'planilha. Abra "Editar preços da travessia", confira e salve: o aviso laranja some da tela do cliente.</p></div>') +
    '</div>' +

    '<div class="cx entra entra-1"><h3>Travessia</h3>' +
    '<table class="tabela"><tr><td><b>Travessia regular</b><div style="font-size:11.5px;color:var(--gelo-3)">lancha compartilhada · por pessoa, por trecho</div></td>' +
    '<td class="n">' + B12.brl(A.regular) + '</td></tr>' +
    ['dia','tarde','noite'].map(function (k) {
      return '<tr><td><b>Náutico Premium · ' + k + '</b><div style="font-size:11.5px;color:var(--gelo-3)">' + T[k].de + ' às ' + T[k].ate +
        ' · até 3 pessoas fixo, depois por pessoa</div></td><td class="n">' + B12.brl(T[k].fixo) + '<div style="font-size:11.5px;color:var(--gelo-3)">' +
        B12.brl(T[k].pessoa) + '/pessoa</div></td></tr>'; }).join('') +
    '<tr><td>Criança não paga até</td><td class="n">' + A.idadeCortesia + ' anos</td></tr>' +
    '<tr><td>Desconto no dinheiro</td><td class="n">' + String(Math.round((A.descDinheiro || 0) * 100)) + '%</td></tr></table>' +
    '<button type="button" class="btn pri" id="b-precos-trav">Editar preços da travessia</button>' +
    '<div class="cx ' + (B12.mostraPrecos() ? 'bom' : 'aviso') + '" style="margin:12px 0 0">' +
      '<h3>' + (B12.mostraPrecos() ? 'O cliente está vendo os valores' : 'O cliente NÃO vê valores') + '</h3>' +
      '<p>' + (B12.mostraPrecos()
        ? 'Na tela de reserva aparecem os preços de cada serviço e o total.'
        : 'Na tela de reserva aparece "sob consulta", e o valor é combinado por você no WhatsApp. ' +
          'Ligue quando a tabela estiver fechada.') + '</p>' +
      '<button type="button" class="btn sec peq" id="b-mostrar-precos">' +
      (B12.mostraPrecos() ? 'Esconder os valores do cliente' : 'Mostrar os valores ao cliente') +
      '</button></div></div>' +

    '<div class="cx entra entra-2"><h3>Passeios</h3>' +
    '<table class="tabela">' + P.map(function (p) {
      return '<tr' + (p.ativo ? '' : ' style="opacity:.55"') + '><td><b>' + p.nome + '</b>' + (p.ativo ? '' : ' <span class="selo-demo">escondido</span>') +
        '<div style="font-size:11.5px;color:var(--gelo-3)">' + p.dur + (p.extra ? ' · criado por você' : '') +
        (p.precoCrianca != null ? ' · criança ' + B12.brl(p.precoCrianca) : '') + '</div></td>' +
        '<td class="n">' + B12.brl(p.preco) + '<div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">' +
        '<button type="button" class="mini-btn" data-editar="' + p.id + '">Editar</button>' +
        '<button type="button" class="mini-btn" data-alternar="' + p.id + '">' + (p.ativo ? 'Esconder' : 'Mostrar') + '</button>' +
        (p.extra ? '<button type="button" class="mini-btn" data-apagar="' + p.id + '">Apagar</button>' : '') + '</div></td></tr>'; }).join('') +
    '</table>' +
    '<button type="button" class="btn sec" id="b-passeio-novo">Criar um passeio novo</button>' +
    '<p style="font-size:12px;margin-top:8px">Passeio novo entra na tela do cliente com foto padrão. Mande as fotos para o Eugênio montar a página completa dele.</p></div>' +

    '<div class="grade2 entra entra-3">' +
    '<div class="cx" style="margin:0"><h3>Estacionamento</h3><p>Diária de <b>' + B12.brl(A.diaria) + '</b>. ' +
    ((A.patio || {}).regra === '24h' ? 'Conta a cada 24 h' : 'Conta por dia de calendário') + ', cobra na ' +
    ((A.patio || {}).cobranca === 'chegada' ? 'chegada' : 'saída') + '.</p>' +
    '<button type="button" class="btn sec peq" id="b-diaria">Editar diária</button>' +
    '<button type="button" class="btn sec peq" id="b-regras">Regras, em Ajustes</button></div>' +
    '<div class="cx" style="margin:0"><h3>Maquininha</h3><p>' +
    ['credito','debito','pix','dinheiro'].map(function (k) { return k + ' ' + String(Math.round((A.taxas[k] || 0) * 10000) / 100).replace('.', ',') + '%'; }).join(' · ') +
    '</p><button type="button" class="btn sec peq" id="b-taxas">Editar taxas</button></div></div>'
  ));
  raiz.querySelector('#b-precos-trav').onclick = function () { B12.formPrecosTravessia(re); };
  raiz.querySelector('#b-mostrar-precos').onclick = function () {
    var r = B12.trocarMostraPrecos(!B12.mostraPrecos());
    B12.aviso(r.mostrando ? 'Os valores passaram a aparecer para o cliente.'
                          : 'Os valores sumiram da tela do cliente.', 'bom');
    re();
  };
  raiz.querySelector('#b-passeio-novo').onclick = function () { B12.formPasseio(null, re); };
  raiz.querySelector('#b-diaria').onclick = function () { B12.formDiaria(re); };
  raiz.querySelector('#b-taxas').onclick = function () { B12.formTaxas(re); };
  raiz.querySelector('#b-regras').onclick = function () { B12.formAjustes(re); };
  raiz.querySelectorAll('[data-editar]').forEach(function (b) { b.onclick = function () { B12.formPasseio(B12.acharPasseio(b.dataset.editar), re); }; });
  raiz.querySelectorAll('[data-alternar]').forEach(function (b) { b.onclick = function () { B12.alternarPasseio(b.dataset.alternar); re(); }; });
  raiz.querySelectorAll('[data-apagar]').forEach(function (b) { b.onclick = function () {
    var p = B12.acharPasseio(b.dataset.apagar);
    if (confirm('Apagar o passeio "' + p.nome + '"? Ele some da tela do cliente.')) { B12.apagarPasseio(p.id); re(); } }; });
}


/* -------------------------------------------------------------- ASSISTENTE
   O Dhalsin pergunta em português e o assistente responde lendo os dados do
   próprio app. O que mexe em dinheiro ou preço vira um cartão para confirmar. */
var iaSugestoes = [
  'Como foi o dia de hoje?',
  'Quem viaja amanhã?',
  'Quanto posso retirar este mês?',
  'Quais contas vencem esta semana?',
  'Quem são meus 5 melhores clientes?',
  'Tem carro no pátio passando da data?',
  'Compare este mês com o ano passado',
  'Qual a senha da equipe?',
];

function iaEscapa(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
/* o texto da IA vem simples: **negrito**, quebras de linha e listas com - */
function iaTexto(t) {
  return iaEscapa(t)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/^- (.+)$/gm, '<span class="ia-item">$1</span>')
    .replace(/\n/g, '<br>');
}

var iaCartao = B12.iaCartao, iaLigarCartao = B12.iaLigarCartao;
function pIA(raiz) {
  var d = B12.iaDados();
  var cx = bloco(
    '<div class="cx entra" style="padding-bottom:12px"><h3>Assistente da B12</h3>' +
    '<p>Pergunte em português. Ele lê os dados deste app para responder: caixa, agenda, ' +
    'clientes, pátio, contas, preços e o histórico da planilha.</p>' +
    '<div id="ia-estado"></div>' +
    '<div class="ia-credito">' +
      '<div class="ia-credito-topo"><span>Créditos</span><b>' + B12.brl(d.saldo, 2) + '</b></div>' +
      '<div class="medidor' + (d.saldo < d.posto * 0.15 ? ' aviso' : '') + '">' +
      '<i style="width:' + (d.posto ? Math.max(0, Math.min(100, d.saldo / d.posto * 100)).toFixed(1) : 0) + '%"></i></div>' +
      '<div class="ia-credito-pe"><span>' + d.perguntas + ' pergunta' + (d.perguntas === 1 ? '' : 's') +
        ' · gasto ' + B12.brl(d.gasto, 2) + (d.perguntas ? ' · cerca de ' + B12.brl(d.media, 2) + ' cada' : '') + '</span>' +
        '<button type="button" class="mini-btn" id="ia-recarregar">Pôr créditos</button></div>' +
    '</div></div>'
  );
  raiz.appendChild(cx);

  var conversa = bloco('<div class="ia-conversa" id="ia-conversa" aria-live="polite"></div>');
  raiz.appendChild(conversa);

  var barra = bloco(
    '<div class="ia-sugestoes" id="ia-sugestoes">' + iaSugestoes.map(function (s) {
      return '<button type="button" class="ia-sug" data-sug="' + iaEscapa(s) + '">' + iaEscapa(s) + '</button>'; }).join('') + '</div>' +
    '<form class="ia-barra" id="ia-barra">' +
      '<input id="ia-campo" placeholder="Pergunte alguma coisa…" autocomplete="off" aria-label="Sua pergunta">' +
      '<button type="submit" class="ia-enviar" aria-label="Perguntar">' +
      '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '</form>' +
    '<div class="ia-pe"><button type="button" class="mini-btn" id="ia-limpar">Limpar conversa</button>' +
    '<span>As respostas são geradas por IA. Confira antes de decidir.</span></div>'
  );
  raiz.appendChild(barra);

  /* confere com o cofre e avisa antes de ele tentar perguntar */
  B12.iaTestar().then(function (e) {
    var el = document.getElementById('ia-estado'); if (!el) return;
    el.innerHTML = e.ligado ? '' :
      '<div class="cx aviso" style="margin:12px 0 0"><h3>Assistente ainda não liberado</h3>' +
      '<p>' + (e.motivo === 'endereço ainda não liberado no cofre'
        ? 'Falta o Eugênio liberar este endereço no cofre. É um passo de um minuto. Enquanto isso, o resto do painel funciona normalmente.'
        : 'Falta o Eugênio ligar a chave. O resto do painel funciona normalmente.') + '</p></div>';
  });

  var area = document.getElementById('ia-conversa');
  if (!d.conversa) area.innerHTML = '<div class="ia-vazio"><b>Pergunte o que quiser sobre a B12</b>' +
    '<p>Toque numa das perguntas abaixo para começar.</p></div>';

  function desce() { area.scrollTop = area.scrollHeight; }
  function bolha(m) {
    if (m.papel === 'fim') { var p = area.querySelector('.ia-pensa'); if (p) p.remove(); return desce(); }
    if (area.querySelector('.ia-vazio')) area.innerHTML = '';
    var pensa = area.querySelector('.ia-pensa'); if (pensa && m.papel !== 'pensa') pensa.remove();
    var el = document.createElement('div');
    if (m.papel === 'pensa') { el.className = 'ia-bolha ia-pensa'; el.innerHTML = '<span></span><span></span><span></span>'; }
    else if (m.papel === 'proposta') { el.className = 'ia-proposta'; el.innerHTML = iaCartao(m.proposta); }
    else { el.className = 'ia-bolha ia-' + (m.papel === 'user' ? 'eu' : m.papel === 'erro' ? 'erro' : 'ele');
           el.innerHTML = iaTexto(m.texto); }
    area.appendChild(el); desce();
    if (m.papel === 'proposta') iaLigarCartao(el, m.proposta);
  }

  function perguntar(t) {
    var campo = document.getElementById('ia-campo');
    campo.value = ''; campo.blur();
    B12.iaPerguntar(t, bolha).then(function () { B12.admDesenhar('ia'); });
  }
  document.getElementById('ia-barra').onsubmit = function (e) {
    e.preventDefault(); perguntar(document.getElementById('ia-campo').value);
  };
  raiz.querySelectorAll('[data-sug]').forEach(function (b) {
    b.onclick = function () { perguntar(b.dataset.sug); };
  });
  document.getElementById('ia-limpar').onclick = function () {
    B12.iaLimpar(); B12.admDesenhar('ia'); B12.aviso('Conversa apagada.', 'bom');
  };
  document.getElementById('ia-recarregar').onclick = function () {
    B12.folha({ titulo: 'Pôr créditos no assistente', sub: 'Quanto você quer deixar disponível',
      corpo: '<div class="ajuda">Cada pergunta custa cerca de R$ 0,02. Com R$ 50 dá para umas 2.500 ' +
        'perguntas. Por enquanto o custo vai na conta do Eugênio; depois passa para a sua.</div>' +
        B12.f_campo('Valor a acrescentar', 'valor', { tipo:'number', modo:'decimal', valor: 50, passo: '10', obrig: true }),
      acao: 'Pôr créditos',
      aoSalvar: function (x) { return B12.iaRecarregar(x.valor); },
      depois: function () { B12.admDesenhar('ia'); B12.aviso('Créditos atualizados.', 'bom'); } });
  };
  /* redesenha a conversa guardada */
  var h = (B12.DB.ajustes.ia || {}).historico || [];
  h.forEach(function (m) {
    if (m.role === 'user' && typeof m.content === 'string') bolha({ papel: 'user', texto: m.content });
    else if (m.role === 'assistant' && Array.isArray(m.content)) {
      var t = m.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim();
      if (t) bolha({ papel: 'assistant', texto: t });
    }
  });
}




/* ------------------------------------------------------------- NA ILHA
   Quem está lá agora, quando volta, e como falar com cada um num toque.
   É a tela da segurança: no fim do dia, ninguém fica esquecido na Ilha. */
var esc = iaEscapa;

/* quem viajou e ainda não pagou. Na B12 o cliente paga na saída, então esta
   lista é o caixa do dia esperando para entrar. */
function contasAbertasBloco() {
  var ab = B12.contasAbertas();
  if (!ab.length) return '';
  var soma = ab.reduce(function (s, c) { return s + c.total; }, 0);
  return '<div class="faixa-sec"><div class="tit"><h2>A receber na saída</h2>' +
    '<span style="font-size:12px;color:var(--gelo-3)">' + B12.brl(soma) + '</span></div></div>' +
    '<div class="pessoas">' + ab.map(function (c) {
      return '<div class="pes" style="border-left-color:var(--atencao)">' +
        '<div class="pes-cima"><div><b>' + esc(c.nome) + '</b>' +
        '<span class="pes-cod">' + c.cod + '</span></div>' +
        '<b style="font-size:16px;white-space:nowrap">' + B12.brl(c.total) + '</b></div>' +
        '<div class="pes-baixo">' +
          '<span>travessia ' + B12.brl(c.travessia) + '</span>' +
          (c.estacionamento ? '<span>pátio ' + B12.brl(c.estacionamento) + '</span>' : '') +
          (c.placa ? '<span>' + c.placa + '</span>' : '') + '</div>' +
        '<button type="button" class="btn pri peq" data-receber="' + c.id + '">Receber ' +
        B12.brl(c.total) + '</button></div>'; }).join('') + '</div>';
}

function pNaIlha(raiz) {
  var d = B12.naIlha(), E = B12.EMPRESA;

  function contatos(p) {
    var c = p.contato, b = [];
    if (c.whats) b.push('<button type="button" class="con zap" data-zap="' + c.whats +
      '" data-nome="' + esc(p.nome) + '" data-cod="' + p.cod + '" aria-label="WhatsApp de ' + esc(p.nome) + '">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8.9-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3z"/></svg></button>');
    if (c.instagram) b.push('<a class="con insta" href="https://instagram.com/' + c.instagram +
      '" target="_blank" rel="noopener" aria-label="Instagram de ' + esc(p.nome) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg></a>');
    if (c.email) b.push('<a class="con mail" href="mailto:' + c.email + '?subject=' +
      encodeURIComponent('Estação B12 · reserva ' + p.cod) + '" aria-label="E-mail de ' + esc(p.nome) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>');
    return '<div class="cons">' + b.join('') + '</div>';
  }

  function linha(p, marca) {
    var alerta = !p.horaVolta && (p.volta === d.dia || !p.volta);
    return '<div class="pes' + (alerta ? ' alerta' : '') + '">' +
      '<div class="pes-cima"><div><b>' + esc(p.nome) + '</b>' +
        '<span class="pes-cod">' + p.cod + '</span></div>' + contatos(p) + '</div>' +
      '<div class="pes-baixo">' +
        '<span>' + p.pessoas + (p.pessoas > 1 ? ' pessoas' : ' pessoa') +
          (p.criancas ? ' · ' + p.criancas + ' criança' + (p.criancas > 1 ? 's' : '') : '') + '</span>' +
        (marca === 'chegam' ? '<span>chega hoje</span>'
          : '<span>foi ' + B12.dataBR(p.ida) + (p.diasNaIlha ? ' · ' + p.diasNaIlha + (p.diasNaIlha > 1 ? ' dias' : ' dia') + ' na Ilha' : '') + '</span>') +
        (p.volta ? '<span>volta ' + B12.dataBR(p.volta) + (p.horaVolta ? ' às ' + p.horaVolta : '') + '</span>'
                 : '<span class="pend">sem data de volta</span>') +
        (p.pousada ? '<span>' + esc(p.pousada) + '</span>' : '') +
        (p.placa ? '<span>' + p.placa + (p.carroNoPatio ? ' no pátio' : '') + '</span>' : '') +
      '</div>' +
      (alerta ? '<div class="pes-alerta">Ainda não marcou o horário de volta</div>' : '') +
    '</div>';
  }

  function grupo(titulo, lista, marca, vazio) {
    return '<div class="faixa-sec"><div class="tit"><h2>' + titulo + '</h2>' +
      '<span style="font-size:12px;color:var(--gelo-3)">' + lista.length + '</span></div></div>' +
      (lista.length ? '<div class="pessoas">' + lista.map(function (p) { return linha(p, marca); }).join('') + '</div>'
                    : '<div class="cx" style="margin-top:0"><p>' + vazio + '</p></div>');
  }

  raiz.appendChild(bloco(
    '<div class="placar entra">' +
      tile(d.agora.reduce(function (s, p) { return s + p.pessoas; }, 0), 'Na Ilha agora', 'n', 'destaque') +
      tile(d.voltam.reduce(function (s, p) { return s + p.pessoas; }, 0), 'Voltam hoje', 'n') +
      tile(d.chegam.reduce(function (s, p) { return s + p.pessoas; }, 0), 'Chegam hoje', 'n') +
      tile(d.semVolta.length, 'Sem volta marcada', 'n', d.semVolta.length ? 'alerta' : '') +
    '</div>' +
    (d.semVolta.length ? '<div class="cx aviso entra entra-1"><h3>' + d.semVolta.length + ' pessoa' +
      (d.semVolta.length > 1 ? 's ainda não marcaram' : ' ainda não marcou') + ' a volta</h3>' +
      '<p>Toque no WhatsApp de cada uma para perguntar o horário. Ninguém fica na Ilha sem a B12 saber.</p></div>' : '') +
    contasAbertasBloco() +
    grupo('Na Ilha agora', d.agora, 'agora', 'Ninguém na Ilha neste momento.') +
    grupo('Voltam hoje', d.voltam, 'volta', 'Nenhum retorno marcado para hoje.') +
    grupo('Chegam hoje', d.chegam, 'chegam', 'Nenhuma chegada hoje.')
  ));

  raiz.querySelectorAll('[data-zap]').forEach(function (b) {
    b.onclick = function () {
      var txt = 'Olá, ' + b.dataset.nome.split(' ')[0] + '! Aqui é a Estação B12. ' +
        'Sobre a sua reserva ' + b.dataset.cod + ': qual horário você pretende voltar da Ilha hoje?';
      window.open('https://wa.me/' + b.dataset.zap + '?text=' + encodeURIComponent(txt), '_blank');
    };
  });
  raiz.querySelectorAll('[data-receber]').forEach(function (b) {
    b.onclick = function () { B12.formReceber(b.dataset.receber, function () { B12.admDesenhar('ilha'); }); };
  });
}


/* -------------------------------------------------------------- BALCÃO
   Quem chega sem reserva. Dois caminhos: atender agora (nasce ficha, viagem
   e código, e vai para a próxima saída) ou só guardar a ficha da pessoa. */
function pBalcao(raiz) {
  var hoje = B12.hoje();
  var deHoje = B12.DB.reservas.filter(function (r) {
    return r.origem === 'balcao' && (r.criada || '').slice(0, 10) === hoje; });
  var novos = B12.DB.clientes.filter(function (c) { return (c.criadoEm || '').slice(0, 10) === hoje; });

  raiz.appendChild(bloco(
    '<div class="cx entra"><h3>Chegou alguém sem reserva?</h3>' +
    '<p>Cadastre aqui. A ficha do cliente nasce, a viagem ganha código e a pessoa entra na ' +
    'próxima saída com lugar. A mensagem de confirmação sai pronta, com o link do app.</p>' +
    '<button type="button" class="btn pri" id="b-atender">Atender agora · cliente chegou</button>' +
    '<button type="button" class="btn sec" id="b-so-ficha">Só guardar a ficha da pessoa</button>' +
    '<div class="ajuda" style="margin-top:10px">A ficha já é o suficiente para ele voltar depois: ' +
    'na próxima viagem, o WhatsApp encontra a pessoa e o histórico continua.</div></div>' +

    '<div class="placar entra entra-1">' +
      tile(deHoje.length, 'Atendidos hoje', 'n', 'destaque') +
      tile(deHoje.reduce(function (s, r) { return s + (r.pax || 1); }, 0), 'Passageiros', 'n') +
      tile(novos.length, 'Fichas novas', 'n') +
    '</div>' +

    '<div class="faixa-sec"><div class="tit"><h2>Atendidos hoje no balcão</h2></div></div>' +
    (deHoje.length
      ? '<div class="pessoas">' + deHoje.map(function (r) {
          var zap = (r.zap || '').replace(/\D/g, '');
          return '<div class="pes"><div class="pes-cima"><div><b>' + esc(r.nome) + '</b>' +
            '<span class="pes-cod">' + r.cod + '</span></div>' +
            (zap ? '<div class="cons"><button type="button" class="con zap" data-bzap="' + zap +
              '" data-nome="' + esc(r.nome) + '" data-cod="' + r.cod + '" aria-label="WhatsApp">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8.9-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3z"/></svg></button></div>' : '') +
            '</div><div class="pes-baixo">' +
            '<span>' + (r.pax || 1) + (r.pax > 1 ? ' pessoas' : ' pessoa') + '</span>' +
            '<span>' + esc(r.destino || '') + '</span>' +
            (r.placa ? '<span>' + r.placa + '</span>' : '') +
            '<span>' + esc(r.situacao) + '</span></div></div>'; }).join('') + '</div>'
      : '<div class="cx" style="margin-top:0"><p>Ninguém atendido no balcão hoje.</p></div>')
  ));

  function re() { B12.admDesenhar('balcao'); }
  raiz.querySelector('#b-atender').onclick = function () {
    B12.formBalcao(function (res) { re(); B12.aposBalcao(res); });
  };
  raiz.querySelector('#b-so-ficha').onclick = function () {
    B12.formCliente(null, function () { re(); B12.aviso('Ficha guardada.', 'bom'); });
  };
  raiz.querySelectorAll('[data-bzap]').forEach(function (b) {
    b.onclick = function () {
      var txt = 'Olá, ' + b.dataset.nome.split(' ')[0] + '! Aqui é a Estação B12. ' +
        'Sua reserva é a ' + b.dataset.cod + '. Guarde este código.';
      window.open('https://wa.me/' + b.dataset.bzap + '?text=' + encodeURIComponent(txt), '_blank');
    };
  });
}

})();
