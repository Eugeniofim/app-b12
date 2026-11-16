-- ============================================================================
-- A EQUIPE DEPOSITA, MAS NUNCA LÊ O CAIXA          16/11/2026
--
-- O buraco: `b12_lancamentos` só respondia para o dono — nem ler, nem gravar.
-- Então o aparelho da funcionária do receptivo nunca mandava o dinheiro que
-- ela recebia no balcão. Ela atendia, o app criava a entrada no caixa DELA, e
-- aquilo morria no aparelho: o Dhalsin via a reserva com o valor, mas o Caixa
-- dele não via o dinheiro entrar. Num dia cheio, é o faturamento sumindo.
--
-- A regra de segurança NÃO muda: a equipe continua sem enxergar uma linha do
-- caixa. O que entra é só o direito de DEPOSITAR — INSERT, e nada mais.
--
-- Por que isso é seguro no Postgres: sem política de SELECT, a equipe não lê
-- nem o que ela mesma acabou de gravar. É a mesma mecânica que, em 12/11, fez
-- o insert do turista falhar quando o app pedia a linha de volta — aqui ela
-- trabalha a nosso favor. O app manda `Prefer: return=minimal` e sem upsert.
--
-- E o depósito é estreito de propósito: só ENTRADA, e só nas categorias que o
-- balcão de fato cobra. A equipe não lança despesa, não lança investimento e
-- não mexe em nada que já esteja gravado.
-- ============================================================================

drop policy if exists lanc_equipe_deposita on public.b12_lancamentos;

create policy lanc_equipe_deposita on public.b12_lancamentos
  for insert to authenticated
  with check (
    public.b12_e_equipe()
    and coalesce(dados->>'tipo', '') = 'entrada'
    and coalesce(dados->>'cat', '') in ('Travessias', 'Estacionamento', 'Bar e loja')
  );

-- Conferência, para rodar depois e dormir tranquilo:
--
--   select polname, polcmd
--   from pg_policy
--   where polrelid = 'public.b12_lancamentos'::regclass
--   order by polname;
--
-- Tem de aparecer DUAS: `lanc_dono` (cmd *) e `lanc_equipe_deposita` (cmd a).
-- Se algum dia aparecer uma de SELECT para equipe, o caixa vazou.
