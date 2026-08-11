// URL base da API do backend. Configurável por ambiente (front/.env -> VITE_API_URL),
// com fallback para o servidor local de desenvolvimento.
export const API_BASE = import.meta.env.VITE_API_URL;

// Cabeçalhos de autenticação a partir do token guardado na sessão.
export const getAuthHeaders = () => {
  const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const token = usuarioLogado.token || sessionStorage.getItem('token') || '';

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};
