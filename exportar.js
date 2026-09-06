/* ============================================================================
   Estação B12 — exportar.js
   Excel (.xlsx), PDF e cópia de segurança (.json), escritos à mão, sem
   biblioteca. Regra Ti Artes: os dados do dono saem do app em formato aberto
   a qualquer hora, para o contador e para o dia em que o aparelho quebrar.
   Este arquivo só LÊ B12.DB; quem grava é o nucleo.js.
   ========================================================================== */
(function () {
var B12 = window.B12;

/* ------------------------------------------------------------- utilidades */
function baixar(nome, bytes, tipo) {
  var blob = new Blob([bytes], { type: tipo });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = nome; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 5000);
}
function carimbo() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') +
    '_' + String(d.getHours()).padStart(2,'0') + 'h' + String(d.getMinutes()).padStart(2,'0');
}
function agoraBR() {
  var d = new Date();
  return B12.dataBR(B12.hoje()) + ' às ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function periodo(p) {
  var hoje = B12.hoje(), ym = B12.mesAtual();
  if (p === 'mes')        return { de: ym + '-01', ate: ym + '-31', nome: 'mês de ' + B12.mesBR(ym) };
  if (p === 'mesPassado') { var m = B12.mesMais(ym, -1); return { de: m + '-01', ate: m + '-31', nome: 'mês de ' + B12.mesBR(m) }; }
  if (p === 'ano')        return { de: hoje.slice(0,4) + '-01-01', ate: hoje.slice(0,4) + '-12-31', nome: 'ano de ' + hoje.slice(0,4) };
  return { de: '0000-00-00', ate: '9999-99-99', nome: 'todo o período' };
}
function dentro(data, P) { return !!data && data >= P.de && data <= P.ate; }
function simNao(v) { return v ? 'sim' : 'não'; }
function nomeCliente(id) {
  if (!id) return '';
  var c = B12.DB.clientes.filter(function (x) { return x.id === id; })[0];
  return c ? c.nome : '';
}
function porData(a, b) { return (a.data || '') < (b.data || '') ? -1 : 1; }
function zap(v) { v = String(v || ''); return v.length >= 10 ? '+' + (v.length <= 11 ? '55' : '') + v : v; }

/* ------------------------------------------------ o que vai em cada tabela */
function tabelas(P) {
  var D = B12.DB, T = {};
  T.clientes = {
    nome: 'Clientes',
    cols: [['Nome',28,'s'],['WhatsApp',16,'s'],['E-mail',26,'s'],['Instagram',16,'s'],['CPF',15,'s'],
           ['Cidade',16,'s'],['Pousada',20,'s'],['Viagens',9,'int'],['Total gasto',14,'brl'],
           ['Aceita ofertas',13,'s'],['Consentiu em',18,'s'],['Origem',10,'s'],['Cadastro',12,'d'],['Observações',30,'s']],
    linhas: D.clientes.slice().sort(function (a,b) { return (a.nome||'').localeCompare(b.nome||''); }).map(function (c) {
      return [c.nome, zap(c.whats), c.email, c.instagram ? '@' + c.instagram : '', c.cpf, c.cidade, c.pousada,
              c.viagens || 0, c.gasto || 0, simNao(c.aceitaOfertas), (c.consentidoEm || '').slice(0,16).replace('T',' '),
              c.origem, (c.criadoEm || '').slice(0,10), c.obs]; })
  };
  var L = D.lancamentos.filter(function (l) { return dentro(l.data, P); }).sort(porData);
  T.lanc = {
    nome: 'Entradas e saídas',
    cols: [['Data',12,'d'],['Tipo',9,'s'],['Categoria',24,'s'],['Centro de custo',16,'s'],['Descrição',34,'s'],
           ['Entrada',14,'brl'],['Saída',14,'brl'],['Pagamento',11,'s'],['Responsável',14,'s'],['Embarcação',11,'s'],
           ['Cliente',22,'s'],['Investimento',12,'s'],['Observações',26,'s'],['Origem',8,'s'],['Id',16,'s']],
    linhas: L.map(function (l) {
      return [l.data, l.tipo === 'entrada' ? 'entrada' : 'saída', l.cat, l.centro, l.desc,
              l.tipo === 'entrada' ? l.valor : null, l.tipo === 'entrada' ? null : l.valor,
              l.pg, l.responsavel, l.embarcacao, nomeCliente(l.clienteId), simNao(l.investimento), l.obs, l.origem, l.id]; })
  };
  T.reservas = {
    nome: 'Reservas',
    cols: [['Código',10,'s'],['Situação',11,'s'],['Nome',24,'s'],['WhatsApp',16,'s'],['E-mail',24,'s'],['Chegada',12,'d'],
           ['Retorno',12,'d'],['Pessoas',8,'int'],['Crianças',8,'int'],['Destino',12,'s'],['Pousada',20,'s'],
           ['Produto',22,'s'],['Faixa',14,'s'],['Valor',12,'brl'],['Carro (dias)',11,'int'],['Placa',10,'s'],
           ['Pagamento',12,'s'],['Origem',8,'s'],['Criada em',18,'s']],
    linhas: D.reservas.filter(function (r) { return dentro(r.ida, P); })
      .sort(function (a,b) { return (a.ida||'') < (b.ida||'') ? -1 : 1; }).map(function (r) {
      return [r.cod, r.situacao, r.nome, zap(r.zap), r.email, r.ida, r.volta, r.pax, r.criancas, r.destino, r.pousada,
              r.produto, r.faixa, r.total, r.estacionamento, r.placa, r.pg, r.origem, (r.criada||'').slice(0,16).replace('T',' ')]; })
  };
  T.patio = {
    nome: 'Estacionamento',
    cols: [['Placa',10,'s'],['Modelo',14,'s'],['Cor',9,'s'],['Dono',24,'s'],['WhatsApp',16,'s'],['Entrada',12,'d'],
           ['Hora',7,'s'],['Saída prevista',13,'d'],['Saída real',12,'d'],['Diárias',8,'int'],['Diária',11,'brl'],
           ['Pago na entrada',14,'brl'],['Valor pago',12,'brl'],['Pago',6,'s'],['Vaga',7,'s']],
    linhas: D.patio.filter(function (p) { return dentro(p.entrada, P); })
      .sort(function (a,b) { return (a.entrada||'') < (b.entrada||'') ? -1 : 1; }).map(function (p) {
      var ate = p.saidaReal || B12.hoje();
      return [p.placa, p.modelo, p.cor, p.nome, zap(p.whats), p.entrada, p.entradaEm ? B12.horaBR(p.entradaEm) : '',
              p.saidaPrevista, p.saidaReal, B12.diariasDe(p, ate), p.diaria, p.pagoNaEntrada || 0, p.valorPago || 0,
              simNao(p.pago), p.vaga]; })
  };
  T.manut = {
    nome: 'Manutenção',
    cols: [['Data',12,'d'],['Embarcação',11,'s'],['Tipo',12,'s'],['O que foi feito',36,'s'],['Peças',24,'s'],
           ['Fornecedor',18,'s'],['Valor',12,'brl'],['Horas do motor',13,'int'],['Próxima',12,'d']],
    linhas: D.manutencoes.filter(function (m) { return dentro(m.data, P); }).sort(porData).map(function (m) {
      return [m.data, m.embarcacao, m.tipo, m.descricao, m.pecas, m.fornecedor, m.valor, m.horasMotor, m.proxima]; })
  };
  T.contas = {
    nome: 'Contas',
    cols: [['Vencimento',12,'d'],['Tipo',9,'s'],['Descrição',30,'s'],['Valor',12,'brl'],['Categoria',24,'s'],
           ['Centro de custo',16,'s'],['Fixa',6,'s'],['Paga',6,'s']],
    linhas: D.contas.filter(function (c) { return dentro(c.venc, P); })
      .sort(function (a,b) { return (a.venc||'') < (b.venc||'') ? -1 : 1; }).map(function (c) {
      return [c.venc, c.tipo === 'receber' ? 'a receber' : 'a pagar', c.desc, c.valor, c.cat, c.centro, simNao(c.fixa), simNao(c.paga)]; })
  };
  /* o histórico da planilha, mês a mês, para o contador ver os 11 anos */
  var comb = {}, desp = {};
  (B12.HIST_COMBUSTIVEL || []).forEach(function (r) { comb[r[0]] = r; });
  (B12.HIST_DESPESAS || []).forEach(function (r) { desp[r[0]] = r; });
  T.hist = {
    nome: 'Histórico da planilha',
    cols: [['Mês',10,'s'],['Lançamentos',12,'int'],['Passageiros',12,'int'],['Receita travessias',16,'brl'],
           ['Receita estacionamento',20,'brl'],['Combustível',13,'brl'],['Litros',9,'int'],['Abastecimentos',14,'int'],['Despesas',13,'brl']],
    linhas: (B12.HIST_VENDAS || []).map(function (r) {
      var c = comb[r[0]] || [], d = desp[r[0]] || [];
      return [r[0], r[1], r[2], r[3], r[4], c[1] || null, c[2] || null, c[3] || null, d[1] || null]; })
  };
  return T;
}

/* resumo do período: o que o contador pergunta primeiro */
function resumo(P) {
  var L = B12.DB.lancamentos.filter(function (l) { return dentro(l.data, P); });
  var r = { entradas:0, saidas:0, taxa:0, n:L.length, catE:{}, catS:{}, pg:{}, meses:{}, demo:0 };
  L.forEach(function (l) {
    var ym = l.data.slice(0,7);
    r.meses[ym] = r.meses[ym] || { e:0, s:0 };
    if (l.demo) r.demo++;
    if (l.tipo === 'entrada') {
      r.entradas += l.valor; r.meses[ym].e += l.valor;
      r.catE[l.cat] = (r.catE[l.cat]||0) + l.valor;
      r.pg[l.pg] = (r.pg[l.pg]||0) + l.valor;
      r.taxa += l.valor * ((B12.DB.ajustes.taxas || {})[l.pg] || 0);
    } else {
      r.saidas += l.valor; r.meses[ym].s += l.valor;
      r.catS[l.cat] = (r.catS[l.cat]||0) + l.valor;
    }
  });
  r.taxa = Math.round(r.taxa * 100) / 100;
  r.resultado = r.entradas - r.saidas - r.taxa;
  return r;
}
function ordenado(obj) {
  return Object.keys(obj).map(function (k) { return [k, obj[k]]; }).sort(function (a,b) { return b[1] - a[1]; });
}

/* ============================================================== ZIP + XLSX */
var CRC = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n;
  for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function utf8(s) { return new TextEncoder().encode(s); }
function le16(n) { return [n & 255, (n >> 8) & 255]; }
function le32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; }
/* zip sem compressão (método 0). O Excel, o Numbers e o LibreOffice abrem normalmente. */
function zipar(arquivos) {
  var d = new Date();
  var hora = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  var dia  = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  var partes = [], central = [], off = 0;
  arquivos.forEach(function (a) {
    var nome = utf8(a.nome), dados = utf8(a.conteudo), crc = crc32(dados);
    var cab = [].concat(le32(0x04034b50), le16(20), le16(0x0800), le16(0), le16(hora), le16(dia),
      le32(crc), le32(dados.length), le32(dados.length), le16(nome.length), le16(0));
    partes.push(new Uint8Array(cab), nome, dados);
    var cd = [].concat(le32(0x02014b50), le16(20), le16(20), le16(0x0800), le16(0), le16(hora), le16(dia),
      le32(crc), le32(dados.length), le32(dados.length), le16(nome.length), le16(0), le16(0), le16(0), le16(0), le32(0), le32(off));
    central.push(new Uint8Array(cd), nome);
    off += cab.length + nome.length + dados.length;
  });
  var tamCentral = central.reduce(function (s, p) { return s + p.length; }, 0);
  var fim = new Uint8Array([].concat(le32(0x06054b50), le16(0), le16(0), le16(arquivos.length), le16(arquivos.length),
    le32(tamCentral), le32(off), le16(0)));
  var todos = partes.concat(central, [fim]);
  var out = new Uint8Array(todos.reduce(function (s, p) { return s + p.length; }, 0)), p = 0;
  todos.forEach(function (x) { out.set(x, p); p += x.length; });
  return out;
}
function xml(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function colLetra(n) { var s = ''; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function serial(iso) { var p = String(iso).split('-'); if (p.length < 3) return null;
  return Math.round((Date.UTC(+p[0], +p[1]-1, +p[2]) - Date.UTC(1899, 11, 30)) / 864e5); }
/* estilos: 0 normal · 1 cabeçalho · 2 data · 3 dinheiro · 4 inteiro · 5 negrito */
function celula(ref, v, f) {
  if (v == null || v === '') return '';
  if (f === 'd') { var s = serial(v); return s == null ? '<c r="' + ref + '" t="inlineStr"><is><t>' + xml(v) + '</t></is></c>' : '<c r="' + ref + '" s="2"><v>' + s + '</v></c>'; }
  if (f === 'brl') return '<c r="' + ref + '" s="3"><v>' + Number(v) + '</v></c>';
  if (f === 'int') return '<c r="' + ref + '" s="4"><v>' + Number(v) + '</v></c>';
  if (f === 'n')   return '<c r="' + ref + '"><v>' + Number(v) + '</v></c>';
  if (f === 'b')   return '<c r="' + ref + '" t="inlineStr" s="5"><is><t xml:space="preserve">' + xml(v) + '</t></is></c>';
  return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xml(v) + '</t></is></c>';
}
function folhaXml(t) {
  var cols = t.cols.map(function (c, i) { return '<col min="' + (i+1) + '" max="' + (i+1) + '" width="' + (c[1] || 14) + '" customWidth="1"/>'; }).join('');
  var linhas = ['<row r="1">' + t.cols.map(function (c, i) { return celula(colLetra(i) + '1', c[0], 'h').replace('t="inlineStr"', 't="inlineStr" s="1"'); }).join('') + '</row>'];
  t.linhas.forEach(function (l, r) {
    linhas.push('<row r="' + (r+2) + '">' + l.map(function (v, i) {
      var f = (v && typeof v === 'object' && 'v' in v) ? v.f : t.cols[i][2];
      var val = (v && typeof v === 'object' && 'v' in v) ? v.v : v;
      return celula(colLetra(i) + (r+2), val, f); }).join('') + '</row>');
  });
  var ultima = colLetra(t.cols.length - 1) + (t.linhas.length + 1);
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"' + (t.primeira ? ' tabSelected="1"' : '') + '>' +
    (t.semFiltro ? '' : '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>') +
    '</sheetView></sheetViews><cols>' + cols + '</cols><sheetData>' + linhas.join('') + '</sheetData>' +
    (t.semFiltro || t.linhas.length === 0 ? '' : '<autoFilter ref="A1:' + ultima + '"/>') + '</worksheet>';
}
var ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;R$ &quot;#,##0.00"/></numFmts>' +
  '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF0B2A4A"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="6">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function xlsx(folhas) {
  var arqs = [];
  var tipos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    folhas.map(function (f, i) { return '<Override PartName="/xl/worksheets/sheet' + (i+1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
    '</Types>';
  arqs.push({ nome: '[Content_Types].xml', conteudo: tipos });
  arqs.push({ nome: '_rels/.rels', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
  arqs.push({ nome: 'xl/workbook.xml', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    folhas.map(function (f, i) { return '<sheet name="' + xml(f.nome.slice(0, 31)) + '" sheetId="' + (i+1) + '" r:id="rId' + (i+1) + '"/>'; }).join('') +
    '</sheets></workbook>' });
  arqs.push({ nome: 'xl/_rels/workbook.xml.rels', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    folhas.map(function (f, i) { return '<Relationship Id="rId' + (i+1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i+1) + '.xml"/>'; }).join('') +
    '<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
  arqs.push({ nome: 'xl/styles.xml', conteudo: ESTILOS });
  folhas.forEach(function (f, i) { f.primeira = i === 0; arqs.push({ nome: 'xl/worksheets/sheet' + (i+1) + '.xml', conteudo: folhaXml(f) }); });
  return zipar(arqs);
}

B12.exportarExcel = function (p) {
  var P = periodo(p), T = tabelas(P), R = resumo(P), n = B12.contagens();
  var linhasResumo = [
    [{v:'Estação B12', f:'b'}, ''], ['Período', P.nome], ['Gerado em', agoraBR()], ['', ''],
    [{v:'Resumo financeiro', f:'b'}, ''],
    ['Entradas', {v:R.entradas, f:'brl'}], ['Saídas', {v:R.saidas, f:'brl'}],
    ['Taxas de cartão (estimadas)', {v:R.taxa, f:'brl'}], [{v:'Resultado', f:'b'}, {v:R.resultado, f:'brl'}],
    ['Lançamentos no período', {v:R.n, f:'int'}], ['', ''],
    [{v:'Entradas por categoria', f:'b'}, '']].concat(ordenado(R.catE).map(function (x) { return [x[0], {v:x[1], f:'brl'}]; }))
    .concat([['', ''], [{v:'Saídas por categoria', f:'b'}, '']], ordenado(R.catS).map(function (x) { return [x[0], {v:x[1], f:'brl'}]; }))
    .concat([['', ''], [{v:'Entradas por forma de pagamento', f:'b'}, '']], ordenado(R.pg).map(function (x) { return [x[0], {v:x[1], f:'brl'}]; }))
    .concat([['', ''], [{v:'Mês a mês', f:'b'}, {v:'entradas', f:'b'}, {v:'saídas', f:'b'}, {v:'resultado', f:'b'}]],
      Object.keys(R.meses).sort().map(function (ym) { var m = R.meses[ym]; return [B12.mesBR(ym), {v:m.e, f:'brl'}, {v:m.s, f:'brl'}, {v:m.e - m.s, f:'brl'}]; }))
    .concat([['', ''], [{v:'O que há no app', f:'b'}, ''], ['Clientes', {v:n.clientes, f:'int'}], ['Lançamentos', {v:n.lancamentos, f:'int'}],
      ['Reservas', {v:n.reservas, f:'int'}], ['Carros no pátio (histórico)', {v:n.patio, f:'int'}], ['Manutenções', {v:n.manutencoes, f:'int'}]]);
  if (R.demo) linhasResumo.push(['', ''], ['Atenção', 'Este arquivo contém ' + R.demo + ' lançamentos de demonstração do protótipo.']);
  var folhas = [
    { nome: 'Resumo', cols: [['',34,'s'],['',18,'s'],['',16,'s'],['',16,'s']], linhas: linhasResumo, semFiltro: true },
    T.lanc, T.clientes, T.reservas, T.patio, T.manut, T.contas, T.hist
  ];
  /* a aba Resumo não tem cabeçalho escuro: tira a linha 1 pintada */
  folhas[0].cols = folhas[0].cols.map(function (c) { return [c[0], c[1], c[2]]; });
  var bytes = xlsx(folhas);
  baixar('EstacaoB12_' + (p || 'tudo') + '_' + carimbo() + '.xlsx', bytes,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return { ok: true, bytes: bytes.length, linhas: T.lanc.linhas.length, clientes: T.clientes.linhas.length };
};

/* ==================================================================== PDF */
/* larguras da Helvetica (por 1000 do corpo) para alinhar à direita e cortar o que não cabe */
var LARG = { ' ':278,'!':278,'"':355,'#':556,'$':556,'%':889,'&':667,"'":191,'(':333,')':333,'*':389,'+':584,',':278,'-':333,'.':278,'/':278,
  '0':556,'1':556,'2':556,'3':556,'4':556,'5':556,'6':556,'7':556,'8':556,'9':556,':':278,';':278,'<':584,'=':584,'>':584,'?':556,'@':1015,
  'A':667,'B':667,'C':722,'D':722,'E':667,'F':611,'G':778,'H':722,'I':278,'J':500,'K':667,'L':556,'M':833,'N':722,'O':778,'P':667,'Q':778,'R':722,'S':667,'T':611,'U':722,'V':667,'W':944,'X':667,'Y':667,'Z':611,
  'a':556,'b':556,'c':500,'d':556,'e':556,'f':278,'g':556,'h':556,'i':222,'j':222,'k':500,'l':222,'m':833,'n':556,'o':556,'p':556,'q':556,'r':333,'s':500,'t':278,'u':556,'v':500,'w':722,'x':500,'y':500,'z':500 };
function larg(s, tam) {
  var base = String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''), w = 0;
  for (var i = 0; i < base.length; i++) w += LARG[base[i]] || 556;
  return w * tam / 1000;
}
function corta(s, tam, max) {
  s = String(s == null ? '' : s);
  if (larg(s, tam) <= max) return s;
  while (s.length && larg(s + '...', tam) > max) s = s.slice(0, -1);
  return s + '...';
}
/* WinAnsi: o que não existe na tabela vira o parente mais próximo */
function winAnsi(s) {
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 256) out += s[i];
    else if (c === 0x2019 || c === 0x2018) out += "'";
    else if (c === 0x201C || c === 0x201D) out += '"';
    else if (c === 0x2013 || c === 0x2014) out += '-';
    else if (c === 0x2026) out += '...';
    else if (c === 0x2022 || c === 0x00B7) out += '-';
    else out += '?';
  }
  return out.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function Pdf(titulo, sub) {
  this.paginas = []; this.titulo = titulo; this.sub = sub; this.nova();
}
Pdf.prototype.nova = function () {
  this.cmd = []; this.paginas.push(this.cmd); this.y = 842 - 40;
  this.texto(this.titulo, 40, this.y - 14, 15, true, [0.043, 0.165, 0.29]);
  this.texto(this.sub, 40, this.y - 29, 8.5, false, [0.36, 0.46, 0.53]);
  this.linha(40, this.y - 36, 555, this.y - 36, [0.85, 0.89, 0.92]);
  this.y -= 52;
};
Pdf.prototype.cor = function (c) { return c[0].toFixed(3) + ' ' + c[1].toFixed(3) + ' ' + c[2].toFixed(3); };
Pdf.prototype.texto = function (s, x, y, tam, negrito, cor, direita) {
  if (s == null || s === '') return;
  if (direita) x = x - larg(s, tam);
  this.cmd.push('BT ' + this.cor(cor || [0.06, 0.12, 0.18]) + ' rg /F' + (negrito ? 2 : 1) + ' ' + tam + ' Tf ' +
    x.toFixed(2) + ' ' + y.toFixed(2) + ' Td (' + winAnsi(String(s)) + ') Tj ET');
};
Pdf.prototype.caixa = function (x, y, w, h, cor) { this.cmd.push(this.cor(cor) + ' rg ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re f'); };
Pdf.prototype.linha = function (x1, y1, x2, y2, cor) { this.cmd.push(this.cor(cor) + ' RG 0.5 w ' + x1 + ' ' + y1 + ' m ' + x2 + ' ' + y2 + ' l S'); };
Pdf.prototype.precisa = function (h) { if (this.y - h < 50) this.nova(); };
Pdf.prototype.secao = function (t) { this.precisa(30); this.y -= 8; this.texto(t, 40, this.y - 10, 11.5, true, [0.043, 0.165, 0.29]); this.y -= 20; };
Pdf.prototype.paragrafo = function (t, tam) {
  tam = tam || 9; var palavras = String(t).split(' '), linha = '', self = this;
  function solta() { self.precisa(14); self.texto(linha, 40, self.y - tam, tam, false); self.y -= tam + 4; linha = ''; }
  palavras.forEach(function (p) { var teste = linha ? linha + ' ' + p : p; if (larg(teste, tam) > 515) solta(); linha = linha ? linha + ' ' + p : p; });
  if (linha) solta();
  this.y -= 2;
};
/* tabela: cols = [{t, w, dir}] · linhas = arrays · total = array opcional */
Pdf.prototype.tabela = function (cols, linhas, total) {
  var self = this, tam = 8.5, alt = 14;
  function cabecalho() {
    self.precisa(alt * 2);
    self.caixa(40, self.y - alt, 515, alt, [0.043, 0.165, 0.29]);
    var x = 40;
    cols.forEach(function (c) { self.texto(c.t, c.dir ? x + c.w - 4 : x + 4, self.y - alt + 4, tam, true, [1, 1, 1], c.dir); x += c.w; });
    self.y -= alt;
  }
  cabecalho();
  linhas.forEach(function (l, i) {
    if (self.y - alt < 50) { self.nova(); cabecalho(); }
    if (i % 2 === 1) self.caixa(40, self.y - alt, 515, alt, [0.95, 0.97, 0.98]);
    var x = 40;
    cols.forEach(function (c, j) {
      var v = l[j] == null ? '' : String(l[j]);
      self.texto(corta(v, tam, c.w - 8), c.dir ? x + c.w - 4 : x + 4, self.y - alt + 4, tam, false, null, c.dir);
      x += c.w;
    });
    self.y -= alt;
  });
  if (total) {
    if (self.y - alt < 50) { self.nova(); }
    self.linha(40, self.y, 555, self.y, [0.55, 0.67, 0.73]);
    var x = 40;
    cols.forEach(function (c, j) {
      var v = total[j] == null ? '' : String(total[j]);
      self.texto(corta(v, tam, c.w - 8), c.dir ? x + c.w - 4 : x + 4, self.y - alt + 4, tam, true, null, c.dir);
      x += c.w;
    });
    self.y -= alt;
  }
  if (!linhas.length) { self.texto('Nada no período.', 44, self.y - 11, tam, false, [0.36, 0.46, 0.53]); self.y -= alt; }
  this.y -= 6;
};
Pdf.prototype.bytes = function () {
  var self = this, n = this.paginas.length;
  this.paginas.forEach(function (cmd, i) {
    var rod = 'Estação B12 - CNPJ 42.727.723/0001-37 - gerado pelo app em ' + agoraBR() + ' - página ' + (i+1) + ' de ' + n;
    cmd.push('BT 0.36 0.46 0.53 rg /F1 7.5 Tf 40 30 Td (' + winAnsi(rod) + ') Tj ET');
  });
  var objs = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  var kids = this.paginas.map(function (_, i) { return (5 + i*2) + ' 0 R'; }).join(' ');
  objs.push('<< /Type /Pages /Kids [' + kids + '] /Count ' + n + ' >>');
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  this.paginas.forEach(function (cmd, i) {
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + i*2) + ' 0 R >>');
    var s = cmd.join('\n');
    objs.push('<< /Length ' + s.length + ' >>\nstream\n' + s + '\nendstream');
  });
  objs.push('<< /Producer (Estacao B12 - app Ti Artes) /Title (' + winAnsi(this.titulo) + ') >>');
  var out = '%PDF-1.4\n%âãÏÓ\n', offs = [];
  objs.forEach(function (o, i) { offs.push(out.length); out += (i+1) + ' 0 obj\n' + o + '\nendobj\n'; });
  var xref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  offs.forEach(function (o) { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info ' + objs.length + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  var b = new Uint8Array(out.length);
  for (var i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;
  return b;
};
function brl2(v) { return B12.brl(v, 2); }

B12.exportarPDFContador = function (p) {
  var P = periodo(p), R = resumo(P), T = tabelas(P);
  var pdf = new Pdf('Relatório financeiro - Estação B12', 'Período: ' + P.nome + ' - ' + R.n + ' lançamentos - CNPJ 42.727.723/0001-37 - gerado em ' + agoraBR());
  if (R.demo) pdf.paragrafo('Atenção: este relatório contém ' + R.demo + ' lançamentos de demonstração do protótipo. Eles saem quando o app entrar em uso real.', 8.5);
  pdf.secao('Resumo do período');
  pdf.tabela([{t:'', w:375}, {t:'Valor', w:140, dir:true}], [
    ['Entradas', brl2(R.entradas)], ['Saídas', brl2(R.saidas)], ['Taxas de cartão (estimadas pelas taxas cadastradas)', brl2(R.taxa)]],
    ['Resultado', brl2(R.resultado)]);
  pdf.secao('Entradas por categoria');
  pdf.tabela([{t:'Categoria', w:295}, {t:'Valor', w:120, dir:true}, {t:'% das entradas', w:100, dir:true}],
    ordenado(R.catE).map(function (x) { return [x[0], brl2(x[1]), (R.entradas ? x[1] / R.entradas * 100 : 0).toFixed(1) + '%']; }),
    ['Total', brl2(R.entradas), '100%']);
  pdf.secao('Saídas por categoria');
  pdf.tabela([{t:'Categoria', w:295}, {t:'Valor', w:120, dir:true}, {t:'% das saídas', w:100, dir:true}],
    ordenado(R.catS).map(function (x) { return [x[0], brl2(x[1]), (R.saidas ? x[1] / R.saidas * 100 : 0).toFixed(1) + '%']; }),
    ['Total', brl2(R.saidas), '100%']);
  pdf.secao('Entradas por forma de pagamento');
  pdf.tabela([{t:'Forma', w:295}, {t:'Valor', w:120, dir:true}, {t:'Taxa cadastrada', w:100, dir:true}],
    ordenado(R.pg).map(function (x) { return [x[0], brl2(x[1]), (((B12.DB.ajustes.taxas || {})[x[0]] || 0) * 100).toFixed(2) + '%']; }));
  var meses = Object.keys(R.meses).sort();
  if (meses.length > 1) {
    pdf.secao('Mês a mês');
    pdf.tabela([{t:'Mês', w:155}, {t:'Entradas', w:120, dir:true}, {t:'Saídas', w:120, dir:true}, {t:'Resultado', w:120, dir:true}],
      meses.map(function (ym) { var m = R.meses[ym]; return [B12.mesBR(ym), brl2(m.e), brl2(m.s), brl2(m.e - m.s)]; }));
  }
  pdf.secao('Lançamentos, um por um');
  pdf.tabela([{t:'Data', w:50}, {t:'Categoria', w:92}, {t:'Centro', w:62}, {t:'Descrição', w:131}, {t:'Pagto', w:44},
              {t:'Entrada', w:68, dir:true}, {t:'Saída', w:68, dir:true}],
    T.lanc.linhas.map(function (l) { return [B12.dataBR(l[0]), l[2], l[3], l[4], l[7], l[5] == null ? '' : brl2(l[5]), l[6] == null ? '' : brl2(l[6])]; }),
    ['Totais', '', '', '', '', brl2(R.entradas), brl2(R.saidas)]);
  var bytes = pdf.bytes();
  baixar('EstacaoB12_contador_' + (p || 'tudo') + '_' + carimbo() + '.pdf', bytes, 'application/pdf');
  return { ok: true, bytes: bytes.length, paginas: pdf.paginas.length };
};

B12.exportarPDFClientes = function () {
  var T = tabelas(periodo('tudo'));
  var pdf = new Pdf('Clientes - Estação B12', T.clientes.linhas.length + ' clientes - gerado em ' + agoraBR() + ' - dado pessoal: guardar com cuidado (LGPD)');
  pdf.tabela([{t:'Nome', w:130}, {t:'WhatsApp', w:78}, {t:'E-mail', w:118}, {t:'Cidade / pousada', w:94},
              {t:'Viagens', w:40, dir:true}, {t:'Gasto', w:55, dir:true}],
    T.clientes.linhas.map(function (c) { return [c[0], c[1], c[2], [c[5], c[6]].filter(Boolean).join(' / '), c[7], B12.brl(c[8])]; }));
  var bytes = pdf.bytes();
  baixar('EstacaoB12_clientes_' + carimbo() + '.pdf', bytes, 'application/pdf');
  return { ok: true, bytes: bytes.length, paginas: pdf.paginas.length };
};

/* ================================================== cópia completa (.json) */
B12.baixarCopia = function () {
  var texto = JSON.stringify(B12.exportarDados(), null, 1);
  baixar('EstacaoB12_copia_' + carimbo() + '.json', utf8(texto), 'application/json');
  return { ok: true, bytes: texto.length };
};
B12.lerCopia = function (arquivo, cb) {
  var r = new FileReader();
  r.onload = function () {
    try { var j = JSON.parse(r.result); }
    catch (e) { return cb({ erro: 'Esse arquivo não abre como cópia do app.' }); }
    if (!j || !j.dados || j.app !== 'estacao-b12') return cb({ erro: 'Esse arquivo não é uma cópia do app da B12.' });
    cb({ ok: true, copia: j, contagens: B12.contagens(j.dados) });
  };
  r.onerror = function () { cb({ erro: 'Não consegui ler o arquivo.' }); };
  r.readAsText(arquivo);
};

/* só para teste: devolve os bytes sem baixar */
B12._gerar = { xlsx: function (p) { var P = periodo(p), T = tabelas(P); return xlsx([T.lanc, T.clientes, T.reservas, T.patio, T.manut, T.contas, T.hist]); },
               pdf: function (p) { var P = periodo(p), R = resumo(P), T = tabelas(P); var pdf = new Pdf('Teste', 'x'); pdf.tabela([{t:'a',w:300},{t:'b',w:215,dir:true}], T.lanc.linhas.slice(0,80).map(function(l){return [l[4], brl2(l[5]||l[6])];})); return pdf.bytes(); } };
})();
