// =====================================================================
// Estação B12 — mandar e-mail para os clientes
//
// Esta função NÃO fala com o Brevo. Ela fala com o COFRE da Ti Artes, que
// é quem tem a chave.
//
// Por quê: `avisos.eugeniofim.com` é infraestrutura compartilhada — Mario,
// Dulcineia, Mari e Carol mandam pelo mesmo domínio. O banco da B12 fica na
// conta do DHALSIN; se a chave do Brevo morasse aqui e essa conta vazasse,
// o e-mail de todos morreria junto, porque reputação de envio é do domínio.
//
// Então aqui mora só um TOKEN próprio da B12 (COFRE_TOKEN), revogável:
// se vazar, o Eugênio apaga aquele token e ninguém mais é afetado.
//
// Três travas, as mesmas de antes:
//  1. SÓ O DONO manda; o papel sai do banco, não do que o aparelho diz.
//  2. SÓ QUEM ACEITOU recebe; o consentimento tem data e hora no cadastro.
//  3. TODO e-mail leva descadastro — quem monta isso é o cofre.
// =====================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const resposta = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const servidor = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const COFRE = Deno.env.get('COFRE_URL') ?? 'https://uopfqlogjzuqpabptxkb.supabase.co/functions/v1/cofre';
const TOKEN = Deno.env.get('COFRE_TOKEN') ?? '';

async function quemEh(req: Request) {
  const cab = req.headers.get('Authorization') ?? '';
  const { data, error } = await servidor.auth.getUser(cab.replace('Bearer ', ''));
  if (error || !data?.user) return null;
  const { data: p } = await servidor
    .from('b12_pessoas').select('papel, nome, ativo').eq('id', data.user.id).single();
  if (!p || p.ativo === false) return null;
  return { id: data.user.id, papel: p.papel, nome: p.nome };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405);

  const eu = await quemEh(req);
  if (!eu) return resposta({ erro: 'Entre na conta da B12 para mandar e-mail.' }, 401);
  if (eu.papel !== 'dono') return resposta({ erro: 'Só o proprietário manda e-mail.' }, 403);
  if (!TOKEN) return resposta({ erro: 'Falta COFRE_TOKEN no cofre deste projeto.' }, 500);

  const corpo = await req.json().catch(() => ({}));
  const titulo = String(corpo.titulo ?? '').slice(0, 90).trim();
  const texto = String(corpo.texto ?? '').slice(0, 1500).trim();
  if (!titulo || !texto) return resposta({ erro: 'Escreva o assunto e a mensagem.' }, 400);

  let lista: { nome: string; email: string; id: string }[] = [];

  if (corpo.para === 'eu') {
    const meu = String(corpo.meuEmail ?? '').trim();
    if (!meu.includes('@')) return resposta({ erro: 'Informe o e-mail para o teste.' }, 400);
    lista = [{ nome: eu.nome ?? 'você', email: meu, id: 'teste' }];
  } else {
    /* a lista sai do banco, nunca do aparelho: assim ninguém manda
       e-mail para quem não autorizou, mesmo mexendo no app */
    const { data: linhas } = await servidor
      .from('b12_clientes').select('id, dados').eq('apagado', false);
    lista = (linhas ?? [])
      .map((l: any) => ({ ...(l.dados ?? {}), id: l.id }))
      .filter((c: any) => c.email && String(c.email).includes('@') && c.aceitaOfertas)
      .map((c: any) => ({ nome: c.nome ?? '', email: c.email, id: c.id }));
    if (!lista.length) {
      return resposta({ erro: 'Ninguém na lista: é preciso ter cliente com e-mail ' +
        'que aceitou receber novidades.' }, 400);
    }
  }

  const r = await fetch(COFRE + '/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cofre-token': TOKEN },
    body: JSON.stringify({ titulo, texto, para: lista }),
  }).catch(() => null);

  if (!r) return resposta({ erro: 'Não consegui falar com o servidor de e-mail.' }, 502);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) return resposta({ erro: j.erro ?? ('servidor de e-mail ' + r.status) }, 502);
  return resposta({ ok: true, enviados: j.enviados, falhas: j.falhas, naLista: lista.length });
});
