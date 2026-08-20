import { rotaEscola } from '../utils/tenant.js';
import React from "react";
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEscola } from '../theme/contextoEscola.js';

export default function NavBar({ onMenuClick }) {
  const navigate = useNavigate();
  const { schoolCode } = useParams();
  const { escola } = useEscola();

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const isAdmin = usuario.role === 'admin' || usuario.role === 'superadmin';

  const homePath = isAdmin ? rotaEscola(schoolCode, 'HomeAdmin') : rotaEscola(schoolCode, 'home');

  // Até duas logos, cada uma com posição própria na barra (esquerda/direita).
  // Não há rodapé nas telas autenticadas: as duas vivem aqui.
  const urlValida = (url) => Boolean(url && url !== 'null' && String(url).trim() !== '');

  const logos = [
    { url: escola?.logo_url, posicao: escola?.logo_1_posicao || 'esquerda' },
    { url: escola?.logo_2_url, posicao: escola?.logo_2_posicao || 'nenhum' }
  ].filter((l) => urlValida(l.url));

  const logosEsquerda = logos.filter((l) => l.posicao === 'esquerda');
  const logosDireita = logos.filter((l) => l.posicao === 'direita');

  // No celular a logo já identifica a escola, então o nome escrito vira
  // redundância que disputa a mesma barra e acaba truncado a três letras.
  // Sem logo nenhuma configurada, o nome é a única identificação e fica.
  const classeNome = logos.length > 0 ? 'hidden sm:block' : 'block';

  const handleLogout = () => {
    sessionStorage.clear();
    navigate(rotaEscola(schoolCode));
  };

  return (
    <nav className="h-16 w-full flex items-center justify-between px-4 md:px-6 bg-[var(--surface-color)]/80 backdrop-blur-md border-b border-[var(--primary-color)]/30 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="bg-none border-none text-[var(--primary-color)] text-2xl cursor-pointer hover:opacity-80 transition-opacity p-1"
        >
          ☰
        </button>

        <Link to={homePath} className="text-[var(--on-bg)] no-underline font-bold tracking-wider flex items-center gap-2 min-w-0">
          {logosEsquerda.length > 0 ? (
            logosEsquerda.map((logo, i) => (
              <span key={i} className="lckp-logo-vidro">
                <img
                  src={logo.url}
                  alt={escola?.name || 'Logo da instituição'}
                  onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                />
              </span>
            ))
          ) : (
            <h2 className={`${classeNome} text-base sm:text-xl m-0 font-extrabold font-display tracking-wide bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] bg-clip-text text-transparent truncate`}>
              {escola?.name || 'L C K P'}
            </h2>
          )}
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {logosDireita.map((logo, i) => (
          <span key={i} className="lckp-logo-vidro">
            <img
              src={logo.url}
              alt={escola?.name || 'Logo da instituição'}
              onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
            />
          </span>
        ))}

        {/* No celular vira só o ícone: "Sair" por extenso roubava a largura
            que as logos precisam. O aria-label mantém o rótulo para leitor
            de tela. */}
        <button
          onClick={handleLogout}
          aria-label="Sair da conta"
          title="Sair"
          className="shrink-0 flex items-center gap-2 bg-transparent border border-red-500/40 text-red-400 px-2.5 sm:px-4 py-1.5 rounded-md cursor-pointer hover:bg-red-500/10 hover:border-red-500/70 active:scale-[0.97] transition-colors font-medium text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </nav>
  );
}
