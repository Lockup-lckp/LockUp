import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import rotasAutenticacao from './rotas/autenticacao.js';
import rotasArmarios from './rotas/armarios.js';
import rotasPagamentos from './rotas/pagamentos.js';
import rotasUsuarios from './rotas/usuarios.js';
import rotasEscolas from './rotas/escola.js';
import rotasLeads from './rotas/leads.js';
import { limiteGeral } from './middlewares/limitadores.js';

const app = express();

// O Render (como Vercel e Cloudflare) termina o TLS num proxy e repassa o IP
// real em X-Forwarded-For. Sem confiar nesse cabeçalho, req.ip seria o do
// proxy e TODOS os usuários cairiam no mesmo balde de rate limit — um visitante
// abusivo derrubaria o login da rede inteira.
//
// 1 = confia num único salto (o proxy da plataforma). Nunca use `true` aqui:
// o Express passaria a aceitar qualquer IP que o cliente alegasse ter, e o
// limitador viraria enfeite.
app.set('trust proxy', 1);

// Cabeçalhos de segurança padrão (XSS, sniffing, etc.)
app.use(helmet());

// Teto geral por IP, antes de qualquer rota.
app.use(limiteGeral);

// ── CORS ──────────────────────────────────────────────────────────────
//
// Origens fixas via env. Ex: CORS_ORIGINS="http://localhost:5173,https://www.lckp.com.br"
const origensPermitidas = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Mais o subdomínio de CADA escola, aceito pela forma do endereço.
//
// A lista fixa não escala: cada instituição nova exigiria editar a env e
// reiniciar o serviço, e esquecer isso quebra o portal inteiro de um jeito
// difícil de ler — a API responde 200, o dado está certo, e o navegador
// descarta a resposta antes de o front vê-la. Foi exatamente o que aconteceu
// com etec-bentoquirino.lckp.com.br: 404 "Instituição não encontrada" numa
// escola que existe.
//
// Aceitar pela FORMA é seguro aqui porque o curinga *.lckp.com.br aponta para
// o nosso próprio deploy: para servir uma página em qualquer subdomínio desse
// domínio é preciso controlar o nosso DNS. E liberar a origem não concede dado
// nenhum — subdomínio de escola inexistente continua levando 404 da API.
//
// As regras são as MESMAS de front/src/utils/tenant.js (slugDoHostname). Os
// dois arquivos precisam concordar: um endereço que o front aceita e o CORS
// recusa vira uma escola que carrega a tela e não carrega os dados.
const DOMINIO_BASE = (process.env.DOMINIO_BASE || 'lckp.com.br').toLowerCase();

// Subdomínios da plataforma. Nenhuma escola pode registrá-los.
const SUBDOMINIOS_RESERVADOS = new Set([
  'www', 'api', 'admin', 'app', 'painel', 'docs', 'status',
  'mail', 'staging', 'dev', 'test', 'cdn', 'assets', 'auth', 'webhook'
]);

// O certificado curinga cobre UM nível só: 'a.lckp.com.br' vale,
// 'a.b.lckp.com.br' falha no TLS antes de chegar aqui.
const FORMATO_SLUG = /^[a-z0-9-]{3,40}$/;

const ehSubdominioDeEscola = (origem) => {
  let url;
  try {
    url = new URL(origem);
  } catch {
    return false; // Origin malformado.
  }

  // https em produção. http continua valendo fora dela, senão o teste local em
  // subdomínio (http://etec-x.lvh.me:5173) precisaria de um caminho próprio.
  const emProducao = process.env.NODE_ENV === 'production';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && !emProducao)) return false;
  if (emProducao && url.port) return false;

  const host = url.hostname.toLowerCase();
  if (!host.endsWith('.' + DOMINIO_BASE)) return false;

  const sub = host.slice(0, -(DOMINIO_BASE.length + 1));
  if (!sub || sub.includes('.')) return false;
  if (SUBDOMINIOS_RESERVADOS.has(sub)) return false;
  if (!FORMATO_SLUG.test(sub)) return false;
  if (sub.startsWith('-') || sub.endsWith('-')) return false;

  return true;
};

app.use(cors({
  origin: (origem, callback) => {
    // Sem cabeçalho Origin: curl, health check da plataforma, webhook do
    // gateway. Não é requisição de navegador, então não há nada que o CORS
    // proteja — recusar aqui derrubaria o webhook de pagamento.
    if (!origem) return callback(null, true);

    if (origensPermitidas.includes(origem)) return callback(null, true);
    if (ehSubdominioDeEscola(origem)) return callback(null, true);

    // Registra a origem recusada. Sem isto, o sintoma que chega é
    // "o portal não carrega" e a causa fica invisível nos dois lados.
    console.warn('[LCKP CORS] Origem recusada:', origem);
    return callback(new Error('Origem não permitida pelo CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// O PagBank assina o webhook com SHA-256 sobre o corpo CRU. Se validássemos
// re-serializando req.body, qualquer diferença de espaçamento mudaria o hash e
// toda notificação legítima seria rejeitada — por isso guardamos o original.
const guardarCorpoCru = (req, res, buffer) => {
  req.rawBody = buffer.toString('utf8');
};

// Duas medidas de corpo, escolhidas pelo caminho.
//
// A rota da logo recebe a imagem em base64, o que infla o arquivo em 1/3: uma
// logo de 2 MB chega como ~2,7 MB de JSON. As demais rotas recebem formulários
// e não têm motivo para aceitar mais que o padrão — subir o teto global só por
// causa de uma rota abriria todas as outras para corpos enormes.
//
// A escolha precisa acontecer AQUI, e não na rota: o primeiro express.json()
// que processar a requisição é o que vale. Um segundo parser montado depois
// encontra req.body já preenchido e não faz nada — era o que acontecia antes,
// e por isso o limite de 5 MB declarado na rota da logo nunca teve efeito:
// toda imagem acima de ~74 KB morria em 413 antes de chegar lá.
const LIMITE_PADRAO = '100kb';
const LIMITE_LOGO = '5mb';

const parserPadrao = express.json({ limit: LIMITE_PADRAO, verify: guardarCorpoCru });
const parserLogo = express.json({ limit: LIMITE_LOGO, verify: guardarCorpoCru });

// /schools/<id>/logo — o id é um UUID, mas casar qualquer segmento evita que a
// rota deixe de ser reconhecida no dia em que o formato do id mudar.
const ROTA_LOGO = /^\/schools\/[^/]+\/logo\/?$/;

app.use((req, res, next) =>
  (ROTA_LOGO.test(req.path) ? parserLogo : parserPadrao)(req, res, next)
);

app.use('/auth', rotasAutenticacao);
app.use('/armarios', rotasArmarios);
app.use('/pagamentos', rotasPagamentos);
app.use('/users', rotasUsuarios);
app.use('/schools', rotasEscolas);
app.use('/leads', rotasLeads);

app.get('/status', (req, res) => {
    res.json({ status: 'OK', mensagem: 'Backend do sistema de armários rodando com sucesso!' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
});

// Último recurso. Sem ele, o que estoura fora de um try/catch cai no handler
// padrão do Express, que responde HTML — e o front, que faz `response.json()`,
// quebra com "Unexpected token" em vez de mostrar o erro. Quem mais causava
// isso era o próprio parser de JSON: corpo grande demais ou malformado nunca
// chega a um controlador, então nenhum try/catch os alcançava.
//
// A assinatura precisa ter os QUATRO parâmetros: é assim que o Express
// distingue um handler de erro de um middleware comum. Remover o `next` sem
// uso faz o tratamento parar de funcionar silenciosamente.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'O arquivo enviado é grande demais. Reduza o tamanho e tente novamente.'
        });
    }

    if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        return res.status(400).json({ error: 'O corpo da requisição não é um JSON válido.' });
    }

    if (err?.deNegocio === true) {
        return res.status(err.status || 400).json({ error: err.message });
    }

    // Inesperado: o detalhe fica no log do servidor, onde há como investigar.
    // Devolvê-lo ao cliente entregaria nome de tabela e de constraint a quem
    // só mandou um formulário errado.
    console.error('[LCKP ERROR] Falha não tratada:', err?.message || err);
    if (err?.stack) console.error(err.stack);

    return res.status(500).json({
        error: 'Não foi possível concluir a operação. Tente novamente em instantes.'
    });
});

export default app;
