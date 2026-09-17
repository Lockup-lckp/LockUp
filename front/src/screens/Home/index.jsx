import Carregando from '../../components/Carregando.jsx';
import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import { useMapaEscola } from '../../utils/useMapaEscola.js';
import GradeArmarios from './GradeArmarios.jsx';
import MapaArmarios from './MapaArmarios.jsx';

export default function Home() {
  const schoolCode = useCodigoEscola();
  const { mapa, carregando } = useMapaEscola(schoolCode);

  if (carregando) return <Carregando tela rotulo="Carregando armários" />;

  // Escola sem mapa cadastrado, ou mapa que não carregou: continua na grade.
  if (!mapa?.corredores?.length) return <GradeArmarios />;

  return <MapaArmarios mapa={mapa} />;
}
