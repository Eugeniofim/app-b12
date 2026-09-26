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
      B12.f_lista('Tarifa', 'tarifa', [
        ['balcao', 'Balcão · ' + B12.brl(B12.DB.ajustes.diaria)],
        ['combinada', 'Combinada · ' + B12.brl(B12.DB.ajustes.diariaEspecial)]], 'balcao') +
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
    aoSalvar: function (d) {
      if (d.tarifa === 'combinada') d.diaria = B12.DB.ajustes.diariaEspecial; d.cobrarAgora = d.cobrarAgora === '1'; return B12.entradaPatio(d); },
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
  var agora = new Date();
  var horaAgora = String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0');
  var faixaAgora = B12.faixaHora(horaAgora);
  B12.folha({
    titulo: 'Chegou agora',
    sub: 'Na mesma ordem da ficha de papel',
    corpo:
      /* ---- a ficha, campo por campo, como está no bloquinho ---- */
      '<div class="par">' +
        '<div style="grid-column:span 2">' + campo('Nome', 'nome', { obrig:true, max:60, dica:'como a pessoa se chama' }) + '</div>' +
      '</div>' +
      '<div class="par">' +
        '<div>' + campo('Nº pessoas', 'pax', { tipo:'number', modo:'numeric', valor:1, passo:'1' }) + '</div>' +
        '<div>' + campo('Idades das crianças', 'idades', { modo:'numeric', max:24,
          dica:'3, 7, 11' }) + '</div>' +
      '</div>' +
      '<div class="par">' +
        '<div>' + campo('Ida', 'data', { tipo:'date', valor: B12.hoje() }) + '</div>' +
        '<div>' + campo('Hora', 'hora', { tipo:'time', valor: horaAgora }) + '</div>' +
      '</div>' +
      '<div class="par">' +
        '<div>' + campo('Volta', 'volta', { tipo:'date' }) + '</div>' +
        '<div>' + campo('Hora', 'horaVolta', { tipo:'time' }) + '</div>' +
      '</div>' +
      campo('Placa', 'placa', { max:8, dica:'deixe vazio se não deixou carro' }) +
      campo('Celular', 'whats', { tipo:'tel', modo:'tel', dica:'(41) 90000-0000' }) +
      '<div class="par">' +
        '<div>' + campo('Valor', 'valorManual', { tipo:'number', passo:'0.01', modo:'decimal',
          dica:'vazio = pela tabela' }) + '</div>' +
        '<div>' + lista('Pagamento', 'pg', PAGAMENTOS, 'pix') + '</div>' +
      '</div>' +
      lista('Pousada', 'pousada', ['', 'Direto (sem pousada)']
        .concat(B12.PARCEIROS.map(function (p) { return p.nome; })).concat(['Outra']), '') +
      '<div class="previa" id="previa-balcao"></div>' +

      /* ---- o resto fica guardado, para não atrapalhar quem tem fila ---- */
      '<button type="button" class="btn sec" id="b-mais-balcao" style="margin-top:14px">' +
      'Mais informações (opcional)</button>' +
      '<div id="mais-balcao" hidden>' +
        grupo('Mais sobre a pessoa') +
        campo('E-mail', 'email', { tipo:'email', modo:'email', dica:'opcional' }) +
        campo('Instagram', 'instagram', { dica:'opcional, sem o @' }) +
        campo('CPF', 'cpf', { modo:'numeric', max:14, dica:'só se pedir nota fiscal' }) +
        campo('Cidade', 'cidade', { dica:'opcional' }) +
        grupo('Sobre a viagem') +
        lista('Destino', 'destino', B12.DESTINOS, 'Brasília') +
        lista('Serviço', 'produto', [['regular','Táxi Náutico'],
          ['nautico','Serviço Náutico Premium']], 'regular') +
        lista('Faixa de horário', 'faixa', [['dia','08h30 às 18h00'],['tarde','18h00 às 20h00'],
          ['noite','20h00 às 22h00'],['fora','Fora da tabela']], faixaAgora) +
        campo('Marinheiro', 'responsavel', { dica:'quem levou', max:30 }) +
        marca('Aceita receber ofertas e novidades', 'aceitaOfertas', false,
          'Guardado com data e hora. Sem isso, só dá para falar sobre a viagem dele.') +
      '</div>',
    acao: 'Registrar atendimento',
    aoAbrir: function (form) {
      var mais = form.querySelector('#mais-balcao'), bm = form.querySelector('#b-mais-balcao');
      bm.onclick = function () {
        mais.hidden = !mais.hidden;
        bm.textContent = mais.hidden ? 'Mais informações (opcional)' : 'Esconder o resto';
      };
      /* a hora da ida escolhe a faixa sozinha: uma decisão a menos para quem atende */
      var hora = form.querySelector('[name=hora]'), faixa = form.querySelector('[name=faixa]');
      hora.onchange = function () {
        var f = B12.faixaHora(hora.value);
        faixa.value = f;
        calcular();
      };
      function calcular() {
        var pax = +form.querySelector('[name=pax]').value || 1;
        var cri = B12.contarCortesia(form.querySelector('[name=idades]').value);
        var manual = Number(form.querySelector('[name=valorManual]').value) || 0;
        var pr = B12.preco({ produto: form.querySelector('[name=produto]').value,
          pax: pax, criancas: cri, faixa: faixa.value,
          diarias: 0, pg: form.querySelector('[name=pg]').value });
        var el = form.querySelector('#previa-balcao');
        var nota = cri ? ' · ' + cri + (cri > 1 ? ' crianças não pagam' : ' criança não paga') : '';
        el.innerHTML = manual > 0
          ? '<span>Valor combinado' + nota + '</span><b>' + B12.brl(manual) + '</b>'
          : (pr ? '<span>Pela tabela' + nota + '</span><b>' + B12.brl(pr.travessia) + '</b>'
                : '<span>Fora da tabela</span><b>informe o valor</b>');
      }
      form.querySelectorAll('[name=pax],[name=idades],[name=produto],[name=faixa],[name=pg],[name=valorManual]')
        .forEach(function (c) { c.oninput = calcular; c.onchange = calcular; });
      calcular();
    },
    aoSalvar: function (d) {
      d.pax = +d.pax || 1;
      d.idades = String(d.idades || '').trim();
      d.criancas = B12.contarCortesia(d.idades);
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
        '<label for="c-texto">Descrição</label><textarea id="c-texto" name="texto" rows="4">' + (p ? (p.texto || '') : '') + '</textarea>'
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

})();
