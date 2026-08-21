import React from 'react';
import { useEscola } from '../../theme/contextoEscola.js';
import Carregando from '../../components/Carregando.jsx';

// Contrato de locação da instituição, como tela própria.
//
// Antes só existia em modal — aberto no checkout, antes de pagar, e por um
// botão dentro de Meu Armário. Modal serve para interromper uma tarefa; ler um
// contrato de dez cláusulas não é interrupção, é leitura. Além disso o modal
// não tem endereço: o aluno não conseguia guardar o link, voltar depois, nem
// mandar para alguém.
//
// O texto continua vindo de `schools.contrato_texto`, uma cláusula por linha,
// editado pela escola em Configurações. Esta tela não tem cópia de nada.

export default function Contrato() {
    const { escola, carregando } = useEscola();

    if (carregando) {
        return <Carregando tela rotulo="Carregando contrato" />;
    }

    const clausulas = (escola?.contrato_texto || '')
        .split('\n')
        .map((linha) => linha.trim())
        .filter(Boolean);

    const titulo = escola?.contrato_titulo || 'Contrato de locação de armário';

    return (
        <div className="max-w-3xl mx-auto">
            <header className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--primary-color)] font-display text-balance">
                    {titulo}
                </h1>
                {escola?.name && (
                    <p className="text-xs uppercase tracking-wider text-[var(--on-bg-muted)] mt-1">
                        {escola.name}
                    </p>
                )}
            </header>

            <div className="lckp-card p-6 sm:p-8">
                {clausulas.length === 0 ? (
                    // Dizer que não há contrato é melhor que uma página em branco,
                    // que o aluno leria como falha de carregamento.
                    <p className="text-[var(--on-bg-muted)] leading-relaxed">
                        Esta instituição ainda não cadastrou o contrato de locação.
                        Procure a secretaria antes de alugar um armário.
                    </p>
                ) : (
                    // Lista numerada: as cláusulas são citadas por número em conversa
                    // com a secretaria ("a cláusula 7 diz..."), e sem número não há
                    // como apontar qual.
                    <ol className="lckp-contrato__lista">
                        {clausulas.map((clausula, i) => (
                            <li key={i}>{clausula}</li>
                        ))}
                    </ol>
                )}
            </div>

            {clausulas.length > 0 && (
                <p className="text-xs text-[var(--on-bg-muted)] mt-4 leading-relaxed">
                    Estas são as condições que você aceitou ao alugar o armário. Em caso de
                    dúvida, procure a secretaria da {escola?.name || 'instituição'}.
                </p>
            )}
        </div>
    );
}
