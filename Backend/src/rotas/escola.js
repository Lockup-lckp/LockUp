import { Router } from 'express';
import {
  listarEscolas,
  buscarEscolaPorId,
  buscarEscolaPorCodigo,
  atualizarEscola,
  excluirEscola,
  criarEscola,
  enviarLogo,
  listarCatalogoGateways,
  testarCredencialGateway,
  registrarWebhookGateway
} from '../controladores/escolasControlador.js';
import { verificarToken, exigirAdmin, exigirSuperadmin } from '../middlewares/autenticacaoMiddleware.js';

const router = Router();

// PÚBLICA: identidade visual da escola pelo código (a tela de login/tema precisa antes de autenticar).
router.get('/codigo/:codigo', buscarEscolaPorCodigo);

// SUPERADMIN: meios de pagamento suportados e quais credenciais cada um exige.
// Declarada ANTES de '/:id' — o Express casa na ordem, e 'catalogo' seria lido
// como um id se viesse depois. (O id tem regex de UUID, mas manter a ordem
// evita o problema no dia em que alguém relaxar aquela regex.)
router.get('/catalogo/gateways', verificarToken, exigirSuperadmin, listarCatalogoGateways);

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

// Upload da logo. O teto maior de corpo é aplicado no app.js, que escolhe o
// parser pelo caminho — montá-lo aqui não funcionava: o parser global já tinha
// processado (e rejeitado) a requisição antes de ela chegar nesta rota.
router.post('/:id/logo', verificarToken, exigirAdmin, enviarLogo);

// SUPERADMIN: operação do gateway da escola.
// Testar autentica de verdade no banco; registrar cadastra a URL de notificação
// na chave Pix da instituição. Os dois são passos de configuração, não de uso —
// rodados uma vez, quando a credencial chega.
router.post('/:id/gateway/testar', verificarToken, exigirSuperadmin, testarCredencialGateway);
router.post('/:id/gateway/webhook', verificarToken, exigirSuperadmin, registrarWebhookGateway);

// SUPERADMIN: criar e excluir instituições.
router.post('/', verificarToken, exigirSuperadmin, criarEscola);
router.delete('/:id', verificarToken, exigirSuperadmin, excluirEscola);

export default router;
