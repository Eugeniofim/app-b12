/* ============================================================================
   As peças obrigatórias dos apps do Eugênio (skills `app-um-so` e
   `pwa-atualiza`). Não testa comportamento: garante que a LINHA continua lá.
   É assim que esses bugs voltam — alguém limpa o código e tira uma linha
   que parecia enfeite.
   ========================================================================== */
'use strict';
const fs = require('fs'), p = require('path');
const raiz = p.join(__dirname, '..');
const leia = f => fs.readFileSync(p.join(raiz, f), 'utf8');
let ok = 0, falhou = 0;
function eh(nome, cond, porque) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (porque ? '\n         → ' + porque : '')); }
}

const app = leia('app.js'), sw = leia('sw.js'), css = leia('estilo.css'),
      html = leia('index.html'), sinc = leia('sincronia.js'), nuc = leia('nucleo.js');

console.log('\n— atualizar no celular (pwa-atualiza) —');
eh('1 updateViaCache:none', /updateViaCache:\s*'none'/.test(app),
   'sem isto o celular fica 24h na versão velha');
eh('2 no-store no documento dentro do sw', /cache:\s*'no-store'/.test(sw),
   'a hospedagem serve arquivo velho com service worker novo');
eh('3 confere ao voltar pro app', /visibilitychange/.test(app),
   'no celular o timer pode nunca rodar');
eh('4 jaTinhaControlador antes do controllerchange',
   app.indexOf('jaTinhaControlador') < app.indexOf("addEventListener('controllerchange'"),
   'sem a trava, todo visitante novo vê "tem versão nova"');
eh('5 só recarrega se não estiver ocupado', /if \(!ocupado\(\)\)/.test(app),
   'recarrega em cima de quem está digitando');

console.log('\n— sincronia (app-sempre-junto) —');
eh('6 reconfere ao voltar e quando a internet volta',
   /visibilitychange/.test(sinc) && /addEventListener\('online'/.test(sinc));
eh('7 prazo em toda chamada de rede', /AbortController/.test(sinc));
eh('8 a FILA usa filter, não slice', /FILA\.filter/.test(sinc) && !/FILA\.slice\(lote/.test(sinc),
   'slice derruba o que entrou DURANTE o envio (v108 do TI ARTES OS)');
eh('9 guarda o eco da própria subida', /ENVIADOS/.test(sinc),
   'o eco atrasado regride o registro (v111)');
eh('10 aplica DENTRO do mesmo objeto', /Object\.assign\(o, l\.dados\)/.test(sinc),
   'trocar o elemento mata quem segurou a referência');
eh('11 só envia depois do primeiro ritual', /EM_DIA/.test(sinc),
   'senão o catálogo de fábrica sobe por cima do banco');
eh('12 dado de demonstração nunca sobe', /B12\.ehDemo\(o\)/.test(sinc),
   'lançamento falso no caixa real do cliente');
eh('13 a equipe não sincroniza dinheiro', /SO_DO_DONO/.test(sinc));

console.log('\n— o modo demonstração —');
eh('14 dá para sair da demonstração', /B12\.sairDaDemo/.test(nuc));
eh('15 e o semeador respeita o desligamento', /if \(A\.demo\)/.test(nuc),
   'senão os dados falsos voltam todo dia');

console.log('\n— gráficos —');
eh('20 série toda em zero não vira NaN', /if \(!\(max - min\)\)/.test(leia('adm.js')),
   'dia parado quebrava o gráfico inteiro com divisão por zero');

console.log('\n— dedo e acessibilidade —');
eh('16 alvos de 44px no toque', /pointer:\s*coarse/.test(css));
eh('17 respeita quem pediu menos movimento', /prefers-reduced-motion/.test(css));
eh('18 não bloqueia o zoom da pessoa', !/user-scalable=no|maximum-scale=1/.test(html));
eh('19 nenhum fetch solto sem prazo', (function () {
  return ['avisos.js','turista.js','aparelhos.js','assistente.js','sincronia.js']
    .every(function (f) { var t = leia(f);
      return (t.match(/fetch\(/g) || []).length <= (t.match(/AbortController/g) || []).length; });
})(), 'chamada sem prazo deixa a tela girando com sinal fraco');

console.log('\n' + (falhou ? '✗ ' : '✓ ') + ok + ' passaram, ' + falhou + ' falharam\n');
process.exit(falhou ? 1 : 0);
