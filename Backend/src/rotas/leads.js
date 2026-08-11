import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { criarLead, listarLeads, atualizarStatusLead } from '../controladores/leadsControlador.js';
import { verificarToken, exigirSuperadmin } from '../middlewares/autenticacaoMiddleware.js';

const router = Router();

// Rota pública (landing page) e sem autenticação: limita tentativas por IP
// pra evitar spam/abuso do formulário de contato.
const limiteLeads = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de contato. Tente novamente mais tarde.' }
});

router.post('/', limiteLeads, criarLead);

// SUPERADMIN: acompanhamento dos pedidos de contato recebidos pela landing page.
router.get('/', verificarToken, exigirSuperadmin, listarLeads);
router.patch('/:id', verificarToken, exigirSuperadmin, atualizarStatusLead);

export default router;
