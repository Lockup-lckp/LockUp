import React, { useEffect, useState } from 'react';
import { useTravarScroll } from '../../utils/travarScroll';
import { authService } from '../../services/authService';
import { usuarioService } from '../../services/usuariosServices';
import { escolaService } from '../../services/escolaService';
import Carregando from '../../components/Carregando.jsx';
import { leadsService } from '../../services/leadsService';

const ITENS_POR_PAGINA = 20;

const STATUS_LEAD_LABEL = {
  pendente: 'Pendente',
  em_contato: 'Em contato',
  fechado: 'Fechado',
  descartado: 'Descartado'
};

function lerSessao() {
  try {
    return JSON.parse(sessionStorage.getItem('usuario') || 'null');
  } catch {
    return null;
  }
}

function TelaLogin({ onLogado }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const resposta = await authService.login(email, senha);
      const usuarioLogado = resposta.usuario || resposta.user || resposta;

      if (usuarioLogado.role !== 'superadmin') {
        setErro('Esta área é restrita ao administrador da plataforma.');
        return;
      }

      sessionStorage.setItem('token', resposta.token);
      sessionStorage.setItem('usuario', JSON.stringify(usuarioLogado));
      onLogado(usuarioLogado);
    } catch (err) {
      setErro(err.message || 'E-mail ou senha inválidos.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-[var(--surface-color)]/60 border border-white/10 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-1">Painel LCKP</h1>
        <p className="text-gray-400 text-sm mb-6">Acesso restrito ao administrador da plataforma.</p>

        {erro && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-3 text-sm mb-4">
            ⚠️ {erro}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={carregando}
            className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-1">Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={carregando}
            className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
          />
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-[var(--on-primary)] font-bold px-6 py-2.5 rounded-lg hover:brightness-105 active:scale-[0.99] transition-[filter] disabled:opacity-60"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

function TelaTrocarSenha({ onTrocada }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (novaSenha.length < 8) {
      setErro('Use uma senha com pelo menos 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }

    setCarregando(true);
    try {
      const token = sessionStorage.getItem('token');
      await authService.alterarSenha(novaSenha, token);

      const usuario = lerSessao();
      if (usuario) {
        usuario.precisa_alterar_senha = false;
        sessionStorage.setItem('usuario', JSON.stringify(usuario));
      }
      onTrocada();
    } catch (err) {
      setErro(err.message || 'Não foi possível trocar a senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-[var(--surface-color)]/60 border border-white/10 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-1">Defina sua senha</h1>
        <p className="text-gray-400 text-sm mb-6">
          Por segurança, troque a senha inicial antes de acessar o painel.
        </p>

        {erro && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-3 text-sm mb-4">
            ⚠️ {erro}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-1">Nova senha</label>
          <input
            type="password"
            required
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            disabled={carregando}
            className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-1">Confirmar nova senha</label>
          <input
            type="password"
            required
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            disabled={carregando}
            className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
          />
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-[var(--on-primary)] font-bold px-6 py-2.5 rounded-lg hover:brightness-105 active:scale-[0.99] transition-[filter] disabled:opacity-60"
        >
          {carregando ? 'Salvando...' : 'Salvar e continuar'}
        </button>
      </form>
    </div>
  );
}

function Painel({ usuario, onSair }) {
  const [superadmins, setSuperadmins] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  // Instituições (escolas) da plataforma: lista, cadastro e configuração do
  // meio de pagamento. Não há comissão: a LCKP cobra licenciamento.
  const [escolas, setEscolas] = useState([]);
  const [carregandoEscolas, setCarregandoEscolas] = useState(true);
  const [erroEscolas, setErroEscolas] = useState('');
  const [mensagemEscola, setMensagemEscola] = useState('');
  const [termoBuscaEscola, setTermoBuscaEscola] = useState('');
  const [paginaEscolaAtual, setPaginaEscolaAtual] = useState(1);

  const [novaEscolaNome, setNovaEscolaNome] = useState('');
  const [novaEscolaCodigo, setNovaEscolaCodigo] = useState('');
  const [novaEscolaValor, setNovaEscolaValor] = useState('');
  const [criandoEscola, setCriandoEscola] = useState(false);

  const [escolaEditando, setEscolaEditando] = useState(null);

  // Congela o fundo enquanto o formulario da escola esta aberto.
  useTravarScroll(Boolean(escolaEditando));

  // Catalogo vindo do backend: e ele que diz quais gateways existem e quais
  // credenciais cada um pede. Antes os campos do PagBank estavam escritos aqui.
  const [catalogo, setCatalogo] = useState({ padrao: 'bancodobrasil', gateways: [] });

  // Catalogo de gateways: carregado uma vez. Falha aqui nao pode derrubar o
  // painel inteiro -- o seletor apenas fica vazio. Declarado DEPOIS do estado
  // de proposito: usar setCatalogo antes da linha que o cria funciona por
  // acidente (o efeito roda depois do render) e o lint reprova, com razao.
  useEffect(() => {
    escolaService.buscarCatalogoGateways()
      .then(setCatalogo)
      .catch((e) => console.error('Nao foi possivel carregar o catalogo de gateways:', e));
  }, []);
  const [credenciaisEdit, setCredenciaisEdit] = useState({});
  const [valorArmarioEdit, setValorArmarioEdit] = useState('');
  const [gatewayIdEdit, setGatewayIdEdit] = useState('');
  const [gatewayEdit, setGatewayEdit] = useState('mercadopago');
  // Ambiente do gateway. Chamava-se pagbank_ambiente quando havia um gateway
  // so; a coluna generica e `gateway_ambiente`, que e a que os adaptadores leem.
  const [ambienteEdit, setAmbienteEdit] = useState('producao');
  // Resultado do "testar credencial" / "registrar webhook" do Banco do Brasil.
  const [diagnostico, setDiagnostico] = useState(null); // { tipo, texto }
  const [testando, setTestando] = useState(false);
  const [tipoMatriculaEdit, setTipoMatriculaEdit] = useState('rm');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');

  // Pedidos de contato (leads) recebidos pela landing page.
  const [leads, setLeads] = useState([]);
  const [carregandoLeads, setCarregandoLeads] = useState(true);
  const [erroLeads, setErroLeads] = useState('');
  const [paginaLeadAtual, setPaginaLeadAtual] = useState(1);

  const carregar = async () => {
    setCarregando(true);
    setErro('');
    try {
      const todos = await usuarioService.buscarTodos();
      setSuperadmins(todos.filter((u) => u.role === 'superadmin'));
    } catch {
      setErro('Não foi possível carregar a lista de administradores.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarEscolas = async () => {
    setCarregandoEscolas(true);
    setErroEscolas('');
    try {
      const todas = await escolaService.listarTodas();
      setEscolas(Array.isArray(todas) ? todas : []);
    } catch {
      setErroEscolas('Não foi possível carregar a lista de instituições.');
    } finally {
      setCarregandoEscolas(false);
    }
  };

  const carregarLeads = async () => {
    setCarregandoLeads(true);
    setErroLeads('');
    try {
      const todos = await leadsService.listarTodos();
      setLeads(Array.isArray(todos) ? todos : []);
    } catch {
      setErroLeads('Não foi possível carregar os pedidos de contato.');
    } finally {
      setCarregandoLeads(false);
    }
  };

  useEffect(() => {
    // As tres cargas sao independentes e disparam juntas, dentro de uma funcao
    // assincrona: no corpo do efeito elas atualizariam estado de forma sincrona
    // na montagem, provocando renderizacao em cascata.
    const carregarTudo = async () => {
      await Promise.allSettled([carregar(), carregarEscolas(), carregarLeads()]);
    };
    carregarTudo();
  }, []);

  // Instituições filtradas pela busca + fatiadas em páginas de 20 (evita renderizar
  // a plataforma inteira de uma vez quando houver muitas escolas cadastradas).
  const escolasFiltradas = escolas.filter((escola) => {
    const termo = termoBuscaEscola.trim().toLowerCase();
    if (!termo) return true;
    return (
      escola.name?.toLowerCase().includes(termo) ||
      escola.codigo?.toLowerCase().includes(termo)
    );
  });
  const totalPaginasEscolas = Math.ceil(escolasFiltradas.length / ITENS_POR_PAGINA) || 1;
  const escolasPaginadas = escolasFiltradas.slice(
    (paginaEscolaAtual - 1) * ITENS_POR_PAGINA,
    paginaEscolaAtual * ITENS_POR_PAGINA
  );

  const handleBuscaEscolaChange = (e) => {
    setTermoBuscaEscola(e.target.value);
    setPaginaEscolaAtual(1);
  };

  const totalPaginasLeads = Math.ceil(leads.length / ITENS_POR_PAGINA) || 1;
  const leadsPaginados = leads.slice(
    (paginaLeadAtual - 1) * ITENS_POR_PAGINA,
    paginaLeadAtual * ITENS_POR_PAGINA
  );

  const handleMudarStatusLead = async (lead, novoStatus) => {
    try {
      const atualizado = await leadsService.atualizarStatus(lead.id, novoStatus);
      setLeads((anteriores) => anteriores.map((l) => (l.id === lead.id ? { ...l, ...atualizado } : l)));
    } catch (err) {
      setErroLeads(err.message || 'Erro ao atualizar o status do pedido.');
    }
  };

  const handleUsarDadosLead = (lead) => {
    setNovaEscolaNome(lead.nome_escola);
    setMensagemEscola(`Preenchemos o nome a partir do pedido de "${lead.contato_nome}". Complete o código e o valor do armário para cadastrar.`);
  };

  const handleCriarEscolaSubmit = async (e) => {
    e.preventDefault();
    setMensagemEscola('');
    setErroEscolas('');

    if (!novaEscolaNome.trim() || !novaEscolaCodigo.trim()) {
      setErroEscolas('Nome e código da instituição são obrigatórios.');
      return;
    }

    setCriandoEscola(true);
    try {
      await escolaService.criar({
        name: novaEscolaNome.trim(),
        codigo: novaEscolaCodigo.trim().toLowerCase(),
        valor_armario: novaEscolaValor.trim() === '' ? null : parseFloat(novaEscolaValor.replace(',', '.'))
      });
      setMensagemEscola('Instituição cadastrada! Use "Editar" na lista para configurar o meio de pagamento.');
      setNovaEscolaNome('');
      setNovaEscolaCodigo('');
      setNovaEscolaValor('');
      carregarEscolas();
    } catch (err) {
      setErroEscolas(err.message || 'Erro ao cadastrar a instituição.');
    } finally {
      setCriandoEscola(false);
    }
  };

  const abrirEdicaoEscola = (escola) => {
    setEscolaEditando(escola);
    setCredenciaisEdit({});
    setValorArmarioEdit(escola.valor_armario != null ? String(escola.valor_armario) : '');
    setGatewayIdEdit(escola.gateway_recipient_id || '');
    setGatewayEdit(escola.gateway || 'mercadopago');
    setAmbienteEdit(escola.gateway_ambiente || escola.pagbank_ambiente || 'producao');
    setDiagnostico(null);
    setTipoMatriculaEdit(escola.tipo_matricula || 'rm');
    setErroEdicao('');
  };

  const fecharEdicaoEscola = () => setEscolaEditando(null);

  const handleSalvarEdicaoEscola = async (e) => {
    e.preventDefault();
    if (!escolaEditando) return;

    setErroEdicao('');

    setSalvandoEdicao(true);
    try {
      const payload = {
        valor_armario: valorArmarioEdit.trim() === '' ? null : parseFloat(valorArmarioEdit.replace(',', '.')),
        gateway_recipient_id: gatewayIdEdit.trim() || null,
        gateway: gatewayEdit,
        gateway_ambiente: ambienteEdit,
        tipo_matricula: tipoMatriculaEdit
      };
      // Só envia os campos de credencial preenchidos: em branco significa
      // manter a credencial atual, e mandar vazio a APAGARIA. Vale para
      // qualquer gateway — o PagBank é só o campo `token` aqui dentro.
      const preenchidas = Object.fromEntries(
        Object.entries(credenciaisEdit).filter(([, v]) => String(v || '').trim())
      );
      if (Object.keys(preenchidas).length) {
        payload.credenciais_gateway = preenchidas;
      }

      await escolaService.atualizarConfiguracao(escolaEditando.id, payload);
      setEscolaEditando(null);
      carregarEscolas();
    } catch (err) {
      setErroEdicao(err.message || 'Erro ao salvar as alterações.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Conferência da credencial do Banco do Brasil.
  //
  // Autentica de verdade contra o banco. Existe porque o modo antigo de
  // descobrir que a credencial estava errada era o primeiro aluno não
  // conseguindo pagar — e aí já é tarde, e ninguém liga o erro à configuração.
  const testarCredencial = async () => {
    setTestando(true);
    setDiagnostico(null);
    try {
      const r = await escolaService.testarCredencialGateway(escolaEditando.id);
      setDiagnostico({
        tipo: r.webhook_registrado ? 'sucesso' : 'atencao',
        texto: r.webhook_registrado
          ? `Autenticou no Banco do Brasil (${r.ambiente}). Webhook já registrado.`
          : `Autenticou no Banco do Brasil (${r.ambiente}), mas o webhook ainda NÃO está registrado — sem ele o aluno paga e o armário não abre.`
      });
    } catch (err) {
      setDiagnostico({ tipo: 'erro', texto: err.message });
    } finally {
      setTestando(false);
    }
  };

  const registrarWebhook = async () => {
    setTestando(true);
    setDiagnostico(null);
    try {
      const r = await escolaService.registrarWebhookGateway(escolaEditando.id);
      setDiagnostico({ tipo: 'sucesso', texto: `Webhook registrado em ${r.webhookUrl}` });
    } catch (err) {
      setDiagnostico({ tipo: 'erro', texto: err.message });
    } finally {
      setTestando(false);
    }
  };

  const handleExcluirEscola = async (escola) => {
    if (!window.confirm(`Excluir a instituição "${escola.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await escolaService.excluir(escola.id);
      carregarEscolas();
    } catch (err) {
      setErroEscolas(err.message || 'Erro ao excluir a instituição.');
    }
  };

  const handleAdicionar = async (e) => {
    e.preventDefault();
    setMensagem('');
    setErro('');
    setEnviando(true);
    try {
      await usuarioService.criar({
        nome_completo: novoNome,
        email_institucional: novoEmail,
        role: 'superadmin'
      });
      setMensagem('Superadmin criado! A senha inicial é "mudar123" — será exigida a troca no primeiro acesso.');
      setNovoNome('');
      setNovoEmail('');
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao criar superadmin.');
    } finally {
      setEnviando(false);
    }
  };

  const handleRemover = async (alvo) => {
    if (alvo.id === usuario.id) return; // proteção extra no cliente (backend já bloqueia)
    if (!window.confirm(`Remover o acesso de superadmin de "${alvo.nome_completo}"?`)) return;

    try {
      await usuarioService.excluir(alvo.id);
      carregar();
    } catch (err) {
      setErro(err.message || 'Erro ao remover superadmin.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-white">
      <header className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/10">
        <span className="text-lg font-extrabold tracking-wider font-display bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] bg-clip-text text-transparent">
          Painel LCKP — Superadmin
        </span>
        <button
          onClick={onSair}
          className="text-sm border border-red-500/40 text-red-400 px-4 py-1.5 rounded-md hover:bg-red-500/10 transition-colors"
        >
          Sair
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        <h2 className="text-xl font-bold mb-1">Instituições (escolas)</h2>
        <p className="text-gray-400 text-sm mb-6">
          Valor do armário e meio de pagamento de cada instituição contratada. O valor pago pelo aluno vai inteiro para a conta da escola.
        </p>

        {erroEscolas && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-3 text-sm mb-4">
            ⚠️ {erroEscolas}
          </div>
        )}
        {mensagemEscola && (
          <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-lg p-3 text-sm mb-4">
            ✅ {mensagemEscola}
          </div>
        )}

        <input
          type="text"
          placeholder="Pesquisar por nome ou código da escola..."
          value={termoBuscaEscola}
          onChange={handleBuscaEscolaChange}
          className="w-full bg-[var(--surface-color)]/60 border border-white/10 rounded-md px-3 py-2 text-white text-sm mb-4 focus:outline-none focus:border-[var(--primary-color)]"
        />

        <div className="bg-[var(--surface-color)]/60 border border-white/10 rounded-xl overflow-hidden mb-8">
          {carregandoEscolas ? (
            <Carregando linha rotulo="Carregando instituições" />
          ) : escolasFiltradas.length === 0 ? (
            <p className="p-4 text-gray-400 text-sm">
              {termoBuscaEscola ? 'Nenhuma instituição encontrada para essa busca.' : 'Nenhuma instituição cadastrada ainda.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-150">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                    <th className="p-3">Instituição</th>
                    <th className="p-3">Código</th>
                    <th className="p-3">Valor do armário</th>
                    <th className="p-3">Credenciais</th>
                    <th className="p-3">Recebimento</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {escolasPaginadas.map((escola) => (
                    <tr key={escola.id}>
                      <td className="p-3 font-medium whitespace-nowrap">{escola.name}</td>
                      <td className="p-3 text-gray-400 whitespace-nowrap">{escola.codigo}</td>
                      <td className="p-3 whitespace-nowrap">
                        {escola.valor_armario != null
                          ? Number(escola.valor_armario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {escola.credenciais_configuradas || escola.pagbank_configurado ? 'Configurado' : '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {escola.gateway_recipient_id ? (
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full">Ativo</span>
                        ) : (
                          <span className="text-xs bg-white/5 text-gray-500 border border-white/10 px-2 py-1 rounded-full">Conta da escola</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirEdicaoEscola(escola)}
                            className="text-sm text-[var(--primary-color)] border border-[var(--primary-color)]/40 px-3 py-1.5 rounded-md hover:bg-[var(--primary-color)]/10 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleExcluirEscola(escola)}
                            className="text-sm text-red-400 border border-red-500/40 px-3 py-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {escolasFiltradas.length > 0 && (
            <div className="flex items-center justify-between gap-3 p-3 border-t border-white/10">
              <span className="text-xs text-gray-500">
                Página <span className="text-[var(--primary-color)] font-semibold">{paginaEscolaAtual}</span> de {totalPaginasEscolas}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaEscolaAtual((p) => Math.max(p - 1, 1))}
                  disabled={paginaEscolaAtual === 1}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPaginaEscolaAtual((p) => Math.min(p + 1, totalPaginasEscolas))}
                  disabled={paginaEscolaAtual === totalPaginasEscolas}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold mb-1">Solicitações de cadastro</h2>
        <p className="text-gray-400 text-sm mb-6">
          Pedidos de contato enviados pelo formulário da landing page. Nada aqui vira instituição sozinho —
          use "Usar estes dados" para pré-preencher o cadastro abaixo depois de fechar o contrato.
        </p>

        {erroLeads && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-3 text-sm mb-4">
            ⚠️ {erroLeads}
          </div>
        )}

        <div className="bg-[var(--surface-color)]/60 border border-white/10 rounded-xl overflow-hidden mb-12">
          {carregandoLeads ? (
            <Carregando linha rotulo="Carregando pedidos de contato" />
          ) : leads.length === 0 ? (
            <p className="p-4 text-gray-400 text-sm">Nenhum pedido de contato recebido ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-150">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                    <th className="p-3">Escola</th>
                    <th className="p-3">Contato</th>
                    <th className="p-3">E-mail / Telefone</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leadsPaginados.map((lead) => (
                    <tr key={lead.id}>
                      <td className="p-3 font-medium whitespace-nowrap">{lead.nome_escola}</td>
                      <td className="p-3 whitespace-nowrap">{lead.contato_nome}</td>
                      <td className="p-3 text-gray-400">
                        <div>{lead.email}</div>
                        {lead.telefone && <div className="text-xs">{lead.telefone}</div>}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => handleMudarStatusLead(lead, e.target.value)}
                          className="bg-[var(--bg-color)] border border-white/10 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--primary-color)]"
                        >
                          {Object.entries(STATUS_LEAD_LABEL).map(([valor, rotulo]) => (
                            <option key={valor} value={valor}>{rotulo}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleUsarDadosLead(lead)}
                          className="text-sm text-[var(--primary-color)] border border-[var(--primary-color)]/40 px-3 py-1.5 rounded-md hover:bg-[var(--primary-color)]/10 transition-colors"
                        >
                          Usar estes dados
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {leads.length > 0 && (
            <div className="flex items-center justify-between gap-3 p-3 border-t border-white/10">
              <span className="text-xs text-gray-500">
                Página <span className="text-[var(--primary-color)] font-semibold">{paginaLeadAtual}</span> de {totalPaginasLeads}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaLeadAtual((p) => Math.max(p - 1, 1))}
                  disabled={paginaLeadAtual === 1}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPaginaLeadAtual((p) => Math.min(p + 1, totalPaginasLeads))}
                  disabled={paginaLeadAtual === totalPaginasLeads}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--surface-color)]/60 border border-white/10 rounded-xl p-6 mb-12">
          <h3 className="font-semibold mb-1">Cadastrar instituição</h3>
          <p className="text-xs text-gray-500 mb-4">
            Cadastre com nome, código e valor do armário. Depois, use "Editar" na lista acima para configurar o meio de pagamento e as credenciais.
          </p>
          <form onSubmit={handleCriarEscolaSubmit} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nome da instituição</label>
              <input
                type="text"
                required
                value={novaEscolaNome}
                onChange={(e) => setNovaEscolaNome(e.target.value)}
                disabled={criandoEscola}
                placeholder="Ex: ETEC Bento Quirino"
                className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Código (URL)</label>
              <input
                type="text"
                required
                value={novaEscolaCodigo}
                onChange={(e) => setNovaEscolaCodigo(e.target.value)}
                disabled={criandoEscola}
                placeholder="Ex: etec-bento-quirino"
                className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Valor do armário (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={novaEscolaValor}
                onChange={(e) => setNovaEscolaValor(e.target.value)}
                disabled={criandoEscola}
                placeholder="Ex: 50.00"
                className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
              />
            </div>
            <button
              type="submit"
              disabled={criandoEscola}
              className="md:col-span-3 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-[var(--on-primary)] font-bold px-6 py-2.5 rounded-lg hover:brightness-105 active:scale-[0.99] transition-[filter] disabled:opacity-60"
            >
              {criandoEscola ? 'Cadastrando...' : 'Cadastrar instituição'}
            </button>
          </form>
        </div>

        {escolaEditando && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form
              onSubmit={handleSalvarEdicaoEscola}
              className="w-full max-w-md bg-[var(--surface-color)] border border-white/10 rounded-xl shadow-2xl p-6"
            >
              <h3 className="text-base font-bold text-white mb-1">Editar {escolaEditando.name}</h3>
              <p className="text-xs text-gray-400 mb-4">Meio de pagamento e credenciais da instituição. Não há comissão sobre a locação.</p>

              {erroEdicao && (
                <div className="mb-4 p-2.5 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-xs">
                  ⚠️ {erroEdicao}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Valor do armário (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorArmarioEdit}
                    onChange={(e) => setValorArmarioEdit(e.target.value)}
                    className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Matrícula do aluno</label>
                  <select
                    value={tipoMatriculaEdit}
                    onChange={(e) => setTipoMatriculaEdit(e.target.value)}
                    className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
                  >
                    <option value="rm">RM</option>
                    <option value="ra">RA</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Rótulo usado no cadastro. É esse número que vira a senha do primeiro acesso do aluno.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Gateway de pagamento</label>
                  <select
                    value={gatewayEdit}
                    onChange={(e) => setGatewayEdit(e.target.value)}
                    className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
                  >
                    {catalogo.gateways
                      // Esconde os pausados (BB), que o backend recusa gravar.
                      // A escola que JÁ estiver num gateway pausado continua
                      // aparecendo, para não sumir a opção atual dela do seletor.
                      .filter((g) => !g.pausado || g.id === escolaEditando.gateway)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nome}{g.legado ? ' (legado)' : ''}{g.pausado ? ' (pausado)' : ''}{g.implementado ? '' : ' — sem integração'}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Campos de credencial vindos do CATÁLOGO. O Banco do Brasil
                    pede seis; o PagBank, um; o Mercado Pago, nenhum (a conta é
                    da LCKP). Antes isso estava escrito na tela, um bloco por
                    gateway — banco novo exigia mexer aqui.

                    Em branco significa "mantém a que já existe": o servidor
                    nunca devolve a credencial, então não há o que pré-preencher,
                    e limpar sem querer apagaria a chave da escola. */}
                {(() => {
                  const descritor = catalogo.gateways.find((g) => g.id === gatewayEdit);
                  if (!descritor?.campos?.length) return null;
                  return (
                    <div className="flex flex-col gap-4">
                      {!descritor.implementado && (
                        <p className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md px-3 py-2">
                          ⚠️ {descritor.observacao || 'Integração ainda não disponível.'}
                        </p>
                      )}
                      {descritor.campos.map((campo) => (
                        <div key={campo.chave}>
                          <label className="block text-sm text-gray-300 mb-1">
                            {campo.rotulo}
                            {escolaEditando.credenciais_configuradas && (
                              <span className="ml-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                já configurado
                              </span>
                            )}
                          </label>
                          <input
                            type={campo.segredo ? 'password' : 'text'}
                            autoComplete="off"
                            value={credenciaisEdit[campo.chave] || ''}
                            onChange={(e) =>
                              setCredenciaisEdit((atual) => ({ ...atual, [campo.chave]: e.target.value }))
                            }
                            placeholder={escolaEditando.credenciais_configuradas ? 'Deixe em branco para manter' : ''}
                            className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Ambiente: vale para qualquer gateway que tenha sandbox.
                    O Mercado Pago não tem — a conta é da LCKP e o modo de teste
                    é outra credencial. */}
                {gatewayEdit !== 'mercadopago' && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Ambiente</label>
                    <select
                      value={ambienteEdit}
                      onChange={(e) => setAmbienteEdit(e.target.value)}
                      className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
                    >
                      <option value="sandbox">Sandbox (testes)</option>
                      <option value="producao">Produção (cobra de verdade)</option>
                    </select>
                  </div>
                )}

                {/* Operação do Banco do Brasil. Os dois passos que faltavam ter
                    tela: sem eles, conferir a credencial e registrar o webhook
                    só era possível por linha de comando. */}
                {gatewayEdit === 'bancodobrasil' && escolaEditando.credenciais_configuradas && (
                  <div className="border border-white/10 rounded-md p-3 flex flex-col gap-2">
                    <p className="text-xs text-gray-400">
                      Depois de salvar a credencial, confira se ela funciona e registre
                      a URL de notificação. Sem o webhook o aluno paga e o armário não abre.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={testarCredencial}
                        disabled={testando}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-semibold text-gray-200 transition-colors disabled:opacity-50"
                      >
                        {testando ? 'Conferindo...' : 'Testar credencial'}
                      </button>
                      <button
                        type="button"
                        onClick={registrarWebhook}
                        disabled={testando}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-semibold text-gray-200 transition-colors disabled:opacity-50"
                      >
                        Registrar webhook
                      </button>
                    </div>
                    {diagnostico && (
                      <p className={`text-xs rounded-md px-3 py-2 border ${
                        diagnostico.tipo === 'sucesso'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : diagnostico.tipo === 'atencao'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {diagnostico.texto}
                      </p>
                    )}
                  </div>
                )}

                {gatewayEdit === 'mercadopago' && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Conta que recebe no Mercado Pago (recipient ID)</label>
                    <input
                      type="text"
                      value={gatewayIdEdit}
                      onChange={(e) => setGatewayIdEdit(e.target.value)}
                      placeholder="Sem isto o pagamento fica na conta da LCKP"
                      className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
                    />
                  </div>
                )}

                {/* O token do PagBank é o campo `token` do catálogo, renderizado
                    pelo bloco genérico de credenciais acima. O input legado que
                    existia aqui mostrava um SEGUNDO campo de token só para o
                    PagBank — quem configurava não sabia qual preencher. Removido:
                    agora há um único campo, "Token da conta PagBank". */}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={fecharEdicaoEscola}
                  disabled={salvandoEdicao}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-semibold text-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="px-4 py-1.5 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-[var(--on-primary)] rounded-md text-xs font-bold transition-[filter] disabled:opacity-50"
                >
                  {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        )}

        <h2 className="text-xl font-bold mb-1">Administradores da plataforma</h2>
        <p className="text-gray-400 text-sm mb-6">
          Quem está aqui tem acesso total: pode criar, editar e excluir qualquer instituição.
        </p>

        {erro && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-3 text-sm mb-4">
            ⚠️ {erro}
          </div>
        )}
        {mensagem && (
          <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 rounded-lg p-3 text-sm mb-4">
            ✅ {mensagem}
          </div>
        )}

        <div className="bg-[var(--surface-color)]/60 border border-white/10 rounded-xl divide-y divide-white/10 mb-8">
          {carregando ? (
            <Carregando linha />
          ) : superadmins.length === 0 ? (
            <p className="p-4 text-gray-400 text-sm">Nenhum superadmin encontrado.</p>
          ) : (
            superadmins.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{s.nome_completo}</p>
                  <p className="text-gray-400 text-sm">{s.email_institucional}</p>
                </div>
                {s.id === usuario.id ? (
                  <span className="text-xs text-gray-500">Você</span>
                ) : (
                  <button
                    onClick={() => handleRemover(s)}
                    className="text-sm text-red-400 border border-red-500/40 px-3 py-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="bg-[var(--surface-color)]/60 border border-white/10 rounded-xl p-6">
          <h3 className="font-semibold mb-4">Adicionar superadmin</h3>
          <form onSubmit={handleAdicionar} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nome completo</label>
              <input
                type="text"
                required
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                disabled={enviando}
                className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                disabled={enviando}
                className="w-full bg-[var(--bg-color)] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--primary-color)]"
              />
            </div>
            <button
              type="submit"
              disabled={enviando}
              className="md:col-span-2 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-[var(--on-primary)] font-bold px-6 py-2.5 rounded-lg hover:brightness-105 active:scale-[0.99] transition-[filter] disabled:opacity-60"
            >
              {enviando ? 'Adicionando...' : 'Adicionar superadmin'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function SuperAdmin() {
  const [usuario, setUsuario] = useState(() => lerSessao());

  const handleSair = () => {
    sessionStorage.clear();
    setUsuario(null);
  };

  if (!usuario || usuario.role !== 'superadmin') {
    return <TelaLogin onLogado={setUsuario} />;
  }

  if (usuario.precisa_alterar_senha) {
    return <TelaTrocarSenha onTrocada={() => setUsuario(lerSessao())} />;
  }

  return <Painel usuario={usuario} onSair={handleSair} />;
}
