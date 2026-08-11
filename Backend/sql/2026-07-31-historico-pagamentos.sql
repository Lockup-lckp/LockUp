-- ============================================================================
-- LCKP — Histórico de pagamentos por escola (valor por locação)
-- Rode no SQL Editor do Supabase.
-- ============================================================================

-- Valor efetivamente cobrado em cada locação, no momento do pagamento.
-- Sem isso não dá pra montar um extrato/saldo anual confiável: o preço do
-- armário (schools.valor_armario) pode mudar com o tempo, então olhar o valor
-- atual da escola pra uma locação antiga daria um número errado.
-- Locações feitas ANTES desta coluna existir ficam com valor NULL (decisão
-- consciente: o histórico passa a ser confiável a partir de agora, sem
-- reconstituir valores antigos de forma imprecisa).
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS valor numeric;

COMMENT ON COLUMN rentals.valor IS
  'Valor em R$ efetivamente cobrado nesta locação, travado no momento do pagamento. NULL em registros anteriores a esta coluna.';
