import React from 'react';
import { useTravarScroll } from '../utils/travarScroll';
import { Link, useLocation } from 'react-router-dom';

// Peças compartilhadas pelas duas barras laterais (aluno e admin), que antes
// repetiam a mesma casca e o mesmo estilo de item em dois arquivos.
//
// Os ícones são desenhados no vocabulário da marca — porta de armário com
// frestas de ventilação e chave — em vez de emoji. Emoji muda de desenho a
// cada sistema operacional, não acompanha a cor do tema e destoa num painel
// que a coordenação da escola usa para trabalhar.

const traco = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

// Corredor de armários: o mapa de ocupação.
export const IconeMapa = (props) => (
  <svg viewBox="0 0 24 24" {...traco} {...props}>
    <rect x="3" y="3.5" width="7" height="17" rx="1.5" />
    <rect x="14" y="3.5" width="7" height="17" rx="1.5" />
    <path d="M5 7h3M5 9.5h3M16 7h3M16 9.5h3" />
    <path d="M8.4 13.5v2.5M19.4 13.5v2.5" />
  </svg>
);

// Uma porta com a chave: o armário que é seu.
export const IconeMeuArmario = (props) => (
  <svg viewBox="0 0 24 24" {...traco} {...props}>
    <rect x="4" y="3" width="10" height="18" rx="1.5" />
    <path d="M6.5 6.5h5M6.5 9h5" />
    <circle cx="8.2" cy="13.6" r="1.1" />
    <path d="M9.6 13.6h7.2M15.2 13.6v1.8" />
    <circle cx="19.4" cy="13.6" r="2.4" />
  </svg>
);

// Folha com a dobra do canto: o contrato de locação.
export const IconeContrato = (props) => (
  <svg viewBox="0 0 24 24" {...traco} {...props}>
    <path d="M14 3H7a1.6 1.6 0 0 0-1.6 1.6v14.8A1.6 1.6 0 0 0 7 21h10a1.6 1.6 0 0 0 1.6-1.6V7.6z" />
    <path d="M14 3v4.6h4.6" />
    <path d="M8.6 12h6.8M8.6 15.2h6.8M8.6 18h4" />
  </svg>
);

export const IconeUsuarios = (props) => (
  <svg viewBox="0 0 24 24" {...traco} {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c0-3.1 2.5-5.4 5.5-5.4s5.5 2.3 5.5 5.4" />
    <path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.9" />
    <path d="M17.8 14.9c1.7.7 2.9 2.4 2.9 4.4" />
  </svg>
);

// Porta com sinal de mais: cadastrar e configurar armários.
export const IconeConfigurarArmarios = (props) => (
  <svg viewBox="0 0 24 24" {...traco} {...props}>
    <rect x="3.5" y="3" width="11" height="18" rx="1.5" />
    <path d="M6.5 6.5h5M6.5 9h5" />
    <path d="M12.3 14.5v2.4" />
    <path d="M18.5 13v6M15.5 16h6" />
  </svg>
);

// Recibo: o extrato de pagamentos da escola.
export const IconePagamentos = (props) => (
  <svg viewBox="0 0 24 24" {...traco} {...props}>
    <path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21z" />
    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
  </svg>
);

export const IconePersonalizacao = (props) => (
  <svg viewBox="0 0 24 24" {...traco} {...props}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <circle cx="8.5" cy="10" r="1.6" />
    <path d="M3.6 17l4.6-4.3 3.4 3.1 3.2-2.9 5.6 5" />
  </svg>
);

/**
 * Item de navegação. Marca a rota atual — antes não havia estado ativo e o
 * usuário não sabia em que tela estava.
 */
export function ItemNav({ para, rotulo, Icone, onNavegar }) {
  const { pathname } = useLocation();
  const ativo = pathname.toLowerCase() === para.toLowerCase();

  return (
    <Link
      to={para}
      onClick={onNavegar}
      aria-current={ativo ? 'page' : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
        ativo
          ? 'bg-[color-mix(in_srgb,var(--primary-color)_14%,transparent)] text-[var(--primary-color)]'
          : 'text-[var(--on-bg-muted)] hover:bg-[color-mix(in_srgb,var(--on-bg)_7%,transparent)] hover:text-[var(--on-bg)]'
      }`}
    >
      {/* Marcador do item ativo: dispensa negrito ou cor gritante para indicar posição. */}
      <span
        aria-hidden="true"
        className={`h-5 w-[3px] shrink-0 rounded-full transition-colors ${
          ativo ? 'bg-[var(--primary-color)]' : 'bg-transparent'
        }`}
      />
      <Icone className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{rotulo}</span>
    </Link>
  );
}

/**
 * Casca da barra lateral: fundo escurecido no celular e o painel deslizante.
 */
export function PainelLateral({ isOpen, onClose, titulo, children }) {

  // A gaveta cobre a tela no celular: o fundo nao pode rolar por tras dela.
  useTravarScroll(isOpen);
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label={titulo}
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col gap-1 border-r border-[var(--border-color)] bg-[var(--surface-color)]/95 px-3 pb-6 pt-20 text-[var(--on-bg)] shadow-[4px_0_25px_rgba(0,0,0,.45)] backdrop-blur-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--on-bg-muted)]">
          {titulo}
        </p>
        {children}
      </nav>
    </>
  );
}
