import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import { rotaEscola } from '../../utils/tenant.js';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { armariosService } from '../../services/armariosServices';
import { useEscola } from '../../theme/contextoEscola.js';
import { nomearCorredor, rotuloCorredor } from '../../utils/rotuloCorredor';
import './MeuArmario.css';

export default function MeuArmario() {
  const navigate = useNavigate();
  const schoolCode = useCodigoEscola();
  const { escola } = useEscola();
  const valorArmario = escola?.valor_armario ?? null; // Valor configurado da escola (via EscolaProvider)
  const limiteArmarios = Number(escola?.max_armarios_por_aluno) || 1;

  // Lista, não item único: o limite por aluno virou configurável e a ETEC
  // Bento Quirino permite 2. Antes um `find` mostrava só o primeiro, e o
  // segundo armário pago simplesmente não aparecia para o aluno.
  const [armarios, setArmarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // O contrato continua acessível DEPOIS da compra: o aluno aceitou no
  // checkout e precisa poder reler as regras durante o ano — prazo de
  // desocupação, itens proibidos, quem responde pelo cadeado.
  //
  // Deixou de abrir em modal aqui. Agora é tela própria, em /contrato, também
  // alcançável pela barra lateral: modal não tem endereço, e o aluno não
  // conseguia guardar o link nem voltar direto ao contrato depois.
  const temContrato = Boolean(String(escola?.contrato_texto || '').trim());

  useEffect(() => {
    const buscarDadosArmario = async () => {
      if (!schoolCode) return;

      try {
        setLoading(true);
        setErro(null);

        // Busca as informações de alocação do usuário logado
        const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');
        const alunoId = usuarioLogado.id;

        if (!alunoId) return;

        const todosArmarios = await armariosService.buscarTodos(schoolCode);
        // lockers.usuario_id é a coluna real do vínculo aluno-armário.
        setArmarios(todosArmarios.filter((a) => a.usuario_id === alunoId));
      } catch (error) {
        console.error('Erro ao carregar o armário do aluno:', error);
        setErro('Não foi possível carregar seus armários. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    buscarDadosArmario();
  }, [schoolCode]);

  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined) return 'R$ --,--';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const encerramento = `${String(escola?.encerramento_dia ?? 20).padStart(2, '0')}/${String(escola?.encerramento_mes ?? 12).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="armario-pagina" style={{ justifyContent: 'center' }}>
        <p style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
          Carregando informações do seu armário...
        </p>
      </div>
    );
  }

  const podeAlugarMais = armarios.length < limiteArmarios;

  return (
    <div className="armario-pagina">
      <div className="armario-conteudo">
        <div className="armario-topo">
          <div>
            <h2 className="armario-topo__titulo">
              {armarios.length > 1 ? 'Seus Armários Alocados' : 'Seu Armário Alocado'}
            </h2>
            {limiteArmarios > 1 && (
              <p className="armario-topo__sub">
                {armarios.length} de {limiteArmarios} armários locados
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(rotaEscola(schoolCode, 'home'))}
            className="lckp-btn lckp-btn--ghost armario-voltar"
          >
            ← Voltar ao Mapa
          </button>
        </div>

        {erro && <p className="lckp-chip lckp-chip--danger">{erro}</p>}

        {armarios.length === 0 ? (
          <div className="lckp-card armario-card">
            <div className="armario-vazio">
              <p>Você ainda não possui nenhum armário alocado.</p>
              <button
                type="button"
                onClick={() => navigate(rotaEscola(schoolCode, 'home'))}
                className="lckp-btn"
              >
                Escolher um Armário no Mapa
              </button>
            </div>
          </div>
        ) : (
          armarios.map((armario) => (
            <div key={armario.id} className="lckp-card armario-card">
              <div className="armario-card__cabecalho">
                <div>
                  <span className="armario-info__rotulo">Identificação</span>
                  <h3 className="armario-card__nome">{armario.nome}</h3>
                </div>
                <span className="lckp-chip lckp-chip--success">Ativo e pago</span>
              </div>

              <div className="armario-grade">
                <div className="armario-info">
                  <span className="armario-info__rotulo">Localização</span>
                  <strong className="armario-info__valor">{nomearCorredor(escola, armario.corredor)}</strong>
                </div>

                <div className="armario-info">
                  <span className="armario-info__rotulo">Valor pago</span>
                  <strong className="armario-info__valor">{formatarMoeda(valorArmario)}</strong>
                </div>

                <div className="armario-info">
                  <span className="armario-info__rotulo">Válido até</span>
                  <strong className="armario-info__valor">{encerramento}</strong>
                </div>
              </div>

              <p className="armario-aviso">
                <strong>Comprovante de ocupação:</strong> este armário está reservado
                exclusivamente ao seu usuário até {encerramento}, quando o ciclo letivo se
                encerra e os armários são liberados. Guarde o número e o {rotuloCorredor(escola).toLowerCase()} para uso diário.
              </p>

              {/* Só no primeiro cartão: quem tem dois armários tem um contrato
                  só, e repetir o botão sugeriria que são contratos diferentes. */}
              {temContrato && armario.id === armarios[0].id && (
                <button
                  type="button"
                  onClick={() => navigate(rotaEscola(schoolCode, 'contrato'))}
                  className="lckp-btn lckp-btn--ghost armario-contrato"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M8 13h8M8 17h5" />
                  </svg>
                  Ver contrato de locação
                </button>
              )}
            </div>
          ))
        )}

        {/* Só aparece quando ainda há vaga no limite da escola — oferecer o
            botão a quem já bateu o teto prometeria o que a regra não permite. */}
        {armarios.length > 0 && podeAlugarMais && (
          <button
            type="button"
            onClick={() => navigate(rotaEscola(schoolCode, 'home'))}
            className="lckp-btn lckp-btn--ghost"
          >
            Alugar outro armário
          </button>
        )}
      </div>

    </div>
  );
}
