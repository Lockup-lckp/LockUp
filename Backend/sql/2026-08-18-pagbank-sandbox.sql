-- =====================================================================
-- LCKP — corrigir o ambiente do PagBank na ETEC Bento Quirino
-- =====================================================================
-- POR QUE: o token do PagBank em mãos é de SANDBOX (testado: em produção ele
-- responde 401). A escola ficou marcada como 'producao' numa execução
-- anterior, então o checkout falharia na primeira tentativa de pagamento.
--
-- Sandbox e produção têm tokens DIFERENTES e não são intercambiáveis.

-- ---------------------------------------------------------------------
-- 1. Voltar a Bento Quirino para sandbox (para testar sem mover dinheiro)
-- ---------------------------------------------------------------------
UPDATE schools
   SET gateway = 'pagbank',
       gateway_ambiente = 'sandbox'
 WHERE codigo = 'etec-043';

-- ---------------------------------------------------------------------
-- 2. Conferência
-- ---------------------------------------------------------------------
-- Esperado: pagbank | sandbox | token_ja_cadastrado conforme o painel.
SELECT codigo,
       name,
       gateway,
       gateway_ambiente,
       credenciais_gateway_cifrado IS NOT NULL AS token_ja_cadastrado
  FROM schools
 WHERE codigo = 'etec-043';

-- ---------------------------------------------------------------------
-- 3. QUANDO FOR PARA PRODUÇÃO (rodar só depois)
-- ---------------------------------------------------------------------
-- A ordem importa: troque o token no painel para o de PRODUÇÃO ANTES de rodar
-- isto. Se inverter, o checkout fica alguns minutos com token de sandbox em
-- produção e toda cobrança falha com 401.
--
-- UPDATE schools SET gateway_ambiente = 'producao' WHERE codigo = 'etec-043';
