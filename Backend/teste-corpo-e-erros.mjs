// Limites de corpo e tratamento de erro, contra o app REAL.
//
// Existe por causa de um bug que passou despercebido: o parser de JSON grande
// estava montado na rota da logo, mas o parser global já processava a
// requisição antes — toda imagem acima de ~74 KB morria em 413, embora a tela
// prometesse 2 MB e o controlador validasse 2 MB.
//
// A lição que o teste guarda: quem decide o limite é o PRIMEIRO express.json()
// que casa com a requisição, não o mais próximo da rota.
//
// Rodar:  node teste-corpo-e-erros.mjs

import 'dotenv/config';

// O app importa controladores que exigem estas variáveis para carregar.
process.env.MP_ACCESS_TOKEN ||= 'token-de-teste';
process.env.CREDENCIAIS_SECRET ||= 'a'.repeat(64);
process.env.SUPABASE_URL ||= 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'chave-de-teste';

const { default: app } = await import('./src/app.js');

let passou = 0;
let falhou = 0;
const ok = (nome, condicao, detalhe = '') => {
    if (condicao) { passou++; console.log(`  ok   ${nome}`); }
    else { falhou++; console.log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ''}`); }
};

const servidor = app.listen(0);
await new Promise((r) => servidor.once('listening', r));
const base = `http://127.0.0.1:${servidor.address().port}`;

const enviar = (caminho, corpo, cabecalhos = {}) =>
    fetch(`${base}${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...cabecalhos },
        body: corpo
    });

// Uma logo de 2 MB vira ~2,7 MB em base64 — o caso real que o bug quebrava.
const imagemGrande = JSON.stringify({
    arquivo: `data:image/png;base64,${'A'.repeat(2 * 1024 * 1024)}`,
    tipo: 'image/png',
    campo: 'logo_url'
});

console.log('\n== rota da logo aceita corpo grande ==');
{
    const r = await enviar('/schools/00000000-0000-0000-0000-000000000000/logo', imagemGrande);
    // Sem token a resposta é 401 — o que importa é que NÃO foi 413: significa
    // que o corpo passou pelo parser e a requisição chegou à rota.
    ok('não rejeita 2,7 MB com 413', r.status !== 413, `status ${r.status}`);
    ok('chega à autenticação (401)', r.status === 401, `status ${r.status}`);
}

console.log('\n== demais rotas seguem com o teto padrão ==');
{
    const r = await enviar('/leads', imagemGrande);
    ok('corpo enorme em /leads é recusado', r.status === 413, `status ${r.status}`);

    const corpo = await r.json().catch(() => null);
    ok('o 413 responde JSON, não HTML', corpo !== null);
    ok('a mensagem é legível para quem está na tela',
        /grande demais/i.test(corpo?.error || ''), corpo?.error);
}

console.log('\n== JSON malformado ==');
{
    const r = await enviar('/leads', '{isso nao e json');
    ok('responde 400', r.status === 400, `status ${r.status}`);
    const corpo = await r.json().catch(() => null);
    ok('responde JSON, não HTML', corpo !== null);
    ok('a mensagem explica o problema',
        /JSON válido/i.test(corpo?.error || ''), corpo?.error);
}

console.log('\n== rota inexistente ==');
{
    const r = await fetch(`${base}/nao-existe`);
    ok('responde 404 em JSON', r.status === 404);
    ok('mensagem própria', (await r.json())?.error === 'Rota não encontrada.');
}

console.log('\n== corpo cru preservado (assinatura do PagBank) ==');
{
    // O webhook do PagBank valida um SHA-256 sobre o corpo EXATO recebido. Se o
    // parser não guardasse req.rawBody, toda notificação legítima seria
    // rejeitada. Escola inexistente devolve 404, mas só depois de ler o corpo.
    const r = await enviar('/pagamentos/webhook/pagbank/escola-que-nao-existe', '{"id":"x"}');
    ok('a requisição é processada (não estoura)', r.status < 500, `status ${r.status}`);
}

servidor.close();
console.log(`\n${passou} passaram, ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
