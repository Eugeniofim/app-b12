-- =====================================================================
-- Estação B12 — os avisos no celular (Web Push)
--
-- Roda depois do 01-esquema.sql, no mesmo projeto.
--
-- Guarda a "assinatura" de cada aparelho que aceitou receber aviso. A
-- assinatura é o endereço que o navegador dá para o servidor de push
-- empurrar a mensagem. Sem ela, nada chega.
-- =====================================================================

create table if not exists public.b12_avisos (
  id          text primary key,          -- impressão digital do endpoint
  endpoint    text not null unique,
  p256dh      text not null,             -- chaves públicas do aparelho
  auth        text not null,
  papel       text not null default 'turista' check (papel in ('dono','equipe','turista')),
  pessoa_id   uuid references auth.users on delete cascade,
  cliente_id  text references public.b12_clientes (id) on delete set null,
  apelido     text,                      -- "iPhone do Dhalsin", para ele reconhecer
  ativo       boolean not null default true,
  erros       integer not null default 0,  -- push recusado seguidas vezes = aparelho morto
  criado      timestamptz not null default now(),
  usado_em    timestamptz,
  atualizado  timestamptz not null default now()
);
create index if not exists b12_avisos_papel on public.b12_avisos (papel) where ativo;

alter table public.b12_avisos enable row level security;

-- o dono vê e mexe em todas
create policy avisos_dono on public.b12_avisos for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());

-- a equipe cuida só da assinatura do próprio aparelho
create policy avisos_meus on public.b12_avisos for all to authenticated
  using (pessoa_id = auth.uid()) with check (pessoa_id = auth.uid());

-- o turista não tem conta: pode CRIAR a assinatura dele, e só como turista.
-- Não pode ler nada, nem se inscrever como dono ou equipe.
create policy avisos_turista_criar on public.b12_avisos for insert to anon
  with check (papel = 'turista' and pessoa_id is null);

-- carimbo
drop trigger if exists b12_avisos_carimbo on public.b12_avisos;
create trigger b12_avisos_carimbo before update on public.b12_avisos
  for each row execute function public.b12_carimbo();

-- =====================================================================
-- 12/11/2026 — A INSCRIÇÃO DO TURISTA, FEITA DO JEITO CERTO
--
-- Descoberto na revisão de entrega: NENHUM turista nunca conseguiu ligar
-- os avisos. O app grava a assinatura com "inserir OU atualizar"
-- (on_conflict=endpoint), porque o mesmo aparelho reassina toda vez que
-- reabre. No Postgres, INSERT ... ON CONFLICT DO UPDATE exige política de
-- UPDATE **e de SELECT**, mesmo quando não há conflito nenhum.
--
-- Medido contra o banco real: INSERT puro = 201, com on_conflict = 401
-- (42501, "new row violates row-level security policy").
--
-- Dar SELECT ao visitante resolveria — e vazaria o endereço e as chaves de
-- push de TODOS os aparelhos para qualquer um com a chave pública. Isso
-- não se faz. A saída é uma função com poder próprio que faz só esta
-- operação: grava a assinatura de UM aparelho, sempre como turista (está
-- escrito aqui dentro; o cliente não escolhe), e não devolve nada. O
-- visitante continua sem poder LER a tabela.
--
-- Dono e equipe não passam por aqui: com sessão eles têm as políticas de
-- ler e atualizar, e o caminho normal do PostgREST funciona.
-- =====================================================================
create or replace function public.b12_inscrever(
  p_id text, p_endpoint text, p_p256dh text, p_auth text,
  p_apelido text default null, p_cliente_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_endpoint is null or p_p256dh is null or p_auth is null then
    raise exception 'assinatura incompleta';
  end if;
  -- ===================== A FICHA DO TURISTA NÃO EXISTE NA NUVEM =====================
  -- Achado em 12/11/2026, na revisão de entrega, e era um BLOQUEIO: `cliente_id` aponta
  -- para b12_clientes, mas a ficha do turista nasce e MORA no celular dele -- reserva de
  -- turista não sobe para a nuvem (a sincronia exige sessão). Então o app mandava um id
  -- que o banco não conhece, a chave estrangeira recusava, e a pessoa via
  -- "O banco recusou a inscrição (409)".
  --
  -- O perverso: só acontecia com quem JÁ TINHA SE CADASTRADO -- ou seja, exatamente
  -- quem reservou a travessia, que é quem o Dhalsin mais precisa avisar. Quem só
  -- espiava o app conseguia ligar o aviso sem problema nenhum.
  -- Medido: p_cliente_id nulo = 204; com ficha local = 409 (23503).
  --
  -- Aqui o id é CONFERIDO em vez de recusado: se existir na nuvem, o laço fica; se não
  -- existir, entra vazio e a assinatura vale. Ninguém perde aviso por causa de um laço
  -- que é só comodidade -- e no dia em que a ficha do turista subir, o laço se forma.
  if p_cliente_id is not null
     and not exists (select 1 from public.b12_clientes where id = p_cliente_id) then
    p_cliente_id := null;
  end if;
  insert into public.b12_avisos
    (id, endpoint, p256dh, auth, papel, apelido, cliente_id, ativo, erros)
  values
    (p_id, p_endpoint, p_p256dh, p_auth, 'turista', p_apelido, p_cliente_id, true, 0)
  on conflict (endpoint) do update set
    p256dh = excluded.p256dh,
    auth   = excluded.auth,
    apelido = coalesce(excluded.apelido, public.b12_avisos.apelido),
    cliente_id = coalesce(excluded.cliente_id, public.b12_avisos.cliente_id),
    ativo = true, erros = 0, atualizado = now()
  -- uma conta de verdade (dono/equipe) nunca é rebaixada por esta porta
  where public.b12_avisos.pessoa_id is null;
end $fn$;

revoke all on function public.b12_inscrever(text,text,text,text,text,text) from public;
grant execute on function public.b12_inscrever(text,text,text,text,text,text) to anon, authenticated;
