-- =====================================================================
-- Estação B12 — contagem de aparelhos
--
-- Roda depois do 02-avisos.sql, no mesmo projeto.
--
-- Responde a pergunta do Dhalsin: "quantos aparelhos têm o app?".
-- PWA não passa por loja, então não existe "download". O que existe é
-- isto: uma linha anônima por aparelho, com quando apareceu, quando foi
-- visto pela última vez, e se está instalado na tela de início.
--
-- NÃO guarda nome, telefone, e-mail nem onde a pessoa está. O id é um
-- número sorteado no próprio aparelho. É contagem, não rastreamento.
-- =====================================================================

create table if not exists public.b12_aparelhos (
  id          text primary key,            -- sorteado no aparelho, anônimo
  papel       text not null default 'turista' check (papel in ('dono','equipe','turista')),
  instalado   boolean not null default false,  -- está na tela de início
  avisos      boolean not null default false,  -- aceitou receber aviso
  plataforma  text,                         -- 'iphone' | 'android' | 'computador'
  criado      timestamptz not null default now(),
  visto_em    timestamptz not null default now()
);
create index if not exists b12_aparelhos_visto on public.b12_aparelhos (visto_em desc);

alter table public.b12_aparelhos enable row level security;

-- o dono lê tudo: é dele o relatório
create policy aparelhos_dono on public.b12_aparelhos for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());

-- o turista não tem conta. Pode anunciar o próprio aparelho e atualizar a
-- própria linha, e só como turista. Não pode ler a contagem de ninguém.
create policy aparelhos_anon_criar on public.b12_aparelhos for insert to anon
  with check (papel = 'turista');
create policy aparelhos_anon_tocar on public.b12_aparelhos for update to anon
  using (papel = 'turista') with check (papel = 'turista');

-- =====================================================================
-- O número que o painel mostra. Uma função só, para o dono não precisar
-- varrer a tabela inteira no celular.
-- =====================================================================
create or replace function public.b12_contagem_aparelhos()
returns table (
  total          bigint,
  instalados     bigint,
  com_avisos     bigint,
  ativos_7       bigint,
  ativos_30      bigint,
  novos_7        bigint
) language sql security definer set search_path = public as $$
  select
    count(*)                                                     as total,
    count(*) filter (where instalado)                            as instalados,
    count(*) filter (where avisos)                               as com_avisos,
    count(*) filter (where visto_em > now() - interval '7 days')  as ativos_7,
    count(*) filter (where visto_em > now() - interval '30 days') as ativos_30,
    count(*) filter (where criado   > now() - interval '7 days')  as novos_7
  from public.b12_aparelhos
  where papel = 'turista';
$$;
revoke all on function public.b12_contagem_aparelhos() from public, anon;
grant execute on function public.b12_contagem_aparelhos() to authenticated;

-- =====================================================================
-- 12/11/2026 — A CONTAGEM NUNCA SUBIU DE QUEM NÃO TEM CONTA
--
-- Mesmo defeito dos avisos, achado na mesma varredura de entrega. Esta
-- tabela tinha política de INSERT e de UPDATE para o visitante, mas não de
-- SELECT — e não pode ter, porque a contagem é do dono. Com
-- `on_conflict=id` o Postgres exige SELECT, então todo aparelho sem conta
-- era recusado com 42501. Ou seja: "Instalados" e "Ativos em 7 dias"
-- contavam só os aparelhos logados, que são o do Dhalsin e o da equipe.
--
-- Mesma saída: uma função com poder próprio que faz só esta operação,
-- sempre como turista. Não devolve nada; o visitante continua sem poder
-- ler a tabela.
-- =====================================================================
create or replace function public.b12_tocar_aparelho(
  p_id text, p_instalado boolean default false, p_avisos boolean default false,
  p_plataforma text default null)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_id is null or length(p_id) < 8 then
    raise exception 'aparelho sem identificacao';
  end if;
  insert into public.b12_aparelhos (id, papel, instalado, avisos, plataforma, visto_em)
  values (p_id, 'turista', coalesce(p_instalado,false), coalesce(p_avisos,false),
          p_plataforma, now())
  on conflict (id) do update set
    instalado = excluded.instalado,
    avisos    = excluded.avisos,
    plataforma = coalesce(excluded.plataforma, public.b12_aparelhos.plataforma),
    visto_em  = now()
  -- aparelho de dono ou equipe não é rebaixado por esta porta
  where public.b12_aparelhos.papel = 'turista';
end $fn$;

revoke all on function public.b12_tocar_aparelho(text,boolean,boolean,text) from public;
grant execute on function public.b12_tocar_aparelho(text,boolean,boolean,text) to anon, authenticated;
