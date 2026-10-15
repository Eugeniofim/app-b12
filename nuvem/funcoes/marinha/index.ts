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
const COSTA: Record<string, number> = {
  'CHUI': -33.69, 'RIO GRANDE': -32.03, 'MOSTARDAS': -31.11, 'TRAMANDAI': -29.98,
  'TORRES': -29.33, 'ARARANGUA': -28.93, 'CABO DE SANTA MARTA': -28.60,
  'LAGUNA': -28.48, 'FLORIANOPOLIS': -27.59, 'ITAJAI': -26.91,
  'SAO FRANCISCO DO SUL': -26.24, 'PARANAGUA': -25.52, 'CANANEIA': -25.01,
  'SANTOS': -23.96, 'SAO SEBASTIAO': -23.80, 'UBATUBA': -23.43,
  'ANGRA DOS REIS': -23.01, 'RIO DE JANEIRO': -22.90, 'CABO FRIO': -22.88,
  'MACAE': -22.37, 'CABO DE SAO TOME': -22.04, 'VITORIA': -20.32,
  'CARAVELAS': -17.73, 'ILHEUS': -14.79, 'SALVADOR': -12.97, 'ARACAJU': -10.91,
  'MACEIO': -9.67, 'RECIFE': -8.05, 'NATAL': -5.79, 'FORTALEZA': -3.73,
  'SAO LUIS': -2.53, 'BELEM': -1.46, 'OIAPOQUE': 3.84,
};

function semAcento(s: string) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}
function latDaReferencia(txt: string) {
  const alvo = semAcento(txt).replace(/\/[A-Z]{2}\b/g, '').trim();
  let achou: number | null = null, maior = 0;
  for (const nome in COSTA) {
    if (alvo.includes(nome) && nome.length > maior) { achou = COSTA[nome]; maior = nome.length; }
  }
  return achou;
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
  const mm = T.match(/ENTRE ([A-Z\/ ]+?) E ([A-Z\/ ]+?)(?: ATE| A PARTIR|\.|,)/);
  if (mm) {
    const a1 = latDaReferencia(mm[1]), a2 = latDaReferencia(mm[2]);
    if (a1 == null || a2 == null) return { pega: null, por: 'referência fora da lista' };
    const lo = Math.min(a1, a2) - FOLGA, hi = Math.max(a1, a2) + FOLGA;
    return { pega: B12.lat >= lo && B12.lat <= hi, por: 'área costeira' };
  }
  return { pega: null, por: 'formato não reconhecido' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const r = await fetch(FONTE, {
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return resposta({ erro: 'A Marinha não respondeu (' + r.status + ').', fonte: FONTE }, 502);
    const html = await r.text();
    const todos = lerAvisos(html);
    const aqui: any[] = [], duvida: any[] = [];
    for (const a of todos) {
      const c = alcancaAB12(a);
      if (c.pega === true) aqui.push({ ...a, por: c.por });
      else if (c.pega === null) duvida.push({ ...a, por: c.por });
    }
    return resposta({
      ok: true, lidos: todos.length,
      /* o que alcança a B12 */
      aqui,
      /* o que o leitor NÃO entendeu: aparece como dúvida, nunca como "tudo bem" */
      duvida,
      fonte: FONTE,
      em: new Date().toISOString(),
    });
  } catch (e) {
    return resposta({ erro: 'Não consegui ler o aviso da Marinha agora.', fonte: FONTE,
                      detalhe: String((e as any)?.message || e) }, 502);
  }
});
