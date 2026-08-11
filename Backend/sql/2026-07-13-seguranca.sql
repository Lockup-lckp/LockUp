-- ============================================================================
-- LCKP — Endurecimento de segurança + configuração inicial
-- Rode no SQL Editor do Supabase. Cada bloco é independente; leia os comentários.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Unicidade de e-mail institucional (case-insensitive)
--    Necessário para o backend retornar 409 em vez de criar usuários duplicados.
--    Se já houver e-mails repetidos, o índice falha: rode o SELECT abaixo antes
--    e resolva os duplicados.
-- ----------------------------------------------------------------------------
-- SELECT lower(email_institucional), count(*) FROM users
--   GROUP BY lower(email_institucional) HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_institucional_unique
  ON users (lower(email_institucional));

-- ----------------------------------------------------------------------------
-- 2. Unicidade do código da escola (usado na URL / slug)
-- ----------------------------------------------------------------------------
-- SELECT lower(codigo), count(*) FROM schools
--   GROUP BY lower(codigo) HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS schools_codigo_unique
  ON schools (lower(codigo));

-- ----------------------------------------------------------------------------
-- 3. Promover o dono da plataforma a superadmin
--
--    ⚠️ RECOMENDADO: MANTENHA o school_id atual. Assim você continua entrando
--    normalmente no portal da sua ETEC e, além disso, ganha o poder de criar,
--    editar e excluir qualquer instituição.
--
--    (O código também aceita superadmin com school_id NULL — nesse caso ele
--    consegue entrar no portal de QUALQUER escola. Mas manter o school_id é o
--    caminho mais simples e previsível.)
--
--    Troque o e-mail pelo seu antes de rodar:
-- ----------------------------------------------------------------------------
-- UPDATE users SET role = 'superadmin'
--   WHERE email_institucional = 'voce@exemplo.com';

-- Confira o resultado:
-- SELECT nome_completo, email_institucional, role, school_id FROM users
--   WHERE role IN ('admin', 'superadmin');

-- ----------------------------------------------------------------------------
-- 4. Todo admin PRECISA ter school_id, senão não enxerga usuários/armários
--    (as consultas são escopadas pela escola do token). Verifique:
-- ----------------------------------------------------------------------------
-- SELECT nome_completo, email_institucional, role FROM users
--   WHERE role = 'admin' AND school_id IS NULL;

-- Se aparecer o antigo 'admin.local@institucional.com' (criado pelo backdoor já
-- removido), apague-o:
-- DELETE FROM users WHERE email_institucional = 'admin.local@institucional.com';

-- ----------------------------------------------------------------------------
-- 5. Identidade visual + valor do armário por ETEC
--    O admin de cada escola consegue fazer isso sozinho pela tela
--    "🎨 Personalização" no portal. Este bloco serve para configurar em massa
--    ou para dar o pontapé inicial.
--
--    ⚠️ valor_armario é OBRIGATÓRIO: sem ele o checkout recusa a cobrança
--    (antes, o sistema cobrava R$100 fixo errado).
-- ----------------------------------------------------------------------------
-- UPDATE schools SET
--   logo_url        = 'https://.../logo-da-etec.png',
--   primary_color   = '#ff6600',   -- destaques/botões
--   secondary_color = '#cc1414',   -- gradientes
--   bg_color        = '#1a0808',   -- fundo
--   valor_armario   = 50.00
-- WHERE codigo = 'etec-bento-quirino';

-- Escolas ainda sem valor configurado (checkout vai falhar nelas):
-- SELECT name, codigo, valor_armario FROM schools
--   WHERE valor_armario IS NULL OR valor_armario <= 0;

-- ----------------------------------------------------------------------------
-- 6. (DEFESA EM PROFUNDIDADE) Ativar RLS nas tabelas.
--    O backend usa a service_role, que IGNORA o RLS — então isto NÃO quebra a API.
--    O efeito é bloquear acesso pela chave anônima/pública (caso vaze ou alguém
--    tente falar direto com o PostgREST). Como o frontend só conversa com o
--    backend Node (e não com o Supabase direto), é seguro ativar.
--    ⚠️ Se um dia o frontend passar a usar o supabase-js direto, você precisará
--       criar POLICIES específicas, senão o acesso anônimo fica bloqueado.
-- ----------------------------------------------------------------------------
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE lockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Sem nenhuma policy, o acesso via chave anônima fica negado por padrão (deny-all).
-- A service_role (backend) continua funcionando normalmente.
