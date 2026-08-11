-- =====================================================================
-- LCKP — como a escola chama a divisão física dos armários
-- Rodar no SQL Editor do Supabase. Idempotente.
-- =====================================================================
--
-- A coluna `lockers.corredor` sempre existiu, mas a palavra exibida estava
-- escrita fixa como "Bloco" em sete telas: mapa do aluno, modal de escolha,
-- checkout, Meu Armário, gerenciamento, histórico e o relatório em PDF.
--
-- Escola que fala "corredor" via "Bloco 3" em todo lugar, e não havia como
-- mudar sem editar código. Vira configuração da instituição, junto com tipo
-- de matrícula, datas do ciclo e limite de armários.
--
-- É só o RÓTULO. O dado continua em `lockers.corredor` — nada de renomear
-- coluna, que quebraria todo o código por uma questão de vocabulário.

ALTER TABLE schools ADD COLUMN IF NOT EXISTS rotulo_corredor TEXT NOT NULL DEFAULT 'bloco';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_rotulo_corredor_valido') THEN
    ALTER TABLE schools ADD CONSTRAINT schools_rotulo_corredor_valido
      CHECK (rotulo_corredor IN ('bloco', 'corredor'));
  END IF;
END $$;

-- O default é 'bloco' porque é a palavra que já aparecia nas telas: assim
-- nenhuma escola existente vê o texto mudar sozinho depois da migração.

-- Conferência:
--   SELECT codigo, name, rotulo_corredor FROM schools ORDER BY codigo;
