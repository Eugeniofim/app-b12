/* ============================================================================
   O GRUPO — COMO ELE REALMENTE TRABALHA

   24/11/2026, e isto mudou o desenho:

     "ele usa muito GRUPOS, pois às vezes a volta é compartilhada e ele precisa
      enviar por exemplo para 20 clientes voltando — ele precisa mandar 20
      WhatsApp. E o certo seria ele apertar um botão e enviar para todos."

   A resposta estava a uma linha de distância, escondida no próprio app:
   `wa.me/?text=` SEM número abre o WhatsApp com o texto pronto e deixa ELE
   escolher o destino — inclusive um grupo. Um toque, vinte pessoas, hoje,
   sem API nenhuma. `B12.abrirWhats` já aceitava zap vazio desde sempre;
   ninguém tinha posto o botão.

   A armadilha que precisa estar escrita, para a próxima pessoa não prometer
   o impossível: **a API oficial da Meta NÃO manda para grupos.** Ela manda
   para números, um a um. Então, mesmo com a linha comprada, "o grupo"
   continua sendo colar à mão — o que muda é o app poder disparar os vinte
   individuais sozinho.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const msg = fs.readFileSync(path.join(raiz, 'mensagens.js'), 'utf8');
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');

console.log('\n— um toque para o grupo inteiro —');
eh('o botão está em Voltam hoje / Voltam amanhã, que é onde ele pensa nisso',
  /data-va="grupo">Num grupo<\/button>/.test(adm));
eh('e também na tela de mandar para várias',
  /id="mp-grupo">Num grupo<\/button>/.test(msg));
eh('abre o WhatsApp SEM número: ele escolhe o grupo',
  /B12\.abrirWhats\('', rec\.texto\)/.test(adm) && /B12\.abrirWhats\('', t\)/.test(msg),
  'com número, abriria a conversa de UMA pessoa — o oposto do pedido');
eh('o B12.abrirWhats aceita destino vazio',
  /'https:\/\/wa\.me\/' \+ \(n \|\| ''\)/.test(msg));
eh('e marca todo mundo como avisado de uma vez',
  /gente\.forEach\(function \(p\) \{ B12\.marcarAvisoVolta\(p\.id\); \}\)/.test(adm),
  'senão ele manda no grupo e a lista continua dizendo que faltam 20');
eh('sem horário montado, avisa antes em vez de mandar pela metade',
  /if \(rec\.semGrade\) return B12\.aviso\('Monte os horários de retorno antes/.test(adm));

console.log('\n— num grupo, texto pessoal é proibido —');
eh('o genérico não é sugestão, é condição',
  /var limpo = B12\.textoGenerico\(t\);\s*\n\s*if \(limpo !== t\) \{/.test(msg),
  'o código da Ivone no grupo dos vinte é vazamento de dado de cliente');
eh('e ele vê o que mudou antes de mandar de novo',
  /Tirei o nome, o código e o total: num grupo o texto é um só/.test(msg) &&
  /cTexto\.scrollIntoView/.test(msg),
  'limpar calado e mandar seria pior: ele não saberia o que foi');

console.log('\n— NENHUM caminho é o padrão (correção dele) —');
/* "as voltas são compartilhadas UMA VEZ OU OUTRA. Outras vezes é volta de 2 ou
   3 pessoas que já foi combinado. Nada é muito fixo, é sempre muito maleável."

   Eu tinha posto o grupo como botão grande e verde — ou seja, como O caminho.
   Um botão com destaque é uma recomendação, e recomendar o grupo nos dias de
   duas pessoas faz ele parar e pensar onde não precisava. */
eh('o grupo não é mais botão grande e verde na tela Hoje',
  !/class="btn zap"[^>]*data-va="grupo"/.test(adm));
eh('nem na tela de mandar para várias',
  !/class="btn zap"[^>]*id="mp-grupo"/.test(msg));
eh('os três da tela Hoje têm o mesmo peso',
  (adm.match(/class="btn sec" style="margin:0" data-va="(ver|varios|grupo)"/g) || []).length === 3);
eh('e os quatro canais também', /class="mp-bts mp-bts-4"/.test(msg) &&
  (msg.match(/class="btn sec" style="margin:0" id="mp-(grupo|zap|app|mail)"/g) || []).length === 4);
eh('"WhatsApp" virou "Um a um", que é o que ele faz de fato',
  /'Um a um · ' \+ z/.test(msg) && !/'WhatsApp · ' \+ z/.test(msg));
eh('a explicação diz para que serve CADA um, em vez de indicar um',
  /Serve quando a volta é dividida por muita gente/.test(msg) &&
  /Serve quando são duas ou três pessoas/.test(msg));
eh('e as 2 ou 3 pessoas continuam com o botão na própria linha',
  /data-va-zap="/.test(adm),
  'esse é o caminho da maioria dos dias: um toque na pessoa, sem passar por tela nenhuma');

console.log('\n— a porta para quando ele comprar a linha —');
eh('existe um ponto de entrada único', /B12\.whatsEmMassa = function \(lista\)/.test(msg));
eh('que hoje responde "sem linha" em vez de fingir',
  /erro: 'semLinha'/.test(msg));
eh('a tela já pergunta por ele', /if \(B12\.temLinhaWhats\(\)\) \{/.test(msg));
eh('e cai na fila de um a um quando não há linha',
  msg.indexOf('B12.filaWhats(lista, aoMandar') > 0 &&
  /else \{ fechar\(\); B12\.filaWhats\(lista\); \}/.test(msg));
eh('a lista tem a MESMA forma da fila: trocar o motor não mexe em tela',
  /lista = \[\{zap, nome, texto\}\] — a MESMA forma que a fila de um a um usa/.test(msg));
eh('está escrito que a API da Meta não manda para grupos',
  msg.indexOf('**a API da Meta NÃO manda para grupos.**') > 0,
  'é a promessa mais fácil de fazer errado quando a linha chegar');
eh('e o que a linha custa está escrito junto',
  /custo POR CONVERSA/.test(msg) && /modelos de mensagem APROVADOS/.test(msg));

console.log('\n— os dois blocos na mesma tela não brigam mais —');
eh('nenhum id repetido entre Voltam hoje e Voltam amanhã',
  !/id="va-/.test(adm) && /data-va="grupo"/.test(adm),
  'os dois blocos geravam os MESMOS ids: HTML inválido e getElementById pega só o primeiro');
eh('e os handlers continuam presos ao bloco certo',
  /b\.querySelector\('\[data-va=grupo\]'\)/.test(adm));

console.log('\n— o caminho de ponta a ponta, como ele faria —');
/* 24/11/2026: "a pessoa preenchendo, dizendo que essas pessoas voltam tal dia,
   todos no mesmo dia, onde ele possa mandar aquela mensagem padrão... pense
   como ele faria."

   A máquina já existia inteira — ele perguntou "já tem essa mensagem padrão?"
   justamente porque NÃO SE ACHAVA. O conserto foi de nome e de caminho, não
   de motor. E fazendo o caminho dele apareceram dois buracos de verdade. */
eh('o botão diz a AÇÃO e quantos faltam, não o mecanismo',
  /'Avisar ' \+ \(faltam\.length === gente\.length \? 'os ' \+ faltam\.length/.test(adm),
  '"Escolher quem" fala de mecanismo; quem está no balcão procura a ação');
eh('e some quando não falta ninguém',
  /\(faltam\.length\s*\n?\s*\? '<button type="button" class="btn sec" style="margin:0" data-va="varios">'/.test(adm),
  'botão pedindo para refazer o que já foi feito é convite a mandar duas vezes');
eh('a folha diz de que dia se trata',
  /\(opc\.quando \? 'Avisar quem volta ' \+ escM\(opc\.quando\)/.test(msg));
eh('e já abre com a mensagem padrão do retorno daquele dia',
  /nome: 'Recado do retorno de ' \+ quando,[\s\S]{0,160}texto: rec\.texto/.test(adm));

console.log('\n  BURACO 1 — mandar e a lista não saber');
eh('quem chamou recebe de volta quem foi avisado',
  /var aoMandar = typeof opc\.aoMandar === 'function'/.test(msg));
eh('o aviso no app marca só quem REALMENTE recebeu',
  /aoMandar\(alvos\.filter\(function \(p, i\) \{ return rs\[i\] && rs\[i\]\.enviados > 0; \}\)\)/.test(msg),
  'marcar quem não tem o app instalado seria perder a pessoa de vista');
eh('a fila de um a um devolve quem ELE marcou como mandado',
  /aoFechar\(Object\.keys\(feitos\)\.map/.test(adm));
eh('o grupo e o e-mail também marcam',
  /B12\.abrirWhats\('', t\);\s*\n\s*aoMandar\(escolhidos\(\)\);/.test(msg) &&
  /if \(r && r\.ok\) aoMandar\(alvos\);/.test(msg));
eh('e o bloco risca da lista de pendentes',
  /if \(p\) B12\.marcarAvisoVolta\(p\.id\);/.test(adm),
  'sem isso ele mandava o push para os sete e a tela continuava dizendo "faltam 7"');

console.log('\n  BURACO 2 — abrir com 36 marcados em vez de 4');
eh('só quem volta NAQUELE dia começa marcado',
  /function daquele\(p\) \{\s*\n\s*return !opc\.dia \|\| p\.volta === opc\.dia;/.test(msg),
  'ele tocou em "Avisar os 4 que voltam amanhã" e vinham 36 marcados — mandaria o recado de amanhã para quem volta hoje');
eh('os do dia aparecem primeiro na lista',
  /\.sort\(function \(a, b\) \{ return \(daquele\(b\.p\) \? 1 : 0\) - \(daquele\(a\.p\) \? 1 : 0\); \}\)/.test(msg));
eh('os outros continuam lá, desmarcados — incluir é decisão',
  /Os outros estão na lista, desmarcados/.test(msg));
eh('a data da volta viaja junto, senão o filtro não casa com ninguém',
  /volta: r\.volta,          \/\* sem isto o filtro do dia não casa com ninguém \*\//.test(msg) &&
  /return Object\.assign\(\{\}, p, \{ volta: p\.volta \|\| hoje \}\); \}\), 'volta hoje'\)/.test(msg));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
