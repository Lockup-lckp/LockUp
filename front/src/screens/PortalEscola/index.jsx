import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import { rotaEscola } from '../../utils/tenant.js';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEscola } from '../../theme/contextoEscola.js';
import { rotuloCorredorPlural } from '../../utils/rotuloCorredor';
import { ligarAnimacoes } from '../../utils/revelar';
import Carregando from '../../components/Carregando.jsx';
import EscolaNaoEncontrada from '../../components/EscolaNaoEncontrada.jsx';
import ModalTermos from '../../components/TermosDeUso.jsx';
// Só os keyframes de entrada (data-hero, data-reveal, data-passo). São
// genéricos e já respeitam prefers-reduced-motion; duplicá-los aqui criaria
// duas definições da mesma animação para manter em sincronia.
import '../Landing/Landing.css';
import './PortalEscola.css';

// Portal público da instituição.
//
// É o que abre em etec-bentoquirino.lckp.com.br — antes essa raiz caía direto
// no formulário de login, que pede e-mail e senha a quem talvez nunca tenha
// entrado no sistema, sem dizer preço, prazo nem qual é a senha do primeiro
// acesso. Essas três respostas moram aqui, e o login virou uma porta explícita.
//
// Todo o conteúdo vem do cadastro da escola. Não há texto de exemplo: uma
// instituição que mude o valor ou o calendário em Configurações vê a mudança
// nesta página no mesmo instante.

const formatarMoeda = (valor) => {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return null;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Dia/mês, sem ano — de propósito. O cadastro guarda só dia e mês
// (`encerramento_dia`, `encerramento_mes`), e deduzir o ano aqui erraria em
// janeiro, quando o ciclo corrente ainda é o do ano anterior.
const diaMes = (dia, mes) =>
    `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;

// Réplica exata de `dentroDaJanelaDeVendas` do backend
// (Backend/src/controladores/pagamentosControlador.js): comparação de MMDD
// inteiro, com o dia da abertura e o do encerramento contando como abertos.
//
// Precisa ser a MESMA regra. Uma página anunciando "locações abertas" enquanto
// o checkout devolve 409 é pior do que não anunciar nada — o aluno atravessa o
// login e o mapa inteiro para descobrir no fim.
const janelaAberta = (escola) => {
    const hoje = new Date();
    const atual = (hoje.getMonth() + 1) * 100 + hoje.getDate();
    const abertura = (escola.abertura_mes ?? 2) * 100 + (escola.abertura_dia ?? 1);
    const encerramento = (escola.encerramento_mes ?? 12) * 100 + (escola.encerramento_dia ?? 20);
    return atual >= abertura && atual <= encerramento;
};

const urlValida = (url) => Boolean(url && url !== 'null' && String(url).trim() !== '');

/** Logos da instituição que devem aparecer, na ordem de cadastro. */
const logosDe = (escola) =>
    [
        { url: escola?.logo_url, posicao: escola?.logo_1_posicao || 'esquerda' },
        { url: escola?.logo_2_url, posicao: escola?.logo_2_posicao || 'nenhum' }
    ].filter((l) => urlValida(l.url) && l.posicao !== 'nenhum');

export default function PortalEscola() {
    const schoolCode = useCodigoEscola();
    const { escola, carregando, erro } = useEscola();
    const [contratoAberto, setContratoAberto] = useState(false);
    const raizRef = useRef(null);

    // As animações só podem ser ligadas depois que a escola chega: antes disso
    // a árvore renderizada é o indicador de carregamento, e o observer não
    // encontraria nenhum [data-hero] para observar.
    useEffect(() => {
        if (!escola) return undefined;
        return ligarAnimacoes(raizRef.current);
    }, [escola]);

    if (carregando) {
        return <Carregando tela rotulo="Carregando instituição" />;
    }

    if (erro || !escola) {
        return <EscolaNaoEncontrada codigo={schoolCode} />;
    }

    const logos = logosDe(escola);
    const aberto = janelaAberta(escola);
    const abertura = diaMes(escola.abertura_dia ?? 1, escola.abertura_mes ?? 2);
    const encerramento = diaMes(escola.encerramento_dia ?? 20, escola.encerramento_mes ?? 12);

    const valorAnual = formatarMoeda(escola.valor_armario);
    const valorSemestral = escola.permite_semestral
        ? formatarMoeda(escola.valor_armario_semestral)
        : null;
    const encerramentoSemestral = diaMes(
        escola.encerramento_semestral_dia ?? 6,
        escola.encerramento_semestral_mes ?? 7
    );

    const limite = Number(escola.max_armarios_por_aluno) || 1;
    const matricula = String(escola.tipo_matricula || 'rm').toUpperCase();
    const divisoes = rotuloCorredorPlural(escola);
    const temContrato = Boolean(String(escola.contrato_texto || '').trim());

    const rotaLogin = rotaEscola(schoolCode, 'entrar');

    return (
        <div className="pe-raiz" ref={raizRef}>
            <div className="pe-brilho" aria-hidden="true" />

            <div className="pe-conteudo">
                <header className="pe-topo">
                    <div className="pe-secao pe-topo__interno">
                        <div className="pe-topo__marca">
                            {logos.length > 0 ? (
                                logos.map((logo, i) => (
                                    <span key={i} className="lckp-logo-vidro">
                                        <img
                                            src={logo.url}
                                            alt={escola.name}
                                            onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                                        />
                                    </span>
                                ))
                            ) : (
                                <p className="pe-topo__nome">{escola.name}</p>
                            )}
                        </div>

                        <nav className="pe-topo__links">
                            <a href="#como-funciona" className="pe-link pe-link--some">Como funciona</a>
                            <a href="#informacoes" className="pe-link pe-link--some">Informações</a>
                            <Link
                                to={rotaLogin}
                                className="lckp-btn"
                                style={{ padding: '0.5rem 1.1rem', fontSize: '0.875rem' }}
                            >
                                Entrar
                            </Link>
                        </nav>
                    </div>
                </header>

                <main>
                    <section className="pe-secao pe-hero">
                        <div>
                            <span data-hero className="pe-selo">Locação de armários</span>
                            <h1 data-hero className="pe-titulo">
                                O seu armário na <em>{escola.name}</em>.
                            </h1>
                            <p data-hero className="pe-texto">
                                Escolha o armário no mapa da escola, pague pelo Pix e use no mesmo
                                dia. Sem fila na secretaria, sem papel, sem esperar alguém confirmar.
                            </p>
                            <div data-hero className="pe-acoes">
                                <Link to={rotaLogin} className="lckp-btn">Entrar e escolher meu armário</Link>
                                <a href="#como-funciona" className="lckp-btn lckp-btn--ghost">Como funciona</a>
                            </div>
                        </div>

                        <aside data-hero className="pe-cartao" aria-labelledby="titulo-planos">
                            <span className="pe-cartao__fechadura" aria-hidden="true" />

                            <span className={`pe-estado${aberto ? ' pe-estado--aberto' : ''}`}>
                                <span className="pe-estado__ponto" aria-hidden="true" />
                                {aberto ? 'Locações abertas' : `Locações abrem em ${abertura}`}
                            </span>

                            <p id="titulo-planos" className="pe-cartao__rotulo">Quanto custa</p>

                            <div className="pe-plano">
                                <p className="pe-plano__nome">Ano letivo inteiro</p>
                                <p className="pe-plano__valor">{valorAnual || 'A definir'}</p>
                                <p className="pe-plano__prazo">Válido até {encerramento}</p>
                            </div>

                            {/* A modalidade semestral só existe onde a escola oferece.
                                Mostrar um preço que o checkout vai recusar é pior do
                                que não mostrar preço nenhum. */}
                            {valorSemestral && (
                                <div className="pe-plano">
                                    <p className="pe-plano__nome">Meio ano</p>
                                    <p className="pe-plano__valor">{valorSemestral}</p>
                                    <p className="pe-plano__prazo">Válido até {encerramentoSemestral}</p>
                                </div>
                            )}

                            <p className="pe-cartao__nota">
                                Valores e prazos definidos pela {escola.name}. O pagamento vai
                                direto para a instituição.
                            </p>
                        </aside>
                    </section>

                    <section id="como-funciona" className="pe-secao pe-bloco">
                        <h2 data-reveal className="pe-bloco__titulo">Três passos, do login ao armário</h2>
                        <p data-reveal className="pe-bloco__linha">
                            Tudo acontece no navegador — do celular, na fila do intervalo, se for o caso.
                        </p>

                        <div className="pe-passos" data-passos>
                            <div className="pe-passo" data-passo>
                                <h3 className="pe-passo__titulo">Entre com o e-mail institucional</h3>
                                <p className="pe-passo__texto">
                                    No primeiro acesso a senha é o seu {matricula}. O sistema pede
                                    para você trocá-la antes de continuar.
                                </p>
                            </div>

                            <div className="pe-passo" data-passo>
                                <h3 className="pe-passo__titulo">Escolha no mapa</h3>
                                <p className="pe-passo__texto">
                                    Os armários aparecem separados por {divisoes}, com os livres em
                                    destaque. Você clica no que quiser e ele fica reservado enquanto
                                    o pagamento acontece.
                                </p>
                            </div>

                            <div className="pe-passo" data-passo>
                                <h3 className="pe-passo__titulo">Pague e use</h3>
                                <p className="pe-passo__texto">
                                    Assim que o Pix é aprovado, o armário passa a ser seu — sem
                                    ninguém precisar confirmar do outro lado.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section id="informacoes" className="pe-secao pe-bloco">
                        {/* Escrito para o aluno, não para quem vende o sistema. A
                            distinção entre o que a escola define e o que a plataforma
                            define não interessa a quem só quer um armário. */}
                        <h2 data-reveal className="pe-bloco__titulo">O que você precisa saber</h2>
                        <p data-reveal className="pe-bloco__linha">
                            Antes de escolher o seu armário na {escola.name}.
                        </p>

                        <div className="pe-fatos" data-reveal-group>
                            <div className="pe-fato" data-reveal-item>
                                <p className="pe-fato__dado">
                                    {limite} {limite === 1 ? 'armário' : 'armários'}
                                </p>
                                <p className="pe-fato__texto">
                                    O máximo que um mesmo aluno pode manter alugado ao mesmo tempo.
                                </p>
                            </div>

                            <div className="pe-fato" data-reveal-item>
                                <p className="pe-fato__dado">{abertura} — {encerramento}</p>
                                <p className="pe-fato__texto">
                                    Janela de locação do ano letivo. Fora dela o mapa fica fechado
                                    para novas escolhas.
                                </p>
                            </div>

                            <div className="pe-fato" data-reveal-item>
                                <p className="pe-fato__dado">{matricula}</p>
                                <p className="pe-fato__texto">
                                    A senha do seu primeiro acesso. Se não souber o número, procure
                                    a secretaria.
                                </p>
                            </div>

                            {temContrato && (
                                <div className="pe-fato" data-reveal-item>
                                    <p className="pe-fato__dado">Contrato</p>
                                    <p className="pe-fato__texto">
                                        As condições de uso do armário, que você aceita antes de pagar.
                                    </p>
                                    <div className="pe-fato__acao">
                                        <button
                                            type="button"
                                            onClick={() => setContratoAberto(true)}
                                            className="lckp-btn lckp-btn--ghost"
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
                                        >
                                            Ler o contrato
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                <footer className="pe-rodape">
                    <div className="pe-secao pe-rodape__interno">
                        <div>
                            <p className="pe-rodape__escola">{escola.name}</p>
                            <p className="pe-rodape__assinatura">
                                Sistema LockUp · powered by{' '}
                                <a href="https://lckp.com.br" target="_blank" rel="noreferrer noopener">
                                    C.C.O Software Lab
                                </a>
                            </p>
                        </div>

                        <Link to={rotaLogin} className="lckp-btn lckp-btn--ghost">Entrar</Link>
                    </div>
                </footer>
            </div>

            {contratoAberto && (
                <ModalTermos escola={escola} aoFechar={() => setContratoAberto(false)} />
            )}
        </div>
    );
}
