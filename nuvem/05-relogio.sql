-- =====================================================================
-- Estação B12 — o relógio do servidor (12/10/2026)
--
-- Uma vez por dia, às 18h de Brasília (21h UTC), o próprio banco bate na
-- função `avisar` com {varrer:true}. Ela olha o dia e manda só o que
-- precisa: horários de amanhã que faltam montar, pedidos esperando
-- resposta, gente na Ilha sem volta marcada, app novo instalado.
--
-- Como não existe ninguém logado nessa hora, a chamada se identifica com
-- um segredo que o PRÓPRIO BANCO gerou e guarda em `b12_segredos` — não
-- passou por ninguém, e não serve para mais nada: o relógio só varre.
--
-- O `authorization` leva a chave PUBLICÁVEL, que já está no repositório e
-- no navegador de todo mundo: ela só abre o portão das Edge Functions.
-- =====================================================================
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

insert into public.b12_segredos (id, valor)
values ('relogio', jsonb_build_object('chave', gen_random_uuid()::text))
on conflict (id) do nothing;

select cron.unschedule(jobid) from cron.job where jobname = 'b12-varrer-o-dia';

select cron.schedule('b12-varrer-o-dia', '0 21 * * *', $job$
  select net.http_post(
    url := 'https://uopfqlogjzuqpabptxkb.supabase.co/functions/v1/avisar',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer sb_publishable_VKIdd2RNpMf3e4IEDprxJw_TOKPIHT2',
      'x-b12-relogio', (select valor->>'chave' from public.b12_segredos where id = 'relogio')),
    body := '{"varrer": true}'::jsonb,
    timeout_milliseconds := 25000
  );
$job$);

-- conferir depois: select id, status_code, left(content,200) from net._http_response order by id desc limit 3;
select jobname, schedule, active from cron.job where jobname like 'b12%';
