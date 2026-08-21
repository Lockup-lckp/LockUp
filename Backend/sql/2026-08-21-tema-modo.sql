-- Modo do tema por instituição: claro, escuro ou automático.
--
-- POR QUE EXISTE. Até aqui o sistema DEDUZIA o modo pela luminância do fundo
-- que a escola escolheu: acima de 0,45 é claro, abaixo é escuro. A dedução
-- decide a direção das superfícies — no tema escuro o cartão é mais claro que
-- a página; no claro, mais escuro. Errar essa direção deixa cartão branco
-- sobre página branca.
--
-- A dedução acerta nos extremos e erra no meio. Um fundo ameixa médio
-- (#623E55, luminância 0,09) é lido como escuro, mas uma escola pode querer
-- que ele se comporte como base clara. Quem sabe é a instituição, não a conta.
--
-- 'auto' continua sendo o padrão e mantém EXATAMENTE o comportamento atual.
-- Nenhuma escola existente muda de aparência ao aplicar esta migração.
--
-- Ver: front/src/theme/aplicarTema.js (a constante `claro`)

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS tema_modo TEXT NOT NULL DEFAULT 'auto';

-- CHECK e não enum: valor novo no futuro (ex.: 'alto-contraste') vira uma
-- alteração de constraint, não uma migração de tipo com dependências.
--
-- DROP antes de ADD para a migração poder ser rodada duas vezes sem erro --
-- ADD CONSTRAINT não aceita IF NOT EXISTS no Postgres.
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_tema_modo_valido;
ALTER TABLE schools
  ADD CONSTRAINT schools_tema_modo_valido
  CHECK (tema_modo IN ('auto', 'claro', 'escuro'));

COMMENT ON COLUMN schools.tema_modo IS
  'Direção das superfícies do tema. auto = deduz pela luminância de bg_color (padrão).';

-- Conferência.
SELECT codigo, name, bg_color, tema_modo FROM schools ORDER BY codigo;
