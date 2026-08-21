import { useCodigoEscola } from './utils/useCodigoEscola.js';
import { ehSubdominioDeEscola, rotaEscola } from './utils/tenant.js';
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';

// Cada tela vira um pedaço de JS separado, baixado só quando a rota é visitada
// (ex: um aluno nunca baixa o código das telas de admin/superadmin).
//
// Os carregadores ficam nomeados aqui porque são usados DUAS vezes: no lazy()
// abaixo e no pré-carregamento em tempo ocioso (ver useAquecerRotas). import()
// é idempotente — chamar de novo devolve o módulo já em memória, sem baixar
// nada duas vezes.
const telas = {
    landing: () => import('./screens/Landing/index.jsx'),
    superAdmin: () => import('./screens/SuperAdmin/index.jsx'),
    portalEscola: () => import('./screens/PortalEscola/index.jsx'),
    login: () => import('./screens/Auth/index.jsx'),
    home: () => import('./screens/Home/index.jsx'),
    checkout: () => import('./screens/Checkout/index.jsx'),
    homeAdmin: () => import('./screens/HomeAdmin/index.jsx'),
    usuarios: () => import('./screens/Gerenciamento/Usuarios/index.jsx'),
    alterarSenha: () => import('./screens/Auth/AlterarSenha.jsx'),
    armarios: () => import('./screens/Gerenciamento/Armarios/index.jsx'),
    historico: () => import('./screens/Gerenciamento/Historico/index.jsx'),
    meuArmario: () => import('./screens/MeuArmario/index.jsx'),
    contrato: () => import('./screens/Contrato/index.jsx'),
    personalizacao: () => import('./screens/Personalizacao/index.jsx')
};

const Landing = lazy(telas.landing);
const SuperAdmin = lazy(telas.superAdmin);
const PortalEscola = lazy(telas.portalEscola);
const Login = lazy(telas.login);
const Home = lazy(telas.home);
const Checkout = lazy(telas.checkout);
const HomeAdmin = lazy(telas.homeAdmin);
const Usuarios = lazy(telas.usuarios);
const AlterarSenha = lazy(telas.alterarSenha);
const GerenciamentoArmarios = lazy(telas.armarios);
const HistoricoPagamentos = lazy(telas.historico);
const MeuArmario = lazy(telas.meuArmario);
const Contrato = lazy(telas.contrato);
const Personalizacao = lazy(telas.personalizacao);

// Quais telas cada papel visita de verdade. Aquecer só estas mantém a promessa
// do code splitting: o aluno continua sem baixar o código de admin.
const ROTAS_POR_PAPEL = {
    aluno: ['home', 'meuArmario', 'checkout', 'contrato'],
    admin: ['homeAdmin', 'armarios', 'usuarios', 'historico', 'personalizacao'],
    superadmin: ['superAdmin', 'homeAdmin', 'armarios', 'usuarios', 'historico', 'personalizacao'],
    // O visitante chega pelo portal da escola e o próximo clique é sempre
    // "Entrar" — vale aquecer os dois.
    visitante: ['portalEscola', 'login']
};

const agendarOcioso = (fn) =>
    typeof window.requestIdleCallback === 'function'
        // timeout: se o navegador nunca ficar ocioso, roda mesmo assim.
        ? window.requestIdleCallback(fn, { timeout: 3000 })
        : window.setTimeout(fn, 1200);

/**
 * Baixa em segundo plano os pedaços das telas que este usuário provavelmente
 * vai abrir.
 *
 * Sem isto, o PRIMEIRO clique em cada tela paga uma ida à rede antes de
 * desenhar qualquer coisa — e o fallback do Suspense ocupa a tela inteira,
 * então a navegação pisca. Com o aquecimento, o clique encontra o módulo já em
 * memória e a troca é imediata.
 *
 * Roda em requestIdleCallback de propósito: nunca disputa banda nem CPU com o
 * que o usuário está olhando agora.
 */
function useAquecerRotas() {
    useEffect(() => {
        let cancelado = false;

        const id = agendarOcioso(() => {
            if (cancelado) return;
            let papel = 'visitante';
            try {
                papel = JSON.parse(sessionStorage.getItem('usuario') || '{}').role || 'visitante';
            } catch {
                // sessionStorage corrompido não pode derrubar a navegação.
            }
            for (const nome of ROTAS_POR_PAPEL[papel] || ROTAS_POR_PAPEL.visitante) {
                // Falha de rede aqui é irrelevante: o lazy() tenta de novo na
                // hora do clique. Engolir evita "unhandled rejection" no console.
                telas[nome]?.().catch(() => {});
            }
        });

        return () => {
            cancelado = true;
            if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(id);
            else window.clearTimeout(id);
        };
    }, []);
}

import NavBar from './components/NavBar';
import SideBar from './components/SideBar';
import SideBarAdmin from './components/SideBarAdmin';
import ProtectedRoute from './components/ProtectedRoute';
import Carregando from './components/Carregando.jsx';
import { EscolaLayout } from './theme/EscolaContext.jsx';

// Placeholder simples enquanto o pedaço da rota é baixado (só aparece na
// primeira visita a cada tela; fica em cache do navegador depois).
function CarregandoRota() {
  // Anel, não a marca: troca de tela é espera curta — e com o aquecimento de
  // rotas acima, quase sempre nem chega a aparecer.
  return <Carregando tela rotulo="Carregando" />;
}

// 🔒 Guarda exclusiva do checkout: só entra vindo do mapa de armários (com a flag de origem).
function CheckoutProtectedRoute({ children }) {
  const location = useLocation();
  const schoolCode = useCodigoEscola();

  const veioDaHome = location.state?.origemValida;

  if (!veioDaHome) {
    console.warn('Acesso bloqueado: a tela de checkout só pode ser acessada através do mapa de armários.');
    return <Navigate to={rotaEscola(schoolCode, 'home')} replace />;
  }

  return children;
}

function LayoutComComponentes() {
  const [menuAberto, setMenuAberto] = useState(false);

  const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');

  return (
    <div className="min-h-screen bg-[var(--bg-color)] flex flex-col font-sans">
      <NavBar onMenuClick={() => setMenuAberto(!menuAberto)} />

      {usuarioLogado.role === 'admin' || usuarioLogado.role === 'superadmin' ? (
        <SideBarAdmin isOpen={menuAberto} onClose={() => setMenuAberto(false)} />
      ) : (
        <SideBar isOpen={menuAberto} onClose={() => setMenuAberto(false)} />
      )}

      <main className={`flex-1 p-6 transition-[padding] duration-300 ${menuAberto ? 'lg:pl-72' : 'lg:pl-6'}`}>
        <Outlet />
      </main>
    </div>
  );
}

export default function AppRoutes() {
  useAquecerRotas();

  // Resolvido uma vez: o hostname não muda durante a sessão.
  const emSubdominio = ehSubdominioDeEscola();

  return (
    <BrowserRouter>
      <Suspense fallback={<CarregandoRota />}>
        <Routes>
          {/* Landing e painel da plataforma existem SÓ no domínio principal.
              No subdomínio de uma escola a raiz é o portal dela, e o painel do
              superadmin nem chega a ser montado. */}
          {!emSubdominio && <Route path="/" element={<Landing />} />}
          {!emSubdominio && <Route path="/gerenciamento" element={<SuperAdmin />} />}

          {/* Todas as rotas da escola compartilham o contexto/tema via EscolaLayout.
              No subdomínio elas nascem na raiz; no domínio principal, sob o código. */}
          <Route path={emSubdominio ? '/' : '/:schoolCode'} element={<EscolaLayout />}>
            {/* Públicas.

                A raiz é o PORTAL da escola, não o login. Ela era o formulário
                de acesso, o que exigia e-mail e senha de quem talvez nunca
                tivesse entrado — sem dizer preço, prazo nem que a senha do
                primeiro acesso é a matrícula. O login continua existindo, agora
                em /entrar, alcançado por um botão. */}
            <Route index element={<PortalEscola />} />
            <Route path="entrar" element={<Login />} />
            <Route path="alterar-senha" element={<AlterarSenha />} />

            {/* Protegidas (exigem sessão válida da própria instituição) */}
            <Route element={<ProtectedRoute><LayoutComComponentes /></ProtectedRoute>}>
              <Route path="home" element={<Home />} />
              <Route path="HomeAdmin" element={<HomeAdmin />} />
              <Route path="gerenciar-usuarios" element={<Usuarios />} />
              <Route path="gerenciar-armarios" element={<GerenciamentoArmarios />} />
              <Route path="gerenciar-pagamentos" element={<HistoricoPagamentos />} />
              <Route path="personalizacao" element={<Personalizacao />} />
              <Route path="meu-armario" element={<MeuArmario />} />
              <Route path="contrato" element={<Contrato />} />

              <Route
                path="checkout"
                element={
                  <CheckoutProtectedRoute>
                    <Checkout />
                  </CheckoutProtectedRoute>
                }
              />
            </Route>
          </Route>

          {/* Link inválido → volta para a raiz */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
