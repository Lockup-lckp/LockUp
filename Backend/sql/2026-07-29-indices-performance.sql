-- ============================================================================
-- LCKP — Índices de performance
-- Rode no SQL Editor do Supabase.
-- ============================================================================

-- Toda listagem de usuários e armários filtra por school_id (multi-tenant).
-- Sem índice, cada consulta faz uma varredura completa da tabela — fica mais
-- lento conforme o número de escolas/alunos cresce.
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users (school_id);
CREATE INDEX IF NOT EXISTS idx_lockers_school_id ON lockers (school_id);
CREATE INDEX IF NOT EXISTS idx_rentals_school_id ON rentals (school_id);

-- Consultas de aluguel por armário/aluno (ex.: "meu armário", checkout).
CREATE INDEX IF NOT EXISTS idx_rentals_locker_id ON rentals (locker_id);
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals (user_id);

-- O webhook do Mercado Pago e a consulta de status buscam por essas colunas a
-- cada notificação/poll. Também viram UNIQUE: encerra de vez a chance (hoje
-- teórica) de duas transações colidirem no mesmo identificador.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rentals_transaction_id_unique ON rentals (transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rentals_gateway_id_unique ON rentals (gateway_id) WHERE gateway_id IS NOT NULL;
