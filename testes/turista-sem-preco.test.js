/* ============================================================================
   O APP DO TURISTA SEM PREÇO NA TELA

   24/11/2026: "tirar as infos de táxi náutico e estacionamento" e, logo
   depois, "aqui é pra pôr ícone do WhatsApp e texto: pedir meu orçamento".

   Com o preço desligado (que é como a B12 opera), aquela tela mostrava um
   cartão de serviço com UMA opção só e três "sob consulta" — um número que
   não é número, ocupando o lugar de quem está tentando reservar. E o botão
   dizia "Pedir minha reserva" quando o que a pessoa pede, de fato, é um
   ORÇAMENTO: a vaga só existe depois que a B12 confirma no WhatsApp.

   E aqui mora a lição de CSS mais cara do dia: `hidden` NÃO ESCONDIA.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const tur = fs.readFileSync(path.join(raiz, 'turista.js'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'estilo.css'), 'utf8');
const dados = fs.readFileSync(path.join(raiz, 'dados.js'), 'utf8');

console.log('\n— o `hidden` precisa esconder DE VERDADE —');
/* O navegador aplica [hidden]{display:none} com peso de folha-do-usuário, e
   QUALQUER `display` numa classe nossa ganha dele. `.escolhas` diz
   display:grid — e o grid vencia o hidden, calado. Isso vale para os 30 e
   tantos `hidden` do index, não só para este. */
eh('existe a regra que ganha de qualquer classe',
  /\[hidden\]\{display:none !important\}/.test(css),
  'sem ela, esconder um elemento de classe .escolhas, .lista ou .horas não faz nada');

console.log('\n— o cartão de serviço saiu da vista —');
eh('o bloco está escondido', /<div class="escolhas" id="escolhas-produto" hidden><\/div>/.test(html));
eh('mas o elemento continua no HTML',
  /id="escolhas-produto"/.test(html) && /getElementById\('escolhas-produto'\)\.innerHTML/.test(tur),
  'o turista.js escreve nele a cada recálculo: tirar o elemento quebra a tela na linha seguinte');
eh('o título "Táxi Náutico e Estacionamento" saiu',
  !/<h3>Táxi Náutico e Estacionamento<\/h3>/.test(html));
eh('e a pergunta do carro ficou — essa a B12 precisa saber',
  /Vai deixar o carro com a gente\?/.test(html));

console.log('\n— "sob consulta" não aparece mais para quem reserva —');
eh('o valor do estacionamento some quando não há preço',
  /ev\.hidden = !mostra;/.test(tur));
eh('e o subtítulo diz algo útil no lugar',
  /a B12 separa a vaga e combina o valor com você/.test(tur));
eh('a conta esconde as linhas vazias',
  /\.conta\.conta-sem-preco \.l:not\(\.total\)\{display:none !important\}/.test(css));
eh('ligada pela classe que o turista.js põe',
  /cxConta\.classList\.toggle\('conta-sem-preco', !mostra\)/.test(tur));
eh('sobra o "Valor · a combinar", que é a verdade',
  /\(mostra && p\) \? B12\.brl\(p\.total\) : 'a combinar'/.test(tur));
eh('nenhuma linha escreve "sob consulta" na conta',
  !/'c-trav'\)\.textContent = .*'sob consulta'/.test(tur) &&
  !/'c-est'\)\.textContent = .*'sob consulta'/.test(tur));

console.log('\n— o botão: WhatsApp e orçamento —');
eh('virou botão do WhatsApp', /<button class="btn zap" id="b-reservar">/.test(html));
eh('com o ícone dentro', /id="b-reservar"><svg viewBox="0 0 24 24"/.test(html));
eh('e o texto certo', /<span>Pedir meu orçamento<\/span>/.test(html));
eh('o ícone fica guardado para remontar o botão',
  /B12\.ZAP_ICONE = '<svg/.test(dados),
  'B12.ocupar troca o innerHTML; sem a constante o botão voltava sem o ícone');
eh('e o turista.js devolve o rótulo COM o ícone',
  /b\.innerHTML = B12\.ZAP_ICONE \+ '<span>Pedir meu orçamento<\/span>'/.test(tur));
eh('ícone e texto na mesma linha, com respiro',
  /#b-reservar\{display:flex;align-items:center;justify-content:center;gap:9px\}/.test(css));
eh('o recado embaixo continua dizendo que a vaga só vale depois da confirmação',
  /só vira vaga garantida depois que a equipe da B12 confirmar/.test(html));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
