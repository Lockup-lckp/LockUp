import crypto from 'crypto';
import { decifrar, decifrarCredenciais } from '../utils/cripto.js';
import { ErroDeNegocio } from '../utils/erros.js';

// Adaptador do PagBank (API de Pedidos).
//
// Diferença central em relação ao Mercado Pago: aqui a credencial é da conta da
// PRÓPRIA ESCOLA, então o dinheiro já cai na conta da instituição por natureza —
// não existe split, application_fee nem marketplace collector neste fluxo.
//
// Hoje só a ETEC Bento Quirino usa PagBank; todas as demais escolas seguem no
// Mercado Pago.
//
// Docs: https://developer.pagbank.com.br/reference/criar-pedido

const URLS = {
    sandbox: 'https://sandbox.api.pagseguro.com',
    producao: 'https://api.pagseguro.com'
};

// PagBank trabalha com CENTAVOS INTEIROS. O Mercado Pago usa reais decimais.
// Converter errado cobra 100x a mais ou a menos do aluno.
const paraCentavos = (reais) => Math.round(Number(reais) * 100);

// Vocabulário único de status do app (o mesmo do Mercado Pago), para o resto
// do sistema não precisar saber qual gateway processou a cobrança.
const traduzirStatusPagBank = (status) => {
    if (status === 'PAID') return 'aprovado';
    if (['AUTHORIZED', 'WAITING', 'IN_ANALYSIS'].includes(status)) return 'pendente';
    return 'recusado'; // DECLINED, CANCELED
};

/**
 * Token da conta da escola.
 *
 * Lê os DOIS formatos de propósito. Desde a migração de 2026-08-10 o painel do
 * superadmin grava toda credencial no formato genérico
 * (`credenciais_gateway_cifrado`, um JSON cifrado); as escolas configuradas
 * antes têm o token na coluna própria `pagbank_token_cifrado`.
 *
 * Ler só a coluna antiga era uma armadilha silenciosa: quem reconfigurasse o
 * PagBank pelo painel salvava um token que este adaptador nunca leria, e o
 * checkout respondia "credencial não configurada" com a credencial na tela.
 */
export const obterTokenPagBank = (escola) => {
    const generico = decifrarCredenciais(escola.credenciais_gateway_cifrado);
    const token = generico.token
        || (escola.pagbank_token_cifrado ? decifrar(escola.pagbank_token_cifrado) : null);

    if (!token) {
        throw new ErroDeNegocio('A credencial do PagBank desta instituição não está configurada.');
    }
    return token;
};

const obterToken = obterTokenPagBank;

// Mesma história do token: `gateway_ambiente` é o campo atual, `pagbank_ambiente`
// é o de antes da unificação. O padrão é sandbox — errar para o lado que não
// move dinheiro de verdade.
const obterBaseUrl = (escola) =>
    URLS[escola.gateway_ambiente || escola.pagbank_ambiente] || URLS.sandbox;

const chamarApi = async (escola, caminho, corpo) => {
    const resposta = await fetch(`${obterBaseUrl(escola)}${caminho}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${obterToken(escola)}`,
            'Content-Type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify(corpo)
    });

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        // O PagBank devolve error_messages[] com description/parameter_name.
        const detalhe = dados?.error_messages?.map((e) => e.description).join('; ');
        throw new ErroDeNegocio(detalhe || `PagBank respondeu ${resposta.status}.`, 502);
    }

    return dados;
};

/**
 * Chave pública de cifragem de cartão da conta da escola.
 *
 * O SDK do PagBank cifra os dados do cartão no navegador com esta chave, para
 * que número e CVV nunca cheguem ao nosso backend. A chave é PÚBLICA (é feita
 * para viver no front) — quem não pode sair daqui é o token da conta, usado
 * para obtê-la.
 */
export const obterChavePublicaPagBank = async (escola) => {
    const resposta = await chamarApi(escola, '/public-keys', { type: 'card' });
    return resposta?.public_key || null;
};

/**
 * Cria a cobrança no PagBank.
 *
 * @returns {Promise<{gatewayId: string, statusTraduzido: string, qrCode: string|null, qrCodeBase64: string|null, qrCodeImagemUrl: string|null}>}
 */
export const criarCobrancaPagBank = async ({
    escola,
    armario,
    valorTotal,
    transactionId,
    cliente,          // { nome, cpf, telefone, email }
    dadosPagamento,   // { formaPagamento: 'pix'|'cartao', cartaoCriptografado?, parcelas? }
    notificationUrl,
    expiraEm          // ISO; o QR morre junto com a locação
}) => {
    const ehPix = dadosPagamento?.formaPagamento !== 'cartao';
    const valorEmCentavos = paraCentavos(valorTotal);

    const corpo = {
        reference_id: transactionId,
        customer: {
            name: cliente.nome,
            email: cliente.email || 'aluno@lckp.com.br',
            tax_id: String(cliente.cpf || '').replace(/\D/g, '')
        },
        items: [{
            reference_id: String(armario.id),
            name: `Locação do armário ${armario.nome}`,
            quantity: 1,
            unit_amount: valorEmCentavos
        }],
        ...(notificationUrl ? { notification_urls: [notificationUrl] } : {})
    };

    if (ehPix) {
        // expiration_date faz o próprio PagBank recusar o pagamento tardio, em
        // vez de deixarmos essa decisão para depois do dinheiro ter entrado.
        corpo.qr_codes = [{
            amount: { value: valorEmCentavos },
            ...(expiraEm ? { expiration_date: expiraEm } : {})
        }];
    } else {
        if (!dadosPagamento?.cartaoCriptografado) {
            throw new ErroDeNegocio('Os dados do cartão não foram cifrados pelo SDK do PagBank.');
        }
        corpo.charges = [{
            reference_id: transactionId,
            description: `Armário ${armario.nome} - ${escola.name}`.slice(0, 64),
            amount: { value: valorEmCentavos, currency: 'BRL' },
            payment_method: {
                type: 'CREDIT_CARD',
                installments: Number(dadosPagamento.parcelas) || 1,
                capture: true,
                card: { encrypted: dadosPagamento.cartaoCriptografado },
                holder: { name: cliente.nome }
            }
        }];
    }

    const pedido = await chamarApi(escola, '/orders', corpo);

    const qrCode = pedido?.qr_codes?.[0];
    // O PagBank entrega o QR como LINK para PNG, não como base64 embutido —
    // ao contrário do Mercado Pago. O front precisa tratar os dois casos.
    const imagemPng = qrCode?.links?.find((l) => l.media === 'image/png')?.href || null;

    // No Pix o pedido nasce sem cobrança liquidada: quem confirma é o webhook.
    const statusTraduzido = ehPix
        ? 'pendente'
        : traduzirStatusPagBank(pedido?.charges?.[0]?.status);

    return {
        gatewayId: String(pedido.id),
        statusTraduzido,
        qrCode: qrCode?.text || null,
        qrCodeBase64: null,
        qrCodeImagemUrl: imagemPng
    };
};

/**
 * Confirma a autenticidade da notificação.
 *
 * O PagBank manda em x-authenticity-token o SHA-256 hexadecimal de
 * `{token}-{corpo cru}`. O corpo precisa ser EXATAMENTE o recebido: se usarmos
 * o objeto já parseado e re-serializado pelo Express, qualquer diferença de
 * espaçamento muda o hash e toda notificação legítima seria rejeitada.
 * Por isso o app.js guarda req.rawBody.
 *
 * Docs: https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao
 */
export const validarWebhookPagBank = (req, escola) => {
    const assinaturaRecebida = req.headers['x-authenticity-token'];
    if (!assinaturaRecebida) {
        console.warn('[LCKP PAGBANK] Notificação sem x-authenticity-token — rejeitada.');
        return false;
    }

    const corpoCru = req.rawBody;
    if (!corpoCru) {
        console.error('[LCKP PAGBANK] req.rawBody ausente. Confira o verify do express.json em app.js.');
        return false;
    }

    let token;
    try {
        token = obterToken(escola);
    } catch (err) {
        console.error('[LCKP PAGBANK] Credencial indisponível para validar a assinatura:', err.message);
        return false;
    }

    const esperada = crypto
        .createHash('sha256')
        .update(`${token}-${corpoCru}`, 'utf8')
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(esperada),
            Buffer.from(String(assinaturaRecebida))
        );
    } catch {
        // Comprimentos diferentes: assinatura malformada.
        return false;
    }
};

/**
 * Extrai o que interessa da notificação já validada.
 * @returns {{referenciaInterna: string|null, gatewayId: string, statusTraduzido: string}|null}
 */
export const lerEventoWebhookPagBank = (corpo) => {
    const cobranca = corpo?.charges?.[0];
    if (!cobranca?.status) return null;

    return {
        // reference_id é o nosso transactionId — mais confiável para casar o
        // registro do que o id do pedido, que só conhecemos após a criação.
        referenciaInterna: cobranca.reference_id || corpo?.reference_id || null,
        gatewayId: String(corpo?.id || cobranca.id),
        statusTraduzido: traduzirStatusPagBank(cobranca.status)
    };
};
