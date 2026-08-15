// Separa erro que o usuário PODE ver de erro que ele NÃO pode.
//
// O problema que isto resolve: `catch (err) { res.json({ error: err.message }) }`
// devolve ao cliente qualquer coisa que tenha estourado. Quando quem estoura é
// o Supabase, a mensagem carrega nome de tabela, de coluna e de constraint —
// um mapa do banco entregue a quem só mandou um formulário errado.
//
// Mas trocar tudo por "erro interno" também é ruim: some a frase útil que nós
// mesmos escrevemos ("a credencial desta instituição está incompleta"), e o
// admin fica sem saber o que corrigir.
//
// A saída é marcar o que é deliberado. O que nasce de ErroDeNegocio chega ao
// cliente; todo o resto vira mensagem genérica, com o detalhe indo para o log.

export class ErroDeNegocio extends Error {
    /**
     * @param {string} mensagem  Texto que o usuário vai ler. Escreva pensando
     *                           em quem está na tela, não em quem depura.
     * @param {number} status    HTTP. 400 por padrão: quase todo erro de
     *                           negócio é "os dados enviados não servem".
     */
    constructor(mensagem, status = 400) {
        super(mensagem);
        this.name = 'ErroDeNegocio';
        this.status = status;
        // Marca própria: `instanceof` falha entre módulos duplicados (dois
        // node_modules, hot reload), e o custo de errar aqui é vazar detalhe
        // interno. A flag sobrevive a isso.
        this.deNegocio = true;
    }
}

export const ehErroDeNegocio = (err) =>
    Boolean(err && (err.deNegocio === true || err instanceof ErroDeNegocio));

/**
 * Resposta padrão de catch.
 *
 * @param {import('express').Response} res
 * @param {Error} err
 * @param {string} contexto  Aparece no log para localizar a origem.
 *                           Ex.: 'login', 'checkout', 'atualizar escola'.
 * @param {string} [mensagemGenerica]
 */
export const responderErro = (res, err, contexto, mensagemGenerica) => {
    if (ehErroDeNegocio(err)) {
        // Erro previsto: já foi escrito para ser lido. Vai como está, e não
        // polui o log de erro — isto é fluxo normal, não falha do sistema.
        return res.status(err.status || 400).json({ error: err.message });
    }

    // Inesperado. O stack fica no servidor, onde há como investigar.
    console.error(`[LCKP ERROR] ${contexto}:`, err?.message || err);
    if (err?.stack) console.error(err.stack);

    return res.status(500).json({
        error: mensagemGenerica || 'Não foi possível concluir a operação. Tente novamente em instantes.'
    });
};
