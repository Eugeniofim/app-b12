/* ============================================================================
   A BARRA DE CIMA E O TUTORIAL

   12/11/2026, pedido do Eugênio na véspera da entrega:
   - "visao geral vai estar dentro de ESTACAO (ponha como estacao B12)"
   - "vamos deixar só os menus essenciais do dia a dia"
   - "tire o tutorial"

   O tutorial se oferecia sozinho na primeira visita a cada aba e pulava na
   frente de quem está trabalhando. Sai o automático; o botão "?" do topo
   continua, para quem quiser chamar.
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
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

/* recorta o array GRUPOS e roda, para ler a estrutura de verdade */
const i = adm.indexOf('var GRUPOS = [');
const fim = adm.indexOf('];', i) + 2;
const GRUPOS = new Function(adm.slice(i, fim) + ' return GRUPOS;')();

const topo = GRUPOS.map(g => g.nome);
const estacao = GRUPOS.filter(g => g.id === 'estacao')[0];
const subs = (g) => (g ? g.sub.map(s => s[1]) : []);

console.log('\n— a Visão geral mudou de casa —');
eh('não existe mais grupo "Visão geral" na barra de cima',
  !topo.includes('Visão geral'), topo.join(' · '));
eh('o grupo da Estação se chama "Estação B12"',
  !!estacao && estacao.nome === 'Estação B12', estacao && estacao.nome);
eh('e a Visão geral está dentro dele',
  subs(estacao).includes('Visão geral'), subs(estacao).join(' · '));
eh('é a PRIMEIRA sub-aba da Estação B12',
  subs(estacao)[0] === 'Visão geral', subs(estacao)[0]);

console.log('\n— nada foi perdido no caminho —');
['visao', 'vtravessia', 'vpatio'].forEach(function (id) {
  eh('a página "' + id + '" continua alcançável',
    GRUPOS.some(g => g.sub.some(s => s[0] === id)));
});
['gestao','sobre','manut','oper','dados','intel','ia'].forEach(function (id) {
  eh('"' + id + '" continua na Estação B12',
    estacao.sub.some(s => s[0] === id));
});
eh('a Estação B12 continua trancada para a equipe',
  estacao.so === 'dono');

console.log('\n— a barra de cima é o dia a dia —');
['Hoje', 'Cadastro', 'Horário de travessia'].forEach(function (n) {
  eh('"' + n + '" continua em cima, à mão', topo.includes(n));
});
eh('nenhum id de grupo aparece duas vezes',
  new Set(GRUPOS.map(g => g.id)).size === GRUPOS.length);
eh('nenhuma sub-aba aparece em dois grupos',
  (function () {
    const todas = GRUPOS.flatMap(g => g.sub.map(s => s[0]));
    return new Set(todas).size === todas.length;
  })());

console.log('\n— o tutorial não pula mais na frente —');
eh('ninguém mais chama tutTalvez (a oferta automática)',
  !/tutTalvez/.test(adm), 'a oferta automática voltou');
eh('mas o botão "?" continua no topo, para quem quiser',
  /id="b-tutorial"/.test(html));
eh('e o tutorial continua carregado',
  /tutorial\.js/.test(html));

/* ------------------------------ o pátio mudou de casa (12/11/2026)
   "Tirar o pátio de horário de travessia e colocar dentro de cadastro. E no
   cadastro criar duas sub-abas: náutico e estacionamento." No balcão a pessoa
   chega e o atendente cadastra duas coisas: a travessia e o carro. É o mesmo
   momento. Horário de travessia volta a ser só a escala da lancha. */
console.log('\n— o pátio foi para o Cadastro —');

const cadastro = GRUPOS.filter(g => g.id === 'balcao')[0];
const travessia = GRUPOS.filter(g => g.id === 'travessia')[0];

eh('o Cadastro abre com Náutico e Estacionamento',
  subs(cadastro)[0] === 'Náutico' && subs(cadastro)[1] === 'Estacionamento',
  subs(cadastro).join(' · '));
eh('a primeira é Náutico', subs(cadastro)[0] === 'Náutico', subs(cadastro)[0]);
eh('a segunda é Estacionamento', subs(cadastro)[1] === 'Estacionamento', subs(cadastro)[1]);
eh('a ficha do balcão continua sendo a primeira coisa que abre',
  cadastro.sub[0][0] === 'balcao');
eh('a página do pátio agora mora no Cadastro',
  cadastro.sub.some(s => s[0] === 'patio'));
eh('e saiu de Horário de travessia',
  !travessia.sub.some(s => s[0] === 'patio'), subs(travessia).join(' · '));
eh('Horário de travessia ficou só com a escala da lancha',
  subs(travessia).every(x => ['Reservas', 'Ida', 'Volta'].includes(x)),
  subs(travessia).join(' · '));
eh('o Cadastro continua aberto para a equipe, não só para o dono',
  !cadastro.so);

console.log('\n— nenhuma palavra leva a duas telas diferentes —');
const rotulos = GRUPOS.flatMap(g => g.sub.map(s => s[1]));
eh('nenhum rótulo de sub-aba se repete no app inteiro',
  new Set(rotulos).size === rotulos.length,
  rotulos.filter((r, i) => rotulos.indexOf(r) !== i).join(', '));
eh('a tela de números do pátio se chama outra coisa',
  subs(estacao).includes('Estacionamento em números'));
eh('e a de travessias também',
  subs(estacao).includes('Travessias em números'));

/* ------------------------- Clientes entra no Cadastro (12/11/2026)
   "Isso tá redundante, pois no cadastro já tem essa ficha pra preencher.
   Ponha os clientes em sub-aba ali do lado de estacionamento e náutico."

   O botão "Só o contato" do balcão abria a MESMA folha de ficha que o
   "+ Cadastrar cliente" da aba Clientes. Dois caminhos para a mesma tela,
   agora na mesma aba, é só mais uma decisão para quem atende. */
console.log('\n— Clientes é sub-aba do Cadastro —');

eh('Clientes está ao lado de Náutico e Estacionamento',
  subs(cadastro).join('|').startsWith('Náutico|Estacionamento|Clientes'),
  subs(cadastro).join(' · '));
eh('não existe mais grupo "Clientes" na barra de cima',
  !topo.includes('Clientes'), topo.join(' · '));
eh('a barra de cima tem 6 grupos ou menos',
  GRUPOS.length <= 6, GRUPOS.length + ': ' + topo.join(' · '));

['clientes', 'msgs', 'prosp'].forEach(function (id) {
  eh('a página "' + id + '" não ficou órfã',
    GRUPOS.some(g => g.sub.some(s => s[0] === id)));
});
eh('a Prospecção continua só para o dono',
  cadastro.sub.filter(s => s[0] === 'prosp')[0][2] === 'dono');
eh('mas o Cadastro segue aberto para a equipe',
  !cadastro.so);

console.log('\n— sumiu o caminho repetido —');
eh('o botão "Só o contato" saiu do balcão',
  !/b-so-ficha/.test(adm), 'o botão redundante voltou');
eh('e a aba Clientes continua tendo como criar ficha',
  /id="b-novo-cli"/.test(adm) && /\+ Cadastrar cliente/.test(adm));
eh('a ficha do cliente continua existindo para quem já é cliente',
  /B12\.fichaCliente\(/.test(adm));

/* ------------- Marinheiros no Cadastro e "Na Ilha" fundida (12/11/2026) */
console.log('\n— Marinheiros entrou no Cadastro —');
eh('Marinheiros é sub-aba do Cadastro', subs(cadastro).includes('Marinheiros'),
  subs(cadastro).join(' · '));
eh('e saiu de Horário de travessia', !subs(travessia).includes('Marinheiros'));

console.log('\n— "Na Ilha" saiu da tira, mas a tela não foi perdida —');
eh('não existe mais a aba "Na Ilha"',
  !GRUPOS.some(g => g.sub.some(s => s[1] === 'Na Ilha')));
eh('Horário de travessia ficou só com Reservas, Ida e Volta',
  subs(travessia).join('|') === 'Reservas|Ida|Volta', subs(travessia).join(' · '));
eh('a tela de quem está na Ilha continua existindo',
  /function pNaIlha\(raiz\)/.test(adm));
eh('e passou a ser desenhada dentro de Volta',
  /function pVoltaComIlha\(raiz\) \{ pVolta\(raiz\); pNaIlha\(raiz\); \}/.test(adm));
eh('a aba Volta usa a tela com as duas',
  /volta:pVoltaComIlha/.test(adm));
eh('ninguém mais pede a página "ilha" pelo nome',
  !/admDesenhar\('ilha'\)/.test(adm), 'sobrou ponteiro para uma aba que não existe');
eh('os lembretes das 18h apontam para uma aba que existe',
  /na Ilha sem horário de volta', 'Ver', function \(\) \{ B12\.admDesenhar\('volta'\)/.test(adm));

console.log('\n— toda aba continua tendo página —');
(function () {
  const P = adm.slice(adm.indexOf('var PAGINAS'), adm.indexOf('};', adm.indexOf('var PAGINAS')));
  const faltando = GRUPOS.flatMap(g => g.sub.map(s => s[0]))
    .filter(id => !new RegExp('\\b' + id + ':').test(P));
  eh('nenhuma sub-aba aponta para o vazio', faltando.length === 0, faltando.join(', '));
})();

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
