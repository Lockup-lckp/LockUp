// Catálogo de gateways de pagamento suportados.
//
// Adicionar um banco significava criar colunas próprias no banco de dados,
// somar um `if` no checkout e editar quatro lugares que listavam essas colunas
// pelo nome. Aqui cada gateway é UMA entrada descrevendo o que precisa, e o
// resto do sistema lê daqui em vez de saber nomes de banco.
//
// ---------------------------------------------------------------------
// DECISÃO (2026-08-14): Banco do Brasil é o gateway do sistema
// ---------------------------------------------------------------------
// As escolas em negociação usam BB. Outro banco entra quando existir escola que
// precise dele — e o custo disso é uma entrada aqui mais um adaptador.
//
// Mercado Pago e PagBank continuam declarados como LEGADO: o Mercado Pago é o
// único caminho com credencial de produção testada ponta a ponta, e desligá-lo
// antes de o BB estar validado deixaria o sistema sem forma nenhuma de cobrar.
//
// ---------------------------------------------------------------------
// DECISÃO (2026-08-14): não há comissão
// ---------------------------------------------------------------------
// A LCKP cobra LICENCIAMENTO DE SOFTWARE da instituição, não percentual sobre a
// locação. O dinheiro do aluno vai inteiro para a conta da escola e nunca passa
// pela LCKP.
//
// Por isso saíram deste arquivo: split, `taxa_comissao`, `application_fee` e a
// distinção entre comissão automática e faturada. As colunas continuam no banco
// como legado (ver a migração de 2026-08-14), mas nada as lê para cobrar.

export const GATEWAYS = Object.freeze({
    bancodobrasil: {
        id: 'bancodobrasil',
        nome: 'Banco do Brasil',
        // A conta é da própria instituição (na ETEC, da APM): o dinheiro cai lá
        // por natureza, sem intermediário.
        campos: [
            { chave: 'client_id', rotulo: 'Client ID', segredo: true, obrigatorio: true },
            { chave: 'client_secret', rotulo: 'Client Secret', segredo: true, obrigatorio: true },
            { chave: 'app_key', rotulo: 'Chave de aplicação (gw-app-key)', segredo: true, obrigatorio: true },
            { chave: 'chave_pix', rotulo: 'Chave Pix da conta da instituição', segredo: false, obrigatorio: true },
            { chave: 'certificado', rotulo: 'Certificado de cliente mTLS (PEM)', segredo: true, obrigatorio: true },
            { chave: 'certificado_chave', rotulo: 'Chave privada do certificado (PEM)', segredo: true, obrigatorio: true }
        ],
        // O adaptador existe e segue o padrão Pix do Banco Central. O que ainda
        // não aconteceu é o teste com credencial real — o cadastro de
        // desenvolvedor está em aprovação no banco. Por isso `provado: false`:
        // o sistema funciona, mas ninguém pagou por aqui ainda.
        implementado: true,
        provado: false,
        // ---------------------------------------------------------------
        // PAUSADO (2026-08-17): o cadastro no Portal Developers do BB fica
        // sob o CNPJ da APM, e as pessoas vinculadas a esse CNPJ não têm
        // poderes para assinar o termo de produção. Sem representante legal
        // com poderes, o contrato de API não sai. O código continua aqui,
        // pronto, para o dia em que a APM resolver a questão de poderes —
        // mas HOJE nenhuma escola usa o BB. A Bento Quirino foi para o
        // PagBank (ver abaixo).
        // ---------------------------------------------------------------
        pausado: true,
        // Só Pix. Cartão pelo BB exige TEF com pinpad no totem, que é outro
        // projeto — está no documento de formas de pagamento entregue à escola.
        formasPagamento: ['pix'],
        identificaWebhook:
            'O código da escola vai na URL (/pagamentos/webhook/bb/:schoolCode). O corpo da notificação NÃO é confiável: ele só aponta qual cobrança olhar, e o status é confirmado consultando a API do banco com a nossa própria credencial.',
        observacao:
            'Integração pausada: o cadastro de produção depende de representante legal da APM com poderes para assinar, o que não foi possível. Código mantido para retomada futura.'
    },

    mercadopago: {
        id: 'mercadopago',
        nome: 'Mercado Pago',
        legado: true,
        // O access token é da conta da LCKP e vive em MP_ACCESS_TOKEN. É o único
        // gateway em que o dinheiro passa por nós — herança do modelo antigo,
        // de antes da decisão por licenciamento.
        campos: [],
        implementado: true,
        provado: true,
        identificaWebhook:
            'URL única. A notificação casa com a locação por `rentals.gateway_id`, o que só funciona porque a conta é uma só.',
        observacao:
            'Gateway padrão das escolas em geral. Credencial de produção testada ponta a ponta (Pix, 2026-08-06). O dinheiro passa pela conta da LCKP — herança do modelo antigo.'
    },

    pagbank: {
        id: 'pagbank',
        nome: 'PagBank',
        campos: [
            { chave: 'token', rotulo: 'Token da conta PagBank', segredo: true, obrigatorio: true }
        ],
        // ---------------------------------------------------------------
        // ATIVO para a ETEC Bento Quirino (2026-08-17). Depois que o Banco
        // do Brasil travou na assinatura do termo (ver acima), a Bento
        // Quirino passou a receber pelo PagBank: a credencial é o token da
        // conta da PRÓPRIA instituição, então o dinheiro cai direto lá,
        // sem intermediário nem comissão.
        // ---------------------------------------------------------------
        implementado: true,
        // O adaptador autentica e gera cobrança (Pix e cartão), mas ainda
        // não houve um pagamento REAL de ponta a ponta em produção — trata
        // como não provado até o primeiro aluno pagar de verdade.
        provado: false,
        // Aceita Pix e cartão. O Pix é o caminho natural no totem; o cartão
        // é digitado na tela (cifrado no navegador pelo SDK do PagBank).
        formasPagamento: ['pix', 'cartao'],
        identificaWebhook:
            'O código da escola vai na própria URL (/pagamentos/webhook/pagbank/:schoolCode), porque é preciso saber QUAL credencial usar antes de confiar no corpo. A notificação é autenticada por SHA-256 do corpo com o token da conta.',
        observacao:
            'Conta da própria instituição — o dinheiro cai direto nela. Ativo para a ETEC Bento Quirino. O token é gerado no painel do PagBank (sandbox para testes, produção para valer).'
    }
});

// Gateway sugerido para uma escola NOVA. Voltou a ser o Mercado Pago depois que
// o Banco do Brasil ficou pausado: é o único com credencial de produção testada
// e não exige configuração por escola. O PagBank é escolhido caso a caso (hoje,
// só a Bento Quirino). Este valor é apenas uma sugestão exibida no painel — a
// coluna schools.gateway tem seu próprio default no banco.
export const GATEWAY_PADRAO = 'mercadopago';

export const listarGateways = () => Object.values(GATEWAYS);

// Só os que uma escola nova deveria poder escolher.
export const listarGatewaysAtivos = () => Object.values(GATEWAYS).filter((g) => !g.legado);

export const obterGateway = (id) => GATEWAYS[id] || null;

// Valida a configuração de pagamento de uma escola ANTES de gravar.
//
// Ficou pequena depois que a comissão saiu: o que resta é garantir que o
// gateway existe e que já foi implementado. Configurar uma escola num gateway
// sem adaptador faria o aluno chegar até o checkout e receber um erro sem
// explicação.
export const validarConfiguracaoGateway = ({ gateway }) => {
    const descritor = obterGateway(gateway);
    if (!descritor) {
        return {
            valido: false,
            erro: `Gateway '${gateway}' não é suportado. Disponíveis: ${Object.keys(GATEWAYS).join(', ')}.`
        };
    }

    if (!descritor.implementado) {
        return {
            valido: false,
            erro: `A integração com ${descritor.nome} ainda não está pronta. ${descritor.observacao}`
        };
    }

    // Gateway pausado tem código pronto, mas não pode receber escola nova: é o
    // caso do Banco do Brasil, travado na assinatura do termo. Sem esta recusa,
    // alguém poderia colocar uma escola nele pelo painel e o aluno só descobrir
    // no checkout que não há como pagar.
    if (descritor.pausado) {
        return {
            valido: false,
            erro: `A integração com ${descritor.nome} está pausada. ${descritor.observacao}`
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
