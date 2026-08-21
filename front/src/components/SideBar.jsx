import { useCodigoEscola } from '../utils/useCodigoEscola.js';
import { rotaEscola } from '../utils/tenant.js';
import React from 'react';

import { useEscola } from '../theme/contextoEscola.js';

import { PainelLateral, ItemNav, IconeMapa, IconeMeuArmario, IconeContrato } from './NavLateral.jsx';

// Barra lateral do ALUNO. O admin que cair aqui vê só o atalho para o próprio
// painel — o menu completo dele vive em SideBarAdmin.
export default function SideBar({ isOpen, onClose }) {
  const schoolCode = useCodigoEscola();
  const { escola } = useEscola();
  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const isAdmin = usuario.role === 'admin';

  // Escola sem contrato cadastrado não ganha o item: um atalho que só leva a
  // "ainda não cadastrado" gasta a atenção do aluno sem devolver nada.
  const temContrato = Boolean(String(escola?.contrato_texto || '').trim());

  return (
    <PainelLateral isOpen={isOpen} onClose={onClose} titulo={isAdmin ? 'Administração' : 'Menu'}>
      {isAdmin ? (
        <ItemNav
          para={rotaEscola(schoolCode, 'HomeAdmin')}
          rotulo="Painel administrativo"
          Icone={IconeMapa}
          onNavegar={onClose}
        />
      ) : (
        <>
          <ItemNav
            para={rotaEscola(schoolCode, 'home')}
            rotulo="Mapa de armários"
            Icone={IconeMapa}
            onNavegar={onClose}
          />
          <ItemNav
            para={rotaEscola(schoolCode, 'meu-armario')}
            rotulo="Meu armário"
            Icone={IconeMeuArmario}
            onNavegar={onClose}
          />
          {temContrato && (
            <ItemNav
              para={rotaEscola(schoolCode, 'contrato')}
              rotulo="Contrato"
              Icone={IconeContrato}
              onNavegar={onClose}
            />
          )}
        </>
      )}
    </PainelLateral>
  );
}
