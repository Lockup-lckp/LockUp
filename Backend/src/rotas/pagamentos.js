import { Router } from 'express';
import { iniciarCheckout, webhookPagamento, webhookPagBank, webhookBancoDoBrasil, obterConfigPagamento, obterStatusPagamento, listarHistoricoPagamentos } from '../controladores/pagamentosControlador.js';
import { verificarToken, exigirAdmin } from '../middlewares/autenticacaoMiddleware.js';

const router = Router();

// Qual gateway a escola usa e, no PagBank, a chave pública do SDK de cartão.
// O front consulta antes de montar o formulário de pagamento.
router.get('/config/:schoolCode', verificarToken, obterConfigPagamento);

// Rota para processar a cobrança e criar o registro inicial
router.post('/checkout', verificarToken, iniciarCheckout);

// Rota parametrizada para receber o ID de transação e retornar o status atualizado pro Front
router.get('/status/:transaction_id', verificarToken, obterStatusPagamento);

// ADMIN: extrato de locações pagas da escola (histórico + saldo anual no front)
router.get('/historico/:schoolCode', verificarToken, exigirAdmin, listarHistoricoPagamentos);

// Sonda de URL: o painel do Mercado Pago (e o do PagBank) verifica se o
// endereço existe ANTES de aceitar o cadastro, e faz isso com GET/HEAD.
// Sem uma resposta 2xx aqui a rota devolvia 404 e o painel recusava o
// cadastro com 422 Unprocessable Content. Não processa nada — notificação
// de verdade só chega por POST.
const responderSonda = (req, res) => res.status(200).send('OK');
router.get('/webhook', responderSonda);
router.head('/webhook', (req, res) => res.status(200).end());
router.get('/webhook/pagbank/:schoolCode', responderSonda);
router.head('/webhook/pagbank/:schoolCode', (req, res) => res.status(200).end());
router.get('/webhook/bb/:schoolCode', responderSonda);
router.head('/webhook/bb/:schoolCode', (req, res) => res.status(200).end());

// Webhook assíncrono para notificações diretas do Mercado Pago
router.post('/webhook', webhookPagamento);

// Webhook do PagBank. O código da escola vai na URL de propósito: cada escola
// tem a própria credencial, e é ela que valida a assinatura. Sem isso teríamos
// de ler o corpo (ainda não confiável) só para descobrir qual chave usar.
router.post('/webhook/pagbank/:schoolCode', webhookPagBank);

// Webhook do Banco do Brasil. O código da escola vai na URL pelo mesmo motivo:
// é preciso saber QUAL credencial usar para consultar a cobrança no banco —
// e é essa consulta, não o corpo recebido, que decide se o armário abre.
router.post('/webhook/bb/:schoolCode', webhookBancoDoBrasil);

export default router;