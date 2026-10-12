// ============================================================================
// Estação B12 — o carteiro dos avisos
//
// Roda no servidor do Supabase. Pega quem assinou, monta o aviso e empurra
// para o aparelho. É a peça que faz o celular apitar com o app fechado.
//
// Duas portas:
//   POST {papel, titulo, texto, ir}   → manda um aviso escrito à mão
//   POST {varrer: true}               → olha o dia e manda só o que precisa
//
// Quem chama precisa ser dono. A função confere no banco, não na palavra.
// ============================================================================
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const URL_SUPA = Deno.env.get('SUPABASE_URL')!;
const CHAVE_SERVICO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CONTATO = Deno.env.get('VAPID_CONTATO') ?? 'mailto:contato@estacaob12.com.br';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });

/* o banco com poder de servidor: só aqui dentro, nunca no navegador */
const servidor = createClient(URL_SUPA, CHAVE_SERVICO, {
  auth: { persistSession: false },
});

/* ---------------------------------------------------------------- VAPID
   O par de chaves que assina o aviso NÃO mora mais nos segredos do painel:
   mora na tabela b12_segredos, que tem RLS ligada e NENHUMA política — ou
   seja, só esta função, com a chave de serviço, consegue ler.

   Por quê: a B12 virou sala no projeto do estúdio, e colar chave em campo de
   painel é trabalho manual que ninguém repete direito quando troca de
   servidor. Na primeira chamada a função gera o par sozinha e guarda. Depois
   disso ela só lê.

   O formato é o que o web-push espera: pública = ponto da curva P-256 cru
   (65 bytes) em base64url; privada = o "d" do JWK, que já vem em base64url. */
function b64url(bytes: Uint8Array) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function gerarVapid() {
  const par = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey) as JsonWebKey;
  return { publica: b64url(pub), privada: jwk.d as string };
}

let VAPID: { publica: string; privada: string } | null = null;

async function chaves() {
  if (VAPID) return VAPID;
  const { data } = await servidor.from('b12_segredos').select('valor').eq('id', 'vapid').maybeSingle();
  if (data?.valor?.publica && data?.valor?.privada) {
    VAPID = data.valor as { publica: string; privada: string };
  } else {
    const novo = await gerarVapid();
    /* upsert: se dois pedidos chegarem juntos, o segundo relê o que o
       primeiro gravou em vez de sobrescrever e invalidar as assinaturas */
    await servidor.from('b12_segredos').insert({ id: 'vapid', valor: novo });
    const { data: agora } = await servidor
      .from('b12_segredos').select('valor').eq('id', 'vapid').maybeSingle();
    VAPID = (agora?.valor ?? novo) as { publica: string; privada: string };
  }
  webpush.setVapidDetails(CONTATO, VAPID.publica, VAPID.privada);
  return VAPID;
}

/* quem está chamando? O papel sai do banco, não do que a pessoa diz. */
async function quemChama(req: Request) {
  const cab = req.headers.get('Authorization') ?? '';
  const token = cab.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await servidor.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: pessoa } = await servidor
    .from('b12_pessoas').select('papel, nome, ativo').eq('id', data.user.id).single();
  if (!pessoa?.ativo) return null;
  return { id: data.user.id, papel: pessoa.papel, nome: pessoa.nome };
}

/* empurra para um aparelho. Devolve se a assinatura morreu, para limparmos. */
async function empurrar(inscrito: any, carga: unknown) {
  try {
    await webpush.sendNotification(
      { endpoint: inscrito.endpoint, keys: { p256dh: inscrito.p256dh, auth: inscrito.auth } },
      JSON.stringify(carga),
      { TTL: 60 * 60 * 6 },   /* 6 horas: aviso de operação envelhece rápido */
    );
    return { ok: true };
  } catch (e: any) {
    const codigo = e?.statusCode ?? 0;
    /* 404 e 410 = o navegador jogou a assinatura fora. Não adianta insistir. */
    return { ok: false, morta: codigo === 404 || codigo === 410, codigo };
  }
}

/* o que precisa de aviso hoje: a mesma varredura do painel, do lado do servidor */
async function varrerODia() {
  const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10); // America/Sao_Paulo
  const amanha = new Date(Date.parse(hoje + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
  const avisos: any[] = [];

  const { data: saidas } = await servidor
    .from('b12_saidas').select('data, sentido').in('data', [hoje, amanha]);
  const conta = (d: string, s: string) =>
    (saidas ?? []).filter((x: any) => x.data === d && x.sentido === s).length;

  if (!conta(amanha, 'volta') || !conta(amanha, 'ida')) {
    avisos.push({
      papel: 'dono', tag: 'horarios',
      titulo: 'Faltam os horários de amanhã',
      texto: !conta(amanha, 'ida') && !conta(amanha, 'volta')
        ? 'Ida e volta ainda não foram montadas.'
        : !conta(amanha, 'ida') ? 'As idas ainda não foram montadas.'
        : 'As buscas na Ilha ainda não foram montadas.',
      ir: '/#/adm', importante: true,
    });
  }

  const { data: pedidos } = await servidor
    .from('b12_reservas').select('id').eq('situacao', 'pedida').is('saida_id', null);
  if ((pedidos ?? []).length) {
    avisos.push({
      papel: 'dono', tag: 'pedidos',
      titulo: (pedidos!.length) + ' pedido' + (pedidos!.length > 1 ? 's' : '') + ' esperando',
      texto: 'Chegaram pelo app e ainda não entraram na escala.',
      ir: '/#/adm',
    });
  }

  const { data: naIlha } = await servidor
    .from('b12_reservas').select('id, nome')
    .eq('situacao', 'confirmada').lte('ida', hoje)
    .or('volta.is.null,volta.gte.' + hoje).is('saida_volta_id', null);
  if ((naIlha ?? []).length) {
    avisos.push({
      papel: 'equipe', tag: 'semvolta',
      titulo: (naIlha!.length) + (naIlha!.length > 1 ? ' pessoas' : ' pessoa') + ' sem volta marcada',
      texto: 'Estão na Ilha e ainda não escolheram horário.',
      ir: '/#/equipe', importante: true,
    });
  }
  /* Gente nova instalou o app? É o sinal de que a divulgação pegou, e o
     Dhalsin pediu para saber. UMA vez por dia, com o total — não um aviso por
     aparelho, senão um feriado vira enxurrada no celular dele. */
  const ontem = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: novos } = await servidor
    .from('b12_aparelhos').select('id', { count: 'exact', head: true })
    .eq('papel', 'turista').gt('criado', ontem);
  if (novos && novos > 0) {
    avisos.push({
      papel: 'dono', tag: 'instalou',
      titulo: novos === 1 ? 'Alguém instalou o app' : novos + ' pessoas instalaram o app',
      texto: novos === 1
        ? 'Mais um celular com a Estação B12 na tela de início.'
        : 'Nas últimas 24 horas. A divulgação está pegando.',
      ir: '/#/adm',
    });
  }

  return avisos;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  /* GET ?chave devolve só a chave PÚBLICA. Ela não é segredo — vai no
     navegador de todo mundo. É daqui que o app a pega, em vez de alguém ter
     de copiar à mão para o config.js toda vez que o servidor muda. */
  if (req.method === 'GET') {
    const v = await chaves();
    return resposta({ ok: true, chave: v.publica });
  }
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405);
  await chaves();            /* garante o par carregado antes de assinar */

  /* O RELÓGIO. Uma vez por dia (18h de Brasília) o próprio banco bate aqui
     com {varrer:true} e o Dhalsin recebe o que precisa de atenção sem ter
     aberto o app. Como não existe gente logada nessa hora, a chamada se
     identifica com um segredo que o BANCO gerou e guarda em b12_segredos —
     nunca passou por ninguém e não serve para mais nada: o relógio só varre.
     Quem agenda é o pg_cron: job `b12-varrer-o-dia`. */
  const selo = req.headers.get('x-b12-relogio') ?? '';
  let ehRelogio = false;
  if (selo) {
    const { data: s } = await servidor
      .from('b12_segredos').select('valor').eq('id', 'relogio').maybeSingle();
    ehRelogio = !!s?.valor?.chave && selo === s.valor.chave;
  }

  if (!ehRelogio) {
  const eu = await quemChama(req);
    if (!eu) return resposta({ erro: 'Precisa estar logado na B12.' }, 401);
    if (eu.papel !== 'dono') return resposta({ erro: 'Só o proprietário manda aviso.' }, 403);
  }

  const corpo = await req.json().catch(() => ({}));
  /* o relógio só varre: não escreve aviso à mão */
  if (ehRelogio && !corpo.varrer) return resposta({ erro: 'O relógio só varre.' }, 403);
  const pacotes = corpo.varrer
    ? await varrerODia()
    : [{
        papel: corpo.papel ?? 'dono',
        titulo: String(corpo.titulo ?? 'Estação B12').slice(0, 80),
        texto: String(corpo.texto ?? '').slice(0, 200),
        ir: corpo.ir ?? '/',
        tag: corpo.tag, importante: !!corpo.importante,
      }];

  if (!pacotes.length) return resposta({ ok: true, nada: true, mandados: 0 });

  let mandados = 0, falhas = 0;
  const mortas: string[] = [];

  for (const p of pacotes) {
    /* 'equipe' alcança o dono também: o dono é equipe com mais poder */
    const papeis = p.papel === 'equipe' ? ['equipe', 'dono'] : [p.papel];
    const { data: inscritos } = await servidor
      .from('b12_avisos').select('id, endpoint, p256dh, auth')
      .in('papel', papeis).eq('ativo', true);

    for (const i of inscritos ?? []) {
      const r = await empurrar(i, {
        titulo: p.titulo, texto: p.texto, ir: p.ir, tag: p.tag, importante: p.importante,
      });
      if (r.ok) mandados++;
      else { falhas++; if (r.morta) mortas.push(i.id); }
    }
  }

  /* assinatura morta não fica atrapalhando a conta para sempre */
  if (mortas.length) {
    await servidor.from('b12_avisos').update({ ativo: false }).in('id', mortas);
  }
  if (mandados) {
    await servidor.from('b12_avisos')
      .update({ usado_em: new Date().toISOString() })
      .eq('ativo', true);
  }

  return resposta({ ok: true, avisos: pacotes.length, mandados, falhas, limpas: mortas.length });
});
