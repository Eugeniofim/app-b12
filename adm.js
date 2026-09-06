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
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
  ['hoje','Hoje'], ['escala','Escala'], ['painel','Painel'], ['gestao','Gestão'],
  ['caixa','Caixa'], ['lanc','Lançamentos'],
  ['clientes','Clientes'], ['patio','Pátio'], ['manut','Manutenção'],
  ['contas','Contas'], ['relat','Relatórios'], ['oper','Operação'],
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
  raiz.innerHTML = '';
  ({ hoje:pHoje, painel:pPainel, caixa:pCaixa, lanc:pLanc, contas:pContas,
     relat:pRelat, oper:pOper, prosp:pProsp, intel:pIntel,
     clientes:pClientes, patio:pPatio, manut:pManut, gestao:pGestao,
     escala:pEscala, msgs:pMsgs }[abaAtual] || pHoje)(raiz);
  B12.animarPlacar(raiz);
  raiz.scrollIntoView({ block:'nearest' });
};

function bloco(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }

/* ------------------------------------------------------------------- HOJE */
function pHoje(raiz) {
  var hoje = B12.hoje(), r = B12.resumoDia(hoje), mes = B12.resumoMes(B12.mesAtual());
  var venc = B12.contasVencidas(), prox = B12.contasProximas(7);
  raiz.appendChild(bloco(
    '<div class="placar entra">' +
    tile(r.faturamento,'Faturamento','brl','destaque') +
    tile(r.travessias,'Travessias','n') +
    tile(r.pax,'Passageiros','n') +
    tile(r.passeios,'Passeios','n') +
    tile(r.combustivel,'Combustível','brl') +
    tile(r.resultado,'Resultado','brl','destaque') +
    '</div>' +
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
  var g = document.createElement('div'); g.className = 'cx entra entra-4';
  g.innerHTML = '<h3>Últimos 14 dias <span class="selo-demo">demonstração</span></h3>';
  raiz.appendChild(g);
  var serie = [];
  for (var i = 13; i >= 0; i--) {
    var d = B12.diaMais(hoje, -i), rr = B12.resumoDia(d);
    serie.push({ a: rr.faturamento, rot: (i%3===0? d.slice(8) : ''), destaque: i===0 });
  }
  grafBarras(g, serie, { altura:150 });
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
    '<div class="cx nota entra entra-3"><h3>Como a notificação chega</h3>' +
    '<p>Pelo app instalado na tela de início, que funciona em Android e em iPhone. Quem não ' +
    'instalou recebe por e-mail. O disparo na quinta e na sexta é um relógio no servidor, ' +
    'não depende de ninguém apertar botão.</p></div>'
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
var buscaCli = '';
function pClientes(raiz) {
  var todos = B12.DB.clientes, achados = B12.buscarClientes(buscaCli);
  var comZap = todos.filter(function (c) { return c.whats; }).length;
  var comOfertas = todos.filter(function (c) { return c.aceitaOfertas; }).length;
  var comInsta = todos.filter(function (c) { return c.instagram; }).length;

  raiz.appendChild(bloco(
    '<div class="placar entra">' +
      tile(todos.length,'Clientes','n','destaque') +
      tile(comZap,'Com WhatsApp','n') +
      tile(comOfertas,'Aceitam ofertas','n') +
      tile(comInsta,'Com Instagram','n') +
      tile(todos.reduce(function(s,c){return s+(c.viagens||0);},0),'Viagens','n') +
      tile(todos.reduce(function(s,c){return s+(c.gasto||0);},0),'Já gastaram','brl','destaque') +
    '</div>'
  ));
  var b = bloco('<div class="busca">' +
    '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4" stroke-linecap="round"/></svg>' +
    '<input id="q-cli" placeholder="buscar por nome, WhatsApp, e-mail ou pousada" value="' +
    buscaCli.replace(/"/g,'&quot;') + '"></div>' +
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
  b.querySelector('#b-novo-cli').onclick = function () {
    B12.formCliente(null, function () { B12.admDesenhar('clientes'); }); };

  var lista = document.createElement('div'); lista.className = 'lista';
  lista.innerHTML = achados.length ? achados.map(function (c) {
    var h = B12.histCliente(c.id);
    return '<div class="linha toca" data-cli="' + c.id + '">' +
      '<span class="tag">' + (c.nome[0] || '?').toUpperCase() + '</span>' +
      '<div class="d"><b>' + c.nome + (c.aceitaOfertas ?
        ' <span class="pilula dentro">ofertas ok</span>' : '') + '</b>' +
      '<small>' + [c.whats ? fmtZap(c.whats) : null, c.email || null,
        c.instagram ? '@' + c.instagram : null, c.cpf ? 'CPF ok' : null].filter(Boolean).join(' · ') +
      (c.pousada ? '<br>' + c.pousada : '') +
      (c.origem === 'app' ? ' <span class="pilula dentro">pelo app</span>' : '') + '</small></div>' +
      '<div style="text-align:right"><div class="v">' + B12.brl(h.gasto) + '</div>' +
      '<small style="font-size:10.5px;color:var(--gelo-3)">' + h.viagens +
      (h.viagens === 1 ? ' viagem' : ' viagens') + '</small></div></div>';
  }).join('') : '<div class="vazio">' +
    '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
    '<b>' + (buscaCli ? 'Ninguém com esse nome' : 'Nenhum cliente ainda') + '</b>' +
    '<p>' + (buscaCli ? 'Tente outra busca.' :
      'Cada pessoa que chega vira uma ficha aqui, com contato e histórico de quanto gastou.') + '</p></div>';
  raiz.appendChild(lista);
  lista.querySelectorAll('[data-cli]').forEach(function (li) {
    li.onclick = function () {
      var c = B12.DB.clientes.filter(function(x){ return x.id === li.dataset.cli; })[0];
      B12.formCliente(c, function () { B12.admDesenhar('clientes'); });
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
      B12.f_campo('Lugares', 'vagas', { tipo:'number', modo:'numeric', valor:12, passo:'1' }) +
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
}

})();
