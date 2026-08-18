import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usuarioService } from '../../../services/usuariosServices';
import { useEscola } from '../../../theme/contextoEscola.js';
import Carregando from '../../../components/Carregando.jsx';
import './Gerenciamento.css';

export default function Gerenciamento() {
  const { schoolCode } = useParams(); // Código em texto da URL (Ex: 'etec-bento-quirino')
  const { escola, carregando: escolaCarregando } = useEscola();
  // Cada instituição chama a matrícula de um jeito. A ETEC Bento Quirino usa RM.
  const rotuloMatricula = (escola?.tipo_matricula || 'rm').toUpperCase();
  // UUID da escola vem do contexto — não há motivo para buscar de novo.
  const schoolIdUuid = escola?.id ?? null;
  const [usuarios, setUsuarios] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Estados de Paginação dos Usuários
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 25; // Quantidade de usuários exibidos por tela

  // Estados para gerenciar o Modal de Cadastro de Novo Usuário
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    nome_completo: '',
    email_institucional: '',
    matricula: '',
    role: 'aluno'
  });

  // Controle do Pop-up Customizado de Confirmação (Modal)
  const [modalConfig, setModalConfig] = useState({
    aberto: false,
    titulo: '',
    mensagem: '',
    onConfirmar: null,
  });

  // Controle de Notificações rápidas (Toast)
  const [notificacao, setNotificacao] = useState({ aberto: false, mensagem: '', tipo: 'erro' });

  // Carrega os usuários quando a escola do contexto estiver resolvida.
  //
  // Antes esta tela buscava a escola por conta própria só para extrair o UUID —
  // uma terceira chamada ao mesmo endpoint que o EscolaProvider já tinha feito.
  // Agora o id vem do contexto e a tela só espera ele aparecer.
  // O caso "escola não identificada" é derivado, não guardado em estado: setar
  // estado direto no corpo do efeito dispara renderização em cascata.
  const escolaNaoIdentificada = !escolaCarregando && !schoolIdUuid;

  // Declarada ANTES do efeito que a usa. Chamar uma const declarada mais
  // abaixo funciona por acidente — o efeito so roda depois do render — e
  // quebra no dia em que alguem mover o codigo.
  const carregarUsuarios = async (schoolIdParaFiltro = schoolIdUuid) => {
    try {
      const dados = await usuarioService.buscarTodos(schoolIdParaFiltro);
      if (Array.isArray(dados)) {
        setUsuarios(dados);
      } else if (dados && typeof dados === 'object') {
        const chaveArray = Object.keys(dados).find(key => Array.isArray(dados[key]));
        setUsuarios(chaveArray ? dados[chaveArray] : []);
      } else {
        setUsuarios([]);
      }
    } catch (err) {
      console.error("Erro ao recarregar lista de usuários:", err);
    }
  };

  useEffect(() => {
    if (escolaCarregando || !schoolIdUuid) return;

    const inicializarDados = async () => {
      try {
        setCarregando(true);
        setErro(null);
        // Lista já filtrada por escola no servidor (evita baixar usuários de
        // todas as instituições).
        await carregarUsuarios(schoolIdUuid);
      } catch {
        setErro('Não foi possível carregar os dados iniciais da página.');
        setUsuarios([]);
      } finally {
        setCarregando(false);
      }
    };

    inicializarDados();
    // carregarUsuarios e recriada a cada render e nao entra nas dependencias
    // de proposito: incluir faria a busca rodar sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolIdUuid, escolaCarregando]);


  const mostrarNotificacao = (mensagem, tipo = 'erro') => {
    setNotificacao({ aberto: true, mensagem, tipo });
    setTimeout(() => {
      setNotificacao((prev) => ({ ...prev, aberto: false }));
    }, 4000);
  };

  // Função para criar o usuário vinculando dinamicamente ao UUID correto
  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    if (!novoUsuario.email_institucional) {
      mostrarNotificacao('Informe o e-mail institucional.', 'erro');
      return;
    }
    // Para aluno a matrícula é obrigatória: ela identifica o aluno E é a senha
    // do primeiro acesso. Sem ela, ele não teria como entrar.
    if (novoUsuario.role === 'aluno' && !novoUsuario.matricula.trim()) {
      mostrarNotificacao(`Informe o ${rotuloMatricula} do aluno.`, 'erro');
      return;
    }

    // Vem do contexto, já resolvido antes desta tela renderizar. A busca de
    // segurança que existia aqui era uma quarta chamada ao mesmo endpoint.
    const uuidValido = schoolIdUuid;

    // Impede o envio se o UUID da escola correspondente à URL atual não tiver sido localizado
    if (!uuidValido) {
      mostrarNotificacao('Erro interno: O UUID da escola referente a esta URL não foi carregado. Não é possível vincular o usuário.', 'erro');
      return;
    }

    try {
      // A senha NÃO vem do cliente: o backend gera o hash a partir da matrícula
      // (aluno) ou da senha padrão (admin). Antes daqui saía senha_hash em texto
      // puro no corpo da requisição, o que o backend ignorava mas era enganoso.
      const dadosParaEnviar = {
        ...novoUsuario,
        matricula: novoUsuario.matricula.trim() || null,
        school_id: uuidValido
      };

      await usuarioService.criar(dadosParaEnviar);
      
      // Recarrega a lista do banco para trazer o usuário com as propriedades corretas do servidor
      await carregarUsuarios();
      
      mostrarNotificacao('Usuário cadastrado com sucesso!', 'sucesso');
      
      // Reseta o estado do formulário e fecha a modal
      setNovoUsuario({ nome_completo: '', email_institucional: '', matricula: '', role: 'aluno' });
      setModalCriarAberto(false);
    } catch (err) {
      console.error('Erro detalhado ao criar usuário:', err);
      mostrarNotificacao('Erro ao cadastrar novo usuário no banco de dados.', 'erro');
    }
  };

  const handleMudarRole = (idValido, novaRole) => {
    if (!idValido) {
      mostrarNotificacao('Identificador do usuário não foi encontrado.', 'erro');
      return;
    }

    const textoRole = novaRole === 'admin' ? 'Administrador' : 'Aluno';

    setModalConfig({
      aberto: true,
      titulo: 'Alterar Cargo',
      mensagem: `Deseja realmente alterar o cargo deste usuário para ${textoRole}?`,
      onConfirmar: async () => {
        try {
          const usuarioAtualizado = await usuarioService.atualizar(idValido, { role: novaRole });
          setUsuarios((usuariosAnteriores) =>
            usuariosAnteriores.map((u) => {
              const currentId = u.id || u.uid;
              return currentId === idValido ? { ...u, ...usuarioAtualizado, role: novaRole } : u;
            })
          );
          mostrarNotificacao('Cargo updated com sucesso!', 'sucesso');
        } catch {
          mostrarNotificacao('Erro ao alterar a permissão no servidor.', 'erro');
          carregarUsuarios();
        } finally {
          setModalConfig((prev) => ({ ...prev, aberto: false }));
        }
      },
    });
  };

  const handleExcluir = (idValido) => {
    if (!idValido) {
      mostrarNotificacao('Identificador do usuário não foi encontrado.', 'erro');
      return;
    }

    setModalConfig({
      aberto: true,
      titulo: 'Excluir Usuário',
      mensagem: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
      onConfirmar: async () => {
        try {
          await usuarioService.excluir(idValido);
          setUsuarios((usuariosAnteriores) => 
            usuariosAnteriores.filter((u) => (u.id || u.uid) !== idValido)
          );
          mostrarNotificacao('Usuário removido com sucesso.', 'sucesso');
        } catch {
          mostrarNotificacao('Erro ao excluir o usuário.', 'erro');
        } finally {
          setModalConfig((prev) => ({ ...prev, aberto: false }));
        }
      },
    });
  };

  // 1. FILTRAGEM: Filtra apenas os usuários vinculados à escola atual e aplica a busca por termo
  const usuariosFiltrados = Array.isArray(usuarios)
    ? usuarios
        .filter((usuario) => {
          // Garante que o school_id do usuário corresponde ao UUID da escola ativa na URL
          const pertenceAEscola = usuario?.school_id === schoolIdUuid;
          if (!pertenceAEscola) return false;

          // Aplica o filtro de busca por Nome ou E-mail
          const nome = usuario?.nome_completo?.toLowerCase() || '';
          const email = usuario?.email_institucional?.toLowerCase() || '';
          const busca = termoBusca.toLowerCase();
          return nome.includes(busca) || email.includes(busca);
        })
        .sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return 0;
        })
    : [];

  // 2. CÁLCULO DE PAGINAÇÃO
  const totalPaginas = Math.ceil(usuariosFiltrados.length / itensPorPagina) || 1;
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  
  // Lista fatiada contendo estritamente os 25 usuários da página corrente
  const usuariosPaginados = usuariosFiltrados.slice(indiceInicial, indiceFinal);

  if (escolaNaoIdentificada) {
    return (
      <div className="error-state">
        <p>Não foi possível identificar a instituição "{schoolCode}".</p>
      </div>
    );
  }

  if (carregando) {
    return (
      <Carregando tela rotulo="Carregando usuários" />
    );
  }

  return (
    <div className="manage-container">
      
      {/* TOAST NOTIFICATION */}
      {notificacao.aberto && (
        <div className={`toast-notification ${notificacao.tipo}`}>
          {notificacao.mensagem}
        </div>
      )}

      {/* POPUP MODAL CONFIRMAÇÃO DE AÇÃO */}
      {modalConfig.aberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">{modalConfig.titulo}</h3>
            <p className="modal-message">{modalConfig.mensagem}</p>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setModalConfig((prev) => ({ ...prev, aberto: false }));
                  carregarUsuarios();
                }}
                className="btn-cancel"
              >
                Cancelar
              </button>
              <button onClick={modalConfig.onConfirmar} className="btn-save">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL CRIAÇÃO DE USUÁRIO */}
      {modalCriarAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Novo Usuário</h3>
            <form onSubmit={handleCriarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Nome Completo <span style={{ opacity: 0.6 }}>(opcional)</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Pedro Coltro"
                  value={novoUsuario.nome_completo}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, nome_completo: e.target.value })}
                />
              </div>

              {novoUsuario.role === 'aluno' && (
                <div className="form-group">
                  <label>{rotuloMatricula} do aluno</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder={`Ex: ${rotuloMatricula === 'RA' ? '000123456789' : '12345'}`}
                    value={novoUsuario.matricula}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, matricula: e.target.value })}
                  />
                  <small style={{ opacity: 0.7, fontSize: '12px' }}>
                    Será a senha do primeiro acesso. O aluno entra com o e-mail e o {rotuloMatricula},
                    e o sistema exige a troca da senha na hora.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>E-mail Institucional</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="usuario@institucional.com"
                  value={novoUsuario.email_institucional}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, email_institucional: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Cargo / Função</label>
                <select
                  className="form-input"
                  value={novoUsuario.role}
                  onChange={(e) => setNovoUsuario({
                    ...novoUsuario,
                    role: e.target.value,
                    // Limpa a matrícula ao sair de "aluno": o campo some da tela
                    // mas o valor continuava no estado e ia junto no envio,
                    // virando a senha inicial de um admin.
                    matricula: e.target.value === 'aluno' ? novoUsuario.matricula : ''
                  })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="aluno" style={{ backgroundColor: '#121829' }}>Aluno</option>
                  <option value="admin" style={{ backgroundColor: '#121829' }}>Administrador</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalCriarAberto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="manage-header">
        <div>
          <h1 className="manage-title">Gerenciamento de Usuários</h1>
          <p className="manage-subtitle">Controle de acessos e permissões do sistema</p>
        </div>
        <button className="btn-add-user" onClick={() => setModalCriarAberto(true)}>
          + Adicionar Usuário
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome ou e-mail nesta escola..."
        value={termoBusca}
        onChange={(e) => { setTermoBusca(e.target.value); setPaginaAtual(1); }}
        className="search-input"
      />

      {erro && (
        <div className="error-banner">
          {erro}
        </div>
      )}

      <div className="table-wrapper">
        <div className="overflow-x">
          <table className="manage-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Cargo / Função</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuariosPaginados.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-message">
                    Nenhum usuário desta instituição encontrado.
                  </td>
                </tr>
              ) : (
                usuariosPaginados.map((usuario, index) => {
                  const idParaRequisicao = usuario.id || usuario.uid;
                  const chaveUnicaReact = idParaRequisicao || `user-row-${index}`;

                  return (
                    <tr key={chaveUnicaReact}>
                      {/* `data-label` NÃO é decorativo: no celular a folha de
                          estilo troca a tabela por cartões e desenha o rótulo
                          de cada linha com `content: attr(data-label)`. Sem
                          ele o rótulo saía vazio e o `space-between` jogava
                          todos os valores contra a borda direita, sem dizer o
                          que era o quê. */}
                      <td data-label="Nome" style={{ fontWeight: '600', color: '#ffffff' }}>
                        {usuario.nome_completo || 'Sem Nome'}
                      </td>
                      <td data-label="E-mail" style={{ color: '#8fa0dd' }}>
                        {usuario.email_institucional || 'Sem E-mail'}
                      </td>
                      <td data-label="Cargo">
                        <select
                          value={usuario.role === 'admin' ? 'admin' : 'aluno'}
                          onChange={(e) => handleMudarRole(idParaRequisicao, e.target.value)}
                          className={`role-select ${usuario.role === 'admin' ? 'admin' : 'student'}`}
                        >
                          <option value="aluno" style={{ backgroundColor: '#121829', color: '#ffffff' }}>Aluno</option>
                          <option value="admin" style={{ backgroundColor: '#121829', color: '#ffffff' }}>Administrador</option>
                        </select>
                      </td>
                      <td data-label="Ações" className="text-right">
                        <button
                          onClick={() => handleExcluir(idParaRequisicao)}
                          className="btn-delete-row"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES DE PAGINAÇÃO DE USUÁRIOS */}
        {usuariosFiltrados.length > 0 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', padding: '16px', borderTop: '1px solid #1f2635', background: '#161b26', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#8fa0dd' }}>
              Exibindo {indiceInicial + 1} a {Math.min(indiceFinal, usuariosFiltrados.length)} de{' '}
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{usuariosFiltrados.length}</span> usuários
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <button
                onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                disabled={paginaAtual === 1}
                className="btn-cancel"
                style={{ padding: '6px 12px', fontSize: '12px', margin: 0, opacity: paginaAtual === 1 ? 0.4 : 1, cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer' }}
              >
                ← Anterior
              </button>

              <span style={{ fontSize: '12px', color: '#ffffff' }}>
                Página <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{paginaAtual}</span> de {totalPaginas}
              </span>

              <button
                onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                disabled={paginaAtual === totalPaginas}
                className="btn-cancel"
                style={{ padding: '6px 12px', fontSize: '12px', margin: 0, opacity: paginaAtual === totalPaginas ? 0.4 : 1, cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer' }}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}