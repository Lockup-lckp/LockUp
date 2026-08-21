import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Impede sair de um formulário com alteração não salva.
//
// POR QUE NÃO É useBlocker. O `useBlocker` do React Router faria isto em três
// linhas, mas ele exige um data router (createBrowserRouter). O sistema usa
// <BrowserRouter>, e trocar o roteador inteiro para ganhar um diálogo poria em
// risco a navegação de todas as telas.
//
// Então o bloqueio é feito na origem da navegação. São três saídas, e cada uma
// tem um mecanismo próprio:
//
//   1. Clique num link interno (barra lateral, logo da navbar). Interceptado na
//      fase de CAPTURA, antes de o React Router ver o evento.
//   2. Botão "voltar" do navegador. Só existe popstate, e quando ele dispara a
//      navegação já aconteceu — a única saída é empurrar a entrada de volta.
//   3. Fechar a aba, recarregar, digitar outro endereço. Aí só há
//      beforeunload, e quem desenha a caixa é o NAVEGADOR: texto fixo, não
//      customizável. Tentar personalizar é perder tempo — foi removido dos
//      navegadores porque sites abusavam.
//
// A interface devolvida é a mesma do useBlocker (state/proceed/reset), para a
// tela não precisar saber de nada disso.

const VOLTAR = Symbol('voltar');

/**
 * @param {boolean} temAlteracao  há mudança pendente de salvar
 * @returns {{state: 'blocked'|'unblocked', proceed: () => void, reset: () => void}}
 */
export function useAvisoDeSaida(temAlteracao) {
    const navigate = useNavigate();
    const [destino, setDestino] = useState(null);

    // Em ref porque os ouvintes são registrados uma vez e leem o valor atual;
    // sem isto eles enxergariam o `temAlteracao` da renderização em que foram
    // criados, e o aviso pararia de funcionar depois da primeira edição.
    //
    // A escrita acontece em efeito, não durante a renderização: mexer em ref
    // no corpo do componente quebra a promessa do modo concorrente do React,
    // em que uma renderização pode ser descartada.
    const pendente = useRef(temAlteracao);
    useEffect(() => { pendente.current = temAlteracao; }, [temAlteracao]);

    // ── 1. Cliques em links internos ──────────────────────────────────
    useEffect(() => {
        const aoClicar = (evento) => {
            if (!pendente.current) return;
            // Clique com modificador abre em outra aba: esta tela não sai do ar.
            if (evento.defaultPrevented || evento.button !== 0) return;
            if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

            const link = evento.target?.closest?.('a[href]');
            if (!link) return;
            if (link.target && link.target !== '_self') return;
            if (link.hasAttribute('download')) return;

            let url;
            try {
                url = new URL(link.href, window.location.href);
            } catch {
                return;
            }

            // Endereço de fora: quem avisa é o beforeunload.
            if (url.origin !== window.location.origin) return;
            // Âncora na mesma tela (#regras) não é sair.
            if (url.pathname === window.location.pathname) return;

            // Captura + stopPropagation: precisa acontecer ANTES de o React
            // Router tratar o clique, senão a troca de rota já começou.
            evento.preventDefault();
            evento.stopPropagation();
            setDestino(url.pathname + url.search + url.hash);
        };

        document.addEventListener('click', aoClicar, true);
        return () => document.removeEventListener('click', aoClicar, true);
    }, []);

    // ── 2. Botão voltar ───────────────────────────────────────────────
    //
    // popstate avisa DEPOIS que o histórico andou. Empurrar uma entrada
    // equivalente devolve o endereço à barra e segura a pessoa na tela; se ela
    // confirmar a saída, `proceed` desfaz as duas de uma vez.
    useEffect(() => {
        if (!temAlteracao) return undefined;

        window.history.pushState(window.history.state, '');

        const aoVoltar = () => {
            if (!pendente.current) return;
            window.history.pushState(window.history.state, '');
            setDestino(VOLTAR);
        };

        window.addEventListener('popstate', aoVoltar);
        return () => window.removeEventListener('popstate', aoVoltar);
    }, [temAlteracao]);

    // ── 3. Fechar / recarregar ────────────────────────────────────────
    useEffect(() => {
        if (!temAlteracao) return undefined;

        const aoSair = (evento) => {
            // preventDefault é o que liga a caixa do navegador; returnValue
            // existe para os que ainda ignoram o preventDefault.
            evento.preventDefault();
            evento.returnValue = '';
        };

        window.addEventListener('beforeunload', aoSair);
        return () => window.removeEventListener('beforeunload', aoSair);
    }, [temAlteracao]);

    const proceed = useCallback(() => {
        const alvo = destino;
        setDestino(null);
        // Desliga a guarda antes de sair, senão a própria navegação seria
        // interceptada de novo.
        pendente.current = false;

        if (alvo === VOLTAR) {
            // Duas entradas: a que o popstate consumiu e a que empurramos de
            // volta no lugar dela.
            window.history.go(-2);
            return;
        }
        if (alvo) navigate(alvo);
    }, [destino, navigate]);

    const reset = useCallback(() => setDestino(null), []);

    return { state: destino ? 'blocked' : 'unblocked', proceed, reset };
}
