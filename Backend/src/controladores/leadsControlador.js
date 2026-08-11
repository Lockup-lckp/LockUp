import supabase from '../config/database.js';

// Limites simples pra evitar payloads absurdos vindos de um formulário público sem autenticação.
const TAMANHO_MAXIMO = {
  nome_escola: 150,
  contato_nome: 150,
  email: 200,
  telefone: 30,
  mensagem: 1000
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cria um pedido de contato de uma escola interessada (landing page pública).
// Não cria login, usuário nem instituição — só registra o lead como 'pendente'
// para o time comercial entrar em contato e fechar o contrato manualmente.
export const criarLead = async (req, res) => {
  const { nome_escola, contato_nome, email, telefone, mensagem } = req.body || {};

  if (!nome_escola?.trim() || !contato_nome?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nome da escola, nome do contato e e-mail são obrigatórios.' });
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  for (const [campo, limite] of Object.entries(TAMANHO_MAXIMO)) {
    const valor = { nome_escola, contato_nome, email, telefone, mensagem }[campo];
    if (valor && String(valor).length > limite) {
      return res.status(400).json({ error: `O campo ${campo} excede o tamanho máximo permitido.` });
    }
  }

  try {
    const { error } = await supabase
      .from('school_leads')
      .insert([{
        nome_escola: nome_escola.trim(),
        contato_nome: contato_nome.trim(),
        email: email.trim(),
        telefone: telefone?.trim() || null,
        mensagem: mensagem?.trim() || null
      }]);

    if (error) throw error;

    return res.status(201).json({ mensagem: 'Recebemos seu contato! Nosso time vai falar com você em breve.' });
  } catch (err) {
    console.error('Erro ao registrar lead de escola:', err);
    return res.status(500).json({ error: 'Erro interno ao registrar seu contato. Tente novamente em instantes.' });
  }
};

const STATUS_VALIDOS = ['pendente', 'em_contato', 'fechado', 'descartado'];

// Lista todos os pedidos de contato (somente superadmin — protegido na rota).
export const listarLeads = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('school_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('Erro ao listar leads de escolas:', err);
    return res.status(500).json({ error: 'Erro interno ao listar os pedidos de contato.' });
  }
};

// Atualiza o status de acompanhamento de um lead (somente superadmin — protegido na rota).
export const atualizarStatusLead = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    const { data, error } = await supabase
      .from('school_leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Pedido de contato não encontrado.' });
    }

    return res.json(data);
  } catch (err) {
    console.error('Erro ao atualizar status do lead:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar o status.' });
  }
};
