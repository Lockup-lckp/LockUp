import supabase from '../config/database.js';
// Resolve o schoolCode da URL para o school_id real. Vem do cache compartilhado:
// era uma consulta ao banco por requisição, sempre devolvendo a mesma linha.
import { obterIdEscolaPorCodigo } from '../servicos/cacheEscola.js';
import { responderErro, ErroDeNegocio } from '../utils/erros.js';

// LISTAR ARMÁRIOS FILTRADOS POR ESCOLA
export const listarArmarios = async (req, res) => {
    const { schoolCode } = req.params;

    try {
        const schoolId = await obterIdEscolaPorCodigo(schoolCode);

        // Se a escola não existir, retorna 404 de forma amigável sem quebrar o servidor
        if (!schoolId) {
            return res.status(404).json({ error: `Instituição com o código '${schoolCode}' não foi encontrada.` });
        }

        // Trava multi-tenant: aluno/admin só lista armários (com nome de ocupante) da própria escola.
        if (req.user.role !== 'superadmin' && schoolId !== req.user.school_id) {
            return res.status(403).json({ error: 'Você só pode consultar armários da sua própria instituição.' });
        }

        const { data: armarios, error } = await supabase
            .from('lockers')
            .select('*')
            .eq('school_id', schoolId);

        if (error) throw error;

        const armariosFormatados = armarios.map(armario => ({
            ...armario,
            usuarioId: armario.usuario_id,
            usuarioNome: armario.usuario_nome
        }));

        // Ordena numericamente (corredor, depois nome) em vez de alfabeticamente,
        // pra "10" não aparecer antes de "2" (funciona mesmo sem zero-padding)
        armariosFormatados.sort((a, b) => {
            const comparaCorredor = String(a.corredor).localeCompare(String(b.corredor), 'pt-BR', { numeric: true, sensitivity: 'base' });
            if (comparaCorredor !== 0) return comparaCorredor;
            return String(a.nome).localeCompare(String(b.nome), 'pt-BR', { numeric: true, sensitivity: 'base' });
        });

        res.json(armariosFormatados);
    } catch (err) {
        console.error("Erro ao listar armários:", err.message);
        responderErro(res, err, 'armarios');
    }
};

// CADASTRAR NOVO ARMÁRIO (individual)
export const criarArmario = async (req, res) => {
    const { schoolCode } = req.params;
    const { nome, corredor, status } = req.body;

    try {
        const schoolId = await obterIdEscolaPorCodigo(schoolCode);
        if (!schoolId) {
            return res.status(404).json({ error: 'Instituição de ensino inválida ou não encontrada.' });
        }

        // Trava multi-tenant: admin só cadastra armário na própria escola.
        if (req.user.role !== 'superadmin' && schoolId !== req.user.school_id) {
            return res.status(403).json({ error: 'Você só pode gerenciar armários da sua própria instituição.' });
        }

        const { data, error } = await supabase
            .from('lockers')
            .insert([
                {
                    nome,
                    corredor,
                    status: status || 'disponivel',
                    school_id: schoolId
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json(data[0]);
    } catch (err) {
        console.error("Erro ao criar armário:", err.message);
        responderErro(res, err, 'armarios');
    }
};

// CADASTRAR VÁRIOS ARMÁRIOS DE UMA VEZ (ex: corredor 1, armários de 1 a 100)
export const criarArmariosEmLote = async (req, res) => {
    const { schoolCode } = req.params;
    const { corredor, inicio, fim } = req.body;

    try {
        const schoolId = await obterIdEscolaPorCodigo(schoolCode);
        if (!schoolId) {
            return res.status(404).json({ error: 'Instituição de ensino inválida ou não encontrada.' });
        }

        // Trava multi-tenant: admin só cria armários em lote na própria escola.
        if (req.user.role !== 'superadmin' && schoolId !== req.user.school_id) {
            return res.status(403).json({ error: 'Você só pode gerenciar armários da sua própria instituição.' });
        }

        if (!corredor || String(corredor).trim() === '') {
            return res.status(400).json({ error: 'Informe o corredor/bloco para os armários.' });
        }

        const numeroInicio = parseInt(inicio, 10);
        const numeroFim = parseInt(fim, 10);

        if (isNaN(numeroInicio) || isNaN(numeroFim) || numeroInicio < 1 || numeroFim < numeroInicio) {
            return res.status(400).json({ error: 'Intervalo de armários inválido. Verifique os números de início e fim.' });
        }

        const quantidade = numeroFim - numeroInicio + 1;
        if (quantidade > 500) {
            return res.status(400).json({ error: 'Intervalo muito grande (máximo de 500 armários por vez). Divida em lotes menores.' });
        }

        // Define quantos dígitos usar no preenchimento (mínimo 3: 001, 002...).
        // Se o intervalo for maior que 999, usa mais dígitos automaticamente.
        const quantidadeDigitos = Math.max(3, String(numeroFim).length);

        // Monta todas as linhas e grava em UMA única chamada.
        //
        // Antes isto era um for com await por armário: criar 500 armários custava 500
        // round-trips sequenciais ao banco (dezenas de segundos, e o admin achava que
        // a tela tinha travado). Além de lento, era parcial — se falhasse no armário
        // 300, os 299 anteriores ficavam gravados e o corredor terminava incompleto.
        const linhas = [];
        for (let numero = numeroInicio; numero <= numeroFim; numero++) {
            linhas.push({
                nome: String(numero).padStart(quantidadeDigitos, '0'),
                corredor: String(corredor),
                status: 'disponivel',
                school_id: schoolId
            });
        }

        const { data: armariosCriados, error } = await supabase
            .from('lockers')
            .insert(linhas)
            .select();

        if (error) {
            // 23505 = violação de unicidade: já existe armário com esse nome no corredor.
            if (error.code === '23505') {
                return res.status(409).json({
                    error: 'Já existem armários com esses números neste corredor. Nenhum armário foi criado.'
                });
            }
            throw error;
        }

        res.status(201).json({
            mensagem: `${armariosCriados.length} armários criados com sucesso no corredor ${corredor}.`,
            armarios: armariosCriados
        });
    } catch (err) {
        console.error("Erro ao criar armários em lote:", err.message);
        responderErro(res, err, 'armarios');
    }
};

// ATUALIZAR STATUS E VÍNCULO (PATCH)
// Ciclo letivo a que a locação pertence. Mesma regra de `anoLetivoAtual` no
// pagamentosControlador: antes da data de abertura ainda estamos no ciclo do
// ano anterior, então um getFullYear() simples poria a locação no ano errado.
const anoLetivoDaEscola = (escola) => {
    const hoje = new Date();
    const abertura = (escola?.abertura_mes ?? 2) * 100 + (escola?.abertura_dia ?? 1);
    const atual = (hoje.getMonth() + 1) * 100 + hoje.getDate();
    return atual < abertura ? hoje.getFullYear() - 1 : hoje.getFullYear();
};

// Registra no extrato a locação paga na secretaria.
//
// Quando o aluno paga presencialmente — em dinheiro, ou porque o pagamento
// online falhou — a secretaria vincula o armário pela tela de gerenciamento.
// Até aqui esse vínculo não gerava registro nenhum: o armário sumia do
// extrato e o relatório anual saía MENOR que o faturamento real da escola.
//
// O valor é o mesmo que a escola cobra (`schools.valor_armario`), porque é
// isso que foi cobrado no balcão.
// Campos da escola necessarios para precificar uma venda no balcao.
const CAMPOS_PLANO_ESCOLA =
    'id, valor_armario, valor_armario_semestral, permite_semestral, ' +
    'abertura_dia, abertura_mes, encerramento_dia, encerramento_mes, ' +
    'encerramento_semestral_dia, encerramento_semestral_mes';

// Preco e prazo da modalidade escolhida no balcao.
//
// Espelha o resolverModalidade do checkout de proposito: o aluno que paga no
// caixa e o que paga pelo site precisam receber exatamente o mesmo prazo pelo
// mesmo valor. Duas regras separadas divergem na primeira vez que a escola
// mexer no calendario.
//
// Lanca ErroDeNegocio em vez de devolver um padrao silencioso: quem escolheu
// semestral numa escola que so vende anual precisa saber disso, e nao levar um
// ano inteiro pelo preco que apertou.
// Quanto foi efetivamente cobrado no balcão.
//
// Nem todo vínculo manual é uma venda. A secretaria também concede armário a
// aluno em situação de vulnerabilidade, e forçar o preço cheio nesses casos
// inflaria o faturamento da escola com dinheiro que nunca entrou -- o mesmo
// defeito, invertido, que fez o registro presencial existir.
//
// Devolve undefined quando quem chamou não opinou: aí vale o preço da escola,
// que é o comportamento de antes deste campo existir.
//
// @returns {number|undefined}  valor em reais
const lerValorCobrado = (registrarPagamento, valorPago) => {
    if (registrarPagamento === undefined || registrarPagamento === null) return undefined;

    // Isenção. Vira locação de R$ 0,00, não ausência de locação: sem linha em
    // `rentals` o armário sai do extrato E some da rotina que encerra o ciclo
    // letivo, ficando com o aluno para sempre.
    if (registrarPagamento === false) return 0;

    if (valorPago === undefined || valorPago === null || valorPago === '') return undefined;

    const numero = Number(valorPago);
    if (!Number.isFinite(numero)) {
        throw new ErroDeNegocio('O valor cobrado precisa ser um número.');
    }
    // Negativo é como o extrato representa ESTORNO. Aceitar aqui faria um erro
    // de digitação no balcão subtrair do faturamento do ano.
    if (numero < 0) {
        throw new ErroDeNegocio('O valor cobrado não pode ser negativo.');
    }

    return Math.round(numero * 100) / 100;
};

const resolverPlanoPresencial = (escola, modalidadePedida, valorCobrado) => {
    const modalidade = modalidadePedida === 'semestral' ? 'semestral' : 'anual';

    if (modalidade === 'semestral' && !escola.permite_semestral) {
        throw new ErroDeNegocio(
            'Esta instituição não oferece locação semestral. Ative a opção em Configurações antes de registrar.'
        );
    }

    const valorDaTabela = modalidade === 'semestral'
        ? Number(escola.valor_armario_semestral)
        : Number(escola.valor_armario);

    // Preço configurado só é obrigatório quando o valor NÃO veio do balcão.
    // Uma isenção, ou uma cobrança de valor combinado, não depende de a escola
    // ter cadastrado a tabela -- e recusar por isso travaria o atendimento.
    if (valorCobrado === undefined && (!valorDaTabela || valorDaTabela <= 0)) {
        throw new ErroDeNegocio(
            `O valor da locação ${modalidade} não está configurado para esta instituição.`
        );
    }

    const valor = valorCobrado === undefined ? valorDaTabela : valorCobrado;

    const dia = modalidade === 'semestral'
        ? (escola.encerramento_semestral_dia ?? 6)
        : (escola.encerramento_dia ?? 20);
    const mes = modalidade === 'semestral'
        ? (escola.encerramento_semestral_mes ?? 7)
        : (escola.encerramento_mes ?? 12);

    const anoLetivo = anoLetivoDaEscola(escola);
    const validoAte = new Date(Date.UTC(anoLetivo, mes - 1, dia));

    // Semestral registrado DEPOIS do fim do semestre nasceria com prazo
    // vencido — e a rotina que encerra ciclos o fecharia na primeira varredura,
    // devolvendo o armario e deixando o aluno sem nada. Recusar aqui e melhor
    // do que registrar algo que o banco desfaz sozinho.
    if (modalidade === 'semestral' && validoAte.getTime() < Date.now()) {
        throw new ErroDeNegocio(
            'O período semestral desta instituição já encerrou. Registre como anual ou ajuste a data em Configurações.'
        );
    }

    return {
        modalidade,
        valor,
        anoLetivo,
        validoAte: validoAte.toISOString().slice(0, 10)
    };
};

// Registra no extrato a locação paga na secretaria.
//
// Quando o aluno paga presencialmente — em dinheiro, ou porque o pagamento
// online falhou — a secretaria vincula o armário pela tela de gerenciamento.
// Até 2026-08-10 esse vínculo não gerava registro nenhum: o armário sumia do
// extrato e o relatório anual saía MENOR que o faturamento real da escola.
//
// O `plano` chega pronto de quem chamou, já validado: assim um pedido
// impossível é recusado ANTES de o armário mudar de dono.
const registrarLocacaoPresencial = async (armario, usuarioId, plano) => {
    // Locação aprovada e ainda aberta para este armário e aluno? Então o
    // vínculo já está no extrato. Sem esta checagem, cada PATCH repetido
    // (trocar status, corrigir nome) criaria uma cobrança nova e inflaria o
    // faturamento da escola.
    const { data: jaRegistrada } = await supabase
        .from('rentals')
        .select('id')
        .eq('locker_id', armario.id)
        .eq('user_id', usuarioId)
        .eq('status_pagamento', 'aprovado')
        .is('encerrado_em', null)
        .limit(1);

    if (jaRegistrada?.length) return;

    const { error } = await supabase.from('rentals').insert([{
        transaction_id: `PRES-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        locker_id: armario.id,
        user_id: usuarioId,
        school_id: armario.school_id,
        valor: plano.valor,
        status_pagamento: 'aprovado',
        origem: 'presencial',
        ano_letivo: plano.anoLetivo,
        modalidade: plano.modalidade,
        valido_ate: plano.validoAte,
        data_aluguel: new Date().toISOString()
    }]);

    // Falha aqui NÃO derruba o vínculo: o armário já foi entregue ao aluno na
    // secretaria, e desfazer isso por causa do extrato seria pior. Registra em
    // log para o problema ser visível em vez de silencioso.
    if (error) {
        console.error('[LCKP] Vínculo manual feito, mas a locação não foi registrada no extrato:', error.message);
    }
};

export const atualizarArmario = async (req, res) => {
    const { id } = req.params;
    const { status, usuarioId, usuarioNome, modalidade, registrarPagamento, valorPago } = req.body;

    try {
        const idParaBanco = usuarioId ? usuarioId : null;
        const nomeParaBanco = usuarioNome && usuarioNome.trim() !== '' ? usuarioNome : null;

        // A modalidade e resolvida ANTES de mexer no armario.
        //
        // Se a secretaria pedir semestral numa escola que so vende anual, o
        // pedido precisa ser recusado com o armario ainda livre. Validando
        // depois do UPDATE, o aluno ficaria com o armario vinculado e sem
        // cobranca no extrato — e ninguem perceberia ate o relatorio nao fechar.
        let plano = null;
        if (idParaBanco && status === 'alugado') {
            let consultaArmario = supabase
                .from('lockers')
                .select('school_id')
                .eq('id', id);

            // Mesma trava multi-tenant do UPDATE abaixo: sem ela, um admin
            // descobriria o school_id de outra escola por tentativa.
            if (req.user.role !== 'superadmin') {
                consultaArmario = consultaArmario.eq('school_id', req.user.school_id);
            }

            const { data: armarioAtual } = await consultaArmario.maybeSingle();
            if (!armarioAtual) {
                return res.status(404).json({ error: 'Armário não encontrado ou restrito a outra instituição.' });
            }

            const { data: escola } = await supabase
                .from('schools')
                .select(CAMPOS_PLANO_ESCOLA)
                .eq('id', armarioAtual.school_id)
                .maybeSingle();

            // Escola sumida e caso impossivel na pratica, mas se acontecer o
            // vinculo segue sem cobranca: entregar o armario e melhor do que
            // travar o atendimento no balcao por um problema de cadastro.
            // Lido ANTES do UPDATE, junto da modalidade: valor inválido precisa
            // ser recusado com o armário ainda livre.
            const valorCobrado = lerValorCobrado(registrarPagamento, valorPago);
            if (escola) plano = resolverPlanoPresencial(escola, modalidade, valorCobrado);
        }

        let query = supabase
            .from('lockers')
            .update({
                status,
                usuario_id: idParaBanco,
                usuario_nome: nomeParaBanco
            })
            .eq('id', id);

        // Trava multi-tenant server-side: o school_id vem do token, nunca do cliente.
        if (req.user.role !== 'superadmin') {
            query = query.eq('school_id', req.user.school_id);
        }

        const { data, error } = await query.select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Armário não encontrado ou restrito a outra instituição.' });
        }

        // Vínculo com ALUNO (tem conta) gera locação no extrato. Armário de
        // funcionário não: ele não é vendido, é cedido, e cobrá-lo no relatório
        // inflaria o faturamento da escola com dinheiro que nunca entrou.
        if (idParaBanco && data[0].status === 'alugado') {
            if (plano) await registrarLocacaoPresencial(data[0], idParaBanco, plano);
        }

        const armarioAtualizado = {
            ...data[0],
            usuarioId: data[0].usuario_id,
            usuarioNome: data[0].usuario_nome
        };

        res.json(armarioAtualizado);
    } catch (err) {
        console.error("Erro ao atualizar armário:", err.message);
        responderErro(res, err, 'armarios');
    }
};

// EXCLUIR ARMÁRIO (DELETE)
export const excluirArmario = async (req, res) => {
    const { id } = req.params;

    try {
        let query = supabase
            .from('lockers')
            .delete()
            .eq('id', id);

        // Trava multi-tenant server-side: admin só remove armários da própria escola.
        if (req.user.role !== 'superadmin') {
            query = query.eq('school_id', req.user.school_id);
        }

        const { data, error } = await query.select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Armário não encontrado ou restrito a outra instituição.' });
        }

        res.json({ message: 'Armário removido com sucesso.' });
    } catch (err) {
        console.error("Erro ao excluir armário:", err.message);
        responderErro(res, err, 'armarios');
    }
};
// Carrega o armário garantindo que ele é da escola de quem pediu. Devolve
// { armario } ou { erro } — o escopo multi-tenant nunca vem do cliente.
const carregarArmarioNoEscopo = async (req, id) => {
    const { data: armario, error } = await supabase
        .from('lockers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error || !armario) {
        return { erro: { status: 404, mensagem: 'Armário não encontrado.' } };
    }
    if (req.user.role !== 'superadmin' && armario.school_id !== req.user.school_id) {
        return { erro: { status: 403, mensagem: 'Este armário pertence a outra instituição.' } };
    }
    return { armario };
};

// A locação ativa do aluno naquele armário: aprovada e ainda não encerrada.
// É a que a troca precisa seguir e a que a remoção pode apagar.
const buscarLocacaoAtiva = async (lockerId, usuarioId) => {
    const { data } = await supabase
        .from('rentals')
        .select('id, transaction_id, valor, data_aluguel, origem, modalidade, ano_letivo')
        .eq('locker_id', lockerId)
        .eq('user_id', usuarioId)
        .eq('status_pagamento', 'aprovado')
        .is('encerrado_em', null)
        .order('data_aluguel', { ascending: false })
        .limit(1);

    return data?.[0] || null;
};

// TROCAR O ALUNO DE ARMÁRIO
//
// Existe porque "remover e vincular de novo" não é a mesma coisa: entre as duas
// operações o aluno fica sem armário nenhum, e a locação paga continuaria
// apontando para o armário antigo — o histórico diria que ele alugou o 101
// enquanto está usando o 214.
//
// Aqui a locação ACOMPANHA o aluno. O que ele pagou não muda; muda onde ele
// guarda as coisas.
export const trocarArmarioDoAluno = async (req, res) => {
    const { id } = req.params;
    const { novoArmarioId } = req.body;

    if (!novoArmarioId) {
        return res.status(400).json({ error: 'Informe o armário de destino.' });
    }
    if (novoArmarioId === id) {
        return res.status(400).json({ error: 'O armário de destino é o mesmo de origem.' });
    }

    try {
        const origem = await carregarArmarioNoEscopo(req, id);
        if (origem.erro) return res.status(origem.erro.status).json({ error: origem.erro.mensagem });

        const destino = await carregarArmarioNoEscopo(req, novoArmarioId);
        if (destino.erro) return res.status(destino.erro.status).json({ error: destino.erro.mensagem });

        if (!origem.armario.usuario_id && !origem.armario.usuario_nome) {
            return res.status(400).json({ error: 'O armário de origem não tem ocupante para transferir.' });
        }
        if (destino.armario.school_id !== origem.armario.school_id) {
            return res.status(400).json({ error: 'Os dois armários precisam ser da mesma instituição.' });
        }
        if (destino.armario.status !== 'disponivel') {
            return res.status(409).json({ error: `O armário ${destino.armario.nome} não está disponível.` });
        }

        // Ocupa o destino ANTES de liberar a origem. Se a segunda chamada
        // falhar, o aluno fica com dois armários — situação visível e fácil de
        // corrigir. Na ordem inversa ele ficaria sem nenhum, e ninguém
        // perceberia até ele reclamar.
        const { error: erroDestino } = await supabase
            .from('lockers')
            .update({
                status: origem.armario.status,
                usuario_id: origem.armario.usuario_id,
                usuario_nome: origem.armario.usuario_nome
            })
            .eq('id', novoArmarioId);

        if (erroDestino) throw erroDestino;

        const { error: erroOrigem } = await supabase
            .from('lockers')
            .update({ status: 'disponivel', usuario_id: null, usuario_nome: null })
            .eq('id', id);

        if (erroOrigem) throw erroOrigem;

        // A locação segue o aluno. Sem isto o extrato apontaria para o armário
        // antigo e a escola não saberia quem está onde.
        let locacaoMovida = false;
        if (origem.armario.usuario_id) {
            const locacao = await buscarLocacaoAtiva(id, origem.armario.usuario_id);
            if (locacao) {
                await supabase.from('rentals').update({ locker_id: novoArmarioId }).eq('id', locacao.id);
                locacaoMovida = true;
            }
        }

        return res.json({
            mensagem: `Ocupante transferido para o armário ${destino.armario.nome}.`,
            origem: { id, status: 'disponivel' },
            destino: {
                id: novoArmarioId,
                nome: destino.armario.nome,
                status: origem.armario.status,
                usuarioId: origem.armario.usuario_id,
                usuarioNome: origem.armario.usuario_nome
            },
            locacaoMovida
        });
    } catch (err) {
        console.error('Erro ao trocar o aluno de armário:', err.message);
        return res.status(500).json({ error: 'Não foi possível concluir a troca de armário.' });
    }
};

// REMOVER O OCUPANTE
//
// `?registrarEstorno=true` lança a devolução do valor.
//
// O histórico NUNCA é apagado. Antes havia a opção de excluir a locação, e
// isso escondia que houve movimento: o extrato ficava igual ao de um aluno que
// nunca comprou, e a diferença só aparecia na conta bancária.
//
// A devolução vira um lançamento próprio, com valor NEGATIVO, apontando para a
// locação original. O extrato mostra as duas linhas — a cobrança e a devolução
// — e o total do ciclo cai pelo valor devolvido.
//
// O estorno é opcional porque nem toda remoção é reembolso: o contrato da APM
// prevê encerramento por descumprimento "sem devolução proporcional". Quem
// decide é quem está no balcão.
export const removerOcupante = async (req, res) => {
    const { id } = req.params;
    const registrarEstorno = req.query.registrarEstorno === 'true';

    try {
        const { armario, erro } = await carregarArmarioNoEscopo(req, id);
        if (erro) return res.status(erro.status).json({ error: erro.mensagem });

        if (!armario.usuario_id && !armario.usuario_nome) {
            return res.status(400).json({ error: 'Este armário não tem ocupante.' });
        }

        let estorno = null;
        if (registrarEstorno && armario.usuario_id) {
            const locacao = await buscarLocacaoAtiva(id, armario.usuario_id);

            if (!locacao) {
                return res.status(400).json({
                    error: 'Não há locação paga em aberto para este aluno neste armário — não existe o que estornar.'
                });
            }

            // Uma locação só pode ser devolvida uma vez. Sem esta checagem,
            // dois cliques gerariam dois créditos e o faturamento ficaria menor
            // que a realidade.
            const { data: jaEstornada } = await supabase
                .from('rentals')
                .select('id')
                .eq('estorno_de', locacao.id)
                .limit(1);

            if (jaEstornada?.length) {
                return res.status(409).json({ error: 'Esta locação já foi estornada.' });
            }

            const valorDevolvido = -Math.abs(Number(locacao.valor) || 0);

            // status 'estorno' e NÃO 'aprovado': o gatilho
            // fn_liberar_armario_apos_aprovacao revincularia o armário ao aluno
            // que estamos removendo.
            const { data: criado, error: erroEstorno } = await supabase
                .from('rentals')
                .insert([{
                    transaction_id: `EST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    locker_id: id,
                    user_id: armario.usuario_id,
                    school_id: armario.school_id,
                    valor: valorDevolvido,
                    status_pagamento: 'estorno',
                    estorno_de: locacao.id,
                    origem: locacao.origem || 'online',
                    modalidade: locacao.modalidade || 'anual',
                    ano_letivo: locacao.ano_letivo,
                    data_aluguel: new Date().toISOString()
                }])
                .select('transaction_id, valor')
                .single();

            if (erroEstorno) throw erroEstorno;
            estorno = criado;
        }

        const { error: erroArmario } = await supabase
            .from('lockers')
            .update({ status: 'disponivel', usuario_id: null, usuario_nome: null })
            .eq('id', id);

        if (erroArmario) throw erroArmario;

        return res.json({
            mensagem: estorno
                ? 'Ocupante removido e devolução registrada no histórico.'
                : 'Ocupante removido. O pagamento permanece no histórico, sem devolução.',
            armario: { id, status: 'disponivel' },
            estorno
        });
    } catch (err) {
        console.error('Erro ao remover o ocupante do armário:', err.message);
        return res.status(500).json({ error: 'Não foi possível remover o ocupante.' });
    }
};
