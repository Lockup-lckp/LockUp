import crypto from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import supabase from '../config/database.js';
import { enviarConfirmacaoLocacao, emailHabilitado } from '../servicos/email.js';
import { responderErro, ErroDeNegocio } from '../utils/erros.js';
import {
    criarCobrancaPagBank,
    validarWebhookPagBank,
    lerEventoWebhookPagBank,
    obterChavePublicaPagBank
} from '../servicos/pagBank.js';
import {
    criarCobrancaBB,
    consultarCobrancaBB,
    lerTxidsDaNotificacaoBB
} from '../servicos/gateways/bancoDoBrasil.js';

// Valida a assinatura HMAC do webhook do Mercado Pago (header x-signature).
// Sem isso, qualquer um poderia forjar uma notificação de "pagamento aprovado" e liberar armários de graça.
// O segredo vem da configuração de Webhooks no painel do Mercado Pago (MP_WEBHOOK_SECRET).
const validarAssinaturaWebhook = (req) => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[LCKP WEBHOOK] MP_WEBHOOK_SECRET não configurado - rejeitando por segurança.');
        return false;
    }

    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (!xSignature || !xRequestId) return false;

    // x-signature vem no formato "ts=...,v1=..."
    const partes = xSignature.split(',').reduce((acc, item) => {
        const [chave, valor] = item.split('=');
        if (chave && valor) acc[chave.trim()] = valor.trim();
        return acc;
    }, {});

    const ts = partes.ts;
    const assinaturaRecebida = partes.v1;
    if (!ts || !assinaturaRecebida) return false;

    // O id vem da query string da notificação (?data.id=...). IDs alfanuméricos devem ir em minúsculas.
    const dataId = req.query['data.id'] || req.body?.data?.id;
    const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${ts};`;

    const assinaturaEsperada = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(assinaturaEsperada),
            Buffer.from(assinaturaRecebida)
        );
    } catch {
        return false;
    }
};

// SDK do Mercado Pago, criada sob demanda.
//
// O Mercado Pago deixou de ser o único gateway: as ETECs recebem pelo Banco do
// Brasil, com credencial da própria conta. Derrubar o processo na partida por
// falta de MP_ACCESS_TOKEN obrigaria a manter uma credencial do Mercado Pago
// viva só para o serviço iniciar, mesmo sem nenhuma escola usando.
//
// A checagem continua existindo — apenas mudou de lugar. Ela agora acontece
// quando alguém de fato tenta cobrar pelo Mercado Pago, que é o momento em que
// a ausência importa. O motivo original da trava (subir sem credencial e só
// descobrir na hora de cobrar, com erro incompreensível) continua atendido: a
// mensagem abaixo diz exatamente o que falta.
let paymentClient = null;

const obterClienteMercadoPago = () => {
    if (!process.env.MP_ACCESS_TOKEN) {
        throw new ErroDeNegocio(
            'Esta instituição está configurada no Mercado Pago, mas o servidor não tem a credencial (MP_ACCESS_TOKEN). Fale com o suporte do LCKP.',
            503
        );
    }
    if (!paymentClient) {
        paymentClient = new Payment(new MercadoPagoConfig({
            accessToken: process.env.MP_ACCESS_TOKEN
        }));
    }
    return paymentClient;
};

// Prazo para o pagamento chegar. Passado isso a locação vira 'expirado' e não
// pode mais ser aprovada — impede o caso do aluno pagar um QR antigo horas
// depois e o armário ser vinculado quando outra pessoa já o levou.
const MINUTOS_PARA_EXPIRAR = 30;

const calcularExpiracao = () =>
    new Date(Date.now() + MINUTOS_PARA_EXPIRAR * 60 * 1000).toISOString();

// Varredura sob demanda: marca como 'expirado' o que passou do prazo. Chamada
// nos pontos de entrada do fluxo de pagamento, evitando depender de agendador.
const expirarLocacoesVencidas = async () => {
    try {
        await supabase
            .from('rentals')
            .update({ status_pagamento: 'expirado' })
            .eq('status_pagamento', 'pendente')
            .lt('expira_em', new Date().toISOString());
    } catch (err) {
        // Falha aqui não pode derrubar um checkout legítimo.
        console.error('[LCKP] Falha ao expirar locações vencidas:', err.message);
    }
};

// Calendário letivo. Fora da janela não se vende armário: entre o encerramento
// (padrão 20/12) e a abertura (padrão 01/02) os armários do ano anterior já
// foram devolvidos e o ano novo ainda não começou.
//
// A janela ATRAVESSA a virada do ano, então a comparação não é um simples
// "entre A e B" — de fevereiro a dezembro está aberto; de 21/12 a 31/01, não.
const dentroDaJanelaDeVendas = (escola) => {
    const abreDia = escola.abertura_dia ?? 1;
    const abreMes = escola.abertura_mes ?? 2;
    const fechaDia = escola.encerramento_dia ?? 20;
    const fechaMes = escola.encerramento_mes ?? 12;

    const hoje = new Date();
    const atual = (hoje.getMonth() + 1) * 100 + hoje.getDate();
    const abertura = abreMes * 100 + abreDia;
    const encerramento = fechaMes * 100 + fechaDia;

    return atual >= abertura && atual <= encerramento;
};

// Ano letivo ao qual a locação pertence. Não é simplesmente o ano corrente:
// uma compra feita em janeiro, antes da abertura, pertenceria ao ciclo que
// ainda vai começar. Como a venda só ocorre dentro da janela, o ano do ciclo
// coincide com o ano da data — mas deixar explícito evita que uma futura
// mudança de calendário quebre os relatórios em silêncio.
const anoLetivoAtual = (escola) => {
    const hoje = new Date();
    const abertura = (escola.abertura_mes ?? 2) * 100 + (escola.abertura_dia ?? 1);
    const atual = (hoje.getMonth() + 1) * 100 + hoje.getDate();
    // Antes da abertura, ainda estamos no ciclo do ano anterior.
    return atual < abertura ? hoje.getFullYear() - 1 : hoje.getFullYear();
};

// Preço e validade da modalidade escolhida.
//
// Veio do contrato da APM Etec Bento Quirino, que oferece locação anual (até
// 18/12) ou semestral (até 06/07). São preços e datas diferentes, e a data de
// término é gravada NA LOCAÇÃO: se a escola mudar o calendário no ano que vem,
// o que já foi vendido continua valendo pelo prazo que foi vendido.
const MODALIDADES = ['anual', 'semestral'];

const resolverModalidade = (escola, modalidadePedida) => {
    const modalidade = MODALIDADES.includes(modalidadePedida) ? modalidadePedida : 'anual';

    // Semestral só existe se a escola oferecer. Sem esta trava, quem chamasse
    // a API direto pagaria o preço do semestre e levaria o ano inteiro.
    if (modalidade === 'semestral' && !escola.permite_semestral) {
        return { erro: 'Esta instituição não oferece locação semestral.' };
    }

    const valor = modalidade === 'semestral'
        ? Number(escola.valor_armario_semestral)
        : Number(escola.valor_armario);

    if (!valor || valor <= 0) {
        return { erro: `O valor da locação ${modalidade} não está configurado para esta instituição.` };
    }

    const dia = modalidade === 'semestral'
        ? (escola.encerramento_semestral_dia ?? 6)
        : (escola.encerramento_dia ?? 20);
    const mes = modalidade === 'semestral'
        ? (escola.encerramento_semestral_mes ?? 7)
        : (escola.encerramento_mes ?? 12);

    const ano = anoLetivoAtual(escola);
    // Semestral comprado DEPOIS do fim do primeiro semestre valeria para uma
    // data já passada — o aluno pagaria por um prazo vencido. Recusa e manda
    // escolher anual, que é o que a escola tem a oferecer nesse ponto do ano.
    const fim = new Date(Date.UTC(ano, mes - 1, dia));
    if (modalidade === 'semestral' && fim < new Date()) {
        return {
            erro: `A locação semestral encerrou em ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}. Escolha a modalidade anual.`
        };
    }

    // A data vai como YYYY-MM-DD: `rentals.valido_ate` é DATE, e mandar um
    // timestamp faria o Postgres truncar conforme o fuso do servidor — uma
    // locação comprada à noite podia vencer um dia antes.
    return { modalidade, valor, validoAte: fim.toISOString().slice(0, 10) };
};

// Encerra o ciclo de quem já passou da data: desvincula os armários e carimba
// encerrado_em nas locações. O histórico de quem usou cada armário permanece —
// depois disso, rentals é a única fonte dessa informação.
const encerrarCiclosVencidos = async () => {
    try {
        await supabase.rpc('fn_encerrar_ciclos_vencidos');
    } catch (err) {
        // Não pode derrubar um checkout legítimo.
        console.error('[LCKP] Falha ao encerrar ciclos vencidos:', err.message);
    }
};

// Locação expirada NUNCA volta a ser aprovada.
//
// Depois de 30 minutos sem pagamento a locação vira 'expirado' e o armário
// volta à prateleira — outro aluno pode tê-lo levado desde então. Aprovar a
// locação antiga nesse ponto dispara a trigger que vincula o armário e tira o
// armário de quem pagou dentro do prazo.
//
// Os três gateways recebem uma data de validade junto da cobrança, então o
// pagamento tardio deveria ser recusado pelo próprio banco. Isto aqui é a
// segunda tranca: quando o dinheiro entra mesmo assim, é melhor a locação
// ficar parada e alguém resolver na mão do que o armário trocar de dono
// sozinho.
const naoMexerNoExpirado = (consulta) => consulta.neq('status_pagamento', 'expirado');

// Dinheiro que entrou numa locação já vencida. Não há decisão automática certa
// aqui — devolver ou honrar depende de o armário ainda estar livre —, então o
// caminho é registrar alto e deixar para uma pessoa.
// Recebe a consulta já montada (com select e filtros) porque o supabase-js
// exige o select ANTES dos filtros — montá-la aqui obrigaria a passar os
// critérios de cada gateway, que são diferentes entre si.
const alertarPagamentoDeExpirada = async (consulta) => {
    try {
        const { data } = await consulta.maybeSingle();
        if (!data) return; // Não era expirada: só notificação repetida.
        console.error(
            `[LCKP ATENÇÃO] Pagamento aprovado de locação EXPIRADA — transação ${data.transaction_id}, ` +
            `armário ${data.locker_id}, R$ ${data.valor}. O armário NÃO foi liberado. Requer decisão manual.`
        );
    } catch (err) {
        console.error('[LCKP] Falha ao apurar pagamento de locação expirada:', err.message);
    }
};

// Única fonte de verdade pro vocabulário de status usado em TODA a aplicação
// (evita o bug de comparar 'approved' (MP, inglês) com 'aprovado' (nosso banco/front, português))
const traduzirStatusMercadoPago = (statusMp) => {
    if (statusMp === 'approved') return 'aprovado';
    if (['in_process', 'pending', 'authorized', 'in_mediation'].includes(statusMp)) return 'pendente';
    return 'recusado'; // rejected, cancelled, charged_back, refunded, etc.
};

export const iniciarCheckout = async (req, res) => {
    // Checkout Transparente: o front monta o próprio formulário e envia em 'mp_data'
    // o token do cartão (gerado no navegador pelo SDK) ou a intenção de Pix.
    const { locker_id, mp_data, nome, cpf, telefone } = req.body;

    try {
        console.log(`[LCKP] Iniciando checkout para o armário: ${locker_id}`);

        // Limpa pendências vencidas antes de qualquer coisa, para que uma
        // tentativa abandonada não conte como locação ativa do aluno.
        await expirarLocacoesVencidas();
        await encerrarCiclosVencidos();

        // 1. Busca os dados do armário selecionado
        const { data: armario, error: erroArmario } = await supabase
            .from('lockers')
            .select('*')
            .eq('id', locker_id)
            .single();

        if (erroArmario || !armario) {
            return res.status(404).json({ error: 'Armário não encontrado.' });
        }
        if (armario.status !== 'disponivel') {
            return res.status(400).json({ error: 'Este armário não está disponível para locação.' });
        }

        // 2. Busca a escola vinculada ao armário (tabela 'schools')
        const { data: escola, error: erroEscola } = await supabase
            .from('schools')
            .select('*')
            .eq('id', armario.school_id)
            .single();

        if (erroEscola || !escola) {
            return res.status(404).json({ error: 'A escola configurada para este armário não foi encontrada.' });
        }

        // 2.1 TRAVA DE SEGURANÇA: o aluno só pode alugar armário da própria escola.
        // Nunca confia em school_id vindo do front/JWT - sempre busca no banco pra evitar manipulação.
        const { data: aluno, error: erroAluno } = await supabase
            .from('users')
            .select('school_id, nome_completo')
            .eq('id', req.user.id)
            .single();

        if (erroAluno || !aluno) {
            return res.status(403).json({ error: 'Usuário não identificado.' });
        }

        if (aluno.school_id !== armario.school_id) {
            return res.status(403).json({ error: 'Você só pode alugar armários da sua própria instituição de ensino.' });
        }

        // 2.2 JANELA DO CICLO LETIVO. Entre o encerramento (20/12) e a abertura
        // (01/02) não se vende armário: os do ano anterior já foram devolvidos e
        // o ano novo ainda não começou.
        if (!dentroDaJanelaDeVendas(escola)) {
            const abertura = `${String(escola.abertura_dia ?? 1).padStart(2, '0')}/${String(escola.abertura_mes ?? 2).padStart(2, '0')}`;
            return res.status(409).json({
                error: `As locações do próximo ano letivo abrem em ${abertura}. Volte a partir dessa data para escolher seu armário.`
            });
        }

        // 2.3 LIMITE DE ARMÁRIOS POR ALUNO, configurável por escola.
        // limit() e não maybeSingle(): já houve aluno com mais de um armário, e
        // maybeSingle() lança exceção com múltiplas linhas — a proteção falharia
        // justamente no caso que ela existe para tratar.
        const limiteArmarios = Number(escola.max_armarios_por_aluno) || 1;
        const { data: armariosDoAluno } = await supabase
            .from('lockers')
            .select('nome')
            .eq('usuario_id', req.user.id)
            // Filtra pela escola de propósito. Hoje um aluno pertence a uma
            // instituição só, então a contagem daria o mesmo — mas isso é um
            // pressuposto implícito, e o limite é POR ESCOLA. Explicitar aqui
            // faz a regra continuar certa se um dia a premissa mudar.
            .eq('school_id', armario.school_id)
            .limit(limiteArmarios + 1);

        if ((armariosDoAluno?.length || 0) >= limiteArmarios) {
            const nomes = armariosDoAluno.map((a) => a.nome).join(', ');
            return res.status(409).json({
                error: limiteArmarios === 1
                    ? `Você já possui o armário ${nomes}. É permitido apenas um por aluno.`
                    : `Você já possui ${limiteArmarios} armários (${nomes}), que é o limite desta instituição.`
            });
        }

        // 2.3 COBRANÇA EM DUPLICIDADE. O Pix é assíncrono: o aluno gera um QR,
        // volta e gera outro enquanto o armário ainda consta como disponível,
        // porque nenhum pagamento foi confirmado ainda. Sem esta trava as duas
        // cobranças nascem válidas e ele paga duas vezes pelo mesmo armário —
        // foi exatamente o que aconteceu no primeiro teste real.
        const { data: pendentesAbertas } = await supabase
            .from('rentals')
            .select('transaction_id, locker_id, expira_em')
            .eq('user_id', req.user.id)
            .eq('status_pagamento', 'pendente')
            .gt('expira_em', new Date().toISOString())
            .limit(1);

        const pendenteAberta = pendentesAbertas?.[0];
        if (pendenteAberta) {
            const mesmoArmario = pendenteAberta.locker_id === armario.id;
            return res.status(409).json({
                error: mesmoArmario
                    ? 'Você já tem uma cobrança em aberto para este armário. Conclua o pagamento ou aguarde 30 minutos para gerar outra.'
                    : 'Você já tem uma cobrança em aberto para outro armário. Conclua o pagamento ou aguarde 30 minutos para escolher outro.',
                transaction_id: pendenteAberta.transaction_id
            });
        }

        // 3. O preço vem da configuração da ESCOLA e da modalidade escolhida —
        // nunca do que o front mandou. Cliente que informasse o valor pagaria
        // o que quisesse.
        const plano = resolverModalidade(escola, req.body.modalidade);
        if (plano.erro) {
            return res.status(400).json({ error: plano.erro });
        }
        const valorTotal = plano.valor;

        // Geração do ID único de rastreamento da transação interna
        const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Mesmo instante para o prazo da locação e para a validade do QR no
        // gateway, senão um dos dois sobreviveria ao outro.
        const expiraEm = calcularExpiracao();

        // Validação da URL de Notificação para prevenir erros em ambiente local.
        // A barra final é removida: com BACKEND_PUBLIC_URL terminando em "/", a
        // concatenação gerava "//pagamentos/webhook", que o Express não casa e
        // faria toda notificação cair em 404.
        const baseUrlPublica = (process.env.BACKEND_PUBLIC_URL || '').replace(/\/+$/, '');
        const rawNotificationUrl = baseUrlPublica
            ? `${baseUrlPublica}/pagamentos/webhook`
            : null;
        
        // Mercado Pago exige HTTPS explícito e rejeita localhost/127.0.0.1
        const isWebhookValido = rawNotificationUrl && rawNotificationUrl.startsWith('https://');

        // 3.1 GATEWAY POR ESCOLA — Banco do Brasil.
        //
        // É o caminho das ETECs: a conta é da APM da própria instituição, então
        // o dinheiro nasce lá. Só Pix; cartão pelo BB exigiria TEF com pinpad
        // no totem, que é outro projeto.
        if (escola.gateway === 'bancodobrasil') {
            const formaPedida = mp_data?.formaPagamento
                || (mp_data?.token || mp_data?.cartaoCriptografado ? 'cartao' : 'pix');
            if (formaPedida === 'cartao') {
                return res.status(400).json({
                    error: 'Esta instituição recebe apenas por Pix. O pagamento com cartão não está disponível.'
                });
            }

            const cobranca = await criarCobrancaBB({
                escola,
                armario,
                valorTotal,
                transactionId,
                cliente: { nome, cpf },
                expiraEm
            });

            const { error: erroAluguelBB } = await supabase
                .from('rentals')
                .insert([{
                    user_id: req.user.id,
                    locker_id: armario.id,
                    school_id: armario.school_id,
                    transaction_id: transactionId,
                    status_pagamento: cobranca.statusTraduzido,
                    // O txid da cobrança. É por ele que a notificação do banco
                    // reencontra esta locação.
                    gateway_id: cobranca.gatewayId,
                    valor: valorTotal,
                    expira_em: expiraEm,
                    ano_letivo: anoLetivoAtual(escola),
                    modalidade: plano.modalidade,
                    valido_ate: plano.validoAte
                }]);

            if (erroAluguelBB) throw erroAluguelBB;

            return res.json({
                sucesso: true,
                status_pagamento: cobranca.statusTraduzido,
                transaction_id: transactionId,
                // O BB devolve o BRCode (pixCopiaECola); o front desenha o QR a
                // partir dele, porque o banco não manda imagem pronta.
                qr_code: cobranca.qrCode,
                qr_code_base64: null
            });
        }

        // 3.2 GATEWAY POR ESCOLA — PagBank (legado).
        // Todas as demais seguem no Mercado Pago (padrão da coluna).
        // No PagBank a credencial é da conta da PRÓPRIA escola, então o dinheiro
        // já cai lá — não há split, comissão nem application_fee neste caminho.
        if (escola.gateway === 'pagbank') {
            const urlWebhookPagBank = baseUrlPublica.startsWith('https://')
                ? `${baseUrlPublica}/pagamentos/webhook/pagbank/${escola.codigo}`
                : null;

            const cobranca = await criarCobrancaPagBank({
                escola,
                armario,
                valorTotal,
                transactionId,
                cliente: { nome, cpf, telefone, email: mp_data?.payer?.email },
                dadosPagamento: {
                    formaPagamento: mp_data?.formaPagamento || (mp_data?.cartaoCriptografado ? 'cartao' : 'pix'),
                    cartaoCriptografado: mp_data?.cartaoCriptografado,
                    parcelas: mp_data?.installments
                },
                notificationUrl: urlWebhookPagBank,
                expiraEm
            });

            const { error: erroAluguelPagBank } = await supabase
                .from('rentals')
                .insert([{
                    user_id: req.user.id,
                    locker_id: armario.id,
                    school_id: armario.school_id,
                    transaction_id: transactionId,
                    status_pagamento: cobranca.statusTraduzido,
                    gateway_id: cobranca.gatewayId,
                    valor: valorTotal,
                    expira_em: expiraEm,
                    ano_letivo: anoLetivoAtual(escola),
                    // Prazo gravado na compra: o que foi vendido continua
                    // valendo pelo prazo vendido, mesmo que a escola mude o
                    // calendario no ano seguinte.
                    modalidade: plano.modalidade,
                    valido_ate: plano.validoAte
                }]);

            if (erroAluguelPagBank) throw erroAluguelPagBank;

            return res.json({
                sucesso: true,
                status_pagamento: cobranca.statusTraduzido,
                transaction_id: transactionId,
                qr_code: cobranca.qrCode,
                qr_code_base64: cobranca.qrCodeBase64,
                // O PagBank entrega o QR como link de imagem, não como base64.
                qr_code_imagem_url: cobranca.qrCodeImagemUrl
            });
        }

        // 4. Monta a estrutura da requisição exigida pelo Mercado Pago para a API de Pagamentos
        const paymentData = {
            body: {
                transaction_amount: valorTotal,
                token: mp_data?.token, // Gerado no navegador por mp.createCardToken() - dado de cartão nunca chega aqui
                description: `Locação do Armário ${armario.nome} - ${escola.name}`,
                installments: mp_data?.installments || 1,
                payment_method_id: mp_data?.payment_method_id || 'pix',
                issuer_id: mp_data?.issuer_id,
                payer: {
                    email: mp_data?.payer?.email || 'aluno@lckp.com',
                    first_name: nome,
                    identification: {
                        type: 'CPF',
                        number: cpf ? cpf.replace(/\D/g, '') : '' // Remove pontos e traços do CPF safely
                    }
                },
                external_reference: transactionId,
                // O QR morre junto com a locação. Sem isto, o aluno poderia
                // pagar um código antigo horas depois e reivindicar um armário
                // que já foi de outra pessoa.
                date_of_expiration: expiraEm,
                ...(isWebhookValido ? { notification_url: rawNotificationUrl } : {})
            }
        };

        // 5. Recebedor do Mercado Pago.
        //
        // NÃO há mais comissão: desde 2026-08-14 a LCKP cobra licenciamento de
        // software da instituição, e não percentual sobre a locação. O valor
        // pago pelo aluno vai INTEIRO para a conta da escola.
        //
        // Por isso `application_fee` deixou de ser enviado. O cabeçalho de
        // recebedor continua, porque é ele que faz o dinheiro cair na conta da
        // escola em vez de ficar na da LCKP — sem ele, o pagamento é nosso.
        if (escola.gateway_recipient_id) {
            paymentData.headers = {
                'X-Marketplace-Collector-Id': escola.gateway_recipient_id
            };
        }

        // 6. Envia a cobrança em tempo real para o gateway do Mercado Pago
        const mpResponse = await obterClienteMercadoPago().create(paymentData);

        // 7. Registra o histórico da locação na tabela 'rentals' vinculando o ID do gateway e salvando as chaves estrangeiras
        const statusTraduzido = traduzirStatusMercadoPago(mpResponse.status);

        console.log(`[LCKP] Gravando registro de locação para a escola: ${armario.school_id} e armário: ${armario.id}`);
        const { data: novoAluguel, error: erroAluguel } = await supabase
            .from('rentals')
            .insert([{
                user_id: req.user.id,
                locker_id: armario.id,               // Salva o id validado vindo do banco
                school_id: armario.school_id,        // Salva o id da escola
                transaction_id: transactionId,
                status_pagamento: statusTraduzido,
                gateway_id: String(mpResponse.id),
                valor: valorTotal, // Travado no momento do pagamento
                expira_em: expiraEm,
                ano_letivo: anoLetivoAtual(escola),
                    // Prazo gravado na compra: o que foi vendido continua
                    // valendo pelo prazo vendido, mesmo que a escola mude o
                    // calendario no ano seguinte.
                    modalidade: plano.modalidade,
                    valido_ate: plano.validoAte
            }])
            .select()
            .single();

        if (erroAluguel) throw erroAluguel;

        // Retorna para o front renderizar o resultado na própria interface
        return res.json({
            sucesso: true,
            status_pagamento: statusTraduzido,
            transaction_id: transactionId,
            qr_code: mpResponse.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: mpResponse.point_of_interaction?.transaction_data?.qr_code_base64
        });

    } catch (err) {
        console.error('[LCKP ERROR] Falha no fluxo de checkout:', err);
        return responderErro(res, err, 'pagamentos');
    }
};

export const webhookPagamento = async (req, res) => {
    // Ping de validação: ao cadastrar a URL, o painel do Mercado Pago bate aqui
    // SEM cabeçalho de assinatura e espera 2xx — respondendo 401 o cadastro
    // falha com 422. Devolvemos 200 mas não processamos nada, então isto não
    // abre brecha: só a notificação com assinatura válida mexe em rentals.
    const temAssinatura = Boolean(req.headers['x-signature']);
    if (!temAssinatura) {
        console.log('[LCKP WEBHOOK] Requisição sem assinatura (validação de URL) - respondendo OK sem processar.');
        return res.status(200).send('OK');
    }

    // Assinatura presente porém inválida: ou é forjada, ou o MP_WEBHOOK_SECRET
    // está errado. Os dois casos precisam falhar alto, então segue 401.
    if (!validarAssinaturaWebhook(req)) {
        console.warn('[LCKP WEBHOOK] Assinatura inválida - requisição rejeitada.');
        return res.status(401).send('Assinatura inválida.');
    }

    const { action, data, type } = req.body;

    try {
        if (action === 'payment.created' || action === 'payment.updated' || type === 'payment') {
            const paymentId = data?.id;

            if (!paymentId) {
                return res.status(200).send('OK - Sem ID associado');
            }

            let mpPayment;
            try {
                mpPayment = await obterClienteMercadoPago().get({ id: paymentId });
            } catch (erroConsulta) {
                // Pagamento inexistente (ex.: o "Simular notificação" do painel,
                // que manda um id fictício). Devolver 500 aqui faria o Mercado
                // Pago reenviar a notificação para sempre, já que ela nunca vai
                // passar a existir. Falha de rede/indisponibilidade continua
                // subindo para o catch de fora e vira 500, aí o retry é útil.
                const naoEncontrado = erroConsulta?.status === 404
                    || /not found|404/i.test(erroConsulta?.message || '');
                if (naoEncontrado) {
                    console.log(`[LCKP WEBHOOK] Pagamento ${paymentId} não existe no Mercado Pago - nada a fazer.`);
                    return res.status(200).send('OK - Pagamento não encontrado.');
                }
                throw erroConsulta;
            }

            const statusTraduzido = traduzirStatusMercadoPago(mpPayment.status);

            const { data: aluguelAtualizado, error } = await naoMexerNoExpirado(
                supabase
                    .from('rentals')
                    .update({ status_pagamento: statusTraduzido })
                    .eq('gateway_id', String(paymentId))
                    .neq('status_pagamento', statusTraduzido)
            )
                .select()
                .maybeSingle();

            if (error) throw error;

            if (!aluguelAtualizado && statusTraduzido === 'aprovado') {
                await alertarPagamentoDeExpirada(
                    supabase.from('rentals')
                        .select('transaction_id, locker_id, valor')
                        .eq('gateway_id', String(paymentId))
                        .eq('status_pagamento', 'expirado')
                );
            }

            if (aluguelAtualizado && statusTraduzido === 'aprovado') {
                console.log(`[LCKP WEBHOOK] Sucesso! Armário ${aluguelAtualizado.locker_id} liberado para uso.`);
                // Sem await: a resposta ao gateway nao espera o e-mail. Webhook
                // que demora demais e reenviado, e o reenvio duplicaria a mensagem.
                enviarEmailDeConfirmacao(aluguelAtualizado);
            }
        }

        return res.status(200).send('Webhook processado.');
    } catch (err) {
        console.error('[LCKP ERROR] Falha ao processar o webhook do gateway:', err.message);
        return responderErro(res, err, 'pagamentos');
    }
};

// Informa ao front qual gateway a escola usa e, no caso do PagBank, a chave
// pública para o SDK cifrar o cartão no navegador. O front precisa disso ANTES
// de montar o formulário — é o que decide qual SDK carregar.
export const obterConfigPagamento = async (req, res) => {
    const { schoolCode } = req.params;

    try {
        const { data: escola, error } = await supabase
            .from('schools')
            // As duas gerações de colunas: o painel grava em
            // credenciais_gateway_cifrado, escolas antigas têm pagbank_token_cifrado.
            .select('id, codigo, gateway, pagbank_token_cifrado, pagbank_ambiente, credenciais_gateway_cifrado, gateway_ambiente')
            .eq('codigo', schoolCode)
            .maybeSingle();

        if (error || !escola) {
            return res.status(404).json({ error: 'Instituição não encontrada.' });
        }

        const gateway = escola.gateway || 'mercadopago';

        if (gateway !== 'pagbank') {
            return res.json({ gateway });
        }

        // Checar a coluna antiga aqui recusava escolas configuradas pelo painel,
        // que grava no formato genérico. Quem sabe onde a credencial mora é o
        // adaptador — e ele lança ErroDeNegocio com a frase certa se faltar.
        const chavePublica = await obterChavePublicaPagBank(escola);
        return res.json({
            gateway,
            ambiente: escola.gateway_ambiente || escola.pagbank_ambiente || 'sandbox',
            chave_publica: chavePublica
        });
    } catch (err) {
        // responderErro deixa passar a frase do ErroDeNegocio ("a credencial
        // desta instituição não está configurada"), que é acionável para quem
        // administra, e engole o resto atrás de uma mensagem genérica.
        return responderErro(res, err, 'obter configuração de pagamento',
            'Não foi possível preparar o pagamento.');
    }
};

// Webhook do PagBank. O código da escola vem na URL porque cada instituição
// tem a própria credencial, e é ela que autentica a notificação — precisamos
// saber QUAL chave usar antes de confiar em qualquer coisa vinda no corpo.
//
// Assim como no Mercado Pago, aqui só atualizamos rentals.status_pagamento:
// a liberação do armário (status + vínculo com o aluno) acontece sozinha via
// trigger no Postgres (fn_liberar_armario_apos_aprovacao).
export const webhookPagBank = async (req, res) => {
    const { schoolCode } = req.params;

    try {
        const { data: escola, error: erroEscola } = await supabase
            .from('schools')
            .select('id, codigo, pagbank_token_cifrado, pagbank_ambiente, credenciais_gateway_cifrado, gateway_ambiente')
            .eq('codigo', schoolCode)
            .maybeSingle();

        if (erroEscola || !escola) {
            console.warn(`[LCKP PAGBANK] Notificação para escola desconhecida: ${schoolCode}`);
            return res.status(404).send('Instituição não encontrada.');
        }

        // Mesma lógica do Mercado Pago: ping de validação sem assinatura recebe
        // 200 sem ser processado; assinatura presente e inválida falha alto.
        if (!req.headers['x-authenticity-token']) {
            console.log('[LCKP PAGBANK] Requisição sem assinatura (validação de URL) - respondendo OK sem processar.');
            return res.status(200).send('OK');
        }

        if (!validarWebhookPagBank(req, escola)) {
            console.warn('[LCKP PAGBANK] Assinatura inválida - requisição rejeitada.');
            return res.status(401).send('Assinatura inválida.');
        }

        const evento = lerEventoWebhookPagBank(req.body);
        if (!evento) {
            return res.status(200).send('OK - Evento sem cobrança associada.');
        }

        // Casamos pelo reference_id (nosso transaction_id) quando disponível;
        // o id do pedido serve de reserva.
        let consulta = naoMexerNoExpirado(
            supabase
                .from('rentals')
                .update({ status_pagamento: evento.statusTraduzido })
                .neq('status_pagamento', evento.statusTraduzido)
                .eq('school_id', escola.id) // trava multi-tenant
        );

        // Casa pelo transaction_id quando ele veio; o id do pedido é reserva.
        const porReferencia = (q) => evento.referenciaInterna
            ? q.eq('transaction_id', evento.referenciaInterna)
            : q.eq('gateway_id', evento.gatewayId);

        consulta = porReferencia(consulta);

        const { data: aluguelAtualizado, error } = await consulta.select().maybeSingle();
        if (error) throw error;

        if (!aluguelAtualizado && evento.statusTraduzido === 'aprovado') {
            await alertarPagamentoDeExpirada(
                porReferencia(
                    supabase.from('rentals')
                        .select('transaction_id, locker_id, valor')
                        .eq('school_id', escola.id)
                        .eq('status_pagamento', 'expirado')
                )
            );
        }

        if (aluguelAtualizado && evento.statusTraduzido === 'aprovado') {
            console.log(`[LCKP PAGBANK] Armário ${aluguelAtualizado.locker_id} liberado para uso.`);
            // Sem await: a resposta ao gateway nao espera o e-mail. Webhook
            // que demora demais e reenviado, e o reenvio duplicaria a mensagem.
            enviarEmailDeConfirmacao(aluguelAtualizado);
        }

        return res.status(200).send('Webhook processado.');
    } catch (err) {
        console.error('[LCKP ERROR] Falha ao processar o webhook do PagBank:', err.message);
        return responderErro(res, err, 'pagamentos');
    }
};

// Webhook do Banco do Brasil (padrão Pix do Banco Central).
//
// DIFERENÇA IMPORTANTE em relação aos outros dois gateways: aqui não há
// assinatura HMAC no corpo. O padrão Pix autentica a notificação por mTLS, com
// o certificado do BANCO — e esse handshake termina no proxy do Render, não
// chega até aqui. Validar a assinatura, portanto, é impossível.
//
// A saída é não precisar confiar no corpo: a notificação é tratada como um
// SINAL ("olhe a cobrança X") e o status vem de uma consulta à API do banco,
// autenticada com a credencial da própria escola. Quem descobrisse esta URL e
// mandasse um JSON forjado não conseguiria liberar nada: o txid inventado não
// existe no banco, e o real volta com o status verdadeiro.
export const webhookBancoDoBrasil = async (req, res) => {
    const { schoolCode } = req.params;

    try {
        const { data: escola, error: erroEscola } = await supabase
            .from('schools')
            .select('id, codigo, name, gateway, gateway_ambiente, credenciais_gateway_cifrado')
            .eq('codigo', schoolCode)
            .maybeSingle();

        if (erroEscola || !escola) {
            console.warn(`[LCKP BB] Notificação para escola desconhecida: ${schoolCode}`);
            return res.status(404).send('Instituição não encontrada.');
        }

        // O BB valida a URL cadastrando-a com uma chamada vazia. Responder
        // diferente de 2xx aqui faria o cadastro do webhook falhar.
        const txids = lerTxidsDaNotificacaoBB(req.body);
        if (!txids.length) {
            return res.status(200).send('OK - Notificação sem cobrança associada.');
        }

        for (const txid of txids) {
            let confirmacao;
            try {
                confirmacao = await consultarCobrancaBB(escola, txid);
            } catch (err) {
                // Cobrança inexistente é o caso da notificação forjada: nada a
                // fazer, e responder 500 faria o banco reenviar para sempre.
                console.warn(`[LCKP BB] Não foi possível confirmar a cobrança ${txid}: ${err.message}`);
                continue;
            }

            if (confirmacao.statusTraduzido !== 'aprovado') {
                console.log(`[LCKP BB] Cobrança ${txid} ainda em '${confirmacao.statusTraduzido}'.`);
                continue;
            }

            // Só agora, com o status vindo do banco, a locação é atualizada.
            // O eq('school_id') é a trava multi-tenant: um txid de uma escola
            // não pode liberar armário de outra.
            const { data: aluguelAtualizado, error } = await naoMexerNoExpirado(
                supabase
                    .from('rentals')
                    .update({ status_pagamento: 'aprovado' })
                    .eq('gateway_id', txid)
                    .eq('school_id', escola.id)
                    .neq('status_pagamento', 'aprovado')
            )
                .select()
                .maybeSingle();

            if (error) throw error;

            if (!aluguelAtualizado) {
                // Ou já foi processada (notificação repetida), ou expirou antes
                // do dinheiro chegar. O segundo caso precisa de gente.
                await alertarPagamentoDeExpirada(
                    supabase.from('rentals')
                        .select('transaction_id, locker_id, valor')
                        .eq('gateway_id', txid)
                        .eq('school_id', escola.id)
                        .eq('status_pagamento', 'expirado')
                );
                continue;
            }

            // Pagamento a menor: o banco aceita, mas a locação não está paga.
            // Registrar em log alto porque exige decisão humana — o armário já
            // foi liberado pela trigger e alguém precisa cobrar a diferença.
            if (confirmacao.valorPago !== null
                && confirmacao.valorPago + 0.001 < Number(aluguelAtualizado.valor)) {
                console.error(
                    `[LCKP BB] ATENÇÃO: cobrança ${txid} paga a menor — recebido R$ ${confirmacao.valorPago}, esperado R$ ${aluguelAtualizado.valor}.`
                );
            }

            console.log(`[LCKP BB] Armário ${aluguelAtualizado.locker_id} liberado para uso.`);
            // Sem await: a resposta ao banco não espera o e-mail. Notificação
            // que demora demais é reenviada, e o reenvio duplicaria a mensagem.
            enviarEmailDeConfirmacao(aluguelAtualizado);
        }

        return res.status(200).send('Webhook processado.');
    } catch (err) {
        console.error('[LCKP ERROR] Falha ao processar o webhook do Banco do Brasil:', err.message);
        return responderErro(res, err, 'pagamentos');
    }
};

// Histórico de locações pagas (aprovadas) de uma escola
export const listarHistoricoPagamentos = async (req, res) => {
    const { schoolCode } = req.params;

    try {
        const { data: escola, error: erroEscola } = await supabase
            .from('schools')
            .select('id')
            .eq('codigo', schoolCode)
            .maybeSingle();

        if (erroEscola || !escola) {
            return res.status(404).json({ error: `Instituição com o código '${schoolCode}' não foi encontrada.` });
        }

        // Trava multi-tenant: admin só vê o extrato da própria escola.
        if (req.user.role !== 'superadmin' && escola.id !== req.user.school_id) {
            return res.status(403).json({ error: 'Você só pode consultar o histórico da sua própria instituição.' });
        }

        const { data: aluguéis, error: erroAlugueis } = await supabase
            .from('rentals')
            .select('id, locker_id, user_id, valor, data_aluguel, ano_letivo, origem, status_pagamento, estorno_de')
            .eq('school_id', escola.id)
            // Estornos entram no extrato: são lançamentos de valor NEGATIVO, e
            // sem eles o total mostrado seria maior que o dinheiro que a escola
            // de fato tem em conta.
            .in('status_pagamento', ['aprovado', 'estorno'])
            .order('data_aluguel', { ascending: false });

        if (erroAlugueis) throw erroAlugueis;

        const lockerIds = [...new Set(aluguéis.map(a => a.locker_id).filter(Boolean))];
        const userIds = [...new Set(aluguéis.map(a => a.user_id).filter(Boolean))];

        const [{ data: lockers }, { data: usuarios }] = await Promise.all([
            lockerIds.length
                ? supabase.from('lockers').select('id, nome, corredor').in('id', lockerIds)
                : Promise.resolve({ data: [] }),
            userIds.length
                ? supabase.from('users').select('id, nome_completo').in('id', userIds)
                : Promise.resolve({ data: [] })
        ]);

        const lockerPorId = Object.fromEntries((lockers || []).map(l => [l.id, l]));
        const usuarioPorId = Object.fromEntries((usuarios || []).map(u => [u.id, u]));

        const historico = aluguéis.map(a => ({
            id: a.id,
            valor: a.valor,
            created_at: a.data_aluguel,
            // O ciclo letivo a que a locação pertence. Locações anteriores à
            // migração de 2026-08-07 vêm nulas; o front cai no ano da data.
            ano_letivo: a.ano_letivo,
            // 'presencial' = pago na secretaria e lançado pelo vínculo manual.
            origem: a.origem || 'online',
            // Estorno: valor negativo, aponta para a locacao que devolveu.
            estorno: a.status_pagamento === 'estorno',
            estorno_de: a.estorno_de || null,
            locker_nome: lockerPorId[a.locker_id]?.nome || null,
            locker_corredor: lockerPorId[a.locker_id]?.corredor || null,
            aluno_nome: usuarioPorId[a.user_id]?.nome_completo || null
        }));

        return res.json(historico);
    } catch (err) {
        console.error('Erro ao listar histórico de pagamentos:', err.message);
        return res.status(500).json({ error: 'Erro interno ao listar o histórico de pagamentos.' });
    }
};

// Controlador para consulta automática de status (Polling)
export const obterStatusPagamento = async (req, res) => {
    const { transaction_id } = req.params;

    try {
        const { data: aluguel, error } = await supabase
            .from('rentals')
            .select('status_pagamento')
            .eq('transaction_id', transaction_id)
            .single();

        if (error || !aluguel) {
            return res.status(404).json({ error: 'Transação de locação não identificada.' });
        }

        return res.json({ status_pagamento: aluguel.status_pagamento });
    } catch (err) {
        return responderErro(res, err, 'pagamentos');
    }
};
// Confirmação por e-mail depois que a locação é aprovada.
//
// Roda DEPOIS de o armário já estar liberado, e nunca bloqueia: se o envio
// falhar, o aluno continua com o armário. Um problema no Resend não pode
// desfazer um pagamento.
//
// Busca os dados aqui em vez de recebê-los prontos porque os dois webhooks
// (Mercado Pago e PagBank) chegam com formatos diferentes e só têm em comum a
// linha de `rentals` já atualizada.
const enviarEmailDeConfirmacao = async (aluguel) => {
    if (!emailHabilitado() || !aluguel?.user_id) return;

    try {
        const [{ data: aluno }, { data: escola }, { data: armario }] = await Promise.all([
            supabase.from('users').select('nome_completo, email_institucional').eq('id', aluguel.user_id).maybeSingle(),
            supabase.from('schools').select('name, rotulo_corredor').eq('id', aluguel.school_id).maybeSingle(),
            supabase.from('lockers').select('nome, corredor').eq('id', aluguel.locker_id).maybeSingle()
        ]);

        if (!aluno?.email_institucional) {
            console.warn('[LCKP EMAIL] Aluno sem e-mail cadastrado — confirmação não enviada.');
            return;
        }

        const rotulo = escola?.rotulo_corredor === 'corredor' ? 'Corredor' : 'Bloco';
        const validoAte = aluguel.valido_ate
            ? new Date(`${aluguel.valido_ate}T12:00:00Z`).toLocaleDateString('pt-BR')
            : 'o fim do ciclo letivo';

        const resultado = await enviarConfirmacaoLocacao({
            para: aluno.email_institucional,
            nomeAluno: aluno.nome_completo,
            nomeEscola: escola?.name,
            armario: armario?.nome,
            corredor: armario?.corredor,
            rotuloCorredor: rotulo,
            valor: aluguel.valor,
            modalidade: aluguel.modalidade,
            validoAte
        });

        if (!resultado.ok) {
            console.error('[LCKP EMAIL] Confirmação não enviada:', resultado.erro);
        }
    } catch (err) {
        // Engolido de propósito: o armário já está com o aluno.
        console.error('[LCKP EMAIL] Falha ao montar a confirmação:', err.message);
    }
};
