-- =====================================================================
-- LCKP — PagBank para a ETEC Bento Quirino
-- =====================================================================
-- Rodar no SQL Editor do Supabase. É idempotente: pode rodar quantas vezes
-- quiser, e é seguro rodar mesmo sem saber quais migrações antigas já passaram.
--
-- Contexto: o Banco do Brasil travou (o termo de produção exige representante
-- legal da APM com poderes, que não foi possível). A Bento Quirino passa a
-- receber pelo PagBank — a credencial é o token da conta da PRÓPRIA
-- instituição, então o dinheiro cai direto nela.
--
-- ATENÇÃO: isto mexe SÓ na Bento Quirino (codigo = 'etec-043'). As outras
-- escolas continuam no gateway em que estão (Mercado Pago, por padrão).


-- ---------------------------------------------------------------------
-- 1. Garantir que o banco suporta o PagBank
-- ---------------------------------------------------------------------
-- As colunas abaixo já deveriam existir das migrações de agosto, mas o
-- "IF NOT EXISTS" torna este script seguro mesmo que alguma não tenha rodado.

-- Credencial genérica cifrada (é onde o token do PagBank é gravado pelo painel).
ALTER TABLE schools ADD COLUMN IF NOT EXISTS credenciais_gateway_cifrado TEXT;

-- Ambiente do gateway: 'sandbox' para testes, 'producao' para valer.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gateway_ambiente TEXT NOT NULL DEFAULT 'producao';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_gateway_ambiente_valido') THEN
    ALTER TABLE schools ADD CONSTRAINT schools_gateway_ambiente_valido
      CHECK (gateway_ambiente IN ('sandbox', 'producao'));
  END IF;
END $$;

-- A constraint de gateway precisa aceitar 'pagbank'. Recriada por segurança:
-- versões antigas listavam só ('mercadopago', 'pagbank') e a de agosto/14
-- somou 'bancodobrasil'. Deixamos os três aceitos.
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_gateway_valido;
ALTER TABLE schools
  ADD CONSTRAINT schools_gateway_valido
  CHECK (gateway IN ('mercadopago', 'pagbank', 'bancodobrasil'));


-- ---------------------------------------------------------------------
-- 2. Conferir o estado da Bento Quirino ANTES de virar
-- ---------------------------------------------------------------------
-- Rode e leia. Confirme que a linha existe e veja em qual gateway ela está.

SELECT codigo,
       name,
       gateway,
       gateway_ambiente,
       credenciais_gateway_cifrado IS NOT NULL AS token_ja_cadastrado
  FROM schools
 WHERE codigo = 'etec-043'
    OR name ILIKE '%bento%quirino%';


-- ---------------------------------------------------------------------
-- 3. Virar a Bento Quirino para o PagBank
-- ---------------------------------------------------------------------
-- Deixa em SANDBOX para o primeiro teste não mover dinheiro de verdade. Depois
-- de testar, rode a parte 4 para passar a produção.
--
-- Não mexe no token: ele é gravado pelo painel do superadmin (cifrado). Trocar
-- de gateway aqui só muda por ONDE a cobrança é feita; a credencial vem depois,
-- pela tela.

UPDATE schools
   SET gateway = 'pagbank',
       gateway_ambiente = 'sandbox'
 WHERE codigo = 'etec-043'
    OR name ILIKE '%bento%quirino%';


-- ---------------------------------------------------------------------
-- 4. Passar a Bento Quirino para PRODUÇÃO (rodar só depois de testar)
-- ---------------------------------------------------------------------
-- Descomente e rode quando o teste em sandbox tiver funcionado E o token de
-- PRODUÇÃO já estiver cadastrado no painel. Sandbox e produção usam tokens
-- diferentes: troque o token no painel ANTES de rodar isto.
--
-- UPDATE schools
--    SET gateway_ambiente = 'producao'
--  WHERE codigo = 'etec-043'
--     OR name ILIKE '%bento%quirino%';


-- ---------------------------------------------------------------------
-- 5. Conferência final
-- ---------------------------------------------------------------------
SELECT codigo,
       name,
       gateway,
       gateway_ambiente,
       credenciais_gateway_cifrado IS NOT NULL AS token_ja_cadastrado
  FROM schools
 WHERE codigo = 'etec-043'
    OR name ILIKE '%bento%quirino%';
