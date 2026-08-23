import supabase from '../config/database.js';

// Cache em memória da linha de `schools`, indexado pelo código da URL.
//
// Por que existe: a escola é consultada em praticamente toda requisição — o
// portal busca a identidade a cada carga de página, e cada operação de armário
// resolve o código da URL para o school_id antes de agir. São dezenas de
// round-trips ao Supabase por navegação de um único aluno, sempre devolvendo a
// mesma linha. A tabela tem ~200 registros e muda raramente (logo, valor,
// gateway), então guardar por alguns segundos elimina quase todas essas idas.
//
// Limitações assumidas de propósito:
//  - É por processo. Com mais de uma instância do backend, cada uma tem seu
//    cache; depois de uma alteração, uma instância pode servir dado antigo até
//    o TTL expirar. Para logo e configuração isso é aceitável.
//  - Qualquer escrita em `schools` limpa o cache inteiro. São poucas entradas,
//    e limpar tudo evita ter de mapear id -> código para invalidar seletivamente
//    (que é justamente onde esse tipo de cache costuma errar).

const TTL_MS = 60_000;

const porCodigo = new Map(); // codigo (minúsculo) -> { linha, expiraEm }

const chave = (codigo) => String(codigo).trim().toLowerCase();

// Busca a escola pelo código OU pelo subdomínio, servindo do cache quando ainda
// válido. Devolve a linha crua (ou null) — quem chama decide o que expor.
//
// Os dois campos existem porque endereço e identidade se separaram
// (migração 2026-08-22):
//
//   codigo      'etec-043'          o que o sistema usa em todo lugar
//   subdominio  'etec-bentoquirino' o que o aluno digita no navegador
//
// A resolução aceita os dois porque ela é o ÚNICO ponto que recebe o endereço:
// o portal chega por hostname e sai daqui com a linha, e todo o resto do
// sistema passa a falar em `codigo`.
export const obterEscolaPorCodigo = async (codigo) => {
  if (!codigo) return null;

  const k = chave(codigo);
  const cacheada = porCodigo.get(k);
  if (cacheada && cacheada.expiraEm > Date.now()) {
    return cacheada.linha;
  }

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();

  if (error) {
    // Não guarda falha de banco: erro transitório não deve virar 404 por 60s.
    throw error;
  }

  let linha = data ?? null;

  // Não achou pelo código: pode ser o endereço público.
  //
  // A coluna pode ainda não existir — o deploy sai antes de a migração rodar.
  // Nesse caso o PostgREST devolve 42703, e aqui isso significa "esta
  // instalação ainda não tem endereço separado", não erro: seguimos com o
  // resultado da busca por código. Derrubar com 500 o endpoint mais quente do
  // sistema por causa de uma coluna pendente seria bem pior.
  if (!linha) {
    const { data: porEndereco, error: erroEndereco } = await supabase
      .from('schools')
      .select('*')
      .ilike('subdominio', codigo)
      .maybeSingle();

    if (erroEndereco && erroEndereco.code !== '42703') throw erroEndereco;
    linha = porEndereco ?? null;
  }

  porCodigo.set(k, { linha, expiraEm: Date.now() + TTL_MS });

  // Guarda também sob o código canônico: a próxima chamada, que virá com
  // 'etec-043' em vez do endereço, encontra sem nova ida ao banco.
  if (linha?.codigo) {
    const canonica = chave(linha.codigo);
    if (canonica !== k) porCodigo.set(canonica, { linha, expiraEm: Date.now() + TTL_MS });
  }

  return linha;
};

// Só o id, para as travas multi-tenant que não precisam da linha toda.
export const obterIdEscolaPorCodigo = async (codigo) => {
  try {
    const escola = await obterEscolaPorCodigo(codigo);
    return escola?.id ?? null;
  } catch (err) {
    console.error('Erro ao resolver a escola pelo código:', err.message);
    return null;
  }
};

// Chamar depois de qualquer criação, alteração ou exclusão de escola.
export const invalidarCacheEscolas = () => {
  porCodigo.clear();
};
