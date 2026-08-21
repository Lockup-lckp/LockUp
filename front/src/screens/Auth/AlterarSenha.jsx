import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import { rotaEscola } from '../../utils/tenant.js';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useEscola } from '../../theme/contextoEscola.js';
import './Login.css'; // Reaproveita perfeitamente os estilos do login

export default function AlterarSenha() {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  // A identidade visual (logo/cores) já vem do EscolaProvider.
  const { escola: dadosEscola } = useEscola();

  const navigate = useNavigate();
  const schoolCode = useCodigoEscola();

  const handleAlterarSenha = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    if (novaSenha === 'Mudar@123' || novaSenha.toLowerCase() === 'mudar123') {
      setErro('Você não pode usar a senha padrão como sua nova senha.');
      return;
    }

    setCarregando(true);
    try {
      const token = sessionStorage.getItem('token');
      const usuarioString = sessionStorage.getItem('usuario');

      // Faz a chamada na API para alterar na tabela/Supabase
      await authService.alterarSenha(novaSenha, token);

      // Atualiza o estado local do usuário para que ele possa navegar nas telas internas sem ser barrado
      if (usuarioString) {
        const usuarioObjeto = JSON.parse(usuarioString);
        usuarioObjeto.precisa_alterar_senha = false;
        sessionStorage.setItem('usuario', JSON.stringify(usuarioObjeto));
      }

      setSucesso('Senha alterada com sucesso! Redirecionando...');

      // 800ms em vez de 2000: tempo de ler "senha alterada" sem ficar parado
      // olhando uma tela que já terminou o que tinha para fazer.
      setTimeout(() => {
        if (schoolCode) {
          navigate(rotaEscola(schoolCode, 'home'));
        } else {
          navigate('/home');
        }
      }, 800);

    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setErro(err.message || 'Não foi possível alterar sua senha. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="page-container">
      <form onSubmit={handleAlterarSenha} className="form-box">
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {dadosEscola?.logo_url && dadosEscola.logo_url !== "null" && dadosEscola.logo_url.trim() !== "" ? (
            <img 
              src={dadosEscola.logo_url} 
              alt={`Logo ${dadosEscola?.name || 'Escola'}`} 
              style={{ maxHeight: '75px', maxWidth: '100%', margin: '0 auto 12px auto', display: 'block' }} 
            />
          ) : (
            <h2 className="login-title">{dadosEscola?.name || 'Alterar Senha'}</h2>
          )}
          <p className="login-subtitle">Por segurança, atualize sua senha padrão no primeiro acesso.</p>
        </div>

        {erro && (
          <div className="error-box">
            <span>⚠️</span> {erro}
          </div>
        )}

        {sucesso && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#34d399',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            justifyContent: 'center'
          }}>
            <span>✅</span> {sucesso}
          </div>
        )}

        <div className="input-group">
          <label className="label">Nova Senha</label>
          <input
            type="password"
            placeholder="Digite a nova senha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="input"
            disabled={carregando || !!sucesso}
            required
          />
        </div>

        <div className="input-group">
          <label className="label">Confirmar Nova Senha</label>
          <input
            type="password"
            placeholder="Confirme a nova senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="input"
            disabled={carregando || !!sucesso}
            required
          />
        </div>

        <button type="submit" className="button-submit" disabled={carregando || !!sucesso}>
          {carregando ? 'Processando...' : 'Salvar Nova Senha'}
        </button>
      </form>
    </div>
  );
}