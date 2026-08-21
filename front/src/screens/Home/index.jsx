import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import { rotaEscola } from '../../utils/tenant.js';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { armariosService } from '../../services/armariosServices';
import { useEscola } from '../../theme/contextoEscola.js';
import Carregando from '../../components/Carregando.jsx';
import ModalArmario from '../../components/ModalArmario.jsx';
import { nomearCorredor, rotuloCorredor } from '../../utils/rotuloCorredor';
import '../HomeAdmin/HomeAdmin.css';

export default function Home() {
  const navigate = useNavigate();
  const schoolCode = useCodigoEscola();
  const { escola: escolaDados } = useEscola(); // Escola (valor, cores, logo) já carregada pelo EscolaProvider
  const [armarios, setArmarios] = useState([]);
  const [corredores, setCorredores] = useState([]);
  const [corredorAtivo, setCorredorAtivo] = useState(null);
  const [armarioSelecionado, setArmarioSelecionado] = useState(null);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quantos armários o aluno já tem nesta escola. Deixou de ser um booleano
  // quando o limite virou configurável (`schools.max_armarios_por_aluno`).
  const [armariosDoAluno, setArmariosDoAluno] = useState(0);
  const limiteArmarios = Number(escolaDados?.max_armarios_por_aluno) || 1;
  const atingiuLimite = armariosDoAluno >= limiteArmarios;

  // Filtro Selecionável
  const [apenasDisponiveis, setApenasDisponiveis] = useState(false);

  // Paginação para matriz 5x6 (30 itens por página)
  const [paginaAtual, setPaginaAtual] = useState(1);
  const armariosPorPagina = 30;

  useEffect(() => {
    const carregarDados = async () => {
      // A guarda vive DENTRO da funcao assincrona: no corpo do efeito ela
      // atualizaria estado de forma sincrona na montagem, provocando uma
      // renderizacao em cascata.
      if (!schoolCode) {
        setErro("Código da instituição não identificado na URL.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErro(null);

        // Carrega todos os armários para o mapa, filtrando pela escola da URL
        const dados = await armariosService.buscarTodos(schoolCode);
        setArmarios(dados);

        // Alinhado para capturar a propriedade 'corredor' exata do banco
        const listaCorredores = [...new Set(dados.map(item => item.corredor))].filter(Boolean);
        setCorredores(listaCorredores);

        if (listaCorredores.length > 0) {
          setCorredorAtivo(listaCorredores[0]);
        }

        // Verifica se o aluno logado já tem um armário associado nesta escola.
        // (Antes fazia uma segunda busca completa dos armários só pra isso —
        // os dados já vieram na chamada acima, então basta olhar localmente.)
        const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');
        const alunoId = usuarioLogado.id;
        // lockers.usuario_id é a coluna real do vínculo aluno-armário.
        setArmariosDoAluno(dados.filter((item) => item.usuario_id === alunoId).length);
      } catch {
        setErro("Não foi possível carregar os armários.");
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, [schoolCode]);

  const mudarCorredor = (corredor) => {
    setCorredorAtivo(corredor);
    setArmarioSelecionado(null);
    setPaginaAtual(1);
  };

  const alternarFiltro = (e) => {
    setApenasDisponiveis(e.target.checked);
    setArmarioSelecionado(null);
    setPaginaAtual(1);
  };

  // Filtragem usando a propriedade 'corredor' real do Supabase
  let armariosFiltrados = corredorAtivo 
    ? armarios.filter(item => item.corredor === corredorAtivo)
    : [];

  if (apenasDisponiveis) {
    armariosFiltrados = armariosFiltrados.filter(item => item.status === 'disponivel');
  }

  // Paginação (Matriz 5x6)
  const totalPaginas = Math.ceil(armariosFiltrados.length / armariosPorPagina) || 1;
  const indiceUltimo = paginaAtual * armariosPorPagina;
  const indicePrimeiro = indiceUltimo - armariosPorPagina;
  const armariosExibidos = armariosFiltrados.slice(indicePrimeiro, indiceUltimo);

  const handleSelecionarArmario = (armario) => {
    if (armario.status !== 'disponivel') return;
    
    if (armarioSelecionado?.id === armario.id) {
      setArmarioSelecionado(null);
    } else {
      setArmarioSelecionado(armario);
    }
  };

  const handleIrParaCheckout = () => {
    if (atingiuLimite) {
      setErro(limiteArmarios === 1
        ? 'Você já possui um armário reservado e não pode alugar outro.'
        : `Você já atingiu o limite de ${limiteArmarios} armários por aluno.`);
      return;
    }

    if (armarioSelecionado) {
      // Sem concatenar: no subdomínio rotaEscola devolve '/', e juntar à mão
      // produziria '//checkout'.
      navigate(rotaEscola(schoolCode, 'checkout'), {
        state: {
          origemValida: true, // 🔒 Libera o acesso no CheckoutProtectedRoute do router
          armario: armarioSelecionado,
          valorArmario: escolaDados?.valor_armario || 0
        }
      });
    }
  };

  const obterClasseStatus = (item) => {
    if (armarioSelecionado?.id === item.id) return 'status-selecionado';
    return `status-${item.status}`;
  };

  if (loading) return <Carregando tela rotulo="Carregando armários" />;
  if (erro) return <div className="error-state">{erro}</div>;

  return (
    <div className="home-admin-container">
      
      {/* Cabeçalho e Seleção de Corredores */}
      <header className="home-admin-header">
        <div>
          <h2 className="header-title">Mapa de Ocupação</h2>
          <p className="header-subtitle">{`Selecione o ${rotuloCorredor(escolaDados).toLowerCase()} para escolher seu armário`}</p>
        </div>

        <div className="tabs-container">
          {corredores.map((corredor) => (
            <button
              key={corredor}
              onClick={() => mudarCorredor(corredor)}
              className={`tab-button ${corredorAtivo === corredor ? 'active' : ''}`}
            >
              {nomearCorredor(escolaDados, corredor)}
            </button>
          ))}
        </div>
      </header>

      {/* Barra de Filtros */}
      <div className="filter-bar">
        <input 
          type="checkbox" 
          id="disponiveis"
          checked={apenasDisponiveis}
          onChange={alternarFiltro}
          className="filter-checkbox"
        />
        <label htmlFor="disponiveis" className="filter-label">
          Exibir apenas armários disponíveis
        </label>
      </div>

      {/* Matriz em largura inteira: os detalhes do armário passaram para o ModalArmario. */}
      <div className="main-layout-full">
        
        {/* Painel da Matriz de Armários */}
        <div className="matrix-panel">
          <div className="matrix-grid">
            {armariosExibidos.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelecionarArmario(item)}
                disabled={item.status !== 'disponivel'}
                className={`locker-button ${obterClasseStatus(item)}`}
              >
                <span className="locker-prefix">Nº</span>
                {item.nome ? item.nome.replace('Armário ', '') : item.id}
              </button>
            ))}
          </div>

          {/* Controle de Paginação */}
          <footer className="pagination-container">
            <span className="pagination-text">
              Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
            </span>

            <div className="pagination-actions">
              <button
                onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))}
                disabled={paginaAtual === 1}
                className="pagination-arrow prev"
              >
                ←
              </button>
              <button
                onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))}
                disabled={paginaAtual === totalPaginas}
                className="pagination-arrow next"
              >
                →
              </button>
            </div>
          </footer>

          <div className="locker-legend">
            <span><i className="legend-livre" /> Disponível</span>
            <span><i className="legend-ocupado" /> Ocupado</span>
            <span><i className="legend-selecionado" /> Selecionado</span>
          </div>
        </div>
      </div>

      <ModalArmario
        armario={armarioSelecionado}
        escola={escolaDados}
        valorArmario={escolaDados?.valor_armario}
        atingiuLimite={atingiuLimite}
        limiteArmarios={limiteArmarios}
        aoFechar={() => setArmarioSelecionado(null)}
        aoConfirmar={handleIrParaCheckout}
      />
    </div>
  );
}