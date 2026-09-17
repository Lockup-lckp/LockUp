import { useEffect, useState } from 'react';
import { armariosService } from '../services/armariosServices';

// Falha ao buscar o mapa não é erro para o aluno: a tela cai na grade de
// armários, que tem o próprio carregamento e a própria mensagem de erro.
export function useMapaEscola(schoolCode) {
  const [estado, setEstado] = useState({ mapa: null, carregando: true, erro: null });

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      if (!schoolCode) {
        setEstado({ mapa: null, carregando: false, erro: 'Código da instituição não identificado na URL.' });
        return;
      }
      try {
        const mapa = await armariosService.buscarMapa(schoolCode);
        if (!cancelado) setEstado({ mapa, carregando: false, erro: null });
      } catch {
        if (!cancelado) setEstado({ mapa: null, carregando: false, erro: 'Não foi possível carregar o mapa.' });
      }
    };

    carregar();
    return () => { cancelado = true; };
  }, [schoolCode]);

  return estado;
}
