import supabase from '../config/database.js';
import { cifrar, cifrarCredenciais } from '../utils/cripto.js';
import { obterGateway, validarConfiguracaoGateway, listarGateways, GATEWAY_PADRAO } from '../servicos/gateways/catalogo.js';
import { obterEscolaPorCodigo, invalidarCacheEscolas } from '../servicos/cacheEscola.js';
import { testarCredencialBB, registrarWebhookBB } from '../servicos/gateways/bancoDoBrasil.js';
import { responderErro } from '../utils/erros.js';

// Campos que o admin de uma escola pode alterar na PRÓPRIA instituição (personalização).
// Campos sensíveis (codigo, gateway, credenciais, taxa_comissao, name) ficam restritos ao
// superadmin — o admin de escola não pode mexer na própria comissão contratual
// nem trocar o gateway de pagamento.
//
// As cores NÃO estão nesta lista de propósito. Desde a virada white-label o
// tema por instituição existe (primary_color, secondary_color, bg_color), mas
// quem define é o superadmin: um administrador escolhendo o próprio par de
// cores pode deixar o botão de comprar ilegível na escola inteira, e o motor
// de tema apenas avisa no console — ele não bloqueia.
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
const CAMPOS_SECRETOS = ['pagbank_token_cifrado', 'credenciais_gateway_cifrado'];

// Contrato público da escola (portal, login, tema, checkout). É montado em JS a partir
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
    // Identidade visual da instituição. NÃO é segredo: é a marca da escola,
    // vista por qualquer visitante do portal dela.
    //
    // Sem estes três campos aqui, o tema por escola não existe. O motor do
    // front (front/src/theme/aplicarTema.js) desiste na primeira linha quando
    // a cor principal ou o fundo não chegam, e cai no navy da LCKP — em
    // silêncio, porque desistir é o comportamento certo para uma escola que
    // realmente não configurou cor. Foi assim que o portal branco da Bento
    // Quirino continuou saindo escuro com as cores gravadas no banco.
    primary_color: escola.primary_color ?? null,
    secondary_color: escola.secondary_color ?? null,
    bg_color: escola.bg_color ?? null,
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
  // Formato generico: um JSON cifrado que serve a qualquer gateway. O painel
  // so precisa saber SE existe -- o valor nunca volta.
  limpa.credenciais_configuradas = Boolean(escola.credenciais_gateway_cifrado);
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
  // `taxa_comissao` saiu: desde 2026-08-14 a LCKP cobra licenciamento de
  // software, não percentual sobre a locação. Aceitar o campo aqui manteria um
  // caminho capaz de gravar comissão numa escola nova.
  //
  // As cores também saíram — a estilização é fixa na marca LCKP, e as colunas
  // primary_color / secondary_color / bg_color estão órfãs desde a Leva 1.
  const { name, codigo, logo_url, valor_armario, gateway_recipient_id } = req.body;

  if (!name || !codigo) {
    return res.status(400).json({ error: 'Nome e código são campos obrigatórios.' });
  }

  try {
    const { data, error } = await supabase
      .from('schools')
      .insert([{ name, codigo, logo_url, valor_armario, gateway_recipient_id }])
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

    // Credenciais genéricas: um objeto com os campos que AQUELE gateway pede
    // (o catálogo define quais). Chega em texto puro uma única vez, é cifrado
    // aqui e nunca mais sai. Objeto vazio limpa; ausente mantém o que existe.
    if ('credenciais_gateway' in camposParaAtualizar) {
      const bruto = camposParaAtualizar.credenciais_gateway;
      delete camposParaAtualizar.credenciais_gateway;

      const gatewayAlvo = camposParaAtualizar.gateway || req.body.gateway;
      if (gatewayAlvo && !obterGateway(gatewayAlvo)) {
        return res.status(400).json({ error: `Gateway '${gatewayAlvo}' não é suportado.` });
      }

      camposParaAtualizar.credenciais_gateway_cifrado = cifrarCredenciais(bruto);
    }
    if ('credenciais_gateway_cifrado' in req.body && !('credenciais_gateway' in req.body)) {
      delete camposParaAtualizar.credenciais_gateway_cifrado;
    }

    // Trocar de gateway para um sem adaptador deixaria a escola configurada num
    // meio de pagamento que não sabe cobrar — e o aluno descobriria no checkout.
    if (camposParaAtualizar.gateway) {
      const conferencia = validarConfiguracaoGateway({ gateway: camposParaAtualizar.gateway });
      if (!conferencia.valido) {
        return res.status(400).json({ error: conferencia.erro });
      }
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

    // Violação de CHECK não é "não encontrada": o registro existe e a regra é
    // que recusou. Traduzir tudo como 404 mandava o admin procurar a escola
    // quando o problema era o dado — no caso do semestral, o preço faltando.
    if (error?.code === '23514') {
      const regra = error.message?.includes('semestral')
        ? 'Para oferecer a locação semestral é preciso definir o preço dela.'
        : 'Alguma configuração enviada viola uma regra da instituição.';
      return res.status(400).json({ error: regra });
    }

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

// CATÁLOGO DE GATEWAYS
//
// O painel do superadmin monta o formulário de credenciais a partir daqui, em
// vez de ter os campos do PagBank escritos na tela. Assim, banco novo aparece
// no painel assim que entra no catálogo — sem mexer no front.
//
// Devolve só metadado: rótulos e quais campos são obrigatórios. Nenhum valor de
// credencial passa por esta rota.
// SUPERADMIN: confere a credencial do Banco do Brasil de uma escola.
//
// Existe para o erro aparecer AQUI, no painel, no dia em que a credencial for
// cadastrada — e não no checkout do primeiro aluno. Autentica de verdade contra
// o banco; não é validação de formato.
export const testarCredencialGateway = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: escola, error } = await supabase
      .from('schools')
      .select('id, name, codigo, gateway, gateway_ambiente, credenciais_gateway_cifrado')
      .eq('id', id)
      .maybeSingle();

    if (error || !escola) {
      return res.status(404).json({ error: 'Instituição não localizada.' });
    }

    if (escola.gateway !== 'bancodobrasil') {
      return res.status(400).json({
        error: `O teste de credencial existe hoje só para o Banco do Brasil. Esta instituição está em '${escola.gateway}'.`
      });
    }

    const resultado = await testarCredencialBB(escola);
    return res.json(resultado);
  } catch (err) {
    // A mensagem do adaptador é a informação útil (qual campo falta, o que o
    // banco respondeu). Trocá-la por um texto genérico esconderia o diagnóstico.
    console.error('[LCKP BB] Teste de credencial falhou:', err.message);
    // responderErro preserva a mensagem quando ela é ErroDeNegocio — que é o
    // caso de tudo que o adaptador do BB lança, e é justamente o diagnóstico
    // que o superadmin precisa ler. Só o inesperado vira texto genérico.
    return responderErro(res, err, 'gateway BB');
  }
};

// SUPERADMIN: registra no Banco do Brasil a URL que recebe as notificações.
//
// Passo obrigatório e fácil de esquecer: sem ele a cobrança é criada e paga
// normalmente, mas nada avisa o sistema — o aluno paga e o armário não abre.
export const registrarWebhookGateway = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: escola, error } = await supabase
      .from('schools')
      .select('id, name, codigo, gateway, gateway_ambiente, credenciais_gateway_cifrado')
      .eq('id', id)
      .maybeSingle();

    if (error || !escola) {
      return res.status(404).json({ error: 'Instituição não localizada.' });
    }

    if (escola.gateway !== 'bancodobrasil') {
      return res.status(400).json({ error: 'Esta instituição não está configurada no Banco do Brasil.' });
    }

    const base = (process.env.BACKEND_PUBLIC_URL || '').replace(/\/+$/, '');
    if (!base.startsWith('https://')) {
      return res.status(400).json({
        error: 'BACKEND_PUBLIC_URL precisa estar definida com https:// para registrar o webhook. O banco recusa endereço sem TLS.'
      });
    }

    const webhookUrl = `${base}/pagamentos/webhook/bb/${escola.codigo}`;
    const resultado = await registrarWebhookBB(escola, webhookUrl);
    return res.json(resultado);
  } catch (err) {
    console.error('[LCKP BB] Registro de webhook falhou:', err.message);
    // responderErro preserva a mensagem quando ela é ErroDeNegocio — que é o
    // caso de tudo que o adaptador do BB lança, e é justamente o diagnóstico
    // que o superadmin precisa ler. Só o inesperado vira texto genérico.
    return responderErro(res, err, 'gateway BB');
  }
};

export const listarCatalogoGateways = async (req, res) => {
  try {
    const catalogo = listarGateways().map((g) => ({
      id: g.id,
      nome: g.nome,
      legado: Boolean(g.legado),
      implementado: Boolean(g.implementado),
      // `provado` distingue "o código existe" de "alguém já pagou por aqui".
      // O painel usa para avisar que o gateway ainda não passou por transação
      // real, em vez de deixar quem configura descobrir sozinho.
      provado: g.provado !== false,
      // Gateway pausado (BB): o painel esconde da lista para ninguém colocar
      // escola nele — o backend também recusa gravar, mas ocultar evita a
      // confusão de oferecer uma opção que não pode ser salva.
      pausado: Boolean(g.pausado),
      formasPagamento: g.formasPagamento || null,
      observacao: g.observacao || null,
      campos: g.campos.map((c) => ({
        chave: c.chave,
        rotulo: c.rotulo,
        segredo: Boolean(c.segredo),
        obrigatorio: Boolean(c.obrigatorio)
      })),
      // Só o Mercado Pago usa recebedor: é o que faz o dinheiro cair na conta
      // da escola em vez da nossa.
      campoRecebedor: g.campoRecebedor || null
    }));

    return res.json({ padrao: GATEWAY_PADRAO, gateways: catalogo });
  } catch (err) {
    console.error('Erro ao listar o catálogo de gateways:', err.message);
    return res.status(500).json({ error: 'Não foi possível carregar os meios de pagamento.' });
  }
};
