// URL base da API do backend, vinda de VITE_API_URL no momento do build.
//
// Sem fallback, uma env ausente virava `undefined` e todo fetch saía como
// "undefined/schools/..." — falhando com um erro que não diz o que está errado.
// Em desenvolvimento caímos no servidor local; em produção avisamos alto, porque
// não há padrão razoável a adivinhar.
const configurada = import.meta.env.VITE_API_URL?.trim();

if (!configurada && !import.meta.env.DEV) {
  console.error(
    '[LCKP] VITE_API_URL não foi definida neste build. ' +
      'Configure a variável no projeto da Vercel (Settings > Environment Variables) ' +
      'apontando para a URL pública da API e refaça o deploy.'
  );
}

// Remove a barra final para as concatenações (`${API_BASE}/schools`) não gerarem "//".
export const API_BASE = (configurada || (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '');

// Cabeçalhos de autenticação a partir do token guardado na sessão.
export const getAuthHeaders = () => {
  const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const token = usuarioLogado.token || sessionStorage.getItem('token') || '';

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};
