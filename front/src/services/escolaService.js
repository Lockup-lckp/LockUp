import { API_BASE, getAuthHeaders } from './api.js';

const API_URL = `${API_BASE}/schools`;

export const escolaService = {
  // Busca a identidade visual e os dados públicos da escola pelo código da URL.
  // Retorna: id, name, codigo, cores, logo_url e valor_armario (rota pública, sem dados sensíveis).
  // Meios de pagamento suportados e quais credenciais cada um exige. O painel
  // monta o formulario a partir daqui em vez de ter os campos escritos na tela.
  buscarCatalogoGateways: async () => {
    const response = await fetch(`${API_URL}/catalogo/gateways`, { headers: getAuthHeaders() });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Erro ao carregar os meios de pagamento.');
    return resultado;
  },

  // Autentica de verdade no banco da escola. Serve para o erro de credencial
  // aparecer AQUI, na hora de configurar, e não no checkout do primeiro aluno.
  testarCredencialGateway: async (id) => {
    const response = await fetch(`${API_URL}/${id}/gateway/testar`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Não foi possível testar a credencial.');
    return resultado;
  },

  // Cadastra no banco a URL que recebe as notificações de pagamento. Passo
  // obrigatório e fácil de esquecer: sem ele o aluno paga e o armário não abre.
  registrarWebhookGateway: async (id) => {
    const response = await fetch(`${API_URL}/${id}/gateway/webhook`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Não foi possível registrar o webhook.');
    return resultado;
  },

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
  // Envia a logo como base64. Não é multipart de propósito: o backend teria de
  // ganhar um parser só por causa desta rota, e o arquivo é pequeno (2 MB).
  enviarLogo: async (id, arquivo, campo = 'logo_url') => {
    const base64 = await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      leitor.readAsDataURL(arquivo);
    });

    const response = await fetch(`${API_URL}/${id}/logo`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ arquivo: base64, tipo: arquivo.type, campo })
    });

    const resultado = await response.json();
    if (!response.ok) throw new Error(resultado.error || 'Erro ao enviar a logo.');
    return resultado;
  },

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