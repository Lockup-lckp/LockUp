import { API_BASE, getAuthHeaders } from './api';

const API_URL = `${API_BASE}/pagamentos`;

export const checkoutService = {
  /**
   * Inicia o processo de aluguel disparando as informações coletadas pelo Brick para o seu servidor
   * @param {string} lockerId - ID do armário (UUID do Supabase)
   * @param {object} dadosCliente - Dados pessoais recolhidos do aluno
   * @param {object} mpData - Token do cartão gerado pelo SDK no navegador (Checkout Transparente)
   */
  iniciarCheckout: async (lockerId, dadosCliente, mpData) => {
    try {
      const response = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          locker_id: lockerId,
          nome: dadosCliente.nome,
          cpf: dadosCliente.cpf,
          telefone: dadosCliente.telefone,
          // 'anual' ou 'semestral'. O PREÇO não vai daqui: o backend resolve
          // pela configuração da escola, senão o cliente escolheria quanto pagar.
          modalidade: dadosCliente.modalidade || 'anual',
          mp_data: mpData // Repassa o token do cartão, parcelas ou método selecionado
        })
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(resultado.error || 'Erro ao iniciar o processo de checkout.');
      }

      return resultado;
    } catch (error) {
      console.error(`Falha ao iniciar checkout para o armário ${lockerId}:`, error);
      throw error;
    }
  },

  // Extrato de locações pagas (aprovadas) da escola, pro admin acompanhar o histórico e o saldo anual.
  buscarHistorico: async (schoolCode) => {
    try {
      const response = await fetch(`${API_URL}/historico/${schoolCode}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erro ao buscar o histórico de pagamentos.');
      return await response.json();
    } catch (error) {
      console.error(`Falha ao buscar histórico de pagamentos da escola ${schoolCode}:`, error);
      throw error;
    }
  }
};