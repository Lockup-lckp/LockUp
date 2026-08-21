import { useCodigoEscola } from '../utils/useCodigoEscola.js';
import { rotaEscola } from '../utils/tenant.js';
import React from 'react';

import { PainelLateral, ItemNav, IconeMapa, IconeMeuArmario } from './NavLateral.jsx';

// Barra lateral do ALUNO. O admin que cair aqui vê só o atalho para o próprio
// painel — o menu completo dele vive em SideBarAdmin.
export default function SideBar({ isOpen, onClose }) {
  const schoolCode = useCodigoEscola();
  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const isAdmin = usuario.role === 'admin';

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
        </>
      )}
    </PainelLateral>
  );
}
