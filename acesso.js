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

var SESSAO = 'b12_sessao', ERROS = 'b12_pin_erros', BLOQ = 'b12_pin_bloq',
    PINS   = 'b12_pins';
var DURACAO = 12 * 60 * 60 * 1000;          /* 12 horas sem pedir de novo */
var MAX_ERROS = 5, TEMPO_BLOQ = 60 * 1000;   /* 5 erros = 1 minuto de espera */

B12.PIN_PADRAO = { dono: '2026', equipe: '1234' };   /* trocáveis em Ajustes */

/* ------------------------------------------------------------- os dois PINs
   12/11/2026. Até aqui os PINs moravam em `B12.DB.ajustes` — e `ajustes` é
   uma das coleções que a sincronia manda para o banco, na tabela
   `b12_ajustes`, que a equipe INTEIRA lê (política `ajustes_ler`, em
   nuvem/01-esquema.sql). Ou seja: qualquer marinheiro com conta podia ler o
   PIN do dono direto do Postgres, em texto aberto.

   O PIN não é dado do negócio: é a tranca DESTE aparelho. Então mora numa
   chave só dele, fora de tudo que sincroniza, fora da cópia de segurança e
   fora do arquivo de exportação. Aparelho novo começa no PIN padrão e o dono
   escolhe o dele — quem diz quem a pessoa é continua sendo a conta da nuvem,
   em "Esqueci meu PIN". */
function pins() {
  try {
    var p = JSON.parse(localStorage.getItem(PINS) || 'null');
    if (p && p.dono && p.equipe) return p;
  } catch (e) {}
  return B12.PIN_PADRAO;
}
function guardarPins(p) {
  try {
    localStorage.setItem(PINS, JSON.stringify({ dono: String(p.dono), equipe: String(p.equipe) }));
    return true;
  } catch (e) { return false; }
}
/* A MUDANÇA DE CASA, para quem já usa o app: o que estava em `ajustes` vem
   para a chave nova e SAI de `ajustes`. Roda no B12.carregar (o banco deste
   aparelho) e também em cada linha de ajustes que chega da nuvem — porque um
   aparelho que ainda não atualizou continua mandando o campo velho, e a linha
   que já está no banco hoje traz o PIN. Ninguém perde o PIN que escolheu: ele
   só muda de lugar. */
B12.pinsMigrar = function (a) {
  a = a || (B12.DB && B12.DB.ajustes);
  if (!a || !a.pins) return false;
  var meus = null;
  try { meus = JSON.parse(localStorage.getItem(PINS) || 'null'); } catch (e) {}
  /* o PIN deste aparelho vale mais que o que chegou de fora */
  if (!(meus && meus.dono && meus.equipe) && a.pins.dono && a.pins.equipe) guardarPins(a.pins);
  delete a.pins;
  return true;
};

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
/* =========================================================== A ENTRADINHA
   12/11/2026, pedido do Eugênio: "importante separar a área do Dhalsin, que é
   o dono, do login de funcionário... tem que separar isso já ali na entradinha".

   Até aqui havia UMA caixa de PIN e o papel saía de qual PIN a pessoa digitou.
   Funcionava, mas era invisível: ninguém sabia que existiam dois acessos, e o
   Dhalsin não tinha como explicar isso para a equipe apontando a tela.

   Agora a porta pergunta primeiro QUEM está entrando, e cada porta só aceita
   o PIN dela. Quem entra como funcionário não vê Financeiro nem Estação B12 —
   e isso não é só a tela escondendo: com a nuvem ligada, o banco também não
   entrega lançamento nem conta para quem não é dono (RLS). */
B12.escolherPorta = function (depois) {
  var antiga = document.getElementById('portao'); if (antiga) antiga.remove();
  var f = document.createElement('div');
  f.className = 'portao'; f.id = 'portao';
  f.innerHTML =
    '<div class="portao-cx">' +
      '<div class="portao-selo">' + (B12.FAROL || '') + '</div>' +
      '<h2>Quem está entrando?</h2>' +
      '<p>Cada um tem o seu PIN. São áreas diferentes.</p>' +
      '<div class="portas">' +
        '<button type="button" class="porta" data-papel="dono">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V8l7-5 7 5v13"/>' +
          '<path d="M9 21v-6h6v6"/></svg>' +
          '<b>Proprietário</b><small>Tudo, inclusive o dinheiro</small></button>' +
        '<button type="button" class="porta" data-papel="equipe">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
          '<circle cx="12" cy="7" r="4"/></svg>' +
          '<b>Funcionário</b><small>O dia a dia. Sem o financeiro.</small></button>' +
      '</div>' +
      '<button type="button" class="btn sec" id="porta-voltar">Voltar</button>' +
    '</div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('#porta-voltar').onclick = function () { fechar(); B12.ir('inicio'); };
  f.querySelectorAll('[data-papel]').forEach(function (b) {
    b.onclick = function () {
      var papel = b.dataset.papel;
      fechar();
      B12.portao(papel, depois, { exato: true });
    };
  });
};

B12.portao = function (papelMinimo, depois, opc) {
  opc = opc || {};
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
      '<button type="button" class="portao-link" id="portao-esqueci">Esqueci meu PIN</button>' +
      '<small>O PIN fica só neste aparelho. Quem manda de verdade é a sua conta da nuvem: ' +
      'é por ela que você recupera o PIN se esquecer.</small>' +
    '</div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';

  var campo = f.querySelector('#portao-pin'), erro = f.querySelector('#portao-erro');
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('#portao-voltar').onclick = function () {
    fechar();
    /* veio da entradinha: volta para a escolha, não para fora do app */
    if (opc.exato) B12.escolherPorta(depois); else B12.ir('inicio');
  };

  /* ------------------------------------------------ esqueci meu PIN
     12/11/2026. Até aqui, PIN esquecido = ligar para quem instalou o app.
     Para um dono que vai usar isto sozinho, todo dia, isso não serve.

     O PIN é só a tranca rápida DESTE aparelho. Quem diz quem a pessoa é,
     de verdade, é a conta da nuvem — e o PAPEL dela sai do banco, não
     daqui (ver nuvEntrar → nuvPapel). Então recuperar o PIN é: entrar com
     a conta, o banco dizer que é o dono, e aí escolher um PIN novo.

     O que NÃO se faz aqui: mostrar o PIN atual, mandar PIN por e-mail, ou
     aceitar qualquer conta que consiga logar. Conta sem papel de dono não
     destranca a área do dono. */
  f.querySelector('#portao-esqueci').onclick = function () {
    if (!B12.NUVEM || !B12.NUVEM.url) {
      erro.innerHTML = 'Este aparelho não está ligado na nuvem, então eu não tenho ' +
        'como conferir quem é você. Fale com quem instalou o app.';
      erro.hidden = false; return;
    }
    var cx = f.querySelector('.portao-cx');
    cx.innerHTML =
      '<div class="portao-selo">' + (B12.FAROL || '') + '</div>' +
      '<h2>Esqueci meu PIN</h2>' +
      '<p>Entre com a sua conta da Estação B12 — o mesmo e-mail e senha da nuvem. ' +
      'Confirmando, você escolhe um PIN novo.</p>' +
      '<form class="portao-form" id="rec-form" novalidate>' +
        '<input id="rec-email" type="email" inputmode="email" autocomplete="username" ' +
        'placeholder="seu e-mail" aria-label="E-mail">' +
        '<input id="rec-senha" type="password" autocomplete="current-password" ' +
        'placeholder="sua senha" aria-label="Senha">' +
        '<div class="portao-erro" id="rec-erro" hidden></div>' +
        '<button type="submit" class="btn pri" id="rec-ok">Entrar</button>' +
        '<button type="button" class="btn sec" id="rec-voltar">Voltar</button>' +
      '</form>';
    var rerro = cx.querySelector('#rec-erro'), bot = cx.querySelector('#rec-ok');
    cx.querySelector('#rec-voltar').onclick = function () { fechar(); B12.portao(papelMinimo, depois); };
    setTimeout(function () { cx.querySelector('#rec-email').focus(); }, 120);

    cx.querySelector('#rec-form').onsubmit = function (ev) {
      ev.preventDefault();
      rerro.hidden = true;
      bot.disabled = true; bot.textContent = 'Conferindo…';
      B12.nuvEntrar(cx.querySelector('#rec-email').value, cx.querySelector('#rec-senha').value)
        .then(function (r) {
          bot.disabled = false; bot.textContent = 'Entrar';
          if (r && r.erro) { rerro.textContent = r.erro; rerro.hidden = false; return; }
          var quem = B12.nuvQuem() || {};
          if (papelMinimo === 'dono' && quem.papel !== 'dono') {
            rerro.textContent = 'Esta conta entra na B12, mas não é a do proprietário. ' +
              'Esta área é só do dono.';
            rerro.hidden = false; return;
          }
          limpaErros();
          novoPin(cx, quem.papel === 'dono' ? 'dono' : 'equipe');
        })
        .catch(function () {
          bot.disabled = false; bot.textContent = 'Entrar';
          rerro.textContent = 'A internet não respondeu. Tente de novo em um instante.';
          rerro.hidden = false;
        });
    };
  };

  /* escolher o PIN novo, com confirmação — digitar errado aqui tranca a porta */
  function novoPin(cx, papel) {
    cx.innerHTML =
      '<div class="portao-selo">' + (B12.FAROL || '') + '</div>' +
      '<h2>Escolha um PIN novo</h2>' +
      '<p>De 4 a 6 números. É ele que você vai digitar para abrir ' +
      (papel === 'dono' ? 'o painel' : 'a área da equipe') + ' neste aparelho.</p>' +
      '<form class="portao-form" id="np-form" novalidate>' +
        '<input id="np-1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" ' +
        'autocomplete="new-password" placeholder="PIN novo" aria-label="PIN novo">' +
        '<input id="np-2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" ' +
        'autocomplete="new-password" placeholder="repita o PIN" aria-label="Repita o PIN">' +
        '<div class="portao-erro" id="np-erro" hidden></div>' +
        '<button type="submit" class="btn pri">Guardar e entrar</button>' +
      '</form>';
    var e1 = cx.querySelector('#np-1'), e2 = cx.querySelector('#np-2'),
        nerro = cx.querySelector('#np-erro');
    setTimeout(function () { e1.focus(); }, 120);
    cx.querySelector('#np-form').onsubmit = function (ev) {
      ev.preventDefault();
      var a = String(e1.value || '').trim(), b = String(e2.value || '').trim();
      if (!/^[0-9]{4,6}$/.test(a)) {
        nerro.textContent = 'O PIN tem de 4 a 6 números.'; nerro.hidden = false; return;
      }
      if (a !== b) {
        nerro.textContent = 'Os dois campos não bateram. Digite de novo.';
        nerro.hidden = false; e2.value = ''; e2.focus(); return;
      }
      var outro = pins();
      var gravou = guardarPins(papel === 'dono'
        ? { dono: a, equipe: outro.equipe }
        : { dono: outro.dono, equipe: a });
      if (!gravou) {
        nerro.textContent = 'Não consegui guardar o PIN neste aparelho.';
        nerro.hidden = false; return;
      }
      B12.entrar(papel);
      fechar();
      if (depois) depois(papel);
    };
  }
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

    /* porta escolhida na entradinha: só o PIN dela entra. Sem isto a separação
       seria só enfeite — o dono entraria pela porta do funcionário e a equipe
       nunca entenderia que são dois acessos. */
    var erradaDePorta = opc.exato && papel && papel !== papelMinimo;
    if (!papel || erradaDePorta || (papelMinimo === 'dono' && papel !== 'dono')) {
      var travou = registraErro();
      campo.value = ''; campo.classList.remove('treme'); void campo.offsetWidth; campo.classList.add('treme');
      erro.textContent = !papel
        ? (travou ? 'PIN errado cinco vezes. Espere um minuto.' : 'PIN incorreto.')
        : papel === 'dono'
          ? 'Esse é o PIN do proprietário. Volte e entre pela porta dele.'
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
      B12.f_campo('Lugares por saída', 'vagas', { tipo:'number', modo:'numeric', valor: g.vagas || B12.CAPACIDADE }) +
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
        ['nao','Desligada — só texto (padrão)'],
        ['aparelho','Voz do próprio aparelho (de graça)'],
        ['elevenlabs','Voz profissional da ElevenLabs (usa a chave abaixo)']],
        B12.iaVozModo ? B12.iaVozModo() : 'nao') +
      B12.f_campo('Chave da ElevenLabs', 'chave11', { tipo:'password', valor: B12.iaChave11 ? B12.iaChave11() : '',
        dica:'sk_…', ajuda:'Opcional. Também fica só neste aparelho. Sem ela, o app usa a voz do celular.' }) +
      B12.f_lista('Qual voz', 'voz11', (B12.VOZES_11 || []).map(function (v) { return [v[0], v[1]]; }),
        B12.iaVoz11 ? B12.iaVoz11() : '') +
      '<div class="ajuda">Todas falam português do Brasil. Só valem com a chave acima preenchida.</div>' +
      '<button type="button" class="btn sec" id="b-ouvir-voz" style="margin-top:10px">Ouvir um exemplo</button>' +
      '<div class="ajuda" id="voz-aviso">' + (B12.iaVozEstado ? (function (e) {
        return e.modo === 'elevenlabs' ? 'Agora: voz profissional da ElevenLabs.'
             : e.modo === 'nao' ? 'Agora: desligada.'
             : e.temChave ? 'Agora: voz do aparelho (você escolheu assim).'
             : 'Agora: voz do aparelho. Sem a chave, é só esta.'; })(B12.iaVozEstado()) : '') + '</div>' +
      '<div class="grupo">Motor do assistente</div>' +
      B12.f_lista('Qual motor', 'motor', (B12.MOTORES || []).map(function (m) { return [m[0], m[1]]; }),
        B12.iaMotor ? B12.iaMotor() : '') +
      '<div class="ajuda">Vale quando você usa a sua chave da Anthropic. Pelo cofre da Ti Artes o motor é o rápido.</div>' +
      '<div class="grupo">Versão</div>' +
      '<div class="ajuda">Este aparelho está na <b>' + (B12.VERSAO || '?') + '</b>. O app confere sozinho ' +
      'se existe versão nova toda vez que você volta para ele, quando a internet volta e a cada 10 minutos. ' +
      'Se quiser forçar agora, toque abaixo.</div>' +
      '<button type="button" class="btn sec" id="b-forcar-versao" style="margin-top:10px">Procurar versão nova agora</button>',
    acao: 'Salvar ajustes',
    aoAbrir: function (form) {
      var ouvir = form.querySelector('#b-ouvir-voz');
      if (ouvir) ouvir.onclick = function () {
        var aviso = form.querySelector('#voz-aviso');
        /* guarda o que está digitado antes de tocar, senão testa o que estava antes */
        var k = form.querySelector('[name=chave11]'), vz = form.querySelector('[name=voz11]'), md = form.querySelector('[name=vozModo]');
        if (B12.iaGuardarChave11) B12.iaGuardarChave11(k ? k.value : '', vz ? vz.value : '');
        if (B12.iaTrocarVoz && md) B12.iaTrocarVoz(md.value);
        ouvir.disabled = true; ouvir.textContent = 'Tocando…';
        aviso.textContent = ''; aviso.style.color = '';
        B12.iaTestarVoz().then(function (r) {
          ouvir.disabled = false; ouvir.textContent = 'Ouvir um exemplo';
          if (r.erro) { aviso.textContent = r.erro; aviso.style.color = 'var(--ruim)'; }
          else { aviso.textContent = r.modo === 'elevenlabs'
            ? 'Tocando pela ElevenLabs, com a voz escolhida.' : 'Tocando com a voz do próprio aparelho.';
            aviso.style.color = 'var(--bom)'; }
        });
      };
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
      if (!guardarPins({ dono: novoDono, equipe: novaEquipe }))
        return { erro: 'Não consegui guardar o PIN neste aparelho.' };
      a.grade = { ida: ida, volta: volta, vagas: Number(d.vagas) || B12.CAPACIDADE };
      a.patio = { regra: d.patioRegra === '24h' ? '24h' : 'dia',
                  tolerancia: Math.max(0, Number(d.patioTol) || 0),
                  cobranca: d.patioCobranca === 'chegada' ? 'chegada' : 'saida' };
      if (B12.iaGuardarChave11 && d.chave11 !== undefined) B12.iaGuardarChave11(d.chave11, d.voz11);
      if (B12.iaTrocarVoz && d.vozModo) B12.iaTrocarVoz(d.vozModo);
      if (B12.iaTrocarMotor && d.motor) B12.iaTrocarMotor(d.motor);
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
