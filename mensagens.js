/* ============================================================================
   Estação B12 — escala de saídas e mensagens prontas de WhatsApp
   ----------------------------------------------------------------------------
   Duas coisas que andam juntas na operação real: saber quem embarca em cada
   horário, e falar com essa pessoa sem digitar.

   Nada é enviado sozinho. O app monta o texto e abre o WhatsApp; quem aperta
   enviar é o Dhalsin ou o marinheiro. Envio automático de verdade exige a API
   oficial da Meta, com burocracia e custo por conversa.
   ========================================================================== */
var B12 = window.B12 || {};

(function () {

/* ============================================================== a escala */
/* Cada saída tem passageiros. Ida leva para a Ilha, volta traz de lá. */

B12.passageirosDe = function (saidaId) {
  return B12.DB.reservas.filter(function (r) { return r.saidaId === saidaId; });
};

B12.ligarReservaNaSaida = function (reservaId, saidaId) {
  var r = B12.DB.reservas.filter(function (x) { return x.id === reservaId || x.cod === reservaId; })[0];
  var s = B12.DB.saidas.filter(function (x) { return x.id === saidaId; })[0];
  if (!r || !s) return { erro: 'Reserva ou saída não encontrada.' };
  var ocupados = B12.passageirosDe(saidaId).reduce(function (t, x) { return t + (x.pax || 1); }, 0);
  if (ocupados + (r.pax || 1) > s.vagas)
    return { erro: 'Essa saída das ' + s.hora + ' já está lotada.' };
  r.saidaId = saidaId;
  s.ocupadas = ocupados + (r.pax || 1);
  B12.salvar();
  return { ok: true };
};

B12.novaSaida = function (d) {
  if (!d.hora) return { erro: 'Informe o horário.' };
  var reg = {
    id: B12.novoId('sd'), data: d.data || B12.hoje(), hora: d.hora,
    sentido: d.sentido || 'ida',
    destino: d.destino || (d.sentido === 'volta' ? 'Pontal do Sul' : 'Brasília'),
    embarcacao: d.embarcacao || 'l01',
    marinheiro: String(d.marinheiro || '').trim(),
    vagas: Number(d.vagas) || 12, ocupadas: 0,
    obs: String(d.obs || '').trim()
  };
  B12.DB.saidas.push(reg);
  B12.salvar();
  return { ok: true, saida: reg };
};
B12.apagarSaida = function (id) {
  B12.DB.saidas = B12.DB.saidas.filter(function (s) { return s.id !== id; });
  B12.DB.reservas.forEach(function (r) { if (r.saidaId === id) r.saidaId = null; });
  B12.salvar();
};

/* o dia inteiro, ida e volta, com quem está em cada horário */
B12.escalaDoDia = function (iso) {
  iso = iso || B12.hoje();
  function monta(sentido) {
    return B12.saidasDoDia(iso, sentido)
      .map(function (s) {
        var p = B12.passageirosDe(s.id);
        return { saida: s, passageiros: p,
                 pax: p.reduce(function (t, x) { return t + (x.pax || 1); }, 0) };
      });
  }
  return { data: iso, idas: monta('ida'), voltas: monta('volta') };
};

/* quem ainda não tem horário de volta marcado — é o buraco que o cliente citou */
B12.semHorarioDeVolta = function (iso) {
  iso = iso || B12.hoje();
  return B12.DB.reservas.filter(function (r) {
    return r.volta === iso && !r.saidaVoltaId && r.situacao !== 'cancelada';
  });
};

/* ==================================================== mensagens prontas */
/* Cada modelo recebe {nome, cod, hora, data, ...} e devolve o texto pronto.
   Emoji com moderação: um por bloco, nunca no meio da frase. */

function pri(nome) { return String(nome || '').trim().split(' ')[0] || 'tudo bem'; }

B12.MODELOS = [

  { id:'confirmacao', nome:'Confirmar reserva', quando:'assim que a pessoa reserva',
    cor:'#0E8C80', icone:'✅',
    texto: function (d) { return [
      '✅ *Reserva confirmada — Estação B12*',
      '',
      'Oi, ' + pri(d.nome) + '! Sua travessia para a Ilha do Mel está garantida.',
      '',
      '🎫 Código: *' + (d.cod || 'B12-0000') + '*',
      '📅 Ida: ' + B12.dataBR(d.ida || B12.hoje()) + (d.hora ? ' às ' + d.hora : ''),
      (d.volta ? '📅 Volta: ' + B12.dataBR(d.volta) : ''),
      '👥 Passageiros: ' + (d.pax || 1),
      (d.total != null ? '💰 Total: ' + B12.brl(d.total) : ''),
      '',
      '📍 Estação B12 — Av. Beira-Mar, 3433, Pontal do Paraná',
      'Chegue com 20 minutos de antecedência.',
      '',
      '📲 Para marcar sua volta pelo app: ' + B12.enderecoApp(),
      'Toque em "Já tenho um código" e use o código acima.',
      '',
      'Qualquer coisa, é só chamar por aqui. Boa viagem! ⛵'
    ].filter(Boolean).join('\n'); } },

  { id:'vespera', nome:'Lembrete da véspera', quando:'um dia antes da viagem',
    cor:'#12608E', icone:'⏰',
    texto: function (d) { return [
      '⏰ *É amanhã, ' + pri(d.nome) + '!*',
      '',
      'Sua travessia para a Ilha do Mel sai amanhã' + (d.hora ? ' às *' + d.hora + '*' : '') + '.',
      '',
      '🎫 Código: *' + (d.cod || 'B12-0000') + '*',
      '📍 Av. Beira-Mar, 3433 — Pontal do Paraná',
      '🚗 Se for deixar o carro com a gente, avise para reservarmos a vaga.',
      '',
      'Leve protetor solar, água e documento. Até amanhã! ☀️'
    ].join('\n'); } },

  { id:'volta', nome:'Horários de volta', quando:'no dia do retorno',
    cor:'#0E7A6E', icone:'🔁',
    texto: function (d) { return [
      '🔁 *Sua volta é hoje, ' + pri(d.nome) + '*',
      '',
      'Estes são os horários de retorno de hoje da Ilha do Mel:',
      '',
      (d.horarios || ['09h30', '12h00', '16h00', '18h00'])
        .map(function (h) { return '• ' + h; }).join('\n'),
      '',
      'Me responde qual horário você prefere que eu já reservo seu lugar.',
      'Chegue no trapiche 15 minutos antes. 🛥️'
    ].join('\n'); } },

  { id:'mar', nome:'Mar agitado / mudança', quando:'quando o tempo vira',
    cor:'#D9932B', icone:'🌊',
    texto: function (d) { return [
      '🌊 *Aviso da Estação B12*',
      '',
      'Oi, ' + pri(d.nome) + '. O mar está agitado e, por segurança, ' +
        'precisamos ajustar o horário da sua travessia' +
        (d.hora ? ' das ' + d.hora : '') + '.',
      '',
      (d.novoHorario ? '🕐 Novo horário: *' + d.novoHorario + '*' :
        'Assim que tivermos o novo horário, aviso por aqui.'),
      '',
      'Segurança em primeiro lugar. Qualquer dúvida, estou à disposição.'
    ].join('\n'); } },

  { id:'chegou', nome:'Boas-vindas na chegada', quando:'quando a pessoa desembarca',
    cor:'#14A99A', icone:'🏝️',
    texto: function (d) { return [
      '🏝️ *Bem-vindo à Ilha do Mel, ' + pri(d.nome) + '!*',
      '',
      'Guarde este contato: é por aqui que você marca a sua volta.',
      '',
      '🎫 Seu código: *' + (d.cod || 'B12-0000') + '*',
      (d.volta ? '📅 Sua volta está prevista para ' + B12.dataBR(d.volta) : ''),
      '📲 Marque sua volta pelo app: ' + B12.enderecoApp() + ' → "Já tenho um código"',
      '',
      'Dicas rápidas:',
      '• O Farol das Conchas fecha ao anoitecer',
      '• Não tem carro na Ilha, leve pouca bagagem',
      '• Leve dinheiro ou Pix, muitos lugares não passam cartão',
      '',
      'Aproveite! ☀️'
    ].filter(Boolean).join('\n'); } },

  { id:'obrigado', nome:'Agradecer e pedir avaliação', quando:'no dia seguinte à volta',
    cor:'#3C86B8', icone:'⭐',
    texto: function (d) { return [
      '⭐ *Obrigado por viajar com a gente, ' + pri(d.nome) + '!*',
      '',
      'Esperamos que a Ilha do Mel tenha sido tudo o que você imaginava.',
      '',
      'Se sobrou um minuto, deixar uma avaliação no Google ajuda demais ' +
        'a nossa equipe e outros viajantes a nos encontrarem:',
      'https://www.google.com/maps/search/?api=1&query=Esta%C3%A7%C3%A3o+B12+Pontal+do+Paran%C3%A1',
      '',
      'Volte sempre. A travessia está sempre aqui. ⛵'
    ].join('\n'); } },

  { id:'fimdesemana', nome:'Convite de fim de semana', quando:'quinta-feira, para quem já viajou',
    cor:'#0B6E66', icone:'🌤️',
    texto: function (d) { return [
      '🌤️ *Como vai estar a Ilha neste fim de semana*',
      '',
      'Oi, ' + pri(d.nome) + '! Olha a previsão para a Ilha do Mel:',
      '',
      (d.previsao || ['Sexta: 27°C, sol', 'Sábado: 28°C, sol', 'Domingo: 26°C, parcialmente nublado'])
        .map(function (l) { return '• ' + l; }).join('\n'),
      '',
      (d.mar ? '🌊 Mar: ' + d.mar : '🌊 Mar calmo e boa visibilidade.'),
      '',
      'Bateu vontade? Me chama que eu já reservo sua travessia. ⛵'
    ].join('\n'); } },

  { id:'baixa', nome:'Condição de baixa temporada', quando:'semana fraca',
    cor:'#C08A2E', icone:'🎟️',
    texto: function (d) { return [
      '🎟️ *Que tal uma escapada para a Ilha do Mel?*',
      '',
      'Oi, ' + pri(d.nome) + '. Esta semana está mais tranquila por aqui, ' +
        'e isso tem um lado bom: a Ilha fica só sua.',
      '',
      (d.oferta ? '✨ ' + d.oferta : '✨ Temos condição especial nas travessias desta semana.'),
      '',
      'Me chama que eu monto seu horário. ⛵'
    ].join('\n'); } },

  { id:'carro', nome:'Carro no pátio', quando:'quando a saída prevista passou',
    cor:'#D2564A', icone:'🚗',
    texto: function (d) { return [
      '🚗 *Sobre o seu carro na Estação B12*',
      '',
      'Oi, ' + pri(d.nome) + '. Seu carro' + (d.placa ? ' (placa ' + d.placa + ')' : '') +
        ' está com a gente desde ' + B12.dataBR(d.entrada || B12.hoje()) + '.',
      '',
      '🅿️ Diárias até agora: ' + (d.dias || 1),
      '💰 Valor: ' + B12.brl(d.valor || 0),
      '',
      'Está tudo certo por aí? Se precisar deixar mais tempo, é só avisar.'
    ].join('\n'); } },

  { id:'saldo', nome:'Cobrar o saldo', quando:'antes da viagem, quando falta pagar',
    cor:'#8E5F16', icone:'💳',
    texto: function (d) { return [
      '💳 *Saldo da sua reserva — Estação B12*',
      '',
      'Oi, ' + pri(d.nome) + '! Falta só acertar o saldo da sua travessia.',
      '',
      '🎫 Código: *' + (d.cod || 'B12-0000') + '*',
      '💰 Saldo: ' + B12.brl(d.saldo || 0),
      (d.pix ? '🔑 Pix: ' + d.pix : ''),
      '',
      'Assim que cair, sua vaga fica garantida. Qualquer dúvida é só chamar.'
    ].filter(Boolean).join('\n'); } },

  { id:'voltaEscolhida', nome:'Avisar a B12 do horário de volta', quando:'quando o turista escolhe',
    cor:'#0E8C80', icone:'🕐',
    texto: function (d) { return [
      '🕐 *Volta marcada — ' + (d.cod || 'B12-0000') + '*',
      '',
      'Oi! Aqui é ' + (d.nome || 'um passageiro') + '. Escolhi voltar da Ilha ' +
        (d.hora ? 'no retorno das *' + d.hora + '*' : 'hoje') + '.',
      '👥 Somos ' + (d.pax || 1) + (d.pax > 1 ? ' pessoas' : ' pessoa') + '.',
      '',
      'Pode confirmar meu lugar? Obrigado! ⛵'
    ].join('\n'); } },

  { id:'grupo', nome:'Aviso ao marinheiro', quando:'passar a escala para a equipe',
    cor:'#4E7E96', icone:'🧭',
    texto: function (d) { return [
      '🧭 *Escala de hoje — ' + B12.dataBR(d.data || B12.hoje()) + '*',
      '',
      (d.linhas || ['08h30 — Brasília — 6 passageiros']).join('\n'),
      '',
      (d.obs ? '📌 ' + d.obs : '📌 Conferir colete e combustível antes da primeira saída.')
    ].join('\n'); } }
];

B12.modelo = function (id) {
  return B12.MODELOS.filter(function (m) { return m.id === id; })[0] || null;
};

/* monta o texto e abre o WhatsApp da pessoa (ou sem número, para copiar) */
B12.abrirWhats = function (zap, texto) {
  var n = String(zap || '').replace(/\D/g, '');
  if (n && n.length <= 11) n = '55' + n;
  var url = 'https://wa.me/' + (n || '') + '?text=' + encodeURIComponent(texto);
  window.open(url, '_blank');
};

B12.copiar = function (texto) {
  if (navigator.clipboard && navigator.clipboard.writeText)
    return navigator.clipboard.writeText(texto);
  var t = document.createElement('textarea');
  t.value = texto; document.body.appendChild(t); t.select();
  try { document.execCommand('copy'); } catch (e) {}
  t.remove();
  return Promise.resolve();
};

/* ------------------------------------------------- a folha de mensagens */
B12.folhaMensagem = function (modeloId, dados) {
  var m = B12.modelo(modeloId);
  if (!m) return;
  var texto = m.texto(dados || {});
  var f = document.createElement('div');
  f.className = 'folha';
  f.innerHTML = '<div class="folha-fundo"></div><div class="folha-cx">' +
    '<div class="folha-alca"></div>' +
    '<div class="folha-topo"><div><h3>' + m.nome + '</h3>' +
    '<p>' + (dados && dados.nome ? 'para ' + dados.nome : m.quando) + '</p></div>' +
    '<button type="button" class="folha-x" aria-label="Fechar">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
    '<div class="folha-corpo"><div class="balao" id="txt-msg">' +
    texto.replace(/&/g,'&amp;').replace(/</g,'&lt;')
         .replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</div>' +
    '<p class="ajuda" style="margin-top:12px">Você pode editar depois de colar no WhatsApp. ' +
    'O app não envia nada sozinho.</p></div>' +
    '<div class="folha-pe"><div class="grade2" style="margin:0">' +
    '<button class="btn sec" style="margin:0" id="b-copiar">Copiar texto</button>' +
    '<button class="btn zap" style="margin:0" id="b-zap">Abrir no WhatsApp</button>' +
    '</div></div></div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('.folha-x').onclick = fechar;
  f.querySelector('.folha-fundo').onclick = fechar;
  f.querySelector('#b-zap').onclick = function () {
    B12.abrirWhats(dados && dados.whats, texto); fechar(); };
  f.querySelector('#b-copiar').onclick = function () {
    var b = f.querySelector('#b-copiar');
    B12.copiar(texto).then(function () { b.textContent = 'Copiado ✓';
      setTimeout(function () { b.textContent = 'Copiar texto'; }, 1600); });
  };
};

/* escolher qual modelo mandar para alguém */
B12.escolherMensagem = function (dados) {
  var f = document.createElement('div');
  f.className = 'folha';
  f.innerHTML = '<div class="folha-fundo"></div><div class="folha-cx">' +
    '<div class="folha-alca"></div>' +
    '<div class="folha-topo"><div><h3>Mandar mensagem</h3>' +
    '<p>' + (dados && dados.nome ? 'para ' + dados.nome : 'escolha o modelo') + '</p></div></div>' +
    '<div class="folha-corpo acoes">' + B12.MODELOS.map(function (m) {
      return '<button type="button" class="acao" data-msg="' + m.id + '">' +
        '<span class="bolinha" style="background:' + m.cor + '"></span>' +
        '<span class="txt"><b>' + m.nome + '</b><small>' + m.quando + '</small></span>' +
        '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>';
    }).join('') + '</div></div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('.folha-fundo').onclick = fechar;
  f.querySelectorAll('[data-msg]').forEach(function (b) {
    b.onclick = function () { fechar(); B12.folhaMensagem(b.dataset.msg, dados || {}); };
  });
};

})();
