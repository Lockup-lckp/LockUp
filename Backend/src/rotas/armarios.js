import { Router } from 'express';
import {
    listarArmarios,
    atualizarArmario,
    excluirArmario,
    criarArmario,
    criarArmariosEmLote
} from '../controladores/armariosControlador.js';
import { verificarToken, exigirAdmin } from '../middlewares/autenticacaoMiddleware.js';

const router = Router();

// Leitura: qualquer usuário autenticado (o aluno precisa ver os armários para alugar).
router.get('/escola/:schoolCode', verificarToken, listarArmarios);

// Escrita: somente administradores. O escopo por escola é reforçado no controlador via token.
router.post('/escola/:schoolCode', verificarToken, exigirAdmin, criarArmario);
router.post('/escola/:schoolCode/lote', verificarToken, exigirAdmin, criarArmariosEmLote);
router.patch('/:id', verificarToken, exigirAdmin, atualizarArmario);
router.delete('/:id', verificarToken, exigirAdmin, excluirArmario);

export default router;
