import { nomearCorredor } from "../utils/rotuloCorredor";
import React from 'react';

// Relatório anual de faturamento, feito para o PAPEL — é o documento que a
// escola leva para a prestação de contas.
//
// Fica oculto na tela e só aparece na impressão (ver a regra @media print em
// index.css). Usar window.print() em vez de uma biblioteca de PDF evita somar
// centenas de KB ao bundle e entrega texto selecionável e nítido em qualquer
// tamanho, porque quem rasteriza é o próprio navegador.

const moeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const data = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function RelatorioAnual({ escola, ano, locacoes, total }) {
  const emitidoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Quebra por mês: é o recorte que a coordenação usa para conferir sazonalidade
  // (início de ano concentra locação).
  const porMes = MESES.map((nome, i) => {
    const doMes = locacoes.filter((l) => l.created_at && new Date(l.created_at).getMonth() === i);
    return { nome, qtd: doMes.length, soma: doMes.reduce((s, l) => s + (Number(l.valor) || 0), 0) };
  }).filter((m) => m.qtd > 0);

  return (
    <div id="relatorio-anual" aria-hidden="true">
      <header className="rel-topo">
        <div className="rel-marca">
          <svg viewBox="0 0 100 110" width="44" height="48" aria-hidden="true">
            <rect x="14" y="6" width="46" height="82" rx="4" fill="none" stroke="#0A1F44" strokeWidth="6" />
            <path d="M24 24h26M24 34h26" stroke="#0A1F44" strokeWidth="5" strokeLinecap="round" />
            <path d="M20 88l-5 11M54 88l5 11" stroke="#0A1F44" strokeWidth="6" strokeLinecap="round" />
            <circle cx="27" cy="54" r="4.5" fill="#0A1F44" />
            <rect x="25" y="50" width="52" height="8" rx="2" fill="#EE9B2E" />
            <rect x="37" y="58" width="6" height="8" rx="1.5" fill="#EE9B2E" />
            <rect x="47" y="58" width="6" height="8" rx="1.5" fill="#EE9B2E" />
            <circle cx="84" cy="54" r="9" fill="none" stroke="#EE9B2E" strokeWidth="8" />
          </svg>
          <div>
            <strong>LCKP</strong>
            <span>LockUp · Locação de Armários Escolares</span>
          </div>
        </div>
        <div className="rel-emissao">
          <span>Emitido em</span>
          <strong>{emitidoEm}</strong>
        </div>
      </header>

      <h1 className="rel-titulo">Relatório de faturamento · {ano}</h1>
      <p className="rel-escola">{escola?.name || 'Instituição'}</p>

      <section className="rel-resumo">
        <div>
          <span>Total arrecadado</span>
          <strong className="rel-total">{moeda(total)}</strong>
        </div>
        <div>
          <span>Locações pagas</span>
          <strong>{locacoes.length}</strong>
        </div>
        <div>
          <span>Ticket médio</span>
          <strong>{moeda(locacoes.length ? total / locacoes.length : 0)}</strong>
        </div>
      </section>

      {porMes.length > 0 && (
        <>
          <h2 className="rel-sub">Resumo por mês</h2>
          <table className="rel-tabela">
            <thead>
              <tr><th>Mês</th><th className="num">Locações</th><th className="num">Valor</th></tr>
            </thead>
            <tbody>
              {porMes.map((m) => (
                <tr key={m.nome}>
                  <td>{m.nome}</td>
                  <td className="num">{m.qtd}</td>
                  <td className="num">{moeda(m.soma)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td>Total</td><td className="num">{locacoes.length}</td><td className="num">{moeda(total)}</td></tr>
            </tfoot>
          </table>
        </>
      )}

      <h2 className="rel-sub">Locações detalhadas</h2>
      <table className="rel-tabela">
        <thead>
          <tr><th>Data</th><th>Armário</th><th>Aluno</th><th className="num">Valor</th></tr>
        </thead>
        <tbody>
          {locacoes.length === 0 ? (
            <tr><td colSpan="4">Nenhuma locação paga registrada em {ano}.</td></tr>
          ) : (
            locacoes.map((l) => (
              <tr key={l.id}>
                <td>{data(l.created_at)}</td>
                <td>{l.locker_nome ? `${l.locker_nome} (${nomearCorredor(escola, l.locker_corredor)})` : '—'}</td>
                <td>{l.aluno_nome || '—'}</td>
                <td className="num">{moeda(l.valor)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <footer className="rel-rodape">
        Documento gerado automaticamente pelo LCKP a partir das locações com pagamento aprovado.
        Os valores correspondem ao que foi efetivamente pago pelos alunos no período.
      </footer>
    </div>
  );
}
