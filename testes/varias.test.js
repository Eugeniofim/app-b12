/* ============================================================================
   MANDAR PARA VÁRIAS PESSOAS

   24/11/2026. Ele olhou a aba Mensagens e perguntou:

     "Como a gente faz para enviar para mais pessoas que estão na Ilha do Mel?
      Aqui está dizendo só uma pessoa, Paulo. E lá tem Paulo, tem Eugênio,
      tem outras pessoas. Talvez uma mensagem sem nome, mais genérica, e daí
      ter alguma caixa para você clicar em quais pessoas enviar."

   Três coisas, e a terceira é a que ninguém queria dizer:

   1. ESCOLHER QUEM — caixas, uma por pessoa, com quem está na Ilha e quem
      volta hoje e amanhã já dentro.
   2. SEM NOME É OPCIONAL, NÃO OBRIGATÓRIO — {nome} é trocado POR PESSOA, uma
      mensagem de cada vez, então cada um recebe com o nome dele. Texto sem
      {nome} vai igual para todos. A tela diz qual dos dois é, e muda de
      recado quando ele mexe no texto.
   3. WHATSAPP NÃO MANDA EM LOTE. O wa.me abre UMA conversa. A fila antiga
      usava confirm() e escrevia "Enviado para Fulano" — mentira: só tinha
      ABERTO a conversa. Dizer "enviado" faz ele riscar da cabeça alguém que
      nunca recebeu. Agora é um painel que conta quantos faltam e só anda
      quando ele diz que mandou.
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
const css = fs.readFileSync(path.join(raiz, 'estilo.css'), 'utf8');

console.log('\n— escolher quem recebe —');
eh('a tela existe', /B12\.formMandarPara = function/.test(msg));
eh('e tem porta na aba Mensagens', /id="b-varias"/.test(adm) && /B12\.formMandarPara\(m\)/.test(adm));
eh('junta quem volta hoje, quem volta amanhã e quem está na Ilha',
  /juntar\(\(ilha\.voltam \|\| \[\]\), 'volta hoje'\)/.test(msg) &&
  /'volta amanhã'\)/.test(msg) &&
  /juntar\(\(ilha\.agora \|\| \[\]\), 'na Ilha'\)/.test(msg));
eh('cada pessoa entra UMA vez, mesmo em duas listas',
  /if \(vistos\[chave\]\) \{/.test(msg));
eh('e a etiqueta não repete quando ela tem duas reservas',
  /if \(etiqueta && vistos\[chave\]\.etiquetas\.indexOf\(etiqueta\) < 0\)/.test(msg),
  'saía "volta hoje · volta hoje · na Ilha · na Ilha" na mesma linha');
eh('tem caixa por pessoa', /class="mp-cx"/.test(msg));
eh('e os atalhos Todos / Nenhum', /id="mp-todos"/.test(msg) && /id="mp-nenhum"/.test(msg));
eh('cada linha diz por quais canais aquela pessoa é alcançável',
  /if \(p\.whats\) canais\.push\('WhatsApp'\)/.test(msg) &&
  /if \(p\.clienteId\) canais\.push\('app'\)/.test(msg));
eh('quem não tem contato nenhum é marcado como tal', /sem contato<\/b>/.test(msg));
eh('e a tela avisa quando não há ninguém na Ilha',
  /Não há ninguém na Ilha nem voltando nos próximos dias/.test(msg));

console.log('\n— o nome: opcional, e a tela diz qual é —');
eh('texto com {nome} avisa que cada um recebe o seu',
  /cada pessoa recebe com o primeiro nome dela/.test(msg));
eh('texto sem nome avisa que vai igual para todos',
  /vai <b>igual para todos<\/b>/.test(msg));
eh('e o aviso muda quando ele edita o texto',
  /cTexto\.addEventListener\('input', function \(\) \{/.test(msg),
  'aviso que não acompanha o texto vira decoração');
eh('a troca é feita POR PESSOA, não uma vez só',
  /function textoDe\(p\) \{[\s\S]{0,200}B12\.preencherMensagem\(f\.querySelector\('#mp-texto'\)\.value/.test(msg));

console.log('\n— o texto é editável antes de mandar —');
eh('aqui', /id="mp-texto"/.test(msg));
eh('nos modelos de fábrica também', /<textarea class="balao balao-edit" id="txt-msg"/.test(msg));
eh('e o que sai é o que está na tela, não o que a função montou',
  (msg.match(/function agora\(\) \{ return f\.querySelector\('#txt-msg'\)\.value; \}/g) || []).length === 2,
  'as duas folhas precisam ler o campo');
eh('os asteriscos ficam à mostra, porque é assim que o WhatsApp lê negrito',
  /<b>\*asteriscos\*<\/b>/.test(msg));
eh('o campo tem estilo próprio e dá para crescer', /\.balao-edit\{[^}]*resize:vertical/.test(css));

console.log('\n— a contagem por canal é separada, porque os canais são diferentes —');
eh('WhatsApp conta quem tem número', /p\.whats; \}\)\.length/.test(msg));
eh('aviso no app conta quem tem ficha', /p\.clienteId; \}\)\.length/.test(msg));
eh('e-mail conta quem tem endereço com @', /p\.email\.indexOf\('@'\) > 0; \}\)\.length/.test(msg));
eh('botão de canal sem ninguém fica desligado',
  /f\.querySelector\('#mp-zap'\)\.disabled = !z;/.test(msg));

console.log('\n— a fila do WhatsApp parou de mentir —');
eh('o confirm() sumiu', !/confirm\('Enviado para /.test(adm));
eh('e com ele a palavra "Enviado"', !/'Enviado para ' \+ p\.nome/.test(adm));
eh('agora é um painel com a conta de quem falta',
  adm.indexOf("n + ' de ' + lista.length") > 0 && adm.indexOf("' faltando</p>") > 0);
eh('a tela diz, antes, que apertar enviar é com ele',
  /<b>Apertar enviar é com você<\/b>/.test(adm));
eh('cada pessoa tem Abrir e "já mandei"',
  /data-fw-abrir=/.test(adm) && /data-fw-ok=/.test(adm));
eh('e dá para desmarcar quem não foi mesmo',
  /if \(feitos\[i\]\) delete feitos\[i\]; else feitos\[i\] = true;/.test(adm),
  'abriu a conversa e fechou sem mandar: ele precisa poder voltar atrás');

console.log('\n— o que manda em lote de verdade manda, e diz quanto chegou —');
eh('o aviso no app vai um por pessoa, com o nome dela',
  /B12\.avEnviarPara\(\{ clienteId: p\.clienteId/.test(msg));
eh('e o resultado conta quantos realmente receberam',
  /rs\.filter\(function \(r\) \{ return r && r\.enviados > 0; \}\)\.length/.test(msg));
eh('ninguém com o app instalado não vira "enviado"',
  /Nenhuma dessas pessoas tem o app instalado/.test(msg));
eh('o e-mail usa a lista de ids, que o servidor confere',
  /para: 'escolhidos',\s*\n?\s*ids: alvos\.map/.test(msg));
eh('o asterisco do negrito sai do texto do push (lá não existe negrito)',
  /textoDe\(p\)\.replace\(\/\\\*\/g, ''\)/.test(msg));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
