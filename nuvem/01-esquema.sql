-- =====================================================================
-- Estação B12 — o banco na nuvem
--
-- Roda uma vez no SQL Editor do Supabase, no projeto da B12.
-- Desenhado para o dia a dia real: vários marinheiros com o app aberto ao
-- mesmo tempo, cada um vendo a mesma escala, na hora.
--
-- Três papéis:
--   dono    — vê tudo, inclusive dinheiro
--   equipe  — vê a operação: escala, passageiros, pátio. NUNCA o dinheiro.
--   turista — não tem conta. Vê só a própria reserva, pelo código.
-- =====================================================================

-- quem é quem (o Supabase já cria auth.users; aqui fica o papel)
create table if not exists public.b12_pessoas (
  id          uuid primary key references auth.users on delete cascade,
  nome        text not null default '',
  papel       text not null default 'equipe' check (papel in ('dono','equipe')),
  ativo       boolean not null default true,
  criado      timestamptz not null default now()
);

-- quem viaja
create table if not exists public.b12_clientes (
  id          text primary key,
  nome        text not null,
  whats       text,
  email       text,
  instagram   text,
  cpf         text,
  cidade      text,
  pousada     text,
  obs         text,
  gasto       numeric not null default 0,
  viagens     integer not null default 0,
  aceita_ofertas boolean not null default false,
  consentido_em  timestamptz,
  origem      text,
  criado      timestamptz not null default now(),
  atualizado  timestamptz not null default now()
);
create index if not exists b12_clientes_whats on public.b12_clientes (whats);

-- as saídas do dia: é isto que os marinheiros olham juntos
create table if not exists public.b12_saidas (
  id          text primary key,
  data        date not null,
  hora        text not null,
  sentido     text not null check (sentido in ('ida','volta')),
  destino     text,
  embarcacao  text,
  marinheiro  text,
  vagas       integer not null default 12,
  ocupadas    integer not null default 0,
  grade       boolean not null default false,
  atualizado  timestamptz not null default now()
);
create index if not exists b12_saidas_data on public.b12_saidas (data, hora);

-- as reservas
create table if not exists public.b12_reservas (
  id            text primary key,
  cod           text not null unique,
  situacao      text not null default 'pedida',
  nome          text not null,
  zap           text,
  email         text,
  instagram     text,
  cliente_id    text references public.b12_clientes (id) on delete set null,
  ida           date,
  volta         date,
  pax           integer not null default 1,
  criancas      integer not null default 0,
  destino       text,
  pousada       text,
  produto       text,
  faixa         text,
  total         numeric,
  pg            text,
  estacionamento integer not null default 0,
  placa         text,
  saida_id      text references public.b12_saidas (id) on delete set null,
  saida_volta_id text references public.b12_saidas (id) on delete set null,
  aceites       jsonb,
  origem        text,
  criada        timestamptz not null default now(),
  atualizado    timestamptz not null default now()
);
create index if not exists b12_reservas_cod on public.b12_reservas (cod);
create index if not exists b12_reservas_ida on public.b12_reservas (ida);

-- o pátio
create table if not exists public.b12_patio (
  id            text primary key,
  placa         text not null,
  modelo        text, cor text, vaga text,
  cliente_id    text references public.b12_clientes (id) on delete set null,
  nome          text, whats text,
  entrada       date not null,
  entrada_em    timestamptz,
  saida_prevista date,
  saida_real    date,
  saida_em      timestamptz,
  diaria        numeric not null default 0,
  pago          boolean not null default false,
  valor_pago    numeric not null default 0,
  pago_na_entrada numeric not null default 0,
  pg_entrada    text,
  atualizado    timestamptz not null default now()
);
create index if not exists b12_patio_dentro on public.b12_patio (saida_real) where saida_real is null;

-- o dinheiro: só o dono enxerga
create table if not exists public.b12_lancamentos (
  id          text primary key,
  data        date not null,
  tipo        text not null check (tipo in ('entrada','saida')),
  cat         text not null,
  centro      text,
  descricao   text,
  valor       numeric not null,
  pg          text,
  responsavel text,
  embarcacao  text,
  cliente_id  text references public.b12_clientes (id) on delete set null,
  investimento boolean not null default false,
  obs         text,
  origem      text,
  criado      timestamptz not null default now()
);
create index if not exists b12_lanc_data on public.b12_lancamentos (data);

create table if not exists public.b12_contas (
  id          text primary key,
  tipo        text not null default 'pagar',
  descricao   text not null,
  valor       numeric not null,
  venc        date not null,
  cat text, centro text,
  fixa        boolean not null default false,
  paga        boolean not null default false,
  avisar      boolean not null default true,
  atualizado  timestamptz not null default now()
);

create table if not exists public.b12_manutencoes (
  id          text primary key,
  data        date not null,
  embarcacao  text, tipo text,
  descricao   text not null,
  pecas text, fornecedor text,
  valor       numeric not null default 0,
  horas_motor numeric,
  proxima     date,
  criado      timestamptz not null default now()
);

-- os ajustes do dono (preços, grade, regras): uma linha só
create table if not exists public.b12_ajustes (
  id          integer primary key default 1 check (id = 1),
  dados       jsonb not null default '{}'::jsonb,
  atualizado  timestamptz not null default now()
);
insert into public.b12_ajustes (id, dados) values (1, '{}'::jsonb) on conflict do nothing;

-- =====================================================================
-- A TRANCA (RLS). Sem isto, qualquer um com o endereço lê tudo.
-- =====================================================================
alter table public.b12_pessoas     enable row level security;
alter table public.b12_clientes    enable row level security;
alter table public.b12_saidas      enable row level security;
alter table public.b12_reservas    enable row level security;
alter table public.b12_patio       enable row level security;
alter table public.b12_lancamentos enable row level security;
alter table public.b12_contas      enable row level security;
alter table public.b12_manutencoes enable row level security;
alter table public.b12_ajustes     enable row level security;

create or replace function public.b12_papel() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select papel from public.b12_pessoas where id = auth.uid() and ativo), 'ninguem');
$$;
create or replace function public.b12_e_dono() returns boolean
language sql stable as $$ select public.b12_papel() = 'dono' $$;
create or replace function public.b12_e_equipe() returns boolean
language sql stable as $$ select public.b12_papel() in ('dono','equipe') $$;

-- cada um vê a própria ficha; o dono vê todas
create policy pessoas_ler on public.b12_pessoas for select to authenticated
  using (id = auth.uid() or public.b12_e_dono());
create policy pessoas_dono on public.b12_pessoas for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());

-- operação: a equipe lê e escreve (é o trabalho dela)
create policy saidas_equipe on public.b12_saidas for all to authenticated
  using (public.b12_e_equipe()) with check (public.b12_e_equipe());
create policy reservas_equipe on public.b12_reservas for all to authenticated
  using (public.b12_e_equipe()) with check (public.b12_e_equipe());
create policy patio_equipe on public.b12_patio for all to authenticated
  using (public.b12_e_equipe()) with check (public.b12_e_equipe());
create policy clientes_equipe on public.b12_clientes for all to authenticated
  using (public.b12_e_equipe()) with check (public.b12_e_equipe());

-- dinheiro: só o dono. A equipe não lê nem por engano.
create policy lanc_dono on public.b12_lancamentos for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());
create policy contas_dono on public.b12_contas for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());
create policy manut_equipe_le on public.b12_manutencoes for select to authenticated
  using (public.b12_e_equipe());
create policy manut_dono on public.b12_manutencoes for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());

-- ajustes: a equipe lê (precisa da grade e dos preços), só o dono muda
create policy ajustes_ler on public.b12_ajustes for select to authenticated
  using (public.b12_e_equipe());
create policy ajustes_dono on public.b12_ajustes for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());

-- o turista: sem conta. Pede reserva e consulta a própria pelo código.
create policy reserva_pedir on public.b12_reservas for insert to anon
  with check (situacao = 'pedida' and origem = 'app');

-- =====================================================================
-- O AVISO NA HORA: é isto que faz o celular do outro marinheiro atualizar
-- =====================================================================
alter publication supabase_realtime add table public.b12_saidas;
alter publication supabase_realtime add table public.b12_reservas;
alter publication supabase_realtime add table public.b12_patio;
alter publication supabase_realtime add table public.b12_clientes;
alter publication supabase_realtime add table public.b12_ajustes;

-- carimbo de atualização, para a sincronia saber o que mudou
create or replace function public.b12_carimbo() returns trigger
language plpgsql as $$ begin new.atualizado = now(); return new; end $$;
do $$ declare t text;
begin
  foreach t in array array['b12_clientes','b12_saidas','b12_reservas','b12_patio','b12_contas','b12_ajustes']
  loop
    execute format('drop trigger if exists %I_carimbo on public.%I', t, t);
    execute format('create trigger %I_carimbo before update on public.%I
                    for each row execute function public.b12_carimbo()', t, t);
  end loop;
end $$;
