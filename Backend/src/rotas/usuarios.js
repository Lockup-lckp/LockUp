import { Router } from 'express';
import { listarUsuarios, buscarUsuarioPorId, atualizarUsuario, excluirUsuario, criarUsuario } from '../controladores/usuariosControlador.js';
import { verificarToken, exigirAdmin } from '../middlewares/autenticacaoMiddleware.js';

const router = Router();

// Toda rota de usuários exige um administrador autenticado.
// O escopo por escola (admin só enxerga/gerencia a própria instituição) é aplicado nos controladores.
router.use(verificarToken);
router.use(exigirAdmin);

router.get('/', listarUsuarios);
router.get('/:id', buscarUsuarioPorId);
router.patch('/:id', atualizarUsuario);
router.delete('/:id', excluirUsuario);
router.post('/', criarUsuario);

export default router;
