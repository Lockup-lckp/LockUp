// Catálogo de gateways de pagamento suportados.
//
// Antes disso, adicionar um banco significava: criar colunas próprias no banco
// de dados, somar um `if` no checkout, e editar quatro lugares que listavam
// essas colunas pelo nome. Aqui cada gateway é UMA entrada descrevendo o que
// precisa, e o resto do sistema lê daqui em vez de saber nomes de banco.
//
// O que uma entrada declara:
//   campos            → quais credenciais o gateway exige (monta o formulário
//                       do superadmin e valida o que chega)
//   suportaSplit      → se dá para dividir o pagamento e reter comissão
//   modelosSuportados → 'direto' (conta da própria escola) e/ou 'split'
//   identificaWebhook → COMO se descobre de qual escola é uma notificação.
//                       É a pergunta que, sem resposta, faz o dinheiro entrar
//                       e o armário não abrir.

export const MODELOS_RECEBIMENTO = Object.freeze({
    // A credencial é da conta da PRÓPRIA escola. O dinheiro cai lá e nunca
    // passa pela LCKP — logo, comissão automática é impossível neste modelo.
    DIRETO: 'direto',
    // O pagamento passa pela conta da LCKP e é dividido na hora, com a escola
    // como recebedora. É o único modelo em que a comissão funciona sozinha.
    //
    // DECISÃO (2026-08-10): split fica restrito ao Mercado Pago, como já está.
    // Banco novo entra sempre como 'direto' e a comissão é faturada no fim do
    // mês. Isso é o que permite aceitar qualquer banco que a escola use, sem
    // depender de ele oferecer divisão de pagamento.
    SPLIT: 'split'
});

export const COBRANCA_COMISSAO = Object.freeze({
    // O gateway desconta no ato. Exige split.
    AUTOMATICA: 'automatica',
    // O dinheiro vai inteiro para a escola e a LCKP cobra o combinado depois,
    // fora do sistema. `taxa_comissao` continua valendo: é a base do cálculo.
    FATURADA: 'faturada'
});

export const GATEWAYS = Object.freeze({
    mercadopago: {
        id: 'mercadopago',
        nome: 'Mercado Pago',
        // As credenciais do Mercado Pago NÃO ficam por escola: o access token é
        // da conta da LCKP e vive em MP_ACCESS_TOKEN, no ambiente. A escola
        // entra como recebedora do split, via `gateway_recipient_id`.
        campos: [],
        campoRecebedor: 'gateway_recipient_id',
        suportaSplit: true,
        modelosSuportados: ['split'],
        identificaWebhook:
            'URL única. A notificação casa com a locação por `rentals.gateway_id`, o que só funciona porque a conta é uma só.',
        observacao:
            'Único gateway com credencial de produção testada ponta a ponta (Pix, 2026-08-06).'
    },

    pagbank: {
        id: 'pagbank',
        nome: 'PagBank',
        campos: [
            { chave: 'token', rotulo: 'Token da conta', segredo: true, obrigatorio: true }
        ],
        suportaSplit: false, // o PagBank tem split, mas não foi implementado aqui
        modelosSuportados: ['direto'],
        identificaWebhook:
            'O código da escola vai na própria URL (/pagamentos/webhook/pagbank/:schoolCode), porque é preciso saber QUAL credencial usar antes de confiar no corpo.',
        observacao:
            'A ETEC Bento Quirino usava este gateway e vai migrar para o Banco do Brasil.'
    }

    // Banco do Brasil entra aqui quando a reunião definir QUAL API a escola vai
    // liberar. A API Pix (cobrança por chave) e a API de Cobranças (boleto) são
    // integrações diferentes e mudam o adaptador inteiro — declarar os campos
    // antes de saber disso seria adivinhação. O que já se sabe: será modelo
    // 'direto', porque a conta é da APM da escola.
});

export const listarGateways = () => Object.values(GATEWAYS);

export const obterGateway = (id) => GATEWAYS[id] || null;

// Valida a combinação gateway + modelo + comissão ANTES de gravar.
//
// Existe porque a falha aqui é silenciosa: configurar comissão num gateway que
// não divide pagamento não dá erro nenhum — o dinheiro simplesmente vai 100%
// para a escola e a diferença só aparece no fechamento do mês.
export const validarConfiguracaoGateway = ({ gateway, modeloRecebimento, taxaComissao, recebedorId, cobrancaComissao }) => {
    const descritor = obterGateway(gateway);
    if (!descritor) {
        return { valido: false, erro: `Gateway '${gateway}' não é suportado. Disponíveis: ${Object.keys(GATEWAYS).join(', ')}.` };
    }

    const modelo = modeloRecebimento || MODELOS_RECEBIMENTO.DIRETO;
    if (!descritor.modelosSuportados.includes(modelo)) {
        return {
            valido: false,
            erro: `${descritor.nome} não trabalha no modelo '${modelo}'. Suportado: ${descritor.modelosSuportados.join(', ')}.`
        };
    }

    const taxa = Number(taxaComissao) || 0;

    if (taxa < 0 || taxa > 1) {
        return { valido: false, erro: 'A comissão precisa ser uma fração entre 0 e 1 (ex.: 0.1 para 10%).' };
    }

    // Comissão é válida nos dois modelos. O que muda é COMO ela é cobrada:
    // 'automatica' o gateway desconta na hora, 'faturada' a LCKP cobra da
    // escola no fim do mês. Só a automática depende do gateway saber dividir.
    const cobranca = cobrancaComissao || COBRANCA_COMISSAO.FATURADA;

    if (cobranca === COBRANCA_COMISSAO.AUTOMATICA) {
        if (modelo !== MODELOS_RECEBIMENTO.SPLIT) {
            return {
                valido: false,
                erro: 'Desconto automático exige o modelo de split — no modelo direto o dinheiro vai inteiro para a escola e não há por onde reter. Use cobrança faturada.'
            };
        }
        if (!descritor.suportaSplit) {
            return {
                valido: false,
                erro: `${descritor.nome} não divide pagamento, então o desconto automático nunca aconteceria. Use cobrança faturada.`
            };
        }
    }

    if (modelo === MODELOS_RECEBIMENTO.SPLIT && descritor.campoRecebedor && !recebedorId) {
        return {
            valido: false,
            erro: `No modelo de split é obrigatório informar o recebedor (${descritor.campoRecebedor}). Sem ele o pagamento fica inteiro na conta da LCKP.`
        };
    }

    return { valido: true };
};

// Confere se as credenciais informadas cobrem os campos obrigatórios do
// gateway. Devolve a lista do que falta, para a mensagem dizer o que fazer.
export const conferirCredenciais = (gateway, credenciais = {}) => {
    const descritor = obterGateway(gateway);
    if (!descritor) return { completo: false, faltando: [] };

    const faltando = descritor.campos
        .filter((campo) => campo.obrigatorio && !credenciais[campo.chave])
        .map((campo) => campo.rotulo);

    return { completo: faltando.length === 0, faltando };
};
