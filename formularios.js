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
  B12.fecharFolha();
  var f = document.createElement('div');
  f.className = 'folha';
  f.innerHTML =
    '<div class="folha-fundo"></div>' +
    '<form class="folha-cx" novalidate>' +
      '<div class="folha-alca"></div>' +
      '<div class="folha-topo">' +
        '<div><h3>' + opc.titulo + '</h3>' +
        (opc.sub ? '<p>' + opc.sub + '</p>' : '') + '</div>' +
        '<button type="button" class="folha-x" aria-label="Fechar">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
        'stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
      '</div>' +
      '<div class="folha-corpo">' + opc.corpo + '</div>' +
      '<div class="folha-pe">' +
        '<div class="folha-erro" hidden></div>' +
        (opc.extra || '') +
        '<button type="submit" class="btn pri" style="margin-top:0">' +
        (opc.acao || 'Salvar') + '</button>' +
      '</div>' +
    '</form>';
  document.body.appendChild(f);
  aberta = f;
  document.body.style.overflow = 'hidden';

  var form = f.querySelector('form');
  var erro = f.querySelector('.folha-erro');
  function fechar() { B12.fecharFolha(); }
  f.querySelector('.folha-x').onclick = fechar;
  f.querySelector('.folha-fundo').onclick = fechar;

  form.onsubmit = function (ev) {
    ev.preventDefault();
    var dados = {};
    form.querySelectorAll('[name]').forEach(function (c) {
      dados[c.name] = c.type === 'checkbox' ? c.checked : c.value;
    });
    var r = opc.aoSalvar(dados);
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
};
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') B12.fecharFolha(); });

/* ---------------------------------------------------------- peças de campo */
function campo(rot, nome, opc) {
  opc = opc || {};
  return '<label for="c-' + nome + '">' + rot + (opc.obrig ? ' *' : '') + '</label>' +
    '<input id="c-' + nome + '" name="' + nome + '" type="' + (opc.tipo || 'text') + '"' +
    (opc.modo ? ' inputmode="' + opc.modo + '"' : '') +
    (opc.passo ? ' step="' + opc.passo + '"' : '') +
    (opc.valor != null ? ' value="' + String(opc.valor).replace(/"/g, '&quot;') + '"' : '') +
    (opc.dica ? ' placeholder="' + opc.dica + '"' : '') +
    (opc.max ? ' maxlength="' + opc.max + '"' : '') + '>' +
    (opc.ajuda ? '<div class="ajuda">' + opc.ajuda + '</div>' : '');
}
function lista(rot, nome, itens, sel) {
  return '<label for="c-' + nome + '">' + rot + '</label><select id="c-' + nome +
    '" name="' + nome + '">' + itens.map(function (i) {
      var v = Array.isArray(i) ? i[0] : i, t = Array.isArray(i) ? i[1] : i;
      return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + t + '</option>';
    }).join('') + '</select>';
}
function marca(rot, nome, ligado, ajuda) {
  return '<label class="aceite"><input type="checkbox" name="' + nome + '"' +
    (ligado ? ' checked' : '') + '><span><b>' + rot + '</b>' +
    (ajuda ? '<small>' + ajuda + '</small>' : '') + '</span></label>';
}
function grupo(titulo) { return '<div class="grupo">' + titulo + '</div>'; }
B12.f_campo = campo; B12.f_lista = lista; B12.f_marca = marca;

var PAGAMENTOS = [['pix','Pix'],['dinheiro','Dinheiro'],['credito','Cartão de crédito'],
                  ['debito','Cartão de débito'],['transferencia','Transferência']];

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
      lista('Ficou em qual pousada', 'pousada',
        ['', 'Direto (sem pousada)'].concat(B12.PARCEIROS.map(function (p) { return p.nome; }))
          .concat(['Outra']), c.pousada || '') +
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
      campo('Valor da diária', 'diaria', { tipo:'number', passo:'1', modo:'numeric',
        valor: B12.DB.ajustes.diaria }) +
      lista('Quando cobrar', 'cobrarAgora', [['0','Na saída, pelo tempo real'],
        ['1','Agora, pelo tempo previsto (acerta a diferença na saída)']],
        cfg.cobranca === 'chegada' ? '1' : '0') +
      lista('Forma de pagamento (se cobrar agora)', 'pg', PAGAMENTOS, 'pix') +
      '<div class="previa" id="previa-patio"><span>Previsto</span><b>—</b></div>',
    acao: 'Registrar entrada',
    aoAbrir: function (form) {
      function calc() {
        var d = form.querySelector('[name=entrada]').value, h = form.querySelector('[name=hora]').value;
        var sp = form.querySelector('[name=saidaPrevista]').value, di = +form.querySelector('[name=diaria]').value || 0;
        var falso = { entrada: d, entradaEm: B12.instante(d, h), diaria: di };
        var dias = sp ? B12.diariasDe(falso, B12.instante(sp, h)) : 1;
        form.querySelector('#previa-patio').innerHTML = '<span>' + (sp ? dias + (dias > 1 ? ' diárias previstas' : ' diária prevista') : 'sem data de saída: 1 diária') +
          '</span><b>' + B12.brl(dias * di) + '</b>';
      }
      form.querySelectorAll('[name=entrada],[name=hora],[name=saidaPrevista],[name=diaria]')
        .forEach(function (c) { c.oninput = calc; c.onchange = calc; });
      calc();
    },
    aoSalvar: function (d) { d.cobrarAgora = d.cobrarAgora === '1'; return B12.entradaPatio(d); },
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
      lista('Como pagou', 'pg', PAGAMENTOS, 'pix'),
    acao: 'Confirmar saída',
    aoAbrir: function (form) {
      function calc() {
        var h = form.querySelector('[name=hora]').value;
        var c = B12.valorPatio(v, B12.instante(B12.hoje(), h));
        form.querySelector('#resumo-patio').innerHTML =
          '<div><span>Entrou</span><b>' + B12.dataBR(v.entrada) + (v.entradaEm ? ' às ' + B12.horaBR(v.entradaEm) : '') + '</b></div>' +
          '<div><span>Regra</span><b>' + (cfg.regra === '24h' ? 'a cada 24 h' : 'por dia') + '</b></div>' +
          '<div><span>Diárias</span><b>' + c.dias + '</b></div>' +
          '<div><span>Valor da diária</span><b>' + B12.brl(v.diaria) + '</b></div>' +
          (c.pago ? '<div><span>Já pago na chegada</span><b>− ' + B12.brl(c.pago) + '</b></div>' : '') +
          '<div class="tot"><span>' + (c.resta ? 'A cobrar agora' : 'Nada a cobrar') + '</span><b>' + B12.brl(c.resta) + '</b></div>' +
          (c.credito ? '<div><span>Ficou a menos do que o pago</span><b>' + B12.brl(c.credito) + ' de crédito</b></div>' : '');
        form.querySelector('button[type=submit]').textContent = c.resta ? 'Confirmar saída e cobrar' : 'Confirmar saída';
      }
      form.querySelector('[name=hora]').onchange = calc; form.querySelector('[name=hora]').oninput = calc; calc();
    },
    aoSalvar: function (d) { return B12.saidaPatio(id, d.pg, d.hora); },
    depois: depois
  });
};

/* ================================================ ATENDIMENTO DE BALCÃO */
/* A pessoa chegou agora, sem reserva. Ficha + venda + carro num caminho só. */
B12.formBalcao = function (depois) {
  var faixaAgora = B12.faixaHora(new Date().getHours() + ':00');
  B12.folha({
    titulo: 'Chegou agora',
    sub: 'Cadastra a pessoa, lança a travessia e abre o pátio, de uma vez',
    corpo:
      grupo('Quem é') +
      campo('Nome', 'nome', { obrig:true, max:60, dica:'como a pessoa se chama' }) +
      campo('WhatsApp', 'whats', { tipo:'tel', modo:'tel', dica:'(41) 90000-0000' }) +
      campo('E-mail', 'email', { tipo:'email', modo:'email', dica:'opcional' }) +
      campo('Instagram', 'instagram', { dica:'opcional, sem o @' }) +
      campo('CPF', 'cpf', { modo:'numeric', max:14, dica:'só se pedir nota fiscal' }) +
      lista('Pousada', 'pousada', ['', 'Direto (sem pousada)']
        .concat(B12.PARCEIROS.map(function (p) { return p.nome; })).concat(['Outra']), '') +
      grupo('A travessia') +
      '<div class="par">' +
        '<div>' + campo('Pessoas', 'pax', { tipo:'number', modo:'numeric', valor:1, passo:'1' }) + '</div>' +
        '<div>' + campo('Até 5 anos', 'criancas', { tipo:'number', modo:'numeric', valor:0, passo:'1' }) + '</div>' +
      '</div>' +
      lista('Destino', 'destino', B12.DESTINOS, 'Brasília') +
      campo('Data da volta', 'volta', { tipo:'date', ajuda:'Opcional. Se souber, o app já mostra os horários de volta na data certa.' }) +
      lista('Serviço', 'produto', [['regular','Travessia regular'],
        ['nautico','Serviço Náutico Premium']], 'regular') +
      lista('Faixa de horário', 'faixa', [['dia','08h30 às 18h00'],['tarde','18h00 às 20h00'],
        ['noite','20h00 às 22h00'],['fora','Fora da tabela']], faixaAgora) +
      campo('Valor combinado', 'valorManual', { tipo:'number', passo:'0.01', modo:'decimal',
        dica:'só se for fora da tabela' }) +
      lista('Pagamento', 'pg', PAGAMENTOS, 'pix') +
      campo('Marinheiro', 'responsavel', { dica:'quem levou', max:30 }) +
      grupo('Deixou carro?') +
      campo('Placa', 'placa', { dica:'deixe vazio se não deixou carro', max:8 }) +
      campo('Saída prevista', 'saidaPrevista', { tipo:'date' }) +
      grupo('Consentimento') +
      marca('Aceita receber ofertas e novidades', 'aceitaOfertas', false,
        'Guardado com data e hora. Sem isso, só dá para falar sobre a viagem dele.') +
      '<div class="previa" id="previa-balcao"></div>',
    acao: 'Registrar atendimento',
    aoAbrir: function (form) {
      function calcular() {
        var pax = +form.querySelector('[name=pax]').value || 1;
        var cri = +form.querySelector('[name=criancas]').value || 0;
        var pr = B12.preco({ produto: form.querySelector('[name=produto]').value,
          pax: pax, criancas: cri, faixa: form.querySelector('[name=faixa]').value,
          diarias: 0, pg: form.querySelector('[name=pg]').value });
        form.querySelector('#previa-balcao').innerHTML = pr
          ? '<span>A cobrar</span><b>' + B12.brl(pr.travessia) + '</b>'
          : '<span>Fora da tabela</span><b>informe o valor</b>';
      }
      form.querySelectorAll('[name=pax],[name=criancas],[name=produto],[name=faixa],[name=pg]')
        .forEach(function (c) { c.oninput = calcular; c.onchange = calcular; });
      calcular();
    },
    aoSalvar: function (d) {
      d.pax = +d.pax || 1; d.criancas = +d.criancas || 0;
      return B12.atenderBalcao(d);
    },
    depois: depois
  });
};

/* depois do balcão: entrega o código no WhatsApp da pessoa, já com o link do app */
B12.aposBalcao = function (res) {
  if (!res || !res.reserva) return;
  var r = res.reserva;
  B12.folhaMensagem('confirmacao', { nome: r.nome, whats: r.zap, cod: r.cod, ida: r.ida,
    volta: r.volta, hora: res.saida ? res.saida.hora : '', pax: r.pax, total: r.total });
};

/* ============================================== botão flutuante de ações */
B12.menuMais = function () {
  var f = document.createElement('div');
  f.className = 'folha';
  f.innerHTML = '<div class="folha-fundo"></div><div class="folha-cx">' +
    '<div class="folha-alca"></div>' +
    '<div class="folha-topo"><div><h3>O que você quer registrar?</h3></div></div>' +
    '<div class="folha-corpo acoes">' +
    acao('balcao','Cliente chegou agora','Ficha, travessia e carro de uma vez','#0E8C80') +
    acao('entrada','Entrada de dinheiro','Venda, comissão, outra receita','#2FA76A') +
    acao('saida','Saída de dinheiro','Combustível, compra, taxa','#D2564A') +
    acao('manut','Manutenção da lancha','Conserto, revisão ou equipamento novo','#D9932B') +
    acao('carro','Carro entrando no pátio','Placa, dono e saída prevista','#3C86B8') +
    acao('cliente','Cadastrar cliente','Só a ficha, sem venda','#6C8FA3') +
    '</div></div>';
  document.body.appendChild(f);
  document.body.style.overflow = 'hidden';
  function fechar() { f.remove(); document.body.style.overflow = ''; }
  f.querySelector('.folha-fundo').onclick = fechar;
  var recarrega = function () { if (B12.admDesenhar) B12.admDesenhar(); };
  f.querySelectorAll('[data-acao]').forEach(function (b) {
    b.onclick = function () {
      var a = b.dataset.acao; fechar();
      if (a === 'balcao')  B12.formBalcao(function (res) { recarrega(); B12.aposBalcao(res); });
      if (a === 'entrada') B12.formLancamento('entrada', {}, recarrega);
      if (a === 'saida')   B12.formLancamento('saida', {}, recarrega);
      if (a === 'manut')   B12.formManutencao(recarrega);
      if (a === 'carro')   B12.formEntradaPatio(recarrega);
      if (a === 'cliente') B12.formCliente(null, recarrega);
    };
  });
};
function acao(id, titulo, sub, cor) {
  return '<button type="button" class="acao" data-acao="' + id + '">' +
    '<span class="bolinha" style="background:' + cor + '"></span>' +
    '<span class="txt"><b>' + titulo + '</b><small>' + sub + '</small></span>' +
    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>';
}

})();
