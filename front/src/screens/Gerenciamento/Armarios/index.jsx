import React, { useState, useEffect } from 'react';
import { useTravarScroll } from '../../../utils/travarScroll';
import Carregando from '../../../components/Carregando.jsx';
import { useParams } from 'react-router-dom';
import { armariosService } from '../../../services/armariosServices';
import { usuarioService } from '../../../services/usuariosServices';
import { nomearCorredor, rotuloCorredor, rotuloCorredorPlural } from '../../../utils/rotuloCorredor';
import ModalTrocarArmario from '../../../components/ModalTrocarArmario.jsx';
import { useEscola } from '../../../theme/contextoEscola.js';

const STATUS_LABEL = {
  disponivel: 'Disponível',
  alugado: 'Alugado',
  manutencao: 'Manutenção',
  funcionario: 'Funcionário',
};

const STATUS_BADGE_CLASS = {
  disponivel: 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50',
  alugado: 'bg-blue-950/60 text-blue-400 border border-blue-900/50',
  manutencao: 'bg-amber-950/60 text-amber-400 border border-amber-900/50',
  funcionario: 'bg-violet-950/60 text-violet-400 border border-violet-900/50',
};

export default function GerenciamentoArmarios() {
  const { schoolCode } = useParams(); 
  const [armarios, setArmarios] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [termoBusca, setTermoBusca] = useState('');
  const [corredorFiltro, setCorredorFiltro] = useState(''); // '' = todos os blocos
  const [termoBuscaUsuario, setTermoBuscaUsuario] = useState(''); 
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Estados de Paginação dos Armários
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 25; 

  // Estados para o Modal de Vínculo
  const [modalAberto, setModalAberto] = useState(false);
  const [armarioSelecionado, setArmarioSelecionado] = useState(null);
  // Modalidade da venda no balcão. Começa em 'anual' porque é o que a escola
  // vende para a maioria; o semestral só aparece se a instituição o oferecer.
  const [modalidadeVinculo, setModalidadeVinculo] = useState('anual');

  // Estados para o Modal de Atribuição a Funcionário (sem conta de usuário)
  const [modalFuncionarioAberto, setModalFuncionarioAberto] = useState(false);
  const [armarioFuncionario, setArmarioFuncionario] = useState(null);
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [salvandoFuncionario, setSalvandoFuncionario] = useState(false);
  const [erroFuncionario, setErroFuncionario] = useState(null);

  // Estados para o Modal de Criação em Lote
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [corredorLote, setCorredorLote] = useState('');
  const [inicioLote, setInicioLote] = useState('');
  const [fimLote, setFimLote] = useState('');
  const [criandoLote, setCriandoLote] = useState(false);
  const [erroLote, setErroLote] = useState(null);

  // A escola vem do EscolaContext (já carregada pelo layout da rota). O rótulo de
  // corredor (bloco|corredor) sai daqui. Antes esta tela buscava a escola de
  // novo só para extrair o UUID.
  const { escola, carregando: escolaCarregando } = useEscola();

  // Exclusao de um corredor inteiro, para desfazer um lote criado errado.
  const [corredorParaExcluir, setCorredorParaExcluir] = useState(null);

  // Armario cujo ocupante esta sendo transferido ou removido.
  const [armarioParaTrocar, setArmarioParaTrocar] = useState(null);

  // Congela o fundo com qualquer dialogo aberto. O de troca trava sozinho.
  useTravarScroll(modalAberto || modalFuncionarioAberto || modalLoteAberto || Boolean(corredorParaExcluir));
  const [excluindoCorredor, setExcluindoCorredor] = useState(false);

  // Derivado, não guardado em estado: setar estado no corpo do efeito provoca
  // renderização em cascata.
  const escolaNaoIdentificada = !escolaCarregando && !escola?.id;

  // Declarada ANTES do efeito que a usa. Chamar uma const declarada mais
  // abaixo funciona por acidente — o efeito so roda depois do render, quando a
  // linha ja executou — e quebra no dia em que alguem mover o codigo.
  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);

      // Armários e usuários são independentes: buscar em paralelo faz a tela
      // carregar no tempo da requisição mais lenta, não na soma das duas.
      // O filtro por escola acontece no servidor nos dois casos.
      const [respArmarios, respUsuarios] = await Promise.allSettled([
        armariosService.buscarTodos(schoolCode),
        usuarioService.buscarTodos(escola.id)
      ]);

      if (respArmarios.status === 'fulfilled' && Array.isArray(respArmarios.value)) {
        setArmarios(respArmarios.value);
      } else {
        if (respArmarios.status === 'rejected') {
          console.error("Erro específico ao buscar armários:", respArmarios.reason);
          setErro("Não foi possível carregar os armários desta instituição.");
        }
        setArmarios([]);
      }

      if (respUsuarios.status === 'fulfilled' && Array.isArray(respUsuarios.value)) {
        setUsuarios(respUsuarios.value);
      } else {
        if (respUsuarios.status === 'rejected') {
          console.error("Erro específico ao buscar usuários:", respUsuarios.reason);
        }
        setUsuarios([]);
      }
    } catch (err) {
      setErro('Erro geral ao processar dados do sistema.');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (escolaCarregando || !escola?.id) return;
    // A busca fica numa funcao assincrona declarada aqui dentro, que e o
    // formato recomendado para efeito que carrega dado: as atualizacoes de
    // estado saem do caminho sincrono do efeito e nao disparam renderizacao
    // em cascata na montagem.
    const buscar = async () => { await carregarDados(); };
    buscar();
    // carregarDados e recriada a cada render e nao entra nas dependencias de
    // proposito: incluir faria a busca rodar sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escola?.id, escolaCarregando]);

  const handleAlterarStatus = async (id, statusAtual) => {
    if (statusAtual === 'alugado' || statusAtual === 'funcionario') return;
    const novoStatus = statusAtual === 'disponivel' ? 'manutencao' : 'disponivel';
    try {
      await armariosService.atualizarStatus(id, novoStatus);
      setArmarios(prev => prev.map(a => a.id === id ? { ...a, status: novoStatus } : a));
    } catch {
      alert('Não foi possível alterar o status do armário.');
    }
  };

  const abrirModalVinculo = (armario) => {
    setArmarioSelecionado(armario);
    setTermoBuscaUsuario('');
    setModalAberto(true);
  };

  const abrirModalFuncionario = (armario) => {
    setArmarioFuncionario(armario);
    setNomeFuncionario('');
    setErroFuncionario(null);
    setModalFuncionarioAberto(true);
  };

  // Atribuição manual: só grava o nome digitado pelo admin, sem vincular a nenhuma
  // conta de usuário (funcionário não precisa de login no sistema).
  const handleAtribuirFuncionario = async (e) => {
    e.preventDefault();
    if (!armarioFuncionario) return;

    if (!nomeFuncionario.trim()) {
      setErroFuncionario('Informe o nome do funcionário.');
      return;
    }

    setErroFuncionario(null);
    setSalvandoFuncionario(true);
    try {
      await armariosService.atualizar(armarioFuncionario.id, {
        status: 'funcionario',
        usuarioId: null,
        usuarioNome: nomeFuncionario.trim()
      });

      setArmarios(prev => prev.map(a =>
        a.id === armarioFuncionario.id
          ? { ...a, status: 'funcionario', usuarioId: null, usuarioNome: nomeFuncionario.trim() }
          : a
      ));

      setModalFuncionarioAberto(false);
      setArmarioFuncionario(null);
    } catch (err) {
      setErroFuncionario(err.message || 'Erro ao atribuir o armário ao funcionário.');
    } finally {
      setSalvandoFuncionario(false);
    }
  };

  const handleVincularUsuario = async (usuarioId, usuarioNome, usuarioRole) => {
    if (!armarioSelecionado) return;

    // 🔒 TRAVA DE SEGURANÇA: Impede administradores de alocarem armários
    if (usuarioRole === 'admin') {
      alert('Ação não permitida: administradores não podem possuir ou ser vinculados a armários.');
      return;
    }

    try {
      await armariosService.atualizar(armarioSelecionado.id, {
        status: 'alugado',
        usuarioId,
        usuarioNome,
        modalidade: modalidadeVinculo
      });

      setArmarios(prev => prev.map(a => 
        a.id === armarioSelecionado.id 
          ? { ...a, status: 'alugado', usuarioId, usuarioNome } 
          : a
      ));

      setModalAberto(false);
      setArmarioSelecionado(null);
      setModalidadeVinculo('anual');
    } catch (err) {
      alert(err?.message || 'Erro ao vincular o usuário ao armário.');
    }
  };

  // Transfere o ocupante para outro armário. A locação paga acompanha — quem
  // pagou continua com um armário, só que outro.
  const handleTrocarArmario = async (novoArmarioId) => {
    const resultado = await armariosService.trocarArmario(armarioParaTrocar.id, novoArmarioId);

    setArmarios(prev => prev.map(a => {
      if (a.id === armarioParaTrocar.id) {
        return { ...a, status: 'disponivel', usuarioId: null, usuario_id: null, usuarioNome: null, usuario_nome: null };
      }
      if (a.id === novoArmarioId) {
        return {
          ...a,
          status: resultado.destino.status,
          usuarioId: resultado.destino.usuarioId,
          usuario_id: resultado.destino.usuarioId,
          usuarioNome: resultado.destino.usuarioNome,
          usuario_nome: resultado.destino.usuarioNome
        };
      }
      return a;
    }));

    setArmarioParaTrocar(null);
  };

  // Remove o ocupante. `excluirPagamento` apaga também a locação do histórico —
  // decisão que o modal obriga a tomar explicitamente.
  const handleRemoverOcupante = async (excluirPagamento) => {
    await armariosService.removerOcupante(armarioParaTrocar.id, excluirPagamento);

    setArmarios(prev => prev.map(a =>
      a.id === armarioParaTrocar.id
        ? { ...a, status: 'disponivel', usuarioId: null, usuario_id: null, usuarioNome: null, usuario_nome: null }
        : a
    ));

    setArmarioParaTrocar(null);
  };

  const handleExcluirArmario = async (id, statusAtual) => {
    if (statusAtual === 'alugado' || statusAtual === 'funcionario') {
      alert('Remova o vínculo (aluno ou funcionário) antes de excluir este armário.');
      return;
    }
    if (!window.confirm('Tem certeza que deseja excluir este armário permanentemente?')) return;

    try {
      await armariosService.excluir(id);
      setArmarios(prev => prev.filter(a => a.id !== id));
    } catch {
      alert('Erro ao excluir the armário.');
    }
  };

  // Armários do corredor escolhido para exclusão, separados pelo que impede a
  // operação: um armário alugado ou de funcionário guarda o vínculo de alguém,
  // e apagá-lo apagaria junto a referência da locação paga.
  const armariosDoCorredorAlvo = corredorParaExcluir
    ? armarios.filter(a => a.corredor === corredorParaExcluir)
    : [];
  const ocupadosNoCorredor = armariosDoCorredorAlvo.filter(
    a => a.status === 'alugado' || a.status === 'funcionario'
  );

  // Exclui o corredor inteiro. Serve para desfazer um lote criado errado —
  // por isso recusa por completo quando há ocupante, em vez de apagar só os
  // livres: exclusão pela metade deixaria o corredor num estado que ninguém
  // pediu e que é pior de consertar do que o erro original.
  const handleExcluirCorredor = async () => {
    if (!corredorParaExcluir || ocupadosNoCorredor.length > 0) return;

    setExcluindoCorredor(true);
    try {
      // Sequencial de propósito: a API exclui um por vez, e disparar 200
      // requisições ao mesmo tempo derrubaria o limite de taxa do backend.
      for (const armario of armariosDoCorredorAlvo) {
        await armariosService.excluir(armario.id);
      }

      const idsExcluidos = new Set(armariosDoCorredorAlvo.map(a => a.id));
      setArmarios(prev => prev.filter(a => !idsExcluidos.has(a.id)));

      // O corredor deixou de existir: manter o filtro apontando para ele
      // mostraria uma lista vazia sem explicação.
      if (corredorFiltro === corredorParaExcluir) setCorredorFiltro('');
      setPaginaAtual(1);
      setCorredorParaExcluir(null);
    } catch (err) {
      setErro(`Não foi possível excluir todos os armários. ${err.message || ''}`.trim());
    } finally {
      setExcluindoCorredor(false);
    }
  };

  const abrirModalLote = () => {
    setErroLote(null);
    setCorredorLote('');
    setInicioLote('');
    setFimLote('');
    setModalLoteAberto(true);
  };

  const handleCriarLote = async (e) => {
    e.preventDefault();
    setErroLote(null);

    if (!corredorLote.trim() || !inicioLote || !fimLote) {
      setErroLote('Preencha o corredor e o intervalo (início e fim) dos armários.');
      return;
    }

    try {
      setCriandoLote(true);
      await armariosService.criarEmLote(schoolCode, {
        corredor: corredorLote.trim(),
        inicio: inicioLote,
        fim: fimLote
      });

      setModalLoteAberto(false);
      await carregarDados();
    } catch (err) {
      setErroLote(err.message || 'Erro ao criar os armários em lote.');
    } finally {
      setCriandoLote(false);
    }
  };

  // Blocos que EXISTEM de fato, tirados dos próprios armários — nada de lista
  // fixa, que ficaria errada assim que a escola criasse um corredor novo.
  const corredoresExistentes = [...new Set(armarios.map(a => a.corredor).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

  const armariosFiltrados = armarios.filter(armario => {
    if (corredorFiltro && armario.corredor !== corredorFiltro) return false;

    const termo = termoBusca.toLowerCase();
    return (
      armario.nome?.toLowerCase().includes(termo) ||
      armario.corredor?.toLowerCase().includes(termo) ||
      armario.usuarioNome?.toLowerCase().includes(termo)
    );
  });

  const totalPaginas = Math.ceil(armariosFiltrados.length / itensPorPagina) || 1;
  
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const armariosPaginados = armariosFiltrados.slice(indiceInicial, indiceFinal);

  // 🎯 FILTRAGEM DO MODAL: Filtra apenas quem NÃO é admin (role !== 'admin')
  const usuariosFiltradosModal = usuarios.filter(usr => {
    const termo = termoBuscaUsuario.toLowerCase();
    const naoEAdmin = usr.role !== 'admin';
    
    return (
      naoEAdmin &&
      (usr.nome_completo?.toLowerCase().includes(termo) ||
       usr.email_institucional?.toLowerCase().includes(termo))
    );
  });

  if (escolaNaoIdentificada) {
    return (
      <div className="p-6 text-center text-red-400 font-medium bg-[var(--bg-color)] min-h-screen flex items-center justify-center">
        Não foi possível identificar a instituição correspondente.
      </div>
    );
  }

  if (carregando) {
    return <Carregando tela rotulo="Carregando armários" />;
  }

  return (
    <div className="p-4 sm:p-6 bg-[var(--bg-color)] min-h-screen text-[var(--on-bg)] font-sans">
      {/* Topbar Responsiva */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--primary-color)] font-display">Gerenciamento de Armários</h1>
          <p className="text-xs text-gray-400 mt-1">Instituição ativa: <span className="text-[var(--on-bg)] font-semibold uppercase">{schoolCode}</span></p>
        </div>

        {/* `flex-wrap` porque agora são três controles: busca, filtro de bloco
            e o botão. Entre 640px e 768px a linha somava ~600px de conteúdo
            fixo e o botão, com `whitespace-nowrap`, vazava para fora da tela
            em vez de descer. Com wrap ele cai para a linha de baixo. */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder={`Buscar por armário, ${rotuloCorredor(escola).toLowerCase()}...`}
            value={termoBusca}
            onChange={e => { setTermoBusca(e.target.value); setPaginaAtual(1); }}
            className="w-full sm:flex-1 sm:min-w-48 md:w-64 md:flex-none px-4 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--on-bg)] outline-none focus:border-[var(--primary-color)] transition-colors"
          />

          {/* Volta para a página 1 ao filtrar: sem isso, quem estivesse na
              página 5 e filtrasse um bloco de 3 armários veria lista vazia. */}
          <select
            value={corredorFiltro}
            onChange={e => { setCorredorFiltro(e.target.value); setPaginaAtual(1); }}
            aria-label={`Filtrar por ${rotuloCorredor(escola).toLowerCase()}`}
            className="w-full sm:w-auto sm:min-w-36 px-4 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--on-bg)] outline-none focus:border-[var(--primary-color)] transition-colors"
          >
            <option value="">{`Todos os ${rotuloCorredorPlural(escola)}`}</option>
            {corredoresExistentes.map(corredor => (
              <option key={corredor} value={corredor}>{nomearCorredor(escola, corredor)}</option>
            ))}
          </select>
          {/* Só aparece com um corredor filtrado: é a forma de deixar claro
              O QUE vai ser apagado antes de abrir a confirmação. */}
          {corredorFiltro && (
            <button
              onClick={() => setCorredorParaExcluir(corredorFiltro)}
              className="w-full sm:w-auto shrink-0 px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap text-center"
            >
              Excluir {nomearCorredor(escola, corredorFiltro).toLowerCase()}
            </button>
          )}

          <button
            onClick={abrirModalLote}
            className="w-full sm:w-auto shrink-0 px-4 py-2 bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] border border-[var(--primary-color)]/30 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap text-center"
          >
            + Adicionar Armários
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-sm">
          ⚠️ {erro}
        </div>
      )}

      {/* Tabela Embrulhada em Scroll Horizontal Automatizado */}
      <div className="overflow-x-auto w-full border border-[var(--border-color)] bg-[var(--surface-color)]/60 rounded-xl backdrop-blur-md">
        {/* `lckp-tabela-cartao`: abaixo de 767px cada linha vira um cartão com
            rótulo e valor, em vez de uma tabela de 700px que só se lê
            arrastando de lado — e cujas ações ficavam fora da tela. Depende
            do `data-label` em cada <td>. */}
        <table className="w-full text-left border-collapse min-w-175 lckp-tabela-cartao">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--surface-raised)] text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="p-4">Identificação</th>
              <th className="p-4">{rotuloCorredor(escola)}</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Ocupante</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] text-sm text-gray-300">
            {armariosPaginados.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  Nenhum armário encontrado cadastrado para esta escola.
                </td>
              </tr>
            ) : (
              armariosPaginados.map((armario) => (
                <tr key={armario.id} className="hover:bg-[var(--surface-raised)]/40 transition-colors">
                  <td data-label="Identificação" className="p-4 font-bold text-[var(--on-bg)] whitespace-nowrap">{armario.nome}</td>
                  <td data-label={rotuloCorredor(escola)} className="p-4 whitespace-nowrap">{nomearCorredor(escola, armario.corredor)}</td>
                  <td data-label="Estado" className="p-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${STATUS_BADGE_CLASS[armario.status] || STATUS_BADGE_CLASS.disponivel}`}>
                      {STATUS_LABEL[armario.status] || armario.status}
                    </span>
                  </td>
                  <td data-label="Ocupante" className="p-4 max-w-45 truncate">
                    {armario.usuarioNome ? (
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-[var(--on-bg)] font-medium truncate" title={armario.usuarioNome}>
                          {armario.usuarioNome}
                        </span>
                        {/* "Trocar" e não "Remover": desvincular deixa o armário
                            livre, mas o aluno pagou — a escola quase sempre quer
                            MOVER. Remover continua possível, dentro do modal, e
                            lá exige dizer o que fazer com o pagamento. */}
                        <button
                          onClick={() => setArmarioParaTrocar(armario)}
                          className="text-xs text-[var(--primary-color)] hover:brightness-125 underline bg-transparent border-none cursor-pointer p-0 shrink-0"
                        >
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">Nenhum</span>
                    )}
                  </td>
                  <td data-label="Ações" className="p-4">
                    <div className="flex gap-1.5 justify-center items-center flex-wrap max-w-70 mx-auto">
                      {armario.status === 'disponivel' && (
                        <button
                          onClick={() => abrirModalVinculo(armario)}
                          className="px-2.5 py-1 bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] border border-[var(--primary-color)]/30 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          Vincular Aluno
                        </button>
                      )}

                      {armario.status === 'disponivel' && (
                        <button
                          onClick={() => abrirModalFuncionario(armario)}
                          className="px-2.5 py-1 bg-violet-950/40 hover:bg-violet-900/40 text-violet-400 border border-violet-900/40 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          Atribuir a Funcionário
                        </button>
                      )}

                      {armario.status !== 'alugado' && armario.status !== 'funcionario' && (
                        <button
                          onClick={() => handleAlterarStatus(armario.id, armario.status)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                            armario.status === 'manutencao'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40 hover:bg-emerald-900/40'
                              : 'bg-amber-950/40 text-amber-400 border-amber-900/40 hover:bg-amber-900/40'
                          }`}
                        >
                          {armario.status === 'manutencao' ? 'Disponibilizar' : 'Manutenção'}
                        </button>
                      )}

                      <button
                        onClick={() => handleExcluirArmario(armario.id, armario.status)}
                        disabled={armario.status === 'alugado' || armario.status === 'funcionario'}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                          armario.status === 'alugado' || armario.status === 'funcionario'
                            ? 'bg-gray-800 text-gray-600 border-transparent cursor-not-allowed'
                            : 'bg-red-950/40 text-red-400 border-red-900/40 hover:bg-red-900/40'
                        }`}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Rodapé e Controles de Paginação */}
        {armariosFiltrados.length > 0 && (
          <div className="p-4 bg-[var(--surface-raised)] border-t border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-xs text-gray-400 text-center sm:text-left">
              Exibindo {indiceInicial + 1} a {Math.min(indiceFinal, armariosFiltrados.length)} de{' '}
              <span className="text-[var(--on-bg)] font-semibold">{armariosFiltrados.length}</span> armários
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                disabled={paginaAtual === 1}
                className="px-3 py-1.5 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-gray-300 hover:bg-[var(--surface-raised)] hover:text-[var(--on-bg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>

              <span className="text-xs text-gray-300 px-1 whitespace-nowrap">
                Página <span className="text-[var(--primary-color)] font-bold">{paginaAtual}</span> de{' '}
                <span className="text-gray-400">{totalPaginas}</span>
              </span>

              <button
                onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                disabled={paginaAtual === totalPaginas}
                className="px-3 py-1.5 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-gray-300 hover:bg-[var(--surface-raised)] hover:text-[var(--on-bg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE VÍNCULO DE ALUNO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            
            <div className="p-4 sm:p-5 border-b border-[var(--border-color)] bg-[var(--surface-raised)]">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[var(--on-bg)]">Vincular Aluno ao Armário {armarioSelecionado?.nome}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Mostrando apenas alunos associados a esta instituição de ensino. Administradores estão ocultados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setModalAberto(false); setArmarioSelecionado(null); setModalidadeVinculo('anual'); }}
                  className="text-gray-400 hover:text-[var(--on-bg)] transition-colors text-sm font-medium bg-transparent border-none cursor-pointer shrink-0"
                >
                  ✕ Fechar
                </button>
              </div>

              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Pesquisar aluno por nome ou e-mail..."
                  value={termoBuscaUsuario}
                  onChange={e => setTermoBuscaUsuario(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--on-bg)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder:text-gray-500"
                />
              </div>

              {/* Só aparece se a instituição oferecer as duas modalidades.
                  Escola que vende só anual não precisa de uma escolha com uma
                  opção — e o backend recusaria o semestral de qualquer forma. */}
              {escola?.permite_semestral && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 mb-2">Modalidade desta locação</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: 'anual',
                        titulo: 'Anual',
                        valor: escola.valor_armario,
                        dia: escola.encerramento_dia ?? 20,
                        mes: escola.encerramento_mes ?? 12
                      },
                      {
                        id: 'semestral',
                        titulo: 'Semestral',
                        valor: escola.valor_armario_semestral,
                        dia: escola.encerramento_semestral_dia ?? 6,
                        mes: escola.encerramento_semestral_mes ?? 7
                      }
                    ].map((opcao) => {
                      const ativa = modalidadeVinculo === opcao.id;
                      return (
                        <button
                          key={opcao.id}
                          type="button"
                          onClick={() => setModalidadeVinculo(opcao.id)}
                          aria-pressed={ativa}
                          className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                            ativa
                              ? 'bg-[var(--primary-color)]/15 border-[var(--primary-color)] text-[var(--on-bg)]'
                              : 'bg-[var(--bg-color)] border-[var(--border-color)] text-gray-300 hover:border-[var(--border-color)]'
                          }`}
                        >
                          <span className="text-sm font-bold">{opcao.titulo}</span>
                          {/* Valor e prazo na tela: quem está no balcão precisa
                              saber o que está registrando sem abrir Configurações. */}
                          <span className="text-xs text-[var(--primary-color)] font-semibold">
                            {Number(opcao.valor) > 0
                              ? Number(opcao.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                              : 'valor não configurado'}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            até {String(opcao.dia).padStart(2, '0')}/{String(opcao.mes).padStart(2, '0')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto flex-1 divide-y divide-[var(--border-color)]/60">
              {usuariosFiltradosModal.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm">Nenhum aluno elegível encontrado.</p>
                  <p className="text-xs text-gray-600 mt-1">Contas de administradores não constam nesta alocação.</p>
                </div>
              ) : (
                usuariosFiltradosModal.map((usr) => (
                  <div key={usr.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 px-2 rounded-xl hover:bg-[var(--surface-raised)]/30 transition-colors group gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--on-bg)] group-hover:text-[var(--primary-color)] transition-colors truncate">
                        {usr.nome_completo || 'Sem Nome Cadastrado'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {usr.email_institucional || 'Sem e-mail institucional'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleVincularUsuario(usr.id, usr.nome_completo, usr.role)}
                      className="text-xs bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] border border-[var(--primary-color)]/30 px-3 py-2 rounded-xl font-bold transition-colors whitespace-nowrap w-full sm:w-auto text-center"
                    >
                      Selecionar Aluno
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-raised)] flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-gray-500 font-medium text-center sm:text-left">
                Alunos elegíveis listados: {usuariosFiltradosModal.length}
              </span>
              <button
                onClick={() => { setModalAberto(false); setArmarioSelecionado(null); setModalidadeVinculo('anual'); }}
                className="w-full sm:w-auto px-5 py-2 bg-[var(--surface-raised)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl text-xs font-semibold text-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transferir ou remover o ocupante. Recebe apenas os armários livres —
          a lista de destino não pode oferecer um armário já ocupado. */}
      {armarioParaTrocar && (
        <ModalTrocarArmario
          armario={armarioParaTrocar}
          escola={escola}
          armariosDisponiveis={armarios.filter((a) => a.status === 'disponivel')}
          ocupado={Boolean(armarioParaTrocar.usuarioId || armarioParaTrocar.usuario_id)}
          aoFechar={() => setArmarioParaTrocar(null)}
          aoTrocar={handleTrocarArmario}
          aoRemover={handleRemoverOcupante}
        />
      )}

      {/* Confirmação de exclusão do corredor. Não é window.confirm porque
          precisa MOSTRAR a contagem e, se houver ocupante, explicar por que a
          operação está bloqueada — coisa que um confirm de uma linha não faz. */}
      {corredorParaExcluir && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--surface-raised)]">
              <h3 className="text-base font-bold text-[var(--on-bg)]">
                Excluir {nomearCorredor(escola, corredorParaExcluir).toLowerCase()}
              </h3>
            </div>

            <div className="p-4 flex flex-col gap-3 text-sm text-gray-300">
              {ocupadosNoCorredor.length > 0 ? (
                <>
                  <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs">
                    ⚠️ {ocupadosNoCorredor.length} armário{ocupadosNoCorredor.length === 1 ? '' : 's'} deste{' '}
                    {rotuloCorredor(escola).toLowerCase()} {ocupadosNoCorredor.length === 1 ? 'está ocupado' : 'estão ocupados'}.
                  </div>
                  <p>
                    Apagar levaria junto o vínculo de quem pagou. Remova os vínculos
                    primeiro: {ocupadosNoCorredor.slice(0, 8).map(a => a.nome).join(', ')}
                    {ocupadosNoCorredor.length > 8 && ` e mais ${ocupadosNoCorredor.length - 8}`}.
                  </p>
                </>
              ) : (
                <p>
                  Isto apaga <strong className="text-[var(--on-bg)]">{armariosDoCorredorAlvo.length} armário
                  {armariosDoCorredorAlvo.length === 1 ? '' : 's'}</strong> de forma permanente. Não há como desfazer.
                </p>
              )}
            </div>

            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--surface-raised)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCorredorParaExcluir(null)}
                disabled={excluindoCorredor}
                className="px-4 py-2 text-sm text-gray-300 hover:text-[var(--on-bg)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluirCorredor}
                disabled={excluindoCorredor || ocupadosNoCorredor.length > 0 || armariosDoCorredorAlvo.length === 0}
                className="px-4 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-900/50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {excluindoCorredor ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalLoteAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCriarLote}
            className="w-full max-w-md bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--surface-raised)]">
              <h3 className="text-base font-bold text-[var(--on-bg)]">Adicionar Armários em Lote</h3>
              <p className="text-xs text-gray-400 mt-1">
                {`Informe o ${rotuloCorredor(escola).toLowerCase()} e o intervalo de números.`}
              </p>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {erroLote && (
                <div className="p-2.5 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs">
                  ⚠️ {erroLote}
                </div>
              )}

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {rotuloCorredor(escola)}
                <input
                  type="text"
                  value={corredorLote}
                  onChange={e => setCorredorLote(e.target.value)}
                  placeholder="Ex: 1"
                  className="w-full px-3 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--on-bg)] outline-none focus:border-[var(--primary-color)] transition-colors normal-case font-normal"
                />
              </label>

              {/* `min-w-0` nos rótulos é o que conserta o vazamento: um item
                  flex não encolhe abaixo da largura intrínseca do conteúdo, e
                  <input type="number"> tem ~170px natural no navegador. Dois
                  lado a lado somavam ~352px dentro dos 311px que sobram do
                  modal num celular de 375px, e transbordavam. */}
              <div className="flex flex-col min-[380px]:flex-row gap-3">
                <label className="flex-1 min-w-0 flex flex-col gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Armário Início
                  <input
                    type="number"
                    min="1"
                    value={inicioLote}
                    onChange={e => setInicioLote(e.target.value)}
                    placeholder="Ex: 1"
                    className="w-full px-3 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--on-bg)] outline-none focus:border-[var(--primary-color)] transition-colors normal-case font-normal"
                  />
                </label>

                <label className="flex-1 min-w-0 flex flex-col gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Armário Fim
                  <input
                    type="number"
                    min="1"
                    value={fimLote}
                    onChange={e => setFimLote(e.target.value)}
                    placeholder="Ex: 100"
                    className="w-full px-3 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--on-bg)] outline-none focus:border-[var(--primary-color)] transition-colors normal-case font-normal"
                  />
                </label>
              </div>
            </div>

            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--surface-raised)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalLoteAberto(false)}
                disabled={criandoLote}
                className="px-4 py-1.5 bg-[var(--surface-raised)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criandoLote}
                className="px-4 py-1.5 bg-[var(--primary-color)]/15 hover:bg-[var(--primary-color)]/25 border border-[var(--primary-color)]/30 rounded-lg text-xs font-semibold text-[var(--primary-color)] transition-colors disabled:opacity-50"
              >
                {criandoLote ? 'Criando...' : 'Criar Armários'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE ATRIBUIÇÃO A FUNCIONÁRIO (sem conta de usuário) */}
      {modalFuncionarioAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAtribuirFuncionario}
            className="w-full max-w-md bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--surface-raised)]">
              <h3 className="text-base font-bold text-[var(--on-bg)]">Atribuir Armário {armarioFuncionario?.nome} a Funcionário</h3>
              <p className="text-xs text-gray-400 mt-1">
                Não cria login nem usuário — só grava o nome de quem usa o armário.
              </p>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {erroFuncionario && (
                <div className="p-2.5 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs">
                  ⚠️ {erroFuncionario}
                </div>
              )}

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Nome do funcionário
                <input
                  type="text"
                  value={nomeFuncionario}
                  onChange={e => setNomeFuncionario(e.target.value)}
                  placeholder="Ex: Maria da Secretaria"
                  autoFocus
                  className="w-full px-3 py-2 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--on-bg)] outline-none focus:border-violet-500 transition-colors normal-case font-normal"
                />
              </label>
            </div>

            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--surface-raised)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setModalFuncionarioAberto(false); setArmarioFuncionario(null); }}
                disabled={salvandoFuncionario}
                className="px-4 py-1.5 bg-[var(--surface-raised)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoFuncionario}
                className="px-4 py-1.5 bg-violet-950/60 hover:bg-violet-900/60 border border-violet-900/50 rounded-lg text-xs font-semibold text-violet-400 transition-colors disabled:opacity-50"
              >
                {salvandoFuncionario ? 'Salvando...' : 'Atribuir Armário'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}