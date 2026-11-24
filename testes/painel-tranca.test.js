/* ============================================================================
   O PAINEL PEDE O PIN SEMPRE

   24/11/2026, dele: "sempre quando entrar no Painel pedir PIN, pois às vezes
   é a funcionária mexendo."

   O buraco era grande e silencioso: a SESSÃO DURAVA 12 HORAS. Bastava o
   Dhalsin entrar às oito da manhã e, até as oito da noite, QUALQUER pessoa
   que pegasse aquele tablet entrava no painel do dono — Caixa, Lançamentos,
   Contas, Preços, tudo. Num balcão onde o aparelho passa de mão em mão, a
   porta ficava destrancada o dia inteiro.

   Duas travas, porque o risco tem duas formas:

     1. ENTRAR no painel pede o PIN toda vez. A folga de 90 s existe só para
        não perguntar duas vezes no mesmo gesto — o portão entra, e a volta
        dele chama B12.ir('adm') de novo.
     2. O painel se TRANCA quando o app fica 2 minutos fora da frente. Este é
        o caso de verdade: o tablet largado no balcão, ABERTO no painel, e a
        funcionária pegando para atender alguém.

   A área da EQUIPE não muda de propósito: é o trabalho do dia inteiro, e
   pedir PIN a cada atendimento faria ela deixar o app aberto para não ter de
   digitar — exatamente o oposto do que ele pediu.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const ac = fs.readFileSync(path.join(raiz, 'acesso.js'), 'utf8');
const app = fs.readFileSync(path.join(raiz, 'app.js'), 'utf8');

console.log('\n— a trava existe e é separada da sessão —');
eh('há uma marca própria do painel', /var CONF = 'b12_painel_ok';/.test(ac));
eh('com folga curta, só para o mesmo gesto',
  /var FOLGA_PAINEL = 90 \* 1000;/.test(ac));
eh('separada da sessão de 12 horas, que continua existindo',
  /var DURACAO = 12 \* 60 \* 60 \* 1000;/.test(ac),
  'a sessão diz QUEM é a pessoa; a marca diz se ela acabou de provar isso');
eh('digitar o PIN do dono libera', /if \(papel === 'dono'\) B12\.painelConfirmar\(\)/.test(ac));
eh('e entrar como equipe tranca', /else B12\.painelTrancar\(\);/.test(ac),
  'a funcionária entrando não pode deixar o painel liberado atrás dela');
eh('sair tranca', /B12\.sair = function \(\) \{[\s\S]{0,120}B12\.painelTrancar\(\);/.test(ac));

console.log('\n— entrar no painel passa pelo PIN —');
eh('o portão aceita forçar mesmo com sessão válida',
  /if \(!opc\.recontar && B12\.pode\(papelMinimo\)\)/.test(ac),
  'sem isto o portão devolvia na hora, porque a sessão dizia dono');
eh('a rota do painel usa isso', /\{ exato: true, recontar: true \}/.test(app));
eh('e a rota direta do adm também',
  /if \(nome === 'adm' && !B12\.painelLiberado\(\)\)/.test(app),
  'quem chega por link ou pelo assistente passa pela mesma porta');
/* Eu tinha deixado a equipe com sessão aberta para não atrapalhar quem
   atende cinquenta pessoas por dia. Ele preferiu as DUAS PORTAS, e com
   razão: ela entra uma vez e fica na tela da equipe o dia todo — só digita
   o PIN quando volta do lado do turista. O ganho de clareza paga. */
eh('as duas portas aparecem sempre, para os dois papéis',
  /return B12\.escolherPorta\(function \(papel\) \{ B12\.ir\(papel === 'dono' \? 'adm' : 'equipe'\); \}\);/.test(app) &&
  !/if \(B12\.pode\('equipe'\)\) return B12\.ir/.test(app));
eh('o Voltar do portão não manda trocar de pessoa',
  /if \(opc\.recontar\) B12\.ir\('inicio'\);/.test(ac),
  'ele não está trocando de usuário, só reabrindo o painel');

console.log('\n— o tablet largado aberto no painel —');
eh('o app tranca ao voltar de segundo plano', /if \(fora < 2 \* 60 \* 1000\) return;/.test(app));
eh('dois minutos, não menos', /2 \* 60 \* 1000/.test(app),
  'menos que isso trancaria ele só por atender o telefone');
eh('e se ele estava DENTRO, sai para a frente',
  /if \(document\.body\.classList\.contains\('adm'\)\) B12\.ir\('inicio'\);/.test(app),
  'trancar e deixar a tela do Caixa à mostra não tranca nada');
eh('a conta do tempo zera a cada ida', /saiuEm = 0;/.test(app));

console.log('\n— o comportamento da função, de verdade —');
const B12 = { pode: p => p === 'dono' };
const loja = {};
global.localStorage = {
  getItem: k => (k in loja ? loja[k] : null),
  setItem: (k, v) => { loja[k] = String(v); },
  removeItem: k => { delete loja[k]; }
};
const corpo = ac.slice(ac.indexOf('B12.painelConfirmar'), ac.indexOf('/* ---------', ac.indexOf('B12.painelLiberado')));
new Function('B12', 'CONF', 'FOLGA_PAINEL', corpo)(B12, 'b12_painel_ok', 90000);
eh('sem marca nenhuma, o painel está trancado', B12.painelLiberado() === false);
B12.painelConfirmar();
eh('digitou o PIN: abre no mesmo gesto', B12.painelLiberado() === true);
loja['b12_painel_ok'] = String(Date.now() - 2 * 60 * 1000);
eh('dois minutos depois já pede de novo', B12.painelLiberado() === false,
  'é o que faz ele pedir "sempre", e não uma vez por dia');
loja['b12_painel_ok'] = String(Date.now() - 10 * 1000);
eh('dez segundos depois ainda abre — é o mesmo gesto', B12.painelLiberado() === true);
B12.painelTrancar();
eh('trancar funciona', B12.painelLiberado() === false);
B12.pode = () => false;
B12.painelConfirmar();
eh('e quem não é dono nunca abre, mesmo com a marca', B12.painelLiberado() === false,
  'a marca é só o "acabou de provar"; quem pode continua sendo a sessão');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
