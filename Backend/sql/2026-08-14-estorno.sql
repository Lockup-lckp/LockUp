-- =====================================================================
-- LCKP — estorno como lançamento, não como exclusão
-- Rodar no SQL Editor do Supabase. Idempotente.
-- =====================================================================
--
-- Antes, remover o aluno do armário oferecia apagar a locação do histórico.
-- Isso escondia que houve movimento: o extrato ficava igual ao de um aluno
-- que nunca comprou, e a diferença só aparecia na conta bancária.
--
-- Agora a devolução vira um LANÇAMENTO PRÓPRIO, com valor negativo, apontando
-- para a locação original. O extrato passa a mostrar as duas linhas — a
-- cobrança e a devolução — e o total do ciclo cai pelo valor devolvido.
--
-- É o que a contabilidade chama de lançamento compensatório: não se apaga o
-- que aconteceu, registra-se o que desfez.

-- ---------------------------------------------------------------------
-- 1. De qual locação este estorno é
-- ---------------------------------------------------------------------
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS estorno_de UUID REFERENCES rentals(id) ON DELETE SET NULL;

-- "Esta locação já foi estornada?" é a pergunta que a tela faz a cada linha
-- do histórico.
CREATE INDEX IF NOT EXISTS rentals_estorno_de ON rentals (estorno_de) WHERE estorno_de IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Por que o estorno NÃO usa status 'aprovado'
-- ---------------------------------------------------------------------
-- O gatilho `fn_liberar_armario_apos_aprovacao` vincula o armário ao aluno
-- quando uma locação fica 'aprovado'. Um estorno gravado com esse status
-- REVINCULARIA o armário ao aluno que acabou de ser removido — exatamente o
-- oposto do pretendido.
--
-- Por isso o estorno usa `status_pagamento = 'estorno'`, que o gatilho ignora.
-- Não há CHECK nessa coluna, então nenhuma alteração de restrição é necessária.
--
-- Consequência: toda consulta de faturamento precisa somar 'aprovado' E
-- 'estorno'. Como o valor do estorno é negativo, a soma já dá o líquido.

COMMENT ON COLUMN rentals.estorno_de IS
  'Quando preenchido, esta linha e a devolucao da locacao apontada. Valor negativo, status_pagamento = estorno.';

-- ---------------------------------------------------------------------
-- 3. Conferência
-- ---------------------------------------------------------------------
-- Faturamento líquido por ciclo, já descontando devoluções:
--
--   SELECT ano_letivo,
--          SUM(valor) FILTER (WHERE status_pagamento = 'aprovado') AS cobrado,
--          SUM(valor) FILTER (WHERE status_pagamento = 'estorno')  AS devolvido,
--          SUM(valor) FILTER (WHERE status_pagamento IN ('aprovado','estorno')) AS liquido
--     FROM rentals
--    GROUP BY ano_letivo
--    ORDER BY ano_letivo DESC;
