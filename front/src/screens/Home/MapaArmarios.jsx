import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalArmario from '../../components/ModalArmario.jsx';
import { useEscola } from '../../theme/contextoEscola.js';
import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import { rotaEscola } from '../../utils/tenant.js';
import { useCelular } from '../../utils/useCelular.js';
import BarraSelecao from './BarraSelecao.jsx';
import Parede from './Parede.jsx';
import Planta from './Planta.jsx';
import Trilha from './Trilha.jsx';
import { montarCorredor } from './mapa/geometria.js';
import { paletaDoMapa, variaveisCss } from './mapa/estiloMapa.js';
import './Mapa.css';

const LEGENDA = [
  ['livre', 'Livre'],
  ['ocupado', 'Ocupado'],
  ['manutencao', 'Em manutenção']
];

export default function MapaArmarios({ mapa }) {
  const navigate = useNavigate();
  const schoolCode = useCodigoEscola();
  const { escola } = useEscola();
  const celular = useCelular();

  const [corredorId, setCorredorId] = useState(null);
  const [parada, setParada] = useState(0);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [aviso, setAviso] = useState(null);

  const paleta = useMemo(() => paletaDoMapa(mapa.estilo), [mapa.estilo]);
  const montados = useMemo(
    () => new Map(mapa.corredores.map((c) => [c.id, montarCorredor(c, mapa.armarios)])),
    [mapa]
  );

  const corredor = mapa.corredores.find((c) => c.id === corredorId) ?? null;
  const lay = corredor ? montados.get(corredor.id) : null;
  const armario = selecionadoId ? mapa.armarios.find((a) => a.id === selecionadoId) : null;
  const localDoArmario = armario && lay ? lay.itens.find((i) => i.id === armario.item_id)?.local : '';
  const totalLivres = mapa.armarios.filter((a) => a.estado === 'livre').length;

  // Só avisa antes do checkout. A trava de verdade continua no backend, em
  // iniciarCheckout, que também conta armários sem lugar no mapa.
  const limiteArmarios = Number(escola?.max_armarios_por_aluno) || 1;
  const atingiuLimite = mapa.armarios.filter((a) => a.meu).length >= limiteArmarios;

  const abrirCorredor = (id) => {
    setCorredorId(id);
    setParada(0);
    setSelecionadoId(null);
    setAviso(null);
  };

  const voltarParaPlanta = () => {
    setCorredorId(null);
    setSelecionadoId(null);
  };

  const tocarArmario = (id) => setSelecionadoId((atual) => (atual === id ? null : id));

  const irParaCheckout = () => {
    if (atingiuLimite) {
      setModalAberto(false);
      setAviso(limiteArmarios === 1
        ? 'Você já possui um armário reservado e não pode alugar outro.'
        : `Você já atingiu o limite de ${limiteArmarios} armários por aluno.`);
      return;
    }
    navigate(rotaEscola(schoolCode, 'checkout'), {
      state: { origemValida: true, armario, valorArmario: escola?.valor_armario || 0 }
    });
  };

  return (
    <div className="mapa" style={variaveisCss(paleta)}>
      {aviso && <div className="error-state" role="alert">{aviso}</div>}

      {!corredor ? (
        <>
          <header className="mapa-cabecalho">
            <div>
              <h2 className="mapa-titulo">Escolha o corredor</h2>
              <p className="mapa-dica">Toque no corredor onde você quer o armário.</p>
            </div>
            <span className="mapa-pino"><b>{totalLivres}</b> armários livres</span>
          </header>
          <Planta planta={mapa.planta} corredores={mapa.corredores} montados={montados} aoEscolher={abrirCorredor} />
        </>
      ) : (
        <>
          <header className="mapa-barra" style={{ '--cor': corredor.cor }}>
            <button type="button" className="mapa-voltar" onClick={voltarParaPlanta} aria-label="Voltar para a planta">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Planta</span>
            </button>
            <div className="mapa-barra__titulo">
              <span className="mapa-barra__sigla" aria-hidden="true">{corredor.sigla}</span>
              <div>
                <h2 className="mapa-barra__nome">{corredor.nome}</h2>
                <p className="mapa-barra__salas">{lay.salas}</p>
              </div>
            </div>
            <span className="mapa-pino"><b>{lay.livres}</b> livres</span>
          </header>

          <Parede
            corredor={corredor}
            lay={lay}
            paleta={paleta}
            celular={celular}
            parada={parada}
            aoMudarParada={setParada}
            selecionadoId={selecionadoId}
            aoTocarArmario={tocarArmario}
          />

          <div style={{ '--cor': corredor.cor }}>
            <Trilha lay={lay} parada={parada} aoEscolher={setParada} />
          </div>

          <div className="mapa-rodape">
            {armario ? (
              <BarraSelecao
                armario={armario}
                corredorNome={corredor.nome}
                local={localDoArmario}
                aoAlugar={() => setModalAberto(true)}
              />
            ) : (
              <ul className="mapa-legenda">
                {LEGENDA.map(([estado, rotulo]) => (
                  <li key={estado}><span className={`mapa-amostra mapa-amostra--${estado}`} />{rotulo}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <ModalArmario
        armario={modalAberto ? armario : null}
        escola={escola}
        valorArmario={escola?.valor_armario}
        atingiuLimite={atingiuLimite}
        limiteArmarios={limiteArmarios}
        aoFechar={() => setModalAberto(false)}
        aoConfirmar={irParaCheckout}
      />
    </div>
  );
}
