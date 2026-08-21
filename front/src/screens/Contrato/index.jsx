import React from 'react';
import { useEscola } from '../../theme/contextoEscola.js';
import Carregando from '../../components/Carregando.jsx';
import DocumentoContrato from '../../components/DocumentoContrato.jsx';
import { clausulasDe } from '../../utils/contrato.js';

// Contrato de locação da instituição, como tela própria.
//
// Antes só existia em modal — aberto no checkout, antes de pagar, e por um
// botão dentro de Meu Armário. Modal serve para interromper uma tarefa; ler um
// contrato de vinte cláusulas não é interrupção, é leitura. Além disso o modal
// não tem endereço: o aluno não conseguia guardar o link, voltar depois, nem
// mandar para alguém.
//
// O conteúdo vive em DocumentoContrato, o mesmo que o modal usa.

export default function Contrato() {
    const { escola, carregando } = useEscola();

    if (carregando) {
        return <Carregando tela rotulo="Carregando contrato" />;
    }

    const temClausulas = clausulasDe(escola).length > 0;

    return (
        <div className="lckp-card max-w-3xl mx-auto p-6 sm:p-10">
            <DocumentoContrato escola={escola} />

            {temClausulas && (
                <p className="text-xs text-[var(--on-bg-muted)] mt-6 leading-relaxed">
                    Estas são as condições que você aceitou ao alugar o armário. Em caso de
                    dúvida, procure a secretaria da {escola?.name || 'instituição'}.
                </p>
            )}
        </div>
    );
}
