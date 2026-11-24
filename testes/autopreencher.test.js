/* ============================================================================
   O NOME DELE NO CAMPO ERRADO

   24/11/2026. Ele mandou um retrato da tela "Nova mensagem" com
   "Eugenio Teixeira Fim" escrito no campo NOME DA MENSAGEM, e disse: "revisa
   esse APP tá tudo zoado".

   Não era a tela de mensagem. Era uma linha que faltava no gerador de campos
   que o app inteiro usa: nenhum campo dizia `autocomplete`. O navegador então
   olhava o nome técnico — nome, email, cpf, cidade, whats — reconhecia como
   ficha de pessoa, e oferecia os dados guardados do DONO DO APARELHO.

   No balcão isso grava o nome errado no cadastro de quem está viajando, num
   tablet que passa de mão em mão. É o pior tipo de defeito: silencioso, e
   quem vê acha que o app é ruim em vez de achar que tem um bug.

   O avesso disso também importa: no celular DO TURISTA, preenchendo a
   PRÓPRIA ficha, o automático ajuda — e ali a correção é dar o nome certo
   para vir o dado certo, não desligar.
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
const adm = fs.readFileSync(path.join(raiz, 'adm.js'), 'utf8');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

console.log('\n— no balcão, desligado em tudo —');
eh('existe uma trava única, não copiada campo a campo', /var SEM_AUTO = ' autocomplete="off"/.test(form));
eh('todo campo de texto nasce com ela', /\(opc\.auto \? ' autocomplete="' \+ opc\.auto \+ '"' : SEM_AUTO\)/.test(form));
eh('as listas também', /name="' \+ nome \+ '"' \+ SEM_AUTO \+ '>/.test(form.replace(/\\/g,'')) ||
  /'" name="' \+ nome \+ '"' \+ SEM_AUTO/.test(form));
eh('o formulário inteiro também diz off',
  /<form class="folha-cx" novalidate autocomplete="off">/.test(form),
  'alguns navegadores só olham o form, não o campo');
eh('e os gerenciadores de senha são avisados de ficar fora',
  /data-lpignore="true"/.test(form) && /data-1p-ignore/.test(form));

console.log('\n— nenhum campo de texto longo ficou de fora —');
const soltos = (adm + form).split('<textarea').slice(1)
  .filter(t => !/SEM_AUTO/.test(t.slice(0, 40)) && !/autocomplete/.test(t.slice(0, 120)));
eh('todos os textarea travados', soltos.length === 0,
  soltos.length ? soltos.map(t => t.slice(0, 50)).join(' | ') : '');

console.log('\n— a trava precisa estar carregada antes de desenhar —');
eh('SEM_AUTO é exportado no B12, não é variável de arquivo',
  /B12\.SEM_AUTO = SEM_AUTO;/.test(form));
eh('e o formularios.js entra antes do adm.js',
  html.indexOf('formularios.js') < html.indexOf('adm.js'),
  'sem isso B12.SEM_AUTO seria undefined no painel');

console.log('\n— no celular do turista, ligado e apontando certo —');
eh('o nome dele pede o nome dele', /id="f-nome" autocomplete="name"/.test(html));
eh('o WhatsApp pede telefone', /id="f-zap" autocomplete="tel"/.test(html));
eh('o e-mail pede e-mail', /id="f-email" autocomplete="email"/.test(html));
eh('o Instagram não pede nada — não existe campo de ficha para isso',
  /id="f-insta" autocomplete="off"/.test(html));
eh('a placa também não', /id="f-placa" autocomplete="off"/.test(html),
  'o navegador oferecia endereço no campo da placa');

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
