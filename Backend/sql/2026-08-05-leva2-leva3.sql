-- =====================================================================
-- LCKP — Levas 2 e 3
-- 1) Gateway de pagamento por escola (PagBank para a ETEC Bento Quirino,
--    Mercado Pago para todas as demais)
-- 2) Até duas logos por escola, com posição configurável
-- 3) Matrícula do aluno (RA ou RM, conforme a escola) como senha padrão
--
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. GATEWAY DE PAGAMENTO POR ESCOLA
-- ---------------------------------------------------------------------

-- Padrão 'mercadopago': nenhuma escola existente muda de comportamento.
-- Só a ETEC Bento Quirino recebe 'pagbank' por enquanto.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gateway TEXT NOT NULL DEFAULT 'mercadopago';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_gateway_valido') THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_gateway_valido
      CHECK (gateway IN ('mercadopago', 'pagbank'));
  END IF;
END $$;

-- Credencial da conta PagBank DA PRÓPRIA ESCOLA. Guardada cifrada
-- (AES-256-GCM, ver src/utils/cripto.js) — nunca em texto puro, nunca no
-- código, nunca devolvida ao front. Como o dinheiro cai direto na conta da
-- instituição, não há split nem application_fee neste fluxo.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS pagbank_token_cifrado TEXT;

-- 'sandbox' ou 'producao'. Decide a URL base da API do PagBank.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS pagbank_ambiente TEXT NOT NULL DEFAULT 'sandbox';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_pagbank_ambiente_valido') THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_pagbank_ambiente_valido
      CHECK (pagbank_ambiente IN ('sandbox', 'producao'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. ATÉ DUAS LOGOS, COM POSIÇÃO CONFIGURÁVEL
-- ---------------------------------------------------------------------

-- logo_url (já existente) passa a ser a logo 1.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_2_url TEXT;

-- Onde cada logo aparece na navbar: 'esquerda', 'direita' ou 'nenhum'.
-- Nao ha rodape nas telas autenticadas: as duas logos vivem na barra do topo.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_1_posicao TEXT NOT NULL DEFAULT 'esquerda';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_2_posicao TEXT NOT NULL DEFAULT 'nenhum';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_logo_1_posicao_valida') THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_logo_1_posicao_valida
      CHECK (logo_1_posicao IN ('esquerda', 'direita', 'nenhum'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_logo_2_posicao_valida') THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_logo_2_posicao_valida
      CHECK (logo_2_posicao IN ('esquerda', 'direita', 'nenhum'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. MATRÍCULA DO ALUNO (RA OU RM)
-- ---------------------------------------------------------------------

-- Cada escola usa uma nomenclatura. A ETEC Bento Quirino usa RM.
-- Isto é só o RÓTULO exibido; o valor em si vive em users.matricula.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS tipo_matricula TEXT NOT NULL DEFAULT 'rm';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_tipo_matricula_valido') THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_tipo_matricula_valido
      CHECK (tipo_matricula IN ('ra', 'rm'));
  END IF;
END $$;

-- RA/RM do aluno. É o que vira a SENHA PADRÃO do primeiro acesso — por isso
-- nunca é devolvido nas listagens públicas de usuário.
-- NULL-able porque admin e superadmin não têm matrícula.
ALTER TABLE users ADD COLUMN IF NOT EXISTS matricula TEXT;

-- Duas escolas podem ter alunos com o mesmo RM; dentro da MESMA escola, não.
CREATE UNIQUE INDEX IF NOT EXISTS users_matricula_por_escola
  ON users (school_id, matricula)
  WHERE matricula IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. ETEC BENTO QUIRINO — escola piloto
-- ---------------------------------------------------------------------
-- Sem comissão e sem split: o Pedro cobra apenas custo de servidor, por fora
-- do sistema. 100% do valor pago pelo aluno cai na conta PagBank da APM.
--
-- Rode DEPOIS de cadastrar a escola pelo painel do superadmin.
-- O token do PagBank NÃO vai aqui: ele é cifrado pela aplicação e gravado
-- via a tela do superadmin. Colar credencial em arquivo .sql versionado
-- seria vazá-la no git.
--
--   UPDATE schools
--      SET gateway          = 'pagbank',
--          pagbank_ambiente = 'sandbox',   -- trocar para 'producao' na virada
--          taxa_comissao    = 0,
--          tipo_matricula   = 'rm'
--    WHERE codigo = 'etec-043';
