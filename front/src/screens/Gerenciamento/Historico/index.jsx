import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { checkoutService } from '../../../services/checkoutServices';
import { useEscola } from '../../../theme/EscolaContext.jsx';
import RelatorioAnual from '../../../components/RelatorioAnual.jsx';
import { nomearCorredor } from '../../../utils/rotuloCorredor';

const ITENS_POR_PAGINA = 20;

const formatarMoeda = (valor) => {
  if (valor === null || valor === undefined) return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatarData = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function HistoricoPagamentos() {
  const { schoolCode } = useParams();
  const { escola } = useEscola();
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    if (!schoolCode) return;

    const carregar = async () => {
      try {
        setCarregando(true);
        setErro(null);
        const dados = await checkoutService.buscarHistorico(schoolCode);
        setHistorico(Array.isArray(dados) ? dados : []);
      } catch (err) {
        setErro('Não foi possível carregar o histórico de pagamentos.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [schoolCode]);

  // O ciclo letivo da locação, não o ano em que ela foi paga. Uma compra feita
  // em janeiro pertence ao ciclo anterior, então agrupar pela data daria
  // relatório errado. Locações anteriores à migração de 2026-08-07 não têm
  // `ano_letivo`; para essas, o ano da data é a melhor aproximação disponível.
  const cicloDaLocacao = (item) => {
    if (item.ano_letivo) return Number(item.ano_letivo);
    return item.created_at ? new Date(item.created_at).getFullYear() : null;
  };

  // Anos com pelo menos uma locação (o ano corrente sempre aparece, mesmo vazio)
  const anosDisponiveis = useMemo(() => {
    const anos = new Set([new Date().getFullYear()]);
    historico.forEach((item) => {
      const ciclo = cicloDaLocacao(item);
      if (ciclo) anos.add(ciclo);
    });
    return [...anos].sort((a, b) => b - a);
  }, [historico]);

  const historicoDoAno = useMemo(() => {
    return historico.filter((item) => cicloDaLocacao(item) === anoSelecionado);
  }, [historico, anoSelecionado]);

  // Só locações com valor registrado entram na soma (locações antigas, sem valor salvo, ficam de fora).
  // Estornos entram com valor negativo, entao esta soma ja e o LIQUIDO:
  // o que a escola cobrou menos o que devolveu.
  const saldoAnual = historicoDoAno.reduce((total, item) => total + (Number(item.valor) || 0), 0);
  const totalDevolvido = historicoDoAno
    .filter((i) => i.estorno)
    .reduce((total, i) => total + Math.abs(Number(i.valor) || 0), 0);
  const quantidadeSemValor = historicoDoAno.filter((item) => item.valor === null || item.valor === undefined).length;

  const totalPaginas = Math.ceil(historicoDoAno.length / ITENS_POR_PAGINA) || 1;
  const historicoPaginado = historicoDoAno.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA
  );

  const handleMudarAno = (ano) => {
    setAnoSelecionado(ano);
    setPaginaAtual(1);
  };

  if (carregando) {
    return (
      <div className="p-6 text-center text-[var(--primary-color)] font-medium bg-[var(--bg-color)] min-h-screen flex items-center justify-center">
        Carregando histórico de pagamentos...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-[var(--bg-color)] min-h-screen text-white font-sans">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--primary-color)] font-display">Histórico de Pagamentos</h1>
          <p className="text-xs text-gray-400 mt-1">Locações pagas e aprovadas da instituição, por ciclo letivo.</p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="ano-relatorio" className="text-xs text-gray-400">Ciclo:</label>
          <select
            id="ano-relatorio"
            value={anoSelecionado}
            onChange={(e) => handleMudarAno(Number(e.target.value))}
            className="px-3 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl text-sm text-white outline-none focus:border-[var(--primary-color)] transition-colors"
          >
            {anosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>

          {/* Imprime o relatório do ano escolhido. O navegador oferece "Salvar
              como PDF" no próprio diálogo, então não carregamos biblioteca de
              PDF só para isso. */}
          <button
            type="button"
            onClick={() => window.print()}
            disabled={historicoDoAno.length === 0}
            title={historicoDoAno.length === 0
              ? `Nenhuma locação paga em ${anoSelecionado} para exportar`
              : `Exportar o relatório de ${anoSelecionado} em PDF`}
            className="lckp-btn text-sm"
            style={{ padding: '0.55rem 1.1rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M8 11l4 4 4-4" />
              <path d="M4 19h16" />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-sm">
          ⚠️ {erro}
        </div>
      )}

      {/* Saldo do ano selecionado */}
      <div className="bg-[var(--surface-color)]/60 border border-[var(--primary-color)]/30 rounded-xl p-6 mb-6">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Saldo de {anoSelecionado}</span>
        <p className="text-3xl font-bold text-[var(--primary-color)] font-display mt-1">{formatarMoeda(saldoAnual)}</p>
        <p className="text-xs text-gray-500 mt-2">
          {historicoDoAno.length} lançamento{historicoDoAno.length === 1 ? '' : 's'} neste ciclo
          {totalDevolvido > 0 && ` · ${formatarMoeda(totalDevolvido)} devolvido em estornos`}
          {quantidadeSemValor > 0 && ` (${quantidadeSemValor} sem valor registrado, não somada aqui)`}
        </p>
      </div>

      <div className="overflow-x-auto w-full border border-[#1f2635] bg-[var(--surface-color)]/60 rounded-xl backdrop-blur-md">
        <table className="w-full text-left border-collapse min-w-150 lckp-tabela-cartao">
          <thead>
            <tr className="border-b border-[#1f2635] bg-[#161b26] text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="p-4">Data</th>
              <th className="p-4">Armário</th>
              <th className="p-4">Aluno</th>
              <th className="p-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2635] text-sm text-gray-300">
            {historicoPaginado.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">
                  Nenhuma locação paga encontrada em {anoSelecionado}.
                </td>
              </tr>
            ) : (
              historicoPaginado.map((item) => (
                <tr key={item.id} className="hover:bg-[#161b26]/40 transition-colors">
                  <td data-label="Data" className="p-4 whitespace-nowrap">{formatarData(item.created_at)}</td>
                  <td data-label="Armário" className="p-4 whitespace-nowrap">
                    {item.locker_nome ? `${item.locker_nome} (${nomearCorredor(escola, item.locker_corredor)})` : '—'}
                  </td>
                  <td data-label="Aluno" className="p-4 whitespace-nowrap">
                    {item.aluno_nome || '—'}
                    {/* Distingue o que passou pelo balcão do que entrou pelo
                        gateway: os dois somam no faturamento, mas só um tem
                        comprovante no extrato bancário da escola. */}
                    {item.estorno && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Devolução
                      </span>
                    )}
                    {!item.estorno && item.origem === 'presencial' && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Secretaria
                      </span>
                    )}
                  </td>
                  <td data-label="Valor" className={`p-4 text-right font-semibold whitespace-nowrap ${item.estorno ? 'text-amber-400' : 'text-white'}`}>{formatarMoeda(item.valor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {historicoDoAno.length > 0 && (
          <div className="p-4 bg-[#161b26] border-t border-[#1f2635] flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-xs text-gray-400 text-center sm:text-left">
              Página <span className="text-[var(--primary-color)] font-bold">{paginaAtual}</span> de {totalPaginas}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                disabled={paginaAtual === 1}
                className="px-3 py-1.5 bg-[var(--surface-color)] border border-[#1f2635] rounded-lg text-xs font-semibold text-gray-300 hover:bg-[#1a2333] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
                disabled={paginaAtual === totalPaginas}
                className="px-3 py-1.5 bg-[var(--surface-color)] border border-[#1f2635] rounded-lg text-xs font-semibold text-gray-300 hover:bg-[#1a2333] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Só existe na impressão. Recebe o ano INTEIRO, não a página atual —
          o relatório da escola não pode sair fatiado em 20 linhas. */}
      <RelatorioAnual
        escola={escola}
        ano={anoSelecionado}
        locacoes={historicoDoAno}
        total={saldoAnual}
      />
    </div>
  );
}
