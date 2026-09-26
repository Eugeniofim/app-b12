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
      linha('Ida', B12.dataBR(r.ida) + (r.faixa ? ' · ' + esc(r.faixa) : '')) +
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
      : '<div class="ficha-conta">A receber na saída<b>' +
        (mostra ? B12.brl(c.total) : 'a combinar') + '</b></div>');

  var form = B12.folha({
    titulo: 'Reserva de ' + String(r.nome || '').split(' ')[0],
    sub: r.pax + (r.pax > 1 ? ' pessoas' : ' pessoa') + ' · ida ' + B12.dataBR(r.ida),
    corpo: corpo,
    extra:
      (zap ? '<button type="button" class="btn sec" id="fc-zap" style="margin-top:0">' +
        'Falar no WhatsApp</button>' : '') +
      ((!dono || (c.jaPago && !c.estacionamento)) ? '' :
        '<button type="button" class="btn sec" id="fc-receber" style="margin-top:8px">' +
        'Receber agora</button>'),
    acao: 'Fechar',
    aoSalvar: function () { return { ok: true }; },
    depois: function () { if (depois) depois(); }
  });
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
      l('Carro', d.placas.length ? esc(d.placas.join(', ')) +
        (d.diariasPatio ? ' · ' + d.diariasPatio + ' vez' + (d.diariasPatio > 1 ? 'es' : '') + ' no pátio' : '') : '')
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

  var bz = form.querySelector('#fc-zap');
  if (bz) bz.onclick = function () {
    var txt = 'Olá, ' + String(c.nome).split(' ')[0] + '! Aqui é a Estação B12.';
    window.open('https://wa.me/' + zap + '?text=' + encodeURIComponent(txt), '_blank');
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

/* ------------------------------------------------- as buscas na Ilha (véspera)
   O Dhalsin monta na véspera os horários em que a lancha vai buscar quem está
   na Ilha. Até ele montar, o app diz ao passageiro que os horários ainda não
   abriram — em vez de inventar um horário que pode não existir. */
B12.formVoltas = function (iso, depois) {
  var jaTem = B12.voltasDoDia(iso);
  var sugeridas = B12.voltasSugeridas();
  var naIlha = (B12.naIlha(iso) || {});
  var quantos = (naIlha.voltam || []).reduce(function (t, p) { return t + (p.pessoas || 1); }, 0);
  var atuais = jaTem.map(function (s) { return s.hora; });
  var presas = jaTem.filter(function (s) {
    return B12.DB.reservas.some(function (r) { return r.saidaVoltaId === s.id; });
  }).map(function (s) { return s.hora; });

  var todas = sugeridas.concat(atuais).filter(function (h, i, a) { return a.indexOf(h) === i; }).sort();

  var form = B12.folha({
    titulo: 'Buscas de ' + B12.dataBR(iso),
    sub: quantos ? quantos + (quantos > 1 ? ' pessoas voltam nesse dia' : ' pessoa volta nesse dia')
                 : 'Ninguém marcou volta ainda',
    corpo:
      '<p style="font-size:13px;color:var(--gelo-3);margin-bottom:12px">Toque nos horários em que ' +
      'a lancha vai buscar na Ilha. Só o que estiver marcado aqui aparece para o passageiro.</p>' +
      '<div class="horas" id="hx">' + todas.map(function (h) {
        var presa = presas.indexOf(h) >= 0;
        return '<button type="button" class="hchip' + (atuais.indexOf(h) >= 0 ? ' on' : '') +
          (presa ? ' presa' : '') + '" data-h="' + h + '"' + (presa ? ' disabled' : '') + '>' + h +
          (presa ? ' ·com gente' : '') + '</button>';
      }).join('') + '</div>' +
      (presas.length
        ? '<div class="ajuda" style="margin-top:10px">' + presas.join(', ') +
          ' não pode' + (presas.length > 1 ? 'm' : '') + ' ser tirado' + (presas.length > 1 ? 's' : '') +
          ': já tem passageiro marcado. Para mudar, fale com a pessoa antes.</div>'
        : '') +
      campo('Acrescentar um horário', 'extra', { tipo:'time', ajuda:'Use para um horário fora da lista.' }) +
      campo('Vagas por lancha', 'vagas', { tipo:'number', modo:'numeric', valor: 12,
        ajuda:'Quantas pessoas cabem em cada busca.' }) +
      '<input type="hidden" name="horas" value="' + atuais.join(',') + '">',
    acao: 'Abrir as buscas',
    aoAbrir: function (f) {
      var guardadas = f.querySelector('[name=horas]');
      function sincronizar() {
        var marcadas = [];
        f.querySelectorAll('.hchip.on').forEach(function (b) { marcadas.push(b.dataset.h); });
        guardadas.value = marcadas.join(',');
      }
      f.querySelectorAll('.hchip').forEach(function (b) {
        b.onclick = function () { b.classList.toggle('on'); sincronizar(); };
      });
      var extra = f.querySelector('[name=extra]');
      extra.onchange = function () {
        var h = extra.value;
        if (!h) return;
        if (f.querySelector('.hchip[data-h="' + h + '"]')) {
          f.querySelector('.hchip[data-h="' + h + '"]').classList.add('on');
        } else {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'hchip on'; b.dataset.h = h; b.textContent = h;
          b.onclick = function () { b.classList.toggle('on'); sincronizar(); };
          f.querySelector('#hx').appendChild(b);
        }
        extra.value = '';
        sincronizar();
      };
    },
    aoSalvar: function (d) {
      var horas = String(d.horas || '').split(',').filter(Boolean);
      return B12.abrirVoltas(iso, horas, { vagas: d.vagas });
    },
    depois: function (r) {
      if (r && r.ok) {
        B12.aviso('Buscas de ' + B12.dataBR(iso) + ' abertas: ' + r.total +
          (r.total === 1 ? ' horário.' : ' horários.'), 'bom');
      }
      if (depois) depois(r);
    }
  });
  return form;
};

})();
