-- =====================================================================
-- Estação B12 — apagar nunca joga o conteúdo fora (26/10/2026)
--
-- O app (v1.87) já manda o último conteúdo junto com o "apagado". Esta trava
-- é a segunda camada, no banco: se chegar um "apagado" com dados VAZIOS
-- (versão velha do app, ou o defeito das duas janelas), o banco mantém o
-- conteúdo que já tinha. NÃO APAGA NADA: só acrescenta um gatilho.
-- (Escrito, ainda NÃO rodado no banco.)
-- =====================================================================
create or replace function public.b12_apagar_guarda() returns trigger
language plpgsql as $$
begin
  if new.apagado and (new.dados is null or new.dados = '{}'::jsonb) then
    new.dados = old.dados;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['reservas','clientes','saidas','patio','lancamentos',
                           'contas','manutencoes','marinheiros','tarefas']
  loop
    execute format($f$
      drop trigger if exists b12_%1$s_apagar_guarda on public.b12_%1$s;
      create trigger b12_%1$s_apagar_guarda before update on public.b12_%1$s
        for each row execute function public.b12_apagar_guarda();
    $f$, t);
  end loop;
end $$;
