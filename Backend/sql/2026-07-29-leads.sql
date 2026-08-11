-- ============================================================================
-- LCKP — Tabela de leads (escolas interessadas via landing page)
-- Rode no SQL Editor do Supabase.
-- ============================================================================

-- Pedido de contato de uma escola interessada em contratar o LCKP.
-- Isso NÃO cria login, usuário nem instituição — é só um lead para o time
-- comercial entrar em contato e fechar o contrato manualmente. A escola só
-- passa a existir de verdade quando o superadmin cria pelo painel (POST /schools).
CREATE TABLE IF NOT EXISTS school_leads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_escola    text NOT NULL,
  contato_nome   text NOT NULL,
  email          text NOT NULL,
  telefone       text,
  mensagem       text,
  status         text NOT NULL DEFAULT 'pendente', -- pendente | em_contato | fechado | descartado
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Mesma postura de defesa em profundidade das demais tabelas (sql/2026-07-13-seguranca.sql):
-- o backend usa a service_role (ignora RLS), então isto não quebra a API. O efeito é
-- bloquear qualquer tentativa de leitura/escrita direta via chave anônima do Supabase.
ALTER TABLE school_leads ENABLE ROW LEVEL SECURITY;
