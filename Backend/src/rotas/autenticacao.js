import { Router } from 'express';
import { login, alterarSenha } from '../controladores/autenticacaoControlador.js';
import { verificarToken } from '../middlewares/autenticacaoMiddleware.js';
import { limiteLogin, limiteTrocaSenha } from '../middlewares/limitadores.js';

const router = Router();

// Rota pública de login. O limitador vem ANTES do controlador: sem ele, a
// senha de um aluno cai em poucas horas de tentativa automatizada, já que a
// matrícula (RA/RM) é a senha inicial e segue formato previsível.
router.post('/login', limiteLogin, login);

// Rota protegida para alteração de senha (o usuário precisa estar logado).
router.post('/alterar-senha', limiteTrocaSenha, verificarToken, alterarSenha);

export default router;
