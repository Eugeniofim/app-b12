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
      s.appendChild(el('rect', { x:x, y:T, width:w, height:ph, fill:C.aten, opacity:.14, rx:2 }));
    } else {
      var ra = el('rect', { x:x, y:y(d.a), width:w, height:Math.max(ph-(y(d.a)-T),1),
        fill:d.cor || C.turq, rx:2 });
      s.appendChild(ra);
      if (d.b) s.appendChild(el('rect', { x:x, y:y(d.a+d.b), width:w,
        height:Math.max(y(d.a)-y(d.a+d.b),0), fill:C.azul, rx:2 }));
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
    s.appendChild(arco);
    setTimeout(function(){ arco.style.transition='opacity .4s'; arco.setAttribute('opacity',1); }, 60+i*80);
    ang = fim;
  });
  s.appendChild(el('circle',{ cx:cx, cy:cy, r:r*0.58, fill:'#0C2637' }));
  alvo.appendChild(s);
}

/* ============================================================== os painéis */
var ABAS = [
  ['hoje','Hoje'], ['painel','Painel'], ['caixa','Caixa'], ['lanc','Lançamentos'],
  ['contas','Contas'], ['relat','Relatórios'], ['oper','Operação'],
  ['prosp','Prospecção'], ['intel','Inteligência']
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
     relat:pRelat, oper:pOper, prosp:pProsp, intel:pIntel }[abaAtual] || pHoje)(raiz);
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
  var lista = document.createElement('div'); lista.className = 'lista entra entra-2';
  lista.innerHTML = L.length ? L.map(function (l) {
    return '<div class="linha"><span class="tag">' + B12.dataBR(l.data).slice(0,5) + '</span>' +
      '<div class="d"><b>' + l.desc + '</b><small>' + l.cat + ' · ' + l.centro + ' · ' + l.pg +
      '</small></div><span class="v ' + (l.tipo==='entrada'?'ent':'sai') + '">' +
      (l.tipo==='entrada'?'+':'−') + ' ' + B12.brl(l.valor) + '</span></div>';
  }).join('') : '<div class="vazio"><b>Nada lançado ainda</b><p>Os lançamentos do mês aparecem aqui.</p></div>';
  raiz.appendChild(lista);
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

})();
