-- =====================================================================
-- LCKP — locação anual ou semestral, e contrato por escola
-- Rodar no SQL Editor do Supabase. Idempotente.
-- =====================================================================
--
-- Veio do contrato real da APM Etec Bento Quirino, que oferece:
--
--     ( ) Anual (até 18/12/2026)      ( ) Semestral (até 06/07/2026)
--
-- O sistema só sabia de UM ciclo por ano. Não havia como vender meio ano,
-- nem cobrar preço diferente, nem encerrar duas turmas em datas diferentes.

-- ---------------------------------------------------------------------
-- 1. A escola oferece semestral?
-- ---------------------------------------------------------------------
ALTER TABLE schools ADD COLUMN IF NOT EXISTS permite_semestral BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS valor_armario_semestral NUMERIC(10,2);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS encerramento_semestral_dia SMALLINT NOT NULL DEFAULT 6;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS encerramento_semestral_mes SMALLINT NOT NULL DEFAULT 7;

-- Oferecer semestral sem preço faria o checkout cobrar NULL. Melhor o banco
-- recusar a configuração do que o aluno descobrir na hora de pagar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_semestral_exige_valor') THEN
    ALTER TABLE schools ADD CONSTRAINT schools_semestral_exige_valor
      CHECK (permite_semestral = false OR valor_armario_semestral IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Cada locação carrega a própria validade
-- ---------------------------------------------------------------------
-- `valido_ate` é gravado na COMPRA, não deduzido depois.
--
-- Sem ele, o encerramento teria de olhar a configuração atual da escola para
-- decidir se uma locação venceu — e aí mudar a data de encerramento em 2027
-- reescreveria retroativamente quando as locações de 2026 terminaram. Com a
-- data na própria linha, o que foi vendido fica registrado como foi vendido.
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS modalidade TEXT NOT NULL DEFAULT 'anual';
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS valido_ate DATE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rentals_modalidade_valida') THEN
    ALTER TABLE rentals ADD CONSTRAINT rentals_modalidade_valida
      CHECK (modalidade IN ('anual', 'semestral'));
  END IF;
END $$;

-- Locações antigas: todas eram anuais, e vencem no encerramento da escola.
UPDATE rentals r
   SET valido_ate = MAKE_DATE(
         COALESCE(r.ano_letivo, EXTRACT(YEAR FROM r.data_aluguel)::INT),
         COALESCE(s.encerramento_mes, 12),
         COALESCE(s.encerramento_dia, 20))
  FROM schools s
 WHERE r.school_id = s.id
   AND r.valido_ate IS NULL;

CREATE INDEX IF NOT EXISTS rentals_valido_ate
    ON rentals (valido_ate)
 WHERE status_pagamento = 'aprovado' AND encerrado_em IS NULL;

-- ---------------------------------------------------------------------
-- 3. Contrato da escola
-- ---------------------------------------------------------------------
-- Cada instituição tem o próprio contrato. O da Bento Quirino é entre o aluno
-- e a APM — não entre o aluno e a LCKP —, então não há texto único possível.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS contrato_texto TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS contrato_titulo TEXT;

-- ---------------------------------------------------------------------
-- 4. Encerramento por locação, não por escola
-- ---------------------------------------------------------------------
-- Antes: a função desvinculava TODOS os armários da escola na data dela.
-- Com semestral isso liberaria em julho também quem pagou o ano inteiro.
-- Agora cada locação vence na própria `valido_ate`.
CREATE OR REPLACE FUNCTION fn_encerrar_ciclos_vencidos()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INTEGER := 0;
BEGIN
  -- Carimba as locações vencidas. O histórico NUNCA é apagado: depois que o
  -- vínculo sai de `lockers`, `rentals` é a única fonte de quem usou cada
  -- armário.
  WITH vencidas AS (
    UPDATE rentals
       SET encerrado_em = NOW()
     WHERE status_pagamento = 'aprovado'
       AND encerrado_em IS NULL
       AND valido_ate IS NOT NULL
       AND valido_ate < CURRENT_DATE
    RETURNING locker_id
  )
  UPDATE lockers l
     SET usuario_id = NULL,
         usuario_nome = NULL,
         status = 'disponivel'
    FROM vencidas v
   WHERE l.id = v.locker_id
     -- Armário de funcionário não segue ciclo letivo: é cedido, não alugado.
     AND l.status = 'alugado';

  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. ETEC Bento Quirino — conforme o contrato da APM
-- ---------------------------------------------------------------------
-- O contrato diz 18/12 (anual) e 06/07 (semestral). O sistema estava com
-- 20/12: dois dias em que ele considerava a locação válida e o contrato não.
UPDATE schools
   SET encerramento_dia = 18,
       encerramento_mes = 12,
       encerramento_semestral_dia = 6,
       encerramento_semestral_mes = 7,
       rotulo_corredor = 'corredor'
 WHERE codigo = 'etec-043';

-- ATENÇÃO: `permite_semestral` NÃO é ligado aqui. A restrição da seção 1 exige
-- que o preço semestral exista antes, e ele ainda não foi combinado com a APM.
-- Quando souber o valor, rode as duas linhas juntas:
--
--   UPDATE schools
--      SET valor_armario_semestral = 60.00, permite_semestral = true
--    WHERE codigo = 'etec-043';

-- Conferência:
--   SELECT codigo, valor_armario, valor_armario_semestral, permite_semestral,
--          encerramento_dia, encerramento_mes,
--          encerramento_semestral_dia, encerramento_semestral_mes,
--          contrato_texto IS NOT NULL AS tem_contrato
--     FROM schools ORDER BY codigo;
