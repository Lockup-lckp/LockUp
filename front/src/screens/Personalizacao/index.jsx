import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { escolaService } from '../../services/escolaService';
import { useEscola } from '../../theme/EscolaContext.jsx';
import './Personalizacao.css';

// A estilização do sistema é FIXA na marca LCKP — a escola não escolhe cores.
// Esta tela cuida do que é de fato da instituição: as logos, o valor, e o
// vocabulário e o calendário que o portal usa com os alunos.
//
// A logo é ENVIADA, não colada como link. Link quebrava de três formas — URL de
// Google Drive que não serve imagem, site que bloqueia hotlink, e a imagem
// sumindo quando a outra ponta reorganiza o servidor — sempre depois, sem aviso.

const LIMITE_MB = 2;
const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

// Campo de logo: envia o arquivo e mostra a prévia com a mesma placa de vidro
// que o aluno vê na barra superior.
function CampoLogo({ titulo, ajuda, url, campo, posicao, aoMudarPosicao, aoEnviar }) {
  const entradaRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const escolher = async (evento) => {
    const arquivo = evento.target.files?.[0];
    // Limpa o input: sem isso, escolher o MESMO arquivo depois de um erro não
    // dispara onChange e a tela parece travada.
    evento.target.value = '';
    if (!arquivo) return;

    setErro(null);

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('Formato não suportado. Use PNG, JPG, WEBP ou SVG.');
      return;
    }
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`A imagem tem ${(arquivo.size / 1024 / 1024).toFixed(1)} MB. O limite é ${LIMITE_MB} MB.`);
      return;
    }

    setEnviando(true);
    try {
      await aoEnviar(arquivo, campo);
    } catch (e) {
      setErro(e.message || 'Não foi possível enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  };

  const temImagem = url && url !== 'null';

  return (
    <div className="perso-field">
      <label className="lckp-label">{titulo}</label>
      {ajuda && <p className="perso-ajuda">{ajuda}</p>}

      <div className="perso-logo-preview">
        {temImagem ? (
          <span className="lckp-logo-vidro">
            <img src={url} alt={`Logo — ${titulo}`} />
          </span>
        ) : (
          <span className="vazio">Nenhuma imagem enviada</span>
        )}
      </div>

      <input
        ref={entradaRef}
        type="file"
        accept={TIPOS_ACEITOS.join(',')}
        onChange={escolher}
        className="perso-arquivo"
        aria-label={`Enviar imagem — ${titulo}`}
      />

      <button
        type="button"
        className="lckp-btn lckp-btn--ghost perso-enviar"
        onClick={() => entradaRef.current?.click()}
        disabled={enviando}
      >
        {enviando ? 'Enviando...' : temImagem ? 'Trocar imagem' : 'Enviar imagem'}
      </button>

      <p className="perso-ajuda">PNG, JPG, WEBP ou SVG, até {LIMITE_MB} MB.</p>
      {erro && <p className="lckp-chip lckp-chip--danger perso-erro">{erro}</p>}

      <label className="lckp-label perso-espaco">Onde aparece</label>
      <select className="lckp-input" value={posicao} onChange={(e) => aoMudarPosicao(e.target.value)}>
        <option value="esquerda">Esquerda da barra</option>
        <option value="direita">Direita da barra</option>
        <option value="nenhum">Não exibir</option>
      </select>
    </div>
  );
}

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

  // Vocabulário e regras que o portal usa com os alunos.
  const [rotuloCorredor, setRotuloCorredor] = useState('bloco');
  const [tipoMatricula, setTipoMatricula] = useState('rm');
  const [maxArmarios, setMaxArmarios] = useState('1');
  const [aberturaDia, setAberturaDia] = useState('1');
  const [aberturaMes, setAberturaMes] = useState('2');
  const [encerramentoDia, setEncerramentoDia] = useState('20');
  const [encerramentoMes, setEncerramentoMes] = useState('12');

  // Métodos de aluguel. O anual sempre existe; o semestral a escola liga ou não.
  const [permiteSemestral, setPermiteSemestral] = useState(false);
  const [valorSemestral, setValorSemestral] = useState('');
  const [encSemestralDia, setEncSemestralDia] = useState('6');
  const [encSemestralMes, setEncSemestralMes] = useState('7');

  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo: 'sucesso'|'erro', texto }

  useEffect(() => {
    if (!escola) return;
    setLogoUrl(escola.logo_url && escola.logo_url !== 'null' ? escola.logo_url : '');
    setLogo2Url(escola.logo_2_url && escola.logo_2_url !== 'null' ? escola.logo_2_url : '');
    setLogo1Posicao(escola.logo_1_posicao || 'esquerda');
    setLogo2Posicao(escola.logo_2_posicao || 'nenhum');
    setValorArmario(escola.valor_armario != null ? String(escola.valor_armario) : '');
    setRotuloCorredor(escola.rotulo_corredor || 'bloco');
    setTipoMatricula(escola.tipo_matricula || 'rm');
    setMaxArmarios(String(escola.max_armarios_por_aluno ?? 1));
    setAberturaDia(String(escola.abertura_dia ?? 1));
    setAberturaMes(String(escola.abertura_mes ?? 2));
    setEncerramentoDia(String(escola.encerramento_dia ?? 20));
    setEncerramentoMes(String(escola.encerramento_mes ?? 12));
    setPermiteSemestral(Boolean(escola.permite_semestral));
    setValorSemestral(escola.valor_armario_semestral != null ? String(escola.valor_armario_semestral) : '');
    setEncSemestralDia(String(escola.encerramento_semestral_dia ?? 6));
    setEncSemestralMes(String(escola.encerramento_semestral_mes ?? 7));
  }, [escola]);

  // Redireciona quem não é admin (a API também bloqueia, mas evitamos exibir a tela).
  useEffect(() => {
    if (!podeEditar) {
      navigate(`/${schoolCode}/home`, { replace: true });
    }
  }, [podeEditar, navigate, schoolCode]);

  if (!podeEditar) return null;
  if (carregando) return <div className="perso-container">Carregando configurações...</div>;

  // O upload grava direto na escola: a imagem já está no servidor, e deixá-la
  // pendente de "Salvar" faria a prévia mostrar algo que ainda não vale.
  const handleEnviarLogo = async (arquivo, campo) => {
    const resultado = await escolaService.enviarLogo(escola.id, arquivo, campo);
    if (campo === 'logo_2_url') setLogo2Url(resultado.url);
    else setLogoUrl(resultado.url);
    atualizarEscolaLocal(resultado.escola || { [campo]: resultado.url });
    setFeedback({ tipo: 'sucesso', texto: 'Logo enviada.' });
  };

  const inteiroOuNulo = (valor, min, max) => {
    const n = parseInt(valor, 10);
    if (Number.isNaN(n) || n < min || n > max) return null;
    return n;
  };

  const handleSalvar = async () => {
    if (!escola?.id) return;

    // Dia e mês fora da faixa não vão para o banco: o CHECK rejeitaria e o
    // admin veria um erro de Postgres em vez de uma frase útil.
    const abreDia = inteiroOuNulo(aberturaDia, 1, 31);
    const abreMes = inteiroOuNulo(aberturaMes, 1, 12);
    const fechaDia = inteiroOuNulo(encerramentoDia, 1, 31);
    const fechaMes = inteiroOuNulo(encerramentoMes, 1, 12);

    if ([abreDia, abreMes, fechaDia, fechaMes].some((v) => v === null)) {
      setFeedback({ tipo: 'erro', texto: 'Confira as datas do ciclo: dia entre 1 e 31, mês entre 1 e 12.' });
      return;
    }

    const limite = inteiroOuNulo(maxArmarios, 1, 5);
    if (limite === null) {
      setFeedback({ tipo: 'erro', texto: 'O limite de armários por aluno precisa estar entre 1 e 5.' });
      return;
    }

    setSalvando(true);
    setFeedback(null);

    const payload = {
      logo_1_posicao: logo1Posicao,
      logo_2_posicao: logo2Posicao,
      rotulo_corredor: rotuloCorredor,
      tipo_matricula: tipoMatricula,
      max_armarios_por_aluno: limite,
      abertura_dia: abreDia,
      abertura_mes: abreMes,
      encerramento_dia: fechaDia,
      encerramento_mes: fechaMes
    };

    const valorNumero = parseFloat(String(valorArmario).replace(',', '.'));
    if (!Number.isNaN(valorNumero)) payload.valor_armario = valorNumero;

    // Semestral: o banco tem um CHECK que impede ligar sem preço — o checkout
    // cobraria NULL. Barramos aqui para o admin ver uma frase útil em vez de um
    // erro de Postgres.
    const valorSem = parseFloat(String(valorSemestral).replace(',', '.'));
    if (permiteSemestral && (Number.isNaN(valorSem) || valorSem <= 0)) {
      setFeedback({ tipo: 'erro', texto: 'Defina o preço da locação semestral antes de oferecê-la.' });
      setSalvando(false);
      return;
    }

    const semDia = inteiroOuNulo(encSemestralDia, 1, 31);
    const semMes = inteiroOuNulo(encSemestralMes, 1, 12);
    if (permiteSemestral && (semDia === null || semMes === null)) {
      setFeedback({ tipo: 'erro', texto: 'Confira a data de encerramento do semestre.' });
      setSalvando(false);
      return;
    }

    payload.permite_semestral = permiteSemestral;
    if (!Number.isNaN(valorSem)) payload.valor_armario_semestral = valorSem;
    if (semDia !== null) payload.encerramento_semestral_dia = semDia;
    if (semMes !== null) payload.encerramento_semestral_mes = semMes;

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

  const exemploCorredor = rotuloCorredor === 'corredor' ? 'Corredor 3' : 'Bloco 3';
  const exemploMatricula = tipoMatricula === 'ra' ? 'RA' : 'RM';

  return (
    <div className="perso-container">
      <header className="perso-header">
        <h2 className="perso-title">Configurações da Instituição</h2>
        <p className="perso-subtitle">
          Logos, valor e as regras que o portal usa com os alunos da {escola?.name || 'sua escola'}.
          A identidade visual do portal é padrão do LCKP e não é editável.
        </p>
      </header>

      <div className="perso-grid">
        <div className="lckp-card perso-card">
          <h3>Logos</h3>
          <p className="perso-ajuda">
            Até duas logos, exibidas sobre uma placa de vidro na barra superior.
            A imagem é enviada e passa a ser servida pelo próprio sistema.
          </p>

          <CampoLogo
            titulo="Logo principal"
            url={logoUrl}
            campo="logo_url"
            posicao={logo1Posicao}
            aoMudarPosicao={setLogo1Posicao}
            aoEnviar={handleEnviarLogo}
          />

          <CampoLogo
            titulo="Segunda logo (opcional)"
            ajuda="Ex.: a logo da APM, ou da rede à qual a escola pertence."
            url={logo2Url}
            campo="logo_2_url"
            posicao={logo2Posicao}
            aoMudarPosicao={setLogo2Posicao}
            aoEnviar={handleEnviarLogo}
          />
        </div>

        <div className="lckp-card perso-card">
          <h3>Como a escola fala</h3>
          <p className="perso-ajuda">
            Estas escolhas mudam o texto em todas as telas do aluno — mapa,
            checkout, Meu Armário e relatórios.
          </p>

          <div className="perso-field">
            <label className="lckp-label">Divisão dos armários</label>
            <select className="lckp-input" value={rotuloCorredor} onChange={(e) => setRotuloCorredor(e.target.value)}>
              <option value="bloco">Bloco</option>
              <option value="corredor">Corredor</option>
            </select>
            <p className="perso-ajuda">O aluno verá <strong>{exemploCorredor}</strong>.</p>
          </div>

          <div className="perso-field">
            <label className="lckp-label">Identificação do aluno</label>
            <select className="lckp-input" value={tipoMatricula} onChange={(e) => setTipoMatricula(e.target.value)}>
              <option value="rm">RM — Registro de Matrícula</option>
              <option value="ra">RA — Registro do Aluno</option>
            </select>
            <p className="perso-ajuda">
              O cadastro pedirá o <strong>{exemploMatricula}</strong>, que também é a
              senha do primeiro acesso do aluno.
            </p>
          </div>

          <div className="perso-field">
            <label className="lckp-label">Armários por aluno</label>
            <input
              className="lckp-input"
              type="number"
              min="1"
              max="5"
              value={maxArmarios}
              onChange={(e) => setMaxArmarios(e.target.value)}
            />
            <p className="perso-ajuda">Quantos armários cada estudante pode alugar por ciclo.</p>
          </div>

          <div className="perso-field">
            <label className="lckp-label">Valor do armário (R$)</label>
            <input
              className="lckp-input"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 100.00"
              value={valorArmario}
              onChange={(e) => setValorArmario(e.target.value)}
            />
          </div>
        </div>

        <div className="lckp-card perso-card">
          <h3>Métodos de aluguel</h3>
          <p className="perso-ajuda">
            O que o aluno pode escolher no checkout. A locação anual existe
            sempre; a semestral só aparece se a escola oferecer.
          </p>

          <div className="perso-field">
            <div className="perso-metodo perso-metodo--fixo">
              <div>
                <strong>Anual</strong>
                <span>Até {String(encerramentoDia).padStart(2, '0')}/{String(encerramentoMes).padStart(2, '0')}</span>
              </div>
              <span className="lckp-chip">Sempre disponível</span>
            </div>

            <label className={`perso-metodo ${permiteSemestral ? 'perso-metodo--ativo' : ''}`}>
              <input
                type="checkbox"
                checked={permiteSemestral}
                onChange={(e) => {
                  const ligando = e.target.checked;
                  setPermiteSemestral(ligando);
                  // Sugere metade do anual ao ligar pela primeira vez: é o que
                  // a escola combinou, e digitar o valor de novo só convida a
                  // errar. Continua editável.
                  if (ligando && !valorSemestral) {
                    const anual = parseFloat(String(valorArmario).replace(',', '.'));
                    if (!Number.isNaN(anual) && anual > 0) setValorSemestral((anual / 2).toFixed(2));
                  }
                }}
              />
              <div>
                <strong>Semestral</strong>
                <span>Meia locação, encerrando no fim do primeiro semestre</span>
              </div>
            </label>
          </div>

          {permiteSemestral && (
            <>
              <div className="perso-field">
                <label className="lckp-label">Valor da locação semestral (R$)</label>
                <input
                  className="lckp-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 50.00"
                  value={valorSemestral}
                  onChange={(e) => setValorSemestral(e.target.value)}
                />
                <p className="perso-ajuda">Sugerido: metade do valor anual.</p>
              </div>

              <div className="perso-field">
                <label className="lckp-label">Encerramento do semestre</label>
                <div className="perso-data">
                  <input className="lckp-input" type="number" min="1" max="31" value={encSemestralDia}
                    onChange={(e) => setEncSemestralDia(e.target.value)} aria-label="Dia do encerramento semestral" />
                  <span>/</span>
                  <input className="lckp-input" type="number" min="1" max="12" value={encSemestralMes}
                    onChange={(e) => setEncSemestralMes(e.target.value)} aria-label="Mês do encerramento semestral" />
                </div>
                <p className="perso-ajuda">
                  Quem comprar depois dessa data não vê a opção semestral — seria
                  pagar por um prazo já vencido.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="lckp-card perso-card">
          <h3>Ciclo letivo</h3>
          <p className="perso-ajuda">
            Fora desta janela o sistema não vende armário. No encerramento, os
            armários são desvinculados e o histórico de uso permanece registrado.
          </p>

          <div className="perso-field">
            <label className="lckp-label">Abertura das vendas</label>
            <div className="perso-data">
              <input className="lckp-input" type="number" min="1" max="31" value={aberturaDia}
                onChange={(e) => setAberturaDia(e.target.value)} aria-label="Dia da abertura" />
              <span>/</span>
              <input className="lckp-input" type="number" min="1" max="12" value={aberturaMes}
                onChange={(e) => setAberturaMes(e.target.value)} aria-label="Mês da abertura" />
            </div>
          </div>

          <div className="perso-field">
            <label className="lckp-label">Encerramento do ciclo</label>
            <div className="perso-data">
              <input className="lckp-input" type="number" min="1" max="31" value={encerramentoDia}
                onChange={(e) => setEncerramentoDia(e.target.value)} aria-label="Dia do encerramento" />
              <span>/</span>
              <input className="lckp-input" type="number" min="1" max="12" value={encerramentoMes}
                onChange={(e) => setEncerramentoMes(e.target.value)} aria-label="Mês do encerramento" />
            </div>
            <p className="perso-ajuda">
              Data em que os armários devem estar desocupados, conforme o
              contrato da instituição.
            </p>
          </div>
        </div>
      </div>

      <div className="perso-actions">
        <button className="lckp-btn" onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar configurações'}
        </button>
        {feedback && <div className={`perso-toast ${feedback.tipo}`}>{feedback.texto}</div>}
      </div>
    </div>
  );
}
