import React, { useEffect, useRef } from 'react';
import { useTravarScroll } from '../utils/travarScroll';
import { nomearCorredor, rotuloCorredor } from '../utils/rotuloCorredor';

// Diálogo de confirmação do armário selecionado pelo aluno.
// Substitui a antiga sidebar de detalhes da Home: em telas pequenas a sidebar
// ficava abaixo da matriz e passava despercebida, e o aluno não tinha um passo
// claro de confirmação antes do checkout.
//
// Fechar SEMPRE desmarca o armário — é o caminho de "quero escolher outro".
export default function ModalArmario({ armario, escola, valorArmario, atingiuLimite, limiteArmarios = 1, aoFechar, aoConfirmar }) {
  // Congela o fundo, mas SO quando ha armario: este componente fica sempre
  // montado e devolve null sem selecao — travar incondicionalmente prenderia
  // a rolagem da pagina inteira.
  useTravarScroll(Boolean(armario));

  const caixaRef = useRef(null);

  useEffect(() => {
    if (!armario) return;

    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') {
        aoFechar();
        return;
      }
      if (evento.key !== 'Tab') return;

      // Prende o Tab dentro do diálogo enquanto ele estiver aberto.
      const focaveis = caixaRef.current?.querySelectorAll('button, [href], input, select, textarea');
      if (!focaveis?.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    caixaRef.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [armario, aoFechar]);

  if (!armario) return null;

  const preco = Number(valorArmario || 0).toFixed(2).replace('.', ',');

  return (
    <div className="lckp-modal__backdrop" onClick={aoFechar} role="presentation">
      <div
        ref={caixaRef}
        className="lckp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-armario"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="modal-armario__topo">
          <div>
            <span className="lckp-label">Armário selecionado</span>
            <h3 id="titulo-modal-armario" className="modal-armario__titulo">{armario.nome}</h3>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar e desmarcar o armário"
            className="lckp-btn lckp-btn--ghost modal-armario__fechar"
          >
            ✕
          </button>
        </header>

        <div className="modal-armario__corpo">
          <div className="modal-armario__linha">
            <span>{rotuloCorredor(escola)}</span>
            <strong>{nomearCorredor(escola, armario.corredor)}</strong>
          </div>
          <div className="modal-armario__linha">
            <span>Valor</span>
            <strong className="modal-armario__preco">R$ {preco}</strong>
          </div>

          {atingiuLimite ? (
            <>
              <p className="lckp-chip lckp-chip--danger modal-armario__aviso">
                {limiteArmarios === 1
                  ? 'Você já possui uma locação ativa. Limite de 1 armário por aluno.'
                  : `Você já atingiu o limite de ${limiteArmarios} armários por aluno.`}
              </p>
              {/* Sem "escolher outro": quem chegou ao limite não pode alugar
                  nenhum, então oferecer a troca seria prometer o que a regra
                  não permite. Resta apenas sair. */}
              <button type="button" onClick={aoFechar} className="lckp-btn lckp-btn--ghost modal-armario__acao">
                Fechar
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={aoConfirmar} className="lckp-btn modal-armario__acao">
                Ir para o checkout
              </button>
              <button type="button" onClick={aoFechar} className="lckp-btn lckp-btn--ghost modal-armario__acao">
                Escolher outro armário
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
