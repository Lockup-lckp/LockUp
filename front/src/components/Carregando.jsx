import React from 'react';
import './Carregando.css';

// Indicador de carregamento do sistema.
//
// Substituiu os textos soltos ("Validando URL da instituição de ensino...",
// "Carregando painel de gerenciamento de armários...") que cada tela repetia à
// sua maneira. Texto de espera envelhece mal: descreve o que o sistema faz por
// dentro, que é justamente o que não interessa a quem está esperando.
//
// `rotulo` não aparece na tela — vai para leitor de tela. Quem enxerga vê o
// movimento; quem não enxerga precisa da palavra.

function Anel() {
    return (
        <svg className="carregando-anel" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle className="carregando-anel__trilha" cx="20" cy="20" r="16" strokeWidth="3" />
            <path className="carregando-anel__arco" d="M20 4a16 16 0 0 1 16 16" strokeWidth="3" fill="none" />
        </svg>
    );
}

/**
 * @param {object}  props
 * @param {boolean} [props.tela]    ocupa a altura toda, com o fundo da marca
 * @param {boolean} [props.linha]   compacto, para dentro de painel ou tabela
 * @param {string}  [props.rotulo]  texto para leitor de tela
 */
export default function Carregando({ tela = false, linha = false, rotulo = 'Carregando' }) {
    const variacao = tela ? ' carregando-caixa--tela' : (linha ? ' carregando-caixa--linha' : '');

    return (
        <div
            className={`carregando-caixa${variacao}`}
            role="status"
            aria-live="polite"
        >
            <Anel />
            {/* Só para leitor de tela. A classe sr-only vem do Tailwind. */}
            <span className="sr-only">{rotulo}</span>
        </div>
    );
}
