-- =====================================================================
-- LCKP — fim da comissão: a receita passa a ser licenciamento
-- Rodar no SQL Editor do Supabase. Idempotente.
-- =====================================================================
--
-- DECISÃO (2026-08-14): a LCKP cobra LICENCIAMENTO DE SOFTWARE da instituição,
-- e não percentual sobre a locação. O valor pago pelo aluno vai inteiro para a
-- conta da escola e nunca passa pela LCKP.
--
-- Consequência no código: `application_fee` deixou de ser enviado ao Mercado
-- Pago, e a validação de faixa da comissão saiu do checkout.
--
-- As colunas NÃO são removidas. Elas guardam o que foi combinado no modelo
-- antigo, e apagá-las jogaria fora o histórico de uma decisão comercial. Ficam
-- como legado, sem nada lendo para cobrar.

-- ---------------------------------------------------------------------
-- 1. Zera o que restava
-- ---------------------------------------------------------------------
UPDATE schools
   SET taxa_comissao = 0
 WHERE COALESCE(taxa_comissao, 0) <> 0;

-- Toda escola passa ao modelo direto: o dinheiro é da instituição.
UPDATE schools
   SET modelo_recebimento = 'direto',
       cobranca_comissao = 'faturada'
 WHERE modelo_recebimento <> 'direto'
    OR cobranca_comissao <> 'faturada';

COMMENT ON COLUMN schools.taxa_comissao IS
  'LEGADO. Modelo de comissao encerrado em 2026-08-14: a LCKP cobra licenciamento. Nada le esta coluna para cobrar.';
COMMENT ON COLUMN schools.modelo_recebimento IS
  'LEGADO. Toda escola opera no modelo direto: o dinheiro vai para a conta da instituicao.';
COMMENT ON COLUMN schools.cobranca_comissao IS
  'LEGADO. Nao ha comissao desde 2026-08-14.';

-- ---------------------------------------------------------------------
-- 2. Banco do Brasil como gateway do sistema
-- ---------------------------------------------------------------------
-- As escolas em negociação usam BB. O adaptador ainda não existe: faltam o
-- certificado de CLIENTE mTLS e a chave Pix registrada na conta da APM. Por
-- isso a ETEC NÃO é movida para 'bancodobrasil' aqui — ficaria configurada num
-- gateway que não sabe cobrar, e o aluno descobriria isso no checkout.
--
-- Quando o adaptador estiver pronto e testado em homologação:
--
--   UPDATE schools
--      SET gateway = 'bancodobrasil', gateway_ambiente = 'producao'
--    WHERE codigo = 'etec-043';

-- ---------------------------------------------------------------------
-- 3. Conferência
-- ---------------------------------------------------------------------
--   SELECT codigo, gateway, gateway_ambiente, modelo_recebimento,
--          taxa_comissao, gateway_recipient_id IS NOT NULL AS tem_recebedor
--     FROM schools ORDER BY codigo;
--
-- ATENÇÃO: escola com gateway 'mercadopago' e `gateway_recipient_id` NULO
-- cobra pela conta da LCKP e o dinheiro fica INTEIRO conosco. Sem comissão,
-- isso deixou de ser "configuracao incompleta" e virou erro grave: a escola
-- nao recebe nada. Conferir antes de qualquer escola comecar a vender.
