import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { escolaService } from '../../services/escolaService';
import { useEscola } from '../../theme/EscolaContext.jsx';
import './Personalizacao.css';

// A estilização do sistema é FIXA na marca LCKP — a escola não escolhe cores.
// Esta tela cuida do que é de fato configurável pela instituição: a logo e o
// valor cobrado pelo armário. Os templates de posicionamento de logo (até 2)
// entram aqui na Leva 3.
export default function Personalizacao() {
  const navigate = useNavigate();
  const { schoolCode } = useParams();
  const { escola, carregando, atualizarEscolaLocal } = useEscola();

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
  const podeEditar = usuario.role === 'admin' || usuario.role === 'superadmin';

  const [logoUrl, setLogoUrl] = useState('');
  const [logo2Url, setLogo2Url] = useState('');
  const [logo1Posicao, setLogo1Posicao] = useState('esquerda');
  const [logo2Posicao, setLogo2Posicao] = useState('nenhum');
  const [valorArmario, setValorArmario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo: 'sucesso'|'erro', texto }

  // Preenche o formulário quando a escola carrega.
  useEffect(() => {
    if (escola) {
      setLogoUrl(escola.logo_url && escola.logo_url !== 'null' ? escola.logo_url : '');
      setLogo2Url(escola.logo_2_url && escola.logo_2_url !== 'null' ? escola.logo_2_url : '');
      setLogo1Posicao(escola.logo_1_posicao || 'esquerda');
      setLogo2Posicao(escola.logo_2_posicao || 'nenhum');
      setValorArmario(escola.valor_armario != null ? String(escola.valor_armario) : '');
    }
  }, [escola]);

  // Redireciona quem não é admin (a API também bloqueia, mas evitamos exibir a tela).
  useEffect(() => {
    if (!podeEditar) {
      navigate(`/${schoolCode}/home`, { replace: true });
    }
  }, [podeEditar, navigate, schoolCode]);

  if (!podeEditar) return null;
  if (carregando) return <div className="perso-container">Carregando personalização...</div>;

  const handleSalvar = async () => {
    if (!escola?.id) return;
    setSalvando(true);
    setFeedback(null);

    const payload = {
      logo_url: logoUrl.trim(),
      logo_2_url: logo2Url.trim(),
      logo_1_posicao: logo1Posicao,
      logo_2_posicao: logo2Posicao
    };
    // valor_armario é opcional; só envia se for um número válido.
    const valorNumero = parseFloat(String(valorArmario).replace(',', '.'));
    if (!Number.isNaN(valorNumero)) {
      payload.valor_armario = valorNumero;
    }

    try {
      const atualizada = await escolaService.atualizarConfiguracao(escola.id, payload);
      atualizarEscolaLocal(atualizada || payload);
      setFeedback({ tipo: 'sucesso', texto: 'Configurações salvas!' });
    } catch (err) {
      setFeedback({ tipo: 'erro', texto: err.message || 'Não foi possível salvar as configurações.' });
    } finally {
      setSalvando(false);
    }
  };

  const temLogo = logoUrl && logoUrl.trim() !== '';

  return (
    <div className="perso-container">
      <header className="perso-header">
        <h2 className="perso-title">Configurações da Instituição</h2>
        <p className="perso-subtitle">
          Logo e valor do armário da {escola?.name || 'sua escola'}. A identidade visual do
          portal é padrão do LCKP e não é editável.
        </p>
      </header>

      <div className="perso-grid">
        <div className="lckp-card perso-card">
          <h3>Logo da instituição</h3>

          <p style={{ opacity: 0.7, fontSize: '13px', marginTop: 0 }}>
            Você pode usar até duas logos e escolher de que lado da barra superior
            cada uma aparece. Elas são exibidas sobre uma placa de vidro, para
            destacar a marca da instituição em qualquer tela.
          </p>

          <div className="perso-field">
            <label className="lckp-label">Logo 1 — link da imagem</label>
            <input
              className="lckp-input"
              type="url"
              placeholder="https://.../logo-da-escola.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <div className="perso-logo-preview">
              {temLogo ? (
                <span className="lckp-logo-vidro">
                  <img src={logoUrl} alt="Prévia da logo 1" onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
                </span>
              ) : (
                <span className="vazio">Cole o link de uma imagem para ver a prévia</span>
              )}
            </div>
            <label className="lckp-label" style={{ marginTop: '10px' }}>Posição da logo 1</label>
            <select className="lckp-input" value={logo1Posicao} onChange={(e) => setLogo1Posicao(e.target.value)}>
              <option value="esquerda">Esquerda da barra</option>
              <option value="direita">Direita da barra</option>
              <option value="nenhum">Não exibir</option>
            </select>
          </div>

          <div className="perso-field">
            <label className="lckp-label">Logo 2 — link da imagem (opcional)</label>
            <input
              className="lckp-input"
              type="url"
              placeholder="https://.../logo-da-apm.png"
              value={logo2Url}
              onChange={(e) => setLogo2Url(e.target.value)}
            />
            <div className="perso-logo-preview">
              {logo2Url.trim() ? (
                <span className="lckp-logo-vidro">
                  <img src={logo2Url} alt="Prévia da logo 2" onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
                </span>
              ) : (
                <span className="vazio">Sem segunda logo</span>
              )}
            </div>
            <label className="lckp-label" style={{ marginTop: '10px' }}>Posição da logo 2</label>
            <select className="lckp-input" value={logo2Posicao} onChange={(e) => setLogo2Posicao(e.target.value)}>
              <option value="nenhum">Não exibir</option>
              <option value="esquerda">Esquerda da barra</option>
              <option value="direita">Direita da barra</option>
            </select>
          </div>

          <div className="perso-field">
            <label className="lckp-label">Valor do armário (R$)</label>
            <input
              className="lckp-input"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 50.00"
              value={valorArmario}
              onChange={(e) => setValorArmario(e.target.value)}
            />
          </div>

          <div className="perso-actions">
            <button className="lckp-btn" onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>

          {feedback && (
            <div className={`perso-toast ${feedback.tipo}`}>{feedback.texto}</div>
          )}
        </div>
      </div>
    </div>
  );
}
