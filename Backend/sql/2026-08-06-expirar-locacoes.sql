-- =====================================================================
-- LCKP — Expiração de locações não pagas
--
-- Problema: um Pix abandonado deixa a locação 'pendente' para sempre. O
-- risco real não é lixo no banco — é o aluno pagar o QR horas depois, o
-- webhook chegar e o armário ser vinculado quando outra pessoa já o levou.
--
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

-- Prazo para o pagamento chegar. Passou disso, a locação vira 'expirado' e
-- deixa de ser candidata a aprovação.
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS expira_em TIMESTAMPTZ;

-- Locações antigas (se houver) recebem um prazo a partir da criação.
UPDATE rentals
   SET expira_em = data_aluguel + INTERVAL '30 minutes'
 WHERE expira_em IS NULL;

-- Consulta da varredura: pendentes já vencidas.
CREATE INDEX IF NOT EXISTS rentals_pendentes_vencidas
    ON rentals (status_pagamento, expira_em)
 WHERE status_pagamento = 'pendente';

-- ---------------------------------------------------------------------
-- Varredura
-- ---------------------------------------------------------------------
-- Marca como 'expirado' toda locação pendente cujo prazo passou.
-- Não mexe em armário: o vínculo só é criado quando o pagamento é aprovado
-- (fn_liberar_armario_apos_aprovacao), então uma pendente nunca ocupou nada.
CREATE OR REPLACE FUNCTION fn_expirar_locacoes_pendentes()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  afetadas integer;
BEGIN
  UPDATE rentals
     SET status_pagamento = 'expirado'
   WHERE status_pagamento = 'pendente'
     AND expira_em IS NOT NULL
     AND expira_em < NOW();

  GET DIAGNOSTICS afetadas = ROW_COUNT;
  RETURN afetadas;
END;
$$;

-- ---------------------------------------------------------------------
-- Agendamento (opcional)
-- ---------------------------------------------------------------------
-- O backend já varre sob demanda a cada checkout e a cada consulta de status,
-- o que basta para o fluxo normal. O agendamento abaixo cobre o caso de
-- ninguém acessar o sistema por um longo período.
-- Requer a extensão pg_cron habilitada no projeto Supabase.
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   SELECT cron.schedule(
--     'expirar-locacoes-lckp',
--     '*/10 * * * *',
--     $cron$ SELECT fn_expirar_locacoes_pendentes(); $cron$
--   );
