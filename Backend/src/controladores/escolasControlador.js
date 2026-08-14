import supabase from '../config/database.js';
import { cifrar } from '../utils/cripto.js';
import { obterEscolaPorCodigo, invalidarCacheEscolas } from '../servicos/cacheEscola.js';

// Campos que o admin de uma escola pode alterar na PRÓPRIA instituição (personalização).
// Campos sensíveis (codigo, gateway, credenciais, taxa_comissao, name) ficam restritos ao
// superadmin — o admin de escola não pode mexer na própria comissão contratual
// nem trocar o gateway de pagamento.
//
// As cores saíram: a estilização do sistema é fixa na marca LCKP. A escola
// personaliza a(s) logo(s) e onde cada uma aparece.
const CAMPOS_EDITAVEIS_ADMIN = [
  'logo_url',
  'logo_2_url',
  'logo_1_posicao',
  'logo_2_posicao',
  'valor_armario',
  // Configuração da instituição, editável pelo próprio admin da escola.
  // Nenhum destes toca em gateway, comissão ou recebedor — o que o admin
  // pode mexer segue restrito ao que é da operação dela.
  'rotulo_corredor',
  'tipo_matricula',
  'max_armarios_por_aluno',
  'encerramento_dia',
  'encerramento_mes',
  'abertura_dia',
  'abertura_mes',
  'permite_semestral',
  'valor_armario_semestral',
  'encerramento_semestral_dia',
  'encerramento_semestral_mes',
  'contrato_titulo',
  'contrato_texto'
];

// Nunca devolvidos a cliente nenhum, nem ao superadmin: uma credencial que
// trafega para o navegador é uma credencial vazada.
const CAMPOS_SECRETOS = ['pagbank_token_cifrado'];

// Contrato público da escola (login, tema, checkout). É montado em JS a partir
// de select('*') em vez de nomear as colunas na consulta: nomear coluna que
// ainda não existe faz o PostgREST devolver 400 (42703) e derruba a busca
// inteira, tirando o login do ar até alguém rodar a migração. Assim, uma coluna
// nova ausente apenas cai no default.
const projetarEscolaPublica = (escola) => {
  if (!escola) return escola;
  return {
    id: escola.id,
    name: escola.name,
    codigo: escola.codigo,
    logo_url: escola.logo_url ?? null,
    logo_2_url: escola.logo_2_url ?? null,
    logo_1_posicao: escola.logo_1_posicao ?? 'esquerda',
    logo_2_posicao: escola.logo_2_posicao ?? 'nenhum',
    valor_armario: escola.valor_armario ?? null,
    tipo_matricula: escola.tipo_matricula ?? 'rm',
    // Regra de locação, não segredo: o aluno precisa saber quantos armários
    // pode alugar antes de tentar. A trava de verdade continua no backend,
    // em `iniciarCheckout` — isto aqui só evita a mensagem errada na tela.
    max_armarios_por_aluno: Number(escola.max_armarios_por_aluno) || 1,
    // Datas do ciclo letivo: os termos de uso do checkout descrevem o prazo da
    // locação a partir delas, e precisam bater com a janela que o backend
    // aplica em `dentroDaJanelaDeVendas`.
    encerramento_dia: escola.encerramento_dia ?? 20,
    encerramento_mes: escola.encerramento_mes ?? 12,
    abertura_dia: escola.abertura_dia ?? 1,
    abertura_mes: escola.abertura_mes ?? 2,
    // Como a escola chama a divisão física dos armários. Só o rótulo exibido:
    // o dado continua em `lockers.corredor`.
    rotulo_corredor: escola.rotulo_corredor ?? 'bloco',
    // Modalidade semestral: preço e prazo próprios. O checkout precisa saber
    // se a escola oferece antes de montar o seletor.
    permite_semestral: Boolean(escola.permite_semestral),
    valor_armario_semestral: escola.valor_armario_semestral ?? null,
    encerramento_semestral_dia: escola.encerramento_semestral_dia ?? 6,
    encerramento_semestral_mes: escola.encerramento_semestral_mes ?? 7,
    // Contrato da instituição, exibido no checkout e no Meu Armário. É público
    // por natureza: o aluno precisa ler antes de aceitar.
    contrato_titulo: escola.contrato_titulo ?? null,
    contrato_texto: escola.contrato_texto ?? null
  };
};

const removerSegredos = (escola) => {
  if (!escola) return escola;
  const limpa = { ...escola };
  for (const campo of CAMPOS_SECRETOS) delete limpa[campo];
  // Sinaliza se já existe credencial, sem revelar qual.
  limpa.pagbank_configurado = Boolean(escola.pagbank_token_cifrado);
  return limpa;
};

// 1. Listar todas as escolas (somente superadmin — protegido na rota)
export const listarEscolas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return res.json((data || []).map(removerSegredos));
  } catch (err) {
    console.error('Erro ao listar escolas:', err);
    return res.status(500).json({ error: 'Erro interno ao listar as instituições.' });
  }
};

// 2. Buscar escola por ID (autenticado).
// Trava multi-tenant: admin/aluno só pode buscar a PRÓPRIA escola, e nunca recebe
// campos sensíveis (gateway_recipient_id) — só o superadmin vê a linha completa
// de qualquer instituição.
export const buscarEscolaPorId = async (req, res) => {
  const { id } = req.params;
  const superadmin = req.user.role === 'superadmin';

  if (!superadmin && req.user.school_id !== id) {
    return res.status(403).json({ error: 'Você só pode consultar a sua própria instituição.' });
  }

  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Instituição de ensino não encontrada.' });
    }

    // Superadmin vê a linha inteira (menos segredos); os demais recebem só o
    // contrato público, recortado em JS.
    return res.json(superadmin ? removerSegredos(data) : projetarEscolaPublica(data));
  } catch (err) {
    console.error('Erro ao buscar escola por ID:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar a instituição.' });
  }
};

// 3. Buscar escola por Código (PÚBLICA — usada no login/tema).
export const buscarEscolaPorCodigo = async (req, res) => {
  const { codigo } = req.params;

  if (!codigo) {
    return res.status(400).json({
      error: 'O parâmetro codigo é obrigatório.'
    });
  }

  try {
    // Endpoint mais quente do sistema: o portal chama a cada carga de página.
    // Servido pelo cache em memória (TTL curto) para não bater no banco sempre.
    let data;
    try {
      data = await obterEscolaPorCodigo(codigo);
    } catch (error) {
      console.error('Erro ao consultar schools:', error);
      return res.status(500).json({
        error: 'Erro interno ao consultar a instituição.'
      });
    }

    // Escola não encontrada (situação normal)
    if (!data) {
      return res.status(404).json({
        error: 'Instituição de ensino não encontrada.'
      });
    }

    // Rota PÚBLICA: recorta o contrato em JS. Nunca devolver a linha crua aqui,
    // que traz taxa_comissao, gateway_recipient_id e a credencial do PagBank.
    return res.json(projetarEscolaPublica(data));

  } catch (err) {
    console.error('Erro inesperado em buscarEscolaPorCodigo:', err);

    return res.status(500).json({
      error: 'Erro interno do servidor.'
    });
  }
};

// 4. Criar nova escola (somente superadmin — protegido na rota)
export const criarEscola = async (req, res) => {
  const { name, codigo, primary_color, secondary_color, bg_color, logo_url, valor_armario, gateway_recipient_id, taxa_comissao } = req.body;

  if (!name || !codigo) {
    return res.status(400).json({ error: 'Nome e código são campos obrigatórios.' });
  }

  try {
    const { data, error } = await supabase
      .from('schools')
      .insert([{ name, codigo, primary_color, secondary_color, bg_color, logo_url, valor_armario, gateway_recipient_id, taxa_comissao }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Já existe uma instituição com este código.' });
      }
      throw error;
    }

    invalidarCacheEscolas();
    return res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar escola:', err);
    return res.status(500).json({ error: 'Erro interno ao cadastrar a instituição.' });
  }
};

// 5. Atualizar dados/customização da escola.
// Superadmin: qualquer campo, qualquer escola.
// Admin: apenas a PRÓPRIA escola e apenas os campos visuais (personalização).
export const atualizarEscola = async (req, res) => {
  const { id } = req.params;
  const superadmin = req.user.role === 'superadmin';

  if (!superadmin) {
    if (req.user.role !== 'admin' || req.user.school_id !== id) {
      return res.status(403).json({ error: 'Você só pode personalizar a sua própria instituição.' });
    }
  }

  // Monta o payload permitido conforme o papel.
  let camposParaAtualizar;
  if (superadmin) {
    camposParaAtualizar = { ...req.body };

    // O superadmin envia o token do PagBank em texto puro uma única vez; ele é
    // cifrado aqui e nunca mais sai do banco em claro. String vazia limpa a
    // credencial; campo ausente mantém a que já existe.
    if ('pagbank_token' in camposParaAtualizar) {
      const bruto = camposParaAtualizar.pagbank_token;
      delete camposParaAtualizar.pagbank_token;
      camposParaAtualizar.pagbank_token_cifrado = bruto ? cifrar(String(bruto).trim()) : null;
    }
    // Blindagem: ninguém grava o campo cifrado diretamente pela API.
    if ('pagbank_token_cifrado' in req.body && !('pagbank_token' in req.body)) {
      delete camposParaAtualizar.pagbank_token_cifrado;
    }
  } else {
    camposParaAtualizar = {};
    for (const campo of CAMPOS_EDITAVEIS_ADMIN) {
      if (campo in req.body) camposParaAtualizar[campo] = req.body[campo];
    }
    if (Object.keys(camposParaAtualizar).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo permitido para atualização foi enviado.' });
    }
  }

  try {
    const { data, error } = await supabase
      .from('schools')
      .update(camposParaAtualizar)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Instituição não localizada para atualização.' });
    }

    // A logo/configuração acabou de mudar: derruba o cache para o portal não
    // continuar servindo a versão antiga até o TTL expirar.
    invalidarCacheEscolas();
    return res.json(removerSegredos(data));
  } catch (err) {
    console.error('Erro ao atualizar escola:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar as configurações.' });
  }
};

// 6. Excluir uma escola (somente superadmin — protegido na rota)
export const excluirEscola = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id);

    if (error) throw error;

    invalidarCacheEscolas();
    return res.json({ message: 'Instituição de ensino removida com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir escola:', err);
    return res.status(500).json({ error: 'Erro interno ao remover a instituição.' });
  }
};

// UPLOAD DA LOGO DA INSTITUIÇÃO
//
// Antes a escola colava uma URL. Isso quebrava de três formas: link de Google
// Drive que não serve imagem, site que bloqueia hotlink, e a imagem sumindo
// quando a outra ponta reorganizava o servidor — sempre depois, sem aviso.
//
// O arquivo chega em base64 no corpo JSON, e não como multipart, para não
// introduzir dependência de parser só por causa desta rota.
const TIPOS_LOGO = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};
const LIMITE_LOGO = 2 * 1024 * 1024; // 2 MB, igual ao limite do bucket

export const enviarLogo = async (req, res) => {
  const { id } = req.params;
  const { arquivo, tipo, campo } = req.body;

  // Só o superadmin e o admin da própria escola. Mesma regra de atualizarEscola.
  const superadmin = req.user.role === 'superadmin';
  if (!superadmin && (req.user.role !== 'admin' || req.user.school_id !== id)) {
    return res.status(403).json({ error: 'Você só pode alterar a logo da sua própria instituição.' });
  }

  const coluna = campo === 'logo_2_url' ? 'logo_2_url' : 'logo_url';

  if (!arquivo) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const extensao = TIPOS_LOGO[tipo];
  if (!extensao) {
    return res.status(400).json({ error: 'Formato não suportado. Use PNG, JPG, WEBP ou SVG.' });
  }

  // O base64 pode vir com o prefixo "data:image/png;base64,".
  const puro = String(arquivo).includes(',') ? String(arquivo).split(',').pop() : String(arquivo);
  let binario;
  try {
    binario = Buffer.from(puro, 'base64');
  } catch {
    return res.status(400).json({ error: 'Arquivo inválido.' });
  }
  if (!binario.length) return res.status(400).json({ error: 'Arquivo vazio.' });
  if (binario.length > LIMITE_LOGO) {
    return res.status(413).json({ error: 'A imagem passa de 2 MB. Reduza o arquivo e tente de novo.' });
  }

  try {
    // Nome com timestamp: sobrescrever o mesmo caminho deixaria a logo antiga
    // no cache do navegador e do CDN, e a escola juraria que não salvou.
    const caminho = `${id}/${coluna}-${Date.now()}.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from('logos')
      .upload(caminho, binario, { contentType: tipo, upsert: false });

    if (erroUpload) throw erroUpload;

    const { data: publico } = supabase.storage.from('logos').getPublicUrl(caminho);
    const url = publico?.publicUrl;
    if (!url) throw new Error('Não foi possível obter a URL pública da logo.');

    const { data, error } = await supabase
      .from('schools')
      .update({ [coluna]: url })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw error || new Error('Instituição não localizada.');

    return res.json({ url, campo: coluna, escola: removerSegredos(data) });
  } catch (err) {
    console.error('Erro ao enviar a logo:', err.message);
    return res.status(500).json({ error: 'Não foi possível enviar a logo.' });
  }
};
