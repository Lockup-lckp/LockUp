import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import supabase from '../config/database.js';
import { responderErro, ErroDeNegocio } from '../utils/erros.js';

// Trilha de auditoria de autenticação.
//
// Sem isto, um ataque de força bruta em curso é invisível e não há como
// investigar depois "quem entrou nessa conta na terça". O rate limit barra;
// o log é o que permite PERCEBER que houve tentativa.
//
// Registra identificador e IP. NUNCA a senha, nem o hash, nem o token.
const registrarAuth = (evento, { email, escola, ip, motivo }) => {
    const partes = [`[LCKP AUTH] ${evento}`];
    if (email) partes.push(`usuario=${email}`);
    if (escola) partes.push(`escola=${escola}`);
    if (ip) partes.push(`ip=${ip}`);
    if (motivo) partes.push(`motivo=${motivo}`);
    console.log(partes.join(' '));
};

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
            registrarAuth('LOGIN NEGADO', {
                email: email_institucional, escola: schoolCode, ip: req.ip, motivo: 'usuario inexistente'
            });
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
                // Vale log alto: tentar entrar no portal de OUTRA escola com
                // credencial válida é o sinal mais claro de abuso multi-tenant.
                registrarAuth('LOGIN NEGADO', {
                    email: email_institucional, escola: schoolCode, ip: req.ip, motivo: 'escola divergente'
                });
                return res.status(403).json({
                    error: 'Este usuário não possui permissão para acessar o portal desta instituição.'
                });
            }
        }

        // 4. Compara a senha crua com o hash guardado no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            registrarAuth('LOGIN NEGADO', {
                email: email_institucional, escola: schoolCode, ip: req.ip, motivo: 'senha incorreta'
            });
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        // 5. Gera o token JWT incluindo o school_id no payload por segurança
        const token = jwt.sign(
            { id: usuario.id, role: usuario.role, precisa_alterar_senha: usuario.precisa_alterar_senha, school_id: usuario.school_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        registrarAuth('LOGIN OK', {
            email: email_institucional, escola: schoolCode, ip: req.ip, motivo: usuario.role
        });

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
        responderErro(res, err, 'autenticacao');
    }
};

// Piso da senha nova. Não é política de complexidade — é o mínimo para a troca
// não ser um retrocesso: a senha inicial é a matrícula, e trocá-la por algo
// mais fraco do que ela derrota o propósito da tela.
const TAMANHO_MINIMO_SENHA = 6;
// bcrypt ignora tudo além de 72 BYTES. Aceitar mais é mentir para o usuário:
// ele digitaria 100 caracteres e só os 72 primeiros valeriam.
const TAMANHO_MAXIMO_SENHA = 72;

export const alterarSenha = async (req, res) => {
    const { nova_senha } = req.body;

    try {
        // Sem esta validação a rota aceitava senha VAZIA: bcrypt.hash('')
        // devolve um hash válido, e o usuário ficava sem senha nenhuma.
        if (typeof nova_senha !== 'string' || nova_senha.trim().length < TAMANHO_MINIMO_SENHA) {
            throw new ErroDeNegocio(`A nova senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
        }
        if (Buffer.byteLength(nova_senha, 'utf8') > TAMANHO_MAXIMO_SENHA) {
            throw new ErroDeNegocio(`A nova senha não pode passar de ${TAMANHO_MAXIMO_SENHA} caracteres.`);
        }

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

        registrarAuth('SENHA ALTERADA', { email: req.user.id, ip: req.ip });

        res.json({ mensagem: 'Senha alterada com sucesso!' });
    } catch (err) {
        responderErro(res, err, 'autenticacao');
    }
};