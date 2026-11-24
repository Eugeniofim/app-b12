/* ============================================================================
   PREÇO À MÃO — IDA, VOLTA E ESTACIONAMENTO

   24/11/2026, três pedidos seguidos na manhã da entrega:

   1. "precisa ter do lado de IDA o valor da ida ali e hora; mesma coisa na
      VOLTA, do lado direito colocar valor de volta também"
   2. "deixar pra preencher SEM preço da tabela... deixar livre pra pôr à mão"
   3. "deixar espaço também para pôr o valor combinado por eles do
      estacionamento na mão, na ficha do cliente — pois são preços feitos
      diferentes na hora"

   A regra da casa já estava escrita e eu tinha furado: na B12 não existe preço
   fixo no código. Quem atende combina e digita. A tabela é consulta, não lei.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const form = fs.readFileSync(path.join(raiz, 'formularios.js'), 'utf8');
const nucleo = fs.readFileSync(path.join(raiz, 'nucleo.js'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'estilo.css'), 'utf8');

console.log('\n— os campos estão na linha da data —');
eh('a ida tem data, hora e valor na mesma linha',
  /<div class="trio">' \+\s*'<div>' \+ campo\('Ida', 'data'[\s\S]{0,400}?campo\('Valor da ida', 'valorIda'/.test(form));
eh('a volta também',
  /<div class="trio">' \+\s*'<div>' \+ campo\('Volta', 'volta'[\s\S]{0,400}?campo\('Valor da volta', 'valorVolta'/.test(form));
eh('e na tela de corrigir igual',
  /campo\('Ida', 'ida'[\s\S]{0,400}?campo\('Valor da ida', 'valorIda'/.test(form));
eh('nascem VAZIOS — é esse o pedido',
  !/campo\('Valor da ida', 'valorIda', \{[^}]*valor: *[0-9]/.test(form),
  'valor pré-preenchido é a tabela voltando pela porta dos fundos');
eh('o estacionamento tem campo no balcão',
  /campo\('Estacionamento', 'valorEstacionamento'/.test(form));
eh('e na ficha de corrigir, já com o que foi combinado antes',
  /valor: \(carro && carro\.combinado\) \? carro\.combinado : ''/.test(form));

console.log('\n— três caixas não cabem no dedo de um celular estreito —');
eh('o trio existe no CSS', /\.trio\{display:grid/.test(css));
eh('e vira duas linhas abaixo de 430px',
  /@media \(max-width:430px\)\{[\s\S]{0,200}?\.trio>div:nth-child\(3\)\{grid-column:1 \/ -1\}/.test(css));

console.log('\n— quem digita manda, a tabela só sugere —');
eh('a conta soma os dois trechos digitados', /var porMao = vIda \+ vVolta;/.test(form));
eh('o total a cobrar se preenche sozinho com a soma',
  /if \(porMao > 0 && !campoTotal\.dataset\.naMao\)/.test(form));
eh('mas para de mandar se ele escrever no total com o próprio dedo',
  /cTot\.dataset\.naMao = '1'/.test(form),
  'sem isso o app apaga o desconto que ele acabou de dar');
eh('e volta a somar se ele apagar o total',
  /if \(cTot\.value === ''\) delete cTot\.dataset\.naMao/.test(form));
eh('a faixa verde diz de onde veio o número',
  /Ida \+ volta, como você digitou/.test(form));
eh('digitar os valores recalcula na hora',
  /\[name=valorIda\],' \+\s*'\[name=valorVolta\],\[name=valorEstacionamento\]/.test(form));

console.log('\n— o estacionamento combinado vale pela estadia toda —');
const valorPatio = new Function('B12', 'return ' + nucleo.slice(
  nucleo.indexOf('function (reg, ate) {', nucleo.indexOf('B12.valorPatio')),
  nucleo.indexOf('\n};', nucleo.indexOf('B12.valorPatio')) + 2));
const B12 = { diariasDe: () => 3 };
const fn = valorPatio(B12);
eh('sem combinado, conta 3 diárias × R$ 50 = R$ 150',
  fn({ diaria: 50 }).total === 150);
eh('com R$ 80 combinado, são R$ 80 — não 3 × 80',
  fn({ diaria: 50, combinado: 80 }).total === 80,
  'multiplicar o combinado pelos dias cobraria o triplo do acertado');
eh('o combinado volta no resultado, para a tela poder dizer',
  fn({ diaria: 50, combinado: 80 }).combinado === 80);
eh('combinado zero ou lixo não derruba a conta',
  fn({ diaria: 50, combinado: 0 }).total === 150 &&
  fn({ diaria: 50, combinado: 'abc' }).total === 150);
eh('o que já foi pago na entrada continua descontando',
  fn({ diaria: 50, combinado: 80, pagoNaEntrada: 30 }).resta === 50);
eh('e pagar a mais vira crédito, não resta negativo',
  fn({ diaria: 50, combinado: 80, pagoNaEntrada: 100 }).resta === 0 &&
  fn({ diaria: 50, combinado: 80, pagoNaEntrada: 100 }).credito === 20);

console.log('\n— o combinado viaja do balcão até a saída —');
eh('a entrada do pátio guarda o combinado', /combinado: Math\.max\(0, Number\(v\.combinado\) \|\| 0\)/.test(nucleo));
eh('o balcão repassa o que foi digitado', /combinado: a\.valorEstacionamento,/.test(nucleo));
eh('corrigir a ficha corrige o preço do carro',
  /carro\.combinado = novoC; mudou\.push\('estacionamento'\)/.test(nucleo));
eh('o recibo do caixa diz que o preço foi combinado',
  / · valor combinado'/.test(nucleo),
  'sem isso o relatório mostra 3 diárias e um valor que não bate com elas');
eh('a reserva guarda os dois trechos para a ficha reabrir certa',
  /valorIda: Math\.max\(0, Number\(a\.valorIda\) \|\| 0\)/.test(nucleo) &&
  /valorVolta: Math\.max\(0, Number\(a\.valorVolta\) \|\| 0\)/.test(nucleo));

console.log('\n— "Mais informações (opcional)" saiu da vista —');
eh('o botão da dobra não existe mais', !/id="b-mais-balcao"/.test(form));
eh('nem o texto dele', !/Mais informações \(opcional\)/.test(form));
eh('mas os campos que o motor lê continuam no formulário',
  /lista\('Destino', 'destino'/.test(form) &&
  /lista\('Serviço', 'produto'/.test(form) &&
  /lista\('Faixa de horário', 'faixa'/.test(form),
  'tirar de vez quebraria o cálculo e a reserva na manhã da entrega');
eh('escondidos, não apagados', /<div id="mais-balcao" hidden>/.test(form));
eh('e e-mail, Instagram, CPF e cidade continuam em Editar cadastro',
  /campo\('E-mail', 'email'[\s\S]{0,900}?campo\('Instagram', 'instagram'/.test(
    form.slice(form.indexOf("B12.formCliente = function"))));

console.log('\n— a entrada do pátio: menos escolha, menos risco —');
eh('a lista "Tarifa" saiu da tela', !/f_lista\('Tarifa', 'tarifa'/.test(form));
eh('e com ela o apagão silencioso do valor digitado',
  !/d\.tarifa === 'combinada'/.test(form),
  'escrever 40 e ver virar outro número sem aviso é o pior tipo de defeito');
eh('a tarifa combinada não aparece mais numa tela de balcão',
  !/diariaEspecial\)\]\], 'balcao'/.test(form) &&
  !/f_lista\('Tarifa'[\s\S]{0,200}diariaEspecial/.test(form),
  'os R$ 35 são decisão do Dhalsin e o cliente está do lado olhando');
eh('no lugar entra o mesmo combinado da ficha do balcão',
  /campo\('Combinado pela estadia', 'combinado'/.test(form));
eh('a prévia mostra o combinado, não a diária vezes dias',
  /B12\.brl\(cb > 0 \? cb : dias \* di\)/.test(form),
  'prometer um número na tela e cobrar outro na saída é pior que não prometer');
eh('e recalcula quando ele digita o combinado',
  /form\.querySelector\('\[name=combinado\]'\)\.oninput = calc;/.test(form));

console.log('\n— "quando cobrar" saiu: quem decide é o ajuste, uma vez só —');
eh('a lista sumiu da tela do carro', !/lista\('Quando cobrar', 'cobrarAgora'/.test(form));
eh('e o formulário não force nada: entradaPatio consulta o ajuste',
  /delete d\.cobrarAgora;/.test(form),
  'mandar false fixo ignoraria o dono que escolheu cobrar na chegada');
eh('o ajuste continua existindo em Ajustes do proprietário',
  /f_lista\('Quando cobrar, por padrão', 'patioCobranca'/.test(
    require('fs').readFileSync(require('path').join(raiz, 'acesso.js'), 'utf8')));
eh('a forma de pagamento só aparece quando há o que pagar agora',
  /\(cfg\.cobranca === 'chegada'[\s\S]{0,400}?lista\('Forma de pagamento', 'pg', PAGAMENTOS, 'pix'\)/.test(form));

console.log('\n— a saída do carro: "isso precisa ser editável sempre" —');
eh('o valor a cobrar virou campo, não número fechado',
  /campo\('A cobrar agora', 'cobrar'/.test(form));
eh('o resumo acima passou a se chamar "Pela conta"',
  /\(c\.resta \? 'Pela conta' : 'Nada a cobrar'\)/.test(form),
  'duas coisas chamadas "A cobrar agora" na mesma tela é uma a mais');
eh('o campo se refaz quando ele mexe na hora',
  /if \(!cCob\.dataset\.naMao\) cCob\.value = String\(Math\.round\(c\.resta \* 100\) \/ 100\);/.test(form));
eh('e para de se refazer depois que ele escreve',
  /else \{ cCob\.dataset\.naMao = '1'; pintar\(\); \}/.test(form),
  'o app apagaria o acerto feito com a pessoa parada na frente');
eh('apagar o campo devolve o calculado',
  /if \(cCob\.value === ''\) \{ delete cCob\.dataset\.naMao; calc\(\); \}/.test(form));
eh('a tela avisa, em caixa amarela, que o valor foi escrito à mão',
  /Escrito à mão: vai entrar <b>/.test(form));
eh('e o valor digitado chega ao saidaPatio',
  /B12\.saidaPatio\(id, d\.pg, d\.hora, d\.cobrar\)/.test(form));

console.log('\n— e o motor cobra o que foi escrito —');
const saida = nucleo.slice(nucleo.indexOf('B12.saidaPatio = function'),
                           nucleo.indexOf('B12.patioHoje'));
eh('valor vazio continua valendo a conta de sempre',
  /if \(!mao\) cobrar = c\.resta;/.test(saida));
eh('valor negativo é recusado antes de o carro sair',
  /if \(mao && !\(cobrar >= 0\)\) return \{ erro:/.test(saida),
  'recusar DEPOIS de marcar saidaReal deixaria o carro fora do pátio e sem cobrança');
eh('o lançamento no caixa leva o valor escrito, não o calculado',
  /valor: cobrar, pg: pg \|\| 'pix'/.test(saida));
eh('e o recibo diz que o valor foi combinado',
  /c\.combinado > 0 \|\| mudouAMao \? ' · valor combinado' : ''/.test(saida));
eh('o carro guarda o que foi cobrado, para a conta não mudar de história depois',
  /if \(mudouAMao\) reg\.combinado = reg\.valorPago;/.test(saida));
eh('e o resultado conta as duas versões: a escrita e a calculada',
  /peloCalculo: c\.resta, aMao: mudouAMao/.test(saida));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
