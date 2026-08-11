import { API_BASE, getAuthHeaders } from './api';

const API_URL = `${API_BASE}/armarios`;

export const armariosService = {
  // Lista apenas os armários cadastrados da escola atual usando o schoolCode da URL
  buscarTodos: async (schoolCode) => {
    try {
      const response = await fetch(`${API_URL}/escola/${schoolCode}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erro ao buscar armários da instituição');
      return await response.json();
    } catch (error) {
      console.error(`Falha ao buscar armários para a escola ${schoolCode}:`, error);
      throw error; 
    }
  },

  // Busca os detalhes de um armário específico por ID
  buscarPorId: async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erro ao buscar detalhes do armário');
      return await response.json();
    } catch (error) {
      console.error(`Falha ao buscar o armário com ID ${id}:`, error);
    }
  },

  // Cria um novo armário atrelando-o à escola atual pelo schoolCode
  criar: async (schoolCode, dadosArmario) => {
    const response = await fetch(`${API_URL}/escola/${schoolCode}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dadosArmario),
    });
    if (!response.ok) throw new Error('Erro ao cadastrar armário');
    return await response.json();
  },

  // Cria vários armários de uma vez para um corredor (ex: corredor 1, armários de 1 a 100)
  criarEmLote: async (schoolCode, { corredor, inicio, fim }) => {
    const response = await fetch(`${API_URL}/escola/${schoolCode}/lote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ corredor, inicio, fim }),
    });
    if (!response.ok) {
      const dadosErro = await response.json().catch(() => ({}));
      throw new Error(dadosErro.error || 'Erro ao criar armários em lote');
    }
    return await response.json();
  },

  // Atualiza os dados de um armário passando o schoolId real do banco para validação de segurança do Admin
  atualizar: async (id, dados) => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dados),
    });
    if (!response.ok) throw new Error('Erro ao atualizar armário');
    return await response.json();
  },

  // Atualiza apenas o status do armário, reaproveitando a rota PATCH /armarios/:id
  atualizarStatus: async (id, status) => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Erro ao atualizar o status do armário');
    return await response.json();
  },

  // Exclui um armário do sistema passando o schoolId no body se necessário para a trava de segurança
  excluir: async (id, schoolId) => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ schoolId }),
    });
    if (!response.ok) throw new Error('Erro ao excluir armário');
    return true;
  },
};