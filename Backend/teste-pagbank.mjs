// Teste do adaptador do PagBank contra a API REAL (sandbox).
//
// Por que existe: o adaptador do PagBank ficou muito tempo marcado como "não
// provado" — o código existia, mas nada tinha passado pela API de verdade.
// Este teste cria uma cobrança Pix real no sandbox e confere que a resposta
// tem a forma que o checkout espera.
//
// O TOKEN NÃO FICA NO REPOSITÓRIO. Ele vem do ambiente:
//
//   PAGBANK_TOKEN=<token de sandbox>  node teste-pagbank.mjs
//
// Sem a variável, o teste pula a parte de rede e roda só o que é offline
// (assinatura de webhook, leitura de evento) — assim ele nunca quebra o CI.

import crypto from 'crypto';

process.env.CREDENCIAIS_SECRET ||= 'a'.repeat(64);

const { cifrarCredenciais } = await import('./src/utils/cripto.js');
const {
    criarCobrancaPagBank,
    obterChavePublicaPagBank,
    validarWebhookPagBank,
    lerEventoWebhookPagBank,
    consultarPedidoPagBank
} = await import('./src/servicos/pagBank.js');

const TOKEN = process.env.PAGBANK_TOKEN || '';

let passou = 0;
let falhou = 0;
let pulou = 0;
const ok = (nome, condicao, detalhe = '') => {
    if (condicao) { passou++; console.log(`  ok   ${nome}`); }
    else { falhou++; console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ''}`); }
};
const pular = (nome) => { pulou++; console.log(`  --   ${nome} (sem PAGBANK_TOKEN)`); };

const montarEscola = (token, ambiente = 'sandbox') => ({
    id: 'escola-teste',
    name: 'Etec Bento Quirino',
    codigo: 'etec-043',
    gateway: 'pagbank',
    gateway_ambiente: ambiente,
    credenciais_gateway_cifrado: cifrarCredenciais({ token })
});

// =====================================================================
// OFFLINE — rodam sempre
// =====================================================================
console.log('\n== assinatura do webhook ==');
{
    // O PagBank manda SHA-256 de `{token}-{corpo cru}`. Errar isso faz TODA
    // notificação legítima ser rejeitada: o aluno paga e o armário não abre.
    const token = 'token-de-teste';
    const escola = montarEscola(token);
    const corpoCru = '{"id":"ORDE_123","charges":[{"status":"PAID"}]}';
    const assinatura = crypto.createHash('sha256')
        .update(`${token}-${corpoCru}`, 'utf8').digest('hex');

    const req = (cabecalhos, cru) => ({ headers: cabecalhos, rawBody: cru });

    ok('aceita assinatura correta',
        validarWebhookPagBank(req({ 'x-authenticity-token': assinatura }, corpoCru), escola));
    ok('recusa assinatura errada',
        !validarWebhookPagBank(req({ 'x-authenticity-token': 'a'.repeat(64) }, corpoCru), escola));
    ok('recusa quando falta o cabeçalho',
        !validarWebhookPagBank(req({}, corpoCru), escola));
    ok('recusa se o corpo cru foi alterado',
        !validarWebhookPagBank(req({ 'x-authenticity-token': assinatura }, corpoCru + ' '), escola));
}

console.log('\n== leitura do evento ==');
{
    const evento = lerEventoWebhookPagBank({
        id: 'ORDE_999',
        reference_id: 'TX-123',
        charges: [{ id: 'CHAR_1', reference_id: 'TX-123', status: 'PAID' }]
    });
    ok('PAID vira aprovado', evento?.statusTraduzido === 'aprovado', evento?.statusTraduzido);
    ok('usa o reference_id como referência interna', evento?.referenciaInterna === 'TX-123');

    const recusado = lerEventoWebhookPagBank({ id: 'X', charges: [{ status: 'DECLINED' }] });
    ok('DECLINED vira recusado', recusado?.statusTraduzido === 'recusado');
    ok('corpo sem cobrança devolve null', lerEventoWebhookPagBank({}) === null);
}

console.log('\n== credencial ausente ==');
{
    const semToken = { ...montarEscola('x'), credenciais_gateway_cifrado: null, pagbank_token_cifrado: null };
    try {
        await obterChavePublicaPagBank(semToken);
        ok('recusa escola sem credencial', false, 'não lançou');
    } catch (err) {
        ok('recusa escola sem credencial', true);
        ok('mensagem é acionável', /não está configurada/i.test(err.message), err.message);
    }
}

// =====================================================================
// REDE — só com PAGBANK_TOKEN
// =====================================================================
console.log('\n== API real (sandbox) ==');
if (!TOKEN) {
    pular('chave pública');
    pular('cobrança Pix');
} else {
    const escola = montarEscola(TOKEN);

    try {
        const chave = await obterChavePublicaPagBank(escola);
        ok('obtém a chave pública de cartão', typeof chave === 'string' && chave.length > 100);
    } catch (err) {
        ok('obtém a chave pública de cartão', false, err.message);
    }

    try {
        const cobranca = await criarCobrancaPagBank({
            escola,
            armario: { id: 'arm-42', nome: 'A-42' },
            valorTotal: 100.0,
            transactionId: 'TX-TESTE-' + Date.now(),
            cliente: { nome: 'Aluno Teste', cpf: '39053344705', telefone: '19999999999', email: 'aluno@teste.com' },
            dadosPagamento: { formaPagamento: 'pix' },
            notificationUrl: 'https://exemplo.com/pagamentos/webhook/pagbank/etec-043',
            expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });

        ok('cria a cobrança Pix', Boolean(cobranca.gatewayId));
        ok('nasce pendente', cobranca.statusTraduzido === 'pendente', cobranca.statusTraduzido);
        // O checkout devolve isto ao front, que desenha o QR. Se vier vazio, o
        // aluno fica olhando um spinner com a cobrança criada.
        ok('devolve o copia-e-cola do Pix',
            String(cobranca.qrCode || '').startsWith('000201'), cobranca.qrCode?.slice(0, 30));
        ok('devolve a imagem do QR (o PagBank manda link, não base64)',
            String(cobranca.qrCodeImagemUrl || '').startsWith('https://'), cobranca.qrCodeImagemUrl);
    } catch (err) {
        ok('cria a cobrança Pix', false, err.message);
    }
}

// =====================================================================
// consultarPedidoPagBank — a correção do bug encontrado em produção
// =====================================================================
// O sandbox do PagBank manda a notificação REAL de pagamento sem
// x-authenticity-token — problema relatado na comunidade deles. A versão
// antiga do webhook descartava essa notificação por "faltar assinatura", e o
// aluno pagava sem o armário nunca abrir. A correção trata o webhook sem
// assinatura como um sinal e confirma o status aqui, direto na API.
console.log('\n== consultarPedidoPagBank (a correção do webhook sem assinatura) ==');
if (!TOKEN) {
    pular('confirma pedido pendente direto na API');
} else {
    const escola = montarEscola(TOKEN);
    try {
        // Valor acima de R$ 400: a tabela de simulação do sandbox mantém a
        // cobrança em WAITING indefinidamente, então o teste não corre contra
        // o relógio do próprio simulador aprovando sozinho.
        const cobranca = await criarCobrancaPagBank({
            escola,
            armario: { id: 'arm-99', nome: 'B-99' },
            valorTotal: 450.0,
            transactionId: 'TX-CONFIRMA-' + Date.now(),
            cliente: { nome: 'Aluno Teste', cpf: '39053344705', telefone: '19999999999', email: 'aluno@teste.com' },
            dadosPagamento: { formaPagamento: 'pix' },
            notificationUrl: 'https://exemplo.com/pagamentos/webhook/pagbank/etec-043',
            expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });

        const confirmacao = await consultarPedidoPagBank(escola, cobranca.gatewayId);
        ok('confirma pedido pendente direto na API',
            confirmacao.statusTraduzido === 'pendente', confirmacao.statusTraduzido);
    } catch (err) {
        ok('confirma pedido pendente direto na API', false, err.message);
    }
}

console.log(`\n${passou} passaram, ${falhou} falharam, ${pulou} pulados`);
process.exit(falhou ? 1 : 0);
