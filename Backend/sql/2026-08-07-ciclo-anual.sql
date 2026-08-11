-- =====================================================================
-- LCKP — Ciclo letivo anual e limite de armários
--
-- Regra do calendário escolar:
--   20/12  encerra o uso. Os armários DESVINCULAM dos alunos, mas o
--          histórico de quem usou cada um permanece em rentals.
--   01/02  abre o ano. Os armários voltam a ser compráveis.
--
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. LIMITE DE ARMÁRIOS POR ALUNO
-- ---------------------------------------------------------------------
-- Era 1, fixo no código. Vira configuração da escola: a ETEC Bento Quirino
-- passa a permitir 2. O limite continua existindo — sem ele volta o bug de
-- o aluno pagar duas vezes pelo MESMO armário, que é problema diferente de
-- alugar dois armários distintos.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS max_armarios_por_aluno SMALLINT NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_max_armarios_valido') THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_max_armarios_valido
      CHECK (max_armarios_por_aluno BETWEEN 1 AND 5);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. CICLO LETIVO
-- ---------------------------------------------------------------------
-- Datas configuráveis por escola: nem toda instituição segue o mesmo
-- calendário. Guardadas como dia e mês, porque a regra se repete todo ano.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS encerramento_dia SMALLINT NOT NULL DEFAULT 20;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS encerramento_mes SMALLINT NOT NULL DEFAULT 12;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS abertura_dia SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS abertura_mes SMALLINT NOT NULL DEFAULT 2;

-- Marca em que ciclo a locação aconteceu. Sem isso, o relatório de 2025
-- dependeria de inferir o ano pela data — e uma locação de janeiro pertence
-- ao ciclo anterior, não ao que começa em fevereiro.
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS ano_letivo SMALLINT;

UPDATE rentals
   SET ano_letivo = EXTRACT(YEAR FROM data_aluguel)::smallint
 WHERE ano_letivo IS NULL;

CREATE INDEX IF NOT EXISTS rentals_por_ano_letivo
    ON rentals (school_id, ano_letivo)
 WHERE status_pagamento = 'aprovado';

-- Registra quando o armário foi devolvido no encerramento do ciclo.
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS encerrado_em TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 3. ENCERRAMENTO DO CICLO
-- ---------------------------------------------------------------------
-- Desvincula os armários da escola e libera para o próximo ano.
-- NÃO apaga nem altera o histórico: quem usou cada armário fica em rentals,
-- que passa a ser a única fonte dessa informação depois que o vínculo em
-- lockers some.
CREATE OR REPLACE FUNCTION fn_encerrar_ciclo_escola(p_school_id UUID)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  liberados integer;
BEGIN
  UPDATE rentals
     SET encerrado_em = NOW()
   WHERE school_id = p_school_id
     AND status_pagamento = 'aprovado'
     AND encerrado_em IS NULL;

  UPDATE lockers
     SET usuario_id = NULL,
         usuario_nome = NULL,
         status = 'disponivel'
   WHERE school_id = p_school_id
     AND usuario_id IS NOT NULL;

  GET DIAGNOSTICS liberados = ROW_COUNT;
  RETURN liberados;
END;
$$;

-- Encerra o ciclo de toda escola cuja data de encerramento já passou e que
-- ainda tem armário vinculado. Seguro para rodar todo dia.
CREATE OR REPLACE FUNCTION fn_encerrar_ciclos_vencidos()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  escola RECORD;
  total integer := 0;
BEGIN
  FOR escola IN
    SELECT s.id, s.encerramento_dia, s.encerramento_mes
      FROM schools s
     WHERE EXISTS (
       SELECT 1 FROM lockers l WHERE l.school_id = s.id AND l.usuario_id IS NOT NULL
     )
  LOOP
    IF (EXTRACT(MONTH FROM NOW())::int > escola.encerramento_mes)
       OR (EXTRACT(MONTH FROM NOW())::int = escola.encerramento_mes
           AND EXTRACT(DAY FROM NOW())::int >= escola.encerramento_dia)
    THEN
      total := total + fn_encerrar_ciclo_escola(escola.id);
    END IF;
  END LOOP;

  RETURN total;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. AGENDAMENTO
-- ---------------------------------------------------------------------
-- O backend também chama a varredura sob demanda, então o agendamento é
-- reforço para o período de férias, quando ninguém acessa o sistema.
-- Requer pg_cron habilitado no projeto Supabase.
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   SELECT cron.schedule(
--     'encerrar-ciclo-lckp',
--     '0 3 * * *',
--     $cron$ SELECT fn_encerrar_ciclos_vencidos(); $cron$
--   );

-- ---------------------------------------------------------------------
-- 5. ETEC BENTO QUIRINO — dois armários por aluno
-- ---------------------------------------------------------------------
-- APLICADO EM PRODUÇÃO em 2026-08-07. Continua comentado de propósito: é
-- alteração de dado de UMA escola, não de schema. Num banco novo, rodar a
-- migração inteira não deve mexer no limite de nenhuma instituição.
--
--   UPDATE schools
--      SET max_armarios_por_aluno = 2
--    WHERE codigo = 'etec-043';
