import jwt from 'jsonwebtoken';

// Valida o token JWT e popula req.user com o payload assinado (id, role, school_id).
// Nunca confie em dados de identidade vindos do body/query - sempre use req.user.
export const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }

        req.user = decoded;
        next();
    });
};

// Administrador de uma escola (gerencia usuários/armários da PRÓPRIA instituição).
// O superadmin também passa, pois tem escopo maior que o admin de escola.
export const exigirAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        return res.status(403).json({ error: 'Acesso restrito. Apenas administradores podem realizar esta ação.' });
    }
    next();
};

// Superadmin da plataforma LCKP: único que pode operar entre escolas
// (criar/editar/excluir instituições e campos sensíveis como o recebedor de pagamento).
export const exigirSuperadmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Acesso restrito ao administrador da plataforma.' });
    }
    next();
};
