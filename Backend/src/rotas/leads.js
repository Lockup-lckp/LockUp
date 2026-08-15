import { Router } from 'express';
import { criarLead, listarLeads, atualizarStatusLead } from '../controladores/leadsControlador.js';
import { verificarToken, exigirSuperadmin } from '../middlewares/autenticacaoMiddleware.js';
import { limiteFormulario } from '../middlewares/limitadores.js';

const router = Router();

// Rota pública (landing page) e sem autenticação: limita tentativas por IP
// pra evitar spam/abuso do formulário de contato.
router.post('/', limiteFormulario, criarLead);

// SUPERADMIN: acompanhamento dos pedidos de contato recebidos pela landing page.
router.get('/', verificarToken, exigirSuperadmin, listarLeads);
router.patch('/:id', verificarToken, exigirSuperadmin, atualizarStatusLead);

export default router;
