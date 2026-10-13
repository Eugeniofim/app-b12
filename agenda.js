/* ============================================================================
   Estação B12 — AGENDA / COMPROMISSOS

   Pedido do Dhalsin em 13/10/2026: um lugar para ele se organizar, com aviso
   no celular ANTES da hora — e o mesmo compromisso indo para o Google Agenda,
   que é onde ele já olha.

   Três decisões que valem explicação:

   1. O AVISO PRÉVIO é por compromisso, não um ajuste global. "Avisar 1 dia
      antes" faz sentido para a vistoria da lancha e é inútil para a reunião
      das 15h. Quem marca escolhe na hora de marcar.

   2. O GOOGLE AGENDA entra por LINK, não por login. Conectar a conta Google
      exigiria OAuth, revisão do app pelo Google e a chave viva num servidor —
      semanas de trabalho para o mesmo resultado prático: um toque em "Pôr no
      Google Agenda" abre o Google já preenchido, ele confirma, e o
      compromisso está lá, com os avisos do Google por cima dos nossos.

   3. O QUE AVISA DE VERDADE é o servidor, não este arquivo. O celular dele
      pode estar bloqueado, o app fechado, sem internet. Quem bate na hora
      certa é o relógio do banco (pg_cron), e a tarefa carrega o horário do
      aviso para ele achar sozinho. Ver nuvem/06-agenda.sql.
   ========================================================================== */
var B12 = window.B12 || {};
(function () {

/* quanto antes avisar, em minutos. 0 = na hora. */
B12.AVISOS = [
  [0, 'Na hora'], [15, '15 minutos antes'], [30, '30 minutos antes'],
  [60, '1 hora antes'], [120, '2 horas antes'], [180, '3 horas antes'],
  [720, '12 horas antes'], [1440, '1 dia antes'], [2880, '2 dias antes'],
  [10080, '1 semana antes'],
];
B12.avisoTexto = function (min) {
  var a = B12.AVISOS.filter(function (x) { return x[0] === Number(min); })[0];
  return a ? a[1] : (min ? min + ' minutos antes' : 'Na hora');
};

/* O tipo muda o ícone e a cor, e é o que deixa a lista legível de longe. */
B12.TIPOS_TAREFA = [
  ['compromisso', 'Compromisso'],
  ['manutencao',  'Manutenção'],
  ['pagamento',   'Pagamento'],
  ['pessoal',     'Pessoal'],
];

function novoId() {
  return 'tf-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------------------------------------------------------------- o relógio
   Data e hora andam juntas e SEM fuso: '2026-10-14' + '08:30'. Guardar em
   ISO com Z faria o compromisso das 8h30 virar 5h30 no papel, que é a mesma
   armadilha que já mordeu a agenda do app da Melissa. */
B12.tarefaQuando = function (t) {
  return (t.data || '') + 'T' + (t.hora || '00:00');
};
B12.tarefaAvisoEm = function (t) {
  if (!t.data) return '';
  var d = new Date((t.data) + 'T' + (t.hora || '00:00') + ':00');
  d = new Date(d.getTime() - (Number(t.aviso) || 0) * 60000);
  function dd(n) { return String(n).padStart(2, '0'); }
  return d.getFullYear() + '-' + dd(d.getMonth() + 1) + '-' + dd(d.getDate()) +
         'T' + dd(d.getHours()) + ':' + dd(d.getMinutes());
};

B12.tarefas = function () {
  return (B12.DB.tarefas || []).filter(function (t) { return t && !t.apagado; });
};

/* as fatias que a tela usa — uma função só, para a aba e o painel não
   discordarem sobre o que é "atrasada" */
B12.agendaDoDia = function () {
  var agora = new Date();
  function dd(n) { return String(n).padStart(2, '0'); }
  var hoje = agora.getFullYear() + '-' + dd(agora.getMonth() + 1) + '-' + dd(agora.getDate());
  var daquiA7 = B12.diaMais(hoje, 7);
  var r = { hoje: [], semana: [], depois: [], atrasadas: [], feitas: [] };
  B12.tarefas().forEach(function (t) {
    if (t.feita) { r.feitas.push(t); return; }
    if (!t.data) { r.depois.push(t); return; }
    if (t.data < hoje) { r.atrasadas.push(t); return; }
    if (t.data === hoje) { r.hoje.push(t); return; }
    if (t.data <= daquiA7) { r.semana.push(t); return; }
    r.depois.push(t);
  });
  function porHora(a, b) {
    return (a.data + (a.hora || '')) < (b.data + (b.hora || '')) ? -1 : 1;
  }
  ['hoje', 'semana', 'depois', 'atrasadas'].forEach(function (k) { r[k].sort(porHora); });
  r.feitas.sort(function (a, b) { return porHora(b, a); });
  return r;
};

B12.salvarTarefa = function (t) {
  B12.DB.tarefas = B12.DB.tarefas || [];
  if (!t.id) {
    t.id = novoId();
    t.criada = new Date().toISOString();
    B12.DB.tarefas.unshift(t);
  } else {
    var i = -1;
    B12.DB.tarefas.forEach(function (x, k) { if (x.id === t.id) i = k; });
    if (i < 0) B12.DB.tarefas.unshift(t);
    else B12.DB.tarefas[i] = t;
  }
  /* o servidor usa este campo para saber a hora de bater — é o único jeito
     de o aviso chegar com o app fechado */
  t.avisoEm = t.feita ? '' : B12.tarefaAvisoEm(t);
  t.avisado = t.avisado || false;
  B12.salvar();
  return t;
};

B12.apagarTarefa = function (id) {
  var i = -1;
  (B12.DB.tarefas || []).forEach(function (x, k) { if (x.id === id) i = k; });
  if (i < 0) return false;
  B12.DB.tarefas.splice(i, 1);
  B12.salvar();
  return true;
};

B12.marcarTarefa = function (id, feita) {
  var t = (B12.DB.tarefas || []).filter(function (x) { return x.id === id; })[0];
  if (!t) return null;
  t.feita = !!feita;
  t.feitaEm = feita ? new Date().toISOString() : '';
  if (feita) t.avisoEm = '';           /* feita não avisa mais */
  else t.avisoEm = B12.tarefaAvisoEm(t);
  B12.salvar();
  return t;
};

/* --------------------------------------------------------- Google Agenda
   Sem login e sem servidor: o link abre o Google já preenchido. Formato das
   datas: AAAAMMDDTHHMMSS, no horário local, com /AAAAMMDDTHHMMSS de fim. */
B12.tarefaGoogle = function (t) {
  function limpa(x) { return String(x || '').replace(/[-:]/g, ''); }
  var ini = limpa(t.data) + 'T' + limpa(t.hora || '09:00') + '00';
  var fimD = new Date((t.data) + 'T' + (t.hora || '09:00') + ':00');
  fimD = new Date(fimD.getTime() + (Number(t.minutos) || 60) * 60000);
  function dd(n) { return String(n).padStart(2, '0'); }
  var fim = fimD.getFullYear() + dd(fimD.getMonth() + 1) + dd(fimD.getDate()) + 'T' +
            dd(fimD.getHours()) + dd(fimD.getMinutes()) + '00';
  var p = ['action=TEMPLATE',
    'text=' + encodeURIComponent(t.titulo || 'Estação B12'),
    'dates=' + ini + '/' + fim];
  if (t.obs) p.push('details=' + encodeURIComponent(t.obs));
  if (t.onde) p.push('location=' + encodeURIComponent(t.onde));
  return 'https://calendar.google.com/calendar/render?' + p.join('&');
};

/* O mesmo compromisso como arquivo .ics — serve para o calendário do iPhone,
   para o Outlook e para qualquer outro. Download direto, sem nuvem. */
B12.tarefaICS = function (t) {
  function limpa(x) { return String(x || '').replace(/[-:]/g, ''); }
  var ini = limpa(t.data) + 'T' + limpa(t.hora || '09:00') + '00';
  var fimD = new Date((t.data) + 'T' + (t.hora || '09:00') + ':00');
  fimD = new Date(fimD.getTime() + (Number(t.minutos) || 60) * 60000);
  function dd(n) { return String(n).padStart(2, '0'); }
  var fim = fimD.getFullYear() + dd(fimD.getMonth() + 1) + dd(fimD.getDate()) + 'T' +
            dd(fimD.getHours()) + dd(fimD.getMinutes()) + '00';
  var linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Estacao B12//app//PT-BR',
    'BEGIN:VEVENT',
    'UID:' + t.id + '@estacaob12',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
    'DTSTART;TZID=America/Sao_Paulo:' + ini,
    'DTEND;TZID=America/Sao_Paulo:' + fim,
    'SUMMARY:' + String(t.titulo || '').replace(/\n/g, ' '),
  ];
  if (t.obs)  linhas.push('DESCRIPTION:' + String(t.obs).replace(/\n/g, '\\n'));
  if (t.onde) linhas.push('LOCATION:' + t.onde);
  if (Number(t.aviso) > 0) {
    linhas.push('BEGIN:VALARM', 'TRIGGER:-PT' + Number(t.aviso) + 'M',
                'ACTION:DISPLAY', 'DESCRIPTION:' + (t.titulo || 'Lembrete'), 'END:VALARM');
  }
  linhas.push('END:VEVENT', 'END:VCALENDAR');
  var txt = linhas.join('\r\n');
  var a = document.createElement('a');
  a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(txt);
  a.download = 'b12-' + (t.data || 'compromisso') + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  return txt;
};

window.B12 = B12;
})();
