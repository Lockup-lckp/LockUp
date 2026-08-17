import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { armariosService } from '../../services/armariosServices';
import './HomeAdmin.css'; // Importando o CSS isolado

export default function HomeAdmin() {
  const { schoolCode } = useParams(); // Captura o schoolCode da URL da rota
  const [armarios, setArmarios] = useState([]);
  const [corredores, setCorredores] = useState([]);
  const [corredorAtivo, setCorredorAtivo] = useState(null);
  const [armarioSelecionado, setArmarioSelecionado] = useState(null);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(true);

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
        const dados = await armariosService.buscarTodos(schoolCode);
        setArmarios(dados);

        const listaCorredores = [...new Set(dados.map(item => item.corredor))].filter(Boolean);
        setCorredores(listaCorredores);

        if (listaCorredores.length > 0) {
          setCorredorAtivo(listaCorredores[0]);
        }
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

  let armariosFiltrados = corredorAtivo 
    ? armarios.filter(item => item.corredor === corredorAtivo)
    : [];

  if (apenasDisponiveis) {
    armariosFiltrados = armariosFiltrados.filter(item => item.status === 'disponivel');
  }

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

  const obterClasseStatus = (item) => {
    if (armarioSelecionado?.id === item.id) return 'status-selecionado';
    return `status-${item.status}`;
  };

  if (loading) return <div className="loading-state">Carregando armários...</div>;
  if (erro) return <div className="error-state">{erro}</div>;

  return (
    <div className="home-admin-container">
      
      {/* Cabeçalho e Seleção de Corredores */}
      <header className="home-admin-header">
        <div>
          <h2 className="header-title">Mapa de Ocupação</h2>
          <p className="header-subtitle">Selecione o corredor para gerenciar os armários</p>
        </div>

        {/* Abas Dinâmicas */}
        <div className="tabs-container">
          {corredores.map((corredor) => (
            <button
              key={corredor}
              onClick={() => mudarCorredor(corredor)}
              className={`tab-button ${corredorAtivo === corredor ? 'active' : ''}`}
            >
              {corredor}
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

      {/* Grid de Conteúdo Principal */}
      <div className="main-layout-grid">
        
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
                {item.nome}
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
        </div>

        {/* Painel Lateral de Detalhes */}
        <aside className="details-sidebar">
          <h3 className="sidebar-title">Detalhes do Armário</h3>
          
          {armarioSelecionado ? (
            <div className="details-wrapper">
              <div className="detail-row">
                <span className="detail-label">Identificação:</span>
                <strong className="detail-value">{armarioSelecionado.nome}</strong>
              </div>
              <div className="detail-row">
                <span className="detail-label">Corredor:</span>
                <strong className="detail-value">{armarioSelecionado.corredor}</strong>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <strong className="detail-value status-badge">{armarioSelecionado.status}</strong>
              </div>
            </div>
          ) : (
            <div className="empty-sidebar-state">
              Selecione um armário livre para visualizar as informações.
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}