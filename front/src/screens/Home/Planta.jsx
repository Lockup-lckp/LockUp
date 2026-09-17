export default function Planta({ planta, corredores, montados, aoEscolher }) {
  const grade = {
    '--colunas-p': planta.colunas_deitada,
    '--linhas-p': planta.linhas_deitada,
    '--colunas-r': planta.colunas_estreita,
    '--linhas-r': planta.linhas_estreita
  };

  const patio = {
    '--area-p': planta.patio_area_deitada,
    '--area-r': planta.patio_area_estreita,
    '--recuo-p': planta.patio_recuo_deitada || '0px',
    '--recuo-r': planta.patio_recuo_estreita || '0px'
  };

  return (
    <div className="mapa-planta" style={grade}>
      <div className="mapa-patio" style={patio}><span>Pátio</span></div>

      {corredores.map((corredor) => {
        const lay = montados.get(corredor.id);
        return (
          <button
            key={corredor.id}
            type="button"
            className="mapa-cartao"
            style={{ '--cor': corredor.cor, '--area-p': corredor.area_deitada, '--area-r': corredor.area_estreita }}
            onClick={() => aoEscolher(corredor.id)}
            aria-label={`${corredor.nome}, ${lay.livres} armários livres`}
          >
            <span className="mapa-cartao__corpo">
              <span className={`mapa-cartao__sigla${corredor.sigla.length > 1 ? ' mapa-cartao__sigla--longa' : ''}`}>
                {corredor.sigla}
              </span>
              <span className="mapa-cartao__texto">
                <span className="mapa-cartao__nome">
                  <span className="mapa-cartao__nome-longo">{corredor.nome}</span>
                  <span className="mapa-cartao__nome-curto">{corredor.nome_curto || corredor.nome}</span>
                </span>
                {lay.salas && <span className="mapa-cartao__salas">{lay.salas}</span>}
              </span>
              <span className="mapa-cartao__livres"><b>{lay.livres}</b><span>livres</span></span>
              <svg className="mapa-cartao__seta" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
