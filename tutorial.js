/* ============================================================================
   Estação B12 — o tutorial que fala

   O Dhalsin anota tudo no papel. Manual escrito ele não lê; vídeo ele não acha
   na hora que precisa. Então o tutorial mora DENTRO do painel, é curto, é da
   ABA em que ele está agora, e pode ser OUVIDO em vez de lido.

   Regras que vieram do jeito dele:
   - uma frase por passo, sem palavra de computador
   - o passo ACENDE o que está falando, para ele achar com o olho
   - a voz é a do próprio celular (de graça, funciona sem internet)
   - aparece sozinho só UMA vez por aba; depois, só se ele pedir no "?"
   ========================================================================== */
(function () {
  'use strict';

  var VISTO = 'b12_tutorial_visto';

  /* alvo: o que acende na tela. Se não achar, o passo só fala. */
  var AULAS = {
    hoje: {
      titulo: 'A tela do dia',
      passos: [
        { t: 'Esta é a tela que você abre todo dia. O número grande diz quantas pessoas viajam hoje.', a: '.db-dia' },
        { t: 'Aqui aparece o que precisa de você agora: conta vencendo, gente na Ilha sem horário de volta. Quando não há nada, some.', a: '.cx.aviso, .lembretes' },
        { t: 'Quanto entrou hoje, e o desenho dos últimos quatorze dias. Toque em "ver o caixa" para abrir tudo.', a: '[data-ir-caixa]' },
        { t: 'Quem está na Ilha neste momento, e quantos voltam hoje.', a: '[data-ir-ilha]' },
        { t: 'Os próximos dias. É daqui que você vê quem volta antes de montar os horários.', a: '[data-ir-volta]' }
      ]
    },
    balcao: {
      titulo: 'Cadastrar quem chegou',
      passos: [
        { t: 'Chegou gente no balcão? É aqui. A tela já abre com a ficha pronta para escrever, igual ao seu bloco de papel.', a: '.ficha-caixa' },
        { t: 'Se a pessoa já reservou pelo celular, ela está na linha de cima. Toque em "Chegou" e não precisa escrever ficha nova.', a: '.dobra' },
        { t: 'Pessoas no veículo e pagantes são números diferentes. Criança pequena vai no carro mas não paga.', a: '[name=pagantes]' },
        { t: 'Consumo: cerveja, café, camiseta. Toque no mais e some na conta da pessoa.', a: '#b-consumo' },
        { t: 'O valor é seu. Digite quanto combinou. A tabela aparece só como sugestão, e você usa se quiser.', a: '[name=valorManual]' },
        { t: 'No fim, a viagem ganha um código. É esse código que a pessoa mostra na volta.', a: null }
      ]
    },
    travessia: {
      titulo: 'A operação da lancha',
      passos: [
        { t: 'Reservas: tudo que foi reservado, num lugar só. A primeira fatia é “para confirmar” — é o que depende de você.', a: '[data-aba=reservas]' },
        { t: 'Horários: é onde você monta as saídas e as voltas do dia. Horário que já tem gente marcada não some sem aviso.', a: '[data-aba=escala]' },
        { t: 'Na Ilha: quem está lá agora, há quantos dias, e quem ainda não marcou a volta.', a: '[data-aba=ilha]' },
        { t: 'Marinheiros: a ficha de quem pilota. O app avisa trinta dias antes da habilitação vencer, e manda a escala no WhatsApp dele.', a: '[data-aba=marinheiros]' },
        { t: 'Pátio: os carros que estão dentro, desde quando, e quanto já deu de diária.', a: '[data-aba=patio]' }
      ]
    },
    clientes: {
      titulo: 'Quem já viajou com você',
      passos: [
        { t: 'Toda pessoa que você cadastra fica aqui para sempre, com o telefone e o histórico.', a: null },
        { t: 'Toque num nome e veja quantas viagens fez e quanto já gastou. É com isso que se dá desconto para quem merece.', a: null },
        { t: 'A lupa lá em cima acha qualquer um: pelo código, pelo nome, pelo WhatsApp ou pela placa do carro.', a: '.lupa' }
      ]
    },
    avisos: {
      titulo: 'Falar com os clientes',
      passos: [
        { t: 'Daqui você fala com quem já viajou com a B12. Dois caminhos: aviso no celular de quem instalou o app, ou e-mail.', a: '.canais' },
        { t: 'Escolha o motivo e o texto já nasce escrito. Previsão do fim de semana, ondas para o surf, evento na Ilha.', a: '#av-motivos' },
        { t: 'Pode mudar o texto à vontade antes de mandar. Nada sai sem você ler.', a: '#av-txt' },
        { t: 'Mande primeiro só para você, para ver como chega. Depois mande para todos.', a: '#av-eu' },
        { t: 'Só recebe quem autorizou, e todo e-mail leva um link para sair da lista. É isso que impede o seu e-mail de virar spam.', a: null }
      ]
    },
    dinheiro: {
      titulo: 'O dinheiro',
      passos: [
        { t: 'Esta parte é só sua. A funcionária não enxerga nada daqui, e a trava é no banco de dados, não é tela escondida.', a: null },
        { t: 'Caixa: o que entrou e o que saiu, por dia e por mês.', a: '[data-aba=caixa]' },
        { t: 'Lançamentos: cada entrada e cada despesa, uma por uma. É daqui que sai o relatório do contador.', a: '[data-aba=lanc]' },
        { t: 'Contas: o que vence, e o app te lembra antes.', a: '[data-aba=contas]' },
        { t: 'Preços: a tabela que serve de sugestão no balcão. Mudou aqui, vale na hora.', a: '[data-aba=precos]' }
      ]
    },
    estacao: {
      titulo: 'A empresa',
      passos: [
        { t: 'A empresa: o texto que o cliente lê sobre a B12 quando toca em "Quem somos nós".', a: '[data-aba=sobre]' },
        { t: 'Manutenção: o que foi feito na lancha, com data e valor.', a: '[data-aba=manut]' },
        { t: 'Dados: é aqui que você baixa tudo em Excel ou PDF para o contador, e onde entra na nuvem.', a: '[data-aba=dados]' }
      ]
    }
  };

  function visto() { try { return JSON.parse(localStorage.getItem(VISTO)) || {}; } catch (e) { return {}; } }
  function marcar(k) { var v = visto(); v[k] = 1; try { localStorage.setItem(VISTO, JSON.stringify(v)); } catch (e) {} }

  var atual = null, passo = 0, acesa = null;

  function apagarBrilho() {
    if (acesa) { acesa.classList.remove('tut-brilha'); acesa = null; }
  }
  function acender(sel) {
    apagarBrilho();
    if (!sel) return;
    var el = document.querySelector(sel);
    if (!el) return;
    el.classList.add('tut-brilha');
    acesa = el;
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
  }

  B12.tutFechar = function () {
    apagarBrilho();
    if (B12.iaCalar) B12.iaCalar();
    var b = document.getElementById('tut-balao');
    if (b) { b.classList.remove('on'); setTimeout(function () { b.remove(); }, 220); }
    atual = null;
  };

  B12.tutAbrir = function (chave) {
    var aula = AULAS[chave];
    if (!aula) return;
    atual = chave; passo = 0;
    var b = document.getElementById('tut-balao');
    if (b) b.remove();
    b = document.createElement('div');
    b.id = 'tut-balao'; b.className = 'tut-balao';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Como usar: ' + aula.titulo);
    b.innerHTML =
      '<div class="tut-cx">' +
        '<div class="tut-topo">' +
          '<span class="tut-tit">' + aula.titulo + '</span>' +
          '<span class="tut-conta" id="tut-conta"></span>' +
          '<button type="button" class="tut-x" id="tut-x" aria-label="Fechar o tutorial">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
          'stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
        '</div>' +
        '<p class="tut-txt" id="tut-txt" aria-live="polite"></p>' +
        '<div class="tut-pe">' +
          '<button type="button" class="tut-voz" id="tut-voz">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
          'stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>' +
          '<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>' +
          '<span id="tut-voz-txt">Ouvir</span></button>' +
          '<button type="button" class="tut-volta" id="tut-volta">Voltar</button>' +
          '<button type="button" class="tut-prox" id="tut-prox">Próximo</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('on'); });

    b.querySelector('#tut-x').onclick = B12.tutFechar;
    b.querySelector('#tut-prox').onclick = function () {
      if (passo >= aula.passos.length - 1) { marcar(chave); B12.tutFechar(); return; }
      passo++; pintar();
    };
    b.querySelector('#tut-volta').onclick = function () { if (passo > 0) { passo--; pintar(); } };
    b.querySelector('#tut-voz').onclick = function () { falar(true); };

    function pintar() {
      var p = aula.passos[passo];
      b.querySelector('#tut-txt').textContent = p.t;
      b.querySelector('#tut-conta').textContent = (passo + 1) + ' de ' + aula.passos.length;
      b.querySelector('#tut-volta').disabled = passo === 0;
      b.querySelector('#tut-prox').textContent =
        passo >= aula.passos.length - 1 ? 'Entendi' : 'Próximo';
      acender(p.a);
      if (B12.iaCalar) B12.iaCalar();
    }
    function falar(aoToque) {
      if (!B12.iaFalar) return;
      if (aoToque && B12.iaFalando && B12.iaFalando()) { B12.iaCalar(); return; }
      B12.iaFalar(aula.passos[passo].t);
    }
    pintar();
  };

  /* O "?" do cabeçalho abre a aula da aba em que ele está agora. */
  B12.tutDaAba = function () {
    var on = document.querySelector('#adm-abas .aba.on');
    var chave = on && on.dataset ? on.dataset.grupo : 'hoje';
    B12.tutAbrir(AULAS[chave] ? chave : 'hoje');
  };

  /* Primeira vez naquela aba: oferece sozinho, uma vez só. */
  B12.tutTalvez = function (chave) {
    if (!AULAS[chave] || visto()[chave]) return;
    if (document.querySelector('.folha, .portao, #tut-balao')) return;
    setTimeout(function () {
      if (!document.querySelector('.folha, .portao, #tut-balao')) B12.tutAbrir(chave);
    }, 700);
  };

  B12.tutEsquecer = function () { try { localStorage.removeItem(VISTO); } catch (e) {} };
})();
