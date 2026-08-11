import { API_BASE, getAuthHeaders } from './api';

const API_URL = `${API_BASE}/leads`;

// Envia o pedido de contato da landing page (escola interessada em contratar o LCKP).
// Rota pública, sem autenticação — não cria login nem instituição.
export const leadsService = {
  enviarContato: async (dados) => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(resultado.error || 'Não foi possível enviar seu contato. Tente novamente.');
    }

    return resultado;
  },

  // Lista os pedidos de contato recebidos (somente superadmin).
  listarTodos: async () => {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Erro ao listar os pedidos de contato.');
    return await response.json();
  },

  // Atualiza o status de acompanhamento de um lead (somente superadmin).
  atualizarStatus: async (id, status) => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Erro ao atualizar o status do pedido.');
    return await response.json();
  }
};
