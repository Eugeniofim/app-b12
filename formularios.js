/* ============================================================================
   Estação B12 — formulários
   Toda digitação do app passa por aqui. Uma folha que sobe de baixo, campos
   grandes, teclado certo em cada campo, e um botão só de salvar.
   Regra: nada de janela de alerta. O erro aparece no próprio campo.
   ========================================================================== */
var B12 = window.B12 || {};

(function () {

/* ------------------------------------------------------------ a folha base */
var aberta = null;

B12.folha = function (opc) {
  /* `dentro` = o formulário nasce DENTRO da tela, não como folha que sobe.
     É o que faz a aba Ficha ser a própria ficha, sem uma batida a mais para
     quem atende cinquenta pessoas por dia. Mesmo código, dois lugares. */
  var inline = !!opc.dentro;
  if (!inline) B12.fecharFolha();

  var f = document.createElement('div');
  f.className = inline ? 'folha-inline' : 'folha';
  f.innerHTML =
    (inline ? '' : '<div class="folha-fundo"></div>') +
    /* autocomplete="off" no formulário inteiro: alguns navegadores só olham
       aqui, e não campo a campo. Os dois juntos é que seguram. */
    '<form class="folha-cx" novalidate autocomplete="off">' +
      (inline ? '' : '<div class="folha-alca"></div>') +
      (inline && opc.semTopo ? '' :
      '<div class="folha-topo">' +
        '<div><h3>' + opc.titulo + '</h3>' +
        (opc.sub ? '<p>' + opc.sub + '</p>' : '') + '</div>' +
        (inline ? '' :
        '<button type="button" class="folha-x" aria-label="Fechar">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
        'stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>') +
      '</div>') +
      '<div class="folha-corpo">' + opc.corpo + '</div>' +
      '<div class="folha-pe">' +
        '<div class="folha-erro" hidden></div>' +
        (opc.extra || '') +
        '<button type="submit" class="btn pri" style="margin-top:0">' +
        (opc.acao || 'Salvar') + '</button>' +
      '</div>' +
    '</form>';

  if (inline) { opc.dentro.appendChild(f); }
  else {
    document.body.appendChild(f);
    aberta = f;
    document.body.style.overflow = 'hidden';
    if (B12.iaBolhaFlutuante) B12.iaBolhaFlutuante();
  }

  var form = f.querySelector('form');
  var erro = f.querySelector('.folha-erro');
  function fechar() { if (inline) { if (opc.aoFechar) opc.aoFechar(); } else B12.fecharFolha(); }
  var bx = f.querySelector('.folha-x');
  if (bx) bx.onclick = fechar;
  var bf = f.querySelector('.folha-fundo');
  if (bf) bf.onclick = fechar;

  form.onsubmit = function (ev) {
    ev.preventDefault();
    var dados = {};
    form.querySelectorAll('[name]').forEach(function (c) {
      dados[c.name] = c.type === 'checkbox' ? c.checked : c.value;
    });
    var r = opc.aoSalvar(dados);

    /* salvar que vai à rede devolve { esperar: promessa }: o botão fica ocupado
       e a folha só fecha quando a resposta chega. Sem isso a pessoa aperta duas
       vezes achando que não funcionou. */
    if (r && r.esperar && typeof r.esperar.then === 'function') {
      var bt = form.querySelector('button[type=submit]');
      var solta = B12.ocupar ? B12.ocupar(bt, 'Um instante…') : null;
      erro.hidden = true;
      r.esperar.then(function (res) {
        if (solta) solta();
        if (res && res.erro) {
          erro.textContent = res.erro; erro.hidden = false;
          erro.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return;
        }
        fechar();
        if (opc.depois) opc.depois(res);
      })['catch'](function () {
        if (solta) solta();
        erro.textContent = 'Não consegui falar com a nuvem. Tente de novo.';
        erro.hidden = false;
      });
      return;
    }

    if (r && r.erro) {
      erro.textContent = r.erro; erro.hidden = false;
      erro.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    erro.hidden = true;
    fechar();
    if (opc.depois) opc.depois(r);
  };
  /* foco no primeiro campo, sem levantar teclado em quem usa mouse */
  var p = form.querySelector('input:not([type=hidden]),select,textarea');
  if (p && matchMedia('(pointer:fine)').matches) setTimeout(function () { p.focus(); }, 120);
  if (opc.aoAbrir) opc.aoAbrir(form);
  return form;
};
B12.fecharFolha = function () {
  if (!aberta) return;
  aberta.remove(); aberta = null;
  document.body.style.overflow = '';
  if (B12.iaBolhaFlutuante) B12.iaBolhaFlutuante();   /* a bolha volta */
};
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') B12.fecharFolha(); });

/* ---------------------------------------------------------- peças de campo */
/* ---------------------------------------------- o preenchimento automático
   24/11/2026. Ele mandou um retrato da tela "Nova mensagem" com o NOME DELE
   escrito no campo "Nome da mensagem", e disse que o app estava todo zoado.
   Estava mesmo, e a causa era uma linha que faltava aqui.

   Nenhum campo do app dizia `autocomplete`. Então o navegador olhava o nome
   técnico do campo — `nome`, `email`, `cpf`, `cidade`, `whats` — reconhecia
   como ficha de pessoa e oferecia os dados guardados do DONO DO APARELHO.

   No balcão isso é pior que feio: o tablet é compartilhado, e o campo "Nome"
   da ficha do cliente é o mesmo `nome`. Um toque errado grava o nome de
   outra pessoa no cadastro de quem está viajando.

   Fica desligado em todo campo do app, mais as marcas que os gerenciadores
   de senha leem para não se meterem. */
var SEM_AUTO = ' autocomplete="off" autocorrect="off" spellcheck="false" ' +
               'data-lpignore="true" data-form-type="other" data-1p-ignore';
B12.SEM_AUTO = SEM_AUTO;

function campo(rot, nome, opc) {
  opc = opc || {};
  return '<label for="c-' + nome + '">' + rot + (opc.obrig ? ' *' : '') + '</label>' +
    '<input id="c-' + nome + '" name="' + nome + '" type="' + (opc.tipo || 'text') + '"' +
    (opc.auto ? ' autocomplete="' + opc.auto + '"' : SEM_AUTO) +
    (opc.modo ? ' inputmode="' + opc.modo + '"' : '') +
    (opc.passo ? ' step="' + opc.passo + '"' : '') +
    (opc.valor != null ? ' value="' + String(opc.valor).replace(/"/g, '&quot;') + '"' : '') +
    (opc.dica ? ' placeholder="' + opc.dica + '"' : '') +
    (opc.max ? ' maxlength="' + opc.max + '"' : '') + '>' +
    (opc.ajuda ? '<div class="ajuda">' + opc.ajuda + '</div>' : '');
}
function lista(rot, nome, itens, sel) {
  return '<label for="c-' + nome + '">' + rot + '</label><select id="c-' + nome +
    '" name="' + nome + '"' + SEM_AUTO + '>' + itens.map(function (i) {
      var v = Array.isArray(i) ? i[0] : i, t = Array.isArray(i) ? i[1] : i;
      return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + t + '</option>';
    }).join('') + '</select>';
}
/* LISTA EM QUE DÁ PARA ESCREVER.
   Pedido do Eugênio em 13/10: a pousada vinha como lista fechada, e pousada
   que não está cadastrada ficava de fora. Isto é um campo de texto comum com
   as sugestões penduradas (<datalist>): toca e vê a lista, ou escreve o nome
   na mão. Nativo do navegador, funciona no celular, e o que sai é texto —
   quem lê o formulário não muda nada. */
function listaLivre(rot, nome, itens, valor, dica) {
  var id = 'c-' + nome;
  return '<label for="' + id + '">' + rot + '</label>' +
    '<input id="' + id + '" name="' + nome + '" list="' + id + '-op" autocomplete="off" ' +
    'value="' + esc(valor || '') + '" placeholder="' + esc(dica || 'escolha ou escreva') + '">' +
    '<datalist id="' + id + '-op">' + itens.map(function (i) {
      return '<option value="' + esc(i) + '"></option>'; }).join('') + '</datalist>';
}

function marca(rot, nome, ligado, ajuda) {
  return '<label class="aceite"><input type="checkbox" name="' + nome + '"' +
    (ligado ? ' checked' : '') + '><span><b>' + rot + '</b>' +
    (ajuda ? '<small>' + ajuda + '</small>' : '') + '</span></label>';
}
function grupo(titulo) { return '<div class="grupo">' + titulo + '</div>'; }
B12.f_campo = campo; B12.f_lista = lista; B12.f_marca = marca;
B12.f_listaLivre = listaLivre;

/* 24/11/2026 — "A definir" entra na lista a pedido do Eugênio.
   Na B12 o cliente paga NA SAÍDA: na hora do cadastro quem atende muitas vezes
   não sabe como vai ser. Sem esta opção, todo atendimento saía marcado como
   Pix, e o relatório por forma de pagamento virava invenção.

   Fica por último, depois das formas de verdade — é um estado, não um jeito
   de pagar. Quem não cobra taxa de maquininha e não dá desconto de dinheiro
   continua certo: taxa desconhecida conta zero, e o desconto só olha
   'dinheiro'. */
var PAGAMENTOS = [['pix','Pix'],['dinheiro','Dinheiro'],['credito','Cartão de crédito'],
                  ['debito','Cartão de débito'],['transferencia','Transferência'],
                  ['adefinir','A definir']];

/* ======================================================== LANÇAMENTO (R$) */
B12.formLancamento = function (tipo, prefill, depois) {
  prefill = prefill || {};
  var ent = tipo === 'entrada';
  var cats = ent ? B12.ENTRADAS : B12.SAIDAS;
  var ultimo = prefill.cat ? B12.ultimoDe(prefill.cat) : null;
  B12.folha({
    titulo: ent ? 'Nova entrada' : 'Nova saída',
    sub: ent ? 'Dinheiro que entrou no caixa' : 'Dinheiro que saiu do caixa',
    corpo:
      campo('Valor', 'valor', { tipo:'number', passo:'0.01', modo:'decimal',
        valor: prefill.valor || '', dica:'0,00', obrig:true }) +
      campo('Data', 'data', { tipo:'date', valor: prefill.data || B12.hoje(), obrig:true }) +
      lista('Categoria', 'cat', cats, prefill.cat || cats[0]) +
      lista('Centro de custo', 'centro', B12.CENTROS, prefill.centro || (ent ? 'Lancha' : 'Lancha')) +
      campo('Descrição', 'desc', { valor: prefill.desc || '',
        dica: ent ? 'de onde veio' : 'no que foi gasto', max:80 }) +
      lista('Forma de pagamento', 'pg', PAGAMENTOS, prefill.pg || 'pix') +
      (ent ? '' :
        marca('É investimento, não custo do mês', 'investimento', !!prefill.investimento,
          'Motor, toldo, GPS, reforma. Fica fora do lucro do mês e entra no total investido na lancha.')) +
      campo('Observação', 'obs', { valor:'', dica:'opcional', max:120 }) +
      (ultimo ? '<div class="repetir">Último de ' + ultimo.cat + ': ' + B12.brl(ultimo.valor) +
        ' em ' + B12.dataBR(ultimo.data) +
        ' <button type="button" class="mini-btn" id="b-repetir">repetir valor</button></div>' : ''),
    acao: ent ? 'Lançar entrada' : 'Lançar saída',
    aoAbrir: function (form) {
      var b = form.querySelector('#b-repetir');
      if (b) b.onclick = function () { form.querySelector('[name=valor]').value = ultimo.valor;
        form.querySelector('[name=desc]').value = ultimo.desc; };
    },
    aoSalvar: function (d) {
      d.tipo = tipo;
      return B12.salvarLancamento(d);
    },
    depois: depois
  });
};

/* ============================================================ MANUTENÇÃO */
B12.formManutencao = function (depois) {
  var r = B12.resumoManutencao();
  B12.folha({
    titulo: 'Manutenção da lancha',
    sub: r.ultima ? 'Última: ' + r.ultima.descricao + ' em ' + B12.dataBR(r.ultima.data)
                  : 'Primeiro registro de manutenção',
    corpo:
      lista('Tipo', 'tipo', [['corretiva','Corretiva — quebrou e consertou'],
        ['preventiva','Preventiva — revisão programada'],
        ['investimento','Investimento — melhoria ou equipamento novo']], 'corretiva') +
      campo('O que foi feito', 'descricao', { dica:'troca de óleo, revisão da rabeta…',
        obrig:true, max:90 }) +
      campo('Peças trocadas', 'pecas', { dica:'opcional', max:90 }) +
      campo('Valor', 'valor', { tipo:'number', passo:'0.01', modo:'decimal', dica:'0,00', obrig:true }) +
      campo('Data', 'data', { tipo:'date', valor: B12.hoje(), obrig:true }) +
      campo('Oficina ou fornecedor', 'fornecedor', { dica:'opcional', max:60 }) +
      campo('Horas do motor', 'horasMotor', { tipo:'number', modo:'numeric',
        dica:'opcional', ajuda:'Ajuda a prever a próxima revisão.' }) +
      campo('Próxima revisão em', 'proxima', { tipo:'date',
        ajuda:'Se preencher, entra sozinho nas contas a pagar e avisa perto do dia.' }) +
      lista('Forma de pagamento', 'pg', PAGAMENTOS, 'pix'),
    acao: 'Registrar manutenção',
    aoSalvar: function (d) { return B12.salvarManutencao(d); },
    depois: depois
  });
};

/* ============================================================== CLIENTE */
B12.formCliente = function (cliente, depois) {
  var c = cliente || {};
  B12.folha({
    titulo: c.id ? 'Editar cliente' : 'Novo cliente',
    sub: c.id ? c.nome : 'A ficha de quem viaja com a B12',
    corpo:
      campo('Nome', 'nome', { valor: c.nome || '', obrig:true, max:60 }) +
      campo('WhatsApp', 'whats', { tipo:'tel', modo:'tel', valor: c.whats || '',
        dica:'(41) 90000-0000', ajuda:'É por aqui que a B12 confirma a reserva.' }) +
      campo('E-mail', 'email', { tipo:'email', modo:'email', valor: c.email || '',
        dica:'para a confirmação' }) +
      campo('Instagram', 'instagram', { valor: c.instagram || '', dica:'sem o @',
        ajuda:'Opcional. Só serve para divulgação, então só faz sentido com o aceite abaixo.' }) +
      campo('CPF', 'cpf', { modo:'numeric', max:14, valor: c.cpf ? B12.cpfBonito(c.cpf) : '',
        dica:'só se pedir nota', ajuda:'Não é obrigatório para viajar. Guarde só se a pessoa pedir nota fiscal: pela lei, cada dado a mais é responsabilidade a mais.' }) +
      listaLivre('Ficou em qual pousada', 'pousada',
        ['Direto (sem pousada)'].concat(B12.PARCEIROS.map(function (p) { return p.nome; })),
        c.pousada || '') +
      campo('Cidade de origem', 'cidade', { valor: c.cidade || '', dica:'opcional', max:40,
        ajuda:'Alimenta o relatório de onde vêm os clientes.' }) +
      campo('Observação', 'obs', { valor: c.obs || '', dica:'opcional', max:120 }) +
      grupo('Consentimento') +
      marca('Aceita receber ofertas e novidades', 'aceitaOfertas', !!c.aceitaOfertas,
        'Fica guardado com data e hora. Sem isso, a B12 só pode falar sobre a reserva dele.') +
      (c.id ? '<div class="perigo"><button type="button" class="mini-btn ruim" id="b-apagar">' +
        'Apagar este cliente</button><small>Some o nome e o contato. O histórico de venda ' +
        'continua, sem identificação.</small></div>' : ''),
    acao: 'Salvar ficha',
    aoAbrir: function (form) {
      var b = form.querySelector('#b-apagar');
      if (b) b.onclick = function () {
        if (!confirm('Apagar a ficha de ' + c.nome + '? O contato some para sempre.')) return;
        B12.apagarCliente(c.id); B12.fecharFolha(); if (depois) depois({ apagado:true });
      };
    },
    aoSalvar: function (d) { d.id = c.id; return B12.salvarCliente(d); },
    depois: depois
  });
};

/* ======================================================== ESTACIONAMENTO */
B12.formEntradaPatio = function (depois) {
  var cfg = B12.DB.ajustes.patio || { regra: 'dia', cobranca: 'saida' };
  B12.folha({
    titulo: 'Carro entrando',
    sub: 'Diária de ' + B12.brl(B12.DB.ajustes.diaria) + ' · ' +
         (cfg.regra === '24h' ? 'conta a cada 24 horas' : 'conta por dia de calendário'),
    corpo:
      campo('Placa', 'placa', { dica:'ABC1D23', obrig:true, max:8 }) +
      campo('Nome do dono', 'nome', { dica:'quem deixou o carro', max:60 }) +
      campo('WhatsApp', 'whats', { tipo:'tel', modo:'tel', dica:'(41) 90000-0000',
        ajuda:'Para avisar se acontecer algo com o carro.' }) +
      '<div class="par">' +
        '<div>' + campo('Modelo', 'modelo', { dica:'Gol, Onix…', max:24 }) + '</div>' +
        '<div>' + campo('Cor', 'cor', { dica:'prata', max:16 }) + '</div>' +
      '</div>' +
      '<div class="par">' +
        '<div>' + campo('Entrada', 'entrada', { tipo:'date', valor: B12.hoje() }) + '</div>' +
        '<div>' + campo('Hora', 'hora', { tipo:'time', valor: B12.horaBR(new Date().toISOString()) }) + '</div>' +
      '</div>' +
      campo('Saída prevista', 'saidaPrevista', { tipo:'date',
        ajuda:'Com a data prevista o app já diz quanto vai dar, e cobra agora se for o caso.' }) +
      campo('Vaga', 'vaga', { dica:'opcional, ex: A12', max:8 }) +
      '<div class="par">' +
        '<div>' + campo('Valor da diária', 'diaria', { tipo:'number', passo:'1', modo:'numeric',
          valor: B12.DB.ajustes.diaria }) + '</div>' +
        /* 24/11/2026, "tirar tarifa do estacionamento". A lista Tarifa saía por
           duas razões, e as duas doem:

           1. Ela APAGAVA o "Valor da diária" digitado logo acima. Quem atende
              escrevia 40, escolhia "Combinada", e o 40 virava outra coisa sem
              ninguém ver.
           2. Ela mostrava a tarifa combinada escrita por extenso, numa tela
              usada no balcão com o cliente do lado. Esse valor é decisão do
              Dhalsin e nunca pode aparecer para quem está viajando.

           No lugar entra o mesmo campo da ficha do balcão: um preço combinado
           pela estadia inteira, escrito na hora. Vazio = conta pela diária. */
        '<div>' + campo('Combinado pela estadia', 'combinado', { tipo:'number', passo:'0.01',
          modo:'decimal', dica:'R$' }) + '</div>' +
      '</div>' +
      '<div class="ajuda" style="margin:-4px 12px 10px">Deixe o combinado vazio para contar pela ' +
      'diária. Escrevendo um valor, é ele que vale pela estadia toda do carro.</div>' +
      /* 24/11/2026, "tirar esse também": a lista "Quando cobrar" repetia, carro
         a carro, uma decisão que já está tomada uma vez em Ajustes → Quando
         cobrar, por padrão. E na B12 a resposta é sempre a mesma: paga na
         saída. Quem decide continua sendo o ajuste; esta tela só obedece.

         A forma de pagamento vem junto: só faz sentido se o ajuste mandar
         cobrar na chegada. Com "na saída" ela some, porque não há o que pagar
         agora — e campo que não serve para nada é campo que atrasa a fila. */
      (cfg.cobranca === 'chegada'
        ? '<div class="ajuda" style="margin:0 12px 10px">O ajuste manda <b>cobrar na chegada</b>: ' +
          'este carro paga o previsto agora e acerta a diferença na saída.</div>' +
          lista('Forma de pagamento', 'pg', PAGAMENTOS, 'pix')
        : '') +
      '<div class="previa" id="previa-patio"><span>Previsto</span><b>—</b></div>',
    acao: 'Registrar entrada',
    aoAbrir: function (form) {
      function calc() {
        var d = form.querySelector('[name=entrada]').value, h = form.querySelector('[name=hora]').value;
        var sp = form.querySelector('[name=saidaPrevista]').value, di = +form.querySelector('[name=diaria]').value || 0;
        var cb = Math.max(0, Number(form.querySelector('[name=combinado]').value) || 0);
        var falso = { entrada: d, entradaEm: B12.instante(d, h), diaria: di };
        var dias = sp ? B12.diariasDe(falso, B12.instante(sp, h)) : 1;
        form.querySelector('#previa-patio').innerHTML = '<span>' +
          (cb > 0
            ? 'Combinado' + (sp ? ' · ' + dias + (dias > 1 ? ' diárias' : ' diária') : '')
            : sp ? dias + (dias > 1 ? ' diárias previstas' : ' diária prevista')
                 : 'sem data de saída: 1 diária') +
          '</span><b>' + B12.brl(cb > 0 ? cb : dias * di) + '</b>';
      }
      form.querySelectorAll('[name=entrada],[name=hora],[name=saidaPrevista],[name=diaria]')
      form.querySelector('[name=combinado]').oninput = calc;
      calc();
    },
    aoSalvar: function (d) {
      /* sem a lista na tela, quem responde "cobrar agora?" é o ajuste do dono:
         entradaPatio só decide sozinho quando cobrarAgora vem nulo. */
      delete d.cobrarAgora;
      return B12.entradaPatio(d);
    },
    depois: depois
  });
};

B12.confirmarSaidaPatio = function (id, depois) {
  var v = B12.DB.patio.filter(function (x) { return x.id === id; })[0];
  if (!v) return;
  var cfg = B12.DB.ajustes.patio || { regra: 'dia' };
  B12.folha({
    titulo: 'Carro saindo',
    sub: 'Placa ' + v.placa + (v.nome ? ' · ' + v.nome : ''),
    corpo:
      campo('Hora da saída', 'hora', { tipo:'time', valor: B12.horaBR(new Date().toISOString()) }) +
      '<div class="resumo-saida" id="resumo-patio"></div>' +
      /* 24/11/2026, "isso precisa ser editável sempre". O número vem feito da
         conta acima, e continua se refazendo quando ele mexe na hora — até o
         instante em que ele escreve com o próprio dedo. A partir daí a conta
         para de mandar nele, senão o app apagaria o acerto que ele acabou de
         fazer com a pessoa na frente. Apagar o campo devolve a conta. */
      campo('A cobrar agora', 'cobrar', { tipo:'number', passo:'0.01', modo:'decimal',
        ajuda:'Vem da conta acima e dá para mudar. Apague para voltar ao calculado.' }) +
      '<div class="ajuda cx aviso" id="saida-mao" hidden style="margin:-4px 12px 12px"></div>' +
      lista('Como pagou', 'pg', PAGAMENTOS, 'pix'),
    acao: 'Confirmar saída',
    aoAbrir: function (form) {
      var cCob = form.querySelector('[name=cobrar]');
      cCob.addEventListener('input', function () {
        if (cCob.value === '') { delete cCob.dataset.naMao; calc(); }
        else { cCob.dataset.naMao = '1'; pintar(); }
      });
      function pintar() {
        var h = form.querySelector('[name=hora]').value;
        var c = B12.valorPatio(v, B12.instante(B12.hoje(), h));
        var vai = cCob.value === '' ? c.resta : Math.max(0, Number(cCob.value) || 0);
        var d = form.querySelector('#saida-mao');
        if (d) {
          var mudou = cCob.dataset.naMao && Math.abs(vai - c.resta) > 0.009;
          d.hidden = !mudou;
          if (mudou) d.innerHTML = '<p>Escrito à mão: vai entrar <b>' + B12.brl(vai) +
            '</b> no caixa, no lugar dos ' + B12.brl(c.resta) + ' da conta.</p>';
        }
        form.querySelector('button[type=submit]').textContent = vai ? 'Confirmar saída e cobrar' : 'Confirmar saída';
      }
      function calc() {
        var h = form.querySelector('[name=hora]').value;
        var c = B12.valorPatio(v, B12.instante(B12.hoje(), h));
        if (!cCob.dataset.naMao) cCob.value = String(Math.round(c.resta * 100) / 100);
        form.querySelector('#resumo-patio').innerHTML =
          '<div><span>Entrou</span><b>' + B12.dataBR(v.entrada) + (v.entradaEm ? ' às ' + B12.horaBR(v.entradaEm) : '') + '</b></div>' +
          '<div><span>Regra</span><b>' + (cfg.regra === '24h' ? 'a cada 24 h' : 'por dia') + '</b></div>' +
          '<div><span>Diárias</span><b>' + c.dias + '</b></div>' +
          '<div><span>Valor da diária</span><b>' + B12.brl(v.diaria) + '</b></div>' +
          (c.pago ? '<div><span>Já pago na chegada</span><b>− ' + B12.brl(c.pago) + '</b></div>' : '') +
          '<div class="tot"><span>' + (c.resta ? 'Pela conta' : 'Nada a cobrar') + '</span><b>' + B12.brl(c.resta) + '</b></div>' +
          (c.credito ? '<div><span>Ficou a menos do que o pago</span><b>' + B12.brl(c.credito) + ' de crédito</b></div>' : '');
        pintar();
      }
      form.querySelector('[name=hora]').onchange = calc; form.querySelector('[name=hora]').oninput = calc; calc();
    },
    aoSalvar: function (d) { return B12.saidaPatio(id, d.pg, d.hora, d.cobrar); },
    depois: depois
  });
};

/* ================================================ ATENDIMENTO DE BALCÃO */
/* A pessoa chegou agora, sem reserva. Ficha + venda + carro num caminho só. */
B12.formBalcao = function (depois, dentro) {
  var agora = new Date();
  var horaAgora = String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0');
  var faixaAgora = B12.faixaHora(horaAgora);
  B12.folha({
    dentro: dentro || null,
    semTopo: !!dentro,
    aoFechar: function () { if (depois) depois(null); },
    titulo: 'Chegou agora',
    sub: 'Na mesma ordem da ficha de papel',
    corpo:
      /* ---- a ficha, campo por campo, como está no bloquinho ---- */
      '<div class="par">' +
        '<div style="grid-column:span 2">' + campo('Nome', 'nome', { obrig:true, max:60, dica:'como a pessoa se chama' }) + '</div>' +
      '</div>' +
      /* 24/11/2026: "o náutico e o estacionamento é uma coisa só, está dentro
         do cadastro. Quem cadastrar o atendimento vai preencher se é só
         estacionamento, ou só náutico, ou os dois."

         Antes disto, SÓ ESTACIONAMENTO era impossível: o app exigia valor de
         travessia e recusava com "Falta o valor". Quem deixava o carro e ia
         de barco de outra pessoa não cabia no cadastro.

         A escolha só esconde o que não serve — nada fica travado, e trocar
         de ideia no meio não apaga o que já foi digitado. */
      lista('O que ele vai usar', 'servico', [
        ['ambos','Náutico e estacionamento'],
        ['nautico','Só náutico — travessia'],
        ['estacionamento','Só estacionamento — deixa o carro']], 'ambos') +
      '<div class="par">' +
        '<div>' + campo('Pessoas no veículo', 'pax', { tipo:'number', modo:'numeric', valor:1, passo:'1' }) + '</div>' +
        '<div>' + campo('Pagantes', 'pagantes', { tipo:'number', modo:'numeric', valor:1, passo:'1',
          ajuda:'é este número que faz o preço' }) + '</div>' +
      '</div>' +
      /* 24/11/2026: "precisa ter do lado de IDA o valor da ida, e na VOLTA o
         valor da volta" — e logo depois: "deixar pra preencher SEM preço da
         tabela, livre pra pôr à mão". Os dois campos nascem VAZIOS de
         propósito. Quem atende combina no balcão e digita; a tabela some da
         conta e fica só como sugestão, lá embaixo, até ele escrever algo. */
      '<div class="trio">' +
        '<div>' + campo('Ida', 'data', { tipo:'date', valor: B12.hoje() }) + '</div>' +
        '<div>' + campo('Hora', 'hora', { tipo:'time', valor: horaAgora }) + '</div>' +
        '<div>' + campo('Valor da ida', 'valorIda', { tipo:'number', passo:'0.01',
          modo:'decimal', dica:'R$' }) + '</div>' +
      '</div>' +
      '<div class="trio">' +
        '<div>' + campo('Volta', 'volta', { tipo:'date' }) + '</div>' +
        '<div>' + campo('Hora', 'horaVolta', { tipo:'time' }) + '</div>' +
        '<div>' + campo('Valor da volta', 'valorVolta', { tipo:'number', passo:'0.01',
          modo:'decimal', dica:'R$' }) + '</div>' +
      '</div>' +
      /* 24/11/2026, pedido do Eugênio: campo vazio podia ser "ainda não sei"
         ou "esqueci de preencher", e quem atende não sabia o que fazer. Agora
         "a definir" é uma escolha com nome. Continua entrando na lista de quem
         está na Ilha sem volta — a pessoa ainda precisa voltar, e a lancha
         precisa ser marcada; a caixinha só diz que foi combinado assim. */
      marca('A volta fica a definir', 'voltaADefinir', false,
        'Marque quando a pessoa ainda não sabe o dia. Ela continua na lista de ' +
        'quem precisa marcar a volta.') +
      /* 24/11/2026, dois pedidos seguidos sobre o mesmo canto da ficha:
         "são preços feitos diferentes na hora" e "diária de estacionamento,
         preencher à mão, editável". São dois jeitos de cobrar e os dois
         precisam caber:

           DIÁRIA     — quanto custa cada dia. Multiplica pelos dias.
           COMBINADO  — o preço do carro inteiro, não importa quantos dias.

         A diária já vem escrita com o valor de Preços, para ele só mudar
         quando for diferente. O combinado nasce vazio e, quando escrito,
         manda em tudo. */
      '<div class="trio" id="caixa-carro">' +
        '<div>' + campo('Placa', 'placa', { max:8, dica:'deixe vazio se não deixou carro' }) + '</div>' +
        '<div>' + campo('Diária', 'diariaCarro', { tipo:'number', passo:'1', modo:'numeric',
          valor: B12.DB.ajustes.diaria, dica:'R$ por dia' }) + '</div>' +
        '<div>' + campo('Combinado', 'valorEstacionamento', { tipo:'number', passo:'0.01',
          modo:'decimal', dica:'R$ pela estadia' }) + '</div>' +
      '</div>' +
      '<div class="ajuda" id="ajuda-carro" style="margin:-4px 12px 10px">A <b>diária</b> ' +
      'multiplica pelos dias. O <b>combinado</b>, se você escrever, vale pela estadia toda ' +
      'e ganha da diária.</div>' +
      campo('Celular', 'whats', { tipo:'tel', modo:'tel', dica:'(41) 90000-0000' }) +
      '<div class="par">' +
        '<div>' + campo('Total a cobrar', 'valorManual', { tipo:'number', passo:'0.01', modo:'decimal',
          dica:'quanto foi combinado',
          ajuda:'soma ida + volta sozinho. Dá para escrever outro valor por cima.' }) + '</div>' +
        '<div>' + lista('Pagamento', 'pg', PAGAMENTOS, 'pix') + '</div>' +
      '</div>' +
      /* 13/10: saiu a faixa "Pela tabela daria R$ X". O preço aqui é de quem
         atende, e uma sugestão pulando na tela a cada tecla atrapalhava mais
         do que ajudava. A tabela continua viva em Financeiro → Preços, para
         consulta. */
      listaLivre('Pousada', 'pousada', ['Direto (sem pousada)']
        .concat(B12.PARCEIROS.map(function (p) { return p.nome; })), '') +
      /* ---- o que a pessoa consumiu esperando a lancha ---- */
      '<button type="button" class="btn sec dobra-btn" id="b-consumo" style="margin-top:14px" ' +
      'aria-expanded="false" aria-controls="cx-consumo">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-1 5H9z"/>' +
      '<path d="M9 8v11a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V8"/></svg>' +
      '<span id="b-consumo-txt">Consumo e observação</span></button>' +
      '<div id="cx-consumo" hidden>' +
        (B12.DB.ajustes.produtos || []).map(function (pr) {
          return '<div class="prod"><div class="prod-n"><b>' + pr.nome + '</b>' +
            '<small>' + B12.brl(pr.valor) + '</small></div>' +
            '<div class="passo">' +
            '<button type="button" class="passo-b" data-menos="' + pr.id + '" aria-label="Menos ' + pr.nome + '">−</button>' +
            '<input type="number" inputmode="numeric" min="0" step="1" value="0" ' +
              'name="qtd_' + pr.id + '" aria-label="Quantidade de ' + pr.nome + '">' +
            '<button type="button" class="passo-b" data-mais="' + pr.id + '" aria-label="Mais ' + pr.nome + '">+</button>' +
            '</div></div>'; }).join('') +
        campo('Observação', 'obs', { max:140, dica:'o que mais precisa ficar registrado' }) +
      '</div>' +
      '<div class="cx aviso" id="carro-sem-volta" hidden style="margin-top:14px">' +
        '<p id="carro-sem-volta-txt">O carro fica no pátio, mas falta a <b>data da volta</b> — ' +
        'sem ela não dá para contar a estadia.</p></div>' +
      '<div class="conta" id="conta-balcao" hidden></div>' +
      '<div class="previa" id="previa-balcao"></div>' +

      /* 24/11/2026, "tirar: mais informações (opcional)" — e logo depois,
         "eliminar". O botão saiu e a dobra junto: no balcão com fila, uma
         porta que ninguém abre é só mais uma coisa na tela.

         Os campos continuam existindo, escondidos, por duas razões honestas:

         1. O MOTOR LÊ TRÊS DELES. `produto`, `faixa` e `destino` entram na
            reserva e no cálculo. Tirar de vez seria sair consertando o app
            inteiro na manhã da entrega para ganhar nada.
         2. E-MAIL, INSTAGRAM, CPF E CIDADE NÃO SE PERDEM. Eles continuam em
            **Editar cadastro**, na ficha da pessoa, que é onde se preenche
            com calma — não com alguém esperando em pé no balcão.

         O marinheiro ficava aqui e também sai da vista: a sub-aba de
         marinheiros foi excluída hoje pela mesma razão. */
      '<div id="mais-balcao" hidden>' +
        campo('E-mail', 'email', { tipo:'email', modo:'email', dica:'opcional' }) +
        campo('Instagram', 'instagram', { dica:'opcional, sem o @' }) +
        campo('CPF', 'cpf', { modo:'numeric', max:14, dica:'só se pedir nota fiscal' }) +
        campo('Cidade', 'cidade', { dica:'opcional' }) +
        campo('Idades das crianças', 'idades', { modo:'numeric', max:24, dica:'3, 7, 11' }) +
        lista('Destino', 'destino', B12.DESTINOS, 'Brasília') +
        lista('Serviço', 'produto', [['regular','Táxi Náutico'],
          ['nautico','Serviço Náutico Premium']], 'regular') +
        lista('Faixa de horário', 'faixa', [['dia','08h30 às 18h00'],['tarde','18h00 às 20h00'],
          ['noite','20h00 às 22h00'],['fora','Fora da tabela']], faixaAgora) +
        campo('Marinheiro', 'responsavel', { dica:'quem levou', max:30 }) +
        marca('Aceita receber ofertas e novidades', 'aceitaOfertas', false, '') +
      '</div>',
    acao: 'Registrar atendimento',
    aoAbrir: function (form) {
      /* o bloco escondido não tem mais botão: fica fora da vista de propósito */
      /* consumo: abre, fecha, e os botoes de + e - para nao digitar no celular */
      var bc = form.querySelector('#b-consumo'), cxc = form.querySelector('#cx-consumo');
      bc.onclick = function () {
        cxc.hidden = !cxc.hidden;
        bc.setAttribute('aria-expanded', String(!cxc.hidden));
        form.querySelector('#b-consumo-txt').textContent =
          cxc.hidden ? 'Consumo e observação' : 'Esconder o consumo';
      };
      form.querySelectorAll('[data-mais],[data-menos]').forEach(function (b) {
        b.onclick = function () {
          var id = b.dataset.mais || b.dataset.menos;
          var c = form.querySelector('[name="qtd_' + id + '"]');
          var v = (+c.value || 0) + (b.dataset.mais ? 1 : -1);
          c.value = Math.max(0, v);
          calcular();
        };
      });

      /* pagantes acompanha o nº de pessoas até alguém mexer nele à mão: no
         caso comum (ninguém não-pagante) é zero trabalho para quem atende */
      var cPax = form.querySelector('[name=pax]'), cPag = form.querySelector('[name=pagantes]');
      var pagNaMao = false;
      cPag.oninput = function () { pagNaMao = true; calcular(); };
      cPax.addEventListener('input', function () {
        if (!pagNaMao) cPag.value = cPax.value;
        calcular();
      });

      /* "a definir" apaga e tranca os dois campos: dois jeitos de dizer a
         mesma coisa na tela é como nasce dado contraditório */
      var aDef = form.querySelector('[name=voltaADefinir]');
      var cVolta = form.querySelector('[name=volta]'), cHoraV = form.querySelector('[name=horaVolta]');
      if (aDef) {
        var aplicaDef = function () {
          var on = aDef.checked;
          [cVolta, cHoraV].forEach(function (c) {
            if (!c) return;
            c.disabled = on;
            if (on) c.value = '';
            c.style.opacity = on ? '.45' : '';
          });
          calcular();
        };
        aDef.onchange = aplicaDef;
        /* digitou uma data: não é mais "a definir" */
        [cVolta, cHoraV].forEach(function (c) {
          if (c) c.addEventListener('input', function () {
            if (c.value && aDef.checked) { aDef.checked = false; aplicaDef(); }
          });
        });
      }

      /* a hora da ida escolhe a faixa sozinha: uma decisão a menos para quem atende */
      var hora = form.querySelector('[name=hora]'), faixa = form.querySelector('[name=faixa]');
      hora.onchange = function () {
        var f = B12.faixaHora(hora.value);
        faixa.value = f;
        calcular();
      };
      function calcular() {
        var pax = +cPax.value || 1;
        var pag = Math.max(0, Math.min(+cPag.value || 0, pax));
        var campoTotal = form.querySelector('[name=valorManual]');
        /* os dois trechos digitados a mao. Somam sozinhos no total, e o total
           continua podendo ser escrito por cima (pacote, desconto, cortesia). */
        var cIda = form.querySelector('[name=valorIda]'), cVolta = form.querySelector('[name=valorVolta]');
        var vIda = Number(cIda && cIda.value) || 0, vVolta = Number(cVolta && cVolta.value) || 0;
        var porMao = vIda + vVolta;
        if (porMao > 0 && !campoTotal.dataset.naMao) campoTotal.value = String(Math.round(porMao * 100) / 100);
        var manual = Number(campoTotal.value) || 0;
        /* ---- 12/11/2026: o estacionamento entra na conta ----
           `diarias` vinha fixo em 0 e o carro saia de graca da soma do balcao.
           So conta quando tem PLACA: sem carro nao ha estadia. */
        var placa = String((form.querySelector('[name=placa]') || {}).value || '').trim();
        var ida = form.querySelector('[name=data]').value;
        var volta = form.querySelector('[name=volta]').value;
        var horaV = form.querySelector('[name=horaVolta]').value;
        var diarias = placa ? B12.diariasBalcao(ida, hora.value, volta, horaV) : 0;
        var cons = B12.somarConsumo(form);
        var el = form.querySelector('#previa-balcao');
        var naoPag = pax - pag;
        var nota = naoPag > 0 ? ' · ' + naoPag + (naoPag > 1 ? ' não pagam' : ' não paga') : '';
        /* 24/11/2026, "eliminar isso agora": a tabela sumiu da conta. Enquanto
           ele não escrevia nada, a tela mostrava "Sugestão da tabela · ida
           R$ 60 / volta R$ 60 / R$ 120" — e um número na tela de balcão é
           lido como preço, não como sugestão. Na B12 quem atende combina e
           digita. Sem valor escrito, a conta fica vazia e a faixa pede o
           valor, que é a verdade. A tabela continua viva em Financeiro →
           Preços, para consulta. */
        var travessia = manual;
        var cEst = form.querySelector('[name=valorEstacionamento]');
        var cDia = form.querySelector('[name=diariaCarro]');
        var estMao = Math.max(0, Number(cEst && cEst.value) || 0);
        var diaMao = Math.max(0, Number(cDia && cDia.value) || 0);
        /* a diária já vem escrita no campo, então o carro sempre tem um
           número visível: não precisa (nem deve) cair na tabela por baixo */
        var estac = !placa ? 0
          : estMao > 0 ? estMao
          : diaMao * diarias;
        var total = travessia + cons.total + estac;

        /* A conta aberta, linha por linha. O Eugenio pediu para ver a soma:
           ida, volta, estacionamento. Numero que aparece sozinho ninguem
           confere — e no balcao a pessoa esta olhando junto. */
        var linhas = [];
        if (travessia) {
          /* digitou trecho a trecho: a conta mostra o que ELE escreveu. So
             cai na tabela quando nao escreveu nada em lugar nenhum. */
          if (porMao > 0) {
            if (vIda) linhas.push(['Ida', vIda]);
            if (vVolta) linhas.push(['Volta', vVolta]);
            if (manual && Math.abs(manual - porMao) > 0.009) linhas.push(['Total escrito por cima', manual]);
          } else if (manual > 0) {
            linhas.push(['Valor combinado', manual]);
          }
        }
        if (estac) linhas.push([estMao > 0
          ? 'Estacionamento · combinado' + (diarias ? ' · ' + diarias + (diarias > 1 ? ' diárias' : ' diária') : '')
          : 'Estacionamento · ' + diarias + (diarias > 1 ? ' diárias' : ' diária') +
            ' × ' + B12.brl(diaMao), estac]);
        if (cons.total) linhas.push(['Consumo', cons.total]);

        var conta = form.querySelector('#conta-balcao');
        if (conta) {
          conta.hidden = linhas.length < 2;
          conta.innerHTML = linhas.map(function (l) {
            return '<div><span>' + l[0] + '</span><b class="num">' + B12.brl(l[1]) + '</b></div>';
          }).join('');
        }
        /* o carro ficou e ninguem marcou a volta: a estadia nao tem como ser
           contada, e e melhor dizer isso do que somar zero calado */
        var avisoCarro = form.querySelector('#carro-sem-volta');
        if (avisoCarro) {
          avisoCarro.hidden = !(placa && !volta);
          var txt = form.querySelector('#carro-sem-volta-txt');
          /* escolheu "a definir": não é esquecimento, é combinado. O recado
             deixa de cobrar e passa a dizer o que acontece. */
          if (txt) txt.innerHTML = (aDef && aDef.checked)
            ? 'Volta <b>a definir</b>: a estadia do carro vai ser contada na saída, ' +
              'quando ele voltar e você marcar o dia.'
            : 'O carro fica no pátio, mas falta a <b>data da volta</b> — ' +
              'sem ela não dá para contar a estadia.';
        }

        if (!travessia && !estac) {
          el.innerHTML = '<span>Falta o valor' + nota + '</span><b>combine e digite</b>';
        } else {
          el.innerHTML = '<span>' + (porMao > 0 ? 'Ida + volta, como você digitou'
              : 'Valor combinado') + nota +
            (estac ? ' · com estacionamento' : '') + '</span>' +
            '<b>' + B12.brl(total) + '</b>';
        }
        /* o rótulo do botão conta o consumo sem precisar abrir */
        var bt = form.querySelector('#b-consumo-txt');
        if (bt && cxc.hidden) bt.textContent = cons.itens.length
          ? 'Consumo · ' + B12.brl(cons.total) : 'Consumo e observação';
      }
      form.querySelectorAll('[name=produto],[name=faixa],[name=pg],[name=valorManual],[name^=qtd_],' +
        '[name=data],[name=volta],[name=horaVolta],[name=placa],[name=valorIda],' +
        '[name=valorVolta],[name=valorEstacionamento],[name=diariaCarro],[name=servico]')
        .forEach(function (c) { c.oninput = calcular; c.onchange = calcular; });

      /* o que não serve some da tela; o que foi digitado continua lá */
      var cServ = form.querySelector('[name=servico]');
      function mostrar() {
        var v = cServ.value;
        /* só os dois trios dos TRECHOS. O do carro é .trio também, e varrer
           todos escondia o carro junto para depois a linha de baixo trazer de
           volta — funcionava por ordem, que é o jeito de quebrar depois. */
        var trechos = form.querySelectorAll('.trio:not(#caixa-carro)');
        [].forEach.call(trechos, function (t) { t.hidden = (v === 'estacionamento'); });
        var ajudaTr = form.querySelector('#ajuda-trechos');
        if (ajudaTr) ajudaTr.hidden = (v === 'estacionamento');
        var caixaCar = form.querySelector('#caixa-carro');
        if (caixaCar) caixaCar.hidden = (v === 'nautico');
        var ajudaCar = form.querySelector('#ajuda-carro');
        if (ajudaCar) ajudaCar.hidden = (v === 'nautico');
        var cTot = form.querySelector('[name=valorManual]').parentElement.parentElement;
        if (cTot) cTot.hidden = (v === 'estacionamento');
      }
      cServ.addEventListener('change', function () { mostrar(); calcular(); });
      mostrar();
      /* escreveu no total com o proprio dedo: a soma dos trechos para de
         mandar nele. Apagou o total: volta a somar sozinho. */
      var cTot = form.querySelector('[name=valorManual]');
      cTot.addEventListener('input', function () {
        if (cTot.value === '') delete cTot.dataset.naMao; else cTot.dataset.naMao = '1';
      });
      calcular();
    },
    aoSalvar: function (d) {
      d.pax = +d.pax || 1;
      d.pagantes = Math.max(0, Math.min(+d.pagantes || d.pax, d.pax));
      d.idades = String(d.idades || '').trim();
      /* quem não paga é o que sobra: o balcão digitou os pagantes, e esse
         número manda. As idades ficam de registro, não de regra. */
      d.criancas = d.pax - d.pagantes;
      d.consumo = B12.lerConsumo(d);
      if (!d.faixa) d.faixa = B12.faixaHora(d.hora);
      if (d.placa && !d.saidaPrevista) d.saidaPrevista = d.volta || '';
      return B12.atenderBalcao(d);
    },
    depois: depois
  });
};

/* o orçamento, escrito para o WhatsApp da própria B12: é o recado da
   funcionária para o Dhalsin, com tudo que ela combinou no balcão. */
B12.orcamentoTexto = function (r) {
  var l = ['📋 *Atendimento no balcão — Estação B12*', '',
    '*' + r.nome + '* · código *' + r.cod + '*',
    'Pessoas: ' + r.pax + (r.idades ? ' (crianças: ' + r.idades + ')' : ''),
    'Ida: ' + B12.dataBR(r.ida) + (r.hora ? ' às ' + r.hora : '')];
  if (r.volta) l.push('Volta: ' + B12.dataBR(r.volta) + (r.horaVolta ? ' às ' + r.horaVolta : ''));
  l.push('Serviço: ' + r.produto, 'Destino: ' + r.destino);
  if (r.pousada) l.push('Pousada: ' + r.pousada);
  if (r.placa) l.push('Carro: ' + r.placa + (r.estacionamento ? ' · ' + r.estacionamento + ' diária(s)' : ''));
  if (r.zap) l.push('Celular: ' + r.zap);
  l.push('Pagamento: ' + r.pg, '*Total combinado: ' + (r.total != null ? B12.brl(r.total) : 'a combinar') + '*',
    '', 'Cliente paga na saída.');
  return l.join('\n');
};
B12.mandarOrcamento = function (r) {
  window.open('https://wa.me/' + B12.EMPRESA.whats + '?text=' +
    encodeURIComponent(B12.orcamentoTexto(r)), '_blank');
};

B12.aposBalcao = function (res) {
  if (!res || !res.reserva) return;
  var r = res.reserva;
  B12.folha({
    titulo: 'Atendimento registrado',
    sub: r.nome + ' · código ' + r.cod,
    corpo:
      '<div class="ticket-grande"><span class="ticket-marca">' + (B12.LOGO || '') + '</span>' +
      '<small>CÓDIGO DA VIAGEM</small><b>' + r.cod + '</b></div>' +
      '<table class="tabela" style="margin-top:14px">' +
      '<tr><td>Pessoas</td><td class="n">' + r.pax + (r.idades ? ' · crianças ' + r.idades : '') + '</td></tr>' +
      '<tr><td>Ida</td><td class="n">' + B12.dataBR(r.ida) + (r.hora ? ' às ' + r.hora : '') + '</td></tr>' +
      (r.volta ? '<tr><td>Volta</td><td class="n">' + B12.dataBR(r.volta) +
        (r.horaVolta ? ' às ' + r.horaVolta : '') + '</td></tr>' : '') +
      (r.placa ? '<tr><td>Carro</td><td class="n">' + r.placa + '</td></tr>' : '') +
      '<tr><td>Total combinado</td><td class="n">' +
        (r.total != null ? B12.brl(r.total) : 'a combinar') + '</td></tr></table>' +
      '<div class="ajuda" style="margin-top:12px">O cliente paga na saída. ' +
      'Mande o código para ele e o orçamento para o Dhalsin.</div>' +
      '<button type="button" class="btn zap" id="b-orc-cliente">Mandar o código ao cliente</button>' +
      '<button type="button" class="btn sec" id="b-orc-dono">Mandar o orçamento ao Dhalsin</button>',
    acao: 'Fechar',
    aoAbrir: function (form) {
      form.querySelector('#b-orc-cliente').onclick = function () {
        B12.folhaMensagem('confirmacao', { nome: r.nome, whats: r.zap, cod: r.cod, ida: r.ida,
          volta: r.volta, hora: res.saida ? res.saida.hora : '', pax: r.pax, total: r.total });
      };
      form.querySelector('#b-orc-dono').onclick = function () { B12.mandarOrcamento(r); };
    },
    aoSalvar: function () { return { ok: true }; }
  });
};

/* ============================================== botão flutuante de ações */


/* ------------------------------------------------------- preços (o dono) */
function pct(v) { return String(Math.round((v || 0) * 10000) / 100).replace('.', ','); }
B12.formPrecosTravessia = function (depois) {
  var A = B12.DB.ajustes, T = A.tabela;
  function faixa(k, rot) {
    return '<div class="grupo">' + rot + '</div><div class="par">' +
      '<div>' + B12.f_campo('Começa', k + 'De', { valor: T[k].de, dica: '08h30', max: 5 }) + '</div>' +
      '<div>' + B12.f_campo('Termina', k + 'Ate', { valor: T[k].ate, dica: '18h00', max: 5 }) + '</div></div>' +
      '<div class="par">' +
      '<div>' + B12.f_campo('Fixo até 3 pessoas', k + 'Fixo', { tipo: 'number', modo: 'decimal', valor: T[k].fixo, passo: '1' }) + '</div>' +
      '<div>' + B12.f_campo('Por pessoa, de 4 em diante', k + 'Pessoa', { tipo: 'number', modo: 'decimal', valor: T[k].pessoa, passo: '1' }) + '</div></div>';
  }
  B12.folha({
    titulo: 'Preços da travessia',
    sub: 'Valem na hora para quem abrir o app',
    corpo:
      '<div class="grupo">Travessia regular (lancha compartilhada)</div>' +
      B12.f_campo('Por pessoa, por trecho', 'regular', { tipo: 'number', modo: 'decimal', valor: A.regular, passo: '1', obrig: true,
        ajuda: 'Ida e volta = duas vezes este valor. Crianças até a idade abaixo não pagam.' }) +
      '<div class="par">' +
      '<div>' + B12.f_campo('Criança não paga até', 'idadeCortesia', { tipo: 'number', modo: 'numeric', valor: A.idadeCortesia, ajuda: 'anos' }) + '</div>' +
      '<div>' + B12.f_campo('Desconto no dinheiro', 'descDinheiro', { tipo: 'number', modo: 'decimal', valor: pct(A.descDinheiro).replace(',', '.'), passo: '0.5', ajuda: '% sobre o total' }) + '</div></div>' +
      '<div class="ajuda" style="margin-top:14px">Serviço Náutico Premium (lancha exclusiva): até 3 pessoas paga o valor fixo; ' +
      'de 4 em diante paga por pessoa, e o fixo funciona como mínimo.</div>' +
      faixa('dia', 'Faixa do dia') + faixa('tarde', 'Faixa da tarde') + faixa('noite', 'Faixa da noite'),
    acao: 'Salvar preços',
    aoSalvar: function (d) { return B12.salvarPrecosTravessia(d); },
    depois: depois
  });
};
B12.formPasseio = function (p, depois) {
  var novo = !p, extra = !p || p.extra;
  B12.folha({
    titulo: novo ? 'Novo passeio' : p.nome,
    sub: novo ? 'Aparece na tela do cliente assim que você salvar' : (extra ? 'Passeio criado por você' : 'Preço, duração e saída deste passeio'),
    corpo:
      '<input type="hidden" name="id" value="' + (p ? p.id : '') + '">' +
      B12.f_campo('Nome do passeio', 'nome', { valor: p ? p.nome : '', obrig: true, max: 60, dica: 'Pôr do sol na baía' }) +
      '<div class="par">' +
      '<div>' + B12.f_campo('Duração', 'dur', { valor: p ? p.dur : '', dica: '3h', max: 8 }) + '</div>' +
      '<div>' + B12.f_campo('Preço por pessoa', 'preco', { tipo: 'number', modo: 'decimal', valor: p ? p.preco : '', passo: '1', obrig: true }) + '</div></div>' +
      B12.f_campo('Preço de criança (opcional)', 'precoCrianca', { tipo: 'number', modo: 'decimal', passo: '1',
        valor: p && p.precoCrianca != null ? p.precoCrianca : '', ajuda: 'Vazio = criança paga o mesmo do adulto.' }) +
      B12.f_campo('Saída', 'saida', { valor: p ? (p.saida || '') : '', dica: 'Manhã ou tarde, do trapiche da B12', max: 80 }) +
      (extra ? B12.f_campo('Resumo (uma linha)', 'resumo', { valor: p ? p.resumo : '', max: 90, dica: 'Duas horas de barco com o sol se pondo atrás da serra.' }) +
        '<label for="c-texto">Descrição</label><textarea' + B12.SEM_AUTO + ' id="c-texto" name="texto" rows="4">' + (p ? (p.texto || '') : '') + '</textarea>'
        : '<div class="ajuda">O roteiro passo a passo, as fotos e os textos deste passeio ficam com o Eugênio por enquanto. Aqui você muda o que é seu: preço, duração, saída e se ele aparece.</div>') +
      B12.f_marca('Aparece para o cliente', 'ativo', p ? p.ativo !== false : true, 'Desligue para esconder sem apagar.'),
    acao: novo ? 'Criar passeio' : 'Salvar',
    aoSalvar: function (d) { return B12.salvarPasseio(d); },
    depois: depois
  });
};
B12.formTaxas = function (depois) {
  var t = B12.DB.ajustes.taxas || {};
  function c(k, rot) { return B12.f_campo(rot, k, { tipo: 'number', modo: 'decimal', passo: '0.01', valor: pct(t[k]).replace(',', '.'), ajuda: '%' }); }
  B12.folha({
    titulo: 'Taxas da maquininha',
    sub: 'O que a operadora desconta de cada venda',
    corpo: '<div class="ajuda">Entram no cálculo do resultado e no relatório do contador. Pix e dinheiro normalmente são zero.</div>' +
      '<div class="par"><div>' + c('credito', 'Crédito') + '</div><div>' + c('debito', 'Débito') + '</div></div>' +
      '<div class="par"><div>' + c('pix', 'Pix') + '</div><div>' + c('dinheiro', 'Dinheiro') + '</div></div>',
    acao: 'Salvar taxas',
    aoSalvar: function (d) { return B12.salvarTaxas(d); },
    depois: depois
  });
};
B12.formDiaria = function (depois) {
  B12.folha({
    titulo: 'Diária do estacionamento',
    sub: 'As regras de contagem e de cobrança ficam em Ajustes',
    corpo:
      B12.f_campo('Diária de balcão', 'diaria', { tipo: 'number', modo: 'decimal', passo: '1',
        valor: B12.DB.ajustes.diaria, obrig: true,
        ajuda: 'É esta que o cliente vê no app e na reserva.' }) +
      B12.f_campo('Tarifa combinada', 'diariaEspecial', { tipo: 'number', modo: 'decimal', passo: '1',
        valor: B12.DB.ajustes.diariaEspecial,
        ajuda: 'NÃO aparece para o cliente. Você escolhe carro a carro, na entrada ou no fechamento.' }),
    acao: 'Salvar',
    aoSalvar: function (d) { return B12.salvarDiaria(d.diaria, d.diariaEspecial); },
    depois: depois
  });
};


/* --------------------------------------------------------------- o aviso
   Uma barra curta que confirma o que acabou de acontecer. É o retorno que
   faltava: sem ela, a pessoa toca e não sabe se deu certo.
   role=status faz o leitor de tela ler sozinho; 'ruim' vira role=alert. */
var avisoAtual = null, avisoRelogio = null;
B12.aviso = function (texto, tipo, acao) {
  if (avisoAtual) { avisoAtual.remove(); clearTimeout(avisoRelogio); }
  var d = document.createElement('div');
  d.className = 'aviso-barra ' + (tipo || 'bom');
  d.setAttribute('role', tipo === 'ruim' ? 'alert' : 'status');
  d.setAttribute('aria-live', tipo === 'ruim' ? 'assertive' : 'polite');
  var icone = tipo === 'ruim'
    ? '<path d="M12 8v5M12 16.5v.5" stroke-linecap="round"/><circle cx="12" cy="12" r="9"/>'
    : '<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>';
  d.innerHTML = '<svg viewBox="0 0 24 24">' + icone + '</svg><span>' + texto + '</span>' +
    (acao ? '<button type="button" class="aviso-acao">' + acao.texto + '</button>' : '');
  document.body.appendChild(d);
  requestAnimationFrame(function () { d.classList.add('on'); });
  if (acao) d.querySelector('.aviso-acao').onclick = function () { acao.aoTocar(); fechar(); };
  function fechar() {
    d.classList.remove('on');
    setTimeout(function () { d.remove(); if (avisoAtual === d) avisoAtual = null; }, 260);
  }
  d.onclick = function (e) { if (!e.target.closest('.aviso-acao')) fechar(); };
  avisoAtual = d;
  avisoRelogio = setTimeout(fechar, acao ? 9000 : (tipo === 'ruim' ? 6000 : 4200));
  return d;
};
/* botão que avisa que está trabalhando, e não deixa tocar duas vezes */
B12.ocupar = function (btn, texto) {
  if (!btn || btn.dataset.ocupado) return function () {};
  var antes = btn.innerHTML;
  btn.dataset.ocupado = '1';
  btn.setAttribute('aria-busy', 'true');
  btn.disabled = true;
  btn.innerHTML = '<span class="girando"></span>' + (texto || 'Um instante…');
  return function () {
    delete btn.dataset.ocupado;
    btn.removeAttribute('aria-busy');
    btn.disabled = false;
    btn.innerHTML = antes;
  };
};


/* ------------------------------------------------- receber na saída
   Mostra a conta inteira da pessoa antes de cobrar: travessia, pátio, e o
   total. Só depois do toque o dinheiro entra no caixa. */
B12.formReceber = function (reservaId, depois) {
  var c = B12.contaDaReserva(reservaId);
  if (!c) return;
  var r = c.reserva;
  B12.folha({
    titulo: 'Receber de ' + r.nome.split(' ')[0],
    sub: 'Reserva ' + r.cod + ' · ' + r.pax + (r.pax > 1 ? ' pessoas' : ' pessoa'),
    corpo:
      '<table class="tabela">' +
      '<tr><td>Travessia</td><td class="n">' + B12.brl(c.travessia) + '</td></tr>' +
      (c.estacionamento
        ? '<tr><td>Estacionamento · ' + c.diarias + ' diária(s)</td><td class="n">' +
          B12.brl(c.estacionamento) + '</td></tr>' : '') +
      '<tr><td><b>Total</b></td><td class="n"><b>' + B12.brl(c.total) + '</b></td></tr></table>' +
      lista('Como pagou', 'pg', PAGAMENTOS, 'pix') +
      campo('Valor recebido', 'valor', { tipo:'number', modo:'decimal', passo:'0.01', valor: c.total,
        ajuda:'Mude só se o valor combinado foi outro.' }) +
      '<div class="ajuda" style="margin-top:10px">Ao confirmar, o dinheiro entra no caixa de hoje ' +
      'e o carro sai do pátio, se houver.</div>',
    acao: 'Confirmar recebimento',
    aoSalvar: function (d) {
      var v = Number(String(d.valor).replace(',', '.')) || 0;
      if (v <= 0) return { erro: 'Informe o valor recebido.' };
      if (Math.abs(v - c.total) > 0.01) r.aReceber = v;   /* combinou outro valor */
      return B12.receber(reservaId, d.pg);
    },
    depois: function (res) {
      if (res && res.ok) B12.aviso('Recebido ' + B12.brl(res.recebido) + '. Já está no caixa.', 'bom');
      if (depois) depois(res);
    }
  });
};

/* ------------------------------------------------- ficha da reserva (a lupa)
   O balcão tem o voucher na mão e digita o código. Aqui aparece tudo sobre a
   pessoa e os dois botões que importam: falar no WhatsApp e receber na saída. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
B12.fichaReserva = function (id, depois) {
  var r = B12.reservaPorId(id);
  if (!r) return B12.aviso('Não achei essa reserva.', 'ruim');
  var c = B12.contaDaReserva(r.id) || { total: 0, jaPago: true, travessia: 0, estacionamento: 0, diarias: 0 };
  var sit = B12.situacaoTxt ? B12.situacaoTxt(r) : (r.situacao || '');
  var zap = String(r.zap || '').replace(/\D/g, '');
  var mostra = B12.mostraPrecos();
  var dono = !B12.pode || B12.pode('dono');

  function linha(rot, val) {
    return val ? '<tr><td>' + rot + '</td><td class="n">' + val + '</td></tr>' : '';
  }
  var corpo =
    '<div class="ficha-cod">' + esc(r.cod) + '</div>' +
    '<table class="tabela">' +
      linha('Nome', esc(r.nome)) +
      linha('Pessoas', r.pax + (r.pax > 1 ? ' pessoas' : ' pessoa') +
        (r.criancas ? ' · ' + r.criancas + ' criança' + (r.criancas > 1 ? 's' : '') : '')) +
      /* a hora que a pessoa escreveu vale mais que a faixa de preco: e com ela
         que o balcao sabe quem esperar as sete da noite */
      linha('Ida', B12.dataBR(r.ida) +
        (r.horaChegada ? ' · chega às ' + esc(String(r.horaChegada).replace(':', 'h'))
                       : (r.faixa ? ' · ' + esc(r.faixa) : ''))) +
      linha('Volta', r.volta ? B12.dataBR(r.volta) : '<span class="pend">sem data</span>') +
      linha('Destino', esc(r.destino)) +
      linha('Pousada', esc(r.pousada)) +
      linha('Carro', r.placa ? esc(r.placa) + (c.carro ? ' · no pátio' : '') : '') +
      linha('WhatsApp', esc(r.zap)) +
      linha('Situação', esc(sit)) +
    '</table>' +
    (!dono ? ''                                    /* a equipe não vê dinheiro */
      : c.jaPago && !c.estacionamento
      ? '<div class="ficha-conta paga">Conta já recebida</div>'
      /* A conta ABERTA, linha por linha. O Dhalsin vem do papel: ele precisa
         poder dizer ao cliente "foram três diárias" olhando para a tela, e
         não só anunciar um total que ninguém sabe de onde saiu. */
      : '<div class="conta-aberta">' +
          '<div class="ca-tit">A receber na saída</div>' +
          (c.travessia > 0
            ? '<div class="ca-lin"><span>Travessia' +
              (r.pax > 1 ? ' · ' + r.pax + ' pessoas' : '') + '</span>' +
              '<b>' + (mostra ? B12.brl(c.travessia) : 'a combinar') + '</b></div>' : '') +
          (c.diarias > 0
            ? '<div class="ca-lin"><span>Estacionamento · <b class="ca-dias">' + c.diarias +
              (c.diarias > 1 ? ' diárias' : ' diária') + '</b>' +
              (c.carro && c.carro.entrada ? '<small>desde ' + B12.dataBR(c.carro.entrada) + '</small>' : '') +
              '</span><b>' + (mostra ? B12.brl(c.estacionamento) : 'a combinar') + '</b></div>' : '') +
          (c.carro && c.carro.pagoNaEntrada > 0
            ? '<div class="ca-lin ca-pago"><span>Já pago na entrada</span><b>− ' +
              B12.brl(c.carro.pagoNaEntrada) + '</b></div>' : '') +
          '<div class="ca-lin ca-total"><span>Total</span><b>' +
          (mostra ? B12.brl(c.total) : 'a combinar') + '</b></div>' +
        '</div>');

  var form = B12.folha({
    titulo: 'Reserva de ' + String(r.nome || '').split(' ')[0],
    sub: r.pax + (r.pax > 1 ? ' pessoas' : ' pessoa') + ' · ida ' + B12.dataBR(r.ida),
    corpo: corpo,
    extra:
      '<button type="button" class="btn sec" id="fc-editar" style="margin-top:0">' +
      'Corrigir esta reserva</button>' +
      (zap ? '<button type="button" class="btn sec" id="fc-zap" style="margin-top:8px">' +
        'Falar no WhatsApp</button>' : '') +
      ((!dono || (c.jaPago && !c.estacionamento)) ? '' :
        '<button type="button" class="btn sec" id="fc-receber" style="margin-top:8px">' +
        'Receber agora</button>'),
    acao: 'Fechar',
    aoSalvar: function () { return { ok: true }; },
    depois: function () { if (depois) depois(); }
  });
  var be = form.querySelector('#fc-editar');
  if (be) be.onclick = function () {
    B12.fecharFolha();
    B12.formEditarReserva(id, function () { if (depois) depois(); });
  };
  var bz = form.querySelector('#fc-zap');
  if (bz) bz.onclick = function () {
    var txt = 'Olá, ' + String(r.nome || '').split(' ')[0] + '! Aqui é a Estação B12, ' +
      'sobre a sua reserva ' + r.cod + '.';
    window.open('https://wa.me/' + zap + '?text=' + encodeURIComponent(txt), '_blank');
  };
  var br = form.querySelector('#fc-receber');
  if (br) br.onclick = function () {
    B12.fecharFolha();
    B12.formReceber(r.id, function () { if (depois) depois(); });
  };
};

/* ------------------------------------------------ corrigir o atendimento
   A tela de editar. Mesma ordem de campos da ficha do balcão, porque é a
   mesma conversa — só que agora com o que já está gravado dentro. */
B12.formEditarReserva = function (id, depois) {
  var r = B12.reservaPorId(id);
  if (!r) return B12.aviso('Não achei essa reserva.', 'ruim');
  var carro = r.patioId && (B12.DB.patio || []).filter(function (v) { return v.id === r.patioId; })[0];

  B12.folha({
    titulo: 'Corrigir ' + String(r.nome || '').split(' ')[0],
    sub: 'código ' + r.cod,
    corpo:
      '<div class="par">' +
        '<div style="grid-column:span 2">' + campo('Nome', 'nome', { valor:r.nome, obrig:true, max:60 }) + '</div>' +
      '</div>' +
      '<div class="par">' +
        '<div>' + campo('Pessoas no veículo', 'pax', { tipo:'number', modo:'numeric', valor:r.pax || 1, passo:'1' }) + '</div>' +
        '<div>' + campo('Pagantes', 'pagantes', { tipo:'number', modo:'numeric',
          valor: r.pagantes == null ? (r.pax || 1) : r.pagantes, passo:'1',
          ajuda:'é este número que faz o preço' }) + '</div>' +
      '</div>' +
      '<div class="trio">' +
        '<div>' + campo('Ida', 'ida', { tipo:'date', valor:r.ida }) + '</div>' +
        '<div>' + campo('Hora', 'hora', { tipo:'time', valor:r.hora || '' }) + '</div>' +
        '<div>' + campo('Valor da ida', 'valorIda', { tipo:'number', passo:'0.01',
          modo:'decimal', valor: r.valorIda == null ? '' : r.valorIda, dica:'R$' }) + '</div>' +
      '</div>' +
      '<div class="trio">' +
        '<div>' + campo('Volta', 'volta', { tipo:'date', valor:r.volta || '' }) + '</div>' +
        '<div>' + campo('Hora', 'horaVolta', { tipo:'time', valor:r.horaVolta || '' }) + '</div>' +
        '<div>' + campo('Valor da volta', 'valorVolta', { tipo:'number', passo:'0.01',
          modo:'decimal', valor: r.valorVolta == null ? '' : r.valorVolta, dica:'R$' }) + '</div>' +
      '</div>' +
      '<div class="ajuda" style="margin:-4px 12px 10px">Escreveu os dois trechos? O ' +
      '<b>valor combinado</b> lá embaixo soma sozinho.</div>' +
      marca('A volta fica a definir', 'voltaADefinir', !r.volta && !!r.voltaADefinir,
        'A pessoa ainda não sabe o dia.') +
      (carro && !carro.saidaReal
        ? '<div class="ajuda" style="margin:-4px 12px 10px">O carro <b>' + esc(r.placa) +
          '</b> está no pátio. Mudar a volta muda a estadia que vai ser cobrada na saída.</div>'
        : '') +
      '<div class="par">' +
        '<div>' + campo('Placa', 'placa', { valor:r.placa || '', max:8,
          dica:'deixe vazio se não deixou carro' }) + '</div>' +
        '<div>' + campo('Estacionamento', 'valorEstacionamento', { tipo:'number', passo:'0.01',
          modo:'decimal', valor: (carro && carro.combinado) ? carro.combinado : '',
          dica:'R$ combinado' }) + '</div>' +
      '</div>' +
      '<div class="ajuda" style="margin:-4px 12px 10px">Vazio conta pela diária da tabela. ' +
      'Com valor escrito, é ele que vale pela estadia toda do carro.</div>' +
      campo('Celular', 'zap', { tipo:'tel', modo:'tel', valor:r.zap || '', dica:'(41) 90000-0000' }) +
      '<div class="par">' +
        '<div>' + campo('Valor combinado', 'total', { tipo:'number', passo:'0.01', modo:'decimal',
          valor: r.total == null ? '' : r.total }) + '</div>' +
        '<div>' + lista('Pagamento', 'pg', PAGAMENTOS, r.pg || 'pix') + '</div>' +
      '</div>' +
      lista('Destino', 'destino', B12.DESTINOS, r.destino || 'Brasília') +
      listaLivre('Pousada', 'pousada', ['Direto (sem pousada)']
        .concat(B12.PARCEIROS.map(function (p) { return p.nome; })), r.pousada || '') +
      campo('Observação', 'obs', { valor:r.obs || '', max:140 }) +
      '<div class="ajuda" style="margin-top:12px">O que você mudar aqui anda junto na ficha da ' +
      'pessoa, no carro do pátio e no caixa. Não é só esta tela.</div>',
    acao: 'Guardar a correção',
    aoAbrir: function (form) {
      /* escreveu os trechos: o valor combinado soma sozinho. Mexeu no valor
         combinado com o próprio dedo, a soma para de mandar nele. */
      var cI = form.querySelector('[name=valorIda]'), cV = form.querySelector('[name=valorVolta]');
      var cT = form.querySelector('[name=total]');
      function somar() {
        var t = (Number(cI.value) || 0) + (Number(cV.value) || 0);
        if (t > 0 && !cT.dataset.naMao) cT.value = String(Math.round(t * 100) / 100);
      }
      [cI, cV].forEach(function (c) { c.addEventListener('input', somar); });
      cT.addEventListener('input', function () {
        if (cT.value === '') delete cT.dataset.naMao; else cT.dataset.naMao = '1';
      });
    },
    aoSalvar: function (d) { return B12.editarReserva(id, d); },
    depois: function (res) {
      if (res && res.ok) {
        B12.aviso(res.mudou && res.mudou.length
          ? 'Corrigido: ' + res.mudou.join(', ') + '.'
          : 'Nada mudou.', 'bom');
      }
      if (depois) depois(res);
    }
  });
};

/* -------------------------------------------- a ficha completa do cliente
   Aberta com um toque na lista. Não é formulário: é o retrato da pessoa,
   para o Dhalsin decidir um mimo, uma promoção ou uma cobrança. */
B12.fichaCliente = function (id, depois) {
  var d = B12.dadosCliente(id);
  if (!d) return B12.aviso('Não achei essa ficha.', 'ruim');
  var c = d.cliente;
  var zap = String(c.whats || '').replace(/\D/g, '');
  var fid = B12.fidelidade();

  function l(rot, val) { return val ? '<tr><td>' + rot + '</td><td class="n">' + val + '</td></tr>' : ''; }
  /* seção só existe se tiver linha: título solto com tabela vazia parece bug */
  function sec(titulo, linhas) {
    var corpo = linhas.filter(Boolean).join('');
    return corpo ? '<div class="grupo">' + titulo + '</div><table class="tabela">' + corpo + '</table>' : '';
  }
  function dias(n, um, muitos) {
    if (n == null) return '';
    if (n === 0) return 'hoje';
    return n + ' ' + (n === 1 ? um : muitos);
  }

  var corpo =
    (fid.ligada
      ? '<div class="fid">' +
          '<div class="fid-topo"><span class="fid-faixa">' + esc(d.faixa.nome) + '</span>' +
            '<b>' + d.pontos + '<small>' + (d.pontos === 1 ? ' ponto' : ' pontos') + '</small></b></div>' +
          (d.proxima
            ? '<div class="fid-barra"><i style="width:' + Math.round(d.andado * 100) + '%"></i></div>' +
              '<small>Faltam ' + d.faltam + ' ponto' + (d.faltam === 1 ? '' : 's') +
              ' para ' + esc(d.proxima.nome) + ' · cada ' + B12.brl(fid.reaisPorPonto) + ' vale 1 ponto</small>'
            : '<small>Faixa mais alta da casa.</small>') +
          (d.faixa.mimo ? '<div class="fid-mimo">' + esc(d.faixa.mimo) + '</div>' : '') +
        '</div>'
      : '') +

    sec('Quanto já deixou na B12', [
      l('Total gasto', '<b>' + B12.brl(d.gasto) + '</b>'),
      l('Viagens', String(d.viagens || 0)),
      l('Média por viagem', d.ticket ? B12.brl(d.ticket) : ''),
      l('Em aberto agora', d.aberto ? '<span class="pend">' + B12.brl(d.aberto) + '</span>' : '')
    ]) +

    sec('Em quê', d.cats.map(function (x) { return l(esc(x.cat), B12.brl(x.valor)); })) +
    (d.anos.length > 1
      ? sec('Por ano', d.anos.map(function (x) { return l(x.ano, B12.brl(x.valor)); })) : '') +

    sec('Como viaja', [
      l('Primeira vez', d.primeira ? B12.dataBR(d.primeira) +
        (d.diasDeCasa ? ' · ' + dias(d.diasDeCasa, 'dia de casa', 'dias de casa') : '') : ''),
      l('Última vez', d.ultima ? B12.dataBR(d.ultima) +
        (d.diasSemVir > 0 ? ' · há ' + dias(d.diasSemVir, 'dia', 'dias') : '') : ''),
      l('Costuma ir para', esc(d.destino)),
      l('Costuma ficar em', esc(d.pousada)),
      l('Costuma vir em', d.pessoasTipicas ? d.pessoasTipicas +
        (d.pessoasTipicas > 1 ? ' pessoas' : ' pessoa') : ''),
      /* 24/11/2026: "vai estar o que ele usou, se foi náutico, ou só
         estacionamento, ou os dois" */
      l('O que usa', (function () {
        var c = { nautico: 0, estacionamento: 0, ambos: 0 };
        (d.reservasLista || []).forEach(function (r) {
          var k = r.servico === 'nautico' || r.servico === 'estacionamento' ? r.servico : 'ambos';
          c[k]++;
        });
        var p = [];
        if (c.ambos) p.push('náutico e estacionamento · ' + c.ambos + 'x');
        if (c.nautico) p.push('só náutico · ' + c.nautico + 'x');
        if (c.estacionamento) p.push('só estacionamento · ' + c.estacionamento + 'x');
        return p.join('<br>');
      })()),
      l('Carro', d.placas.length ? esc(d.placas.join(', ')) +
        (d.estadiasPatio ? ' · ' + d.estadiasPatio + ' vez' + (d.estadiasPatio > 1 ? 'es' : '') +
          ' no pátio' : '') +
        (d.diariasPatio ? ' · ' + d.diariasPatio + ' diária' + (d.diariasPatio > 1 ? 's' : '') : '')
        : '')
    ]) +

    sec('Como falar com ela', [
      l('WhatsApp', esc(c.whats)),
      l('E-mail', esc(c.email)),
      l('Instagram', c.instagram ? '@' + esc(c.instagram) : ''),
      l('Cidade', esc(c.cidade)),
      l('Promoções', c.aceitaOfertas
        ? 'aceita' + (c.consentidoEm ? ' · desde ' + B12.dataBR(String(c.consentidoEm).slice(0, 10)) : '')
        : '<span class="pend">não autorizou</span>'),
      l('Cadastro', c.origem === 'app' ? 'feito pelo app' : 'feito no balcão')
    ]) +
    /* 12/11/2026 — o Dhalsin pediu "a ficha de cada cliente com tudo dentro,
       histórico e tudo". Até aqui a ficha mostrava os TOTAIS. Agora mostra o
       extrato: cada travessia e cada estadia no pátio, com data e valor. É o
       que ele hoje procura no caderno quando alguém chega e diz "eu já vim
       aqui". As listas mais novas primeiro, e cortadas em 20 — ficha não é
       relatório; relatório tem aba própria. */
    (d.travessias && d.travessias.length
      ? '<div class="grupo">Travessias (' + d.travessias.length + ')</div>' +
        '<table class="tabela">' + d.travessias.slice(0, 20).map(function (t) {
          return '<tr><td>' + B12.dataBR(t.data) +
            (t.destino ? ' <span style="color:var(--gelo-3)">' + esc(t.destino) + '</span>' : '') +
            '<br><small style="color:var(--gelo-3)">' + t.pax +
            (t.pax > 1 ? ' pessoas' : ' pessoa') +
            (t.criancas ? ', ' + t.criancas + (t.criancas > 1 ? ' crianças' : ' criança') : '') +
            (t.volta ? ' · volta ' + B12.dataBR(t.volta) : ' · sem volta marcada') +
            '</small></td><td class="n">' + (t.valor ? B12.brl(t.valor) : '—') + '</td></tr>';
        }).join('') + '</table>' +
        (d.travessias.length > 20
          ? '<div class="ajuda">Mostrando as 20 mais recentes de ' + d.travessias.length + '.</div>'
          : '')
      : '') +
    (d.patioLista && d.patioLista.length
      ? '<div class="grupo">Estacionamento (' + d.patioLista.length + ')</div>' +
        '<table class="tabela">' + d.patioLista.slice(0, 20).map(function (v) {
          return '<tr><td>' + esc(v.placa || 'sem placa') +
            '<br><small style="color:var(--gelo-3)">entrou ' + B12.dataBR(v.entrada) +
            (v.aberto ? ' · <b>ainda está aqui</b>'
                      : v.saida ? ' · saiu ' + B12.dataBR(v.saida) : '') +
            (v.diarias ? ' · ' + v.diarias + (v.diarias > 1 ? ' diárias' : ' diária') : '') +
            '</small></td><td class="n">' +
            (v.valor ? B12.brl(v.valor) : v.aberto ? 'em aberto' : '—') + '</td></tr>';
        }).join('') + '</table>'
      : '') +
    (!d.lista.length && d.gasto > 0
      ? '<div class="ajuda" style="margin-top:12px">O detalhe por categoria e por ano aparece ' +
        'a partir do primeiro recebimento feito pelo app. O total acima veio do histórico ' +
        'que já existia.</div>' : '') +
    (c.obs ? '<div class="ajuda" style="margin-top:12px"><b>Observações:</b> ' + esc(c.obs) + '</div>' : '') +
    (!c.aceitaOfertas
      ? '<div class="ajuda" style="margin-top:12px">Sem o aceite, esta pessoa <b>não pode</b> entrar ' +
        'em disparo de promoção. Falar sobre a viagem dela, pode.</div>' : '');

  var acoes = '<div class="ficha-acoes">' +
    (zap ? '<button type="button" class="btn sec" id="fc-zap">WhatsApp</button>' : '') +
    /* 24/11/2026: o aviso que aparece no app que a pessoa instalou. Fica ao
       lado do WhatsApp porque são os dois caminhos da mesma conversa. */
    '<button type="button" class="btn sec" id="fc-push">Notificar no celular</button>' +
    /* 24/11/2026: o jeito de a notificação passar a valer alguma coisa é mais
       gente ter o app. O momento é o balcão, com a pessoa ali. */
    (zap ? '<button type="button" class="btn sec" id="fc-convite">Mandar o app</button>' : '') +
    (c.instagram ? '<button type="button" class="btn sec" id="fc-ig">Instagram</button>' : '') +
    (c.email ? '<button type="button" class="btn sec" id="fc-mail">E-mail</button>' : '') +
    '</div>' +
    '<button type="button" class="btn sec" id="fc-editar" style="margin-top:8px">Editar cadastro</button>';

  var form = B12.folha({
    titulo: c.nome,
    sub: d.viagens + (d.viagens === 1 ? ' viagem' : ' viagens') + ' · ' + B12.brl(d.gasto) + ' na casa',
    corpo: corpo,
    extra: acoes,
    acao: 'Fechar',
    aoSalvar: function () { return { ok: true }; },
    depois: function () { if (depois) depois(); }
  });

  /* 24/11/2026: o botão abria uma saudação fixa de uma linha e jogava fora
     todas as mensagens que ele tinha escrito. Agora abre a escolha — as dele
     em cima, já com o nome, o código e a data desta pessoa no lugar das
     marcas; os modelos da casa embaixo. */
  var bz = form.querySelector('#fc-zap');
  if (bz) bz.onclick = function () {
    /* `d.reservas` é a CONTAGEM, não a lista — a lista é reservasLista. Pego
       a mais recente pela data de ida, que é a viagem de que se vai falar. */
    var ult = (d.reservasLista || []).slice().sort(function (a, b) {
      return String(b.ida || '') < String(a.ida || '') ? -1 : 1; })[0] || {};
    B12.escolherMensagem({ nome: c.nome, whats: c.whats, cod: ult.cod || '',
      data: ult.volta || ult.ida || '', hora: ult.horaVolta || ult.hora || '',
      ida: ult.ida || '', volta: ult.volta || '' });
  };
  var bConv = form.querySelector('#fc-convite');
  if (bConv) bConv.onclick = function () {
    var ult = (d.reservasLista || []).slice().sort(function (a, b) {
      return String(b.ida || '') < String(a.ida || '') ? -1 : 1; })[0] || {};
    B12.abrirWhats(c.whats, B12.conviteApp({ nome: c.nome, cod: ult.cod || '' }));
  };
  form.querySelector('#fc-push').onclick = function () {
    B12.formAvisarPessoa(c, (d.reservasLista || []).slice().sort(function (a, b) {
      return String(b.ida || '') < String(a.ida || '') ? -1 : 1; })[0] || {});
  };
  var bi = form.querySelector('#fc-ig');
  if (bi) bi.onclick = function () {
    window.open('https://instagram.com/' + c.instagram, '_blank');
  };
  var bm = form.querySelector('#fc-mail');
  if (bm) bm.onclick = function () {
    window.open('mailto:' + c.email + '?subject=' + encodeURIComponent('Estação B12'), '_blank');
  };
  form.querySelector('#fc-editar').onclick = function () {
    B12.fecharFolha();
    B12.formCliente(c, function () { if (depois) depois(); });
  };
};

/* ------------------------------------------------ avisar UMA pessoa no app
   24/11/2026: "tem que ter botão de notificação fácil de cada cliente para
   chegar no app baixado o push de notificação".

   O texto vem curto de propósito: push não é carta. E a tela diz, antes de
   mandar, que isso só chega em quem instalou — e diz de novo, depois, quando
   não chegou em ninguém. Avisar e não avisar não podem parecer a mesma coisa. */
B12.formAvisarPessoa = function (c, reserva) {
  var r = reserva || {};
  var pri = String(c.nome || '').split(' ')[0];
  B12.folha({
    titulo: 'Notificar ' + pri + ' no celular',
    sub: 'aparece como a notificação do banco, mesmo com a tela bloqueada',
    corpo:
      campo('Título', 'titulo', { valor: 'Estação B12', max: 48, obrig: true }) +
      '<label for="c-texto">Recado</label>' +
      '<textarea' + SEM_AUTO + ' id="c-texto" name="texto" rows="3" maxlength="180" ' +
      'placeholder="duas linhas bastam"></textarea>' +
      '<div class="ajuda">Até 180 letras. O recado inteiro aparece na tela de bloqueio.</div>' +
      (r.volta
        ? '<button type="button" class="btn sec" id="av-retorno" style="margin-top:10px">' +
          'Usar o recado do retorno</button>'
        : '') +
      '<div class="cx nota" style="margin-top:14px"><p>Só chega em quem <b>instalou o app ' +
      'da B12</b> na tela de início do celular e aceitou receber aviso. Quem apenas ' +
      'reservou pelo site <b>não recebe</b> — para essa pessoa, WhatsApp.</p>' +
      '<p style="margin-top:8px">Se ela não tiver instalado, o app avisa você e ' +
      '<b>não manda para mais ninguém</b>.</p></div>',
    acao: 'Mandar o aviso',
    aoAbrir: function (form) {
      var b = form.querySelector('#av-retorno');
      if (b) b.onclick = function () {
        var rec = B12.recadoDeVolta(r.volta);
        form.querySelector('[name=titulo]').value = 'Seu retorno é amanhã';
        form.querySelector('[name=texto]').value = rec.semGrade
          ? 'Seu retorno com a Estação B12 é amanhã. Os horários saem ainda hoje — qualquer coisa, chame no WhatsApp.'
          : 'Seu retorno é amanhã. Horários saindo da Ilha: ' + rec.horas.join(' · ') +
            '. Chegue 10 min antes.';
      };
    },
    aoSalvar: function (d) {
      if (!String(d.texto || '').trim()) return { erro: 'Escreva o recado.' };
      if (!B12.avEnviarPara) return { erro: 'O aviso no celular não está ligado neste app.' };
      return B12.avEnviarPara({ clienteId: c.id, titulo: d.titulo, texto: d.texto });
    },
    depois: function (res) {
      if (!res) return;
      if (res.erro) return B12.aviso(res.erro, 'ruim');
      if (res.aviso) return B12.aviso(res.aviso, 'aviso');
      B12.aviso('Avisado em ' + res.enviados +
        (res.enviados === 1 ? ' aparelho.' : ' aparelhos.'), 'bom');
    }
  });
};

/* --------------------------------------------------- regras de fidelidade
   Quantos reais valem um ponto, e o que cada faixa ganha. Tudo do Dhalsin. */
B12.formFidelidade = function (depois) {
  var f = B12.fidelidade();
  var linhas = f.faixas.map(function (x, i) {
    return '<div class="grupo">Faixa ' + (i + 1) + '</div>' +
      campo('Nome', 'n' + i, { valor: x.nome, max: 20 }) +
      campo('A partir de (pontos)', 'p' + i, { tipo:'number', modo:'numeric', valor: x.de,
        ajuda: i === 0 ? 'A primeira faixa começa sempre em 0.' : '' }) +
      campo('O que ganha', 'm' + i, { valor: x.mimo, dica:'um café, uma diária, um upgrade…' });
  }).join('');

  B12.folha({
    titulo: 'Regras de fidelidade',
    sub: 'Ponto por real gasto · faixa por ponto',
    corpo:
      marca('Contar pontos dos clientes', 'ligada', f.ligada !== false,
        'Desligando, a ficha para de mostrar pontos e faixa. O gasto continua aparecendo.') +
      marca('Mostrar o clube para os clientes', 'publico', !!f.publico,
        'Desligado, o cliente vê "Clube de fidelidade em breve" e pode se cadastrar. ' +
        'Ligue quando os brindes estiverem combinados — a partir daí ele vê o saldo dele.') +
      campo('Quantos reais valem 1 ponto', 'rpp', { tipo:'number', modo:'decimal', passo:'1',
        valor: f.reaisPorPonto, ajuda:'Com 10, quem gasta R$ 300 fica com 30 pontos.' }) +
      campo('Pontos de boas-vindas', 'bonus', { tipo:'number', modo:'numeric',
        valor: f.pontosInstalacao == null ? 20 : f.pontosInstalacao,
        ajuda:'O presente de quem instala o app e se cadastra. Com 0, não há presente.' }) +
      linhas +
      '<div class="ajuda" style="margin-top:14px">São quatro faixas. Para usar menos, ' +
      'apague o nome da que sobrar.</div>',
    acao: 'Salvar regras',
    aoSalvar: function (d) {
      var faixas = f.faixas.map(function (x, i) {
        return { nome: d['n' + i], de: d['p' + i], mimo: d['m' + i] };
      });
      return B12.salvarFidelidade({ ligada: d.ligada, publico: d.publico, reaisPorPonto: d.rpp,
        pontosInstalacao: d.bonus, faixas: faixas });
    },
    depois: function (r) {
      if (r && r.ok) B12.aviso('Regras salvas. As fichas já usam o novo cálculo.', 'bom');
      if (depois) depois();
    }
  });
};

/* ------------------------------------------------- CADASTRE-SE (o turista)
   Curto de propósito: nome, WhatsApp e o aceite. Tudo o mais é opcional e
   fica depois. Quem chega aqui está com o dedo no ar, não quer formulário. */
B12.formCadastro = function (depois) {
  var f = B12.fidelidade(), eu = B12.meuCadastro();
  var clube = f.ligada !== false && !!f.publico;   /* só promete ponto quando o clube está no ar */

  B12.folha({
    titulo: eu ? 'Seu cadastro' : 'Cadastre-se na B12',
    sub: eu ? 'Altere o que quiser' : 'Leva quinze segundos',
    corpo:
      (clube
        ? '<div class="fid" style="margin-bottom:14px"><div class="fid-topo">' +
          '<span class="fid-faixa">Clube B12</span><b>' + (Number(f.pontosInstalacao) || 0) +
          '<small> pontos</small></b></div>' +
          '<small>De boas-vindas, por se cadastrar. Depois é só viajar: cada ' +
          B12.brl(f.reaisPorPonto) + ' vale mais 1 ponto.</small></div>'
        : '<div class="cx aviso" style="margin:0 0 14px"><h3>Clube de fidelidade em breve</h3>' +
          '<p>Quem se cadastra agora entra na primeira turma. A B12 avisa pelo app quando começar.</p></div>') +
      campo('Seu nome', 'nome', { valor: (eu && eu.nome) || '', obrig:true, max:60,
        dica:'como podemos te chamar' }) +
      campo('WhatsApp', 'whats', { tipo:'tel', modo:'tel', valor: (eu && eu.whats) || '',
        dica:'(41) 90000-0000', ajuda:'É por aqui que a B12 confirma sua travessia.' }) +
      campo('E-mail', 'email', { tipo:'email', modo:'email', valor: (eu && eu.email) || '',
        dica:'opcional' }) +
      campo('Instagram', 'instagram', { valor: (eu && eu.instagram) || '', dica:'opcional, sem o @' }) +
      campo('De onde você vem', 'cidade', { valor: (eu && eu.cidade) || '', dica:'opcional', max:40 }) +
      marca('Quero receber promoções e novidades da B12', 'aceitaOfertas',
        eu ? !!eu.aceitaOfertas : true,
        'Você pode desmarcar quando quiser. Sem isso, a B12 só te procura sobre a sua viagem.') +
      '<div class="ajuda" style="margin-top:12px">Seus dados ficam com a B12 e não são ' +
      'vendidos nem repassados. Para apagar, é só pedir no WhatsApp.</div>',
    acao: eu ? 'Salvar' : 'Criar meu cadastro',
    aoSalvar: function (d) { return B12.salvarMeuCadastro(d); },
    depois: function (r) {
      if (r && r.ok && r.novo) return B12.bemVindo(r.cliente, depois);
      if (r && r.ok) B12.aviso('Cadastro atualizado.', 'bom');
      if (depois) depois(r);
    }
  });
};

/* ------------------------------------------------------------- bem-vindo
   A pessoa acabou de se cadastrar. Uma tela curta que agradece, diz o que
   acontece agora, e devolve ela para o app — não para um formulário. */
B12.bemVindo = function (c, depois) {
  var f = B12.fidelidade(), clube = f.ligada !== false && !!f.publico;
  var primeiro = String((c && c.nome) || '').split(' ')[0];

  var form = B12.folha({
    titulo: 'Bem-vindo' + (primeiro ? ', ' + primeiro : '') + '!',
    sub: 'Seu cadastro está feito',
    corpo:
      '<div class="bv"><span class="bv-ico">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
      '</span><p>Agora é só reservar sua travessia. A confirmação e o código chegam ' +
      'no seu WhatsApp.</p></div>' +

      '<div class="grupo">O que você ganha</div>' +
      '<div class="ganha"><b>Reserva</b><span>faça pelo app e receba o voucher no celular</span></div>' +
      '<div class="ganha"><b>Avisos</b><span>horário, maré e promoção da B12 direto para você</span></div>' +
      '<div class="ganha"><b>' + (clube ? 'Pontos' : 'Em breve') + '</b><span>' +
        (clube
          ? 'cada ' + B12.brl(f.reaisPorPonto) + ' gastos vira 1 ponto para desconto e brinde'
          : 'clube de fidelidade: você já está na primeira turma') +
      '</span></div>' +

      '<div class="ajuda" style="margin-top:14px">Quer mudar alguma coisa? É só tocar de novo ' +
      'em Cadastre-se, na entrada do app.</div>',
    extra: '<button type="button" class="btn sec" id="bv-reservar" style="margin-top:0">' +
      'Reservar travessia agora</button>',
    acao: 'Voltar ao app',
    aoSalvar: function () { return { ok: true }; },
    depois: function () { B12.ir('inicio'); if (depois) depois({ ok: true, novo: true }); }
  });
  form.querySelector('#bv-reservar').onclick = function () {
    B12.fecharFolha();
    B12.ir('travessias');
    if (depois) depois({ ok: true, novo: true });
  };
};

/* -------------------------------------------- os horários do dia (véspera)
   Uma folha só, dois blocos: as IDAS (levar para a Ilha) e as VOLTAS (buscar
   na Ilha). O Dhalsin monta na véspera, olhando quem está lá e como está o
   mar. Toca nos horários; não digita nada, a não ser um horário fora da lista.
   Só o que ficar marcado aqui aparece para o passageiro. */
B12.formHorariosDia = function (iso, depois) {
  var d = B12.naIlha(iso) || {};
  var voltam = (d.voltam || []).reduce(function (t, p) { return t + (p.pessoas || 1); }, 0);
  var chegam = (d.chegam || []).reduce(function (t, p) { return t + (p.pessoas || 1); }, 0);

  function bloco(sentido, titulo, ajuda, sugeridas) {
    var campo = sentido === 'ida' ? 'saidaId' : 'saidaVoltaId';
    var jaTem = B12.saidasDoDia(iso, sentido);
    var atuais = jaTem.map(function (s) { return s.hora; });
    var presas = jaTem.filter(function (s) {
      return s.ocupadas > 0 || B12.DB.reservas.some(function (r) { return r[campo] === s.id; });
    }).map(function (s) { return s.hora; });
    var todas = sugeridas.concat(atuais)
      .filter(function (h, i, a) { return a.indexOf(h) === i; }).sort();

    /* 12/11/2026, regra do Eugênio: "não deixar horários prontos, horários
       sempre editáveis". A grade que aparece aqui é SUGESTÃO — a do dia
       anterior ou a que ele guardou em Ajustes. Cada horário tem ✎ para
       mudar a hora e × para tirar da lista. O único que não se mexe é o que
       JÁ TEM PASSAGEIRO: mudar esse é furar a viagem de alguém que já
       comprou, e isso se resolve falando com a pessoa, não na tela. */
    return '<div class="grupo">' + titulo + '</div>' +
      '<p style="font-size:12.5px;color:var(--gelo-3);margin-bottom:10px">' + ajuda +
      ' Toque para ligar ou desligar · <b>✎</b> muda a hora · <b>×</b> tira da lista.</p>' +
      '<div class="horas" id="hx-' + sentido + '">' + todas.map(function (h) {
        return chip(sentido, h, atuais.indexOf(h) >= 0, presas.indexOf(h) >= 0);
      }).join('') + '</div>' +
      (presas.length
        ? '<div class="ajuda" style="margin-top:8px">' + presas.join(', ') + ' não sai' +
          (presas.length > 1 ? 'em' : '') + ': já tem passageiro. Para mudar, fale com a pessoa antes.</div>'
        : '') +
      campo_hora(sentido) +
      '<input type="hidden" name="h-' + sentido + '" value="' + atuais.join(',') + '">';
  }
  /* um horário na tela: o chip que liga/desliga, mais ✎ e ×. Fica em função
     porque quem acrescenta um horário novo precisa montar exatamente igual. */
  function chip(sentido, h, ligado, presa) {
    return '<span class="hgrupo' + (presa ? ' presa' : '') + '" data-s="' + sentido + '">' +
      '<button type="button" class="hchip' + (ligado ? ' on' : '') + (presa ? ' presa' : '') +
      '" data-s="' + sentido + '" data-h="' + h + '"' + (presa ? ' disabled' : '') + '>' +
      h + (presa ? ' ·com gente' : '') + '</button>' +
      (presa ? '' :
        '<button type="button" class="hmini" data-edita aria-label="Mudar o horário de ' + h + '">✎</button>' +
        '<button type="button" class="hmini hmini-x" data-tira aria-label="Tirar o horário de ' + h + '">×</button>') +
      '</span>';
  }

  function campo_hora(sentido) {
    return '<label for="c-extra-' + sentido + '" style="margin-top:10px">Acrescentar um horário</label>' +
      '<input id="c-extra-' + sentido + '" name="extra-' + sentido + '" type="time">';
  }

  var form = B12.folha({
    titulo: 'Horários de ' + B12.dataBR(iso),
    sub: (chegam ? chegam + ' chega' + (chegam > 1 ? 'm' : '') : 'ninguém marcado') +
         ' · ' + (voltam ? voltam + ' volta' + (voltam > 1 ? 'm' : '') : 'nenhuma volta'),
    corpo:
      /* 24/11/2026, "eliminar horário de ida": a ida é livre. A lancha sai
         quando tem gente, e quem atende registra no Cadastro. O que ele monta
         na véspera, olhando quem está lá e como está o mar, é o RETORNO.

         O bloco da ida saiu da tela. O campo escondido `h-ida` fica, com os
         horários que já existem, para `aoSalvar` não apagar as saídas de ida
         que ainda tenham passageiro marcado. */
      bloco('volta', 'Retornos — buscar na Ilha',
        'Os horários em que a lancha vai buscar quem está lá.', B12.voltasSugeridas()) +
      '<input type="hidden" name="h-ida" value="' +
        B12.saidasDoDia(iso, 'ida').map(function (s) { return s.hora; }).join(',') + '">' +
      /* era "Para as duas" quando havia ida e volta; agora só existe o
         retorno (24/11/2026) */
      '<div class="grupo">Da lancha</div>' +
      campo('Lugares por saída', 'vagas', { tipo:'number', modo:'numeric', valor: B12.CAPACIDADE,
        ajuda: 'A lancha leva ' + B12.CAPACIDADE + ' pessoas.' }) +
      campo('Marinheiro do dia', 'marinheiro', { valor: '', dica: 'opcional' }),
    acao: 'Salvar os horários',
    aoAbrir: function (f) {
      /* só o retorno tem tela desde 24/11/2026; a ida viaja no campo
         escondido e não tem nada para ligar */
      ['volta'].forEach(function (sentido) {
        var guardadas = f.querySelector('[name="h-' + sentido + '"]');
        function sincronizar() {
          var m = [];
          f.querySelectorAll('.hchip.on[data-s="' + sentido + '"]').forEach(function (b) { m.push(b.dataset.h); });
          guardadas.value = m.join(',');
        }
        var caixa = f.querySelector('#hx-' + sentido);

        /* põe os horários em ordem na tela: 08:30 antes de 10:00, sempre,
           inclusive depois de alguém editar um para uma hora mais cedo */
        function ordenar() {
          var g = Array.prototype.slice.call(caixa.querySelectorAll('.hgrupo'));
          g.sort(function (a, b) {
            var ha = a.querySelector('.hchip').dataset.h, hb = b.querySelector('.hchip').dataset.h;
            return ha < hb ? -1 : ha > hb ? 1 : 0;
          });
          g.forEach(function (x) { caixa.appendChild(x); });
        }

        function existe(h, menos) {
          var achou = false;
          caixa.querySelectorAll('.hchip').forEach(function (c) {
            if (c !== menos && c.dataset.h === h) achou = true;
          });
          return achou;
        }

        function ligarGrupo(g) {
          var chip = g.querySelector('.hchip');
          if (!chip.disabled) chip.onclick = function () { chip.classList.toggle('on'); sincronizar(); };

          var bE = g.querySelector('[data-edita]');
          if (bE) bE.onclick = function () {
            if (g.querySelector('input[type=time]')) return;   /* já está editando */
            var ed = document.createElement('input');
            ed.type = 'time'; ed.className = 'hedita'; ed.value = chip.dataset.h;
            g.insertBefore(ed, chip); chip.hidden = true; bE.hidden = true;
            function fim(valendo) {
              var h = ed.value;
              ed.remove(); chip.hidden = false; bE.hidden = false;
              if (!valendo || !h || h === chip.dataset.h) return;
              if (existe(h, chip)) return B12.aviso('Já existe um horário de ' + h + '.', 'ruim');
              chip.dataset.h = h; chip.textContent = h; chip.classList.add('on');
              ordenar(); sincronizar();
            }
            ed.onchange = function () { fim(true); };
            ed.onblur   = function () { fim(true); };
            ed.onkeydown = function (ev) {
              if (ev.key === 'Enter') { ev.preventDefault(); fim(true); }
              if (ev.key === 'Escape') { ev.preventDefault(); fim(false); }
            };
            setTimeout(function () { ed.focus(); }, 30);
          };

          var bX = g.querySelector('[data-tira]');
          if (bX) bX.onclick = function () { g.remove(); sincronizar(); };
        }

        caixa.querySelectorAll('.hgrupo').forEach(ligarGrupo);

        var extra = f.querySelector('[name="extra-' + sentido + '"]');
        extra.onchange = function () {
          var h = extra.value; if (!h) return;
          var ja = f.querySelector('.hchip[data-s="' + sentido + '"][data-h="' + h + '"]');
          if (ja) { ja.classList.add('on'); }
          else {
            var tmp = document.createElement('div');
            tmp.innerHTML = chip(sentido, h, true, false);
            var g = tmp.firstChild;
            caixa.appendChild(g); ligarGrupo(g); ordenar();
          }
          extra.value = ''; sincronizar();
        };
      });
    },
    aoSalvar: function (dd) {
      var opc = { vagas: dd.vagas, marinheiro: dd.marinheiro };
      var idas = String(dd['h-ida'] || '').split(',').filter(Boolean);
      var voltas = String(dd['h-volta'] || '').split(',').filter(Boolean);
      if (!voltas.length) {
        return { erro: 'Marque pelo menos um horário de retorno.' };
      }
      var r1 = idas.length ? B12.abrirSaidas(iso, 'ida', idas, opc) : { total: 0 };
      if (r1.erro) return r1;
      var r2 = voltas.length ? B12.abrirSaidas(iso, 'volta', voltas, opc) : { total: 0 };
      if (r2.erro) return r2;
      return { ok: true, idas: r1.total, voltas: r2.total };
    },
    depois: function (r) {
      if (r && r.ok) {
        B12.aviso('Retornos de ' + B12.dataBR(iso) + ' salvos: ' + r.voltas +
          (r.voltas === 1 ? ' horário.' : ' horários.'), 'bom');
      }
      if (depois) depois(r);
    }
  });
  return form;
};
/* o nome antigo continua valendo */
B12.formVoltas = function (iso, depois) { return B12.formHorariosDia(iso, depois); };

/* -------------------------------------------- escolher a senha da nuvem
   16/11/2026. A tela que faltava: quem chega pelo link do e-mail cai aqui.
   Não pede a senha antiga — quem abriu o link já provou que é dono do
   e-mail, que é exatamente o que o link serve para provar. */
B12.formSenhaNova = function (depois) {
  B12.folha({
    titulo: 'Escolha a senha da nuvem',
    sub: 'É com ela que você entra em qualquer aparelho',
    corpo:
      '<p style="font-size:13px;color:var(--gelo-3);margin-bottom:14px">Esta é a senha da ' +
      '<b>conta</b>, não o PIN. O PIN é a tranca rápida de cada aparelho; esta senha é o que ' +
      'faz o celular, o tablet e o computador mostrarem a mesma coisa.</p>' +
      campo('Senha nova', 'senha', { tipo:'password', obrig:true,
        ajuda:'de 8 letras ou números para cima' }) +
      campo('Repita a senha', 'senha2', { tipo:'password', obrig:true }) +
      '<div class="ajuda" style="margin-top:12px">Guarde no gerenciador de senhas do ' +
      'aparelho. Se perder, dá para pedir outro link.</div>',
    acao: 'Guardar a senha',
    aoSalvar: function (d) {
      if (!d.senha || !d.senha2) return { erro: 'Preencha os dois campos.' };
      if (d.senha !== d.senha2) return { erro: 'As duas senhas não bateram. Digite de novo.' };
      return { esperar: B12.nuvTrocarSenha(d.senha) };
    },
    depois: function (r) {
      if (r && r.ok) {
        B12.aviso('Pronto. Você está ligado na nuvem como ' + (r.email || 'sua conta') + '.', 'bom');
      }
      if (depois) depois(r);
    }
  });
};

/* ----------------------------------------------------- o login da nuvem
   O PIN é a porta do balcão; este é o que o banco entende. A folha diz a
   diferença em uma frase, porque ele vai perguntar. */
B12.formNuvemEntrar = function (depois) {
  var eu = B12.nuvQuem && B12.nuvQuem();
  if (eu) {
    return B12.folha({
      titulo: 'Nuvem ligada',
      sub: eu.email + ' · ' + eu.papel,
      corpo:
        '<div class="bv"><span class="bv-ico">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
          'stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
        '</span><p>Este aparelho está ligado no banco da B12 como <b>' + esc(eu.papel) + '</b>.</p></div>' +
        '<div class="ajuda" style="margin-top:14px">Saindo daqui, o app volta a guardar só ' +
        'neste aparelho e os avisos no celular param. Seus dados não se perdem.</div>',
      extra: '<button type="button" class="btn sec" id="nv-sair" style="margin-top:0">' +
        'Sair da nuvem neste aparelho</button>',
      acao: 'Fechar',
      aoSalvar: function () { return { ok: true }; },
      depois: function () { if (depois) depois(); },
      aoAbrir: function (f) {
        f.querySelector('#nv-sair').onclick = function () {
          B12.nuvSair();
          B12.fecharFolha();
          B12.aviso('Saiu da nuvem neste aparelho.', 'bom');
          if (depois) depois();
        };
      }
    });
  }

  B12.folha({
    titulo: 'Ligar a nuvem',
    sub: 'O login que o banco da B12 entende',
    corpo:
      '<p style="font-size:13px;color:var(--gelo-3);margin-bottom:14px">O PIN continua ' +
      'sendo a sua entrada rápida no balcão. Este login é outra coisa: é ele que faz o ' +
      'celular e o computador mostrarem a mesma coisa, e é ele que libera o aviso no celular.</p>' +
      campo('E-mail', 'email', { tipo:'email', modo:'email', obrig:true, dica:'o e-mail da conta da B12' }) +
      campo('Senha', 'senha', { tipo:'password', obrig:true }) +
      '<button type="button" class="portao-link" id="nv-esqueci" style="margin-top:12px">' +
      'Esqueci minha senha</button>' +
      '<div class="ajuda" style="margin-top:8px">Quem não tem conta não entra aqui — e o ' +
      'banco recusa, não é só a tela.</div>',
    acao: 'Entrar',
    aoAbrir: function (f) {
      /* 16/11/2026: o pedido do link sai DAQUI, apontando para este app. Pelo
         painel do Supabase o link iria para o Site URL do projeto, que é o app
         do estúdio — o cliente cairia no lugar errado. */
      f.querySelector('#nv-esqueci').onclick = function () {
        var email = String((f.querySelector('[name=email]') || {}).value || '').trim();
        B12.fecharFolha();
        B12.formPedirSenha(email, depois);
      };
    },
    aoSalvar: function (d) {
      if (!d.email || !d.senha) return { erro: 'Preencha o e-mail e a senha.' };
      return { esperar: B12.nuvEntrar(d.email, d.senha) };
    },
    depois: depois
  });
};

/* ------------------------------------------- pedir o link da senha nova */
B12.formPedirSenha = function (email, depois) {
  B12.folha({
    titulo: 'Esqueci minha senha',
    sub: 'Chega um link no seu e-mail',
    corpo:
      '<p style="font-size:13px;color:var(--gelo-3);margin-bottom:14px">Escreva o e-mail da ' +
      'conta. Vai chegar um link que abre <b>neste app</b> e deixa você escolher uma senha ' +
      'nova. O link vale por uma hora.</p>' +
      campo('E-mail', 'email', { tipo:'email', modo:'email', obrig:true, valor: email || '' }),
    acao: 'Mandar o link',
    aoSalvar: function (d) { return { esperar: B12.nuvPedirSenha(d.email) }; },
    depois: function (r) {
      if (r && r.ok) {
        /* recado que não entrega se a conta existe ou não */
        B12.aviso('Se essa conta existir, o link já está a caminho. Olhe o e-mail.', 'bom');
      }
      if (depois) depois(r);
    }
  });
};

})();

/* ------------------------------------------------------- ficha do marinheiro
   Curta de propósito: o marinheiro não entra no app, ele recebe a escala pelo
   WhatsApp. Só o nome chega ao turista. */
B12.fichaMarinheiro = function (id, depois) {
  var m = (B12.DB.marinheiros || []).filter(function (x) { return x.id === id; })[0] ||
          { id:null, nome:'', whats:'', doc:'', venceEm:'', ativo:true, obs:'' };
  var novo = !m.id;
  B12.folha({
    titulo: novo ? 'Novo marinheiro' : m.nome,
    sub: 'A escala vai pelo WhatsApp — ele não precisa entrar no app',
    corpo:
      B12.f_campo('Nome', 'nome', { valor:m.nome, obrig:true, max:40,
        ajuda:'é este nome que aparece na saída, para a equipe e para o turista' }) +
      B12.f_campo('WhatsApp', 'whats', { valor:m.whats, tipo:'tel', modo:'tel',
        dica:'(41) 90000-0000', ajuda:'para onde a escala do dia é enviada' }) +
      '<div class="grade2">' +
        '<div>' + B12.f_campo('Habilitação (Arrais)', 'doc', { valor:m.doc, max:24 }) + '</div>' +
        '<div>' + B12.f_campo('Vence em', 'venceEm', { valor:m.venceEm, tipo:'date',
          ajuda:'o painel avisa 30 dias antes' }) + '</div></div>' +
      B12.f_campo('Observação', 'obs', { valor:m.obs, max:200 }) +
      B12.f_marca('Está na ativa', 'ativo', m.ativo),
    extra: novo ? '' : '<button type="button" class="btn sec" id="b-mar-apagar">Apagar</button>',
    aoSalvar: function (d) {
      var nome = String(d.nome || '').trim();
      if (!nome) return { erro:'O nome é obrigatório.', campo:'nome' };
      if (novo) {
        m.id = 'mar' + Date.now().toString(36);
        B12.DB.marinheiros.push(m);
      }
      m.nome = nome; m.whats = d.whats || ''; m.doc = d.doc || '';
      m.venceEm = d.venceEm || ''; m.obs = d.obs || ''; m.ativo = !!d.ativo;
      B12.salvar();
      if (depois) depois(m);
      return { ok:true };
    }
  });
  var ap = document.getElementById('b-mar-apagar');
  if (ap) ap.onclick = function () {
    if (!confirm('Apagar a ficha de ' + m.nome + '? As saídas já feitas continuam com o nome dele.')) return;
    B12.DB.marinheiros = B12.DB.marinheiros.filter(function (x) { return x.id !== m.id; });
    B12.salvar(); B12.fecharFolha(); if (depois) depois(null);
  };
};

/* ------------------------------------------------------------ evento/festival
   O que está marcado na Ilha e em Pontal. Vira aviso com um toque. */
B12.fichaEvento = function (id, depois) {
  var A = B12.DB.ajustes;
  A.eventos = A.eventos || [];
  var e = A.eventos.filter(function (x) { return x.id === id; })[0] ||
          { id:null, nome:'', dia:'', onde:'Ilha do Mel', obs:'' };
  var novo = !e.id;
  B12.folha({
    titulo: novo ? 'Novo evento' : e.nome,
    sub: 'Entra na tela do cliente e vira aviso no celular',
    corpo:
      B12.f_campo('Nome', 'nome', { valor:e.nome, obrig:true, max:48,
        dica:'Festival de Inverno, Réveillon, show…' }) +
      '<div class="grade2">' +
        '<div>' + B12.f_campo('Quando', 'dia', { valor:e.dia, tipo:'date', obrig:true }) + '</div>' +
        '<div>' + B12.f_campo('Onde', 'onde', { valor:e.onde, max:32 }) + '</div></div>' +
      B12.f_campo('Uma linha a mais', 'obs', { valor:e.obs, max:90,
        ajuda:'entra no texto do aviso; deixe vazio se não precisar' }),
    extra: novo ? '' : '<button type="button" class="btn sec" id="b-ev-apagar">Apagar</button>',
    aoSalvar: function (d) {
      var nome = String(d.nome || '').trim();
      if (!nome) return { erro:'O nome é obrigatório.', campo:'nome' };
      if (!d.dia) return { erro:'Escolha a data do evento.', campo:'dia' };
      if (novo) { e.id = 'ev' + Date.now().toString(36); A.eventos.push(e); }
      e.nome = nome; e.dia = d.dia; e.onde = d.onde || 'Ilha do Mel'; e.obs = d.obs || '';
      B12.salvar();
      if (depois) depois(e);
      return { ok:true };
    }
  });
  var ap = document.getElementById('b-ev-apagar');
  if (ap) ap.onclick = function () {
    if (!confirm('Apagar “' + e.nome + '”?')) return;
    A.eventos = A.eventos.filter(function (x) { return x.id !== e.id; });
    B12.salvar(); B12.fecharFolha(); if (depois) depois(null);
  };
};

/* ------------------------------------------------------------- consumo
   Duas leituras do mesmo carrinho: uma do formulário vivo (para a prévia) e
   outra dos dados já colhidos (para gravar). */
B12.somarConsumo = function (form) {
  var itens = [], total = 0;
  (B12.DB.ajustes.produtos || []).forEach(function (pr) {
    var c = form.querySelector('[name="qtd_' + pr.id + '"]');
    var q = c ? Math.max(0, +c.value || 0) : 0;
    if (q) { itens.push({ id: pr.id, nome: pr.nome, qtd: q, valor: pr.valor });
             total += q * pr.valor; }
  });
  return { itens: itens, total: total };
};
B12.lerConsumo = function (d) {
  var itens = [], total = 0;
  (B12.DB.ajustes.produtos || []).forEach(function (pr) {
    var q = Math.max(0, +d['qtd_' + pr.id] || 0);
    if (q) { itens.push({ id: pr.id, nome: pr.nome, qtd: q, valor: pr.valor });
             total += q * pr.valor; }
    delete d['qtd_' + pr.id];
  });
  return { itens: itens, total: total };
};
