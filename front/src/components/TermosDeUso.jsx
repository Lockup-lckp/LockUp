import React, { useEffect, useRef } from 'react';
import { useTravarScroll } from '../utils/travarScroll';

// Contrato de locação da instituição, exibido no checkout antes do pagamento.
//
// Mostra APENAS o contrato da escola. Antes havia também um termo de uso
// genérico que eu tinha escrito para a plataforma, e os dois juntos diziam a
// mesma coisa de formas diferentes — cadeado, itens proibidos, prazo. Onde dois
// textos tratam do mesmo assunto, um acaba contradizendo o outro; e quem
// responde pela locação é a escola (na ETEC, a APM), não a LCKP.
//
// O texto vem de `schools.contrato_texto`, uma cláusula por linha.

export default function ModalTermos({ escola, aoFechar }) {
  // Congela o fundo: sem isso a rolagem atravessa o dialogo.
  useTravarScroll();

  const caixaRef = useRef(null);

  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    caixaRef.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  const clausulas = (escola?.contrato_texto || '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean);

  const titulo = escola?.contrato_titulo || 'Contrato de locação de armário';

  return (
    <div className="lckp-modal__backdrop" onClick={aoFechar} role="presentation">
      <div
        ref={caixaRef}
        className="lckp-modal lckp-modal--largo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-contrato"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="lckp-contrato__topo">
          <div>
            <h3 id="titulo-contrato" className="lckp-contrato__titulo">{titulo}</h3>
            {escola?.name && <p className="lckp-contrato__escola">{escola.name}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar o contrato"
            className="lckp-btn lckp-btn--ghost lckp-contrato__fechar"
          >
            ✕
          </button>
        </header>

        <div className="lckp-contrato__corpo">
          {clausulas.length === 0 ? (
            // Escola sem contrato cadastrado. Dizer isso é melhor que abrir uma
            // caixa vazia, que o aluno leria como falha de carregamento.
            <p className="lckp-contrato__vazio">
              Esta instituição ainda não cadastrou o contrato de locação.
              Procure a secretaria antes de concluir a compra.
            </p>
          ) : (
            // Lista numerada: as cláusulas são referenciadas em conversa com a
            // secretaria ("a cláusula 7 diz..."), e sem número não há como
            // apontar qual.
            <ol className="lckp-contrato__lista">
              {clausulas.map((clausula, i) => (
                <li key={i}>{clausula}</li>
              ))}
            </ol>
          )}
        </div>

        <footer className="lckp-contrato__rodape">
          <button type="button" onClick={aoFechar} className="lckp-btn">Entendi</button>
        </footer>
      </div>
    </div>
  );
}
