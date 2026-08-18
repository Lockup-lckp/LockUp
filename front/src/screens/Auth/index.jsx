import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useEscola } from '../../theme/contextoEscola.js';
import Carregando from '../../components/Carregando.jsx';
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
        navigate(`/${schoolCode}/alterar-senha`);
      } else if (usuarioLogado.role === 'admin' || usuarioLogado.role === 'superadmin') {
        navigate(`/${schoolCode}/HomeAdmin`);
      } else {
        navigate(`/${schoolCode}/home`);
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
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ fontSize: '4rem', color: '#ef4444', marginBottom: '10px' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Instituição de Ensino Não Encontrada</h2>
        <p style={{ color: '#9ca3af', maxWidth: '400px', lineHeight: '1.5' }}>
          A URL ou o código da instituição informado (<strong>{schoolCode || 'nenhum'}</strong>) não corresponde a nenhuma escola ativa no sistema. Por favor, verifique o endereço digitado.
        </p>
      </div>
    );
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
      </form>
    </div>
  );
}
