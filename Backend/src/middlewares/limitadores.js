import rateLimit from 'express-rate-limit';

// Limitadores de taxa por IP.
//
// Ficam juntos porque a política precisa ser lida de uma vez: quem olha
// "quanto o sistema aguenta antes de barrar" não deveria ter que abrir seis
// arquivos de rota.
//
// ATENÇÃO ao rodar atrás de proxy (Render, Vercel, Cloudflare): sem
// `app.set('trust proxy', ...)` no app.js, o Express enxerga o IP do PROXY em
// vez do IP real. O efeito é o pior possível — todos os usuários compartilham
// o mesmo contador e um único visitante barulhento derruba o login de todos.

const respostaPadrao = (mensagem) => ({ error: mensagem });

/**
 * Teto geral da API. Alto de propósito: existe para conter varredura e abuso,
 * não para atrapalhar uso normal. Uma escola inteira em dia de matrícula sai
 * de um punhado de IPs, e barrar aluno legítimo é pior do que o abuso.
 */
export const limiteGeral = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: respostaPadrao('Muitas requisições. Aguarde alguns minutos e tente novamente.'),
    // Webhook de banco NÃO entra na conta. Quando o gateway reenvia uma
    // notificação em rajada, barrá-la significa pagamento confirmado que não
    // libera armário — o pior desfecho possível do sistema.
    skip: (req) => req.path.startsWith('/pagamentos/webhook')
});

/**
 * Login: a defesa contra força bruta.
 *
 * `skipSuccessfulRequests` faz o contador ignorar quem acertou a senha. Sem
 * isso, um laboratório de informática com 30 alunos entrando pelo mesmo IP
 * estouraria o limite fazendo tudo certo.
 */
export const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: respostaPadrao('Muitas tentativas de login. Aguarde 15 minutos e tente novamente.')
});

/**
 * Troca de senha. Mais folgado que o login porque a rota já exige token, mas
 * ainda limitado: com um token roubado, tentar a senha atual em laço é um
 * caminho para descobri-la.
 */
export const limiteTrocaSenha = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: respostaPadrao('Muitas tentativas de alteração de senha. Aguarde alguns minutos.')
});

/**
 * Formulário público da landing. Baixo porque é entrada anônima e o único uso
 * legítimo é uma escola pedindo contato — ninguém faz isso seis vezes.
 */
export const limiteFormulario = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: respostaPadrao('Muitas tentativas de contato. Tente novamente mais tarde.')
});
