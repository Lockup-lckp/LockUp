import { Router } from 'express';
import {
    listarArmarios,
    atualizarArmario,
    excluirArmario,
    criarArmario,
    criarArmariosEmLote,
    trocarArmarioDoAluno,
    removerOcupante
} from '../controladores/armariosControlador.js';
import { verificarToken, exigirAdmin } from '../middlewares/autenticacaoMiddleware.js';

const router = Router();

// Leitura: qualquer usuário autenticado (o aluno precisa ver os armários para alugar).
router.get('/escola/:schoolCode', verificarToken, listarArmarios);

// Escrita: somente administradores. O escopo por escola é reforçado no controlador via token.
router.post('/escola/:schoolCode', verificarToken, exigirAdmin, criarArmario);
router.post('/escola/:schoolCode/lote', verificarToken, exigirAdmin, criarArmariosEmLote);
router.patch('/:id', verificarToken, exigirAdmin, atualizarArmario);

// Move o aluno para outro armário. Rota própria, e não um PATCH solto, porque
// a operação toca DOIS armários e a locação — desvincular e revincular pela
// rota genérica deixaria uma janela em que o aluno não está em nenhum dos dois.
router.patch('/:id/trocar', verificarToken, exigirAdmin, trocarArmarioDoAluno);

// Remove o ocupante. `?excluirPagamento=true` apaga também a locação do
// histórico — por isso é DELETE de um recurso próprio, e não mais um campo no
// PATCH: apagar registro financeiro não pode acontecer por descuido.
router.delete('/:id/ocupante', verificarToken, exigirAdmin, removerOcupante);

router.delete('/:id', verificarToken, exigirAdmin, excluirArmario);

export default router;
