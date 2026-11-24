/* ============================================================================
   AS MENSAGENS DENTRO DO CLIENTE

   24/11/2026: "essas mensagens precisam estar dentro de cada cliente".

   Ele tinha razão e era pior do que parecia. A aba Mensagens dizia, escrito
   na tela, que as marcas {nome}, {codigo}, {data} e {hora} eram trocadas
   "quando você manda pela ficha dela" — e esse caminho NÃO EXISTIA no app.
   Medido: `B12.preencherMensagem` era chamada em UM lugar só, com objeto
   vazio, só para a prévia da própria aba.

   E a ficha do cliente, ao tocar em WhatsApp, abria uma saudação fixa de uma
   linha ("Olá, Fulano! Aqui é a Estação B12."), ignorando tudo o que ele
   tinha escrito.
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
const form = fs.readFileSync(path.join(raiz, 'formularios.js'), 'utf8');
const nucleo = fs.readFileSync(path.join(raiz, 'nucleo.js'), 'utf8');

console.log('\n— a ficha do cliente abre as mensagens dele —');
eh('a saudação fixa de uma linha saiu',
  !/Aqui é a Estação B12\.';/.test(form));
eh('no lugar, o escolhedor de mensagens', /B12\.escolherMensagem\(\{ nome: c\.nome, whats: c\.whats/.test(form));
eh('levando o código e a data da viagem desta pessoa',
  /cod: ult\.cod \|\| '', *\n? *data: ult\.volta \|\| ult\.ida/.test(form) ||
  /cod: ult\.cod \|\| ''/.test(form) && /data: ult\.volta \|\| ult\.ida/.test(form));
eh('tirada da lista de reservas, não da contagem',
  /\(d\.reservasLista \|\| \[\]\)/.test(form),
  'd.reservas é um número: indexar nele devolve undefined calado');
eh('e é a viagem mais recente', /sort\(function \(a, b\) \{\s*return String\(b\.ida/.test(form));

console.log('\n— o escolhedor mostra as DELE primeiro —');
eh('busca as mensagens que ele escreveu',
  /var minhas = \(B12\.minhasMensagens \? B12\.minhasMensagens\(\) : \[\]\);/.test(msg));
eh('com um título que as separa dos modelos da casa',
  />Suas mensagens</.test(msg) && />Modelos da casa</.test(msg));
eh('o bloco some quando ele não escreveu nenhuma',
  /\(minhas\.length\s*\n?\s*\?/.test(msg),
  'título sozinho com lista vazia parece defeito');
eh('e os modelos de fábrica continuam lá', /B12\.MODELOS\.map/.test(msg));
eh('o escolhedor ganhou botão de fechar',
  /f\.querySelector\('\.folha-x'\)\.onclick = fechar;/.test(msg.slice(msg.indexOf('B12.escolherMensagem'))),
  'antes só fechava tocando no fundo: no tablet isso é uma tela presa');

console.log('\n— a mensagem dele chega preenchida —');
eh('existe a folha da mensagem dele', /B12\.folhaMinhaMensagem = function/.test(msg));
eh('e ela troca as marcas pelos dados da pessoa',
  /var texto = B12\.preencherMensagem\(msg\.texto, d\);/.test(msg));
/* 24/11/2026, "deixar msn editáveis": o texto virou campo. O que sai agora é
   o que está NA TELA, não o que a função montou — senão ele ajusta a frase,
   aperta Abrir no WhatsApp, e vai o texto velho. */
eh('abre o WhatsApp com o texto que está na tela',
  /B12\.abrirWhats\(d\.whats, agora\(\)\)/.test(msg));
eh('ou copia, para quem prefere colar', /B12\.copiar\(agora\(\)\)/.test(
  msg.slice(msg.indexOf('B12.folhaMinhaMensagem'))));
eh('e "agora()" lê mesmo o campo, não uma cópia guardada',
  /function agora\(\) \{ return f\.querySelector\('#txt-msg'\)\.value; \}/.test(msg));
eh('o texto da pessoa é escapado antes de virar HTML',
  /function escM\(x\) \{[\s\S]{0,200}replace\(\/&\/g,'&amp;'\)/.test(msg),
  'nome com < vira etiqueta solta e quebra a folha');

console.log('\n— o motor que troca as marcas —');
const preencher = new Function('B12', 'return ' + nucleo.slice(
  nucleo.indexOf('function (texto, d) {', nucleo.indexOf('B12.preencherMensagem')),
  nucleo.indexOf('\n};', nucleo.indexOf('B12.preencherMensagem')) + 2));
const fn = preencher({ dataBR: s => s.split('-').reverse().join('/'),
                       hoje: () => '2026-11-24', EMPRESA: { nome: 'Estação B12' } });
eh('{nome} vira o primeiro nome', fn('Oi, {nome}!', { nome: 'Ana Paula Souza' }) === 'Oi, Ana!');
eh('{codigo} vira o código', fn('{codigo}', { cod: 'B12-4821' }) === 'B12-4821');
eh('{data} vira a data em português', fn('{data}', { data: '2026-12-25' }) === '25/12/2026');
eh('sem nome, não fica um buraco esquisito', fn('Oi, {nome}!', {}) === 'Oi, tudo bem!');
eh('sem data, vale hoje', fn('{data}', {}) === '24/11/2026');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
