import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { escolaService } from '../services/escolaService';

export default function ProtectedRoute({ children }) {
  const { schoolCode } = useParams();
  const [validando, setValidando] = useState(true);
  const [permitido, setPermitido] = useState(false);


  useEffect(() => {
    const verificarSeguranca = async () => {
      try {
        const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');

        // O superadmin (dono da plataforma) acessa o portal de qualquer instituição,
        // então não precisa ter um school_id próprio.
        const ehSuperadmin = usuarioLogado?.role === 'superadmin';

        // Sem sessão (ou sem escola vinculada, quando não é superadmin), barra o acesso
        if (!usuarioLogado?.id || (!ehSuperadmin && !usuarioLogado.school_id)) {
          setPermitido(false);
          setValidando(false);
          return;
        }

        // Busca os dados da instituição correspondente ao código da URL
        const dadosEscola = await escolaService.buscarPorCodigo(schoolCode);

        if (!dadosEscola) {
          setPermitido(false);
        } else if (!ehSuperadmin && usuarioLogado.school_id !== dadosEscola.id) {
          // Validação estrita: sessão de outra instituição
          console.warn("Bloqueio de Segurança: Sessão inválida para esta instituição.");
          sessionStorage.clear(); // Limpa dados corrompidos ou sessões antigas
          setPermitido(false);
        } else {
          setPermitido(true);
        }
      } catch (error) {
        console.error("Erro na validação do interceptor de rotas:", error);
        setPermitido(false);
      } finally {
        setValidando(false);
      }
    };

    if (schoolCode) {
      verificarSeguranca();
    }
  }, [schoolCode]);

  if (validando) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--primary-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif'
      }}>
        <h3>Validando segurança do acesso institucional...</h3>
      </div>
    );
  }

  if (!permitido) {
    return <Navigate to={`/${schoolCode}`} replace />;
  }

  return children;
}