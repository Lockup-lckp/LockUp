import React, { useEffect, useMemo, useState } from 'react';
import { nomearCorredor, rotuloCorredor, rotuloCorredorPlural } from '../utils/rotuloCorredor';

// Diálogo do ocupante de um armário: transferir para outro, ou remover.
//
// Substituiu o antigo botão "Remover", que fazia a coisa errada por padrão:
// desvincular deixa o armário livre, mas o aluno pagou — e a escola quase
// sempre quer MOVER, não tirar. Agora a troca é o caminho principal, e remover
// exige dizer o que acontece com o dinheiro.

export default function ModalTrocarArmario({
  armario,               // armário de origem, com ocupante
  escola,
  armariosDisponiveis,
  ocupado,               // true quando é aluno pagante; funcionário não tem locação
  aoFechar,
  aoTrocar,              // (novoArmarioId) => Promise
  aoRemover              // (excluirPagamento) => Promise
}) {
  const [aba, setAba] = useState('trocar');
  const [destino, setDestino] = useState('');
  const [filtroCorredor, setFiltroCorredor] = useState('');
  const [excluirPagamento, setExcluirPagamento] = useState(false);
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

  // Com centenas de armários livres, a lista inteira é inútil: o admin sabe
  // para qual corredor quer mover, não para qual dos 300 números.
  const candidatos = useMemo(() => {
    const lista = filtroCorredor
      ? armariosDisponiveis.filter((a) => a.corredor === filtroCorredor)
      : armariosDisponiveis;
    return [...lista].sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), 'pt-BR', { numeric: true })
    );
  }, [armariosDisponiveis, filtroCorredor]);

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

  return (
    <div className="lckp-modal__backdrop" onClick={() => !processando && aoFechar()} role="presentation">
      <div
        className="lckp-modal lckp-modal--largo"
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
            Remover do armário
          </button>
        </div>

        <div className="lckp-contrato__corpo">
          {erro && <p className="lckp-chip lckp-chip--danger" style={{ marginBottom: '1rem' }}>{erro}</p>}

          {aba === 'trocar' ? (
            <>
              <p className="lckp-troca__intro">
                O ocupante passa para o armário escolhido, e o pagamento vai
                junto — o histórico continua apontando para a mesma pessoa.
              </p>

              {armariosDisponiveis.length === 0 ? (
                <p className="lckp-chip lckp-chip--danger">
                  Não há armários disponíveis nesta instituição para receber a transferência.
                </p>
              ) : (
                <>
                  <label className="lckp-label" htmlFor="filtro-corredor-troca">
                    Filtrar por {rotuloCorredor(escola).toLowerCase()}
                  </label>
                  <select
                    id="filtro-corredor-troca"
                    className="lckp-input"
                    value={filtroCorredor}
                    onChange={(e) => { setFiltroCorredor(e.target.value); setDestino(''); }}
                  >
                    <option value="">Todos os {rotuloCorredorPlural(escola)}</option>
                    {corredores.map((c) => (
                      <option key={c} value={c}>{nomearCorredor(escola, c)}</option>
                    ))}
                  </select>

                  <p className="lckp-troca__contagem">
                    {candidatos.length} armário{candidatos.length === 1 ? '' : 's'} disponível{candidatos.length === 1 ? '' : 'eis'}
                  </p>

                  <div className="lckp-troca__grade" role="radiogroup" aria-label="Armário de destino">
                    {candidatos.map((a) => (
                      <button
                        type="button"
                        key={a.id}
                        role="radio"
                        aria-checked={destino === a.id}
                        onClick={() => setDestino(a.id)}
                        className={`lckp-troca__opcao ${destino === a.id ? 'lckp-troca__opcao--ativa' : ''}`}
                      >
                        <strong>{a.nome}</strong>
                        <span>{nomearCorredor(escola, a.corredor)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p className="lckp-troca__intro">
                O armário volta a ficar disponível. Escolha o que acontece com o
                pagamento deste aluno.
              </p>

              {/* O padrão é MANTER, e de propósito: `rentals` é o extrato da
                  escola. Sumir dali significa sumir do relatório anual. */}
              <label className={`lckp-troca__escolha ${!excluirPagamento ? 'lckp-troca__escolha--ativa' : ''}`}>
                <input
                  type="radio"
                  name="destino-pagamento"
                  checked={!excluirPagamento}
                  onChange={() => setExcluirPagamento(false)}
                />
                <span>
                  <strong>Manter o pagamento no histórico</strong>
                  A locação continua no extrato e no relatório anual. O aluno pagou, e o registro disso permanece.
                </span>
              </label>

              <label className={`lckp-troca__escolha ${excluirPagamento ? 'lckp-troca__escolha--perigo' : ''}`}>
                <input
                  type="radio"
                  name="destino-pagamento"
                  checked={excluirPagamento}
                  onChange={() => setExcluirPagamento(true)}
                />
                <span>
                  <strong>Excluir o pagamento do histórico</strong>
                  A locação é apagada e o valor sai do faturamento do ciclo. Use apenas quando o lançamento foi um erro — cobrança de teste ou aluno errado.
                </span>
              </label>

              {excluirPagamento && (
                <p className="lckp-chip lckp-chip--danger lckp-troca__aviso">
                  Esta exclusão não pode ser desfeita.
                </p>
              )}

              {!ocupado && (
                <p className="lckp-troca__nota">
                  Este armário está atribuído a um funcionário e não possui
                  pagamento vinculado — a escolha acima não terá efeito.
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
              {processando ? 'Transferindo...' : 'Transferir ocupante'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => executar(() => aoRemover(excluirPagamento))}
              disabled={processando}
              className={`lckp-btn ${excluirPagamento ? 'lckp-btn--danger' : ''}`}
            >
              {processando
                ? 'Removendo...'
                : excluirPagamento ? 'Remover e excluir pagamento' : 'Remover ocupante'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
