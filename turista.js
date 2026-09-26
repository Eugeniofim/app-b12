/* ============================================================================
   Estação B12 — cara do turista e painel da equipe
   ========================================================================== */
var B12 = window.B12 || {};

(function () {

/* ------------------------------------------------------------------- clima */
var CLIMA = null;
B12.buscarClima = function () {
  var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + B12.EMPRESA.lat +
    '&longitude=' + B12.EMPRESA.lon +
    '&current=temperature_2m,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max' +
    '&timezone=America%2FSao_Paulo&forecast_days=7';
  var ctrl = new AbortController(), corta = setTimeout(function () { ctrl.abort(); }, 12000);
  return fetch(u, { signal: ctrl.signal })
    .then(function (r) { return r.json(); })
    .then(function (d) { clearTimeout(corta); CLIMA = d; B12.pintarClima(); return d; })
    .catch(function () { clearTimeout(corta); B12.pintarClima(); });
};

B12.codTempo = function (c) {
  if (c === 0) return 'Céu limpo';
  if (c <= 2) return 'Parcialmente nublado';
  if (c === 3) return 'Nublado';
  if (c < 50) return 'Névoa';
  if (c < 60) return 'Garoa';
  if (c < 70) return 'Chuva';
  if (c < 80) return 'Chuva forte';
  if (c < 83) return 'Pancadas';
  return 'Tempestade';
};
function mar(vento) {
  if (vento < 12) return 'Calmo';
  if (vento < 22) return 'Leve';
  if (vento < 32) return 'Agitado';
  return 'Forte';
}
function forcaVento(v) { return v < 12 ? 'Fraco' : v < 22 ? 'Moderado' : v < 32 ? 'Forte' : 'Muito forte'; }

B12.pintarClima = function () {
  var g = document.getElementById('cl-grau'), c = document.getElementById('cl-cond');
  if (!g) return;
  if (!CLIMA || !CLIMA.current) {
    g.textContent = '—'; c.textContent = 'previsão indisponível';
    return;
  }
  var a = CLIMA.current;
  g.textContent = Math.round(a.temperature_2m) + '°';
  c.textContent = B12.codTempo(a.weather_code);
  document.getElementById('cl-mar').textContent = mar(a.wind_speed_10m);
  document.getElementById('cl-vento').textContent = forcaVento(a.wind_speed_10m);
};

B12.telaPrevisao = function () {
  var alvo = document.getElementById('lista-previsao');
  if (!CLIMA || !CLIMA.daily) {
    alvo.innerHTML = '<div class="vazio"><b>Sem previsão agora</b>' +
      '<p>Não conseguimos falar com o serviço de meteorologia. Tente de novo com internet.</p></div>';
    return;
  }
  var d = CLIMA.daily, dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  var h = '';
  for (var i = 0; i < d.time.length; i++) {
    var dt = new Date(d.time[i] + 'T12:00');
    var fds = dt.getDay() === 5 || dt.getDay() === 6 || dt.getDay() === 0;
    h += '<div class="linha entra entra-' + Math.min(i+1,6) + '">' +
      '<span class="tag"' + (fds ? ' style="background:#EDFBF9;color:#0B6E66"' : '') + '>' +
      (i === 0 ? 'HOJE' : dias[dt.getDay()].slice(0,3).toUpperCase()) + '</span>' +
      '<div class="d"><b>' + Math.round(d.temperature_2m_max[i]) + '° · ' +
      B12.codTempo(d.weather_code[i]) + '</b>' +
      '<small>mínima ' + Math.round(d.temperature_2m_min[i]) + '° · mar ' +
      mar(d.wind_speed_10m_max[i]).toLowerCase() + '</small></div></div>';
  }
  alvo.innerHTML = h;
};

/* -------------------------------------------------------------- passeios */
var SETA = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
function fotoTopo(foto, rotulo, titulo, sub, volta, alta) {
  return '<div class="foto-topo' + (alta ? ' alta' : '') + '" style="background-image:url(' + foto + ')">' +
    '<button class="volta-flutua" data-ir="' + volta + '" aria-label="Voltar">' + SETA + '</button>' +
    '<div class="foto-topo-txt"><span class="rotulo">' + rotulo + '</span>' +
    '<h1>' + titulo + '</h1><p>' + sub + '</p></div></div>';
}
function zapPasseio(p) {
  var l = ['Olá! Quero reservar um passeio com a Estação B12. 🚤', '',
    'Passeio: *' + p.nome + '*', 'Duração: ' + p.dur];
  if (B12.mostraPrecos()) l.push('A partir de: ' + B12.brl(p.preco) + ' por pessoa');
  l.push('', 'Data que eu quero: ___', 'Quantas pessoas: ___', '',
    'Pode me confirmar o valor e o horário?');
  return 'https://wa.me/' + B12.EMPRESA.whats + '?text=' + encodeURIComponent(l.join('\n'));
}
function creditosRodape() {
  return '<p class="creditos">Fotos ilustrativas até a B12 mandar as dela · ' +
    '<button type="button" data-creditos>créditos das fotos</button></p>';
}

/* o trilho da tela inicial e a lista da tela Passeios */
B12.pintarPasseios = function () {
  var trilho = document.getElementById('trilho-passeios');
  var PS = B12.passeios();
  if (trilho) trilho.innerHTML = PS.map(function (p, i) {
    return '<button class="cartao entra entra-' + Math.min(i+1,6) + '" data-passeio="' + p.id + '">' +
      '<div class="foto" style="background-image:url(' + p.foto + ')">' +
      '<span class="dur">' + p.dur + '</span></div>' +
      '<div class="in"><b>' + p.nome + '</b><small>' + p.resumo + '</small>' +
      '<div class="pr">' + (B12.mostraPrecos()
        ? 'a partir de <b>' + B12.brl(p.preco) + '</b>'
        : '<b>Conheça e reserve</b>') + '</div></div></button>';
  }).join('');

  var lista = document.getElementById('lista-passeios');
  if (lista) lista.innerHTML = PS.map(function (p, i) {
    return '<button class="pcard entra entra-' + Math.min(i+1,6) + '" data-passeio="' + p.id + '">' +
      '<div class="pcard-foto" style="background-image:url(' + p.foto + ')">' +
      '<span class="dur">' + p.dur + '</span></div>' +
      '<div class="pcard-in"><h3>' + p.nome + '</h3><p>' + p.resumo + '</p>' +
      '<div class="pcard-pe"><span>' + (B12.mostraPrecos()
        ? 'a partir de <b>' + B12.brl(p.preco) + '</b> por pessoa'
        : '<b>Valor sob consulta</b>') + '</span>' +
      '<span class="pcard-ver">Conheça e reserve ›</span></div></div></button>';
  }).join('') + creditosRodape();
};

/* a parte interna: o passeio inteiro, passo a passo */
B12.abrirPasseio = function (id) { B12.passeioAtual = id; B12.ir('passeio'); };
B12.pintarPasseio = function (id) {
  var p = B12.acharPasseio(id);
  var tela = document.getElementById('t-passeio');
  if (!p || !p.ativo) { tela.innerHTML = ''; return B12.ir('passeios'); }

  var passos = p.roteiro.map(function (r, i) {
    return '<li class="passo entra entra-' + Math.min(i+2,6) + '"><div class="passo-n">' + (i+1) + '</div>' +
      '<div class="passo-cx"><div class="passo-foto" style="background-image:url(' + r.foto + ')"></div>' +
      '<h3>' + r.t + '</h3><p>' + r.txt + '</p>' +
      (r.hist ? '<div class="historia"><b>Você sabia?</b><p>' + r.hist + '</p></div>' : '') +
      '</div></li>';
  }).join('');
  function lista(tit, itens) {
    return '<div><h4>' + tit + '</h4><ul>' + itens.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
  }

  tela.innerHTML =
    fotoTopo(p.foto, 'Passeio de barco · ' + p.dur, p.nome, p.resumo, 'passeios') +
    '<div class="chips-info entra entra-1">' +
      '<div class="chip-info"><small>Duração</small><b>' + p.dur + '</b><small class="sub">na lancha</small></div>' +
      (B12.mostraPrecos()
        ? '<div class="chip-info"><small>A partir de</small><b>' + B12.brl(p.preco) + '</b><small class="sub">' +
          (p.precoCrianca != null ? 'adulto · criança ' + B12.brl(p.precoCrianca) : 'por pessoa') + '</small></div>'
        : '<div class="chip-info"><small>Valor</small><b>Sob consulta</b><small class="sub">fale com a B12</small></div>') +
      '<div class="chip-info"><small>Saída</small><b>Pontal do Sul</b><small class="sub">trapiche da B12</small></div>' +
    '</div>' +
    '<div class="cx entra entra-2"><p class="lead">' + p.texto + '</p>' +
      '<p style="font-size:12.5px;color:var(--tinta-3);margin-top:8px">' + p.saida + '.</p>' +
      '<a class="btn zap" href="' + zapPasseio(p) + '" target="_blank" rel="noopener">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8.9-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3z"/></svg>' +
      'Reservar este passeio pelo WhatsApp</a></div>' +
    (p.roteiro.length ? '<div class="faixa-sec"><div class="tit"><h2>O roteiro, passo a passo</h2>' +
      '<span style="font-size:12px;color:var(--tinta-3)">' + p.roteiro.length + ' paradas</span></div></div>' +
    '<ol class="roteiro">' + passos + '</ol>' : '') +
    ((p.inclui.length || p.leve.length || p.saber.length) ? '<div class="faixa-sec"><div class="tit"><h2>Bom saber</h2></div></div>' +
    '<div class="cx saber" style="margin-top:0">' +
      (p.inclui.length ? lista('O que está incluído', p.inclui) : '') + (p.leve.length ? lista('O que levar', p.leve) : '') +
      (p.saber.length ? lista('Avisos', p.saber) : '') + '</div>' : '') +
    '<div class="cx" style="padding-top:12px">' +
      '<a class="btn zap" style="margin-top:0" href="' + zapPasseio(p) + '" target="_blank" rel="noopener">Reservar este passeio pelo WhatsApp</a>' +
      '<button type="button" class="btn sec" data-ir="passeios">Ver os outros passeios</button></div>' +
    creditosRodape();
  window.scrollTo({ top: 0, behavior: 'instant' });
};

/* ------------------------------------------------------------- a Ilha */
var IG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">' +
  '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.6"/>' +
  '<circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>';

/* ícones desenhados: nada de emoji, e cada um diz do que a linha trata */
var ICO_FAZER = {
  trilha:'<path d="M4 20h16"/><path d="M12 20 8 6l4 3 4-3-4 14z"/>',
  forte: '<path d="M4 20h16V10l-3 2V9l-2 2-3-3-3 3-2-2v3L4 10z"/><path d="M10 20v-4h4v4"/>',
  onda:  '<path d="M3 14c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2"/><path d="M3 9c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 3-2"/>',
  peixe: '<path d="M3 12c4-5 10-5 13 0-3 5-9 5-13 0z"/><path d="M16 12c2-2 4-3 5-3-1 2-1 4 0 6-1 0-3-1-5-3z"/><circle cx="8" cy="11.4" r=".9" fill="currentColor" stroke="none"/>',
  barco: '<path d="M4 17h16l-2.5 4h-11z"/><path d="M7 16V9h6l4 7"/><path d="M10 9V5h2"/>',
  gruta: '<path d="M4 20V13a8 8 0 0 1 16 0v7"/><path d="M10 20v-4a2 2 0 0 1 4 0v4"/>',
  sol:   '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  estrela:'<path d="m12 4 2.2 5.3 5.8.5-4.4 3.8 1.3 5.6L12 16.3 7.1 19.2l1.3-5.6L4 9.8l5.8-.5z"/>'
};
function icoFazer(k) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO_FAZER[k] || '') + '</svg>';
}

B12.pintarIlha = function () {
  var tela = document.getElementById('t-ilha');
  if (!tela || tela.dataset.pronta) return;
  tela.dataset.pronta = '1';

  function cartoesLugar(tipo) {
    return B12.LUGARES.filter(function (l) { return l.tipo === tipo; }).map(function (l, i) {
      return '<button class="lugar entra entra-' + Math.min(i+1,6) + '" data-lugar="' + l.id + '">' +
        '<div class="lugar-foto" style="background-image:url(' + l.foto + ')"><span class="vila">' + l.vila + '</span></div>' +
        '<div class="lugar-in"><b>' + l.nome + '</b><small>' + l.resumo + '</small></div></button>';
    }).join('');
  }
  function sec(titulo, extra) {
    return '<div class="faixa-sec"><div class="tit"><h2>' + titulo + '</h2>' +
      (extra ? '<span style="font-size:12px;color:var(--tinta-3)">' + extra + '</span>' : '') +
      '</div></div>';
  }
  /* o cartão com foto: serve para comer e para ficar, com @ quando houver */
  function faixa(itens) {
    return '<div class="faixa-fotos">' + itens.map(function (c) {
      var miolo = '<div class="fcard-in"><b>' + c.nome + '</b>' +
        (c.vila ? '<span class="vila-txt">' + c.vila + '</span>' : '') +
        '<small>' + c.txt + '</small>' +
        (c.insta ? '<span class="parc-ig">' + IG_SVG + '@' + c.insta + '</span>' : '') + '</div>';
      var corpo = '<div class="fcard-foto" style="background-image:url(' + c.foto + ')"></div>' + miolo;
      return c.insta
        ? '<a class="fcard" href="https://instagram.com/' + c.insta + '" target="_blank" rel="noopener">' + corpo + '</a>'
        : '<div class="fcard">' + corpo + '</div>';
    }).join('') + '</div>';
  }
  var parceiros = B12.PARCEIROS.map(function (p) {
    var miolo = p.nome + '<small>' + p.tipo + '</small>' +
      (p.insta ? '<span class="parc-ig">' + IG_SVG + '@' + p.insta + '</span>' : '');
    /* com @ o cartão vira link e abre o perfil; sem @, continua só um cartão */
    return p.insta
      ? '<a class="parc" href="https://instagram.com/' + p.insta + '" target="_blank" rel="noopener">' +
        miolo + '</a>'
      : '<div class="parc">' + miolo + '</div>';
  }).join('');

  tela.innerHTML =
    fotoTopo('fotos/ilha-heroi.jpg', 'Litoral do Paraná', 'Ilha do Mel',
      'O que fazer, praias, gastronomia, hospedagem e pontos turísticos', 'inicio', true) +

    '<div class="chips-info entra entra-1">' +
      '<div class="chip-info"><small>Vilas</small><b>2</b><small class="sub">Brasília e Encantadas</small></div>' +
      '<div class="chip-info"><small>Carros</small><b>0</b><small class="sub">só a pé ou de barco</small></div>' +
      '<div class="chip-info"><small>Visitantes</small><b>5 mil</b><small class="sub">limite por dia</small></div>' +
    '</div>' +

    '<div class="cx entra entra-1"><p class="lead">Dois morros de mata atlântica costurados por ' +
    'uma faixa de areia, no meio da baía de Paranaguá. Não entram carros, o número de visitantes ' +
    'é limitado por dia, e é exatamente por isso que ela continua assim. A B12 leva e traz você.</p></div>' +

    sec('O que fazer na Ilha') +
    '<div class="fazer">' + B12.FAZER.map(function (f, i) {
      return '<div class="fz entra entra-' + Math.min(i+1,6) + '">' +
        '<span class="fz-ico">' + icoFazer(f.ico) + '</span>' +
        '<div><b>' + f.nome + '</b><small>' + f.txt + '</small></div></div>';
    }).join('') + '</div>' +
    '<div style="padding:0 12px;margin-top:10px">' +
      '<button type="button" class="btn sec" style="margin-top:0" data-ir="passeios">' +
      'Ver os passeios de barco da B12</button></div>' +

    sec('Praias', 'toque para ver mais') +
    '<div class="lugares">' + cartoesLugar('praia') + '</div>' +

    sec('Pontos turísticos', 'toque para ver a história') +
    '<div class="lugares">' + cartoesLugar('atracao') + '</div>' +

    sec('As duas vilas') +
    '<div class="lugares">' + cartoesLugar('vila') + '</div>' +

    sec('Gastronomia') +
    faixa(B12.COMER) +
    '<div class="cx nota" style="margin-top:10px"><p>Casas de família, peixe do dia e mesa na areia. ' +
    'Fora da alta temporada, confirme o horário antes de subir a trilha.</p></div>' +

    sec('Onde ficar') + faixa(B12.FICAR) +
    '<div class="faixa-sec" style="padding-top:12px"><div class="parceiros">' + parceiros + '</div></div>' +

    sec('A travessia com a B12') +
    '<div class="cx foto-cx entra" style="margin-top:0">' +
      '<div class="foto-cx-foto" style="background-image:url(fotos/travessia.jpg)"></div>' +
      '<div class="foto-cx-in"><h3>Conheça nossas embarcações</h3>' +
      '<p>Embarcação nova, equipe experiente e atendimento personalizado. Segurança e pontualidade ' +
      'garantidas, com roteiros sob medida pela baía de Paranaguá.</p>' +
      '<button type="button" class="btn pri" data-ir="travessias">Reservar a travessia</button></div></div>' +

    sec('Antes de ir') +
    '<div class="dicas">' + B12.DICAS.map(function (d) {
      return '<details class="dica"><summary>' + d.q + '</summary><p>' + d.a + '</p></details>';
    }).join('') + '</div>' +

    sec('Como chegar') +
    '<div class="cx" style="margin-top:0"><p style="color:var(--tinta)">' + B12.EMPRESA.endereco + '</p>' +
      '<p style="font-size:12.5px;color:var(--tinta-3);margin-top:4px">Estacionamento na própria B12. A travessia sai do trapiche.</p>' +
      '<a class="btn sec" href="https://www.google.com/maps/search/?api=1&query=' + B12.EMPRESA.lat + '%2C' + B12.EMPRESA.lon + '" target="_blank" rel="noopener">Traçar rota</a></div>' +
    creditosRodape();
};

/* a ficha de um lugar: foto grande, história e como chegar */
B12.abrirLugar = function (id) {
  var l = null;
  B12.LUGARES.forEach(function (x) { if (x.id === id) l = x; });
  if (!l) return;
  B12.folha({
    titulo: l.nome, sub: l.vila,
    corpo: '<div class="ficha-foto" style="background-image:url(' + l.foto + ')"></div>' +
      '<p class="lead" style="margin-top:12px">' + l.texto + '</p>' +
      (l.hist ? '<div class="historia" style="margin:12px 0 0"><b>Um pouco de história</b><p>' + l.hist + '</p></div>' : '') +
      (l.foto2 ? '<div class="ficha-foto" style="margin-top:12px;background-image:url(' + l.foto2 + ')"></div>' : '') +
      '<div class="como"><b>Como chegar</b><p>' + l.como + '</p></div>',
    acao: l.passeio ? 'Ver o passeio de barco' : 'Fechar',
    aoSalvar: function () { return {}; },
    depois: function () { if (l.passeio) B12.abrirPasseio(l.passeio); }
  });
};

B12.abrirCreditos = function () {
  B12.folha({
    titulo: 'Créditos das fotos', sub: 'Wikimedia Commons · licenças livres',
    corpo: '<p style="font-size:13px;color:var(--tinta-2);margin-top:10px">As fotos dos lugares são ilustrativas e ' +
      'ficam no protótipo até a B12 mandar as dela. Cada uma leva o nome de quem fotografou e a licença.</p>' +
      '<table class="tabela" style="margin-top:10px">' + B12.CREDITOS.map(function (c) {
        return '<tr><td><b>' + c.a.replace('.jpg','') + '</b><div style="font-size:11.5px;color:var(--tinta-3)">' +
          c.autor + '</div></td><td class="n"><a href="' + c.url + '" target="_blank" rel="noopener" ' +
          'style="color:var(--turq-600);font-size:11.5px">' + c.lic + '</a></td></tr>'; }).join('') + '</table>',
    acao: 'Fechar', aoSalvar: function () { return {}; }
  });
};

/* cliques nos cartões desenhados aqui (delegados, valem para o que ainda vai ser desenhado) */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-passeio]');
  if (b) return B12.abrirPasseio(b.dataset.passeio);
  var l = e.target.closest('[data-lugar]');
  if (l) return B12.abrirLugar(l.dataset.lugar);
  if (e.target.closest('[data-creditos]')) return B12.abrirCreditos();
});

/* -------------------------------------------------------------- travessia */
var F = { pax:2, cri:0, idades:'', produto:'regular', estac:0 };

/* Lista montada por código não tem opção marcada no HTML, e o app a lia como
   "a pessoa mexeu aqui" — o que impede a troca de versão sozinha. Depois de
   montar, sela-se o estado atual como o padrão. A partir daí, só conta se ela
   mesma trocar. */
B12.selarListas = function () {
  document.querySelectorAll('select').forEach(function (s) {
    Array.prototype.forEach.call(s.options, function (o) { o.defaultSelected = o.selected; });
  });
};

B12.montarFaixas = function () {
  var sel = document.getElementById('f-hora'), T = B12.DB.ajustes.tabela, atual = sel.value;
  sel.innerHTML = ['dia','tarde','noite'].map(function (k) {
    return '<option value="' + k + '">Entre ' + T[k].de + ' e ' + T[k].ate + '</option>'; }).join('') +
    '<option value="fora">Outro horário (sob consulta)</option>';
  if (atual) sel.value = atual;
  var vc = document.getElementById('v-cortesia');
  if (vc) vc.textContent = B12.DB.ajustes.idadeCortesia;
  document.querySelectorAll('.v-cortesia').forEach(function (e) { e.textContent = B12.DB.ajustes.idadeCortesia; });
};
B12.montarFormulario = function () {
  var sel = document.getElementById('f-pousada');
  sel.innerHTML = '<option>Ainda não escolhi</option>' +
    B12.PARCEIROS.map(function (p) { return '<option>' + p.nome + '</option>'; }).join('') +
    '<option>Outra</option>';
  document.getElementById('f-destino').innerHTML =
    B12.DESTINOS.map(function (d) { return '<option>' + d + '</option>'; }).join('');
  B12.montarFaixas();
  var hoje = B12.hoje();
  var i = document.getElementById('f-ida');
  var primeira = B12.primeiraData();          /* a política da casa: 24 h de antecedência */
  i.value = primeira; i.defaultValue = primeira; i.min = primeira;
  document.getElementById('f-volta').min = primeira;
  ['f-ida','f-volta','f-hora','f-pag','f-pousada'].forEach(function (id) {
    document.getElementById(id).onchange = B12.calcular;
  });
  document.getElementById('b-pax-menos').onclick = function () { mexer('pax', -1); };
  document.getElementById('b-pax-mais').onclick  = function () { mexer('pax', 1); };
  var idc = document.getElementById('f-idades');
  if (idc) idc.oninput = function () {
    F.cri = B12.contarCortesia(idc.value);
    F.idades = idc.value.trim();
    var aj = document.getElementById('ajuda-idades');
    if (aj) {
      var todas = B12.idadesLista(idc.value);
      aj.innerHTML = todas.length
        ? todas.length + (todas.length > 1 ? ' crianças' : ' criança') + ' · ' +
          (F.cri ? F.cri + (F.cri > 1 ? ' não pagam' : ' não paga') : 'todas pagam') +
          ' (cortesia até ' + B12.DB.ajustes.idadeCortesia + ' anos)'
        : 'Crianças até <span class="v-cortesia">' + B12.DB.ajustes.idadeCortesia + '</span> anos não pagam.';
    }
    B12.calcular();
  };
  document.getElementById('est-nao').onclick = function () { F.estac = 0; B12.calcular(); };
  document.getElementById('est-sim').onclick = function () { F.estac = 1; B12.calcular(); };
  document.getElementById('b-reservar').onclick = B12.reservar;
  B12.calcular();
  B12.selarListas();
};
function mexer(campo, d) {
  if (campo === 'pax') { F.pax = Math.max(1, Math.min(30, F.pax + d)); if (F.cri > F.pax) F.cri = F.pax; }
  else { F.cri = Math.max(0, Math.min(F.pax, F.cri + d)); }   /* não é mais usado pela tela */
  document.getElementById('v-pax').textContent = F.pax;

  B12.calcular();
}

B12.calcular = function () {
  var faixa = document.getElementById('f-hora').value;
  var ida = document.getElementById('f-ida').value, volta = document.getElementById('f-volta').value;
  var dd = B12.diarias(ida, volta), pg = document.getElementById('f-pag').value;

  function cotar(prod) {
    return B12.preco({ produto:prod, pax:F.pax, criancas:F.cri, faixa:faixa,
      diarias: F.estac ? dd : 0, pg:pg });
  }
  F.produto = 'regular';                    /* a B12 opera um serviço só: táxi náutico */
  var reg = cotar('regular');
  var t = faixa === 'fora' ? null : B12.DB.ajustes.tabela[faixa];
  var mostra = B12.mostraPrecos();          /* enquanto desligado, o valor se combina no WhatsApp */
  function valor(p) { return !mostra ? 'sob consulta' : (p ? B12.brl(p.travessia) : 'consultar'); }

  document.getElementById('escolhas-produto').innerHTML =
    servico('Táxi Náutico',
      'lancha, ida e volta' + (t ? ' · ' + t.de + ' às ' + t.ate : '') +
      (mostra ? '<br>por pessoa, ida e volta' : '<br><span class="pend">valor combinado pelo WhatsApp</span>'),
      valor(reg));

  var p = cotar(F.produto);
  document.getElementById('est-txt').textContent = dd + (dd > 1 ? ' diárias' : ' diária') +
    (mostra ? ' de ' + B12.brl(B12.DB.ajustes.diaria) : '');
  document.getElementById('est-val').textContent = mostra ? B12.brl(B12.DB.ajustes.diaria * dd) : 'sob consulta';
  document.getElementById('est-sim').classList.toggle('on', !!F.estac);
  document.getElementById('est-nao').classList.toggle('on', !F.estac);
  var bp = document.getElementById('bloco-placa'); if (bp) bp.hidden = !F.estac;
  var bpag = document.getElementById('bloco-pagamento');
  if (bpag) bpag.hidden = !mostra;          /* sem preço na tela, escolher pagamento não faz sentido */

  var nome = 'Táxi náutico';
  document.getElementById('c-desc').textContent = nome + ' · ' + F.pax +
    (F.pax > 1 ? ' pessoas' : ' pessoa') + ' · ida e volta';
  var tit = document.getElementById('c-titulo');
  if (tit) tit.textContent = mostra ? 'Sua conta' : 'Resumo da sua viagem';
  var rot = document.getElementById('c-total-rot');
  if (rot) rot.textContent = mostra ? 'Total' : 'Valor';
  document.getElementById('c-trav').textContent = (mostra && p) ? B12.brl(p.travessia) : 'sob consulta';
  document.getElementById('c-lin-est').style.display = F.estac ? 'flex' : 'none';
  document.getElementById('c-est-desc').textContent = 'Estacionamento · ' + dd +
    (dd > 1 ? ' diárias' : ' diária');
  document.getElementById('c-est').textContent = mostra ? B12.brl(p ? p.estacionamento : 0) : 'sob consulta';
  document.getElementById('c-lin-desc').style.display = (mostra && p && p.desconto) ? 'flex' : 'none';
  document.getElementById('c-desc-val').textContent = '− ' + B12.brl(p ? p.desconto : 0);
  document.getElementById('c-total').textContent = (mostra && p) ? B12.brl(p.total) : 'a combinar';
  var cri = F.cri
    ? F.cri + (F.cri > 1 ? ' crianças' : ' criança') + ' até ' + B12.DB.ajustes.idadeCortesia + ' anos sem cobrança. '
    : 'Crianças até ' + B12.DB.ajustes.idadeCortesia + ' anos não pagam. ';
  document.getElementById('c-obs').innerHTML = !mostra
    ? 'Ida e volta, por trajeto. ' + cri + '<b>O valor é confirmado pela B12 no WhatsApp</b>, ' +
      'junto com o horário. Você paga na saída, não agora.'
    : (p ? 'Ida e volta, por trajeto. ' + cri + 'Valores da tabela do material da B12.'
         : 'Horário especial é sob consulta antecipada. Fale com a B12 pelo WhatsApp.');
};
function servico(titulo, sub, valor) {
  /* serviço único: mostra como cartão marcado, sem virar botão que não faz nada */
  return '<div class="escolha on fixo">' +
    '<div><b>' + titulo + '</b><small>' + sub + '</small></div>' +
    '<span class="vv">' + valor + '</span></div>';
}

function erroReserva(msg, campo) {
  var e = document.getElementById('f-erro');
  if (!msg) { e.hidden = true; return; }
  e.setAttribute('role', 'alert');                     /* o leitor de tela lê na hora */
  e.textContent = msg; e.hidden = false;
  e.scrollIntoView({ block: 'center', behavior: 'smooth' });
  var c = campo && document.getElementById(campo);     /* leva a pessoa ao que falta */
  if (c) setTimeout(function () { try { c.focus({ preventScroll: true }); } catch (x) {} }, 320);
  var b = document.getElementById('b-reservar');
  if (b && b.dataset.ocupado) { delete b.dataset.ocupado; b.removeAttribute('aria-busy'); b.disabled = false;
    b.innerHTML = 'Pedir minha reserva'; }
  return { erro: msg };
}
B12.reservar = function () {
  var botao = document.getElementById('b-reservar');
  if (botao && botao.dataset.ocupado) return;              /* um toque, um pedido */
  var soltar = B12.ocupar(botao, 'Pedindo…');
  var nome = document.getElementById('f-nome').value.trim();
  var zap  = document.getElementById('f-zap').value.trim();
  var ida  = document.getElementById('f-ida').value;
  var volta = document.getElementById('f-volta').value;
  var termos = document.getElementById('f-termos').checked;
  erroReserva('');
  if (!nome || !zap) return erroReserva('Precisamos do seu nome e do WhatsApp para confirmar a reserva.', nome ? 'f-zap' : 'f-nome');
  if (zap.replace(/\D/g, '').length < 10) return erroReserva('O WhatsApp parece incompleto. Use o DDD junto.', 'f-zap');
  if (!ida) return erroReserva('Escolha a data de chegada.', 'f-ida');
  if (!termos) return erroReserva('Para reservar, marque que leu e aceita os termos de uso.', 'f-termos');
  var faixa = document.getElementById('f-hora').value;
  var dd = B12.diarias(ida, volta);
  var p = B12.preco({ produto:F.produto, pax:F.pax, criancas:F.cri, faixa:faixa,
    diarias: F.estac ? dd : 0, pg: document.getElementById('f-pag').value });
  var t = faixa === 'fora' ? null : B12.DB.ajustes.tabela[faixa];

  var agora = new Date().toISOString();
  var r = B12.novaReserva({
    nome:nome, zap:zap, pax:F.pax, criancas:F.cri, idades:F.idades || '', ida:ida, volta:volta,
    email: document.getElementById('f-email').value.trim(),
    instagram: document.getElementById('f-insta').value.trim(),
    aceitaOfertas: document.getElementById('f-ofertas').checked,
    aceites: { termos: agora, ofertas: document.getElementById('f-ofertas').checked ? agora : null, versao: 'termos-v1' },
    destino: document.getElementById('f-destino').value,
    pousada: document.getElementById('f-pousada').value,
    produto: F.produto === 'nautico' ? 'Serviço Náutico Premium' : 'Táxi Náutico',
    faixa: t ? t.de + ' às ' + t.ate : 'sob consulta',
    estacionamento: F.estac ? dd : 0,
    placa: F.estac ? document.getElementById('f-placa').value : '',
    pg: document.getElementById('f-pag').selectedOptions[0].textContent,
    total: (B12.mostraPrecos() && p) ? p.total : null
  });

  var linhas = ['Olá! Quero reservar uma travessia com a B12.', '',
    'Código: ' + r.cod, 'Nome: ' + r.nome,
    'Pessoas: ' + r.pax + (r.idades ? ' (crianças: ' + r.idades + ')' : ''),
    'Chegada: ' + B12.dataBR(r.ida)];
  if (r.volta) linhas.push('Retorno: ' + B12.dataBR(r.volta));
  linhas.push('Horário: ' + r.faixa, 'Destino: ' + r.destino, 'Pousada: ' + r.pousada,
    'Serviço: ' + r.produto);
  if (r.estacionamento) linhas.push('Estacionamento: sim, ' + r.estacionamento + ' diária(s)' +
    (r.placa ? ' · placa ' + r.placa : ''));
  linhas.push('Pagamento: ' + r.pg,
    'Total estimado: ' + (r.total != null ? B12.brl(r.total) : 'sob consulta'));

  var zapUrl = 'https://wa.me/' + B12.EMPRESA.whats + '?text=' + encodeURIComponent(linhas.join('\n'));
  var aba = window.open(zapUrl, '_blank');
  B12.ir('reservas');
  /* o iPhone bloqueia aba nova com frequência: se bloqueou, o aviso dá o botão */
  if (!aba || aba.closed) {
    B12.aviso('Reserva ' + r.cod + ' criada. Falta avisar a B12.', 'bom',
      { texto: 'Abrir WhatsApp', aoTocar: function () { location.href = zapUrl; } });
  } else {
    B12.aviso('Pronto! Sua reserva é a ' + r.cod + '. Guarde este código.', 'bom');
  }
  soltar();
};

/* --------------------------------------------------------------- reservas */
/* Só o que ESTA pessoa pediu neste aparelho. As reservas dos outros passageiros
   ficam no painel da B12, nunca aqui. */
B12.pintarReservas = function () {
  var alvo = document.getElementById('area-reservas');
  var R = B12.minhasReservas();
  if (!R.length) {
    alvo.innerHTML = '<div class="vazio">' +
      '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="18" rx="2"/>' +
      '<path d="M8 2v4M16 2v4M8 12h8M8 17h5" stroke-linecap="round"/></svg>' +
      '<b>Nenhuma reserva ainda</b>' +
      '<p>Quando você pedir uma travessia, ela aparece aqui com o código para mostrar na chegada.</p>' +
      '<div style="padding:0 22px"><button class="btn pri" id="b-ir-reservar">' +
      'Reservar travessia</button>' +
      '<button class="btn sec" id="b-recuperar">Já tenho um código</button></div></div>';
    alvo.querySelector('#b-ir-reservar').onclick = function () { B12.ir('travessias'); };
    alvo.querySelector('#b-recuperar').onclick = function () {
      B12.formRecuperar(function () { B12.pintarReservas(); }); };
    return;
  }
  var hoje = B12.hoje();
  alvo.innerHTML = '<div class="lista">' + R.map(function (r, i) {
    var sit = B12.situacaoTxt(r);
    var cor = r.saidaVoltaId ? 'dentro' : r.situacao === 'confirmada' ? 'dentro' : 'inv';
    return '<div class="cx entra entra-' + Math.min(i+1,6) + '" style="margin:0 0 10px">' +
      '<button class="ticket-abre" data-ticket="' + r.id + '">' +
      '<div class="ticket-cod"><span>CÓDIGO</span><b>' + r.cod.replace('B12-','') + '</b></div>' +
      '<div style="flex:1;min-width:0;text-align:left"><b style="font-size:14.5px">' + r.produto + '</b>' +
      '<div style="font-size:12px;color:var(--tinta-3);margin-top:3px">' + r.destino + ' · ' +
      B12.dataBR(r.ida) + (r.volta ? ' a ' + B12.dataBR(r.volta) : '') + '</div>' +
      '<div style="font-size:12px;color:var(--tinta-3)">' + r.pax + (r.pax > 1 ? ' pessoas' : ' pessoa') +
      ' · ' + (r.total != null ? B12.brl(r.total) : 'sob consulta') +
      (r.placa ? ' · carro ' + r.placa : '') + '</div>' +
      '<span class="pilula ' + cor + '" style="margin-top:7px;display:inline-block">' + sit + '</span></div>' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" style="opacity:.4;flex:none"><path d="M9 6l6 6-6 6"/></svg></button>' +
      (r.situacao === 'pedida' ?
        '<div class="ticket-nota">Seu pedido foi enviado pelo WhatsApp. <b>A confirmação chega por lá.</b> ' +
        'A vaga só é garantida depois que a B12 confirmar.</div>' : '') +
      (r.volta === hoje || (r.situacao === 'confirmada' && !r.saidaVoltaId && r.volta) ?
        horariosVolta(r) : '') +
      '</div>';
  }).join('') + '</div>';
  alvo.querySelectorAll('[data-ticket]').forEach(function (b) {
    b.onclick = function () { B12.abrirTicket(b.dataset.ticket); };
  });
  alvo.querySelectorAll('[data-volta]').forEach(function (b) {
    b.onclick = function () {
      var res = B12.marcarVolta(b.dataset.res, b.dataset.volta);
      if (res.erro) { B12.aviso(res.erro, 'ruim'); b.disabled = true; return; }
      B12.pintarReservas();
      B12.aviso('Volta marcada para as ' + res.saida.hora + '. Avise a B12 abaixo.', 'bom');
      /* avisa a B12 do horário escolhido, com o texto pronto */
      B12.folhaMensagem('voltaEscolhida', { nome: res.reserva.nome, whats: B12.EMPRESA.whats,
        cod: res.reserva.cod, hora: res.saida.hora, pax: res.reserva.pax });
    };
  });
};
function horariosVolta(r) {
  var dia = r.volta || B12.hoje();
  var v = B12.saidasDoDia(dia, 'volta');
  if (!v.length) return '<div class="ticket-nota">A B12 ainda não abriu os horários de volta de ' +
    B12.dataBR(dia) + '. Assim que abrir, eles aparecem aqui.</div>';
  return '<div style="margin-top:11px;padding-top:11px;border-top:1px solid var(--risco)">' +
    '<b style="font-size:13px">' + (r.saidaVoltaId ? 'Sua volta está marcada. Quer trocar?' :
      (dia === B12.hoje() ? 'Hoje é seu dia de volta. ' : 'Volta em ' + B12.dataBR(dia) + '. ') +
      'Escolha o horário:') + '</b>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px">' +
    v.map(function (s) {
      var ocup = B12.DB.reservas.filter(function (x) { return x.saidaVoltaId === s.id && x.id !== r.id; })
        .reduce(function (t, x) { return t + (x.pax || 1); }, 0);
      var cheio = ocup + (r.pax || 1) > s.vagas, minha = r.saidaVoltaId === s.id;
      return '<button class="hora-volta' + (minha ? ' on' : '') + '" data-res="' + r.id +
        '" data-volta="' + s.id + '"' + (cheio && !minha ? ' disabled' : '') + '>' + s.hora +
        (minha ? ' ✓' : cheio ? ' · lotado' : '') + '</button>';
    }).join('') + '</div></div>';
}

/* o ticket: o que a pessoa mostra na chegada */
B12.abrirTicket = function (id) {
  var r = B12.reservaPorId(id); if (!r) return;
  var f = document.createElement('div'); f.className = 'folha';
  f.innerHTML = '<div class="folha-fundo"></div><div class="folha-cx">' +
    '<div class="folha-alca"></div>' +
    '<div class="folha-topo"><div><h3>Seu ticket</h3><p>Mostre este código na chegada</p></div>' +
    '<button type="button" class="folha-x" aria-label="Fechar">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
    '<div class="folha-corpo">' +
    '<div class="ticket-grande"><span class="ticket-marca">' + (B12.LOGO || '') + '</span>' +
    '<small>TRAVESSIA</small><b>' + r.cod + '</b>' +
    '<i>' + B12.situacaoTxt(r) + '</i></div>' +
    '<table class="tabela" style="margin-top:14px">' +
    '<tr><td>Nome</td><td class="n">' + r.nome + '</td></tr>' +
    '<tr><td>Serviço</td><td class="n">' + r.produto + '</td></tr>' +
    '<tr><td>Destino</td><td class="n">' + r.destino + '</td></tr>' +
    '<tr><td>Ida</td><td class="n">' + B12.dataBR(r.ida) + ' · ' + r.faixa + '</td></tr>' +
    (r.volta ? '<tr><td>Volta</td><td class="n">' + B12.dataBR(r.volta) + '</td></tr>' : '') +
    '<tr><td>Pessoas</td><td class="n">' + r.pax + (r.criancas ? ' (' + r.criancas + ' até 5 anos)' : '') + '</td></tr>' +
    (r.pousada && r.pousada !== 'Ainda não escolhi' ? '<tr><td>Pousada</td><td class="n">' + r.pousada + '</td></tr>' : '') +
    (r.placa ? '<tr><td>Carro</td><td class="n">' + r.placa + ' · ' + r.estacionamento + ' diária(s)</td></tr>' : '') +
    '<tr><td>Pagamento</td><td class="n">' + r.pg + '</td></tr>' +
    '<tr><td style="font-weight:750">Total</td><td class="n" style="font-size:16px">' +
    (r.total != null ? B12.brl(r.total) : 'sob consulta') + '</td></tr></table>' +
    '<p class="ajuda" style="margin-top:12px">Chegue 20 minutos antes. Av. Beira-Mar, 3433, Pontal do Paraná.</p>' +
    '</div><div class="folha-pe">' +
    '<a class="btn zap" style="margin:0" href="https://wa.me/' + B12.EMPRESA.whats + '?text=' +
    encodeURIComponent('Olá! Sobre a minha reserva ' + r.cod + ' (' + r.nome + ').') +
    '" target="_blank" rel="noopener">Falar com a B12 sobre esta reserva</a></div></div>';
  document.body.appendChild(f); document.body.style.overflow = 'hidden';
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('.folha-x').onclick = fechar; f.querySelector('.folha-fundo').onclick = fechar;
};

/* ------------------------------------------------------------------ equipe */

/* quem está na Ilha, na tela do marinheiro. Sem número de dinheiro: só nome,
   quantos, quando volta e o botão do WhatsApp. É o que ele precisa no trapiche. */
function naIlhaEquipe() {
  var d = B12.naIlha();
  if (!d.agora.length && !d.semVolta.length) return '';
  function cartao(p) {
    var falta = !p.horaVolta;
    return '<div class="pes-eq' + (falta ? ' alerta' : '') + '">' +
      '<div class="pes-eq-cima"><div><b>' + p.nome + '</b>' +
      '<small>' + p.cod + ' · ' + p.pessoas + (p.pessoas > 1 ? ' pessoas' : ' pessoa') +
      (p.pousada ? ' · ' + p.pousada : '') + '</small></div>' +
      (p.contato.whats ? '<button type="button" class="con zap" data-eqzap="' + p.contato.whats +
        '" data-nome="' + p.nome.split(' ')[0] + '" data-cod="' + p.cod + '" aria-label="WhatsApp de ' + p.nome + '">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8.9-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3z"/></svg></button>' : '') +
      '</div>' +
      '<div class="pes-eq-baixo">' + (p.horaVolta
        ? '<span class="vai">volta às ' + p.horaVolta + '</span>'
        : '<span class="pend">precisa marcar a volta</span>') +
        (p.placa ? '<span>' + p.placa + '</span>' : '') + '</div></div>';
  }
  return '<div class="faixa-sec"><div class="tit"><h2>Quem está na Ilha</h2>' +
    '<span style="font-size:12px;color:var(--tinta-3)">' +
    d.agora.reduce(function (s, p) { return s + p.pessoas; }, 0) + ' pessoas</span></div></div>' +
    (d.semVolta.length ? '<div class="cx aviso" style="margin-top:0"><h3>' + d.semVolta.length +
      ' sem horário de volta</h3><p>Toque no WhatsApp e pergunte. No fim do dia ninguém pode ficar lá.</p></div>' : '') +
    '<div class="pessoas-eq">' + d.agora.map(cartao).join('') + '</div>';
}

B12.pintarEquipe = function () {
  var alvo = document.getElementById('area-equipe');
  if (B12.ligarLupa) B12.ligarLupa('-eq');     /* a lupa do balcão, por código */
  var hoje = B12.hoje();
  var idas = B12.saidasDoDia(hoje, 'ida'), voltas = B12.saidasDoDia(hoje, 'volta');
  var pax = idas.reduce(function (s, x) { return s + x.ocupadas; }, 0);
  alvo.innerHTML =
    '<div style="padding:12px 12px 0"><button class="btn pri" style="margin:0" id="b-balcao">' +
    '+ Cliente chegou agora</button></div>' +
    '<div class="cx nota entra"><h3>Painel da equipe</h3>' +
    '<p>Quem opera vê o dia, os passageiros e o contato. <b>Não vê nada de dinheiro</b> — ' +
    'isso é trava no banco, não é só tela escondida.</p></div>' +
    '<div class="grade2 entra entra-1" style="margin:12px">' +
    '<div class="cx" style="margin:0"><div style="font-size:10px;letter-spacing:.08em;' +
    'text-transform:uppercase;color:var(--tinta-3);font-weight:700">Saídas hoje</div>' +
    '<div style="font-size:24px;font-weight:750;margin-top:4px">' + idas.length + '</div></div>' +
    '<div class="cx" style="margin:0"><div style="font-size:10px;letter-spacing:.08em;' +
    'text-transform:uppercase;color:var(--tinta-3);font-weight:700">Passageiros</div>' +
    '<div style="font-size:24px;font-weight:750;margin-top:4px">' + pax + '</div></div></div>' +
    naIlhaEquipe() +
    '<div class="faixa-sec"><div class="tit"><h2>Saídas de hoje</h2></div></div>' +
    '<div class="lista">' + idas.map(function (s, i) {
      var c = s.ocupadas / s.vagas;
      return '<div class="linha entra entra-' + Math.min(i+1,6) + '">' +
        '<span class="tag">' + s.hora + '</span><div class="d"><b>' + s.destino + '</b>' +
        '<small>' + s.marinheiro + ' · ' + s.ocupadas + ' de ' + s.vagas + ' lugares</small>' +
        '<div class="medidor" style="margin-top:6px;background:var(--risco)">' +
        '<i style="width:' + (c*100).toFixed(0) + '%"></i></div></div></div>';
    }).join('') + '</div>' +
    '<div class="faixa-sec"><div class="tit"><h2>Horários de retorno</h2></div>' +
    '<p style="font-size:12.5px;color:var(--tinta-3);padding-bottom:8px">É esta lista que ' +
    'aparece no app do turista no dia da volta.</p></div>' +
    '<div class="lista">' + voltas.map(function (s) {
      return '<div class="linha"><span class="tag">' + s.hora + '</span>' +
        '<div class="d"><b>Retorno para Pontal do Sul</b>' +
        '<small>' + s.ocupadas + ' de ' + s.vagas + ' lugares reservados</small></div></div>';
    }).join('') + '</div>';
  var b = document.getElementById('b-balcao');
  if (b) b.onclick = function () { B12.formBalcao(function (res) { B12.pintarEquipe(); B12.aposBalcao(res); }); };
  alvo.querySelectorAll('[data-eqzap]').forEach(function (x) {
    x.onclick = function () {
      var txt = 'Olá, ' + x.dataset.nome + '! Aqui é a Estação B12. Sobre a sua reserva ' +
        x.dataset.cod + ': qual horário você pretende voltar da Ilha hoje?';
      window.open('https://wa.me/' + x.dataset.eqzap + '?text=' + encodeURIComponent(txt), '_blank');
    };
  });
};


/* ================================================================= CLUBE B12
   A tela de pontos de quem viaja. Mostra o saldo, a faixa, o que cada faixa dá
   e o extrato. O presente de boas-vindas entra por instalar o app.
   Enquanto a nuvem não está ligada, este saldo é o deste aparelho — a tela diz
   isso em português, sem enrolar. */
B12.pintarPontos = function () {
  var tela = document.getElementById('t-pontos');
  if (!tela) return;
  var d = B12.meusPontos(), E = B12.EMPRESA;

  /* enquanto o Dhalsin não abrir o clube, o cliente vê a promessa, não o saldo */
  if (!d.ligada || !d.publico) {
    var jaEstou = !!(B12.meuCadastro && B12.meuCadastro());
    tela.innerHTML =
      fotoTopo('fotos/ilha-heroi.jpg', 'Clube B12', 'Em breve',
        'O clube de fidelidade da Estação B12 está chegando', 'inicio') +
      '<div class="cx entra"><h3>Quanto mais você navega, mais volta para você</h3>' +
      '<p class="lead" style="margin-top:8px">Estamos preparando o clube de fidelidade da B12: ' +
      'cada travessia, cada passeio e cada diária vão virar pontos, e os pontos viram ' +
      'desconto e brinde.</p>' +
      '<p style="margin-top:10px">Quem já está cadastrado entra na primeira turma, ' +
      'e a B12 avisa por aqui quando começar.</p></div>' +
      (jaEstou
        ? '<div class="cx aviso entra entra-1"><h3>Você já está na lista</h3>' +
          '<p>Seu cadastro está feito. É só continuar viajando com a gente.</p>' +
          '<button class="btn pri" data-ir="travessias">Reservar uma travessia</button></div>'
        : '<div class="cx aviso entra entra-1"><h3>Garanta seu lugar</h3>' +
          '<p>Faça seu cadastro agora, em quinze segundos, e entre na lista do clube.</p>' +
          '<button class="btn pri" id="b-clube-cadastro">Cadastre-se</button></div>') +
      '<div class="cx nota"><h3>Enquanto isso</h3><p>Dúvida sobre horário, valor ou ' +
      'estacionamento? Fale com a B12 no WhatsApp — a gente responde rápido.</p>' +
      '<a class="btn sec" style="margin-top:12px" target="_blank" rel="noopener" href="https://wa.me/' +
      B12.EMPRESA.whats + '?text=' + encodeURIComponent('Olá! Quero saber do Clube B12.') +
      '">Falar com a B12</a></div>';
    var bc = tela.querySelector('#b-clube-cadastro');
    if (bc) bc.onclick = function () { B12.formCadastro(); };
    return;
  }

  function faixaCard(f, i) {
    var atual = f.nome === d.faixa.nome;
    var alcancada = d.pontos >= f.de;
    return '<div class="nivel' + (atual ? ' on' : '') + (alcancada ? ' feita' : '') + '">' +
      '<div class="nivel-cab"><b>' + f.nome + '</b>' +
        '<span>' + (f.de === 0 ? 'de cara' : 'a partir de ' + f.de + ' pts') + '</span></div>' +
      (f.mimo ? '<p>' + f.mimo + '</p>' : '') +
      (atual ? '<span class="nivel-tag">você está aqui</span>' : '') + '</div>';
  }

  tela.innerHTML =
    fotoTopo('fotos/ilha-heroi.jpg', 'Clube B12', 'Seus pontos',
      'Quanto mais você navega com a gente, mais volta para você', 'inicio') +

    '<div class="cx saldo entra">' +
      '<span class="saldo-faixa">' + d.faixa.nome + '</span>' +
      '<div class="saldo-n">' + d.pontos + '<small>' + (d.pontos === 1 ? 'ponto' : 'pontos') + '</small></div>' +
      (d.proxima
        ? '<div class="saldo-barra"><i style="width:' + Math.round(d.andado * 100) + '%"></i></div>' +
          '<p>Faltam <b>' + d.faltam + '</b> ponto' + (d.faltam === 1 ? '' : 's') +
          ' para <b>' + d.proxima.nome + '</b>.</p>'
        : '<p>Você está na faixa mais alta do clube. Obrigado por navegar com a gente.</p>') +
      (d.faixa.mimo ? '<div class="saldo-mimo">' + d.faixa.mimo + '</div>' : '') +
    '</div>' +

    (!d.instalado
      ? '<div class="cx aviso entra entra-1"><h3>Ganhe ' + d.bonusInstalacao +
        ' pontos agora</h3><p>Instale o app da B12 na tela de início do seu celular e os pontos ' +
        'entram na hora. Depois é só viajar: cada ' + B12.brl(d.reaisPorPonto) +
        ' que você gasta com a gente vale 1 ponto.</p>' +
        '<button class="btn pri" id="b-pontos-instalar">Como instalar</button></div>'
      : '') +

    '<div class="faixa-sec"><div class="tit"><h2>As faixas do clube</h2></div></div>' +
    '<div class="niveis">' + d.faixas.map(faixaCard).join('') + '</div>' +

    '<div class="faixa-sec"><div class="tit"><h2>Como você ganha</h2></div></div>' +
    '<div class="cx" style="margin-top:0">' +
      '<div class="ganha"><b>' + d.bonusInstalacao + ' pts</b>' +
        '<span>instalando o app da B12 no celular</span></div>' +
      '<div class="ganha"><b>1 pt</b>' +
        '<span>a cada ' + B12.brl(d.reaisPorPonto) + ' gastos em travessia, passeio ou estacionamento</span></div>' +
      '<div class="ganha"><b>+</b>' +
        '<span>os pontos entram quando você paga, na saída</span></div>' +
    '</div>' +

    '<div class="faixa-sec"><div class="tit"><h2>Seu extrato</h2></div></div>' +
    (d.linhas.length
      ? '<div class="lista">' + d.linhas.map(function (l) {
          return '<div class="linha"><div class="d"><b>' + l.o_que + '</b>' +
            '<small>' + (l.quando ? B12.dataBR(l.quando) : '') +
            (l.nota ? ' · ' + l.nota : '') + '</small></div>' +
            '<div class="v' + (l.pontos ? '' : ' fraco') + '">' +
            (l.pontos ? '+' + l.pontos : '—') + '</div></div>';
        }).join('') + '</div>'
      : '<div class="cx" style="margin-top:0"><p>Ainda não há lançamentos. ' +
        'Sua primeira travessia já começa a contar.</p></div>') +

    '<div class="cx nota"><h3>Como o saldo é confirmado</h3>' +
    '<p>Este é o saldo deste aparelho. Quem confirma o número final é a B12, no balcão, ' +
    'com o seu nome e o código da sua reserva. Na dúvida, chame a gente no WhatsApp ' +
    'que conferimos junto.</p>' +
    '<a class="btn sec" style="margin-top:12px" target="_blank" rel="noopener" href="https://wa.me/' +
    E.whats + '?text=' + encodeURIComponent('Olá! Quero conferir meus pontos no Clube B12.') +
    '">Conferir com a B12</a></div>' +

    '<p class="rodape">Os pontos não têm valor em dinheiro e não são trocados por troco. ' +
    'As faixas e os benefícios podem mudar; a B12 avisa pelo app.</p>';

  var bi = tela.querySelector('#b-pontos-instalar');
  if (bi) bi.onclick = function () { B12.ensinarInstalar(); };
};

})();
