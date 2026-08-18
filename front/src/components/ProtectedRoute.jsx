import React, { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useEscola } from '../theme/contextoEscola.js';
import Carregando from './Carregando.jsx';

// Guarda de rota das telas internas.
//
// A escola vem do EscolaContext (este componente sempre renderiza dentro do
// EscolaLayout). Antes fazia seu próprio buscarPorCodigo, o que significava duas
// chamadas ao mesmo endpoint em toda página protegida — uma do provider, outra
// daqui — e ainda mantinha a tela em "Validando segurança..." esperando a
// segunda resolver. Reaproveitando o contexto, a checagem é síncrona.
export default function ProtectedRoute({ children }) {
  const { schoolCode } = useParams();
  const { escola, carregando, erro } = useEscola();

  const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const ehSuperadmin = usuarioLogado?.role === 'superadmin';

  // Sem sessão — ou sem escola vinculada, quando não é superadmin.
  const semSessao = !usuarioLogado?.id || (!ehSuperadmin && !usuarioLogado.school_id);

  // Sessão de outra instituição: o school_id do usuário não bate com a escola da URL.
  const escolaDivergente =
    !!escola && !ehSuperadmin && usuarioLogado.school_id !== escola.id;

  // Limpa a sessão inválida como efeito, nunca durante a renderização.
  useEffect(() => {
    if (escolaDivergente) {
      console.warn('Bloqueio de segurança: sessão inválida para esta instituição.');
      sessionStorage.clear();
    }
  }, [escolaDivergente]);

  if (semSessao) {
    return <Navigate to={`/${schoolCode}`} replace />;
  }

  if (carregando) {
    return <Carregando tela rotulo="Validando acesso" />;
  }

  if (erro || !escola || escolaDivergente) {
    return <Navigate to={`/${schoolCode}`} replace />;
  }

  return children;
}
