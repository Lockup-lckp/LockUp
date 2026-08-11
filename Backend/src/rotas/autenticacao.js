import { Router } from 'express';
import { login, alterarSenha } from '../controladores/autenticacaoControlador.js';
import { verificarToken } from '../middlewares/autenticacaoMiddleware.js';

const router = Router();

// Rota pública de login
router.post('/login', login);

// Rota protegida para alteração de senha (o usuário precisa estar logado)
router.post('/alterar-senha', verificarToken, alterarSenha);

export default router;
