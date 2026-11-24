/* ============================================================================
   A CHAVE DE IA E O MEDIDOR DE CRÉDITOS

   24/11/2026. Ele perguntou: "como que ele põe a chave de IA dele, onde ele
   compra créditos?" — e a pergunta era o defeito em pessoa.

   Duas coisas estavam misturadas na tela:
   · o MEDIDOR, um número grande chamado CRÉDITOS com um botão "Pôr créditos".
     Parecia carteira. Não compra nada: é um teto que ele mesmo escreve.
   · a CHAVE, que é de onde o dinheiro sai de verdade. O campo existia, mas
     escondido no fim dos Ajustes, depois de PINs, grade e pátio.

   E a tela do assistente dizia, com todas as letras, "ponha a sua própria
   chave de IA aqui mesmo, logo abaixo" — sem ter campo nenhum abaixo.
   ========================================================================== */
'use strict';
let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');
const acesso = fs.readFileSync(path.join(raiz, 'acesso.js'), 'utf8');
const assist = fs.readFileSync(path.join(raiz, 'assistente.js'), 'utf8');

console.log('\n— a tela não promete mais um campo que não existe —');
eh('sumiu o "aqui mesmo, logo abaixo" sem campo abaixo',
  !/chave de IA ' \+\s*'aqui mesmo, logo abaixo/.test(adm));
eh('no lugar, aponta para um botão que existe de verdade',
  /toque em <b>Ligar com a minha conta de IA<\/b>/.test(adm));
eh('e o botão está na tela do assistente', /id="ia-chave"/.test(adm));
eh('ligado ao formulário da chave', /B12\.formChaveIA\(function \(r\)/.test(adm));
eh('o rótulo muda quando já existe chave',
  /d\.chavePropria \? 'Trocar a minha chave de IA' : 'Ligar com a minha conta de IA'/.test(adm));

console.log('\n— o medidor diz de quem é o dinheiro —');
eh('a linha nova existe', /ia-credito-dono/.test(adm));
eh('com chave própria, o dinheiro é da conta dele',
  /sua conta na Anthropic<\/b>'/.test(adm));
eh('sem chave própria mas ligado, o custo é da Ti Artes',
  /o custo é da <b>Ti Artes<\/b>'/.test(adm));
eh('desligado, diz que está desligado',
  /O assistente ainda não foi ligado\.'/.test(adm));
eh('o botão não se chama mais "Pôr créditos"',
  /id="ia-recarregar">Mudar o teto</.test(adm) && !/>Pôr créditos</.test(adm),
  'o nome antigo fazia o medidor passar por carteira');

console.log('\n— a folha do teto explica em vez de fingir que vende —');
eh('diz na primeira linha que não compra nada',
  /<b>Este medidor não compra nada\.<\/b>/.test(adm));
eh('e manda para onde se compra de verdade',
  /console\.anthropic\.com\/settings\/billing/.test(adm));
eh('a ação virou "Subir o teto"', /acao: 'Subir o teto'/.test(adm));

console.log('\n— o formulário da chave —');
eh('existe', /B12\.formChaveIA = function/.test(acesso));
eh('só para o dono', /B12\.formChaveIA = function \(depois\) \{\s*if \(!B12\.pode\('dono'\)\)/.test(acesso));
eh('ensina os três passos: comprar, pegar a chave, colar',
  /1 · Onde comprar o crédito/.test(acesso) &&
  /2 · Onde pegar a chave/.test(acesso) &&
  /3 · Cole aqui/.test(acesso));
eh('o link do console abre em outra aba, sem carona de sessão',
  /target="_blank" ' \+\s*'rel="noopener"/.test(acesso));
eh('avisa que a chave fica só neste aparelho',
  /não sobe para a nuvem nem viaja para os ' \+\s*'outros aparelhos/.test(acesso),
  'ele tem TRÊS aparelhos: achar que a chave viaja é perder meia hora');
eh('o campo é de senha, não fica à mostra no balcão',
  /f_campo\('Chave da Anthropic', 'chaveIA', \{ tipo:'password'/.test(acesso));
eh('dá para escolher o motor ali mesmo', /f_lista\('Qual motor', 'motor'/.test(acesso));
eh('e devolve o erro da chave em vez de engolir',
  /if \(r\.erro\) return \{ erro: r\.erro \};/.test(acesso));

console.log('\n— o que já estava certo e precisa continuar —');
eh('chave errada é recusada antes de guardar',
  /if \(k\.indexOf\('sk-ant-'\) !== 0\) return \{ erro:/.test(assist));
eh('campo vazio apaga a chave', /if \(!k\) \{ localStorage\.removeItem\(CHAVE\); return \{ ok: true, apagada: true \}/.test(assist));
eh('com chave própria, fala direto com a Anthropic',
  /var direto = !!chave;/.test(assist));
eh('e o app sabe dizer que a chave é dele', /chavePropria: !!B12\.iaChave\(\)/.test(assist));
eh('a chave continua fora do repositório',
  !/sk-ant-[A-Za-z0-9_-]{10}/.test(assist + adm + acesso),
  'chave de verdade escrita no código é chave vazada');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
