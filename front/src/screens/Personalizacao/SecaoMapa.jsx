import { CORES_EDITAVEIS, paletaDoMapa } from '../Home/mapa/estiloMapa.js';
import CampoCor from './CampoCor.jsx';

const MODOS = [
  { id: 'escuro', rotulo: 'Escuro (padrão)' },
  { id: 'claro', rotulo: 'Claro' },
  { id: 'personalizado', rotulo: 'Personalizado' }
];

export default function SecaoMapa({ estilo, aoMudar, corredores }) {
  const modo = estilo?.modo ?? 'escuro';
  const paleta = paletaDoMapa(estilo);

  const mudarModo = (novoModo) => {
    if (novoModo !== 'personalizado') {
      aoMudar({ ...(estilo ?? {}), modo: novoModo });
      return;
    }
    // Ao personalizar, cada cor começa no valor que a escola já está vendo.
    const base = paletaDoMapa(estilo);
    const cores = Object.fromEntries(CORES_EDITAVEIS.map(({ campo }) => [campo, base[campo]]));
    aoMudar({ ...(estilo ?? {}), ...cores, modo: 'personalizado' });
  };

  const mudarCor = (campo, valor) => aoMudar({ ...estilo, [campo]: valor });

  const mudarCorDoCorredor = (codigo, valor) =>
    aoMudar({ modo, ...(estilo ?? {}), corredores: { ...(estilo?.corredores ?? {}), [codigo]: valor } });

  return (
    <div className="lckp-card perso-card perso-mapa">
      <h3>Mapa de armários</h3>
      <p className="perso-ajuda">
        Cores da planta e da parede dos corredores que o aluno vê ao escolher o armário.
        Livre, ocupado e manutenção não mudam: significam a mesma coisa em qualquer escola.
      </p>

      <div className="perso-field">
        <label className="lckp-label" htmlFor="mapa-modo">Tema do mapa</label>
        <select id="mapa-modo" className="lckp-input" value={modo} onChange={(e) => mudarModo(e.target.value)}>
          {MODOS.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
        </select>
      </div>

      <div className="perso-mapa-previa" style={{ background: paleta.fundo }} aria-hidden="true">
        <div className="perso-mapa-previa__parede" style={{ background: paleta.parede }}>
          <span className="perso-mapa-previa__vidro" style={{ background: paleta.vidro }} />
          <span className="perso-mapa-previa__faixa" style={{ background: paleta.faixa }} />
          <span className="perso-mapa-previa__porta" style={{ background: paleta.porta }} />
          <span className="perso-mapa-previa__bloco" style={{ background: paleta.armario_claro }}>
            <i className="livre" /><i className="ocupado" /><i className="livre" style={{ outlineColor: paleta.selecao }} data-selecionado /><i className="livre" />
          </span>
          <span className="perso-mapa-previa__bloco" style={{ background: paleta.armario_escuro }}>
            <i className="ocupado" /><i className="livre" /><i className="manutencao" /><i className="livre" />
          </span>
        </div>
      </div>

      {modo === 'personalizado' && CORES_EDITAVEIS.map(({ campo, titulo }) => (
        <CampoCor key={campo} titulo={titulo} valor={estilo?.[campo] ?? paleta[campo]} aoMudar={(v) => mudarCor(campo, v)} />
      ))}

      {corredores.length > 0 && (
        <>
          <h4 className="perso-mapa__subtitulo">Cor de cada corredor</h4>
          {corredores.map((c) => (
            <CampoCor
              key={c.id}
              titulo={c.nome}
              valor={estilo?.corredores?.[c.codigo] ?? c.cor}
              aoMudar={(v) => mudarCorDoCorredor(c.codigo, v)}
            />
          ))}
        </>
      )}

      <button type="button" className="lckp-btn lckp-btn--ghost" onClick={() => aoMudar(null)} disabled={estilo === null}>
        Voltar ao padrão
      </button>
    </div>
  );
}
