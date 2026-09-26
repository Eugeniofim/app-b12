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
