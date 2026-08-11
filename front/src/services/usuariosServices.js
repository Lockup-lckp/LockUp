import { API_BASE, getAuthHeaders } from './api';

const API_URL = `${API_BASE}/users`;

export const usuarioService = {
  // Busca os usuários. Se um schoolId (UUID) for informado, o filtro acontece no
  // servidor — evita baixar todos os usuários de todas as escolas só pra descartar
  // a maioria no navegador (só tem efeito quando quem chama é superadmin; admin de
  // escola já vem sempre travado na própria instituição pelo backend).
  buscarTodos: async (schoolId) => {
    try {
      const url = schoolId
        ? `${API_URL}?school_id=${encodeURIComponent(schoolId)}`
        : API_URL;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(), // Garante o envio do token
      });
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      return await response.json();
    } catch (error) {
      console.error('Falha ao buscar usuários:', error);
      return [];
    }
  },
  criar: async (dados) => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dados),
    });
    if (!response.ok) {
      const erroServidor = await response.json().catch(() => ({}));
      throw new Error(erroServidor.error || 'Erro ao criar usuário');
    }
    return await response.json();
  },

  atualizar: async (id, dados) => {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(), // Atualizado aqui!
      body: JSON.stringify(dados),
    });
    if (!response.ok) throw new Error('Erro ao atualizar usuário');
    return await response.json();
  },

  excluir: async (id) => {
    const response = await fetch(`${API_URL}/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders() // Atualizado aqui!
    });
    if (!response.ok) throw new Error('Erro ao excluir usuário');
    return true;
  },
};