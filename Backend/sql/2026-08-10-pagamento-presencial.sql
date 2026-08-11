-- =====================================================================
-- LCKP — locação paga na secretaria entra no extrato
-- Rodar no SQL Editor do Supabase. Idempotente.
-- =====================================================================
--
-- Quando o aluno paga presencialmente (dinheiro, ou porque o pagamento online
-- falhou), a secretaria vincula o armário pela tela de gerenciamento. Esse
-- vínculo NÃO gerava registro nenhum em `rentals`: o armário sumia do extrato
-- e o relatório anual saía MENOR que o faturamento real da escola.
--
-- A partir daqui o backend cria a locação junto com o vínculo, pelo mesmo
-- valor que a escola cobra. Esta coluna diz de onde veio.

ALTER TABLE rentals ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'online';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_origem_valida') THEN
    ALTER TABLE rentals ADD CONSTRAINT rentals_origem_valida
      CHECK (origem IN ('online', 'presencial'));
  END IF;
END $$;

-- Default 'online' porque toda locação existente veio de gateway. Nenhuma
-- linha antiga é reclassificada.

-- ---------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------
-- Quanto de cada origem, por ciclo — é a diferença entre o que entrou pelo
-- sistema e o que passou pelo balcão:
--
--   SELECT ano_letivo, origem, COUNT(*) AS locacoes, SUM(valor) AS total
--     FROM rentals
--    WHERE status_pagamento = 'aprovado'
--    GROUP BY ano_letivo, origem
--    ORDER BY ano_letivo DESC, origem;
