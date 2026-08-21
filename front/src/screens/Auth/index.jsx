import { rotaEscola } from '../../utils/tenant.js';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useEscola } from '../../theme/contextoEscola.js';
import Carregando from '../../components/Carregando.jsx';
import EscolaNaoEncontrada from '../../components/EscolaNaoEncontrada.jsx';
import './Login.css';

export default function Login() {
  const { schoolCode } = useParams();
  const navigate = useNavigate();

  // A escola (e o tema) já são carregados e aplicados pelo EscolaProvider.
  const { escola: dadosEscola, carregando: carregandoEscola, erro: escolaInvalida } = useEscola();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const respostaApi = await authService.login(email, senha, schoolCode);

      sessionStorage.setItem('token', respostaApi.token);

      const usuarioLogado = respostaApi.usuario || respostaApi.user || respostaApi;
      sessionStorage.setItem('usuario', JSON.stringify(usuarioLogado));

      if (usuarioLogado.precisa_alterar_senha) {
        navigate(rotaEscola(schoolCode, 'alterar-senha'));
      } else if (usuarioLogado.role === 'admin' || usuarioLogado.role === 'superadmin') {
        navigate(rotaEscola(schoolCode, 'HomeAdmin'));
      } else {
        navigate(rotaEscola(schoolCode, 'home'));
      }
    } catch (err) {
      setErro(err.message || 'E-mail ou senha inválidos.');
    } finally {
      setCarregando(false);
    }
  };

  if (carregandoEscola) {
    return <Carregando tela rotulo="Carregando instituição" />;
  }

  if (escolaInvalida || !dadosEscola) {
    // Mesma tela que o portal usa. Estava escrita aqui com branco e cinza
    // fixos, o que sumia num tema de fundo claro.
    return <EscolaNaoEncontrada codigo={schoolCode} />;
  }

  // No login não há navbar, então as duas logos aparecem juntas — a posição
  // configurada só faz sentido dentro da barra. Basta não estar como 'nenhum'.
  const urlValida = (url) => Boolean(url && url !== 'null' && String(url).trim() !== '');
  const logosEscola = [
    { url: dadosEscola?.logo_url, posicao: dadosEscola?.logo_1_posicao || 'esquerda' },
    { url: dadosEscola?.logo_2_url, posicao: dadosEscola?.logo_2_posicao || 'nenhum' }
  ].filter((l) => urlValida(l.url) && l.posicao !== 'nenhum');

  const temLogo = logosEscola.length > 0;

  return (
    <div className="page-container">
      <form onSubmit={handleLogin} className="form-box">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {temLogo ? (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              {logosEscola.map((logo, i) => (
                <span key={i} className="lckp-logo-vidro lckp-logo-vidro--destaque">
                  <img
                    src={logo.url}
                    alt={`Logo ${dadosEscola?.name || 'Escola'}`}
                    onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                  />
                </span>
              ))}
            </div>
          ) : (
            <h2 className="login-title">{dadosEscola?.name || 'Bem-vindo'}</h2>
          )}
          <p className="login-subtitle">Insira suas credenciais para acessar sua conta</p>
        </div>

        {erro && (
          <div className="error-box">
            <span>⚠️</span> {erro}
          </div>
        )}

        <div className="input-group">
          <label className="label">E-mail Institucional</label>
          <input
            type="email"
            placeholder="exemplo@etec.sp.gov.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            disabled={carregando}
            required
          />
        </div>

        <div className="input-group">
          <label className="label">Senha</label>
          <input
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="input"
            disabled={carregando}
            required
          />
        </div>

        <button type="submit" className="button-submit" disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar na Conta'}
        </button>

        <Link
          to={rotaEscola(schoolCode)}
          style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--on-bg-muted)', textDecoration: 'none' }}
        >
          ← Voltar para o portal da {dadosEscola?.name || 'instituição'}
        </Link>
      </form>
    </div>
  );
}
