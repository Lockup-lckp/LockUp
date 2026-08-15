-- =====================================================================
-- LCKP — Banco do Brasil como gateway das ETECs
-- =====================================================================
-- Rodar no SQL Editor do Supabase. É idempotente: rodar de novo não quebra
-- nada, e a parte 3 foi feita para ser rodada DUAS vezes (antes e depois de
-- cadastrar as credenciais).
--
-- Contexto: as ETECs recebem por conta da APM no Banco do Brasil. O dinheiro
-- público não pode transitar por conta de terceiro, então cada escola usa a
-- credencial da PRÓPRIA conta — não há split, comissão nem intermediário.
--
-- Instituições fora da rede ETEC (o Instituto Federal, por exemplo) podem usar
-- outro banco: o gateway é POR ESCOLA, e o catálogo em
-- Backend/src/servicos/gateways/catalogo.js é onde um novo entra.


-- ---------------------------------------------------------------------
-- 1. Liberar 'bancodobrasil' como valor de schools.gateway
-- ---------------------------------------------------------------------
-- Sem isto o Postgres RECUSA a escola no Banco do Brasil: a constraint criada
-- em 2026-08-05 só conhecia 'mercadopago' e 'pagbank'. O erro que aparecia era
-- 23514 no painel do superadmin, sem dizer que a causa era esta regra.

ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_gateway_valido;

ALTER TABLE schools
  ADD CONSTRAINT schools_gateway_valido
  CHECK (gateway IN ('mercadopago', 'pagbank', 'bancodobrasil'));

COMMENT ON COLUMN schools.gateway IS
  'Meio de pagamento desta instituição. bancodobrasil = conta da própria escola (padrão nas ETECs); mercadopago e pagbank são legado.';


-- ---------------------------------------------------------------------
-- 2. Conferir em que estado cada escola está
-- ---------------------------------------------------------------------
-- Rode e leia ANTES da parte 3. É aqui que se descobre o `codigo` real de cada
-- instituição — a parte 3 depende de acertar esse código.

SELECT codigo,
       name,
       gateway,
       gateway_ambiente,
       credenciais_gateway_cifrado IS NOT NULL AS credenciais_cadastradas
  FROM schools
 ORDER BY codigo;


-- ---------------------------------------------------------------------
-- 3. Virar as ETECs para o Banco do Brasil
-- ---------------------------------------------------------------------
-- A cláusula `credenciais_gateway_cifrado IS NOT NULL` é a proteção central:
-- virar a escola para um gateway SEM credencial deixa o aluno chegar ao
-- checkout e receber erro. Enquanto a credencial não estiver cadastrada pelo
-- painel do superadmin, este UPDATE não faz nada — de propósito.
--
-- Ou seja: rode agora (não muda nada), cadastre as credenciais no painel, e
-- rode de novo (aí sim vira). É seguro repetir quantas vezes quiser.
--
-- ATENÇÃO AOS CÓDIGOS: 'etec-043' é a ETEC Bento Quirino, confirmado nas
-- migrações anteriores. O código do ETECAP NÃO consta em lugar nenhum do
-- repositório — confira no resultado da parte 2 e ajuste a lista abaixo antes
-- de rodar. Um código errado aqui não dá erro: simplesmente não casa com
-- escola nenhuma e o UPDATE afeta 0 linhas.

UPDATE schools
   SET gateway = 'bancodobrasil',
       gateway_ambiente = 'producao'
 WHERE codigo IN ('etec-043' /* Bento Quirino */, 'etecap' /* CONFERIR na parte 2 */)
   AND credenciais_gateway_cifrado IS NOT NULL
   AND gateway IS DISTINCT FROM 'bancodobrasil';


-- ---------------------------------------------------------------------
-- 4. Conferência final
-- ---------------------------------------------------------------------
-- O que se espera ver depois de cadastrar as credenciais e rodar a parte 3:
-- as duas ETECs em 'bancodobrasil', 'producao', com credenciais_cadastradas = true.

SELECT codigo,
       name,
       gateway,
       gateway_ambiente,
       credenciais_gateway_cifrado IS NOT NULL AS credenciais_cadastradas
  FROM schools
 WHERE codigo IN ('etec-043', 'etecap')
 ORDER BY codigo;
