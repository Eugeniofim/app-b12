/* ============================================================================
   O QUE O FUNCIONÁRIO DO RECEPTIVO PODE E NÃO PODE

   16/11/2026. O Eugênio: "funcionário é quem trabalha ali no receptivo da
   B12, e marinheiro quem vai pro mar". São papéis diferentes, e o app tratava
   mal o primeiro.

   DOIS BURACOS, medidos e não lidos:

   1. O DINHEIRO SUMIA. `lancamentos` está em SO_DO_DONO, então o aparelho da
      funcionária NUNCA enviava lançamento. Ela atendia no balcão, o app criava
      a entrada no caixa DELA, e aquilo morria no aparelho: o Dhalsin via a
      reserva com o valor, mas o Caixa dele não via o dinheiro entrar.

   2. O PÁTIO FICAVA PRESO NO DONO. Ela cadastrava quem chega, mas não dava
      entrada de carro avulso nem DEVOLVIA um carro — metade da operação.

   A regra de ouro que estes testes guardam: ela DEPOSITA e nunca LÊ. Se algum
   dia a equipe puder ler uma linha do caixa, estes testes têm de quebrar.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const sinc = fs.readFileSync(path.join(raiz, 'sincronia.js'), 'utf8');
const tur = fs.readFileSync(path.join(raiz, 'turista.js'), 'utf8');
const sql = fs.readFileSync(path.join(raiz, 'nuvem', '08-equipe-lanca.sql'), 'utf8');
const esquema = fs.readFileSync(path.join(raiz, 'nuvem', '01-esquema.sql'), 'utf8');
const migra = fs.readFileSync(path.join(raiz, 'nuvem', '04-sincronia.sql'), 'utf8');

/* ---------------------------------- a decisão de enviar, rodada de verdade */
function decisor(papel) {
  const i = sinc.indexOf('function soDeposita(col)');
  const f = sinc.indexOf('\n', sinc.indexOf('function podeEnviar(col)'));
  const corpo = sinc.slice(i, f);
  return new Function('papelNuvem', 'alcanca', 'SO_DO_DONO',
    corpo + '\n return { soDeposita: soDeposita, podeEnviar: podeEnviar };')(
      () => papel,
      (col) => !({ lancamentos:1, contas:1, manutencoes:1, tarefas:1 }[col] && papel !== 'dono'),
      { lancamentos:1, contas:1, manutencoes:1, tarefas:1 });
}

console.log('\n— o dinheiro que a funcionária recebe chega no dono —');
const eq = decisor('equipe'), dono = decisor('dono');

eh('a equipe ENVIA lançamento (antes morria no aparelho)',
  eq.podeEnviar('lancamentos') === true);
eh('e esse envio é um depósito, não uma sincronia normal',
  eq.soDeposita('lancamentos') === true);
eh('o dono continua sincronizando normal', dono.soDeposita('lancamentos') === false);
eh('para o dono não muda nada', dono.podeEnviar('lancamentos') === true);

console.log('\n— mas ela não ganha mais nada junto —');
['contas', 'manutencoes', 'tarefas'].forEach(function (col) {
  eh('"' + col + '" continua fora do alcance da equipe', eq.podeEnviar(col) === false);
  eh('e "' + col + '" não vira depósito por tabela', eq.soDeposita(col) === false);
});
eh('reservas continuam sincronia normal para a equipe',
  eq.podeEnviar('reservas') === true && eq.soDeposita('reservas') === false);

console.log('\n— o depósito é insert puro: pedir de volta vazaria o caixa —');
eh('sem on_conflict quando é depósito',
  /\(deposito \? '' : '\?on_conflict=id'\)/.test(sinc),
  'upsert exige SELECT, e SELECT aqui entrega o caixa inteiro');
eh('e com return=minimal',
  /c\.Prefer = deposito \? 'return=minimal'/.test(sinc));
eh('linha apagada pela equipe nem sai do aparelho',
  /if \(deposito\) lote = lote\.filter\(function \(f\) \{ return !f\.apagado; \}\)/.test(sinc));
eh('lote vazio depois do filtro não vira chamada à toa',
  /if \(!lote\.length\) continue;/.test(sinc));

console.log('\n— a trava de leitura continua de pé —');
eh('a equipe não LÊ lançamento (alcanca segue fechado)',
  /if \(!alcanca\(col\)\) return;/.test(sinc),
  'a leitura passou a usar podeEnviar: a equipe veria o caixa');
/* lê política por política em vez de varrer o arquivo: a primeira versão
   deste teste pegou a política de MANUTENÇÕES, que vem logo abaixo da do
   caixa, e acusou um vazamento que não existia. */
(function () {
  const txt = esquema + '\n' + sql;
  const politicas = [];
  const re = /create policy\s+(\w+)\s+on\s+public\.(\w+)\s+for\s+(\w+)[\s\S]*?;/gi;
  let m;
  while ((m = re.exec(txt))) {
    politicas.push({ nome: m[1], tabela: m[2], cmd: m[3].toLowerCase(), corpo: m[0] });
  }
  const doCaixa = politicas.filter(x => x.tabela === 'b12_lancamentos');
  eh('o arquivo tem políticas do caixa para conferir', doCaixa.length >= 2,
    doCaixa.length + ' política(s)');
  const leituraDaEquipe = doCaixa.filter(x =>
    (x.cmd === 'select' || x.cmd === 'all') && /b12_e_equipe/.test(x.corpo));
  eh('NENHUMA política deixa a equipe LER o caixa',
    leituraDaEquipe.length === 0,
    leituraDaEquipe.map(x => x.nome).join(', '));
  const deposito = doCaixa.filter(x => x.cmd === 'insert' && /b12_e_equipe/.test(x.corpo));
  eh('e existe exatamente uma de depósito', deposito.length === 1,
    deposito.map(x => x.nome).join(', '));
  eh('a do dono continua valendo para tudo',
    doCaixa.some(x => x.cmd === 'all' && /b12_e_dono/.test(x.corpo)));
  /* a de manutenções é de outra tabela: não pode ser confundida com a do caixa */
  eh('a política de manutenções não entrou na conta do caixa',
    !doCaixa.some(x => x.tabela !== 'b12_lancamentos'));
})();
eh('a política nova é só de INSERT', /for insert to authenticated/.test(sql));
eh('e só aceita ENTRADA', /dados->>'tipo', ''\) = 'entrada'/.test(sql));
eh('nas categorias que o balcão cobra',
  /'Travessias', 'Estacionamento', 'Bar e loja'/.test(sql));
eh('a política olha DADOS, não a coluna morta',
  /dados->>'cat'/.test(sql) && !/\band cat in \(/.test(sql),
  'as colunas antigas estão vazias desde 06/10 — ver 04-sincronia.sql');
eh('e a migração confirma que a coluna antiga ficou vazia',
  /alter column tipo\s+drop not null/.test(migra));

console.log('\n— o pátio na tela do receptivo —');
eh('tem botão de carro entrando', /id="b-carro-eq"/.test(tur));
eh('que abre a entrada de pátio de verdade',
  /B12\.formEntradaPatio\(function \(\) \{ B12\.pintarEquipe\(\); \}\)/.test(tur));
eh('a lista do pátio é desenhada', /function patioEquipe\(\)/.test(tur));
eh('e entra na tela da equipe', /naIlhaEquipe\(\) \+\s*\n?\s*patioEquipe\(\)/.test(tur));
eh('cada carro tem o botão de devolver', /data-eqsai="/.test(tur));
eh('que abre a saída com cobrança',
  /B12\.confirmarSaidaPatio\(x\.dataset\.eqsai/.test(tur));
eh('pátio vazio diz isso em vez de lista em branco',
  /Nenhum carro no pátio agora/.test(tur));
eh('carro que passou da data aparece marcado', /atrasado \? ' alerta' : ''/.test(tur));
eh('o nome e a placa são escapados (é texto de cliente)',
  /escT\(v\.placa/.test(tur) && /escT\(v\.nome/.test(tur));
eh('e a tela segue dizendo que ela não vê dinheiro',
  /Não vê nada de dinheiro/.test(tur));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
