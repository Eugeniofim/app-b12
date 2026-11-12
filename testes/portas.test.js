/* ============================================================================
   DUAS PORTAS NA ENTRADA

   12/11/2026: "importante separar a área do Dhalsin, que é o dono, do login de
   funcionário... tem que separar isso já ali na entradinha."

   Até aqui havia UMA caixa de PIN e o papel saía de qual PIN a pessoa digitou.
   Funcionava, mas era invisível: ninguém sabia que existiam dois acessos.

   A trava do dinheiro não é só a tela escondendo. São três camadas, e este
   arquivo guarda as três: a porta, o menu (so:'dono') e o banco (RLS).
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const acesso = fs.readFileSync(path.join(raiz, 'acesso.js'), 'utf8');
const app = fs.readFileSync(path.join(raiz, 'app.js'), 'utf8');
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');
const sql = fs.readFileSync(path.join(raiz, 'nuvem', '01-esquema.sql'), 'utf8');

console.log('\n— a porta pergunta quem está entrando —');
eh('existe a entradinha com as duas portas', /B12\.escolherPorta = function/.test(acesso));
eh('uma porta é a do proprietário', /data-papel="dono"/.test(acesso));
eh('a outra é a do funcionário', /data-papel="equipe"/.test(acesso));
eh('e a tela diz, em português, o que cada uma abre',
  /Tudo, inclusive o dinheiro/.test(acesso) && /O dia a dia\. Sem o financeiro\./.test(acesso));
eh('o botão Painel passa pela escolha',
  /B12\.escolherPorta\(function \(papel\)/.test(app));
eh('quem já entrou não é perguntado de novo',
  /if \(B12\.pode\('equipe'\)\) return B12\.ir/.test(app));
eh('a escolha leva ao painel ou à tela da equipe, conforme o papel',
  /B12\.ir\(papel === 'dono' \? 'adm' : 'equipe'\)/.test(app));

console.log('\n— cada porta só aceita o PIN dela —');
eh('a porta escolhida é exigente', /opc\.exato/.test(acesso));
eh('PIN do dono na porta do funcionário é recusado',
  /var erradaDePorta = opc\.exato && papel && papel !== papelMinimo/.test(acesso));
eh('e a recusa explica o que fazer',
  /Esse é o PIN do proprietário\. Volte e entre pela porta dele\./.test(acesso));
eh('PIN da equipe numa área de dono continua recusado',
  /Este PIN é da equipe\. Esta área é só do proprietário\./.test(acesso));
eh('Voltar na caixa de PIN volta para a escolha, não para fora',
  /if \(opc\.exato\) B12\.escolherPorta\(depois\); else B12\.ir\('inicio'\)/.test(acesso));
eh('cinco erros ainda trancam por um minuto',
  /registraErro\(\)/.test(acesso) && /Espere um minuto/.test(acesso));

console.log('\n— o funcionário não vê o dinheiro: as três camadas —');
eh('1. o menu: Financeiro é só do dono',
  /\{ id:'dinheiro',\s*nome:'Financeiro', so:'dono'/.test(adm));
eh('1. o menu: Estação B12 é só do dono',
  /\{ id:'estacao',\s*nome:'Estação B12',\s*so:'dono'/.test(adm));
eh('2. a tela: pedir a página pelo nome também não entra',
  /g\.so && !B12\.pode\(g\.so\)/.test(adm));
eh('3. o banco: lançamentos só respondem para o dono',
  /b12_lancamentos[\s\S]{0,400}?b12_e_dono\(\)/.test(sql));
eh('3. o banco: contas também',
  /b12_contas[\s\S]{0,400}?b12_e_dono\(\)/.test(sql));

console.log('\n— o dia a dia continua aberto para os dois —');
eh('o Cadastro não é trancado',
  !/\{ id:'balcao',\s*nome:'Cadastro',\s*so:'dono'/.test(adm));
eh('Horário de travessia também não',
  !/nome:'Horário de travessia', so:'dono'/.test(adm));
eh('e a equipe lê a escala no banco',
  /b12_saidas[\s\S]{0,300}?b12_e_equipe\(\)/.test(sql));

/* ------------------------------ Refeição nas saídas (12/11/2026) */
console.log('\n— as categorias de saída —');
const dados = fs.readFileSync(path.join(raiz, 'dados.js'), 'utf8');
const SAIDAS = new Function(dados.slice(dados.indexOf('B12.SAIDAS'),
  dados.indexOf('];', dados.indexOf('B12.SAIDAS')) + 2).replace('B12.SAIDAS', 'var S') +
  ' return S;')();
eh('Refeição está na lista', SAIDAS.includes('Refeição'), SAIDAS.join(' · '));
eh('e nenhuma categoria aparece duas vezes',
  new Set(SAIDAS).size === SAIDAS.length);
eh('as que já existiam continuam',
  ['Combustível','Manutenção','Operação/marinheiros','Impostos e taxas',
   'Despesas administrativas','Compras e fornecedores','Outras despesas']
    .every(c => SAIDAS.includes(c)));
eh('"Outras despesas" continua sendo a última',
  SAIDAS[SAIDAS.length - 1] === 'Outras despesas');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
