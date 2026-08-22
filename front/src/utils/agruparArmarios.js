// Como a fileira de armários do corredor vira "módulos" na tela.
//
// O banco não sabe o que é um módulo: `lockers` guarda só `corredor` e `nome`.
// Mas na parede os armários vêm em blocos separados — um bloco ao lado de uma
// porta, outro alguns metros adiante. O que separa um bloco do outro é o SALTO
// NA NUMERAÇÃO: na ETEC Bento Quirino a parede tem 085–096, e o bloco seguinte
// só recomeça em 169. Ninguém instalou os armários 097 a 168 naquele corredor.
//
// Então a regra é: numeração contínua = mesmo módulo; buraco = módulo novo.
// Isso reproduz a divisão física real sem precisar de coluna nova no banco.

// Armários empilham ~4 de altura na parede. Manter as linhas fixas em 4 e
// deixar as COLUNAS crescerem é o que faz o desenho da tela bater com a foto.
const LINHAS_ALVO = 4;

// Um módulo largo demais não cabe em tela nenhuma e deixa de parecer um móvel.
// Corridas maiores que isso são quebradas em módulos consecutivos.
const MAX_COLUNAS = 6;
const MAX_POR_MODULO = LINHAS_ALVO * MAX_COLUNAS;

/**
 * Número do armário, para ordenar e para achar os saltos.
 *
 * `nome` costuma ser "Armário 085", mas já apareceu escrito só como "085" e
 * com sufixo ("085-A"). Pega o primeiro grupo de dígitos e ignora o resto.
 * Sem dígito nenhum devolve null — esse armário não participa da detecção de
 * salto, senão um registro mal cadastrado partiria o corredor ao meio.
 */
export const numeroDoArmario = (armario) => {
    const bruto = String(armario?.nome ?? '');
    const achado = bruto.match(/\d+/);
    return achado ? Number(achado[0]) : null;
};

/**
 * Quantas colunas o módulo usa, mantendo no máximo 4 linhas.
 *
 * 16 armários viram 4x4; 12 viram 3x4; 4 viram 1x4 — que é exatamente o
 * formato estreito dos blocos 577–580 e 585–588 das fotos.
 */
export const colunasDoModulo = (quantidade) =>
    Math.max(1, Math.min(MAX_COLUNAS, Math.ceil(quantidade / LINHAS_ALVO)));

/**
 * Agrupa os armários de UM corredor em módulos.
 *
 * Devolve `[{ id, armarios, colunas, primeiro, ultimo }]`, já na ordem em que
 * o aluno anda pelo corredor.
 *
 * Os armários sem número reconhecível não são descartados: vão para o fim, em
 * módulos próprios. Sumir com armário que existe na parede seria pior do que
 * mostrá-lo fora de ordem.
 */
export const agruparEmModulos = (armariosDoCorredor = []) => {
    const comNumero = [];
    const semNumero = [];

    armariosDoCorredor.forEach((armario) => {
        const numero = numeroDoArmario(armario);
        if (numero === null) semNumero.push(armario);
        else comNumero.push({ armario, numero });
    });

    comNumero.sort((a, b) => a.numero - b.numero);

    const modulos = [];
    let atual = null;

    const fechar = () => {
        if (!atual || !atual.armarios.length) return;
        modulos.push({
            id: `${atual.primeiro}-${atual.ultimo}-${modulos.length}`,
            armarios: atual.armarios,
            colunas: colunasDoModulo(atual.armarios.length),
            primeiro: atual.primeiro,
            ultimo: atual.ultimo
        });
        atual = null;
    };

    comNumero.forEach(({ armario, numero }, indice) => {
        const anterior = indice > 0 ? comNumero[indice - 1].numero : null;
        // Duplicado (dois "Armário 085") não abre módulo novo, mas também não
        // conta como continuidade: trata como o mesmo passo.
        const continua = anterior !== null && (numero === anterior || numero === anterior + 1);
        const cheio = atual && atual.armarios.length >= MAX_POR_MODULO;

        if (!atual || !continua || cheio) {
            fechar();
            atual = { armarios: [], primeiro: numero, ultimo: numero };
        }

        atual.armarios.push(armario);
        atual.ultimo = numero;
    });

    fechar();

    for (let i = 0; i < semNumero.length; i += MAX_POR_MODULO) {
        const fatia = semNumero.slice(i, i + MAX_POR_MODULO);
        modulos.push({
            id: `sem-numero-${i}`,
            armarios: fatia,
            colunas: colunasDoModulo(fatia.length),
            primeiro: null,
            ultimo: null
        });
    }

    return modulos;
};

/**
 * Rótulo curto do módulo ("085 a 096"), usado para o aluno se localizar na
 * parede. Módulo de um armário só não vira "085 a 085".
 */
export const rotuloDoModulo = (modulo) => {
    if (modulo?.primeiro === null || modulo?.primeiro === undefined) return '';
    if (modulo.primeiro === modulo.ultimo) return String(modulo.primeiro);
    return `${modulo.primeiro} a ${modulo.ultimo}`;
};
