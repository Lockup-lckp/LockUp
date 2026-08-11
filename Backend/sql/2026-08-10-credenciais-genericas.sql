-- =====================================================================
-- LCKP — credenciais genéricas por gateway e modelo de recebimento
-- Rodar no SQL Editor do Supabase. Idempotente.
-- =====================================================================
--
-- POR QUE ESTA MIGRAÇÃO EXISTE
--
-- Até aqui cada gateway ganhava colunas próprias: o PagBank trouxe
-- `pagbank_token_cifrado` e `pagbank_ambiente`. O Banco do Brasil traria
-- client_id, client_secret, convênio e chave Pix — mais uma migração, e mais
-- edições em todo lugar que lista essas colunas pelo nome. Não escala.
--
-- Aqui a credencial vira UM campo: um JSON cifrado com AES-256-GCM, onde cada
-- gateway guarda o que precisa. Banco novo passa a exigir apenas o adaptador.
--
-- E o modelo de recebimento deixa de ser implícito. Hoje ele está escondido no
-- código: o caminho do Mercado Pago usa a conta da LCKP com split, e o do
-- PagBank usa a conta da própria escola. São modelos opostos, e nada no banco
-- dizia qual é qual.

-- ---------------------------------------------------------------------
-- 1. Credencial genérica
-- ---------------------------------------------------------------------
-- TEXT e não JSONB: o conteúdo é o pacote cifrado "iv:tag:cifrado". Guardar
-- como JSONB exigiria deixar as chaves em texto puro para o Postgres indexar,
-- que é exatamente o que a cifragem existe para evitar.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS credenciais_gateway_cifrado TEXT;

-- Rótulo legível, para PESSOA. O sistema já diferencia escolas pela linha —
-- isto é para o superadmin saber qual conta está ativa quando uma escola troca
-- de banco (a ETEC sai do PagBank para o Banco do Brasil).
ALTER TABLE schools ADD COLUMN IF NOT EXISTS credencial_rotulo TEXT;

-- Ambiente deixa de ter nome de gateway.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gateway_ambiente TEXT NOT NULL DEFAULT 'producao';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_gateway_ambiente_valido') THEN
    ALTER TABLE schools ADD CONSTRAINT schools_gateway_ambiente_valido
      CHECK (gateway_ambiente IN ('sandbox', 'producao'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Modelo de recebimento — explícito
-- ---------------------------------------------------------------------
--   'direto' → a credencial é da conta da PRÓPRIA escola. O dinheiro cai lá e
--              NUNCA passa pela LCKP. Comissão automática é impossível neste
--              modelo: não há por onde descontar. Se houver acordo comercial,
--              ele é cobrado fora do sistema (caso da ETEC Bento Quirino).
--   'split'  → o pagamento passa pela conta da LCKP e é dividido na hora, com
--              a escola como recebedora (`gateway_recipient_id`). É onde a
--              `taxa_comissao` funciona de verdade.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS modelo_recebimento TEXT NOT NULL DEFAULT 'direto';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_modelo_recebimento_valido') THEN
    ALTER TABLE schools ADD CONSTRAINT schools_modelo_recebimento_valido
      CHECK (modelo_recebimento IN ('direto', 'split'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. Retrato do estado atual — ANTES de alterar nada
-- ---------------------------------------------------------------------
-- Rode isto e guarde o resultado. É o retrato de para onde o dinheiro de cada
-- escola vai hoje, e serve de conferência depois da migração.
--
--   SELECT codigo, name, gateway, taxa_comissao,
--          gateway_recipient_id IS NOT NULL AS tem_recebedor,
--          pagbank_token_cifrado IS NOT NULL AS tem_token_pagbank,
--          pagbank_ambiente
--     FROM schools
--    ORDER BY gateway, codigo;

-- ---------------------------------------------------------------------
-- 4. Backfill do modelo de recebimento
-- ---------------------------------------------------------------------
-- Quem tem recebedor configurado está no modelo de split.
UPDATE schools
   SET modelo_recebimento = 'split'
 WHERE gateway_recipient_id IS NOT NULL
   AND modelo_recebimento <> 'split';

-- Quem usa a própria conta (PagBank com token) está no modelo direto.
UPDATE schools
   SET modelo_recebimento = 'direto'
 WHERE gateway = 'pagbank'
   AND pagbank_token_cifrado IS NOT NULL
   AND gateway_recipient_id IS NULL;

-- ---------------------------------------------------------------------
-- 5. Migração das credenciais do PagBank para o formato genérico
-- ---------------------------------------------------------------------
-- O valor cifrado NÃO é redecifrado aqui: o Postgres não tem a chave
-- (CREDENCIAIS_SECRET vive só no backend). O que muda é o ENVELOPE.
--
-- Por isso a coluna antiga CONTINUA existindo e o backend lê as duas: enquanto
-- `credenciais_gateway_cifrado` estiver vazio, ele cai em `pagbank_token_cifrado`.
-- A reescrita no formato novo acontece na primeira vez que o superadmin salvar
-- a credencial daquela escola, que é quando o backend tem a chave em mãos.
--
-- Consequência prática: nada quebra no meio, e não existe janela em que a ETEC
-- fique sem conseguir cobrar.

-- Ambiente pode ser copiado direto: não é segredo.
UPDATE schools
   SET gateway_ambiente = pagbank_ambiente
 WHERE pagbank_ambiente IS NOT NULL
   AND pagbank_ambiente IN ('sandbox', 'producao');

-- Rótulo inicial, só para o painel não ficar em branco.
UPDATE schools
   SET credencial_rotulo = 'Conta ' || UPPER(gateway) || ' — ' || name
 WHERE credencial_rotulo IS NULL
   AND (pagbank_token_cifrado IS NOT NULL OR gateway_recipient_id IS NOT NULL);

-- ---------------------------------------------------------------------
-- 6. Como a comissão é cobrada
-- ---------------------------------------------------------------------
-- A comissão existe nos DOIS modelos — o que muda é COMO ela chega até a LCKP:
--
--   'automatica' → descontada no ato pelo gateway, via split. Só funciona onde
--                  o dinheiro passa pela conta da LCKP (hoje, Mercado Pago).
--   'faturada'   → o dinheiro vai inteiro para a escola e a LCKP fatura o
--                  acordado no fim do mês, fora do sistema. É o que permite
--                  usar QUALQUER banco sem precisar que ele suporte split.
--
-- `taxa_comissao` continua sendo a fração combinada em ambos os casos. No
-- modelo faturado ela deixa de ser executada pelo gateway e passa a ser a base
-- do relatório de faturamento — por isso NÃO pode ser zerada.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS cobranca_comissao TEXT NOT NULL DEFAULT 'faturada';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_cobranca_comissao_valida') THEN
    ALTER TABLE schools ADD CONSTRAINT schools_cobranca_comissao_valida
      CHECK (cobranca_comissao IN ('automatica', 'faturada'));
  END IF;
END $$;

-- Comissão automática exige que o dinheiro passe pela LCKP. A recíproca não
-- vale: quem está em split pode, se preferir, faturar por fora.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_automatica_exige_split') THEN
    ALTER TABLE schools ADD CONSTRAINT schools_automatica_exige_split
      CHECK (cobranca_comissao <> 'automatica' OR modelo_recebimento = 'split');
  END IF;
END $$;

-- Quem já está em split e tem taxa configurada segue com desconto automático:
-- é o comportamento que o Mercado Pago aplica hoje, e mudá-lo aqui alteraria
-- silenciosamente para onde o dinheiro vai.
UPDATE schools
   SET cobranca_comissao = 'automatica'
 WHERE modelo_recebimento = 'split'
   AND COALESCE(taxa_comissao, 0) > 0;

-- ---------------------------------------------------------------------
-- 7. Conferência — rodar DEPOIS
-- ---------------------------------------------------------------------
--   SELECT codigo, name, gateway, modelo_recebimento, taxa_comissao,
--          gateway_ambiente, credencial_rotulo,
--          credenciais_gateway_cifrado IS NOT NULL AS formato_novo,
--          pagbank_token_cifrado IS NOT NULL      AS formato_antigo
--     FROM schools
--    ORDER BY modelo_recebimento, codigo;
--
-- ATENÇÃO ao que essa consulta revela: escola com gateway 'mercadopago' e
-- `gateway_recipient_id` nulo cobra pela conta da LCKP e o dinheiro fica
-- INTEIRO com você — não é modelo, é configuração incompleta. Vale conferir
-- uma a uma antes de qualquer escola nova começar a vender.

-- ---------------------------------------------------------------------
-- 8. Limpeza — NÃO rodar agora
-- ---------------------------------------------------------------------
-- Só depois que TODA escola tiver `credenciais_gateway_cifrado` preenchido
-- (ou seja, depois de salvar a credencial de cada uma pelo painel). Enquanto
-- houver uma escola no formato antigo, remover estas colunas apaga a única
-- credencial que ela tem.
--
--   ALTER TABLE schools DROP COLUMN IF EXISTS pagbank_token_cifrado;
--   ALTER TABLE schools DROP COLUMN IF EXISTS pagbank_ambiente;
