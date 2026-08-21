// Leitura do contrato da instituição, separada do componente que o desenha.
//
// Em arquivo próprio pelo mesmo motivo de theme/contextoEscola.js: o Fast
// Refresh do Vite só preserva o estado da tela quando o módulo exporta APENAS
// componentes. Com estas funções morando junto do DocumentoContrato, cada
// salvamento durante o desenvolvimento recarregava a aplicação inteira.
//
// O texto vem de `schools.contrato_texto`, uma cláusula por linha, escrito pela
// escola em Configurações. Nada aqui interpreta o conteúdo — só o organiza.

/** Cláusulas do contrato, na ordem, sem linhas vazias. */
export const clausulasDe = (escola) =>
    (escola?.contrato_texto || '')
        .split('\n')
        .map((linha) => linha.trim())
        .filter(Boolean);

export const tituloDe = (escola) =>
    escola?.contrato_titulo || 'Contrato de locação de armário';

/**
 * Primeira frase curta de uma cláusula, quando ela funciona como título.
 *
 * Contratos costumam abrir a cláusula com a regra em uma frase ("O armário é da
 * escola.") e detalhar em seguida. Destacar essa frase é o que separa um bloco
 * de texto corrido de um documento que dá para varrer com o olho.
 *
 * A expressão é deliberadamente restritiva: a abertura não pode conter ponto
 * nenhum, e o que vem depois precisa começar em maiúscula ou dígito. Sem isso,
 * "inscrita no CNPJ n. 12.345" seria partido no "n." e o destaque cairia no
 * meio de uma frase.
 *
 * @returns {{abertura: string|null, corpo: string}}
 */
// Abreviaturas que terminam em ponto sem terminar a frase. Sem esta lista,
// "inscrita no CNPJ n. 12.345" e "o art. 5 da lei" seriam partidos no meio, e o
// destaque cairia sobre metade de uma frase.
const ABREVIATURAS = new Set([
    'n', 'no', 'nos', 'num', 'art', 'arts', 'inc', 'incs', 'par', 'pars',
    'sr', 'sra', 'srs', 'sras', 'dr', 'dra', 'prof', 'profa',
    'etc', 'ltda', 'cia', 'av', 'r', 'ex', 'cf', 'obs',
    'pag', 'pags', 'fl', 'fls', 'cap', 'caps', 'ed', 'ref'
]);

const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const separarAbertura = (clausula) => {
    const m = clausula.match(/^([A-ZÀ-Ú][^.!?]{5,70}[.:])\s+(?=[A-ZÀ-Ú0-9])/);
    if (!m) return { abertura: null, corpo: clausula };

    // A última palavra antes do ponto decide. Uma letra sozinha ou uma
    // abreviatura conhecida significam que a frase não acabou ali.
    const ultimaPalavra = semAcento(m[1].slice(0, -1))
        .split(/[\s(]+/)
        .pop()
        .replace(/[^a-zA-Z0-9º°]/g, '')
        .toLowerCase();

    if (ultimaPalavra.length < 2 || ABREVIATURAS.has(ultimaPalavra)) {
        return { abertura: null, corpo: clausula };
    }

    return { abertura: m[1], corpo: clausula.slice(m[0].length) };
};

// Proporcao de clausulas que precisam abrir com frase curta para o destaque
// valer a pena. Abaixo disso o negrito vira ruido.
const PROPORCAO_MINIMA = 0.6;
const MINIMO_DE_CLAUSULAS = 3;

/**
 * Cláusulas prontas para desenhar, já decidido se o destaque se aplica.
 *
 * O destaque é uma decisão do DOCUMENTO inteiro, não de cada cláusula. O
 * contrato da APM Etec Bento Quirino, por exemplo, tem 20 cláusulas e só uma
 * abre com frase curta — destacar essa sozinha faria o leitor procurar o que
 * ela tem de especial, que é nada. Uma cláusula em negrito entre dezenove sem
 * lê-se como defeito, não como formatação.
 *
 * Quando a maioria segue o padrão, o destaque ajuda de verdade: dá para varrer
 * o contrato pelas regras em vez de ler os vinte parágrafos.
 *
 * @returns {{abertura: string|null, corpo: string}[]}
 */
export const prepararClausulas = (escola) => {
    const clausulas = clausulasDe(escola);
    const partidas = clausulas.map(separarAbertura);
    const quantas = partidas.filter((p) => p.abertura).length;

    const ehPadraoDoDocumento =
        clausulas.length >= MINIMO_DE_CLAUSULAS &&
        quantas / clausulas.length >= PROPORCAO_MINIMA;

    if (ehPadraoDoDocumento) return partidas;
    return clausulas.map((corpo) => ({ abertura: null, corpo }));
};
