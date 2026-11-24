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
    vagas: Number(d.vagas) || B12.CAPACIDADE, ocupadas: 0,
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

/* ============================================ QUANDO ELE COMPRAR A LINHA
   24/11/2026: "se ele comprar a linha do WhatsApp no futuro, ele possa enviar
   em MASSA para os grupos dele".

   Hoje o app faz o melhor possível SEM linha: `wa.me/?text=` abre o WhatsApp
   com o texto pronto e ele escolhe o grupo — um toque, vinte pessoas. O que
   falta para ser automático é a API oficial da Meta, que precisa de:

     · uma linha de WhatsApp Business dedicada (número que não é o pessoal);
     · conta na Meta e número verificado;
     · modelos de mensagem APROVADOS pela Meta, um a um, antes de usar;
     · custo POR CONVERSA (a Meta cobra; 1.000 por mês saem de graça).

   A armadilha que vale escrever: **a API da Meta NÃO manda para grupos.**
   Ela manda para números, um por um, automaticamente. Então, mesmo com a
   linha, "o grupo" continua sendo o caminho de colar à mão — o que muda é
   que o app passa a poder disparar os VINTE INDIVIDUAIS sozinho, cada um
   com o nome da pessoa, sem ele tocar em nada.

   Quando a hora chegar, o ponto de entrada é UM SÓ: `B12.whatsEmMassa`
   abaixo. Ela já tem a assinatura certa e hoje devolve "sem linha". Ligar a
   API é trocar o corpo dela — nenhuma tela precisa mudar, porque todas já
   chamam por aqui. */
B12.temLinhaWhats = function () {
  var a = (B12.DB && B12.DB.ajustes) || {};
  return !!(a.whatsApi && a.whatsApi.token && a.whatsApi.numeroId);
};

/* lista = [{zap, nome, texto}] — a MESMA forma que a fila de um a um usa */
B12.whatsEmMassa = function (lista) {
  if (!B12.temLinhaWhats()) {
    return Promise.resolve({ erro: 'semLinha',
      mensagem: 'O envio automático precisa de uma linha de WhatsApp Business. ' +
                'Por enquanto: mande no grupo, ou um a um.' });
  }
  /* AQUI entra a chamada à API da Meta, quando a linha existir. Nada mais
     na tela precisa mudar. */
  return Promise.resolve({ erro: 'naoLigado',
    mensagem: 'A linha está cadastrada mas o envio automático ainda não foi ligado.' });
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
    /* 24/11/2026, "deixar msn editáveis": o texto era um balão só de ler, e
       a frase embaixo mandava editar DEPOIS de colar no WhatsApp — ou seja,
       o trabalho ficava sempre do outro lado. Agora é um campo: ele ajusta
       aqui, e o que sai é o que está na tela.

       Fica em texto cru, com os *asteriscos* à mostra de propósito: é assim
       que o WhatsApp entende negrito, e é isso que vai ser colado. */
    '<div class="folha-corpo">' +
    '<textarea class="balao balao-edit" id="txt-msg" rows="10" ' +
    'aria-label="Texto da mensagem">' +
    texto.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</textarea>' +
    '<p class="ajuda" style="margin-top:10px">Pode mudar o texto aqui antes de mandar. ' +
    'Os <b>*asteriscos*</b> viram negrito no WhatsApp. O app não envia nada sozinho.</p></div>' +
    '<div class="folha-pe">' +
    '<button class="btn sec" style="margin:0 0 8px" id="b-varios">Mandar para várias pessoas</button>' +
    '<div class="grade2" style="margin:0">' +
    '<button class="btn sec" style="margin:0" id="b-copiar">Copiar texto</button>' +
    '<button class="btn zap" style="margin:0" id="b-zap">Abrir no WhatsApp</button>' +
    '</div></div></div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('.folha-x').onclick = fechar;
  f.querySelector('.folha-fundo').onclick = fechar;
  /* o que sai é o que está na tela, não o que a função gerou */
  function agora() { return f.querySelector('#txt-msg').value; }
  f.querySelector('#b-varios').onclick = function () {
    var t = agora();
    fechar();
    B12.formMandarPara({ id: m.id, nome: m.nome, quando: m.quando, texto: t }, { pessoal: true });
  };
  f.querySelector('#b-zap').onclick = function () {
    B12.abrirWhats(dados && dados.whats, agora()); fechar(); };
  f.querySelector('#b-copiar').onclick = function () {
    var b = f.querySelector('#b-copiar');
    B12.copiar(agora()).then(function () { b.textContent = 'Copiado ✓';
      setTimeout(function () { b.textContent = 'Copiar texto'; }, 1600); });
  };
};

/* a mesma folha, para uma mensagem escrita por ele — o texto já vem com as
   marcas trocadas pelos dados de quem vai receber */
B12.folhaMinhaMensagem = function (msg, dados) {
  if (!msg) return;
  var d = dados || {};
  var texto = B12.preencherMensagem(msg.texto, d);
  var f = document.createElement('div');
  f.className = 'folha';
  f.innerHTML = '<div class="folha-fundo"></div><div class="folha-cx">' +
    '<div class="folha-alca"></div>' +
    '<div class="folha-topo"><div><h3>' + escM(msg.nome) + '</h3>' +
    '<p>' + (d.nome ? 'para ' + escM(d.nome) : escM(msg.quando || '')) + '</p></div>' +
    '<button type="button" class="folha-x" aria-label="Fechar">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
    '<div class="folha-corpo">' +
    '<textarea class="balao balao-edit" id="txt-msg" rows="10" ' +
    'aria-label="Texto da mensagem">' + escM(texto) + '</textarea>' +
    '<p class="ajuda" style="margin-top:10px">Pode mudar o texto aqui antes de mandar. ' +
    'Os <b>*asteriscos*</b> viram negrito no WhatsApp. O app não envia nada sozinho.</p></div>' +
    '<div class="folha-pe">' +
    '<button class="btn sec" style="margin:0 0 8px" id="b-varios">Mandar para várias pessoas</button>' +
    '<div class="grade2" style="margin:0">' +
    '<button class="btn sec" style="margin:0" id="b-copiar">Copiar texto</button>' +
    '<button class="btn zap" style="margin:0" id="b-zap">Abrir no WhatsApp</button>' +
    '</div></div></div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('.folha-x').onclick = fechar;
  f.querySelector('.folha-fundo').onclick = fechar;
  function agora() { return f.querySelector('#txt-msg').value; }
  f.querySelector('#b-varios').onclick = function () {
    var t = agora(); fechar();
    B12.formMandarPara({ id: msg.id, nome: msg.nome, quando: msg.quando, texto: t });
  };
  f.querySelector('#b-zap').onclick = function () { B12.abrirWhats(d.whats, agora()); fechar(); };
  f.querySelector('#b-copiar').onclick = function () {
    var b = f.querySelector('#b-copiar');
    B12.copiar(agora()).then(function () { b.textContent = 'Copiado ✓';
      setTimeout(function () { b.textContent = 'Copiar texto'; }, 1600); });
  };
};
function escM(x) {
  return String(x == null ? '' : x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ---------------------------------------------- deixar o texto GENÉRICO
   24/11/2026, dele, olhando o "Confirmar reserva" montado para a Ivone:

     "como seria isso pra ser mais efetivo... deixar genérico, sem nome,
      apenas info, para enviar para pessoas escolhidas."

   Os modelos de fábrica são escritos para UMA pessoa: trazem o nome, o
   código da reserva, o total que ela pagou, quantos passageiros. Mandar esse
   texto para trinta pessoas é mandar o código de uma para as outras — além
   de errado, é vazar dado de cliente.

   Isto tira as linhas que só valem para uma pessoa e deixa o que serve para
   todas: endereço, antecedência, horário, recado. O resto ele ajusta à mão,
   porque o campo é editável. */
var PESSOAIS = /^\s*(?:[^\s]*\s*)?(?:🎫|👥|💰)/;
var PESSOAIS_PALAVRA = /^\s*[^\n]*\b(c[óo]digo|total|passageiros?)\s*:/i;
B12.textoGenerico = function (texto) {
  var linhas = String(texto || '').split('\n');
  var fora = linhas.filter(function (l) {
    if (PESSOAIS.test(l) || PESSOAIS_PALAVRA.test(l)) return false;
    /* a saudação com nome: "Oi, Ivone! ..." vira "Oi! ..." mais abaixo */
    return true;
  }).map(function (l) {
    return l
      /* "Oi, Ivone!" → "Oi!"  ·  "Olá, Ivone," → "Olá," */
      .replace(/\b(Oi|Olá|Bom dia|Boa tarde|Boa noite)\s*,\s*[^!,.]{1,40}([!,])/i, '$1$2')
      /* "Sua travessia" / "sua volta" ficam: valem para qualquer um */
      .replace(/\{nome\}/gi, '');
  });
  /* não deixa três linhas vazias seguidas onde saíram as linhas pessoais */
  var limpo = [];
  fora.forEach(function (l) {
    if (l.trim() === '' && limpo.length && limpo[limpo.length - 1].trim() === '') return;
    limpo.push(l);
  });
  return limpo.join('\n').trim();
};

/* ================================================ MANDAR PARA VÁRIAS PESSOAS
   24/11/2026. Ele olhou a aba Mensagens e perguntou: "como a gente faz para
   enviar para mais pessoas que estão na Ilha do Mel? Aqui está direcionado só
   ao Paulo, e lá tem o Paulo, o Eugênio, outras pessoas. Talvez uma mensagem
   genérica, sem nome, e uma caixa para clicar em quais pessoas enviar."

   A verdade que a tela precisa dizer, e não dizia:

   · WHATSAPP NÃO MANDA EM LOTE. O link wa.me abre UMA conversa de cada vez, e
     quem aperta enviar é ele. Disparo de verdade só com a API oficial da Meta,
     que cobra por conversa. Então aqui vira FILA: ele escolhe quem, e o app
     abre uma por uma, marcando quem já foi. É o que ele já fazia — só que
     sem perder a conta de quem ficou para trás.
   · AVISO NO APP manda em lote de verdade, de uma vez, e de graça. Mas só
     chega em quem instalou o app.
   · E-MAIL também manda em lote, e chega em quem deu o endereço.

   Sobre o nome: não precisa tirar. A marca {nome} é trocada POR PESSOA, uma
   mensagem de cada vez — cada um recebe com o nome dele. Texto sem {nome}
   também funciona e vai igual para todos. A tela diz qual dos dois é. */
B12.formMandarPara = function (msg, opc) {
  opc = opc || {};
  /* 24/11/2026. Ele perguntou "já tem essa mensagem padrão?" — tinha, e o
     sistema inteiro também. O que faltava era ele SABER, e faltava isto:
     quando o recado sai por aqui, quem chamou precisa marcar as pessoas como
     avisadas. Sem este aviso de volta, ele mandava o push para os sete e a
     tela continuava dizendo "faltam avisar 7". Perder a conta de quem já foi
     é o jeito mais rápido de voltar a confiar no caderno. */
  var aoMandar = typeof opc.aoMandar === 'function' ? opc.aoMandar : function () {};
  var hoje = B12.hoje(), amanha = B12.diaMais(hoje, 1);
  var ilha = B12.naIlha(hoje) || {};

  /* cada pessoa entra UMA vez, mesmo aparecendo em duas listas */
  var vistos = {}, gente = [];
  function juntar(lista, etiqueta) {
    (lista || []).forEach(function (p) {
      var chave = p.clienteId || p.cod || p.nome;
      if (vistos[chave]) {
        /* a mesma pessoa pode ter duas reservas: a etiqueta entra UMA vez,
           senão sai "volta hoje · volta hoje · na Ilha · na Ilha" */
        if (etiqueta && vistos[chave].etiquetas.indexOf(etiqueta) < 0)
          vistos[chave].etiquetas.push(etiqueta);
        return;
      }
      var reg = {
        chave: chave, nome: p.nome, pessoas: p.pessoas || 1, cod: p.cod || '',
        clienteId: p.clienteId || '',
        whats: (p.contato && p.contato.whats) || '',
        email: (p.contato && p.contato.email) || '',
        volta: p.volta || '', etiquetas: etiqueta ? [etiqueta] : []
      };
      vistos[chave] = reg; gente.push(reg);
    });
  }
  /* naIlha devolve .volta em cada pessoa; quem volta HOJE tem volta = hoje */
  juntar((ilha.voltam || []).map(function (p) {
    return Object.assign({}, p, { volta: p.volta || hoje }); }), 'volta hoje');
  juntar(B12.DB.reservas.filter(function (r) {
    return r.situacao === 'confirmada' && !r.apagado && r.volta === amanha;
  }).map(function (r) {
    var c = r.clienteId ? B12.DB.clientes.filter(function (x) { return x.id === r.clienteId; })[0] : null;
    return { nome: r.nome, pessoas: r.pax, cod: r.cod, clienteId: r.clienteId,
             volta: r.volta,          /* sem isto o filtro do dia não casa com ninguém */
             contato: { whats: (r.zap || (c && c.whats) || '').replace(/\D/g, ''),
                        email: r.email || (c && c.email) || '' } };
  }), 'volta amanhã');
  juntar((ilha.agora || []), 'na Ilha');

  if (!gente.length) {
    return B12.aviso('Não há ninguém na Ilha nem voltando nos próximos dias.', 'aviso');
  }

  var texto0 = msg && msg.texto ? msg.texto : '';
  var temNome = /\{nome\}/i.test(texto0);
  /* tem dado de UMA pessoa dentro? Então há o que tirar antes de mandar
     para trinta — mandar o código de uma para as outras é vazar cliente. */
  var temPessoal = B12.textoGenerico(texto0) !== texto0;

  /* 24/11/2026, visto fazendo o caminho dele: ele toca em "Avisar os 4 que
     voltam amanhã" e a lista vinha com 36 marcados — todo mundo que está na
     Ilha. Mandaria o recado de AMANHÃ para quem volta HOJE.

     Quando quem chamou diz de que dia se trata (`opc.dia`), só as pessoas
     daquele dia começam marcadas. As outras continuam na lista, desmarcadas,
     porque às vezes ele quer incluir alguém — mas incluir é decisão, não
     descuido. */
  function daquele(p) {
    return !opc.dia || p.volta === opc.dia;
  }
  function linha(p, i) {
    var canais = [];
    if (p.whats) canais.push('WhatsApp');
    if (p.clienteId) canais.push('app');
    if (p.email && p.email.indexOf('@') > 0) canais.push('e-mail');
    return '<label class="mp-linha">' +
      '<input type="checkbox" class="mp-cx" data-i="' + i + '"' +
      (daquele(p) ? ' checked' : '') + '>' +
      '<span class="mp-txt"><b>' + escM(p.nome) + '</b>' +
      '<small>' + p.pessoas + (p.pessoas > 1 ? ' pessoas' : ' pessoa') +
      (p.etiquetas.length ? ' · ' + escM(p.etiquetas.join(' · ')) : '') +
      (canais.length ? ' · ' + canais.join(', ') : ' · <b>sem contato</b>') +
      '</small></span></label>';
  }

  var f = document.createElement('div');
  f.className = 'folha';
  f.innerHTML = '<div class="folha-fundo"></div><div class="folha-cx">' +
    '<div class="folha-alca"></div>' +
    '<div class="folha-topo"><div><h3>' +
    (opc.quando ? 'Avisar quem volta ' + escM(opc.quando) : 'Mandar para várias pessoas') +
    '</h3><p>' + escM(msg && msg.nome ? msg.nome : 'escolha quem recebe') + '</p></div>' +
    '<button type="button" class="folha-x" aria-label="Fechar">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
    '<div class="folha-corpo">' +
      '<textarea class="balao balao-edit" id="mp-texto" rows="7" style="margin-bottom:8px" ' +
      'aria-label="Texto da mensagem">' + escM(texto0) + '</textarea>' +
      /* 24/11/2026: o aviso e o botão diziam a mesma coisa em dois lugares da
         mesma tela. Viraram um bloco só — o problema e o conserto encostados,
         que é o que faz a pessoa resolver em vez de ler duas vezes. Só
         aparece quando há o que tirar. */
      '<div class="cx aviso mp-pessoal" id="mp-alerta-pessoal"' +
      (temPessoal ? '' : ' hidden') + '><p>Este texto tem <b>nome, código e total</b> de ' +
      'uma pessoa só. Mandando assim, todas recebem o código da primeira.</p>' +
      '<button type="button" class="btn sec" id="mp-generico">Deixar genérico</button></div>' +
      '<div class="ajuda" id="mp-aviso-nome" style="margin-bottom:14px"' +
      (temPessoal ? ' hidden' : '') + '>' + (temNome
        ? 'O texto tem <b>{nome}</b>: cada pessoa recebe com o primeiro nome dela. ' +
          'Pelo WhatsApp e pelo aviso no app a troca é feita uma a uma.'
        : 'O texto não tem nome dentro: vai <b>igual para todos</b>.') + '</div>' +
      '<div class="mp-cab"><b id="mp-conta"></b>' +
        '<span><button type="button" class="mini-btn" id="mp-todos">Todos</button> ' +
        '<button type="button" class="mini-btn" id="mp-nenhum">Nenhum</button></span></div>' +
      (opc.dia
        ? '<div class="ajuda" style="margin:-4px 0 8px">Já vêm marcados os que voltam ' +
          escM(opc.quando || 'nesse dia') + '. Os outros estão na lista, desmarcados.</div>'
        : '') +
      '<div class="mp-lista">' +
      /* os do dia primeiro: é neles que ele vai olhar */
      gente.map(function (p, i) { return { p: p, i: i }; })
        .sort(function (a, b) { return (daquele(b.p) ? 1 : 0) - (daquele(a.p) ? 1 : 0); })
        .map(function (x) { return linha(x.p, x.i); }).join('') + '</div>' +
      '<div class="cx nota" style="margin-top:14px">' +
      '<p><b>Num grupo:</b> o WhatsApp abre com o texto pronto e você escolhe o grupo. ' +
      'Serve quando a volta é dividida por muita gente.</p>' +
      '<p style="margin-top:8px"><b>Um a um:</b> o app abre uma conversa de cada vez e vai ' +
      'marcando quem já foi. Serve quando são duas ou três pessoas — e quem aperta enviar ' +
      'é você, sempre.</p>' +
      '<p style="margin-top:8px"><b>Aviso no app</b> e <b>e-mail</b> saem todos de uma vez, ' +
      'sozinhos.</p></div>' +
    '</div>' +
    /* 24/11/2026, depois de ele contar como trabalha de verdade:

         "ele usa muito GRUPOS. Às vezes a volta é compartilhada e ele precisa
          enviar para 20 clientes voltando — mandaria 20 WhatsApp. O certo
          seria apertar um botão e enviar para todos."

       E a resposta estava a uma linha de distância, escondida: `wa.me/?text=`
       SEM número abre o WhatsApp com o texto pronto e deixa ELE escolher o
       destino — inclusive um GRUPO. Um toque, vinte pessoas, hoje, sem API
       nenhuma. O app já sabia fazer isso desde sempre (B12.abrirWhats aceita
       zap vazio); ninguém tinha posto o botão.

       E a correção dele, logo depois, que me fez desfazer meia escolha:

         "as voltas são compartilhadas UMA VEZ OU OUTRA. Outras vezes é volta
          de 2 ou 3 pessoas que já foi combinado. Nada é muito fixo."

       Então NENHUM destes quatro é o padrão. Os dois de cima são os dois
       jeitos de usar o WhatsApp — num grupo ou um a um —, e os dois de baixo
       são os que saem sozinhos. Quem decide é o dia. */
    '<div class="folha-pe"><div class="mp-bts mp-bts-4">' +
      '<button type="button" class="btn sec" style="margin:0" id="mp-grupo">Num grupo</button>' +
      '<button type="button" class="btn sec" style="margin:0" id="mp-zap">Um a um</button>' +
      '<button type="button" class="btn sec" style="margin:0" id="mp-app">Aviso no app</button>' +
      '<button type="button" class="btn sec" style="margin:0" id="mp-mail">E-mail</button>' +
    '</div></div></div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('.folha-x').onclick = fechar;
  f.querySelector('.folha-fundo').onclick = fechar;

  function escolhidos() {
    return [].slice.call(f.querySelectorAll('.mp-cx:checked'))
      .map(function (c) { return gente[+c.dataset.i]; });
  }
  function recontar() {
    var e = escolhidos();
    var z = e.filter(function (p) { return p.whats; }).length;
    var a = e.filter(function (p) { return p.clienteId; }).length;
    var m = e.filter(function (p) { return p.email && p.email.indexOf('@') > 0; }).length;
    f.querySelector('#mp-conta').textContent = e.length +
      (e.length === 1 ? ' pessoa escolhida' : ' pessoas escolhidas');
    f.querySelector('#mp-zap').textContent = 'Um a um · ' + z;
    f.querySelector('#mp-app').textContent = 'Aviso no app · ' + a;
    f.querySelector('#mp-mail').textContent = 'E-mail · ' + m;
    f.querySelector('#mp-zap').disabled = !z;
    f.querySelector('#mp-app').disabled = !a;
    f.querySelector('#mp-mail').disabled = !m;
  }
  f.querySelectorAll('.mp-cx').forEach(function (c) { c.onchange = recontar; });
  /* mexeu no texto: o aviso sobre o nome acompanha */
  var cTexto = f.querySelector('#mp-texto'), avNome = f.querySelector('#mp-aviso-nome');
  var bGen = f.querySelector('#mp-generico');
  bGen.onclick = function () {
    cTexto.value = B12.textoGenerico(cTexto.value);
    cTexto.dispatchEvent(new Event('input'));
  };
  cTexto.addEventListener('input', function () {
    /* some quando não há mais nada de uma pessoa só para tirar */
    /* o bloco inteiro some quando não há mais nada de uma pessoa só */
    f.querySelector('#mp-alerta-pessoal').hidden =
      B12.textoGenerico(cTexto.value) === cTexto.value;
  });
  cTexto.addEventListener('input', function () {
    /* 24/11/2026, visto na tela: com "Oi, Ivone!" dentro, esta linha dizia
       "não tem nome dentro: vai igual para todos" — e era mentira, porque
       {nome} não é a única forma de ter nome num texto. Enquanto o aviso de
       dado pessoal está de pé, ele manda, e esta linha some. */
    var pessoal = B12.textoGenerico(cTexto.value) !== cTexto.value;
    avNome.hidden = pessoal;
    avNome.innerHTML = /\{nome\}/i.test(cTexto.value)
      ? 'O texto tem <b>{nome}</b>: cada pessoa recebe com o primeiro nome dela.'
      : 'O texto não tem nome dentro: vai <b>igual para todos</b>.';
  });
  f.querySelector('#mp-todos').onclick = function () {
    f.querySelectorAll('.mp-cx').forEach(function (c) { c.checked = true; }); recontar(); };
  f.querySelector('#mp-nenhum').onclick = function () {
    f.querySelectorAll('.mp-cx').forEach(function (c) { c.checked = false; }); recontar(); };
  recontar();

  /* lê o campo na hora de mandar: se ele ajustou a frase, é a ajustada que sai */
  function textoDe(p) {
    return B12.preencherMensagem(f.querySelector('#mp-texto').value,
      { nome: p.nome, cod: p.cod, data: p.volta || '' });
  }

  /* O GRUPO. Texto único, sem nome de ninguém: num grupo não existe "cada um
     recebe o seu". Se ainda houver dado de uma pessoa só dentro, isso vira o
     código da Ivone no grupo dos vinte — então aqui o genérico não é sugestão,
     é condição. */
  f.querySelector('#mp-grupo').onclick = function () {
    var t = cTexto.value;
    var limpo = B12.textoGenerico(t);
    if (limpo !== t) {
      cTexto.value = limpo;
      cTexto.dispatchEvent(new Event('input'));
      B12.aviso('Tirei o nome, o código e o total: num grupo o texto é um só. ' +
        'Confira e toque de novo.', 'aviso');
      cTexto.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    /* sem número: o WhatsApp abre e ELE escolhe o grupo */
    B12.abrirWhats('', t);
    aoMandar(escolhidos());
    fechar();
  };

  f.querySelector('#mp-zap').onclick = function () {
    var lista = escolhidos().filter(function (p) { return p.whats; })
      .map(function (p) { return { zap: p.whats, nome: p.nome, texto: textoDe(p) }; });
    /* com a linha ligada um dia, estes mesmos vinte saem sozinhos, cada um
       com o nome da pessoa. Sem ela, vai para a fila de um a um. */
    if (B12.temLinhaWhats()) {
      B12.whatsEmMassa(lista).then(function (r) {
        if (r && r.ok) { fechar(); B12.aviso('Enviado para ' + r.enviados + '.', 'bom'); }
        else { fechar(); B12.filaWhats(lista); }
      });
      return;
    }
    fechar();
    B12.filaWhats(lista, aoMandar ? function (feitos) {
      /* a fila devolve quem ele marcou como "já mandei" */
      aoMandar(escolhidos().filter(function (p) { return feitos.indexOf(p.whats) >= 0; }));
    } : null);
  };
  f.querySelector('#mp-app').onclick = function () {
    var alvos = escolhidos().filter(function (p) { return p.clienteId; });
    var b = f.querySelector('#mp-app');
    b.disabled = true; b.textContent = 'Mandando…';
    var titulo = (msg && msg.nome) || 'Estação B12';
    Promise.all(alvos.map(function (p) {
      return B12.avEnviarPara({ clienteId: p.clienteId, titulo: titulo,
        texto: textoDe(p).replace(/\*/g, '') });
    })).then(function (rs) {
      var chegou = rs.filter(function (r) { return r && r.enviados > 0; }).length;
      /* só quem realmente recebeu conta como avisado */
      aoMandar(alvos.filter(function (p, i) { return rs[i] && rs[i].enviados > 0; }));
      fechar();
      B12.aviso(chegou
        ? 'Aviso no app entregue para ' + chegou + ' de ' + alvos.length + '.'
        : 'Nenhuma dessas pessoas tem o app instalado. Use o WhatsApp.',
        chegou ? 'bom' : 'aviso');
    });
  };
  f.querySelector('#mp-mail').onclick = function () {
    var alvos = escolhidos().filter(function (p) { return p.clienteId && p.email && p.email.indexOf('@') > 0; });
    var b = f.querySelector('#mp-mail');
    b.disabled = true; b.textContent = 'Mandando…';
    B12.emailEnviar({ titulo: (msg && msg.nome) || 'Estação B12',
      texto: B12.preencherMensagem(texto0, {}), para: 'escolhidos',
      ids: alvos.map(function (p) { return p.clienteId; }) })
      .then(function (r) {
        if (r && r.ok) aoMandar(alvos);
        fechar();
        B12.aviso(r && r.ok ? 'E-mail enviado para ' + (r.enviados || 0) + '.'
                            : (r && r.erro) || 'Não consegui mandar o e-mail.',
                  r && r.ok ? 'bom' : 'ruim');
      });
  };
};

/* escolher qual mensagem mandar para alguém.

   24/11/2026, "essas mensagens precisam estar dentro de cada cliente". Ele
   tinha razão e era pior do que parecia: a aba Mensagens dizia, escrito na
   tela, "quando você manda pela ficha dela" — e esse caminho NÃO EXISTIA.
   As mensagens que ele escrevia só podiam ser lidas e copiadas na mão, numa
   aba longe do cliente. E a ficha, ao tocar em WhatsApp, abria uma saudação
   fixa de uma linha, ignorando tudo o que ele tinha escrito.

   Agora as dele vêm primeiro, com as marcas já trocadas pelos dados da
   pessoa, e os modelos de fábrica ficam embaixo. */
B12.escolherMensagem = function (dados) {
  var minhas = (B12.minhasMensagens ? B12.minhasMensagens() : []);
  var f = document.createElement('div');
  f.className = 'folha';
  f.innerHTML = '<div class="folha-fundo"></div><div class="folha-cx">' +
    '<div class="folha-alca"></div>' +
    '<div class="folha-topo"><div><h3>Mandar mensagem</h3>' +
    '<p>' + (dados && dados.nome ? 'para ' + escM(dados.nome) : 'escolha o modelo') + '</p></div>' +
    '<button type="button" class="folha-x" aria-label="Fechar">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
    '<div class="folha-corpo acoes">' +
    (minhas.length
      ? '<div class="grupo" style="padding-left:0">Suas mensagens</div>' +
        minhas.map(function (m) {
          return '<button type="button" class="acao" data-minha="' + escM(m.id) + '">' +
            '<span class="bolinha" style="background:var(--turq-600)"></span>' +
            '<span class="txt"><b>' + escM(m.nome) + '</b><small>' + escM(m.quando || '') + '</small></span>' +
            '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>';
        }).join('') +
        '<div class="grupo" style="padding-left:0">Modelos da casa</div>'
      : '') +
    B12.MODELOS.map(function (m) {
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
  f.querySelector('.folha-x').onclick = fechar;
  f.querySelectorAll('[data-msg]').forEach(function (b) {
    b.onclick = function () { fechar(); B12.folhaMensagem(b.dataset.msg, dados || {}); };
  });
  f.querySelectorAll('[data-minha]').forEach(function (b) {
    b.onclick = function () {
      fechar();
      B12.folhaMinhaMensagem(minhas.filter(function (x) { return x.id === b.dataset.minha; })[0], dados || {});
    };
  });
};

})();
