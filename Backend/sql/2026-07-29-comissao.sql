-- ============================================================================
-- LCKP — Comissão (%) configurável por escola
-- Rode no SQL Editor do Supabase.
-- ============================================================================

-- Percentual retido pelo LCKP sobre cada locação (ex: 0.05 = 5%, 0.10 = 10%).
-- Varia por contrato assinado com cada instituição — por isso é por escola,
-- não um valor fixo no código. Só é usada quando a escola já tem
-- gateway_recipient_id configurado (split de pagamento ativo); sem isso, a
-- cobrança inteira vai para a conta master do LCKP e taxa_comissao é ignorada.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS taxa_comissao numeric;

COMMENT ON COLUMN schools.taxa_comissao IS
  'Percentual (0 a 1) retido pelo LCKP por locação nesta escola. Ex.: 0.05 = 5%. Só se aplica quando gateway_recipient_id está configurado.';
