/* ============================================================================
   Estação B12 — acesso restrito
   ----------------------------------------------------------------------------
   Três papéis: turista (sem senha), equipe (PIN) e dono (PIN). O painel do
   proprietário e a operação da equipe ficam atrás de um portão. O turista
   não vê nada de dinheiro nem de escala.

   Sinceridade sobre o que isto é: um PIN dentro do aparelho é a tranca da
   porta, não o cofre. Quem souber abrir o armazenamento do celular consegue
   ler os dados que já estão lá. A proteção de verdade vem com a nuvem: o
   Supabase só entrega os dados a quem fez login, e a trava por linha (RLS)
   impede a equipe de ler o que é só do dono. Este arquivo já é desenhado
   para ser trocado por isso sem mexer nas telas.
   ========================================================================== */
var B12 = window.B12 || {};

(function () {

var SESSAO = 'b12_sessao', ERROS = 'b12_pin_erros', BLOQ = 'b12_pin_bloq';
var DURACAO = 12 * 60 * 60 * 1000;          /* 12 horas sem pedir de novo */
var MAX_ERROS = 5, TEMPO_BLOQ = 60 * 1000;   /* 5 erros = 1 minuto de espera */

B12.PIN_PADRAO = { dono: '2026', equipe: '1234' };   /* trocáveis em Ajustes */

function pins() {
  var a = B12.DB && B12.DB.ajustes;
  if (a && a.pins && a.pins.dono && a.pins.equipe) return a.pins;
  return B12.PIN_PADRAO;
}

/* ------------------------------------------------------------- sessão */
B12.papel = function () {
  try {
    var s = JSON.parse(localStorage.getItem(SESSAO) || 'null');
    if (!s || !s.papel || !s.ate || Date.now() > s.ate) return 'turista';
    return s.papel;
  } catch (e) { return 'turista'; }
};
B12.entrar = function (papel) {
  try { localStorage.setItem(SESSAO, JSON.stringify({ papel: papel, ate: Date.now() + DURACAO })); }
  catch (e) {}
  if (B12.iaBolhaFlutuante) B12.iaBolhaFlutuante();
};
B12.sair = function () {
  try { localStorage.removeItem(SESSAO); } catch (e) {}
  if (B12.iaFecharGaveta) B12.iaFecharGaveta();
  if (B12.iaBolhaFlutuante) B12.iaBolhaFlutuante();
  B12.ir('inicio');
};
B12.pode = function (papelMinimo) {
  var p = B12.papel();
  if (papelMinimo === 'dono') return p === 'dono';
  if (papelMinimo === 'equipe') return p === 'dono' || p === 'equipe';
  return true;
};

/* ------------------------------------------------------------- portão */
function bloqueadoAte() { try { return +localStorage.getItem(BLOQ) || 0; } catch (e) { return 0; } }
function erros() { try { return +localStorage.getItem(ERROS) || 0; } catch (e) { return 0; } }
function registraErro() {
  var n = erros() + 1;
  try { localStorage.setItem(ERROS, String(n)); } catch (e) {}
  if (n >= MAX_ERROS) {
    try { localStorage.setItem(BLOQ, String(Date.now() + TEMPO_BLOQ)); localStorage.setItem(ERROS, '0'); } catch (e) {}
    return true;
  }
  return false;
}
function limpaErros() { try { localStorage.removeItem(ERROS); localStorage.removeItem(BLOQ); } catch (e) {} }

/* Abre a tela de PIN. `papelMinimo` é 'equipe' ou 'dono'. `depois(papel)` roda
   quando a pessoa entra com um PIN que basta para aquela área. */
B12.portao = function (papelMinimo, depois) {
  if (B12.pode(papelMinimo)) { if (depois) depois(B12.papel()); return; }
  var antiga = document.getElementById('portao'); if (antiga) antiga.remove();

  var f = document.createElement('div');
  f.className = 'portao'; f.id = 'portao';
  f.innerHTML =
    '<div class="portao-cx">' +
      '<div class="portao-selo">' + (B12.FAROL || '') + '</div>' +
      '<h2>Área restrita</h2>' +
      '<p>' + (papelMinimo === 'dono' ? 'Só o proprietário entra aqui.' : 'Equipe e proprietário da Estação B12.') + '</p>' +
      '<form class="portao-form" novalidate>' +
        '<input id="portao-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" ' +
        'autocomplete="off" placeholder="••••" aria-label="PIN">' +
        '<div class="portao-erro" id="portao-erro" hidden></div>' +
        '<button type="submit" class="btn pri">Entrar</button>' +
        '<button type="button" class="btn sec" id="portao-voltar">Voltar</button>' +
      '</form>' +
      '<small>O PIN fica só neste aparelho. Na versão com a nuvem, o login é por conta, e os dados só saem do servidor para quem entrou.</small>' +
    '</div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';

  var campo = f.querySelector('#portao-pin'), erro = f.querySelector('#portao-erro');
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('#portao-voltar').onclick = function () { fechar(); B12.ir('inicio'); };
  setTimeout(function () { campo.focus(); }, 120);

  f.querySelector('form').onsubmit = function (ev) {
    ev.preventDefault();
    var ate = bloqueadoAte();
    if (Date.now() < ate) {
      erro.textContent = 'Muitas tentativas. Espere ' + Math.ceil((ate - Date.now()) / 1000) + ' segundos.';
      erro.hidden = false; return;
    }
    var v = String(campo.value || '').trim(), p = pins(), papel = null;
    if (v && v === p.dono) papel = 'dono';
    else if (v && v === p.equipe) papel = 'equipe';

    if (!papel || (papelMinimo === 'dono' && papel !== 'dono')) {
      var travou = registraErro();
      campo.value = ''; campo.classList.remove('treme'); void campo.offsetWidth; campo.classList.add('treme');
      erro.textContent = !papel ? (travou ? 'PIN errado cinco vezes. Espere um minuto.' : 'PIN incorreto.')
                                : 'Este PIN é da equipe. Esta área é só do proprietário.';
      erro.hidden = false; campo.focus();
      return;
    }
    limpaErros();
    B12.entrar(papel);
    fechar();
    if (depois) depois(papel);
  };
};

/* ------------------------------------------------ ajustes (só o dono) */
B12.formAjustes = function (depois) {
  if (!B12.pode('dono')) return B12.portao('dono', function () { B12.formAjustes(depois); });
  var a = B12.DB.ajustes, p = pins(), g = a.grade || B12.GRADE_PADRAO;
  B12.folha({
    titulo: 'Ajustes do proprietário',
    sub: 'PINs, grade de horários, regras do pátio e do caixa. Os preços ficam na aba Preços.',
    corpo:
      '<div class="grupo">Acesso</div>' +
      B12.f_campo('Novo PIN do proprietário', 'pinDono', { tipo:'password', modo:'numeric', max:6,
        dica:'deixe vazio para manter', ajuda:'4 a 6 números. Hoje: ' + '•'.repeat(p.dono.length) }) +
      B12.f_campo('Novo PIN da equipe', 'pinEquipe', { tipo:'password', modo:'numeric', max:6,
        dica:'deixe vazio para manter', ajuda:'A equipe vê a escala e o pátio, nunca o dinheiro.' }) +
      '<div class="grupo">Grade de horários padrão</div>' +
      B12.f_campo('Saídas de ida', 'gradeIda', { valor: g.ida.join(', '),
        ajuda:'Horários separados por vírgula. Valem para qualquer dia sem escala própria.' }) +
      B12.f_campo('Retornos da Ilha', 'gradeVolta', { valor: g.volta.join(', '),
        ajuda:'É esta lista que o turista vê no dia da volta.' }) +
      B12.f_campo('Lugares por saída', 'vagas', { tipo:'number', modo:'numeric', valor: g.vagas || 12 }) +
      '<div class="grupo">Estacionamento</div>' +
      '<div class="ajuda">O valor da diária fica na aba <b>Preços</b>. Aqui são só as regras.</div>' +
      B12.f_lista('Como contar as diárias', 'patioRegra', [['dia','Por dia de calendário (entrou dia 5, saiu dia 7 = 2 diárias)'],
        ['24h','A cada 24 horas desde a hora de entrada']], (a.patio || {}).regra || 'dia') +
      B12.f_campo('Tolerância (minutos)', 'patioTol', { tipo:'number', modo:'numeric', valor: (a.patio || {}).tolerancia || 60,
        ajuda:'Só na regra de 24 horas: folga antes de contar a diária seguinte.' }) +
      B12.f_lista('Quando cobrar, por padrão', 'patioCobranca', [['saida','Na saída, pelo tempo real'],
        ['chegada','Na chegada, pelo tempo previsto (acerta a diferença na saída)']], (a.patio || {}).cobranca || 'saida') +
      '<div class="grupo">Caixa</div>' +
      B12.f_campo('Meta do mês', 'metaMensal', { tipo:'number', modo:'numeric', valor: a.metaMensal }) +
      B12.f_campo('Reserva mínima de caixa', 'reservaMinima', { tipo:'number', modo:'numeric', valor: a.reservaMinima,
        ajuda:'O intocável da baixa temporada. Entra na conta do "quanto posso retirar".' }) +
      '<div class="grupo">Demonstração</div>' +
      '<div class="ajuda">Os passageiros, carros e lançamentos de exemplo se renovam sozinhos a cada dia. ' +
      'O que você registrar de verdade fica. Para recomeçar a demonstração agora:</div>' +
      '<button type="button" class="btn sec" id="b-refrescar-demo" style="margin-top:10px">Recarregar dados de demonstração</button>' +
      '<div class="grupo">Assistente</div>' +
      B12.f_campo('Chave da Anthropic', 'chaveIA', { tipo:'password', valor: B12.iaChave ? B12.iaChave() : '',
        dica:'sk-ant-…',
        ajuda:'Liga o assistente na hora, usando a sua conta. A chave fica guardada SÓ neste aparelho, ' +
              'nunca vai para a internet nem para o repositório. Deixe vazio para apagar.' }) +
      B12.f_lista('Voz das respostas', 'vozModo', [
        ['aparelho','Voz do próprio aparelho (de graça)'],
        ['elevenlabs','Voz profissional da ElevenLabs (usa a chave abaixo)'],
        ['nao','Desligada — só texto']], B12.iaVozModo ? B12.iaVozModo() : 'aparelho') +
      B12.f_campo('Chave da ElevenLabs', 'chave11', { tipo:'password', valor: B12.iaChave11 ? B12.iaChave11() : '',
        dica:'sk_…', ajuda:'Opcional. Também fica só neste aparelho. Sem ela, o app usa a voz do celular.' }) +
      B12.f_campo('Voz escolhida (ID)', 'voz11', { valor: B12.iaVoz11 ? B12.iaVoz11() : '',
        ajuda:'O identificador da voz no painel da ElevenLabs. O padrão já fala português.' }) +
      '<div class="grupo">Versão</div>' +
      '<div class="ajuda">Este aparelho está na <b>' + (B12.VERSAO || '?') + '</b>. O app confere sozinho ' +
      'se existe versão nova toda vez que você volta para ele, quando a internet volta e a cada 10 minutos. ' +
      'Se quiser forçar agora, toque abaixo.</div>' +
      '<button type="button" class="btn sec" id="b-forcar-versao" style="margin-top:10px">Procurar versão nova agora</button>',
    acao: 'Salvar ajustes',
    aoAbrir: function (form) {
      var f = form.querySelector('#b-forcar-versao');
      if (f) f.onclick = function () {
        f.disabled = true; f.textContent = 'Procurando…';
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.update().catch(function () {}); }));
          }).then(function () { setTimeout(function () { location.reload(true); }, 900); });
        } else setTimeout(function () { location.reload(true); }, 400);
      };
      var b = form.querySelector('#b-refrescar-demo');
      if (b) b.onclick = function () {
        B12.refrescarDemo(true); B12.fecharFolha();
        if (B12.admDesenhar) B12.admDesenhar();
      };
    },
    aoSalvar: function (d) {
      function lista(t) { return String(t || '').split(',').map(function (x) { return x.trim(); })
        .filter(function (x) { return /^\d{1,2}:\d{2}$/.test(x); }).sort(); }
      var ida = lista(d.gradeIda), volta = lista(d.gradeVolta);
      if (!ida.length || !volta.length) return { erro: 'Informe ao menos um horário de ida e um de volta, no formato 08:30.' };
      if (d.pinDono && !/^\d{4,6}$/.test(d.pinDono)) return { erro: 'O PIN do proprietário precisa ter de 4 a 6 números.' };
      if (d.pinEquipe && !/^\d{4,6}$/.test(d.pinEquipe)) return { erro: 'O PIN da equipe precisa ter de 4 a 6 números.' };
      var novoDono = d.pinDono || p.dono, novaEquipe = d.pinEquipe || p.equipe;
      if (novoDono === novaEquipe) return { erro: 'O PIN do proprietário não pode ser igual ao da equipe.' };
      a.pins = { dono: novoDono, equipe: novaEquipe };
      a.grade = { ida: ida, volta: volta, vagas: Number(d.vagas) || 12 };
      a.patio = { regra: d.patioRegra === '24h' ? '24h' : 'dia',
                  tolerancia: Math.max(0, Number(d.patioTol) || 0),
                  cobranca: d.patioCobranca === 'chegada' ? 'chegada' : 'saida' };
      if (B12.iaGuardarChave11 && d.chave11 !== undefined) B12.iaGuardarChave11(d.chave11, d.voz11);
      if (B12.iaTrocarVoz && d.vozModo) B12.iaTrocarVoz(d.vozModo);
      if (B12.iaGuardarChave && d.chaveIA !== undefined) {
        var ck = B12.iaGuardarChave(d.chaveIA);
        if (ck.erro) return { erro: ck.erro };
      }
      a.metaMensal = Number(d.metaMensal) || a.metaMensal;
      a.reservaMinima = Number(d.reservaMinima) || a.reservaMinima;
      B12.salvar();
      return { ok: true };
    },
    depois: depois
  });
};

/* ---------------------------------- recuperar reserva pelo código */
B12.formRecuperar = function (depois) {
  B12.folha({
    titulo: 'Já tenho um código',
    sub: 'Mostre sua reserva neste aparelho',
    corpo:
      B12.f_campo('Código da reserva', 'cod', { dica:'B12-4821', max:8, obrig:true,
        ajuda:'Está na mensagem de confirmação do WhatsApp.' }) +
      B12.f_campo('Últimos 4 números do seu WhatsApp', 'zap4', { tipo:'tel', modo:'numeric', max:4,
        dica:'0000', obrig:true, ajuda:'Só para confirmar que a reserva é sua.' }),
    acao: 'Buscar reserva',
    aoSalvar: function (d) {
      var r = B12.acharReserva(d.cod, d.zap4);
      if (!r) return { erro: 'Não achei essa reserva neste aparelho. Confira o código e os 4 números. ' +
        'Na versão com a nuvem, a busca vale em qualquer celular.' };
      return { ok: true, reserva: r };
    },
    depois: depois
  });
};

})();
