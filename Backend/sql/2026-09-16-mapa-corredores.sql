-- Mapa de corredores: planta, corredores e a parede de cada um.
--
-- POR QUE TABELAS E NÃO UM JSON NA ESCOLA. Cada armário passa a apontar para
-- o bloco onde está e para a coluna e a linha dentro dele. Com isso a parede
-- mostra o armário no lugar físico certo mesmo quando a numeração da escola
-- pula (o 577-588 do Bento Quirino fica entre o 256 e o 257).
--
-- Nenhuma escola muda de tela ao aplicar esta migração: sem linhas em
-- `corredores`, o portal continua mostrando a grade de armários.

CREATE TABLE IF NOT EXISTS plantas (
  school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  colunas_deitada TEXT NOT NULL,
  linhas_deitada TEXT NOT NULL,
  colunas_estreita TEXT NOT NULL,
  linhas_estreita TEXT NOT NULL,
  patio_area_deitada TEXT NOT NULL,
  patio_area_estreita TEXT NOT NULL,
  patio_recuo_deitada TEXT,
  patio_recuo_estreita TEXT
);

CREATE TABLE IF NOT EXISTS corredores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  nome_curto TEXT,
  sigla TEXT NOT NULL,
  cor TEXT NOT NULL CHECK (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem SMALLINT NOT NULL DEFAULT 0,
  area_deitada TEXT NOT NULL,
  area_estreita TEXT NOT NULL,
  UNIQUE (school_id, codigo)
);

CREATE TABLE IF NOT EXISTS corredor_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corredor_id UUID NOT NULL REFERENCES corredores(id) ON DELETE CASCADE,
  ordem SMALLINT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'portal', 'porta', 'bloco', 'fundo', 'fim',
    'hidrante', 'extintor', 'lixeira', 'mural', 'quadro', 'rampa'
  )),
  numero TEXT,
  rotulo TEXT,
  variante TEXT CHECK (variante IS NULL OR variante IN ('laboratorio', 'estoque', 'vidro')),
  tom TEXT CHECK (tom IS NULL OR tom IN ('claro', 'escuro')),
  larguras SMALLINT[],
  -- bloco sem tom ou sem colunas não tem como ser desenhado
  CHECK (tipo <> 'bloco' OR (tom IS NOT NULL AND coalesce(cardinality(larguras), 0) > 0)),
  UNIQUE (corredor_id, ordem)
);

CREATE INDEX IF NOT EXISTS corredores_school_idx ON corredores (school_id);

ALTER TABLE lockers ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES corredor_itens(id) ON DELETE SET NULL;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS coluna SMALLINT;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS linha SMALLINT;

-- Dois armários não ocupam a mesma porta.
CREATE UNIQUE INDEX IF NOT EXISTS lockers_posicao_unica
  ON lockers (item_id, coluna, linha)
  WHERE item_id IS NOT NULL;

ALTER TABLE schools ADD COLUMN IF NOT EXISTS mapa_estilo JSONB;

COMMENT ON COLUMN schools.mapa_estilo IS
  'Cores do mapa de corredores escolhidas pelo admin. NULL = tema escuro padrão.';

-- Mesmo regime de lockers e rentals: só o backend, com a service role, acessa.
ALTER TABLE plantas ENABLE ROW LEVEL SECURITY;
ALTER TABLE corredores ENABLE ROW LEVEL SECURITY;
ALTER TABLE corredor_itens ENABLE ROW LEVEL SECURITY;

-- Conferência.
SELECT table_name FROM information_schema.tables
 WHERE table_name IN ('plantas', 'corredores', 'corredor_itens');
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'lockers' AND column_name IN ('item_id', 'coluna', 'linha');
