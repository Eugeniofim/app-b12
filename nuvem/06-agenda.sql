-- =====================================================================
-- Estação B12 — AGENDA do Dhalsin (13/10/2026)
--
-- A tabela é como as outras do app: uma linha por compromisso, o conteúdo
-- em `dados`, e o carimbo `atualizado` que a sincronia usa para saber o que
-- mudou desde a última leitura.
--
-- A diferença é `avisa_em`: a hora exata em que o servidor deve bater no
-- celular dele. Ela é COLUNA, e não só um campo dentro do jsonb, porque o
-- relógio precisa procurar por ela a cada dez minutos — e procurar dentro de
-- jsonb sem índice, a cada dez minutos, para sempre, é desperdício.
--
-- Só o DONO vê. Compromisso dele não é assunto da equipe.
-- =====================================================================
create table if not exists public.b12_tarefas (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  avisa_em    timestamptz,          -- quando bater; nulo = não avisa
  avisado     boolean not null default false,
  apagado     boolean not null default false,
  atualizado  timestamptz not null default now()
);
create index if not exists b12_tarefas_atualizado on public.b12_tarefas (atualizado desc);
-- o índice que o relógio usa: só o que ainda não avisou e tem hora marcada
create index if not exists b12_tarefas_avisar on public.b12_tarefas (avisa_em)
  where avisa_em is not null and not avisado and not apagado;

alter table public.b12_tarefas enable row level security;
drop policy if exists b12_tarefas_dono on public.b12_tarefas;
create policy b12_tarefas_dono on public.b12_tarefas for all to authenticated
  using (public.b12_e_dono()) with check (public.b12_e_dono());

drop trigger if exists b12_tarefas_carimbo on public.b12_tarefas;
create trigger b12_tarefas_carimbo before update on public.b12_tarefas
  for each row execute function public.b12_carimbo();

-- a hora do aviso sai de dentro do `dados` que o app enviou: assim o app
-- continua mandando um objeto só, e o banco cuida da coluna sozinho
create or replace function public.b12_tarefa_avisa() returns trigger
language plpgsql as $$
begin
  new.avisa_em := nullif(new.dados->>'avisoEm','')::timestamptz;
  if coalesce((new.dados->>'feita')::boolean, false) then
    new.avisa_em := null;
  end if;
  /* mudou a hora do compromisso: o aviso volta a valer */
  if tg_op = 'UPDATE' and new.avisa_em is distinct from old.avisa_em then
    new.avisado := false;
  end if;
  return new;
end $$;
drop trigger if exists b12_tarefa_avisa on public.b12_tarefas;
create trigger b12_tarefa_avisa before insert or update on public.b12_tarefas
  for each row execute function public.b12_tarefa_avisa();

do $$ begin
  begin execute 'alter publication supabase_realtime add table public.b12_tarefas';
  exception when others then null; end;
end $$;
alter table public.b12_tarefas replica identity full;

-- =====================================================================
-- O RELÓGIO DA AGENDA — de 10 em 10 minutos
--
-- Por que 10 e não 1: aviso de agenda com dez minutos de folga continua
-- sendo aviso; um pedido por minuto, para sempre, são 525 mil chamadas por
-- ano para avisar o que cabe em 52 mil.
-- =====================================================================
select cron.unschedule(jobid) from cron.job where jobname = 'b12-agenda';

select cron.schedule('b12-agenda', '*/10 * * * *', $job$
  select net.http_post(
    url := 'https://uopfqlogjzuqpabptxkb.supabase.co/functions/v1/avisar',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer sb_publishable_VKIdd2RNpMf3e4IEDprxJw_TOKPIHT2',
      'x-b12-relogio', (select valor->>'chave' from public.b12_segredos where id = 'relogio')),
    body := '{"agenda": true}'::jsonb,
    timeout_milliseconds := 25000
  );
$job$);

select jobname, schedule, active from cron.job where jobname like 'b12%' order by jobname;
