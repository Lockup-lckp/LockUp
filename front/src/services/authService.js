import { API_BASE } from './api';

const API_URL = API_BASE;

export const authService = {
  // ⚡ Método de login atualizado para aceitar e repassar o schoolCode ao backend
  async login(email_institucional, senha, schoolCode) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Envia o schoolCode no corpo para o backend validar a escola do usuário de forma segura
        body: JSON.stringify({ email_institucional, senha, schoolCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Erro de conexão com o servidor.');
    }
  },

  async alterarSenha(nova_senha, token) {
    try {
      const response = await fetch(`${API_URL}/auth/alterar-senha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nova_senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar senha');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Erro de conexão com o servidor.');
    }
  }
};