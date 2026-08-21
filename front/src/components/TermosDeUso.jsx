import React, { useEffect, useRef } from 'react';
import { useTravarScroll } from '../utils/travarScroll';
import DocumentoContrato from './DocumentoContrato.jsx';
import { tituloDe } from '../utils/contrato.js';

// Contrato de locação da instituição, em caixa modal.
//
// Aberto no checkout, antes do pagamento, e no portal público da escola. Mostra
// APENAS o contrato da instituição. Antes havia também um termo genérico da
// plataforma, e os dois diziam a mesma coisa de formas diferentes — onde dois
// textos tratam do mesmo assunto, um acaba contradizendo o outro. E quem
// responde pela locação é a escola (na ETEC, a APM), não a LCKP.
//
// O conteúdo em si vive em DocumentoContrato, compartilhado com a tela
// /contrato: duplicar a marcação faria as duas divergirem no primeiro ajuste.

export default function ModalTermos({ escola, aoFechar }) {
  // Congela o fundo: sem isso a rolagem atravessa o diálogo.
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
            <h3 id="titulo-contrato" className="lckp-contrato__titulo">{tituloDe(escola)}</h3>
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

        {/* O cabeçalho do documento fica de fora aqui: a moldura do modal já
            traz título e instituição, e repeti-los logo abaixo faria a folha
            começar dizendo duas vezes a mesma coisa. */}
        <div className="lckp-contrato__corpo">
          <DocumentoContrato escola={escola} comCabecalho={false} />
        </div>

        <footer className="lckp-contrato__rodape">
          <button type="button" onClick={aoFechar} className="lckp-btn">Entendi</button>
        </footer>
      </div>
    </div>
  );
}
