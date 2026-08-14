import React, { useEffect, useMemo, useState } from 'react';
import { nomearCorredor, rotuloCorredor } from '../utils/rotuloCorredor';

// Diálogo do ocupante de um armário: transferir para outro, ou remover.
//
// Substituiu o antigo botão "Remover", que fazia a coisa errada por padrão:
// desvincular deixa o armário livre, mas o aluno pagou — a escola quase sempre
// quer MOVER, não tirar.
//
// A escolha do destino é por DOIS SELETORES em cascata, e não por uma grade de
// botões: com centenas de armários a grade virava uma parede de números que o
// admin tinha de percorrer com o olho. Aqui ele escolhe o corredor que já tinha
// em mente e depois o número.
//
// Remover NÃO apaga o histórico. Se houve devolução do dinheiro, o sistema
// lança um estorno — uma linha de valor negativo apontando para a cobrança
// original. Apagar esconderia que houve movimento; estornar registra que houve
// cobrança e devolução.

export default function ModalTrocarArmario({
  armario,               // armário de origem, com ocupante
  escola,
  armariosDisponiveis,
  ocupado,               // true quando é aluno pagante; funcionário não tem locação
  aoFechar,
  aoTrocar,              // (novoArmarioId) => Promise
  aoRemover              // (registrarEstorno) => Promise
}) {
  const [aba, setAba] = useState('trocar');
  const [corredorDestino, setCorredorDestino] = useState('');
  const [destino, setDestino] = useState('');
  const [registrarEstorno, setRegistrarEstorno] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape' && !processando) aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar, processando]);

  const corredores = useMemo(() => {
    const lista = [...new Set(armariosDisponiveis.map((a) => a.corredor).filter(Boolean))];
    return lista.sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));
  }, [armariosDisponiveis]);

  const candidatos = useMemo(() => {
    if (!corredorDestino) return [];
    return armariosDisponiveis
      .filter((a) => a.corredor === corredorDestino)
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR', { numeric: true }));
  }, [armariosDisponiveis, corredorDestino]);

  if (!armario) return null;

  const executar = async (acao) => {
    setErro(null);
    setProcessando(true);
    try {
      await acao();
    } catch (e) {
      setErro(e.message || 'Não foi possível concluir a operação.');
    } finally {
      setProcessando(false);
    }
  };

  const nomeOcupante = armario.usuarioNome || armario.usuario_nome || 'Ocupante';
  const rotulo = rotuloCorredor(escola).toLowerCase();

  return (
    <div className="lckp-modal__backdrop" onClick={() => !processando && aoFechar()} role="presentation">
      <div
        className="lckp-modal lckp-modal--medio"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-trocar"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lckp-contrato__topo">
          <div>
            <h3 id="titulo-trocar" className="lckp-contrato__titulo">Armário {armario.nome}</h3>
            <p className="lckp-contrato__escola">
              {nomearCorredor(escola, armario.corredor)} · {nomeOcupante}
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={processando}
            aria-label="Fechar"
            className="lckp-btn lckp-btn--ghost lckp-contrato__fechar"
          >
            ✕
          </button>
        </header>

        <div className="lckp-abas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'trocar'}
            onClick={() => setAba('trocar')}
            className={`lckp-aba ${aba === 'trocar' ? 'lckp-aba--ativa' : ''}`}
          >
            Trocar de armário
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'remover'}
            onClick={() => setAba('remover')}
            className={`lckp-aba ${aba === 'remover' ? 'lckp-aba--ativa' : ''}`}
          >
            Remover
          </button>
        </div>

        <div className="lckp-troca__corpo">
          {erro && <p className="lckp-chip lckp-chip--danger lckp-troca__erro">{erro}</p>}

          {aba === 'trocar' ? (
            armariosDisponiveis.length === 0 ? (
              <p className="lckp-chip lckp-chip--danger">
                Não há armários disponíveis para receber a transferência.
              </p>
            ) : (
              <>
                <p className="lckp-troca__intro">
                  O ocupante e o pagamento passam para o armário escolhido.
                </p>

                <label className="lckp-label" htmlFor="corredor-destino">{rotuloCorredor(escola)}</label>
                <select
                  id="corredor-destino"
                  className="lckp-input"
                  value={corredorDestino}
                  onChange={(e) => { setCorredorDestino(e.target.value); setDestino(''); }}
                >
                  <option value="">Selecione o {rotulo}</option>
                  {corredores.map((c) => (
                    <option key={c} value={c}>
                      {nomearCorredor(escola, c)} — {armariosDisponiveis.filter((a) => a.corredor === c).length} livres
                    </option>
                  ))}
                </select>

                <label className="lckp-label lckp-troca__espaco" htmlFor="armario-destino">Armário</label>
                <select
                  id="armario-destino"
                  className="lckp-input"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  disabled={!corredorDestino}
                >
                  <option value="">
                    {corredorDestino ? 'Selecione o armário' : `Escolha o ${rotulo} primeiro`}
                  </option>
                  {candidatos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </>
            )
          ) : (
            <>
              <p className="lckp-troca__intro">
                O armário volta a ficar disponível. O pagamento continua no
                histórico — o que muda é se houve devolução do valor.
              </p>

              {ocupado ? (
                <>
                  <label className={`lckp-troca__escolha ${!registrarEstorno ? 'lckp-troca__escolha--ativa' : ''}`}>
                    <input
                      type="radio"
                      name="devolucao"
                      checked={!registrarEstorno}
                      onChange={() => setRegistrarEstorno(false)}
                    />
                    <span>
                      <strong>Sem devolução</strong>
                      O valor fica com a instituição. É o caso do encerramento por
                      descumprimento do contrato.
                    </span>
                  </label>

                  <label className={`lckp-troca__escolha ${registrarEstorno ? 'lckp-troca__escolha--ativa' : ''}`}>
                    <input
                      type="radio"
                      name="devolucao"
                      checked={registrarEstorno}
                      onChange={() => setRegistrarEstorno(true)}
                    />
                    <span>
                      <strong>Registrar devolução</strong>
                      Lança um estorno no histórico, com valor negativo, e o
                      faturamento do ciclo cai nesse valor.
                    </span>
                  </label>
                </>
              ) : (
                <p className="lckp-troca__nota">
                  Armário de funcionário: não há pagamento vinculado, então não
                  existe devolução a registrar.
                </p>
              )}
            </>
          )}
        </div>

        <footer className="lckp-contrato__rodape lckp-troca__rodape">
          <button type="button" onClick={aoFechar} disabled={processando} className="lckp-btn lckp-btn--ghost">
            Cancelar
          </button>

          {aba === 'trocar' ? (
            <button
              type="button"
              onClick={() => executar(() => aoTrocar(destino))}
              disabled={processando || !destino}
              className="lckp-btn"
            >
              {processando ? 'Transferindo...' : 'Transferir'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => executar(() => aoRemover(ocupado && registrarEstorno))}
              disabled={processando}
              className="lckp-btn"
            >
              {processando
                ? 'Removendo...'
                : registrarEstorno && ocupado ? 'Remover e devolver' : 'Remover'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
