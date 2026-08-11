import { API_BASE, getAuthHeaders } from './api.js';

const API_URL = `${API_BASE}/schools`;

export const escolaService = {
  // Busca a identidade visual e os dados públicos da escola pelo código da URL.
  // Retorna: id, name, codigo, cores, logo_url e valor_armario (rota pública, sem dados sensíveis).
  buscarPorCodigo: async (codigo) => {
    try {
      const response = await fetch(`${API_URL}/codigo/${codigo}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Instituição de ensino não encontrada ou erro na requisição');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Falha ao buscar a escola com o código "${codigo}":`, error);
      throw error;
    }
  },

  buscarPorId: async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erro ao buscar dados da escola');
      return await response.json();
    } catch (error) {
      console.error(`Falha ao buscar escola ID ${id}:`, error);
      throw error;
    }
  },

  // Atualiza a configuração/personalização da escola (logo_url, cores, valor_armario).
  // O backend restringe o admin de escola à própria instituição e a esses campos.
  atualizarConfiguracao: async (id, dadosCustomizacao) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(dadosCustomizacao),
      });
      
      if (!response.ok) {
        const dadosErro = await response.json().catch(() => ({}));
        throw new Error(dadosErro.error || 'Erro ao atualizar configurações da escola');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Falha ao atualizar configurações da escola ID ${id}:`, error);
      throw error;
    }
  },

  listarTodas: async () => {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erro ao listar instituições');
      return await response.json();
    } catch (error) {
      console.error('Falha ao listar escolas:', error);
      throw error;
    }
  },

  criar: async (dadosEscola) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(dadosEscola),
      });
      if (!response.ok) throw new Error('Erro ao cadastrar nova instituição');
      return await response.json();
    } catch (error) {
      console.error('Falha ao criar escola:', error);
      throw error;
    }
  },

  excluir: async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Erro ao remover instituição');
      return await response.json();
    } catch (error) {
      console.error(`Falha ao excluir escola ID ${id}:`, error);
      throw error;
    }
  }
};