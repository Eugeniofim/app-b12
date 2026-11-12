// =====================================================================
// Estação B12 — AVISO DE MAU TEMPO DA MARINHA
//
// Para quem leva passageiro no mar, previsão de modelo é informação; o que
// MANDA é o aviso do Centro de Hidrografia da Marinha (CHM), responsável
// pela METAREA V, que cobre a costa do Paraná.
//
// O CHM não tem API: é um site. Quem lê é esta função, no servidor — do
// navegador não dá (CORS e Cloudflare). Ela faz três coisas:
//   1. baixa a página de avisos;
//   2. separa aviso por aviso (o site repete o mesmo aviso em cada área do
//      mapa, então o número do aviso é a chave e vale uma vez só);
//   3. decide, de cada um, se a área alcança a B12.
//
// REGRAS QUE NÃO SE NEGOCIAM:
// - Se não der para entender um aviso, ele é devolvido como DESCONHECIDO,
//   nunca como "não pega". Um leitor que erra para o lado de dizer "está
//   tudo bem" é pior do que leitor nenhum.
// - Esta função NUNCA diz que dá para navegar. Ela mostra o que a Marinha
//   publicou e o link do original. Quem decide sair é o comandante.
// =====================================================================
const FONTE = 'https://www.marinha.mil.br/chm/dados-do-smm-avisos-de-mau-tempo/avisos-de-mau-tempo';
const B12 = { lat: -25.566233, lon: -48.356609 };

/* Uma folga de 0,3° (~33 km) nas bordas dos avisos costeiros. A B12 fica 5 km
   ao sul de Paranaguá: sem a folga, um aviso "entre Santos e Paranaguá"
   daria "fora" por 0,05 grau. Erra para o lado de avisar a mais. */
const FOLGA = 0.3;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const resposta = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

/* Referências que a Marinha usa nos avisos COSTEIROS, com a latitude de cada
   uma, do sul para o norte. É o que permite responder "este aviso alcança
   Pontal do Paraná?" sem adivinhar. */
/* 12/11/2026 — a tabela ficou incompleta e quase custou caro.
   Dois avisos vieram com ARRAIAL DO CABO/RJ e SÃO MATEUS/ES, que não
   estavam aqui. Um deles era "ENTRE LAGUNA/SC E ARRAIAL DO CABO/RJ, VENTO
   FORÇA 7/8" — e Pontal do Paraná fica BEM NO MEIO desse trecho. O app não
   soube dizer que o aviso alcançava a B12.

   A regra de segurança salvou (mostrou "confira no site oficial" em vez de
   dizer que estava tudo bem), mas lista de cidade feita a mão vai ficar
   incompleta de novo — a Marinha escolhe a referência que quiser.

   Por isso agora são DUAS redes, e a segunda não tem buraco:
     1ª  a cidade, quando está na tabela abaixo (resposta precisa);
     2ª  o ESTADO do /UF que a Marinha SEMPRE escreve junto (tabela ESTADO).
   Se a cidade é desconhecida, o trecho de costa daquele estado serve de
   limite. Fica mais largo, ou seja, avisa a mais — que é o lado certo de
   errar quando se leva gente no mar. */
const COSTA: Record<string, number> = {
  'CHUI': -33.69, 'RIO GRANDE': -32.03, 'MOSTARDAS': -31.11, 'TRAMANDAI': -29.98,
  'TORRES': -29.33, 'ARARANGUA': -28.93, 'CABO DE SANTA MARTA': -28.60,
  'LAGUNA': -28.48, 'IMBITUBA': -28.24, 'FLORIANOPOLIS': -27.59,
  'ITAJAI': -26.91, 'SAO FRANCISCO DO SUL': -26.24, 'PARANAGUA': -25.52,
  'CANANEIA': -25.01, 'IGUAPE': -24.71, 'SANTOS': -23.96,
  'SAO SEBASTIAO': -23.80, 'UBATUBA': -23.43, 'PARATY': -23.22,
  'ANGRA DOS REIS': -23.01, 'ARRAIAL DO CABO': -22.97, 'RIO DE JANEIRO': -22.90,
  'CABO FRIO': -22.88, 'MACAE': -22.37, 'CABO DE SAO TOME': -22.04,
  'CAMPOS': -21.76, 'VITORIA': -20.32, 'BARRA DO RIACHO': -19.84,
  'SAO MATEUS': -18.72, 'CONCEICAO DA BARRA': -18.59, 'CARAVELAS': -17.73,
  'ABROLHOS': -17.96, 'PORTO SEGURO': -16.44, 'ILHEUS': -14.79,
  'VALENCA': -13.37, 'SALVADOR': -12.97, 'ARACAJU': -10.91, 'MACEIO': -9.67,
  'RECIFE': -8.05, 'CABO DE SANTO AGOSTINHO': -8.30, 'JOAO PESSOA': -7.12,
  'CABEDELO': -6.97, 'NATAL': -5.79, 'CABO CALCANHAR': -5.16,
  'MACAU': -5.11, 'FORTALEZA': -3.73, 'CAMOCIM': -2.90, 'PARNAIBA': -2.90,
  'SAO LUIS': -2.53, 'TUTOIA': -2.76, 'BELEM': -1.46, 'SALINOPOLIS': -0.61,
  'CABO NORTE': 1.80, 'CABO ORANGE': 4.40, 'OIAPOQUE': 3.84,
};

/* Trecho de litoral de cada estado da costa, do sul para o norte, em graus.
   Usado só quando a cidade do aviso não está na tabela acima. Propositalmente
   um pouco generoso nas pontas: largura a mais vira aviso a mais, nunca
   aviso a menos. */
const ESTADO: Record<string, [number, number]> = {
  RS: [-33.75, -29.30], SC: [-29.40, -25.90], PR: [-26.00, -25.15],
  SP: [-25.40, -23.30], RJ: [-23.45, -20.70], ES: [-21.35, -17.85],
  BA: [-18.40, -8.50],  SE: [-11.60, -10.90], AL: [-10.55, -8.80],
  PE: [-9.05, -7.50],   PB: [-7.55, -6.25],   RN: [-6.40, -4.80],
  CE: [-4.95, -2.70],   PI: [-3.10, -2.70],   MA: [-3.05, -0.85],
  PA: [-1.85, 0.05],    AP: [-0.10, 4.50],
};

function semAcento(s: string) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}
/* Devolve a FAIXA de latitude que a referência cobre, e por qual das duas
   redes ela foi achada. Cidade vira faixa de largura zero. */
function faixaDaReferencia(txt: string): { de: number; ate: number; via: string } | null {
  const bruto = semAcento(txt);
  const uf = (bruto.match(/\/([A-Z]{2})\b/) || [, ''])[1];
  const alvo = bruto.replace(/\/[A-Z]{2}\b/g, '').trim();

  /* 1ª rede: a cidade. Vence o nome mais longo, para "CABO DE SAO TOME" não
     perder para "SAO TOME" nem "RIO GRANDE" para "RIO". */
  let achou: number | null = null, maior = 0;
  for (const nome in COSTA) {
    if (alvo.includes(nome) && nome.length > maior) { achou = COSTA[nome]; maior = nome.length; }
  }
  if (achou != null) return { de: achou, ate: achou, via: 'cidade' };

  /* 2ª rede: o estado do /UF. */
  if (uf && ESTADO[uf]) return { de: ESTADO[uf][0], ate: ESTADO[uf][1], via: 'estado ' + uf };
  return null;
}

/* ponto dentro do polígono (ray casting) — para as áreas OCEÂNICAS */
function dentroDoPoligono(lat: number, lon: number, pts: number[][]) {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [yi, xi] = pts[i], [yj, xj] = pts[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
function coordenadas(txt: string) {
  const re = /(\d{1,2}(?:\.\d+)?)\s*([NS])\s*(\d{1,3}(?:\.\d+)?)\s*([EW])/g;
  const pts: number[][] = []; let m;
  while ((m = re.exec(txt))) {
    pts.push([(m[2] === 'S' ? -1 : 1) * parseFloat(m[1]),
              (m[4] === 'W' ? -1 : 1) * parseFloat(m[3])]);
  }
  return pts;
}

function lerAvisos(html: string) {
  let t = html.replace(/<script[\s\S]*?<\/script>/g, ' ')
              .replace(/<style[\s\S]*?<\/style>/g, ' ')
              .replace(/<[^>]+>/g, '\n');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
       .replace(/\n\s*\n+/g, '\n').replace(/[ \t]+/g, ' ');
  const linhas = t.split('\n').map((s) => s.trim()).filter(Boolean);

  const vistos: Record<string, number> = {};
  const avisos: any[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(/^AVISO NR (\d+)\/(\d{4})$/);
    if (!m || vistos[m[1]]) continue;
    /* monta o texto até o "VÁLIDO ATÉ ...Z" que fecha o aviso: pegar um
       número fixo de linhas corta avisos longos pela metade */
    const partes: string[] = [];
    for (let j = i + 1; j < Math.min(i + 25, linhas.length); j++) {
      if (/^AVISO NR \d+\/\d{4}$/.test(linhas[j])) break;
      partes.push(linhas[j]);
      if (/VÁLIDO ATÉ .*Z\.?$/i.test(linhas[j])) break;
    }
    const bloco = partes.join(' ');
    if (!/VÁLIDO ATÉ/i.test(bloco)) continue;
    vistos[m[1]] = 1;
    const tipo = (bloco.match(/^AVISO DE ([A-ZÁÉÍÓÚÂÊÔÃÕÇ\/ ]+?)\s+EMITIDO/) || [, ''])[1].trim();
    /* NÃO cortar o cabeçalho com regex guloso: "[^.]*" engole até o primeiro
       ponto, e as coordenadas têm ponto decimal ("34.8S051W") */
    const iArea = bloco.search(/ÁREA (OCEÂNICA|COSTEIRA|SUBÁREA)/i);
    avisos.push({
      nr: m[1], ano: m[2], tipo,
      texto: (iArea >= 0 ? bloco.slice(iArea) : bloco).trim(),
      ate: (bloco.match(/VÁLIDO ATÉ (\d{6})Z/i) || [, ''])[1],
    });
  }
  return avisos;
}

function alcancaAB12(a: any) {
  const T = semAcento(a.texto);
  if (T.includes('AREA OCEANICA') || T.includes('SUBAREA')) {
    const pts = coordenadas(a.texto);
    if (pts.length < 3) return { pega: null, por: 'coordenadas ilegíveis' };
    return { pega: dentroDoPoligono(B12.lat, B12.lon, pts), por: 'área oceânica' };
  }

  /* A Marinha escreve o trecho de três jeitos. Os três entram aqui. */
  const corta = '(?: ATE| A PARTIR| ATÉ|\\.|,|$)';
  const doisPontos = T.match(new RegExp('ENTRE ([A-Z\\/ ]+?) E ([A-Z\\/ ]+?)' + corta))
                  || T.match(new RegExp('\\bDE ([A-Z\\/ ]+?) A(?:TE)? ([A-Z\\/ ]+?)' + corta));
  if (doisPontos) {
    const f1 = faixaDaReferencia(doisPontos[1]), f2 = faixaDaReferencia(doisPontos[2]);
    if (!f1 || !f2) return { pega: null, por: 'referência fora da lista' };
    const lo = Math.min(f1.de, f1.ate, f2.de, f2.ate) - FOLGA;
    const hi = Math.max(f1.de, f1.ate, f2.de, f2.ate) + FOLGA;
    const via = f1.via === 'cidade' && f2.via === 'cidade'
      ? 'área costeira' : 'área costeira (pelo estado, a cidade não estava na lista)';
    return { pega: B12.lat >= lo && B12.lat <= hi, por: via };
  }

  /* "AO SUL DE X" / "AO NORTE DE X": meia-reta, não trecho. */
  const meia = T.match(new RegExp('AO (SUL|NORTE) DE ([A-Z\\/ ]+?)' + corta));
  if (meia) {
    const f = faixaDaReferencia(meia[2]);
    if (!f) return { pega: null, por: 'referência fora da lista' };
    const pega = meia[1] === 'SUL'
      ? B12.lat <= Math.max(f.de, f.ate) + FOLGA
      : B12.lat >= Math.min(f.de, f.ate) - FOLGA;
    return { pega, por: 'ao ' + meia[1].toLowerCase() + ' de uma referência' };
  }

  return { pega: null, por: 'formato não reconhecido' };
}

/* A página da Marinha às vezes volta vazia (bloqueio por IP, manutenção,
   página de desafio). Nesse caso ela responde 200 com HTML que não tem
   aviso nenhum — e "nenhum aviso" é exatamente a mentira perigosa que o
   cabeçalho deste arquivo proíbe: existem 8 avisos no ar e o app diria
   que está tudo limpo.

   Então, antes de acreditar num resultado vazio, a função confere se a
   página é mesmo a página de avisos. Se não for, ela devolve INCERTO, e o
   app mostra "confira o aviso no site da Marinha" em vez de silêncio. */
function medir(html: string) {
  const T = semAcento(html);
  let metarea = 0, i = -1;
  while ((i = T.indexOf('METAREA', i + 1)) >= 0) metarea++;
  let avisos = 0; i = -1;
  while ((i = T.indexOf('AVISO NR', i + 1)) >= 0) avisos++;
  return { tam: html.length, metarea, avisos };
}

/* A página da Marinha às vezes volta pela metade (bloqueio por IP, Cloudflare,
   manutenção). Quando isso acontece ela responde 200 com um HTML que tem o
   TÍTULO da página mas nenhum aviso dentro — e "nenhum aviso" é exatamente a
   mentira perigosa que o cabeçalho deste arquivo proíbe: pode haver 8 avisos
   no ar, um deles alcançando a B12, e o app dizer que está tudo limpo.

   Por isso a conferência não olha o título. Ela olha o ESQUELETO da página:
   a página inteira tem ~2,6 MB e repete "METAREA" mais de cem vezes, porque
   é o mapa de áreas. Meia página não tem isso. Assim, dia sem aviso nenhum
   (legítimo) continua passando, e página capada vira INCERTO. */
function paginaConfere(html: string) {
  const m = medir(html);
  return m.tam >= 300000 && m.metarea >= 10;
}

async function baixar() {
  /* três tentativas: o CHM recusa de vez em quando e acerta na seguinte */
  let ultimo = { tam: 0, metarea: 0, avisos: 0 }, porque = '';
  for (let n = 0; n < 3; n++) {
    try {
      const r = await fetch(FONTE, {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) { porque = 'a Marinha respondeu ' + r.status; }
      else {
        const html = await r.text();
        ultimo = medir(html);
        if (paginaConfere(html)) return { html, medida: ultimo };
        porque = 'a página veio pela metade';
      }
    } catch (e) {
      porque = String((e as any)?.message || e);
    }
    if (n < 2) await new Promise((f) => setTimeout(f, 1500));
  }
  return { erro: porque || 'não consegui abrir a página', medida: ultimo };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const got = await baixar();
    if (!got.html) {
      /* INCERTO, nunca "tudo bem": o app mostra o cartão de conferir no site */
      return resposta({ ok: false, incerto: true,
        erro: 'Não consegui ler o aviso da Marinha agora.',
        detalhe: got.erro, medida: got.medida,
        fonte: FONTE, em: new Date().toISOString() }, 200);
    }
    const todos = lerAvisos(got.html);
    const aqui: any[] = [], duvida: any[] = [];
    for (const a of todos) {
      const c = alcancaAB12(a);
      if (c.pega === true) aqui.push({ ...a, por: c.por });
      else if (c.pega === null) duvida.push({ ...a, por: c.por });
    }
    return resposta({
      ok: true, lidos: todos.length, medida: got.medida,
      /* o que alcança a B12 */
      aqui,
      /* o que o leitor NÃO entendeu: aparece como dúvida, nunca como "tudo bem" */
      duvida,
      fonte: FONTE,
      em: new Date().toISOString(),
    });
  } catch (e) {
    return resposta({ ok: false, incerto: true,
      erro: 'Não consegui ler o aviso da Marinha agora.', fonte: FONTE,
      detalhe: String((e as any)?.message || e) }, 200);
  }
});
