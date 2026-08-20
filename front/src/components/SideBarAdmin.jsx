import { rotaEscola } from '../utils/tenant.js';
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  PainelLateral,
  ItemNav,
  IconeMapa,
  IconeUsuarios,
  IconeConfigurarArmarios,
  IconePagamentos,
  IconePersonalizacao
} from './NavLateral.jsx';

// Barra lateral do ADMIN da escola.
export default function SideBarAdmin({ isOpen, onClose }) {
  const { schoolCode } = useParams();

  return (
    <PainelLateral isOpen={isOpen} onClose={onClose} titulo="Administração">
      <ItemNav
        para={rotaEscola(schoolCode, 'HomeAdmin')}
        rotulo="Mapa de armários"
        Icone={IconeMapa}
        onNavegar={onClose}
      />
      <ItemNav
        para={rotaEscola(schoolCode, 'gerenciar-usuarios')}
        rotulo="Usuários"
        Icone={IconeUsuarios}
        onNavegar={onClose}
      />
      <ItemNav
        para={rotaEscola(schoolCode, 'gerenciar-armarios')}
        rotulo="Configurar armários"
        Icone={IconeConfigurarArmarios}
        onNavegar={onClose}
      />
      <ItemNav
        para={rotaEscola(schoolCode, 'gerenciar-pagamentos')}
        rotulo="Pagamentos"
        Icone={IconePagamentos}
        onNavegar={onClose}
      />
      <ItemNav
        para={rotaEscola(schoolCode, 'personalizacao')}
        rotulo="Configurações"
        Icone={IconePersonalizacao}
        onNavegar={onClose}
      />
    </PainelLateral>
  );
}
