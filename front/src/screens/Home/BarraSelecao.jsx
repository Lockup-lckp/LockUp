export default function BarraSelecao({ armario, corredorNome, local, aoAlugar }) {
  return (
    <div className="mapa-selecao">
      <div className="mapa-selecao__texto">
        <strong>Armário {armario.nome}</strong>
        <span>{corredorNome} · {local}</span>
      </div>
      <button type="button" className="mapa-selecao__alugar" onClick={aoAlugar}>
        Alugar
      </button>
    </div>
  );
}
