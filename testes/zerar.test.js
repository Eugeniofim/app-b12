/* ============================================================================
   ENTREGAR O APP ZERADO

   16/11/2026. O Eugênio: "o app vem zerado pra iniciar hoje, deixa só o
   histórico do passado guardado, sem afetar o app".

   Faltava a ferramenta. "Começar a usar valendo" tira só o que é
   DEMONSTRAÇÃO; o movimento criado durante o teste é registro real de mentira
   e ficava para sempre. Medido na nuvem da B12 antes de entregar: 165 saídas,
   4 reservas e 4 lançamentos de teste, com o e-mail dele nas quatro reservas.

   E tem de limpar a memória da SINCRONIA junto: sem isso o aparelho segue
   achando que já mandou tudo, e a primeira mexida ressuscita o lixo na nuvem
   do cliente.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const nucleo = fs.readFileSync(path.join(raiz, 'nucleo.js'), 'utf8');
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');
const dados = fs.readFileSync(path.join(raiz, 'dados.js'), 'utf8');

function monta() {
  const guardado = {
    b12_cofre: '{"copias":[1,2,3]}', b12_sombra: '{"x":1}', b12_fila: '[1]',
    b12_marca: 'abc', b12_emdia: '1', b12_casa: 'x', b12_dados_v1: '{}'
  };
  const B12 = {
    MARINHEIROS: [{ id: 'm1', nome: 'Padrão' }],
    DB: {
      reservas: [{ id: 'r1' }, { id: 'r2' }], clientes: [{ id: 'c1' }],
      lancamentos: [{ id: 'l1' }, { id: 'l2' }], saidas: new Array(165).fill(0).map((_, i) => ({ id: 's' + i })),
      patio: [{ id: 'p1' }], contas: [], manutencoes: [], tarefas: [{ id: 't1' }],
      mensagens: [{ id: 'g1' }], marinheiros: [{ id: 'mx', nome: 'Teste' }],
      semeado: false, demoDia: '2026-11-16',
      ajustes: { demo: true, diaria: 50, regular: 60, grade: { ida: ['08:30'] },
                 patio: { regra: 'dia' }, metaMensal: 9000 }
    },
    salvar: function () { B12.salvou = (B12.salvou || 0) + 1; }
  };
  const i = nucleo.indexOf('B12.movimento = [');
  const f = nucleo.indexOf('\n};', nucleo.indexOf('B12.comecarDoZero = function')) + 3;
  new Function('B12', 'localStorage',
    nucleo.slice(i, f))(B12, {
      removeItem: (k) => { delete guardado[k]; },
      getItem: (k) => guardado[k] || null, setItem: () => {}
    });
  return { B12, guardado };
}

console.log('\n— o movimento sai —');
const m = monta();
const r = m.B12.comecarDoZero();
eh('devolve quantos saíram', r.tirados === 2 + 1 + 2 + 165 + 1 + 1 + 1 + 1,
  String(r.tirados));
['reservas', 'clientes', 'lancamentos', 'saidas', 'patio', 'tarefas', 'mensagens'].forEach(function (k) {
  eh('"' + k + '" ficou vazio', (m.B12.DB[k] || []).length === 0,
    (m.B12.DB[k] || []).length + ' sobrou(ram)');
});
eh('as 165 saídas de teste saíram', m.B12.DB.saidas.length === 0);
eh('gravou no aparelho', m.B12.salvou >= 1);

console.log('\n— a configuração FICA —');
eh('o preço da diária fica', m.B12.DB.ajustes.diaria === 50);
eh('o preço da travessia fica', m.B12.DB.ajustes.regular === 60);
eh('a grade de horários fica', m.B12.DB.ajustes.grade.ida[0] === '08:30');
eh('as regras do pátio ficam', m.B12.DB.ajustes.patio.regra === 'dia');
eh('a meta do mês fica', m.B12.DB.ajustes.metaMensal === 9000);

console.log('\n— a empresa passa a valer —');
eh('sai do modo demonstração', m.B12.DB.ajustes.demo === false);
eh('e anota quando começou a valer', !!m.B12.DB.ajustes.demoSaiuEm);
eh('não semeia demonstração de novo', m.B12.DB.semeado === true);
eh('e esquece o dia da última semeadura', m.B12.DB.demoDia === null);

console.log('\n— marinheiros voltam para a lista de fábrica —');
eh('o marinheiro de teste saiu',
  !m.B12.DB.marinheiros.some(x => x.nome === 'Teste'));
eh('e a lista de fábrica entrou',
  m.B12.DB.marinheiros.length === 1 && m.B12.DB.marinheiros[0].nome === 'Padrão');

console.log('\n— a memória da sincronia é limpa (senão o lixo volta) —');
['b12_sombra', 'b12_fila', 'b12_marca', 'b12_emdia', 'b12_casa'].forEach(function (k) {
  eh('"' + k + '" foi apagado', m.guardado[k] === undefined);
});
eh('o cofre local também (senão "Voltar para esta" traz tudo de volta)',
  m.guardado.b12_cofre === undefined);
eh('mas o banco do aparelho continua (é ele que acabou de ser gravado)',
  m.guardado.b12_dados_v1 !== undefined);

console.log('\n— o histórico dos 11 anos não é tocado —');
eh('ele mora no código, não no movimento', /B12\.HIST_VENDAS|HIST_VENDAS\s*=/.test(dados));
eh('e não está na lista do que é apagado',
  !/HIST_VENDAS/.test(nucleo.slice(nucleo.indexOf('B12.movimento = ['),
                                    nucleo.indexOf('B12.comecarDoZero'))));

console.log('\n— o botão está na tela, e avisa —');
eh('o botão existe', /id="b-zerar"/.test(adm));
eh('pergunta antes', /confirm\('Começar do zero\?/.test(adm));
eh('diz que não tem volta', /Isto NÃO tem volta/.test(adm));
eh('e manda baixar a cópia antes', /Baixe a cópia completa antes/.test(adm));
eh('diz o que fica', /Ficam os preços, a grade/.test(adm));

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
