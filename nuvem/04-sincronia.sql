-- =====================================================================
-- Estação B12 — o banco por linha (sincronia de verdade)
--
-- Roda depois do 03-aparelhos.sql. NÃO APAGA NADA: só acrescenta.
--
-- POR QUE
-- As tabelas nasceram com colunas fixas (b12_reservas tem 26). O objeto do
-- app tem campos que não têm coluna — hora, idades, chegouEm, pagantes,
-- consumo, obs. Sincronizar assim JOGARIA ESSES CAMPOS FORA em silêncio, e
-- cada campo novo quebraria de novo sem avisar.
--
-- O DESENHO
-- Cada registro vira uma linha com o objeto INTEIRO em `dados jsonb`. As
-- colunas antigas continuam ali, sem uso, e o app não escreve nelas — por
-- isso as obrigatórias passam a aceitar vazio logo abaixo. Campo novo no
-- app nunca mais exige mexer no banco.
--
-- POR QUE NÃO UMA TABELA SÓ (como no TI ARTES OS)
-- Lá o app é de uma pessoa e a trava é `user_id = auth.uid()`. Aqui são três
-- papéis, e a funcionária NÃO PODE VER DINHEIRO. Uma tabela só = uma política
-- só = ela veria o caixa. Uma tabela por coleção é o que mantém a tranca no
-- Postgres em vez de ser tela escondida.
--
-- APAGAR É MARCAR (`apagado=true`), nunca sumir: senão o outro aparelho
-- ressuscita na próxima sincronia o que foi apagado aqui.
-- =====================================================================

-- ------------------------------------------------- dados, apagado, carimbo
-- b12_lancamentos e b12_manutencoes nasceram só com `criado`, sem `atualizado`.
-- O pull incremental precisa dele em TODAS, então a primeira linha do laço cria
-- onde falta. (Descoberto rodando, em 06/10/2026.)
create or replace function public.b12_carimbo() returns trigger
language plpgsql as $$
begin
  new.atualizado = now();   -- o SERVIDOR carimba: relógio de celular atrasado
  return new;               -- faria o pull incremental pular linhas
end $$;

do $$
declare t text;
begin
  foreach t in array array['reservas','clientes','saidas','patio',
                           'lancamentos','contas','manutencoes']
  loop
    execute format($f$
      alter table public.b12_%1$s add column if not exists atualizado timestamptz not null default now();
      alter table public.b12_%1$s add column if not exists dados jsonb not null default '{}'::jsonb;
      alter table public.b12_%1$s add column if not exists apagado boolean not null default false;
      create index if not exists b12_%1$s_atualizado on public.b12_%1$s (atualizado desc);
      drop trigger if exists b12_%1$s_carimbo on public.b12_%1$s;
      create trigger b12_%1$s_carimbo before update on public.b12_%1$s
        for each row execute function public.b12_carimbo();
    $f$, t);
  end loop;
end $$;

-- As colunas antigas obrigatórias passam a aceitar vazio: quem manda agora é
-- `dados`. Elas ficam de herança, sem uso. (Limpar um dia, com calma.)
alter table public.b12_clientes    alter column nome      drop not null;
alter table public.b12_saidas      alter column data      drop not null;
alter table public.b12_saidas      alter column hora      drop not null;
alter table public.b12_saidas      alter column sentido   drop not null;
alter table public.b12_reservas    alter column cod       drop not null;
alter table public.b12_reservas    alter column nome      drop not null;
alter table public.b12_patio       alter column placa     drop not null;
alter table public.b12_patio       alter column entrada   drop not null;
alter table public.b12_lancamentos alter column data      drop not null;
alter table public.b12_lancamentos alter column tipo      drop not null;
alter table public.b12_lancamentos alter column cat       drop not null;
alter table public.b12_lancamentos alter column valor     drop not null;
alter table public.b12_contas      alter column descricao drop not null;
alter table public.b12_contas      alter column valor     drop not null;
alter table public.b12_contas      alter column venc      drop not null;
alter table public.b12_manutencoes alter column data      drop not null;
alter table public.b12_manutencoes alter column descricao drop not null;

-- O código da reserva era único; com `dados` mandando, a trava atrapalha.
alter table public.b12_reservas drop constraint if exists b12_reservas_cod_key;

-- ------------------------------------------------------ marinheiros (nova)
create table if not exists public.b12_marinheiros (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  apagado     boolean not null default false,
  atualizado  timestamptz not null default now()
);
create index if not exists b12_marinheiros_atualizado on public.b12_marinheiros (atualizado desc);
alter table public.b12_marinheiros enable row level security;
drop trigger if exists b12_marinheiros_carimbo on public.b12_marinheiros;
create trigger b12_marinheiros_carimbo before update on public.b12_marinheiros
  for each row execute function public.b12_carimbo();

-- ------------------------------------------------- o cofre, agora na nuvem
-- Cópia de segurança que NÃO mora no celular. Se o aparelho do Dhalsin sumir,
-- as cópias continuam aqui. Só o dono lê e escreve.
create table if not exists public.b12_cofre (
  id          text primary key,              -- aaaa-mm-dd-hhmm
  dia         date not null,
  motivo      text,
  peso        integer not null default 0,    -- quantos registros tinha
  dados       jsonb not null,
  criado      timestamptz not null default now()
);
create index if not exists b12_cofre_dia on public.b12_cofre (dia desc);
alter table public.b12_cofre enable row level security;
drop policy if exists b12_cofre_dono on public.b12_cofre;
create policy b12_cofre_dono on public.b12_cofre for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());

-- ------------------------------------------------------- quem vê o quê
drop policy if exists b12_marinheiros_equipe on public.b12_marinheiros;
create policy b12_marinheiros_equipe on public.b12_marinheiros for all to authenticated
  using (public.b12_e_equipe()) with check (public.b12_e_equipe());

-- ------------------------------------------------------------ tempo real
do $$
declare t text;
begin
  foreach t in array array['reservas','clientes','saidas','patio','lancamentos',
                           'contas','manutencoes','marinheiros','ajustes']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.b12_%1$s', t);
    exception when others then null;
    end;
    execute format('alter table public.b12_%1$s replica identity full', t);
  end loop;
end $$;

select 'banco por linha pronto' as estado;
