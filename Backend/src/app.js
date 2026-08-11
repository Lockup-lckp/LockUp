import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import rotasAutenticacao from './rotas/autenticacao.js';
import rotasArmarios from './rotas/armarios.js';
import rotasPagamentos from './rotas/pagamentos.js';
import rotasUsuarios from './rotas/usuarios.js';
import rotasEscolas from './rotas/escola.js';
import rotasLeads from './rotas/leads.js';

const app = express();

// Cabeçalhos de segurança padrão (XSS, sniffing, etc.)
app.use(helmet());

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
