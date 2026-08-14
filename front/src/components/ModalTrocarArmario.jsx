import React, { useEffect, useMemo, useState } from 'react';
import { useTravarScroll } from '../utils/travarScroll';
import { nomearCorredor, rotuloCorredor } from '../utils/rotuloCorredor';

// Poucas sugestoes de propria: a lista longa era o problema que este campo
// veio resolver. Quem nao achou nos 6 primeiros digita mais um caractere.
const LIMITE_SUGESTOES = 6;

// Diálogo do ocupante de um armário: transferir para outro, ou remover.
//
// Substituiu o antigo botão "Remover", que fazia a coisa errada por padrão:
// desvincular deixa o armário livre, mas o aluno pagou — a escola quase sempre
// quer MOVER, não tirar.
//
// O destino se escolhe DIGITANDO o número. Antes era uma grade com todos os
// armários livres, depois dois seletores em cascata — os dois obrigavam a
// percorrer centenas de opções com o olho. Quem opera já sabe o número que
// quer; o campo só precisa confirmar que ele está livre.
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
  // Congela o fundo enquanto ha armario em edicao.
  useTravarScroll(Boolean(armario));

  const [aba, setAba] = useState('trocar');
  const [busca, setBusca] = useState('');
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

  // Busca por digitação. Mostra resultado só depois que a pessoa escreve algo:
  // abrir a lista inteira era justamente o que tornava o diálogo pesado.
  const candidatos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];

    return armariosDisponiveis
      .filter((a) => {
        const nome = String(a.nome ?? '').toLowerCase();
        const corredor = String(a.corredor ?? '').toLowerCase();
        return nome.includes(termo) || corredor.includes(termo);
      })
      .sort((a, b) => {
        // Quem COMEÇA com o que foi digitado vem primeiro: quem escreve "10"
        // quer o armário 10 antes do 110.
        const a1 = String(a.nome ?? '').toLowerCase().startsWith(termo);
        const b1 = String(b.nome ?? '').toLowerCase().startsWith(termo);
        if (a1 !== b1) return a1 ? -1 : 1;
        return String(a.nome).localeCompare(String(b.nome), 'pt-BR', { numeric: true });
      })
      .slice(0, LIMITE_SUGESTOES);
  }, [armariosDisponiveis, busca]);

  const totalEncontrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return 0;
    return armariosDisponiveis.filter((a) => {
      const nome = String(a.nome ?? '').toLowerCase();
      const corredor = String(a.corredor ?? '').toLowerCase();
      return nome.includes(termo) || corredor.includes(termo);
    }).length;
  }, [armariosDisponiveis, busca]);

  const escolhido = armariosDisponiveis.find((a) => a.id === destino) || null;

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

                <label className="lckp-label" htmlFor="busca-armario">
                  Número do armário
                </label>
                <input
                  id="busca-armario"
                  type="text"
                  className="lckp-input"
                  placeholder={`Digite o número ou o ${rotulo}`}
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setDestino(''); }}
                  autoComplete="off"
                  autoFocus
                />

                {/* A lista só existe enquanto há busca sem escolha feita: depois
                    de escolher, ela sai da frente e fica só a confirmação. */}
                {busca.trim() && !escolhido && (
                  candidatos.length === 0 ? (
                    <p className="lckp-troca__vazio">
                      Nenhum armário disponível com "{busca.trim()}".
                    </p>
                  ) : (
                    <>
                      <ul className="lckp-troca__sugestoes">
                        {candidatos.map((a) => (
                          <li key={a.id}>
                            <button type="button" onClick={() => setDestino(a.id)}>
                              <strong>{a.nome}</strong>
                              <span>{nomearCorredor(escola, a.corredor)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {totalEncontrados > candidatos.length && (
                        <p className="lckp-troca__vazio">
                          Mais {totalEncontrados - candidatos.length} encontrados. Digite mais para afinar.
                        </p>
                      )}
                    </>
                  )
                )}

                {escolhido && (
                  <div className="lckp-troca__escolhido">
                    <span>
                      Destino: <strong>{escolhido.nome}</strong> · {nomearCorredor(escola, escolhido.corredor)}
                    </span>
                    <button type="button" onClick={() => { setDestino(''); setBusca(''); }}>
                      Trocar
                    </button>
                  </div>
                )}
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
