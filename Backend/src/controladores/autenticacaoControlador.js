import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import supabase from '../config/database.js';

export const login = async (req, res) => {
    // ⚡ Agora recebemos o schoolCode enviado pelo Frontend junto com as credenciais.
    // Exceção: o superadmin loga pelo painel /gerenciamento, que não tem escola nenhuma
    // associada — por isso schoolCode só é obrigatório pra aluno/admin de escola.
    const { email_institucional, senha, schoolCode } = req.body;

    if (!email_institucional || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    try {
        let escola = null;

        if (schoolCode) {
            // 1. Busca a escola pelo código (slug da URL) para descobrir o ID real dela no banco
            const { data, error: erroEscola } = await supabase
                .from('schools')
                .select('id')
                .eq('codigo', schoolCode)
                .maybeSingle();

            if (erroEscola || !data) {
                return res.status(404).json({ error: 'Instituição de ensino inválida ou não encontrada.' });
            }
            escola = data;
        }

        // 2. Busca o usuário pelo e-mail informado
        const { data: usuario, error: erroUsuario } = await supabase
            .from('users')
            .select('*')
            .eq('email_institucional', email_institucional)
            .maybeSingle();

        if (erroUsuario || !usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        // 3. 🔒 VINCULAÇÃO E SEGURANÇA MULTI-TENANT:
        // Aluno e admin só entram no portal da própria escola (schoolCode obrigatório).
        // O superadmin (dono da plataforma) loga direto pelo /gerenciamento — não depende
        // de escola nenhuma e não precisa de school_id próprio.
        if (usuario.role !== 'superadmin') {
            if (!schoolCode || !escola) {
                return res.status(400).json({ error: 'O código da escola é obrigatório para realizar o login.' });
            }
            if (usuario.school_id !== escola.id) {
                return res.status(403).json({
                    error: 'Este usuário não possui permissão para acessar o portal desta instituição.'
                });
            }
        }

        // 4. Compara a senha crua com o hash guardado no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        // 5. Gera o token JWT incluindo o school_id no payload por segurança
        const token = jwt.sign(
            { id: usuario.id, role: usuario.role, precisa_alterar_senha: usuario.precisa_alterar_senha, school_id: usuario.school_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: usuario.id,
                nome: usuario.nome_completo,
                role: usuario.role,
                precisa_alterar_senha: usuario.precisa_alterar_senha,
                school_id: usuario.school_id
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const alterarSenha = async (req, res) => {
    const { nova_senha } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(nova_senha, salt);

        const { error } = await supabase
            .from('users')
            .update({ 
                senha_hash: hash,
                precisa_alterar_senha: false 
            })
            .eq('id', req.user.id);

        if (error) throw error;

        res.json({ mensagem: 'Senha alterada com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};