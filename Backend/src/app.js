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

// Origens liberadas via env. Ex: CORS_ORIGINS="http://localhost:5173,https://app.lckp.com.br"
const origensPermitidas = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: origensPermitidas,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// O PagBank assina o webhook com SHA-256 sobre o corpo CRU. Se validássemos
// re-serializando req.body, qualquer diferença de espaçamento mudaria o hash e
// toda notificação legítima seria rejeitada — por isso guardamos o original.
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer.toString('utf8');
  }
}));

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

export default app;
