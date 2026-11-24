/* ============================================================================
   O SININHO — ONDE O AVISO FICA DEPOIS DE CHEGAR

   24/11/2026, ele testando o push de verdade:

     "Fiz o teste da notificação, deu certo, foi enviada. Mas eu, no meu
      celular, fui apertar para ver a notificação, ele mandou para o app. Mas
      ele não mostrou o texto da notificação, ele mostrou só no aparelho, ali
      no push. Será que ele vai lá no sininho? Como funciona essa parte?
      Manda para onde?"

   Não ia para lugar nenhum. O aviso vivia só na bandeja do sistema: tocou,
   dispensou, acabou. Não existia sininho, não existia caixa, não existia
   histórico. Um recado que some quando a pessoa toca nele não é um recado —
   e pior, ele nem tinha como saber o que tinha sido mandado.

   A parte difícil: o service worker roda FORA da página e não enxerga o
   localStorage onde mora o resto do app. O único lugar onde os dois se
   encontram é o IndexedDB. Por isso a caixa é lá, e por isso ela é POR
   APARELHO — o que chegou no celular dele não está no tablet do balcão, e a
   tela precisa dizer isso.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
const av = fs.readFileSync(path.join(raiz, 'avisos.js'), 'utf8');
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');
const app = fs.readFileSync(path.join(raiz, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'estilo.css'), 'utf8');

console.log('\n— o aviso é GRAVADO antes de aparecer na bandeja —');
eh('o service worker tem a caixa', /const AV_BANCO = 'b12-avisos'/.test(sw));
eh('e grava antes de mostrar',
  /e\.waitUntil\(avGuardar\(d\)\.then\(\(\) => self\.registration\.showNotification/.test(sw),
  'gravar depois perde o aviso de quem toca e dispensa na mesma hora');
eh('guarda o texto, não só o título',
  /texto: d\.texto \|\| ''/.test(sw));
eh('e a hora em que chegou', /em: new Date\(\)\.toISOString\(\)/.test(sw));
eh('nasce como não lido', /lido: false/.test(sw));
eh('cada aviso tem id próprio, senão um apaga o outro',
  /id: 'av' \+ Date\.now\(\)\.toString\(36\) \+ Math\.random\(\)/.test(sw));
/* a palavra aparece no comentário que EXPLICA por que não dá para usá-la —
   o que importa é não haver CHAMADA */
eh('é IndexedDB, porque o service worker não enxerga localStorage',
  /indexedDB\.open\(AV_BANCO/.test(sw) &&
  !/localStorage\s*\./.test(sw) && !/localStorage\[/.test(sw));
eh('e uma falha ao gravar não derruba a notificação',
  /\.catch\(\(\) => false\)/.test(sw),
  'melhor o aviso chegar sem histórico do que não chegar');

console.log('\n— o app lê a mesma caixa —');
eh('mesmo nome de banco dos dois lados',
  /var AV_BANCO = 'b12-avisos', AV_LOJA = 'recebidos';/.test(av) &&
  /const AV_BANCO = 'b12-avisos', AV_LOJA = 'recebidos';/.test(sw),
  'nome diferente = duas caixas que nunca se encontram');
eh('lista tudo, mais novo primeiro', /B12\.avRecebidos = function/.test(av) &&
  /String\(b\.em\) < String\(a\.em\) \? -1 : 1/.test(av));
eh('conta os não lidos', /B12\.avNaoLidos = function/.test(av));
eh('marca como lido quando ele abre', /B12\.avMarcarLidos = function/.test(av));
eh('e dá para apagar tudo', /B12\.avApagarTudo = function/.test(av));
eh('a caixa não cresce para sempre', /B12\.avLimparAntigos = function/.test(av) &&
  /var teto = quantos \|\| 60;/.test(av));
eh('navegador sem IndexedDB não quebra o app',
  /if \(!window\.indexedDB\) return nao\(new Error\('sem IndexedDB'\)\)/.test(av) &&
  /\.catch\(function \(\) \{ return \[\]; \}\)/.test(av));

console.log('\n— o sino na tela —');
eh('o botão existe', /id="b-sino"/.test(html));
eh('com o contador em cima', /id="sino-conta"/.test(html));
eh('ligado à folha de avisos', /bs\.onclick = function \(\) \{ B12\.folhaSino\(\); \};/.test(app));
eh('conta assim que o app abre', /if \(B12\.sinoContar\) B12\.sinoContar\(\);/.test(app));
eh('e reconta ao voltar para o app',
  /if \(!document\.hidden && B12\.sinoContar\) B12\.sinoContar\(\);/.test(app),
  'o aviso chega com a tela apagada: sem isso o número só mudaria recarregando');
eh('a folha existe', /B12\.folhaSino = function/.test(adm));
eh('o não lido se destaca', /\(a\.lido \? '' : ' novo'\)/.test(adm) && /\.sino-item\.novo\{/.test(css));
eh('mostra a data e a hora de cada um', /B12\.dataBR\(a\.em\.slice\(0, 10\)\)/.test(adm));
eh('o texto é escapado antes de virar HTML',
  /esc\(a\.texto\)\.replace\(\/\\n\/g, '<br>'\)/.test(adm),
  'aviso com < vira etiqueta solta e quebra a folha');
eh('caixa vazia diz que está vazia, não fica em branco',
  /Nenhum aviso chegou neste aparelho ainda/.test(adm));

console.log('\n— a verdade que a tela precisa dizer —');
eh('a caixa é DESTE aparelho, e está escrito',
  /Esta caixa é <b>deste aparelho<\/b>/.test(adm));
eh('e explica onde fica o que chegou no outro',
  /fica no sininho do tablet/.test(adm),
  'ele tem três aparelhos: achar que o aviso segue a conta custa meia hora');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
