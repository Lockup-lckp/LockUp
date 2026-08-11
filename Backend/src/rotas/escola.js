import { Router } from 'express';
import {
  listarEscolas,
  buscarEscolaPorId,
  buscarEscolaPorCodigo,
  atualizarEscola,
  excluirEscola,
  criarEscola
} from '../controladores/escolasControlador.js';
import { verificarToken, exigirSuperadmin } from '../middlewares/autenticacaoMiddleware.js';

const router = Router();

// PÚBLICA: identidade visual da escola pelo código (a tela de login/tema precisa antes de autenticar).
router.get('/codigo/:codigo', buscarEscolaPorCodigo);

// SUPERADMIN: lista todas as instituições da plataforma.
router.get('/', verificarToken, exigirSuperadmin, listarEscolas);

// AUTENTICADO: detalhe por UUID (filtra estritamente o formato UUID do Supabase).
router.get(
  '/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})',
  verificarToken,
  buscarEscolaPorId
);

// PERSONALIZAÇÃO: superadmin (qualquer campo) ou admin da própria escola (só campos visuais).
// O controle fino de quem pode editar o quê fica no controlador.
router.patch('/:id', verificarToken, atualizarEscola);

// SUPERADMIN: criar e excluir instituições.
router.post('/', verificarToken, exigirSuperadmin, criarEscola);
router.delete('/:id', verificarToken, exigirSuperadmin, excluirEscola);

export default router;
