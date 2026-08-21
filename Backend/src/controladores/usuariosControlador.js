import supabase from '../config/database.js';
import bcrypt from 'bcrypt';

// Nunca devolver senha_hash para o cliente: seleção explícita das colunas seguras.
// A matrícula vai junto porque o admin identifica o aluno por ela — a secretaria
// já é dona dessa lista. Ela é a senha INICIAL, mas precisa_alterar_senha obriga
// a troca no primeiro acesso, então deixa de valer como credencial assim que o
// aluno entra. Quem ainda não entrou aparece com precisa_alterar_senha = true.
const COLUNAS_PUBLICAS = 'id, nome_completo, email_institucional, matricula, role, precisa_alterar_senha, created_at, school_id';

// Papéis válidos no sistema. 'superadmin' só pode ser concedido pelo próprio superadmin.
const PAPEIS_VALIDOS = ['aluno', 'admin', 'superadmin'];

// Senha padrão do primeiro acesso para quem NÃO tem matrícula (admin, superadmin).
// precisa_alterar_senha força a troca no login.
// O aluno usa a própria matrícula (RA ou RM) como senha inicial — ver criarUsuario.
const SENHA_PADRAO = 'mudar123';

const ehSuperadmin = (req) => req.user?.role === 'superadmin';

// LISTAR USUÁRIOS — admin de escola vê só a própria instituição; superadmin vê todos,
// ou pode filtrar por uma escola específica via ?school_id= (ex: tela de gerenciamento
// de uma única instituição) pra não baixar todo mundo só pra filtrar no navegador.
// Teto de resultados. Existe para a busca nunca virar "traga todo mundo": a
// tela mostra uma lista para escolher UM aluno, e ninguem escolhe visualmente
// entre trezentos nomes -- refina a busca.
const LIMITE_PADRAO_BUSCA = 25;
const LIMITE_MAXIMO_BUSCA = 50;

// Escapa o que o PostgREST trata como sintaxe dentro de or(...).
// Virgula separa condicoes e parenteses fecham o grupo: um aluno chamado
// "Ana (Bolsista)" quebraria a consulta inteira sem isto.
const limparTermoDeBusca = (termo) =>
    String(termo).replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

export const listarUsuarios = async (req, res) => {
    try {
        let query = supabase.from('users').select(COLUNAS_PUBLICAS);

        if (!ehSuperadmin(req)) {
            // Nunca confia em school_id vindo do cliente para quem não é superadmin.
            query = query.eq('school_id', req.user.school_id);
        } else if (req.query.school_id) {
            query = query.eq('school_id', req.query.school_id);
        }

        // Filtro por papel. A tela de vínculo só oferece aluno, e filtrar aqui
        // evita trazer administradores para o navegador só para escondê-los.
        if (req.query.papel) {
            query = query.eq('role', req.query.papel);
        }

        // Busca por nome ou e-mail. Sem ela a tela de vínculo baixava a escola
        // inteira e filtrava no navegador -- aceitável com nove usuários,
        // insustentável com mil, e todo o cadastro trafegando por um clique.
        const termo = limparTermoDeBusca(req.query.busca || '');
        if (req.query.busca !== undefined && !termo) {
            // Pediu busca e o termo virou nada (so curinga, so pontuacao).
            // Devolver a escola inteira aqui contrariaria o proprio motivo
            // de a busca existir: um "*" digitado por engano baixaria o
            // cadastro completo.
            return res.status(200).json([]);
        }

        if (termo) {
            query = query.or(`nome_completo.ilike.%${termo}%,email_institucional.ilike.%${termo}%`);
        }

        // O limite só se aplica a quem busca. Sem isto, a tela de gerenciamento
        // de usuários -- que precisa listar todo mundo -- passaria a mostrar 25.
        if (req.query.busca !== undefined || req.query.limite !== undefined) {
            const pedido = Number(req.query.limite);
            const limite = Number.isFinite(pedido) && pedido > 0
                ? Math.min(pedido, LIMITE_MAXIMO_BUSCA)
                : LIMITE_PADRAO_BUSCA;
            query = query.order('nome_completo', { ascending: true }).limit(limite);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao listar usuários: ' + err.message });
    }
};

export const buscarUsuarioPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: usuario, error } = await supabase
            .from('users')
            .select(COLUNAS_PUBLICAS)
            .eq('id', id)
            .maybeSingle();

        if (error || !usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        if (!ehSuperadmin(req) && usuario.school_id !== req.user.school_id) {
            return res.status(403).json({ error: 'Este usuário pertence a outra instituição.' });
        }

        res.status(200).json(usuario);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar usuário: ' + err.message });
    }
};

// Carrega o alvo e valida se o admin logado pode agir sobre ele (mesma escola, e não é superadmin).
// Retorna { alvo } em caso de sucesso ou { erro: { status, mensagem } } para o chamador responder.
const carregarAlvoNoEscopo = async (req, id) => {
    const { data: alvo, error } = await supabase
        .from('users')
        .select('id, role, school_id')
        .eq('id', id)
        .maybeSingle();

    if (error || !alvo) {
        return { erro: { status: 404, mensagem: 'Usuário não encontrado.' } };
    }

    if (!ehSuperadmin(req)) {
        if (alvo.school_id !== req.user.school_id) {
            return { erro: { status: 403, mensagem: 'Este usuário pertence a outra instituição.' } };
        }
        if (alvo.role === 'superadmin') {
            return { erro: { status: 403, mensagem: 'Você não tem permissão para alterar um superadmin.' } };
        }
    }

    return { alvo };
};

export const atualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !PAPEIS_VALIDOS.includes(role)) {
            return res.status(400).json({ error: 'Papel (role) inválido.' });
        }
        if (role === 'superadmin' && !ehSuperadmin(req)) {
            return res.status(403).json({ error: 'Apenas o superadmin pode conceder esse papel.' });
        }

        const { alvo, erro } = await carregarAlvoNoEscopo(req, id);
        if (erro) return res.status(erro.status).json({ error: erro.mensagem });

        const { data, error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', alvo.id)
            .select(COLUNAS_PUBLICAS);

        if (error) throw error;

        res.status(200).json(data[0] || { role });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar usuário: ' + err.message });
    }
};

export const excluirUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ error: 'Você não pode excluir a própria conta.' });
        }

        const { alvo, erro } = await carregarAlvoNoEscopo(req, id);
        if (erro) return res.status(erro.status).json({ error: erro.mensagem });

        const { error } = await supabase.from('users').delete().eq('id', alvo.id);
        if (error) throw error;

        res.status(200).json({ message: 'Usuário excluído com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir usuário: ' + err.message });
    }
};

export const criarUsuario = async (req, res) => {
    try {
        const { nome_completo, email_institucional, role, matricula } = req.body;

        if (!email_institucional) {
            return res.status(400).json({ error: 'O e-mail institucional é obrigatório.' });
        }

        // Define o papel de forma segura. Admin de escola só cria aluno/admin.
        let papel = role && PAPEIS_VALIDOS.includes(role) ? role : 'aluno';
        if (papel === 'superadmin' && !ehSuperadmin(req)) {
            return res.status(403).json({ error: 'Apenas o superadmin pode criar um superadmin.' });
        }

        // school_id NUNCA vem do cliente para o admin de escola: é derivado do token.
        // O superadmin (sem escola própria) precisa informar a escola do novo usuário —
        // exceto ao criar OUTRO superadmin, que também não depende de instituição nenhuma.
        let school_id;
        if (ehSuperadmin(req)) {
            if (papel === 'superadmin') {
                school_id = req.body.school_id || null;
            } else {
                school_id = req.body.school_id;
                if (!school_id) {
                    return res.status(400).json({ error: 'Informe a escola (school_id) do novo usuário.' });
                }
            }
        } else {
            school_id = req.user.school_id;
        }

        // Aluno é identificado pela matrícula (RA ou RM, conforme a escola), e é
        // ela que vira a SENHA INICIAL: a secretaria não precisa distribuir senha,
        // o aluno entra com e-mail + o próprio RA/RM e troca no primeiro acesso.
        // Matrícula é conceito de ALUNO. Admin e superadmin não têm, e aceitar o
        // campo neles fazia a senha inicial virar a matrícula em vez de
        // SENHA_PADRAO — o admin recebia "mudar123" da secretaria e não entrava.
        const matriculaLimpa = papel === 'aluno' && matricula ? String(matricula).trim() : null;

        if (papel === 'aluno' && !matriculaLimpa) {
            const { data: escola } = await supabase
                .from('schools')
                .select('tipo_matricula')
                .eq('id', school_id)
                .maybeSingle();
            const rotulo = (escola?.tipo_matricula || 'rm').toUpperCase();
            return res.status(400).json({ error: `O ${rotulo} do aluno é obrigatório.` });
        }

        const senhaInicial = matriculaLimpa || SENHA_PADRAO;

        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(senhaInicial, salt);

        const { data: novoUsuario, error } = await supabase
            .from('users')
            .insert([{
                // Sem nome informado, a matrícula identifica o aluno nas listagens
                // até alguém completar o cadastro.
                nome_completo: nome_completo?.trim() || matriculaLimpa,
                email_institucional,
                matricula: matriculaLimpa,
                role: papel,
                senha_hash: senhaCriptografada,
                school_id,
                precisa_alterar_senha: true
            }])
            .select(COLUNAS_PUBLICAS)
            .single();

        if (error) {
            // 23505 = violação de unicidade. Pode ser o e-mail OU a matrícula,
            // que é única dentro da mesma escola (users_matricula_por_escola).
            if (error.code === '23505') {
                const ehMatricula = String(error.message || '').includes('matricula');
                return res.status(409).json({
                    error: ehMatricula
                        ? 'Já existe um aluno com esta matrícula nesta instituição.'
                        : 'Já existe um usuário com este e-mail institucional.'
                });
            }
            throw error;
        }

        res.status(201).json(novoUsuario);
    } catch (err) {
        console.error('Erro ao criar usuário:', err);
        res.status(500).json({ error: 'Erro ao criar usuário: ' + err.message });
    }
};
