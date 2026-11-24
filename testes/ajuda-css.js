/* ============================================================================
   O CSS ESTÁ INTEIRO?

   24/11/2026, e esta lição custou uma tela desmontada que ninguém via.

   Três testes já conferiam o CSS contando `{` e `}` e exigindo o mesmo
   número. Passava. E mesmo assim o arquivo estava quebrado em DOIS lugares:

     linha  379 — um `}` a mais, sobrando, fechando nada
     linha 1948 — um `@media (max-width:719px)` que NUNCA FECHAVA

   Os dois erros se anulavam na conta. O navegador, que não conta e sim lê,
   engolia tudo o que vinha depois da linha 1948 para dentro daquele @media:
   desde 12/11, cada regra nova escrita no fim do arquivo só valia em telas
   de até 719px. No tablet e no computador elas simplesmente não existiam —
   sem erro no console, sem aviso em lugar nenhum, só a tela saindo torta.

   Contar não é ler. Isto aqui LÊ: percorre o arquivo e reclama de um fecha
   antes do abre, e de um abre que chega ao fim sem fechar. */
'use strict';

function tiraComentarios(css) {
  /* preserva as quebras de linha para o número da linha continuar certo */
  return css.replace(/\/\*[\s\S]*?\*\//g, function (m) {
    return m.replace(/[^\n]/g, ' ');
  });
}

function conferirCSS(css) {
  var limpo = tiraComentarios(css);
  var linha = 1, pilha = [], erros = [];
  for (var i = 0; i < limpo.length; i++) {
    var c = limpo[i];
    if (c === '\n') linha++;
    else if (c === '{') pilha.push(linha);
    else if (c === '}') {
      if (!pilha.length) erros.push('fecha a mais na linha ' + linha);
      else pilha.pop();
    }
  }
  pilha.forEach(function (l) { erros.push('abre sem fechar na linha ' + l); });
  return { ok: !erros.length, erros: erros };
}

module.exports = { conferirCSS: conferirCSS };
