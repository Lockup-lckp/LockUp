// Verificação do cache de escolas: sobe um stub que imita a REST do Supabase e
// conta quantas requisições realmente saem. Sem isso, "tem cache" é só suposição.
//
// Rode com:  node teste-cache-escola.mjs
import http from 'node:http';

let requisicoes = 0;

const stub = http.createServer((req, res) => {
  requisicoes++;
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify([{ id: 'esc-1', codigo: 'etec-bq', name: 'Etec Bento Quirino' }]));
});

await new Promise((r) => stub.listen(0, r));
const porta = stub.address().port;

// O cliente do Supabase é criado no import de config/database.js, então as envs
// precisam estar postas antes de importar o módulo sob teste.
process.env.SUPABASE_URL = `http://127.0.0.1:${porta}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';

const { obterEscolaPorCodigo, obterIdEscolaPorCodigo, invalidarCacheEscolas } =
  await import('./src/servicos/cacheEscola.js');

const falhas = [];
const checar = (desc, ok) => {
  console.log(`${ok ? 'PASSOU' : 'FALHOU'}  ${desc}`);
  if (!ok) falhas.push(desc);
};

// 1. Primeira busca vai ao banco.
requisicoes = 0;
const a = await obterEscolaPorCodigo('etec-bq');
checar('1a busca consulta o banco (1 requisicao)', requisicoes === 1);
checar('devolve a linha da escola', a?.id === 'esc-1');

// 2. Buscas seguintes vêm do cache.
await obterEscolaPorCodigo('etec-bq');
await obterEscolaPorCodigo('etec-bq');
await obterIdEscolaPorCodigo('etec-bq');
checar('3 buscas seguintes NAO consultam o banco (segue 1)', requisicoes === 1);

// 3. Código com caixa diferente reaproveita a mesma entrada (chave normalizada).
await obterEscolaPorCodigo('ETEC-BQ');
checar('codigo em caixa alta reaproveita o cache', requisicoes === 1);

// 4. Invalidação força nova consulta.
invalidarCacheEscolas();
await obterEscolaPorCodigo('etec-bq');
checar('apos invalidar, consulta o banco de novo (2)', requisicoes === 2);

// 5. Código diferente é uma entrada distinta.
await obterEscolaPorCodigo('etec-outra');
checar('codigo diferente gera nova consulta (3)', requisicoes === 3);

// 6. obterIdEscolaPorCodigo devolve só o id.
const id = await obterIdEscolaPorCodigo('etec-bq');
checar('obterIdEscolaPorCodigo devolve o id', id === 'esc-1');

// 7. Código vazio não consulta nada.
const antes = requisicoes;
const nulo = await obterEscolaPorCodigo('');
checar('codigo vazio devolve null sem consultar', nulo === null && requisicoes === antes);

// Espera o socket fechar de fato: process.exit com handle aberto dispara
// assertion do libuv no Windows.
await new Promise((r) => stub.close(r));

console.log(`\nrequisicoes totais ao "banco": ${requisicoes}`);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTodas as verificacoes passaram.');
process.exitCode = falhas.length ? 1 : 0;
