import supabase from '../config/database.js';
// Resolve o schoolCode da URL para o school_id real. Vem do cache compartilhado:
// era uma consulta ao banco por requisição, sempre devolvendo a mesma linha.
import { obterIdEscolaPorCodigo } from '../servicos/cacheEscola.js';

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
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
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
const registrarLocacaoPresencial = async (armario, usuarioId) => {
    const { data: escola } = await supabase
        .from('schools')
        .select('id, valor_armario, abertura_dia, abertura_mes, encerramento_dia, encerramento_mes')
        .eq('id', armario.school_id)
        .maybeSingle();

    if (!escola) return;

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
        valor: escola.valor_armario,
        status_pagamento: 'aprovado',
        origem: 'presencial',
        ano_letivo: anoLetivoDaEscola(escola),
        // Venda no balcão entra como ANUAL: é o padrão do contrato, e a
        // secretaria não informa modalidade no vínculo manual. Se a escola
        // vender um semestre presencialmente, o admin ajusta depois — melhor
        // registrar o prazo mais longo e corrigir do que deixar sem prazo.
        modalidade: 'anual',
        valido_ate: new Date(Date.UTC(
            anoLetivoDaEscola(escola),
            (escola.encerramento_mes ?? 12) - 1,
            escola.encerramento_dia ?? 20
        )).toISOString().slice(0, 10),
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
    const { status, usuarioId, usuarioNome } = req.body;

    try {
        const idParaBanco = usuarioId ? usuarioId : null;
        const nomeParaBanco = usuarioNome && usuarioNome.trim() !== '' ? usuarioNome : null;

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
            await registrarLocacaoPresencial(data[0], idParaBanco);
        }

        const armarioAtualizado = {
            ...data[0],
            usuarioId: data[0].usuario_id,
            usuarioNome: data[0].usuario_nome
        };

        res.json(armarioAtualizado);
    } catch (err) {
        console.error("Erro ao atualizar armário:", err.message);
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
    }
};