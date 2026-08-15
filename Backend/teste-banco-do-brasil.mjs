// Teste do adaptador do Banco do Brasil, sem credencial real.
//
// Sobe um HTTPS local imitando o banco e aponta o adaptador para ele com
// BB_OAUTH_URL / BB_API_URL. É o que permite exercitar o caminho inteiro —
// OAuth, cache de token, PUT /cob, consulta e tratamento de erro — antes de o
// cadastro de desenvolvedor sair.
//
// O que ele NÃO prova: que o BB aceita exatamente este corpo. Isso só a
// credencial real responde. O que ele prova é que a nossa metade está certa.
//
// Rodar:  node teste-banco-do-brasil.mjs

import https from 'https';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------
// Certificado do servidor de teste
// ---------------------------------------------------------------------
// O servidor local é autoassinado, então o cliente precisa confiar nele. A
// saída preguiçosa seria NODE_TLS_REJECT_UNAUTHORIZED=0, mas isso desliga a
// verificação de TODO o processo — inclusive a do mTLS que este teste existe
// para exercitar, e o teste passaria mesmo com o TLS quebrado.
//
// Em vez disso o certificado entra na lista de CAs confiáveis por
// NODE_EXTRA_CA_CERTS. Como o Node lê essa variável só na partida, o script se
// reexecuta uma vez com ela definida.
const ESTE_ARQUIVO = fileURLToPath(import.meta.url);

if (!process.env.LCKP_TESTE_BB_DIR) {
    const dirCert = mkdtempSync(join(tmpdir(), 'lckp-bb-'));
    execFileSync('openssl', [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
        '-keyout', join(dirCert, 'k.pem'), '-out', join(dirCert, 'c.pem'),
        '-days', '1', '-subj', '/CN=localhost'
    ], { stdio: 'ignore' });

    let codigo = 0;
    try {
        execFileSync(process.execPath, [ESTE_ARQUIVO], {
            env: {
                ...process.env,
                LCKP_TESTE_BB_DIR: dirCert,
                NODE_EXTRA_CA_CERTS: join(dirCert, 'c.pem')
            },
            stdio: 'inherit'
        });
    } catch (err) {
        // Teste que falha precisa reprovar aqui também, senão o CI passa verde
        // com o filho vermelho.
        codigo = err.status ?? 1;
    }
    rmSync(dirCert, { recursive: true, force: true });
    process.exit(codigo);
}

process.env.CREDENCIAIS_SECRET = 'a'.repeat(64);

const { cifrarCredenciais } = await import('./src/utils/cripto.js');
const bb = await import('./src/servicos/gateways/bancoDoBrasil.js');

let passou = 0;
let falhou = 0;

const ok = (nome, condicao, detalhe = '') => {
    if (condicao) {
        passou++;
        console.log(`  ok   ${nome}`);
    } else {
        falhou++;
        console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
    }
};

const dir = process.env.LCKP_TESTE_BB_DIR;
const certServidor = readFileSync(join(dir, 'c.pem'), 'utf8');
const chaveServidor = readFileSync(join(dir, 'k.pem'), 'utf8');

// ---------------------------------------------------------------------
// Servidor imitando o Banco do Brasil
// ---------------------------------------------------------------------
const chamadas = { oauth: 0, cob: 0 };
let ultimaRequisicao = null;

const servidor = https.createServer({ cert: certServidor, key: chaveServidor }, (req, res) => {
    const url = new URL(req.url, 'https://localhost');
    const pedacos = [];
    req.on('data', (p) => pedacos.push(p));
    req.on('end', () => {
        const corpo = Buffer.concat(pedacos).toString('utf8');
        ultimaRequisicao = { metodo: req.method, url, corpo, cabecalhos: req.headers };

        if (url.pathname === '/oauth/token') {
            chamadas.oauth++;
            const auth = req.headers.authorization || '';
            if (!auth.startsWith('Basic ')) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'sem basic' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ access_token: 'token-de-teste', expires_in: 600 }));
        }

        if (url.pathname.startsWith('/cob/')) {
            chamadas.cob++;
            const txid = url.pathname.slice('/cob/'.length);

            if (req.method === 'PUT') {
                res.writeHead(201, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    txid,
                    status: 'ATIVA',
                    pixCopiaECola: `00020126BR.GOV.BCB.PIX-${txid}`
                }));
            }
            // GET — cobrança já paga
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                txid,
                status: 'CONCLUIDA',
                pix: [{ endToEndId: 'E00000000202608141200', valor: '50.00' }]
            }));
        }

        if (url.pathname === '/cob-recusado') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                title: 'Cobrança inválida',
                violacoes: [{ razao: 'A chave Pix informada não pertence à conta.' }]
            }));
        }

        res.writeHead(404).end('{}');
    });
});

await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const porta = servidor.address().port;
process.env.BB_OAUTH_URL = `https://localhost:${porta}/oauth/token`;
process.env.BB_API_URL = `https://localhost:${porta}`;

// ---------------------------------------------------------------------
// Escola de teste
// ---------------------------------------------------------------------
// O cliente manda cert/key no handshake. O servidor de teste não os exige,
// mas passar os do próprio servidor garante que são PEM válidos — um PEM
// malformado faz o node:https estourar na criação do socket.
const credenciaisCompletas = {
    client_id: 'id-teste',
    client_secret: 'segredo-teste',
    app_key: 'chave-app-teste',
    chave_pix: 'pix@etec.sp.gov.br',
    certificado: certServidor,
    certificado_chave: chaveServidor
};

const escola = {
    id: 'escola-1',
    name: 'ETEC de Teste',
    codigo: 'etec-teste',
    gateway: 'bancodobrasil',
    gateway_ambiente: 'producao',
    credenciais_gateway_cifrado: cifrarCredenciais(credenciaisCompletas)
};

const armario = { id: 'arm-1', nome: 'A-12' };

console.log('\n== txid no formato do padrão Pix ==');
{
    const txid = bb.gerarTxid();
    ok('26 a 35 caracteres alfanuméricos', /^[a-zA-Z0-9]{26,35}$/.test(txid), txid);
    ok('dois txid seguidos são diferentes', bb.gerarTxid() !== bb.gerarTxid());
}

console.log('\n== tradução de status ==');
ok("CONCLUIDA vira 'aprovado'", bb.traduzirStatusBB('CONCLUIDA') === 'aprovado');
ok("ATIVA vira 'pendente'", bb.traduzirStatusBB('ATIVA') === 'pendente');
ok("REMOVIDA vira 'recusado'", bb.traduzirStatusBB('REMOVIDA_PELO_USUARIO_RECEBEDOR') === 'recusado');
ok("status desconhecido vira 'recusado'", bb.traduzirStatusBB('SEI_LA') === 'recusado');

console.log('\n== credencial incompleta diz O QUE falta ==');
{
    const parcial = {
        ...escola,
        credenciais_gateway_cifrado: cifrarCredenciais({ client_id: 'x', client_secret: 'y' })
    };
    try {
        bb.obterCredenciaisBB(parcial);
        ok('recusa credencial incompleta', false, 'não lançou');
    } catch (err) {
        ok('recusa credencial incompleta', true);
        ok('cita a chave Pix ausente', err.message.includes('Chave Pix'), err.message);
        ok('cita o certificado ausente', err.message.includes('Certificado'), err.message);
        ok('NÃO cita o que foi preenchido', !err.message.includes('Client ID'), err.message);
    }
}

console.log('\n== leitura da notificação ==');
{
    const txids = bb.lerTxidsDaNotificacaoBB({
        pix: [{ txid: 'aaa' }, { txid: 'bbb' }, { txid: 'aaa' }, { semTxid: true }]
    });
    ok('extrai os txid sem repetir', JSON.stringify(txids) === '["aaa","bbb"]', JSON.stringify(txids));
    ok('corpo vazio devolve lista vazia', bb.lerTxidsDaNotificacaoBB({}).length === 0);
    ok('corpo nulo não estoura', bb.lerTxidsDaNotificacaoBB(null).length === 0);
}

console.log('\n== criação da cobrança ==');
{
    bb.limparCacheTokensBB();
    chamadas.oauth = 0;

    const expiraEm = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const cobranca = await bb.criarCobrancaBB({
        escola,
        armario,
        valorTotal: 50,
        transactionId: 'TX-123-45',
        cliente: { nome: 'Aluno Teste', cpf: '390.533.447-05' },
        expiraEm
    });

    ok('devolve o BRCode', String(cobranca.qrCode).startsWith('00020126'), cobranca.qrCode);
    ok("nasce 'pendente'", cobranca.statusTraduzido === 'pendente', cobranca.statusTraduzido);
    ok('gatewayId é o txid', /^[a-zA-Z0-9]{26,35}$/.test(cobranca.gatewayId), cobranca.gatewayId);

    const enviado = JSON.parse(ultimaRequisicao.corpo);
    ok('método é PUT', ultimaRequisicao.metodo === 'PUT', ultimaRequisicao.metodo);
    ok('valor vai como string com 2 casas', enviado.valor.original === '50.00', enviado.valor.original);
    ok('chave Pix é a da escola', enviado.chave === 'pix@etec.sp.gov.br');
    ok('expiração em segundos, ~30 min',
        enviado.calendario.expiracao > 1750 && enviado.calendario.expiracao <= 1800,
        String(enviado.calendario.expiracao));
    ok('CPF vai só com dígitos', enviado.devedor?.cpf === '39053344705', enviado.devedor?.cpf);
    ok('transactionId viaja em infoAdicionais',
        enviado.infoAdicionais?.some((i) => i.valor === 'TX-123-45'));
    ok('app key vai na query string',
        ultimaRequisicao.url.searchParams.get('gw-app-key') === 'chave-app-teste');
    ok('Bearer com o token do OAuth',
        ultimaRequisicao.cabecalhos.authorization === 'Bearer token-de-teste');
}

console.log('\n== CPF ausente ou inválido não vira devedor ==');
{
    for (const cpf of ['', '123', null]) {
        await bb.criarCobrancaBB({
            escola, armario, valorTotal: 50, transactionId: 'TX-1',
            cliente: { nome: 'Sem CPF', cpf },
            expiraEm: new Date(Date.now() + 600000).toISOString()
        });
        const enviado = JSON.parse(ultimaRequisicao.corpo);
        ok(`CPF ${JSON.stringify(cpf)} omite o devedor`, enviado.devedor === undefined);
    }
}

console.log('\n== cache de token ==');
{
    bb.limparCacheTokensBB();
    chamadas.oauth = 0;
    for (let i = 0; i < 4; i++) {
        await bb.criarCobrancaBB({
            escola, armario, valorTotal: 10, transactionId: `TX-${i}`,
            cliente: { nome: 'Aluno', cpf: '39053344705' },
            expiraEm: new Date(Date.now() + 600000).toISOString()
        });
    }
    ok('4 cobranças usam 1 único OAuth', chamadas.oauth === 1, `foram ${chamadas.oauth}`);

    // Trocar a credencial precisa invalidar o token — senão o banco continuaria
    // recebendo o Bearer da credencial antiga.
    const outra = {
        ...escola,
        credenciais_gateway_cifrado: cifrarCredenciais({ ...credenciaisCompletas, client_id: 'id-novo' })
    };
    await bb.criarCobrancaBB({
        escola: outra, armario, valorTotal: 10, transactionId: 'TX-novo',
        cliente: { nome: 'Aluno', cpf: '39053344705' },
        expiraEm: new Date(Date.now() + 600000).toISOString()
    });
    ok('credencial nova refaz o OAuth', chamadas.oauth === 2, `foram ${chamadas.oauth}`);
}

console.log('\n== consulta confirma o pagamento ==');
{
    const conf = await bb.consultarCobrancaBB(escola, 'abc123');
    ok("CONCLUIDA vira 'aprovado'", conf.statusTraduzido === 'aprovado');
    ok('devolve o valor pago', conf.valorPago === 50, String(conf.valorPago));
    ok('devolve o endToEndId', conf.endToEndId === 'E00000000202608141200');
}

console.log('\n== erro do banco chega legível ==');
{
    process.env.BB_API_URL = `https://localhost:${porta}/cob-recusado#`;
    try {
        await bb.consultarCobrancaBB(escola, 'x');
        ok('propaga o erro do banco', false, 'não lançou');
    } catch (err) {
        ok('propaga o erro do banco', true);
        ok('inclui a razão da violação',
            err.message.includes('não pertence à conta'), err.message);
    }
    process.env.BB_API_URL = `https://localhost:${porta}`;
}

servidor.close();

console.log(`\n${passou} passaram, ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
