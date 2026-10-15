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

/* --------------------------------------------------------------------- mar
   Mesma casa da previsão do tempo, API de mar, de graça e sem chave. Serve a
   duas coisas: a tela do surfista e o aviso que o Dhalsin manda. */
var MAR = null;
B12.buscarMar = function () {
  var u = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + B12.EMPRESA.lat +
    '&longitude=' + B12.EMPRESA.lon +
    /* `current` é o que o cartão da primeira tela mostra: a onda DESTA hora.
       O `daily` traz o máximo do dia, que serve para a semana e para o surf —
       misturar os dois foi o que fez o app discordar do Windy. */
    '&current=wave_height,wave_period,wave_direction' +
    '&daily=wave_height_max,wave_period_max,wave_direction_dominant' +
    '&timezone=America%2FSao_Paulo&forecast_days=7';
  var ctrl = new AbortController(), corta = setTimeout(function () { ctrl.abort(); }, 12000);
  return fetch(u, { signal: ctrl.signal })
    .then(function (r) { return r.json(); })
    .then(function (d) { clearTimeout(corta); MAR = d; return d; })
    .catch(function () { clearTimeout(corta); return null; });
};
/* a onda desta hora */
B12.marAgora = function () {
  if (!MAR || !MAR.current) return null;
  return { altura: MAR.current.wave_height, periodo: MAR.current.wave_period,
           direcao: MAR.current.wave_direction };
};
/* a onda máxima de um dia, por data — para a lista dos 7 dias */
B12.marDoDia = function (iso) {
  if (!MAR || !MAR.daily || !MAR.daily.time) return null;
  var i = MAR.daily.time.indexOf(iso);
  return i < 0 ? null : MAR.daily.wave_height_max[i];
};

B12.mar7 = function () {
  if (!MAR || !MAR.daily) return null;
  var d = MAR.daily;
  return d.time.map(function (t, i) {
    return { dia: t, altura: d.wave_height_max[i], periodo: d.wave_period_max[i],
             direcao: d.wave_direction_dominant[i], nota: B12.notaSurf(d.wave_height_max[i], d.wave_period_max[i]) };
  });
};
/* Leitura de surfista, em palavra. Altura sozinha não diz nada: onda de 1 m com
   período de 11 s é surfável; a mesma altura com 5 s é mexida sem forma. */
B12.notaSurf = function (alt, per) {
  if (alt == null) return { txt:'sem dado', bom:false };
  if (alt < 0.4) return { txt:'Flat', bom:false };
  if (per >= 9 && alt >= 0.8) return { txt:'Clássico', bom:true };
  if (per >= 8 && alt >= 0.6) return { txt:'Surfável', bom:true };
  if (alt >= 1.6) return { txt:'Grande e mexido', bom:false };
  if (per < 7) return { txt:'Mexido', bom:false };
  return { txt:'Pequeno', bom:false };
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
/* =================================================== ESTADO DO MAR E VENTO
   15/10/2026. O Eugênio notou que o Windy mostrava uma coisa e o app outra.
   Fui medir e o defeito era nosso: o app dizia "Mar: Calmo" olhando o VENTO
   local, não a ONDA — que a gente já buscava e só usava na tela de surf.

   Por que isso é grave num app de travessia: marulho de 2 metros chega de um
   ciclone a mil quilômetros daqui, com vento fraco na praia. Pelo vento, o
   app diria "calmo"; o mar estaria grosso.

   Agora o mar sai da altura da onda, na escala DOUGLAS, e o vento na escala
   BEAUFORT — que são as escalas que a Marinha usa nos avisos. Quando o aviso
   dela diz "MAR GROSSO" ou "VENTO FORÇA 7", o app está falando a mesma
   língua, e não uma invenção nossa. */
function estadoDoMar(m) {
  if (m == null) return '—';
  if (m < 0.1)  return 'Espelhado';
  if (m < 0.5)  return 'Calmo';
  if (m < 1.25) return 'Leve';
  if (m < 2.5)  return 'Moderado';
  if (m < 4)    return 'Grosso';
  if (m < 6)    return 'Muito grosso';
  return 'Tempestuoso';
}
/* Beaufort a partir de km/h, com o número — é por ele que o aviso da Marinha
   fala ("VENTO E/NE FORÇA 7 COM RAJADAS"). */
function forcaBeaufort(kmh) {
  var lim = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  for (var i = 0; i < lim.length; i++) if (kmh < lim[i]) return i;
  return 12;
}
function forcaVento(v) {
  var b = forcaBeaufort(v);
  return b <= 1 ? 'Calmo' : b <= 3 ? 'Fraco' : b <= 4 ? 'Moderado'
       : b <= 5 ? 'Fresco' : b <= 7 ? 'Forte' : b <= 9 ? 'Muito forte' : 'Temporal';
}
B12.estadoDoMar = estadoDoMar;
B12.forcaVento = forcaVento;
B12.forcaBeaufort = forcaBeaufort;

/* o mar pelo vento continua existindo SÓ para o caso de a previsão de onda
   não responder — e aí a tela diz que é estimativa, não finge que mediu */
function marPeloVento(vento) {
  if (vento < 12) return 'Calmo';
  if (vento < 22) return 'Leve';
  if (vento < 32) return 'Agitado';
  return 'Forte';
}

/* o mar de um dia da lista: onda de verdade quando existe, e só então o
   vento como plano B — sempre dizendo qual dos dois está na tela */
function marDoDia(iso, ventoMax) {
  /* sem o prefixo "mar": quem chama já escreveu a palavra. Pôr de novo aqui
     deu "mar mar leve" na tela. */
  var h = B12.marDoDia(iso);
  if (h != null) return estadoDoMar(h).toLowerCase() + ' · ' +
    h.toFixed(1).replace('.', ',') + ' m';
  return marPeloVento(ventoMax).toLowerCase() + ' (pelo vento)';
}

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
  /* o número vai junto da palavra: é com ele que dá para conferir no Windy
     ou em qualquer outro app, em vez de discutir adjetivo */
  var elMar = document.getElementById('cl-mar');
  var onda = B12.ondaAgora();
  if (onda != null) {
    elMar.textContent = estadoDoMar(onda) + ' · ' + onda.toFixed(1).replace('.', ',') + ' m';
    elMar.title = 'Altura da onda prevista agora';
  } else {
    elMar.textContent = marPeloVento(a.wind_speed_10m) + ' (pelo vento)';
    elMar.title = 'A previsão de onda não respondeu; esta é uma estimativa pelo vento';
  }
  document.getElementById('cl-vento').textContent =
    forcaVento(a.wind_speed_10m) + ' · ' + Math.round(a.wind_speed_10m) + ' km/h';
};

/* a onda desta hora, se a previsão de mar já chegou */
B12.ondaAgora = function () {
  var m = B12.marAgora && B12.marAgora();
  return (m && m.altura != null) ? m.altura : null;
};

/* cada arquivo tem o seu: adm.js e assistente.js fecham o escopo e os deles
   nao chegam aqui. Texto que o Dhalsin digita entra em HTML, entao escapa. */
function escT(x) {
  return String(x == null ? '' : x)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------ quem somos
   O texto é do Dhalsin: sai de Estação → A empresa, nunca daqui. Enquanto
   ele não escrever o dele, o rascunho aparece com aviso só para o painel. */
B12.telaSobre = function () {
  var S = (B12.DB.ajustes && B12.DB.ajustes.sobre) || B12.SOBRE;
  var E = B12.EMPRESA;
  var t = document.getElementById('sobre-tit');
  if (t) t.textContent = S.titulo || 'Quem somos';
  /* Missao e visao sao listas de frases curtas. Marcador discreto, nunca
     numero: numero diz "ordem", e aqui nenhuma frase vem antes da outra. */
  function listaFrases(titulo, arr) {
    if (!arr || !arr.length) return '';
    return '<div class="cx entra entra-2"><h3>' + titulo + '</h3>' +
      '<ul class="frases">' + arr.map(function (f) {
        return '<li>' + escT(f) + '</li>'; }).join('') + '</ul></div>';
  }
  document.getElementById('sobre-corpo').innerHTML =
    '<div class="cx entra" style="margin-top:12px">' +
      '<p style="color:var(--tinta-2);line-height:1.6">' + escT(S.texto) + '</p></div>' +
    ((S.pontos || []).length
      ? '<div class="lista entra entra-1">' + S.pontos.map(function (x, i) {
          return '<div class="linha"><span class="tag">' + (i + 1) + '</span>' +
            '<div class="d"><b>' + escT(x.t) + '</b><small>' + escT(x.d) + '</small></div></div>';
        }).join('') + '</div>'
      : '') +
    listaFrases('Nossa missão', S.missao) +
    listaFrases('Nossa visão', S.visao) +
    '<div class="cx entra entra-2"><h3>Onde estamos</h3>' +
      '<p style="color:var(--tinta-2)">' + escT(E.endereco) + '<br>CEP ' + escT(E.cep) + '</p>' +
      '<button type="button" class="btn pri" data-como-chegar>Como chegar até a B12</button></div>';
};

/* --------------------------------------------------- convite para o aviso
   Até 12/10/2026 só o painel chamava B12.avLigar(). Ou seja: o app sabia
   mandar aviso e ninguém do lado de fora podia assinar — o push tinha
   público zero por construção.

   Este cartão é a porta do turista. Regras:
   - some quando o aparelho não sabe receber, quando a pessoa já ligou, e
     quando ela já disse não (volta em 30 dias);
   - no iPhone, aviso só existe com o app instalado na tela de início: lá o
     cartão troca de texto e manda instalar primeiro, em vez de prometer uma
     coisa que não vai acontecer. */
var CHAVE_ADIAR = 'b12_aviso_depois';

B12.conviteAviso = function () {
  var cx = document.getElementById('avisar-convite');
  if (!cx || !B12.avEstado) return;
  var e = B12.avEstado();

  var quando = 0;
  try { quando = +localStorage.getItem(CHAVE_ADIAR) || 0; } catch (err) {}
  if (quando && Date.now() < quando) { cx.hidden = true; return; }

  /* já ligado, navegador sem suporte, bloqueado no aparelho ou nuvem fora:
     não existe cartão nenhum a mostrar */
  if (e.ligado || e.negado || e.semNuvem || (!e.pode && !e.precisaInstalar)) {
    cx.hidden = true; return;
  }

  var sub = document.getElementById('avisar-sub');
  var bt = document.getElementById('avisar-btn');
  if (e.precisaInstalar) {
    /* o convite de instalar, logo acima, já ensina o caminho */
    if (!B12.avInstalado()) { cx.hidden = true; return; }
  }
  if (sub) sub.textContent = 'Previsão do fim de semana, ondas boas para surfar e ' +
    'novidade na Ilha — direto no seu celular.';
  if (bt) bt.textContent = 'Quero';
  cx.hidden = false;
};

B12.ligarConviteAviso = function () {
  var bt = document.getElementById('avisar-btn');
  var x = document.getElementById('avisar-x');
  if (!bt || bt.dataset.ligado) return;
  bt.dataset.ligado = '1';

  bt.onclick = function () {
    bt.disabled = true; bt.textContent = '…';
    B12.avLigar({ papel: 'turista' }).then(function (r) {
      bt.disabled = false; bt.textContent = 'Quero';
      if (r && r.erro) return B12.aviso(r.erro, 'ruim');
      document.getElementById('avisar-convite').hidden = true;
      B12.aviso('Pronto. A gente avisa quando tiver novidade.', 'bom');
    }).catch(function () {
      bt.disabled = false; bt.textContent = 'Quero';
      B12.aviso('Não consegui ligar agora. Tente de novo com internet.', 'ruim');
    });
  };
  if (x) x.onclick = function () {
    try { localStorage.setItem(CHAVE_ADIAR, Date.now() + 30 * 86400000); } catch (err) {}
    document.getElementById('avisar-convite').hidden = true;
  };
};

/* ------------------------------------------------------------ avaliações
   A B12 tem 4,9 com 242 avaliações no Google e isso não aparecia em lugar
   nenhum do app — era a prova social mais forte que existe, atrás de um link
   que levava a pessoa embora.

   O app NÃO puxa as avaliações do Google sozinho: para isso seria preciso a
   Places API (chave do Google Cloud, cobrança por consulta, e ela devolve no
   máximo cinco avaliações, escolhidas por eles). Então a nota e o total são
   um número que o Dhalsin confere no painel, e os depoimentos são os que ele
   escolhe do próprio perfil. Quem quiser ver tudo, vai pelo botão. */
B12.telaAvaliacoes = function () {
  var S = (B12.DB.ajustes && B12.DB.ajustes.sobre) || B12.SOBRE;
  var G = S.google || { nota: 0, total: 0, destaques: [] };
  var destaques = G.destaques || [];

  function estrelas(n) {
    var cheias = Math.round(Number(n) || 0), out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<svg class="estrela' + (i <= cheias ? ' on' : '') + '" viewBox="0 0 24 24" ' +
        'aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8' +
        'L3.5 9.7l5.9-.9z"/></svg>';
    }
    return out;
  }

  document.getElementById('aval-corpo').innerHTML =
    '<div class="cx nota-google entra" style="margin-top:12px">' +
      '<div class="ng-num">' + String(G.nota || '—').replace('.', ',') + '</div>' +
      '<div class="ng-lado">' +
        '<div class="ng-estrelas">' + estrelas(G.nota) + '</div>' +
        '<div class="ng-txt">' + (G.total || 0) + ' avaliações no Google</div>' +
      '</div></div>' +

    (destaques.length
      ? '<div class="faixa-sec"><div class="tit"><h2>O que escreveram</h2></div></div>' +
        '<div class="depoimentos">' + destaques.map(function (d, i) {
          return '<div class="depo entra entra-' + Math.min(i + 1, 6) + '">' +
            '<div class="depo-estrelas">' + estrelas(d.nota || 5) + '</div>' +
            '<p>' + escT(d.texto) + '</p>' +
            '<div class="depo-quem">' + escT(d.nome) +
            (d.quando ? ' · ' + escT(d.quando) : '') + '</div></div>';
        }).join('') + '</div>'
      : '<div class="cx entra entra-1"><h3>As avaliações estão no Google</h3>' +
        '<p>Toque no botão abaixo para ler todas, uma a uma, direto no perfil da Estação B12.</p></div>') +

    '<div class="cx entra entra-2">' +
      '<a class="btn pri" href="' + B12.googleVer() + '" target="_blank" rel="noopener">' +
      'Ver todas no Google</a>' +
      '<a class="btn sec" href="' + B12.googleAvaliar() + '" target="_blank" rel="noopener">' +
      'Avaliar a B12</a>' +
      '<p class="ajuda" style="margin-top:10px">Se você já atravessou com a gente, uma ' +
      'avaliação ajuda muito — é assim que outra família encontra a B12.</p></div>';
};

/* a nota aparece no botão da primeira tela: 4,9 convence antes do toque */
B12.pintarNotaGoogle = function () {
  var S = (B12.DB.ajustes && B12.DB.ajustes.sobre) || B12.SOBRE;
  var G = S.google || {};
  var n = document.getElementById('onde-nota');
  if (n) n.textContent = G.nota ? ' · ' + String(G.nota).replace('.', ',') + ' ★' : '';
  var a = document.getElementById('onde-avaliar');
  if (a) a.href = B12.googleAvaliar();
};

/* ---------------------------------------------------------------- ondas
   Para quem surfa. A B12 não vende surf, mas quem surfa atravessa — e o
   turista que sabe que vai pegar onda boa reserva a travessia. */
B12.telaOndas = function () {
  var alvo = document.getElementById('lista-ondas');
  var dados = B12.mar7 && B12.mar7();
  if (!dados) {
    alvo.innerHTML = '<div class="vazio"><b>Sem a previsão do mar agora</b>' +
      '<p>Não conseguimos falar com o serviço de meteorologia. Tente de novo com internet.</p></div>';
    if (B12.buscarMar) B12.buscarMar().then(function (d) { if (d) B12.telaOndas(); });
    return;
  }
  var hoje = B12.hoje();
  var dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  var bons = dados.filter(function (d) { return d.nota.bom; });
  var maxAlt = Math.max.apply(null, dados.map(function (d) { return d.altura || 0; })) || 1;

  alvo.innerHTML =
    (bons.length
      ? '<div class="cx bom" style="margin:12px"><h3>Tem dia bom na semana</h3><p>' +
        bons.map(function (d) {
          return '<b>' + (d.dia === hoje ? 'hoje' : B12.dataBR(d.dia).slice(0, 5)) + '</b> · ' +
            d.nota.txt.toLowerCase(); }).join(' · ') + '</p></div>'
      : '<div class="cx" style="margin:12px"><h3>Semana fraca para o surf</h3>' +
        '<p>Nenhum dia com formação boa nos próximos sete. A travessia segue normal.</p></div>') +
    '<div class="lista">' + dados.map(function (d, i) {
      var dt = new Date(d.dia + 'T12:00');
      var fds = dt.getDay() === 5 || dt.getDay() === 6 || dt.getDay() === 0;
      var larg = Math.max(6, Math.round((d.altura || 0) / maxAlt * 100));
      return '<div class="linha entra entra-' + Math.min(i + 1, 6) +
        (i === 0 ? ' dia-hoje' : fds ? ' dia-fds' : '') + '">' +
        '<span class="tag">' + (i === 0 ? 'HOJE' : dias[dt.getDay()].slice(0, 3).toUpperCase()) + '</span>' +
        '<div class="d"><b>' + (d.altura != null ? d.altura.toFixed(1).replace('.', ',') + ' m' : '—') +
        ' · ' + d.nota.txt + '</b>' +
        '<small>período ' + (d.periodo != null ? Math.round(d.periodo) + ' s' : '—') +
        ' · ' + B12.rumo(d.direcao) + '</small>' +
        '<div class="medidor" style="margin-top:6px"><i style="width:' + larg + '%"' +
        (d.nota.bom ? ' class="bom"' : '') + '></i></div></div></div>';
    }).join('') + '</div>' + B12.fonteDoTempo();
};

/* De onde a onda vem, em palavra. Grau sozinho não serve para ninguém. */
B12.rumo = function (g) {
  if (g == null) return 'sem direção';
  var r = ['norte','nordeste','leste','sudeste','sul','sudoeste','oeste','noroeste'];
  return r[Math.round(((g % 360) / 45)) % 8];
};

B12.telaPrevisao = function () {
  var alvo = document.getElementById('lista-previsao');
  if (!CLIMA || !CLIMA.daily) {
    alvo.innerHTML = '<div class="vazio"><b>Sem previsão agora</b>' +
      '<p>Não conseguimos falar com o serviço de meteorologia. Tente de novo com internet.</p></div>';
    return;
  }
  var d = CLIMA.daily, dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  var h = '', fdsAntes = false;
  for (var i = 0; i < d.time.length; i++) {
    var dt = new Date(d.time[i] + 'T12:00');
    var fds = dt.getDay() === 5 || dt.getDay() === 6 || dt.getDay() === 0;
    /* o selo só no primeiro dia da sequência: dizer "fim de semana" três vezes
       seguidas vira ruído e o olho para de ler */
    var abreFds = fds && !fdsAntes;
    fdsAntes = fds;
    h += '<div class="linha entra entra-' + Math.min(i+1,6) +
      (i === 0 ? ' dia-hoje' : fds ? ' dia-fds' : '') + '">' +
      '<span class="tag">' +
      (i === 0 ? 'HOJE' : dias[dt.getDay()].slice(0,3).toUpperCase()) + '</span>' +
      '<div class="d"><b>' + Math.round(d.temperature_2m_max[i]) + '° · ' +
      B12.codTempo(d.weather_code[i]) + '</b>' +
      '<small>mínima ' + Math.round(d.temperature_2m_min[i]) + '° · mar ' +
      marDoDia(d.time[i], d.wind_speed_10m_max[i]) + '</small></div>' +
      (abreFds ? '<span class="selo-fds">fim de semana</span>' : '') + '</div>';
  }
  alvo.innerHTML = B12.cartaoMarinha() + h + B12.fonteDoTempo();
  /* chega depois? redesenha só esta tela, sem mexer no resto */
  B12.buscarMarinha().then(function (d) {
    if (d && alvo.innerHTML.indexOf('Marinha emitiu') < 0 &&
        alvo.innerHTML.indexOf('Confira o aviso') < 0) {
      alvo.innerHTML = B12.cartaoMarinha() + h + B12.fonteDoTempo();
    }
  });
};

/* ------------------------------------------------ o aviso da Marinha
   15/10/2026. O Dhalsin usa Windy e MarineTraffic no celular. Mas quem
   MANDA no mar é o Centro de Hidrografia da Marinha: é ele que emite o
   aviso de mau tempo da METAREA V, que cobre a costa do Paraná.

   O CHM não tem API — é um site, atrás de Cloudflare. Quem lê é a função
   `marinha` no servidor, que separa aviso por aviso e decide se a área
   alcança a coordenada da B12. Daqui a gente só pergunta e mostra.

   O app NUNCA diz que dá para sair. Ele mostra o que a Marinha publicou e
   o link do original. Quem decide é o comandante. */
var MARINHA = null, marinhaEm = 0;
B12.buscarMarinha = function () {
  if (!B12.NUVEM || !B12.NUVEM.url) return Promise.resolve(null);
  /* uma consulta por hora basta: o CHM publica algumas vezes ao dia, e
     bater no site da Marinha a cada abertura de app seria falta de educação */
  if (MARINHA && Date.now() - marinhaEm < 3600000) return Promise.resolve(MARINHA);
  var ctrl = new AbortController();
  var corta = setTimeout(function () { ctrl.abort(); }, 20000);
  return fetch(B12.NUVEM.url + '/functions/v1/marinha', {
    signal: ctrl.signal,
    headers: { apikey: B12.NUVEM.chave, Authorization: 'Bearer ' + B12.NUVEM.chave }
  }).then(function (r) { return r.json(); })
    .then(function (d) {
      clearTimeout(corta);
      if (d && d.ok) { MARINHA = d; marinhaEm = Date.now(); }
      return MARINHA;
    })
    .catch(function () { clearTimeout(corta); return null; });
};

/* O cartão só existe quando existe aviso. Sem aviso, nada na tela: um
   "nenhum aviso" permanente vira ruído e some da vista justo no dia em
   que virar aviso de verdade. */
B12.cartaoMarinha = function (dados) {
  /* o argumento existe para dar para TESTAR o desenho sem depender de a
     Marinha estar com aviso no ar hoje */
  var d = dados || MARINHA;
  if (!d || !d.ok) return '';
  var n = (d.aqui || []).length, dv = (d.duvida || []).length;
  if (!n && !dv) return '';
  var cx = '';
  if (n) {
    cx = '<div class="cx ruim entra" style="margin:12px"><h3>' +
      (n === 1 ? 'A Marinha emitiu um aviso para esta costa'
               : 'A Marinha emitiu ' + n + ' avisos para esta costa') + '</h3>' +
      (d.aqui || []).map(function (a) {
        return '<p style="margin-top:8px"><b>' + escT(a.tipo) + '</b><br>' +
          '<span style="font-size:12.5px">' + escT(a.texto) + '</span></p>';
      }).join('') +
      '<a class="btn sec" href="' + d.fonte + '" target="_blank" rel="noopener" ' +
      'style="margin-top:10px">Ler no site da Marinha</a></div>';
  } else {
    /* o leitor não entendeu algum aviso: ISSO SE DIZ. Calar seria o mesmo
       que afirmar que está tudo bem sem ter conferido. */
    cx = '<div class="cx aviso entra" style="margin:12px"><h3>Confira o aviso da Marinha</h3>' +
      '<p>Há ' + dv + (dv === 1 ? ' aviso publicado que o app não' : ' avisos publicados que o app não') +
      ' conseguiu interpretar. Antes de sair, leia no site oficial.</p>' +
      '<a class="btn sec" href="' + d.fonte + '" target="_blank" rel="noopener">' +
      'Abrir os avisos de mau tempo</a></div>';
  }
  return cx;
};

/* ---------------------------------------------------------- de onde vem
   15/10/2026. A previsão não sai de um site de previsão: sai dos MODELOS
   oficiais — ECMWF (centro europeu), ICON (serviço alemão), GFS (serviço
   americano) — servidos pelo Open-Meteo, que escolhe o de maior resolução
   para a coordenada da B12. É a mesma origem que o Windy desenha nos mapas
   dele; o Windy é visualizador, não fonte.

   Dizer isso na tela não é enfeite: os dados são CC BY 4.0, e a licença
   OBRIGA a creditar. Era uma falha nossa, e é o tipo de coisa que só
   aparece quando alguém pergunta de onde vêm os números.

   O link do Windy fica junto porque, para OLHAR o mapa — a frente chegando,
   o vento girando —, ele é melhor que qualquer tela que a gente faça. */
B12.fonteDoTempo = function () {
  var E = B12.EMPRESA;
  return '<p class="fonte-tempo">Previsão dos modelos ECMWF, ICON e GFS, pelo ' +
    '<a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> ' +
    '(CC BY 4.0). Para ver no mapa: ' +
    '<a href="https://www.windy.com/' + E.lat + '/' + E.lon +
    '?' + E.lat + ',' + E.lon + ',11" target="_blank" rel="noopener">abrir no Windy</a>.<br>' +
    '<b>Para navegar, vale o aviso da Marinha</b> — ' +
    '<a href="https://www.marinha.mil.br/chm/dados-do-smm-avisos-de-mau-tempo/avisos-de-mau-tempo" ' +
    'target="_blank" rel="noopener">avisos de mau tempo do CHM</a>.</p>';
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
      /* `pos` existe porque foto de casa tem assunto fora do centro: sem isso
         o corte pega o telhado e as folhas, e a casa fica escondida */
      var corpo = '<div class="fcard-foto" style="background-image:url(' + c.foto + ')' +
        (c.pos ? ';background-position:' + c.pos : '') + '"></div>' + miolo;
      return c.insta
        ? '<a class="fcard" href="https://instagram.com/' + c.insta + '" target="_blank" rel="noopener">' + corpo + '</a>'
        : '<div class="fcard">' + corpo + '</div>';
    }).join('') + '</div>';
  }
  /* Os restaurantes que o Dhalsin indica, cadastrados em Estação → A empresa.
     Cartão sem foto de propósito: foto genérica de prato não é daquela casa,
     e o que vale ali é o nome, onde fica e o @ para a pessoa ir ver. */
  function gastronomia() {
    var S = (B12.DB.ajustes && B12.DB.ajustes.sobre) || {};
    var lista = (S.gastronomia || []).filter(function (c) { return c && c.nome; });
    if (!lista.length) return '';
    return sec('Onde comer') +
      '<div class="comer-lista">' + lista.map(function (c, i) {
        var miolo = '<b>' + escT(c.nome) + '</b>' +
          (c.vila ? '<span class="vila-txt">' + escT(c.vila) + '</span>' : '') +
          (c.txt ? '<small>' + escT(c.txt) + '</small>' : '') +
          (c.insta ? '<span class="parc-ig">' + IG_SVG + '@' + escT(c.insta) + '</span>' : '');
        return c.insta
          ? '<a class="comer entra entra-' + Math.min(i + 1, 6) + '" href="https://instagram.com/' +
            encodeURIComponent(c.insta) + '" target="_blank" rel="noopener">' + miolo + '</a>'
          : '<div class="comer entra entra-' + Math.min(i + 1, 6) + '">' + miolo + '</div>';
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
      '<div class="chip-info"><small>Onde a lancha chega</small><b>2</b><small class="sub">Brasília e Encantadas</small></div>' +
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

    /* "vila" não se fala aqui: é Encantadas e é Brasília */
    sec('Encantadas e Brasília') +
    '<div class="lugares">' + cartoesLugar('vila') + '</div>' +

    /* Gastronomia só existe quando o Dhalsin cadastrar alguém no painel.
       Lista vazia não vira "em breve" na cara do turista: some. */
    gastronomia() +

    sec('Onde ficar') + faixa(B12.FICAR) +
    '<div class="faixa-sec" style="padding-top:12px"><div class="parceiros">' + parceiros + '</div></div>' +

    /* 13/10: saiu o bloco "A travessia com a B12". Esta tela é sobre a Ilha;
       a travessia tem carta própria na primeira tela e aba inteira só dela. */

    sec('Antes de ir') +
    '<div class="dicas">' + B12.DICAS.map(function (d) {
      return '<details class="dica"><summary>' + d.q + '</summary><p>' + d.a + '</p></details>';
    }).join('') + '</div>' +

    sec('Como chegar') +
    '<div class="cx" style="margin-top:0"><p style="color:var(--tinta)">' + B12.EMPRESA.endereco + '</p>' +
      '<p style="font-size:12.5px;color:var(--tinta-3);margin-top:4px">Estacionamento na própria B12. A travessia sai do trapiche.</p>' +
      '<button type="button" class="btn sec" data-como-chegar>Como chegar até a B12</button></div>' +
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

/* ----------------------------------------------------------- como chegar
   "Tracar rota" abria o Google Maps so com o pino no lugar — quem esta na
   estrada ainda tinha que apertar "rotas". Agora abre ja navegando, e quem
   usa Waze (a maioria na BR-277) nao precisa copiar endereco na mao. */
B12.rotaMaps = function () {
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' +
    B12.EMPRESA.lat + '%2C' + B12.EMPRESA.lon;
};
B12.rotaWaze = function () {
  return 'https://waze.com/ul?ll=' + B12.EMPRESA.lat + '%2C' + B12.EMPRESA.lon + '&navigate=yes';
};
B12.comoChegar = function () {
  var E = B12.EMPRESA;
  B12.folha({
    titulo: 'Como chegar até a B12', sub: E.endereco,
    corpo:
      '<p style="font-size:13px;color:var(--tinta-2);margin-top:10px">' +
        'Escolha o seu aplicativo e a rota já abre navegando daqui até o nosso portão. ' +
        'O estacionamento é na própria estação, e a travessia sai do trapiche.</p>' +
      '<a class="btn pri" href="' + B12.rotaMaps() + '" target="_blank" rel="noopener" ' +
        'style="margin-top:12px">Abrir no Google Maps</a>' +
      '<a class="btn sec" href="' + B12.rotaWaze() + '" target="_blank" rel="noopener">Abrir no Waze</a>' +
      '<div class="cx" style="margin-top:12px"><h3>Endereço</h3>' +
        '<p style="color:var(--tinta-2)">' + escT(E.endereco) + '<br>CEP ' + escT(E.cep) + '</p>' +
        '<button type="button" class="btn sec" id="b-copiar-end">Copiar o endereço</button></div>',
    acao: 'Fechar', aoSalvar: function () { return {}; }
  });
  var b = document.getElementById('b-copiar-end');
  if (b) b.onclick = function () {
    var txt = E.nome + ' · ' + E.endereco + ' · CEP ' + E.cep;
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(txt).then(function () { B12.aviso('Endereço copiado.', 'bom'); },
        function () { B12.aviso(txt); });
    else B12.aviso(txt);
  };
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
  if (e.target.closest('[data-como-chegar]')) return B12.comoChegar();
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

/* "08h30" -> 510 minutos. A tabela e escrita do jeito que o Dhalsin fala, e
   quem compara horario precisa de numero. */
function emMinutos(txt) {
  var m = String(txt || '').match(/(\d{1,2})\s*[h:]\s*(\d{0,2})/);
  if (!m) return null;
  return (+m[1]) * 60 + (+(m[2] || 0));
}
/* Em que faixa da tabela cai a hora que a pessoa digitou. Fora de todas elas,
   'fora' — que no B12.preco quer dizer "sob consulta", sem preco automatico. */
B12.faixaDaHora = function (hhmm) {
  var T = B12.DB.ajustes.tabela, min = emMinutos(hhmm);
  if (min == null) return 'fora';
  var achou = 'fora';
  ['dia', 'tarde', 'noite'].forEach(function (k) {
    var de = emMinutos(T[k].de), ate = emMinutos(T[k].ate);
    if (de == null || ate == null) return;
    /* fim de uma faixa e comeco da outra sao o mesmo minuto (18h00): quem
       chega aos 18h00 em ponto fica na faixa que COMECA ali, nao na que acaba */
    if (achou === 'fora' && min >= de && min <= ate) achou = k;
    if (min === de) achou = k;
  });
  return achou;
};

/* Guarda a faixa no campo escondido e conta em portugues o que vai acontecer.
   defaultValue junto com value: campo escondido mexido por codigo fica "sujo"
   para sempre e trava a sincronia deste aparelho (peca 11 da formula). */
B12.lerHora = function () {
  var h = document.getElementById('f-hhmm'), esc = document.getElementById('f-hora');
  if (!h || !esc) return 'dia';
  var faixa = B12.faixaDaHora(h.value);
  esc.value = faixa; esc.defaultValue = faixa;
  var aj = document.getElementById('ajuda-hora');
  if (aj) {
    var T = B12.DB.ajustes.tabela;
    aj.innerHTML = !h.value
      ? 'Escreva a hora que vocês pretendem chegar na estação.'
      : (faixa === 'fora'
          ? 'Fora do nosso horário de atendimento (' + T.dia.de + ' às ' + T.noite.ate +
            '). Dá para atender assim mesmo — a B12 confirma com você pelo WhatsApp.'
          : 'Chegada às <b>' + h.value.replace(':', 'h') + '</b> · faixa das ' +
            T[faixa].de + ' às ' + T[faixa].ate + '.');
  }
  return faixa;
};

B12.montarFaixas = function () {
  B12.lerHora();
  var vc = document.getElementById('v-cortesia');
  if (vc) vc.textContent = B12.DB.ajustes.idadeCortesia;
  document.querySelectorAll('.v-cortesia').forEach(function (e) { e.textContent = B12.DB.ajustes.idadeCortesia; });
};
B12.montarFormulario = function () {
  /* as sugestões de pousada: lista pendurada num campo de texto, para quem
     fica numa pousada que a B12 ainda não cadastrou poder escrever o nome */
  var sel = document.getElementById('f-pousada-op');
  sel.innerHTML = B12.PARCEIROS.map(function (p) {
    return '<option value="' + escT(p.nome) + '"></option>'; }).join('');
  document.getElementById('f-destino').innerHTML =
    B12.DESTINOS.map(function (d) { return '<option>' + d + '</option>'; }).join('');
  B12.montarFaixas();
  var hoje = B12.hoje();
  var i = document.getElementById('f-ida');
  var primeira = B12.primeiraData();          /* a política da casa: 24 h de antecedência */
  i.value = primeira; i.defaultValue = primeira; i.min = primeira;
  document.getElementById('f-volta').min = primeira;
  ['f-ida','f-volta','f-hhmm','f-pag','f-pousada'].forEach(function (id) {
    document.getElementById(id).onchange = B12.calcular;
  });
  document.getElementById('f-hhmm').oninput = B12.calcular;
  document.getElementById('b-pax-menos').onclick = function () { mexer('pax', -1); };
  document.getElementById('b-pax-mais').onclick  = function () { mexer('pax', 1); };
  document.getElementById('b-cri-menos').onclick = function () { mexerCriancas(-1); };
  document.getElementById('b-cri-mais').onclick  = function () { mexerCriancas(1); };
  pintarIdades();
  document.getElementById('est-nao').onclick = function () { F.estac = 0; B12.calcular(); };
  document.getElementById('est-sim').onclick = function () { F.estac = 1; B12.calcular(); };
  document.getElementById('b-reservar').onclick = B12.reservar;
  B12.calcular();
  B12.selarListas();
};
/* ------------------------------------------------- quantas crianças, e as idades
   Quantas primeiro, idades depois: uma caixa por criança. Digitar "3, 7, 11"
   num teclado de celular dá erro — esquece a vírgula e vira uma criança de
   3.711 anos. E QUANTAS crianças não é o mesmo que quantas não pagam: uma de
   dez anos é criança e paga. A cortesia sai das idades, não da contagem. */
var NUM_CRI = 0, IDADES = [];

function mexerCriancas(d) {
  NUM_CRI = Math.max(0, Math.min(F.pax, NUM_CRI + d));
  IDADES.length = NUM_CRI;
  document.getElementById('v-cri').textContent = NUM_CRI;
  pintarIdades();
}

function pintarIdades() {
  var g = document.getElementById('f-idades-grade');
  if (!g) return;
  var lim = Number(B12.DB.ajustes.idadeCortesia) || 0;
  g.hidden = !NUM_CRI;
  g.innerHTML = '';
  for (var i = 0; i < NUM_CRI; i++) {
    var v = IDADES[i];
    var cortesia = v != null && v !== '' && Number(v) <= lim;
    var d = document.createElement('div');
    d.className = 'idade-item' + (cortesia ? ' cortesia' : '');
    d.innerHTML = '<span>' + (i + 1) + 'ª criança</span>' +
      '<input type="number" inputmode="numeric" min="0" max="17" step="1" ' +
      'aria-label="Idade da ' + (i + 1) + 'ª criança" placeholder="idade" ' +
      'value="' + (v == null ? '' : v) + '">';
    g.appendChild(d);
  }
  g.querySelectorAll('input').forEach(function (c, i) {
    c.oninput = function () {
      IDADES[i] = c.value === '' ? null : Math.max(0, Math.min(17, +c.value || 0));
      aplicarIdades();
      c.parentElement.classList.toggle('cortesia',
        IDADES[i] != null && IDADES[i] <= (Number(B12.DB.ajustes.idadeCortesia) || 0));
    };
  });
  aplicarIdades();
}

function aplicarIdades() {
  var lim = Number(B12.DB.ajustes.idadeCortesia) || 0;
  var postas = IDADES.filter(function (x) { return x != null && x !== ''; });
  F.idades = postas.join(', ');
  F.cri = postas.filter(function (x) { return Number(x) <= lim; }).length;
  var esc = document.getElementById('f-idades');
  /* defaultValue junto: este campo e um espelho do que o codigo calculou, nao
     algo digitado. Sem isto ele fica "sujo" para sempre depois da primeira
     reserva e o aparelho nunca mais sincroniza. */
  if (esc) { esc.value = F.idades; esc.defaultValue = F.idades; }

  var aj = document.getElementById('ajuda-idades');
  if (aj) {
    if (!NUM_CRI) aj.textContent = 'Se não vão crianças, deixe em zero.';
    else if (postas.length < NUM_CRI)
      aj.innerHTML = 'Falta a idade de ' + (NUM_CRI - postas.length) +
        (NUM_CRI - postas.length > 1 ? ' crianças' : ' criança') +
        ' — é a idade que diz quem não paga.';
    else aj.innerHTML = NUM_CRI + (NUM_CRI > 1 ? ' crianças' : ' criança') + ' · ' +
      (F.cri ? '<b>' + F.cri + (F.cri > 1 ? ' não pagam' : ' não paga') + '</b>' : 'todas pagam') +
      ' (cortesia até ' + lim + ' anos)';
  }
  B12.calcular();
}

function mexer(campo, d) {
  if (campo === 'pax') {
    F.pax = Math.max(1, Math.min(B12.CAPACIDADE, F.pax + d));
    if (NUM_CRI > F.pax) { NUM_CRI = F.pax; IDADES.length = NUM_CRI;
      document.getElementById('v-cri').textContent = NUM_CRI; pintarIdades(); }
  }
  else { F.cri = Math.max(0, Math.min(F.pax, F.cri + d)); }
  document.getElementById('v-pax').textContent = F.pax;
  /* a lancha tem um teto: quem bate nele precisa saber que ainda dá, em duas viagens */
  var av = document.getElementById('ajuda-lotacao');
  if (av) {
    var cheio = F.pax >= B12.CAPACIDADE;
    av.hidden = !cheio;
    if (cheio) av.innerHTML = 'A lancha leva <b>' + B12.CAPACIDADE + ' pessoas</b> por viagem. ' +
      'Grupo maior a B12 atende em mais de uma saída — fale com a gente no WhatsApp.';
  }

  B12.calcular();
}

B12.calcular = function () {
  var faixa = B12.lerHora();
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
  var faixa = B12.lerHora();
  var horaChegada = document.getElementById('f-hhmm').value || '';
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
    horaChegada: horaChegada,
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
  linhas.push('Chegada prevista: ' + (r.horaChegada ? r.horaChegada.replace(':', 'h') : r.faixa),
    'Destino: ' + r.destino, 'Pousada: ' + r.pousada,
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
