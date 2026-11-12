/* =====================================================================
   O LEITOR DO AVISO DA MARINHA
   Em 12/11/2026 dois avisos reais caíram em "não entendi": um deles era
   "ENTRE LAGUNA/SC E ARRAIAL DO CABO/RJ — VENTO FORÇA 7/8", e Pontal do
   Paraná fica no meio desse trecho. O app ficou cego para um aviso que
   alcançava a B12.
   Este teste roda a lógica do arquivo que vai para o servidor, com avisos
   escritos como a Marinha escreve. Se alguém mexer e a B12 sair de um
   trecho que a cobre, o teste quebra.
   ===================================================================== */
const fs = require('fs');
const ts = fs.readFileSync(__dirname + '/../nuvem/funcoes/marinha/index.ts', 'utf8');

/* tira só as anotações de tipo — o resto do arquivo é JavaScript puro.
   A lista é fechada de propósito: tipo novo no arquivo faz o teste gritar
   em vez de passar lendo código pela metade. */
const TIPOS = [
  /:\s*Record<string,\s*\[number,\s*number\]>/g,
  /:\s*Record<string,\s*number>/g,
  /:\s*\{ de: number; ate: number; via: string \} \| null/g,
  /:\s*number\s*\|\s*null/g,
  /:\s*number\[\]\[\]/g,
  /:\s*string\[\]/g,
  /:\s*any\[\]/g,
  /:\s*(?:string|number|any|unknown)\b/g,
];
let js = ts
  .replace(/^const FONTE[\s\S]*?(?=const B12 =)/m, '')
  .replace(/const cors = \{[\s\S]*?\n\};/, '')
  .replace(/const resposta =[\s\S]*?\n\n/, '\n')
  .replace(/Deno\.serve\([\s\S]*$/m, '')
  .replace(/\bas any\b/g, '');
TIPOS.forEach((re) => { js = js.replace(re, ''); });
if (/:\s*(Record<|string\b|number\b|any\b|unknown\b)/.test(js)) {
  console.log('FALHOU  sobrou anotação de tipo que o teste não sabe tirar ✗');
  process.exit(1);
}

const caixa = {};
new Function('caixa', js + '\n;caixa.alcancaAB12=alcancaAB12;caixa.faixaDaReferencia=faixaDaReferencia;' +
  'caixa.lerAvisos=lerAvisos;caixa.B12=B12;caixa.COSTA=COSTA;caixa.ESTADO=ESTADO;caixa.paginaConfere=paginaConfere;caixa.semAcento=semAcento;')(caixa);

let ok = 0, falhou = 0;
function t(nome, cond) {
  if (cond) { ok++; console.log('ok   ' + nome + ' ✓'); }
  else { falhou++; console.log('FALHOU  ' + nome + ' ✗'); }
}

/* --- 1. os dois avisos de 12/11/2026 que estavam quebrando --- */
const aviso797 = { texto: 'ÁREA COSTEIRA ENTRE LAGUNA/SC E ARRAIAL DO CABO/RJ ATÉ 120MN DA COSTA, ' +
  'VENTO DE SW 25/33KT, RAJADAS. VÁLIDO ATÉ 131200Z.' };
const aviso802 = { texto: 'ÁREA COSTEIRA ENTRE ARRAIAL DO CABO/RJ E SÃO MATEUS/ES ATÉ 320MN DA COSTA, ' +
  'VENTO DE SW 25/33KT. VÁLIDO ATÉ 131200Z.' };
const r797 = caixa.alcancaAB12(aviso797), r802 = caixa.alcancaAB12(aviso802);
t('aviso 797 (Laguna/SC a Arraial do Cabo/RJ) ALCANÇA a B12', r797.pega === true);
t('aviso 797 não cai mais em "não entendi"', r797.pega !== null);
t('aviso 802 (Arraial do Cabo a São Mateus/ES) fica FORA', r802.pega === false);

/* --- 2. a rede do estado: cidade que não existe na tabela --- */
const f = caixa.faixaDaReferencia('BARRA VELHA/SC');
t('cidade desconhecida cai no estado do /UF', !!f && f.via === 'estado SC');
const inventado = caixa.alcancaAB12({ texto:
  'ÁREA COSTEIRA ENTRE BARRA VELHA/SC E MATINHOS/PR ATÉ 100MN DA COSTA, VENTO FORÇA 8. VÁLIDO ATÉ 131200Z.' });
t('trecho com DUAS cidades desconhecidas ainda alcança a B12', inventado.pega === true);
t('e avisa que foi pelo estado', /estado/.test(inventado.por));

/* --- 3. um trecho longe de verdade continua fora --- */
t('trecho no Nordeste (Recife a Natal) fica fora',
  caixa.alcancaAB12({ texto: 'ÁREA COSTEIRA ENTRE RECIFE/PE E NATAL/RN ATÉ 80MN DA COSTA. VÁLIDO ATÉ 131200Z.' }).pega === false);
t('trecho só no Rio Grande do Sul fica fora',
  caixa.alcancaAB12({ texto: 'ÁREA COSTEIRA ENTRE CHUI/RS E TRAMANDAI/RS ATÉ 80MN DA COSTA. VÁLIDO ATÉ 131200Z.' }).pega === false);

/* --- 4. as outras formas de escrever o trecho --- */
t('"AO SUL DE SANTOS/SP" alcança a B12',
  caixa.alcancaAB12({ texto: 'ÁREA COSTEIRA AO SUL DE SANTOS/SP ATÉ 100MN DA COSTA. VÁLIDO ATÉ 131200Z.' }).pega === true);
t('"AO NORTE DE SANTOS/SP" NÃO alcança a B12',
  caixa.alcancaAB12({ texto: 'ÁREA COSTEIRA AO NORTE DE SANTOS/SP ATÉ 100MN DA COSTA. VÁLIDO ATÉ 131200Z.' }).pega === false);
t('"DE ITAJAI/SC A SANTOS/SP" alcança a B12',
  caixa.alcancaAB12({ texto: 'ÁREA COSTEIRA DE ITAJAI/SC A SANTOS/SP ATÉ 100MN DA COSTA. VÁLIDO ATÉ 131200Z.' }).pega === true);

/* --- 5. a folga das bordas: Paranaguá fica 5 km ao norte da B12 --- */
t('aviso que termina em Paranaguá ainda cobre a B12 (folga de 33 km)',
  caixa.alcancaAB12({ texto: 'ÁREA COSTEIRA ENTRE SANTOS/SP E PARANAGUA/PR ATÉ 100MN DA COSTA. VÁLIDO ATÉ 131200Z.' }).pega === true);

/* --- 6. A REGRA QUE NÃO SE NEGOCIA: nunca inventar "tudo bem" --- */
t('aviso ilegível vira DÚVIDA, nunca "não pega"',
  caixa.alcancaAB12({ texto: 'ÁREA COSTEIRA CONFORME CARTA ANEXA. VÁLIDO ATÉ 131200Z.' }).pega === null);
t('área oceânica sem coordenadas vira DÚVIDA',
  caixa.alcancaAB12({ texto: 'ÁREA OCEÂNICA ALFA. VÁLIDO ATÉ 131200Z.' }).pega === null);

/* --- 7. área oceânica por coordenadas --- */
t('polígono oceânico em volta da B12 pega',
  caixa.alcancaAB12({ texto: 'ÁREA OCEÂNICA DELIMITADA POR 24.0S050.0W 24.0S046.0W 27.0S046.0W 27.0S050.0W. VÁLIDO ATÉ 131200Z.' }).pega === true);
t('polígono oceânico no Nordeste não pega',
  caixa.alcancaAB12({ texto: 'ÁREA OCEÂNICA DELIMITADA POR 05.0S035.0W 05.0S032.0W 08.0S032.0W 08.0S035.0W. VÁLIDO ATÉ 131200Z.' }).pega === false);

/* --- 8. a tabela da costa está em ordem e cobre o país --- */
const lats = Object.values(caixa.COSTA);
t('a tabela vai do Chuí (-33,7) ao Oiapoque (+4,4)', Math.min(...lats) < -33 && Math.max(...lats) > 4);
t('todo estado da costa tem faixa', Object.keys(caixa.ESTADO).length === 17);
t('a faixa do Paraná contém a B12',
  caixa.B12.lat >= caixa.ESTADO.PR[0] && caixa.B12.lat <= caixa.ESTADO.PR[1]);

/* --- 9. o separador de avisos: o mesmo aviso não pode contar duas vezes --- */
const html = '<p>AVISO NR 797/2026</p><p>AVISO DE VENTO FORTE EMITIDO EM 121200Z</p>' +
  '<p>ÁREA COSTEIRA ENTRE LAGUNA/SC E ARRAIAL DO CABO/RJ.</p><p>VÁLIDO ATÉ 131200Z.</p>' +
  '<p>AVISO NR 797/2026</p><p>AVISO DE VENTO FORTE EMITIDO EM 121200Z</p>' +
  '<p>ÁREA COSTEIRA ENTRE LAGUNA/SC E ARRAIAL DO CABO/RJ.</p><p>VÁLIDO ATÉ 131200Z.</p>';
const lidos = caixa.lerAvisos(html);
t('o site repete o aviso em cada área; conta uma vez só', lidos.length === 1);
t('leu o tipo do aviso', lidos.length === 1 && /VENTO FORTE/.test(lidos[0].tipo));

/* --- 10. pagina vazia nao pode virar "nenhum aviso" --- */
const paginaConfere = caixa.paginaConfere;
t('pagina de desafio (curta) NAO passa', paginaConfere('<html>Just a moment...</html>') === false);
t('pagina grande mas SEM o esqueleto do mapa NAO passa',
  paginaConfere('<html>' + 'x'.repeat(400000) + 'AVISOS DE MAU TEMPO</html>') === false);
t('pagina com o esqueleto mas CURTA demais NAO passa',
  paginaConfere('<html>' + 'METAREA '.repeat(50) + '</html>') === false);
t('pagina de verdade passa',
  paginaConfere('<html>' + 'x'.repeat(400000) + 'METAREA '.repeat(20) + '</html>') === true);
/* dia legitimo sem aviso nenhum NAO pode virar "incerto" */
t('pagina inteira e sem aviso nenhum continua passando',
  paginaConfere(fs.readFileSync(__dirname + '/amostras/chm-12-11-2026.html', 'utf8')
    .split('AVISO NR').join('AVISO XX')) === true);

/* --- 11. a pagina de hoje, inteira, lida de ponta a ponta --- */
const amostra = __dirname + '/amostras/chm-12-11-2026.html';
if (fs.existsSync(amostra)) {
  const reais = caixa.lerAvisos(fs.readFileSync(amostra, 'utf8'));
  t('a pagina real de 12/11/2026 rende 7 avisos', reais.length === 7);
  const classif = reais.map((a) => caixa.alcancaAB12(a));
  t('nenhum aviso real cai em "nao entendi"', classif.every((c) => c.pega !== null));
  t('exatamente um aviso real alcanca a B12 (o 797)',
    classif.filter((c) => c.pega === true).length === 1);
  const i797 = reais.findIndex((a) => a.nr === '797');
  t('e o que alcanca e mesmo o 797', i797 >= 0 && classif[i797].pega === true);
}

console.log('\n' + ok + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
