// =====================================================================
// Estação B12 — o carteiro de e-mail (Resend)
//
// Manda e-mail para os clientes da B12. Três travas, todas de propósito:
//
//  1. SÓ O DONO manda. O papel sai do banco, não do que a pessoa diz.
//  2. SÓ QUEM ACEITOU recebe. O app guarda o consentimento com data e hora
//     (`aceites.ofertas`); quem não aceitou não entra na lista, nem que o
//     e-mail esteja cadastrado.
//  3. TODO e-mail leva link de descadastro. Não é enfeite: sem isso o
//     domínio da B12 vira spam em duas semanas e aí nenhum e-mail chega,
//     nem os de confirmação de reserva.
//
// Segredos (cofre do Supabase, nunca no repositório):
//   RESEND_API_KEY   a chave da conta Resend
//   EMAIL_DE         ex.: "Estação B12 <contato@estacaob12.com.br>"
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

/* quem está chamando? O papel sai do banco. */
async function quemEh(req: Request) {
  const cab = req.headers.get('Authorization') ?? '';
  const { data, error } = await servidor.auth.getUser(cab.replace('Bearer ', ''));
  if (error || !data?.user) return null;
  const { data: p } = await servidor
    .from('b12_pessoas').select('papel, nome, ativo').eq('id', data.user.id).single();
  if (!p || p.ativo === false) return null;
  return { id: data.user.id, papel: p.papel, nome: p.nome };
}

function escapa(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* O corpo do e-mail. Sóbrio de propósito: e-mail enfeitado cai em promoções. */
function montar(nome: string, titulo: string, texto: string, sairUrl: string) {
  const primeiro = String(nome || '').split(' ')[0] || 'tudo bem';
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F1F5F7;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0E1F2D">
    <div style="max-width:560px;margin:0 auto;padding:28px 22px">
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;
        font-weight:800;color:#0B2A4A">Estação B12</div>
      <h1 style="font-size:22px;line-height:1.25;margin:16px 0 12px;color:#0B2A4A">${escapa(titulo)}</h1>
      <p style="font-size:16px;line-height:1.6;color:#3F5665;margin:0 0 18px">
        Oi, ${escapa(primeiro)}!</p>
      <p style="font-size:16px;line-height:1.6;color:#3F5665;margin:0 0 22px;
        white-space:pre-line">${escapa(texto)}</p>
      <a href="https://app.estacaob12.com.br" style="display:inline-block;background:#0B7A70;
        color:#fff;text-decoration:none;font-weight:700;font-size:15px;
        padding:13px 22px;border-radius:10px">Abrir o app da B12</a>
      <p style="font-size:12.5px;color:#647E8E;line-height:1.5;margin:28px 0 0;
        border-top:1px solid #D5E1E8;padding-top:16px">
        Você recebe este e-mail porque viajou com a Estação B12 e aceitou receber novidades.<br>
        <a href="${sairUrl}" style="color:#647E8E">Não quero mais receber</a> ·
        Av. Beira-Mar, 3433 · Pontal do Paraná – PR
      </p>
    </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = new URL(req.url);

  /* ---- descadastro: link do rodapé, sem login ---- */
  const sair = url.searchParams.get('sair');
  if (sair) {
    await servidor.from('b12_clientes')
      .update({ dados: { aceitaOfertas: false } })
      .eq('id', sair);
    /* o jsonb inteiro não pode ser trocado por um campo só: lê, muda, grava */
    const { data: c } = await servidor.from('b12_clientes').select('dados').eq('id', sair).single();
    if (c) {
      const d = { ...(c.dados ?? {}), aceitaOfertas: false,
                  saiuDasOfertasEm: new Date().toISOString() };
      await servidor.from('b12_clientes').update({ dados: d }).eq('id', sair);
    }
    return new Response(
      `<!doctype html><meta charset=utf8><body style="font-family:system-ui;padding:40px;
       max-width:420px;margin:0 auto;color:#0E1F2D">
       <h2 style="color:#0B2A4A">Pronto, você saiu da lista</h2>
       <p style="color:#3F5665;line-height:1.6">Não vamos mais mandar novidades por e-mail.
       Mensagens sobre uma viagem sua continuam chegando — essas não são propaganda.</p>
       <p style="color:#647E8E;font-size:13px">Estação B12 · Pontal do Paraná</p></body>`,
      { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } });
  }

  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405);

  const eu = await quemEh(req);
  if (!eu) return resposta({ erro: 'Entre na conta da B12 para mandar e-mail.' }, 401);
  if (eu.papel !== 'dono') return resposta({ erro: 'Só o proprietário manda e-mail.' }, 403);

  const chave = Deno.env.get('RESEND_API_KEY');
  const de = Deno.env.get('EMAIL_DE');
  if (!chave || !de) {
    return resposta({ erro: 'O e-mail ainda não foi configurado. Falta RESEND_API_KEY ' +
      'e EMAIL_DE no cofre do Supabase.' }, 400);
  }

  const corpo = await req.json().catch(() => ({}));
  const titulo = String(corpo.titulo ?? '').slice(0, 90).trim();
  const texto = String(corpo.texto ?? '').slice(0, 1200).trim();
  if (!titulo || !texto) return resposta({ erro: 'Escreva o assunto e a mensagem.' }, 400);

  /* ---- a lista: só quem tem e-mail E aceitou ---- */
  const { data: linhas } = await servidor.from('b12_clientes').select('id, dados');
  const lista = (linhas ?? [])
    .map((l: any) => ({ id: l.id, ...(l.dados ?? {}) }))
    .filter((c: any) => c.email && String(c.email).includes('@') && c.aceitaOfertas);

  const alvo = corpo.para === 'eu'
    ? lista.slice(0, 1).map((c: any) => ({ ...c, email: corpo.meuEmail || c.email }))
    : lista;

  if (corpo.para === 'eu' && corpo.meuEmail) {
    alvo.length = 0;
    alvo.push({ id: 'teste', nome: eu.nome || 'você', email: corpo.meuEmail });
  }
  if (!alvo.length) {
    return resposta({ erro: corpo.para === 'eu'
      ? 'Informe o e-mail para o teste.'
      : 'Ninguém na lista: é preciso ter clientes com e-mail que aceitaram receber.' }, 400);
  }

  const base = Deno.env.get('SUPABASE_URL')! + '/functions/v1/email?sair=';
  let enviados = 0, falhas = 0;

  for (const c of alvo) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: de, to: [c.email], subject: titulo,
        html: montar(c.nome, titulo, texto, base + encodeURIComponent(c.id)),
        headers: { 'List-Unsubscribe': '<' + base + encodeURIComponent(c.id) + '>' },
      }),
    }).catch(() => null);
    if (r && r.ok) enviados++; else falhas++;
    await new Promise((x) => setTimeout(x, 120));   /* o Resend limita por segundo */
  }

  return resposta({ ok: true, enviados, falhas, naLista: lista.length });
});
