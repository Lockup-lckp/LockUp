import React from 'react';
import { tituloDe, prepararClausulas } from '../utils/contrato.js';

// O contrato da instituição, como documento.
//
// Um só, usado em três lugares: o modal do checkout (antes de pagar), o modal
// do portal público e a tela /contrato. A marcação vivia duplicada, e duplicada
// ela diverge no primeiro ajuste de formatação.
//
// A leitura do texto mora em utils/contrato.js — ver o motivo lá (Fast Refresh).

/**
 * @param {object}  props
 * @param {object}  props.escola
 * @param {boolean} [props.comCabecalho]  inclui o cabeçalho do documento.
 *                                        A tela liga; o modal não, porque a
 *                                        moldura dele já traz título e
 *                                        instituição.
 */
export default function DocumentoContrato({ escola, comCabecalho = true }) {
    const clausulas = prepararClausulas(escola);

    if (clausulas.length === 0) {
        // Dizer que não existe é melhor que uma folha em branco, que o aluno
        // leria como falha de carregamento.
        return (
            <p className="lckp-contrato__vazio">
                Esta instituição ainda não cadastrou o contrato de locação.
                Procure a secretaria antes de alugar um armário.
            </p>
        );
    }

    return (
        <article className="lckp-documento">
            {comCabecalho && (
                <header className="lckp-documento__cabecalho">
                    <p className="lckp-documento__selo">Contrato de locação</p>
                    <h2 className="lckp-documento__titulo">{tituloDe(escola)}</h2>
                    {escola?.name && (
                        <p className="lckp-documento__parte">{escola.name}</p>
                    )}
                </header>
            )}

            <ol className="lckp-contrato__lista">
                {clausulas.map(({ abertura, corpo }, i) => (
                    <li key={i}>
                        {abertura && <strong className="lckp-clausula__abertura">{abertura}</strong>}
                        {corpo}
                    </li>
                ))}
            </ol>

            {/* Marca de fim. Num modal com rolagem, sem ela não dá para
                distinguir "acabou" de "não carregou o resto". */}
            <footer className="lckp-documento__fecho">
                <span>{clausulas.length} cláusulas</span>
                {escola?.name && <span>{escola.name}</span>}
            </footer>
        </article>
    );
}
