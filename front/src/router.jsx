import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation, useParams } from 'react-router-dom';

// Cada tela vira um pedaço de JS separado, baixado só quando a rota é visitada
// (ex: um aluno nunca baixa o código das telas de admin/superadmin).
const Landing = lazy(() => import('./screens/Landing/index.jsx'));
const SuperAdmin = lazy(() => import('./screens/SuperAdmin/index.jsx'));
const Login = lazy(() => import('./screens/Auth/index.jsx'));
const Home = lazy(() => import('./screens/Home/index.jsx'));
const Checkout = lazy(() => import('./screens/Checkout/index.jsx'));
const HomeAdmin = lazy(() => import('./screens/HomeAdmin/index.jsx'));
const Usuarios = lazy(() => import('./screens/Gerenciamento/Usuarios/index.jsx'));
const AlterarSenha = lazy(() => import('./screens/Auth/AlterarSenha.jsx'));
const GerenciamentoArmarios = lazy(() => import('./screens/Gerenciamento/Armarios/index.jsx'));
const HistoricoPagamentos = lazy(() => import('./screens/Gerenciamento/Historico/index.jsx'));
const MeuArmario = lazy(() => import('./screens/MeuArmario/index.jsx'));
const Personalizacao = lazy(() => import('./screens/Personalizacao/index.jsx'));

import NavBar from './components/NavBar';
import SideBar from './components/SideBar';
import SideBarAdmin from './components/SideBarAdmin';
import ProtectedRoute from './components/ProtectedRoute';
import { EscolaLayout } from './theme/EscolaContext.jsx';

// Placeholder simples enquanto o pedaço da rota é baixado (só aparece na
// primeira visita a cada tela; fica em cache do navegador depois).
function CarregandoRota() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color,#0A1F44)]">
      <span className="w-8 h-8 border-2 border-white/20 border-t-[var(--primary-color,#E8B44A)] rounded-full animate-spin" />
    </div>
  );
}

// 🔒 Guarda exclusiva do checkout: só entra vindo do mapa de armários (com a flag de origem).
function CheckoutProtectedRoute({ children }) {
  const location = useLocation();
  const { schoolCode } = useParams();

  const veioDaHome = location.state?.origemValida;

  if (!veioDaHome) {
    console.warn('Acesso bloqueado: a tela de checkout só pode ser acessada através do mapa de armários.');
    return <Navigate to={`/${schoolCode}/home`} replace />;
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
  return (
    <BrowserRouter>
      <Suspense fallback={<CarregandoRota />}>
        <Routes>
          {/* Landing pública do projeto: apresenta o LCKP e recebe contato de escolas interessadas. */}
          <Route path="/" element={<Landing />} />

          {/* Painel do superadmin da plataforma: login próprio, sem depender de nenhuma escola. */}
          <Route path="/gerenciamento" element={<SuperAdmin />} />

          {/* Todas as rotas da escola compartilham o contexto/tema via EscolaLayout */}
          <Route path="/:schoolCode" element={<EscolaLayout />}>
            {/* Públicas */}
            <Route index element={<Login />} />
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
