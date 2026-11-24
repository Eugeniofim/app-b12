/* ============================================================================
   UMA MENSAGEM DE RETORNO, NÃO TRÊS

   24/11/2026. Ele testou de verdade, mandou o WhatsApp para si mesmo, e viu
   sair isto:

     "Oi, Eugênio! Aqui é da Estação B12.
      Os horários de retorno dia 26/11/2026 são: 09:30 · 12:00 · 16:00 · 18:00.
      Esteja no trapiche uns 10 minutos antes."

   E perguntou: "você não falou que já tinha arrumado isso?"

   Tinha arrumado pela metade, e o erro é meu. Eu criei a mensagem padrão da
   B12 — o texto que ELE escreveu — e liguei ela só nos blocos "Voltam hoje /
   amanhã" da tela Hoje. Havia TRÊS recados de retorno no app:

     1. B12.recadoDeVolta     — o padrão dele, com os horários de verdade
     2. textoVolta (adm.js)   — curto, improvisado, na tela "Quem volta"
     3. o modelo de fábrica   — com HORÁRIOS INVENTADOS por padrão

   Qual saía dependia de por qual tela ele tinha passado. Isso é pior do que
   não ter padrão nenhum: ele pensa que mandou o recado da casa e mandou outra
   coisa, para um cliente de verdade.

   Este teste prende os três num só. Se alguém escrever um quarto, ele cai.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');
const msg = fs.readFileSync(path.join(raiz, 'mensagens.js'), 'utf8');
const nucleo = fs.readFileSync(path.join(raiz, 'nucleo.js'), 'utf8');

console.log('\n— existe UMA fonte do recado —');
eh('a mensagem padrão mora num lugar só', /B12\.recadoDeVolta = function/.test(nucleo));
eh('a tela "Quem volta" usa ela', /var rec = B12\.recadoDeVolta\(dia\);/.test(adm));
eh('o e-mail daquela tela usa ela', /esc\(B12\.recadoDeVolta\(dia\)\.texto\)/.test(adm));
eh('o modelo de fábrica usa ela', /B12\.recadoDeVolta\(dia\)\.texto;/.test(msg));
eh('e os blocos Voltam hoje / amanhã usam ela',
  /var rec = B12\.recadoDeVolta\(amanha\);/.test(adm));

console.log('\n— os textos improvisados sumiram —');
const semComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '');
eh('"Os horários de retorno X são:" não existe mais',
  !/'Os horários de retorno ' \+ qd \+ ' são: '/.test(semComentarios(adm)),
  'era o que ele viu chegar no WhatsApp dele');
eh('"Esteja no trapiche uns 10 minutos antes" saiu',
  !/Esteja no trapiche uns 10 minutos antes/.test(semComentarios(adm)));
eh('os horários inventados do modelo de fábrica saíram',
  !/\['09h30', '12h00', '16h00', '18h00'\]/.test(semComentarios(msg)),
  'mandar horário inventado para um cliente é pior que não mandar nada');
eh('e o "Chegue no trapiche 15 minutos antes" foi junto',
  !/Chegue no trapiche 15 minutos antes/.test(semComentarios(msg)));

console.log('\n— o nome só entra quando é para UMA pessoa —');
eh('textoVolta acrescenta o "Oi, Fulano!" e nada mais',
  /return \(pri \? 'Oi, ' \+ pri \+ '!\\n\\n' : ''\) \+ rec\.texto;/.test(adm));
eh('sem nome, sai o padrão puro — é o que serve de grupo',
  /\(pri \? 'Oi, ' \+ pri/.test(adm));
eh('o modelo de fábrica faz igual',
  /\(pr && pr !== 'tudo bem' \? 'Oi, ' \+ pr \+ '!\\n\\n' : ''\)/.test(msg),
  'pri() devolve "tudo bem" quando não há nome: isso não pode virar saudação');

console.log('\n— a regra que ele descreveu: define horário, o recado segue —');
eh('o recado lê a grade NA HORA de montar o texto',
  /var horas = B12\.saidasDoDia\(dia, 'volta'\)\.map/.test(nucleo),
  'guardar o texto pronto faria o horário velho sobreviver a uma mudança de grade');
eh('e diz quando a grade ainda não foi montada',
  /semGrade: !horas\.length/.test(nucleo));
eh('o dia certo na primeira linha: hoje, amanhã ou a data',
  /var palavra = dia === hoje \? 'Hoje' : dia === B12\.diaMais\(hoje, 1\) \? 'Amanhã'/.test(nucleo));

console.log('\n— o texto é o DELE, não um que eu escrevi —');
const padrao = nucleo.slice(nucleo.indexOf('B12.recadoDeVolta'), nucleo.indexOf('B12.voltamAmanha'));
[['trapiche', 'o trapiche principal'],
 ['limite de passageiros', 'a lancha tem limite de passageiros'],
 ['transporte de bagagem', 'o transporte de bagagem na recepção'],
 ['minutos de antecedência', 'a antecedência na embarcação'],
 ['Muito obrigado', 'o fecho dele']].forEach(function (par) {
  eh('tem "' + par[0] + '" — ' + par[1], padrao.indexOf(par[0]) > 0);
});
eh('os minutos são ajustáveis, não escritos na pedra',
  /Number\(a\.minutosAntes\) \|\| 10/.test(padrao) && /Number\(a\.minutosBagagem\) \|\| 30/.test(padrao));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
