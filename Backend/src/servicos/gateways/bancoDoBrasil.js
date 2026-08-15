import crypto from 'crypto';
import https from 'https';
import { decifrarCredenciais } from '../../utils/cripto.js';
import { ErroDeNegocio } from '../../utils/erros.js';

// Adaptador do Banco do Brasil (API Pix).
//
// Por que este gateway existe: as ETECs recebem por conta da APM no Banco do
// Brasil, e o dinheiro público não pode transitar por conta de terceiro. Aqui a
// credencial é da conta da PRÓPRIA instituição — o valor pago pelo aluno nasce
// na conta dela, sem intermediário, sem split e sem comissão.
//
// ---------------------------------------------------------------------
// O que é padrão e o que é específico do BB
// ---------------------------------------------------------------------
// O corpo das requisições segue o padrão Pix do Banco Central (bacen/pix-api),
// que todo PSP implementa igual: PUT /cob/{txid} cria a cobrança imediata,
// GET /cob/{txid} consulta. Isso NÃO é chute — é especificação pública.
//
// O que é do BB e vem da credencial que o banco entrega:
//   - o host de OAuth e o da API;
//   - a chave de aplicação (gw-dev-app-key em teste, gw-app-key em produção),
//     que vai na QUERY STRING, não em cabeçalho;
//   - o certificado de cliente mTLS.
//
// Os hosts são sobrescrevíveis por variável de ambiente (BB_OAUTH_URL,
// BB_API_URL) de propósito: se o banco entregar um endereço diferente do
// documentado, isso vira configuração no Render e não um deploy de código.

const URLS_PADRAO = {
    producao: {
        oauth: 'https://oauth.bb.com.br/oauth/token',
        api: 'https://api.bb.com.br/pix/v2',
        paramAppKey: 'gw-app-key'
    },
    sandbox: {
        oauth: 'https://oauth.sandbox.bb.com.br/oauth/token',
        api: 'https://api.sandbox.bb.com.br/pix/v2',
        paramAppKey: 'gw-dev-app-key'
    }
};

// Escopos mínimos: criar e ler cobranças, e ler os Pix recebidos. Pedir mais do
// que se usa é o tipo de coisa que trava a homologação com o banco.
const ESCOPOS = 'cob.write cob.read pix.read';

const ambienteDe = (escola) =>
    escola?.gateway_ambiente === 'sandbox' ? 'sandbox' : 'producao';

const enderecos = (escola) => {
    const padrao = URLS_PADRAO[ambienteDe(escola)];
    return {
        oauth: process.env.BB_OAUTH_URL || padrao.oauth,
        api: (process.env.BB_API_URL || padrao.api).replace(/\/+$/, ''),
        paramAppKey: padrao.paramAppKey
    };
};

/**
 * Credenciais da escola, já decifradas.
 *
 * Falha com o nome do campo que falta em vez de um erro genérico do banco: quem
 * configurou precisa saber O QUE preencher, e essa mensagem chega ao painel.
 */
export const obterCredenciaisBB = (escola) => {
    const cred = decifrarCredenciais(escola?.credenciais_gateway_cifrado);

    const obrigatorios = {
        client_id: 'Client ID',
        client_secret: 'Client Secret',
        app_key: 'Chave de aplicação',
        chave_pix: 'Chave Pix da conta',
        certificado: 'Certificado de cliente mTLS',
        certificado_chave: 'Chave privada do certificado'
    };

    const faltando = Object.entries(obrigatorios)
        .filter(([chave]) => !cred[chave])
        .map(([, rotulo]) => rotulo);

    if (faltando.length) {
        throw new ErroDeNegocio(
            `As credenciais do Banco do Brasil desta instituição estão incompletas. Falta: ${faltando.join(', ')}.`
        );
    }

    return cred;
};

// ---------------------------------------------------------------------
// Transporte
// ---------------------------------------------------------------------
// node:https em vez de fetch porque o BB exige mTLS: o certificado de CLIENTE
// precisa ir no handshake TLS. O fetch global do Node não aceita agente com
// certificado, e resolver isso com a undici acrescentaria uma dependência para
// algo que a biblioteca padrão já faz.

const requisicao = (url, { metodo = 'GET', cabecalhos = {}, corpo, cert, key }) =>
    new Promise((resolve, reject) => {
        const alvo = new URL(url);
        const dados = corpo === undefined ? null : Buffer.from(corpo, 'utf8');

        const req = https.request(
            {
                hostname: alvo.hostname,
                port: alvo.port || 443,
                path: `${alvo.pathname}${alvo.search}`,
                method: metodo,
                cert,
                key,
                headers: {
                    ...cabecalhos,
                    ...(dados ? { 'Content-Length': dados.length } : {})
                },
                timeout: 20000
            },
            (res) => {
                const pedacos = [];
                res.on('data', (p) => pedacos.push(p));
                res.on('end', () => {
                    const texto = Buffer.concat(pedacos).toString('utf8');
                    let json = null;
                    try {
                        json = texto ? JSON.parse(texto) : null;
                    } catch {
                        // Resposta não-JSON (página de erro do gateway do banco,
                        // por exemplo). O texto cru vai na mensagem de erro.
                    }
                    resolve({ status: res.statusCode, json, texto });
                });
            }
        );

        req.on('timeout', () => req.destroy(new Error('O Banco do Brasil não respondeu em 20 segundos.')));
        req.on('error', reject);
        if (dados) req.write(dados);
        req.end();
    });

// ---------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------
// O token vale ~10 minutos e é o mesmo para todas as cobranças da escola.
// Sem cache, cada aluno no checkout dispararia um OAuth a mais — e o banco
// limita a taxa de emissão.
//
// A chave do cache inclui o client_id: se a escola trocar a credencial, o token
// velho deixa de ser encontrado em vez de continuar sendo usado até vencer.

const tokens = new Map();
const MARGEM_SEGURANCA_MS = 60 * 1000;

export const limparCacheTokensBB = () => tokens.clear();

const obterToken = async (escola, cred) => {
    const chaveCache = `${escola.id}:${cred.client_id}`;
    const emCache = tokens.get(chaveCache);
    if (emCache && emCache.expiraEm > Date.now() + MARGEM_SEGURANCA_MS) {
        return emCache.token;
    }

    const { oauth } = enderecos(escola);
    const basico = Buffer.from(`${cred.client_id}:${cred.client_secret}`).toString('base64');

    const resposta = await requisicao(oauth, {
        metodo: 'POST',
        cabecalhos: {
            'Authorization': `Basic ${basico}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        corpo: new URLSearchParams({ grant_type: 'client_credentials', scope: ESCOPOS }).toString(),
        cert: cred.certificado,
        key: cred.certificado_chave
    });

    if (resposta.status !== 200 || !resposta.json?.access_token) {
        const detalhe = resposta.json?.error_description || resposta.json?.error || resposta.texto?.slice(0, 200);
        // 502: a falha é do outro lado, não do cliente que pediu o Pix.
        throw new ErroDeNegocio(`Falha ao autenticar no Banco do Brasil (${resposta.status}). ${detalhe || ''}`.trim(), 502);
    }

    const token = resposta.json.access_token;
    // expires_in vem em segundos. Se o banco omitir, 5 minutos é conservador.
    const validadeMs = (Number(resposta.json.expires_in) || 300) * 1000;
    tokens.set(chaveCache, { token, expiraEm: Date.now() + validadeMs });

    return token;
};

const chamarApi = async (escola, cred, caminho, { metodo = 'GET', corpo } = {}) => {
    const { api, paramAppKey } = enderecos(escola);
    const token = await obterToken(escola, cred);

    const url = new URL(`${api}${caminho}`);
    url.searchParams.set(paramAppKey, cred.app_key);

    const resposta = await requisicao(url.toString(), {
        metodo,
        cabecalhos: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        corpo: corpo === undefined ? undefined : JSON.stringify(corpo),
        cert: cred.certificado,
        key: cred.certificado_chave
    });

    if (resposta.status < 200 || resposta.status >= 300) {
        // O padrão Pix devolve RFC 7807: title/detail e violacoes[].
        const erro = resposta.json;
        const violacoes = Array.isArray(erro?.violacoes)
            ? erro.violacoes.map((v) => v.razao || v.propriedade).filter(Boolean).join('; ')
            : null;
        const detalhe = violacoes || erro?.detail || erro?.title || resposta.texto?.slice(0, 200);
        throw new ErroDeNegocio(`Banco do Brasil respondeu ${resposta.status}. ${detalhe || ''}`.trim(), 502);
    }

    return resposta.json;
};

// ---------------------------------------------------------------------
// Cobrança
// ---------------------------------------------------------------------

/**
 * Identificador da cobrança no padrão Pix: 26 a 35 caracteres alfanuméricos.
 *
 * O nosso transaction_id ("TX-1759...-42") tem hífens e é curto demais, então
 * não serve como txid. Geramos um próprio e guardamos em rentals.gateway_id —
 * é por ele que a notificação encontra a locação depois.
 */
export const gerarTxid = () => crypto.randomBytes(16).toString('hex'); // 32 chars

// Vocabulário único de status do app, o mesmo do Mercado Pago e do PagBank,
// para o resto do sistema não precisar saber qual gateway processou.
export const traduzirStatusBB = (status) => {
    if (status === 'CONCLUIDA') return 'aprovado';
    if (status === 'ATIVA') return 'pendente';
    // REMOVIDA_PELO_USUARIO_RECEBEDOR, REMOVIDA_PELO_PSP
    return 'recusado';
};

/**
 * Cria a cobrança Pix imediata.
 *
 * @returns {Promise<{gatewayId: string, statusTraduzido: string, qrCode: string|null, qrCodeBase64: null, qrCodeImagemUrl: null}>}
 */
export const criarCobrancaBB = async ({
    escola,
    armario,
    valorTotal,
    transactionId,
    cliente,      // { nome, cpf }
    expiraEm      // ISO; o QR morre junto com a locação
}) => {
    const cred = obterCredenciaisBB(escola);
    const txid = gerarTxid();

    // O padrão trabalha com segundos de validade, não com data final. Derivamos
    // do mesmo instante usado pela locação para os dois não se descolarem.
    const segundos = Math.max(
        60,
        Math.round((new Date(expiraEm).getTime() - Date.now()) / 1000)
    );

    const cpfLimpo = String(cliente?.cpf || '').replace(/\D/g, '');

    const corpo = {
        calendario: { expiracao: segundos },
        valor: {
            // String com 2 casas: o padrão recusa número solto, e mandar
            // "50" em vez de "50.00" é recusa na hora.
            original: Number(valorTotal).toFixed(2)
        },
        chave: cred.chave_pix,
        solicitacaoPagador: `Locacao do armario ${armario.nome}`.slice(0, 140),
        // Único lugar do padrão onde cabe uma referência nossa. Serve para
        // conciliação manual no extrato do banco.
        infoAdicionais: [
            { nome: 'Transacao', valor: String(transactionId) },
            { nome: 'Instituicao', valor: String(escola.name || '').slice(0, 200) }
        ]
    };

    // devedor é OPCIONAL no padrão e só entra com CPF válido: um CPF vazio ou
    // truncado faz o banco recusar a cobrança inteira.
    if (cpfLimpo.length === 11) {
        corpo.devedor = { cpf: cpfLimpo, nome: String(cliente?.nome || '').slice(0, 200) };
    }

    const cobranca = await chamarApi(escola, cred, `/cob/${txid}`, { metodo: 'PUT', corpo });

    return {
        gatewayId: txid,
        statusTraduzido: traduzirStatusBB(cobranca?.status),
        // pixCopiaECola é o BRCode. O front já desenha o QR a partir dele —
        // o BB não devolve imagem pronta, ao contrário do Mercado Pago.
        qrCode: cobranca?.pixCopiaECola || null,
        qrCodeBase64: null,
        qrCodeImagemUrl: null
    };
};

/**
 * Consulta a cobrança direto no banco.
 *
 * É o coração da segurança deste gateway. A notificação do Pix é autenticada
 * por mTLS do lado do BANCO — não há assinatura HMAC no corpo, como no Mercado
 * Pago e no PagBank. Como não dá para validar esse certificado atrás do
 * proxy do Render, a notificação é tratada como um SINAL, nunca como verdade:
 * ela só diz "olhe a cobrança X", e quem responde se foi paga é esta consulta,
 * autenticada com a nossa própria credencial.
 *
 * Sem isso, qualquer um que descobrisse a URL do webhook liberaria armários de
 * graça mandando um JSON.
 */
export const consultarCobrancaBB = async (escola, txid) => {
    const cred = obterCredenciaisBB(escola);
    const cobranca = await chamarApi(escola, cred, `/cob/${encodeURIComponent(txid)}`);

    return {
        txid: cobranca?.txid || txid,
        statusTraduzido: traduzirStatusBB(cobranca?.status),
        // Valor efetivamente pago, quando houver. Serve para conferir que o
        // aluno não pagou menos do que a locação custa.
        valorPago: cobranca?.pix?.[0]?.valor ? Number(cobranca.pix[0].valor) : null,
        endToEndId: cobranca?.pix?.[0]?.endToEndId || null
    };
};

/**
 * Lê os txids citados numa notificação.
 *
 * Devolve só identificadores — nada de status. O status vem de
 * consultarCobrancaBB, pelo motivo explicado acima.
 */
export const lerTxidsDaNotificacaoBB = (corpo) => {
    const lista = Array.isArray(corpo?.pix) ? corpo.pix : [];
    return [...new Set(lista.map((p) => p?.txid).filter(Boolean).map(String))];
};

/**
 * Registra a URL de notificação na chave Pix da escola.
 *
 * Chamado uma vez por escola, pelo painel do superadmin. Sem isso a cobrança é
 * criada e paga, mas nada avisa o sistema — o aluno paga e o armário não abre.
 */
export const registrarWebhookBB = async (escola, webhookUrl) => {
    const cred = obterCredenciaisBB(escola);
    await chamarApi(escola, cred, `/webhook/${encodeURIComponent(cred.chave_pix)}`, {
        metodo: 'PUT',
        corpo: { webhookUrl }
    });
    return { ok: true, chave: cred.chave_pix, webhookUrl };
};

/**
 * Conferência de credencial: autentica e consulta o webhook cadastrado.
 *
 * Existe para o superadmin descobrir que a credencial está errada AGORA, no
 * painel, e não quando o primeiro aluno tentar pagar.
 */
export const testarCredencialBB = async (escola) => {
    const cred = obterCredenciaisBB(escola);
    await obterToken(escola, cred);

    let webhook = null;
    try {
        webhook = await chamarApi(escola, cred, `/webhook/${encodeURIComponent(cred.chave_pix)}`);
    } catch {
        // 404 aqui é esperado enquanto o webhook não foi registrado; não é
        // falha de credencial, e o teste não deve reprovar por isso.
    }

    return {
        ok: true,
        ambiente: ambienteDe(escola),
        chave_pix: cred.chave_pix,
        webhook_registrado: Boolean(webhook?.webhookUrl),
        webhook_url: webhook?.webhookUrl || null
    };
};
