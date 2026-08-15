// Diagnóstico do ambiente do Banco do Brasil.
//
// Roda contra o banco de dados REAL e diz, em ordem, o que ainda falta para uma
// escola conseguir cobrar. Feito para o dia em que a credencial chegar: em vez
// de descobrir o problema pelo primeiro aluno que não consegue pagar, roda-se
// isto e cada linha aponta o próximo passo.
//
// Rodar:  node verificar-bb.mjs
//         node verificar-bb.mjs etec-043     (só uma escola, e testa a credencial)

import 'dotenv/config';

const CODIGOS_ALVO = process.argv.slice(2);

const V = '\x1b[32m✓\x1b[0m';
const X = '\x1b[31m✗\x1b[0m';
const A = '\x1b[33m!\x1b[0m';

let bloqueios = 0;
const bloqueio = (msg, comoResolver) => {
    bloqueios++;
    console.log(`  ${X} ${msg}`);
    if (comoResolver) console.log(`      → ${comoResolver}`);
};
const aviso = (msg, obs) => {
    console.log(`  ${A} ${msg}`);
    if (obs) console.log(`      → ${obs}`);
};
const certo = (msg) => console.log(`  ${V} ${msg}`);

console.log('\n=== 1. Variáveis de ambiente ===');

const obrigatorias = {
    SUPABASE_URL: 'endereço do projeto no Supabase',
    SUPABASE_SERVICE_ROLE_KEY: 'chave de serviço do Supabase',
    CREDENCIAIS_SECRET: 'chave que cifra as credenciais no banco'
};

for (const [nome, oque] of Object.entries(obrigatorias)) {
    if (!process.env[nome]) {
        bloqueio(`${nome} não definida (${oque}).`,
            nome === 'CREDENCIAIS_SECRET'
                ? 'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" e use o MESMO valor aqui e no Render.'
                : 'Confira o .env.');
    } else if (nome === 'CREDENCIAIS_SECRET' && !/^[0-9a-fA-F]{64}$/.test(process.env[nome])) {
        bloqueio('CREDENCIAIS_SECRET não tem 32 bytes em hexadecimal (64 caracteres).',
            'Sem isso a cifragem falha e nenhuma credencial pode ser salva.');
    } else {
        certo(`${nome} definida.`);
    }
}

const base = (process.env.BACKEND_PUBLIC_URL || '').replace(/\/+$/, '');
if (!base) {
    bloqueio('BACKEND_PUBLIC_URL não definida.',
        'É a partir dela que se monta a URL do webhook registrada no banco.');
} else if (!base.startsWith('https://')) {
    bloqueio(`BACKEND_PUBLIC_URL não é https (${base}).`,
        'O Banco do Brasil recusa endereço de notificação sem TLS.');
} else {
    certo(`BACKEND_PUBLIC_URL = ${base}`);
}

for (const opcional of ['BB_OAUTH_URL', 'BB_API_URL']) {
    if (process.env[opcional]) {
        aviso(`${opcional} sobrescrita: ${process.env[opcional]}`,
            'Só use se o banco informou um endereço diferente do padrão.');
    }
}

if (bloqueios) {
    console.log(`\n${bloqueios} bloqueio(s) de ambiente. Resolva antes de seguir.\n`);
    process.exit(1);
}

console.log('\n=== 2. Escolas no banco de dados ===');

const { default: supabase } = await import('./src/config/database.js');

let consulta = supabase
    .from('schools')
    .select('id, codigo, name, gateway, gateway_ambiente, credenciais_gateway_cifrado, valor_armario')
    .order('codigo');

if (CODIGOS_ALVO.length) consulta = consulta.in('codigo', CODIGOS_ALVO);

const { data: escolas, error } = await consulta;

if (error) {
    console.log(`  ${X} Não foi possível ler as escolas: ${error.message}`);
    process.exit(1);
}
if (!escolas?.length) {
    console.log(`  ${X} Nenhuma escola encontrada${CODIGOS_ALVO.length ? ` para ${CODIGOS_ALVO.join(', ')}` : ''}.`);
    process.exit(1);
}

// A constraint do Postgres é o bloqueio mais fácil de esquecer: sem a migração
// 2026-08-14-banco-do-brasil.sql o banco RECUSA gateway='bancodobrasil', e o
// erro que aparece no painel (23514) não diz qual é a causa.
const { error: erroConstraint } = await supabase
    .from('schools')
    .select('id')
    .eq('gateway', 'bancodobrasil')
    .limit(1);

if (erroConstraint) {
    aviso(`Consulta por gateway='bancodobrasil' falhou: ${erroConstraint.message}`);
}

const { obterCredenciaisBB, testarCredencialBB } = await import('./src/servicos/gateways/bancoDoBrasil.js');

for (const escola of escolas) {
    console.log(`\n  --- ${escola.codigo} — ${escola.name}`);

    if (escola.gateway !== 'bancodobrasil') {
        console.log(`      gateway atual: ${escola.gateway}`);
        if (escola.credenciais_gateway_cifrado) {
            aviso('Tem credencial cadastrada mas ainda não está no Banco do Brasil.',
                'Rode a parte 3 de Backend/sql/2026-08-14-banco-do-brasil.sql.');
        } else {
            console.log('      (sem credencial; nada a fazer por enquanto)');
        }
        continue;
    }

    certo(`gateway = bancodobrasil (${escola.gateway_ambiente || 'producao'})`);

    if (!escola.valor_armario) {
        bloqueio('valor_armario não configurado.', 'O checkout recusa sem preço definido.');
    }

    if (!escola.credenciais_gateway_cifrado) {
        bloqueio('Sem credenciais cadastradas.',
            'Painel do superadmin → a instituição → credenciais do gateway.');
        continue;
    }

    try {
        obterCredenciaisBB(escola);
        certo('Credenciais completas e legíveis.');
    } catch (err) {
        bloqueio(err.message);
        continue;
    }

    // O teste de rede só roda quando se pede uma escola explicitamente: ele
    // autentica de verdade no banco, e disparar isso para a rede inteira a cada
    // diagnóstico é chamada à toa.
    if (!CODIGOS_ALVO.length) {
        console.log('      (rode com o código da escola para testar a conexão com o banco)');
        continue;
    }

    try {
        const r = await testarCredencialBB(escola);
        certo(`Autenticou no Banco do Brasil (ambiente ${r.ambiente}).`);
        if (r.webhook_registrado) {
            certo(`Webhook registrado: ${r.webhook_url}`);
            const esperado = `${base}/pagamentos/webhook/bb/${escola.codigo}`;
            if (r.webhook_url !== esperado) {
                aviso(`O webhook registrado não é o desta instalação (esperado ${esperado}).`,
                    'Registre de novo pelo painel do superadmin.');
            }
        } else {
            bloqueio('Webhook NÃO registrado no banco.',
                'Sem ele o aluno paga e o armário não abre. Painel do superadmin → registrar webhook.');
        }
    } catch (err) {
        bloqueio(`Não autenticou: ${err.message}`);
    }
}

console.log(
    bloqueios
        ? `\n${bloqueios} pendência(s). Cada '→' acima diz o que fazer.\n`
        : '\nTudo pronto para receber pelo Banco do Brasil.\n'
);
process.exit(bloqueios ? 1 : 0);
