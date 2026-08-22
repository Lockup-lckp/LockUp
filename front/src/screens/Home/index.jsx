import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { armariosService } from '../../services/armariosServices';
import { useEscola } from '../../theme/contextoEscola.js';
import Carregando from '../../components/Carregando.jsx';
import { nomearCorredor, rotuloCorredor } from '../../utils/rotuloCorredor';
import { agruparEmModulos, rotuloDoModulo } from '../../utils/agruparArmarios';
import { rotaEscola } from '../../utils/tenant.js';
import { useCodigoEscola } from '../../utils/useCodigoEscola.js';
import './Home.css';

// Tela onde o aluno escolhe o armário.
//
// Em vez de uma tabela paginada de números, a tela mostra a PAREDE do corredor:
// os armários aparecem nos mesmos blocos em que estão instalados, e o aluno
// anda de bloco em bloco com as setas. Quem chega no totem reconhece o lugar
// físico antes de pensar em número.
//
// A divisão em blocos é derivada da numeração (ver utils/agruparArmarios.js) —
// o banco não guarda essa informação.

// Limites do tamanho do armário na tela. O mínimo não é estético: abaixo disso
// o alvo fica menor que um dedo no vidro do totem.
const LADO_MIN = 34;
const ALTURA_CENA_MIN = 330;
const ALTURA_CENA_MAX = 900;
const LADO_MAX = 110;
const LINHAS_MAX = 4;

const ESTADOS = {
    disponivel: { classe: 'livre', texto: 'LIVRE' },
    alugado: { classe: 'ocupado', texto: 'OCUPADO' },
    manutencao: { classe: 'manutencao', texto: 'MANUT.' }
};

const dinheiro = (valor) =>
    Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Home() {
    const navigate = useNavigate();
    // No subdomínio a rota não tem :schoolCode, e ler pelos parâmetros
    // devolvia vazio. O hook resolve pelos dois caminhos.
    const schoolCode = useCodigoEscola();
    const { escola: escolaDados } = useEscola();

    const [armarios, setArmarios] = useState([]);
    const [corredorEscolhido, setCorredorEscolhido] = useState(null);
    const [armarioSelecionado, setArmarioSelecionado] = useState(null);
    const [parada, setParada] = useState(0);
    const [erro, setErro] = useState(null);
    const [erroDeLimite, setErroDeLimite] = useState(null);
    const [loading, setLoading] = useState(true);
    const [armariosDoAluno, setArmariosDoAluno] = useState(0);

    const cenaRef = useRef(null);
    const fitaRef = useRef(null);
    const raizRef = useRef(null);
    const legendaRef = useRef(null);
    const barraRef = useRef(null);
    const pisoRef = useRef(null);

    const limiteArmarios = Number(escolaDados?.max_armarios_por_aluno) || 1;
    const atingiuLimite = armariosDoAluno >= limiteArmarios;

    useEffect(() => {
        const carregarDados = async () => {
            // A guarda vive DENTRO da função assíncrona: no corpo do efeito ela
            // atualizaria estado de forma síncrona na montagem, provocando uma
            // renderização em cascata.
            if (!schoolCode) {
                setErro('Código da instituição não identificado na URL.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setErro(null);

                const dados = await armariosService.buscarTodos(schoolCode);
                setArmarios(dados);

                const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario') || '{}');
                setArmariosDoAluno(dados.filter((item) => item.usuario_id === usuarioLogado.id).length);
            } catch {
                setErro('Não foi possível carregar os armários.');
            } finally {
                setLoading(false);
            }
        };
        carregarDados();
    }, [schoolCode]);

    // ----------------------------------------------------------------
    // Corredores e módulos
    // ----------------------------------------------------------------

    const corredores = useMemo(() => {
        const nomes = [...new Set(armarios.map((item) => item.corredor))].filter(Boolean);
        return nomes.sort((a, b) =>
            String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' }));
    }, [armarios]);

    const livresPorCorredor = useMemo(() => {
        const contagem = {};
        armarios.forEach((item) => {
            if (item.status !== 'disponivel') return;
            contagem[item.corredor] = (contagem[item.corredor] || 0) + 1;
        });
        return contagem;
    }, [armarios]);

    // O corredor inicial é DERIVADO, não guardado em estado: um efeito só para
    // chamar setCorredorAtivo(corredores[0]) provoca uma renderização em cascata
    // e é justamente o que a regra `react-hooks/set-state-in-effect` proíbe.
    // O estado guarda apenas a escolha explícita do aluno.
    const corredorAtivo = corredorEscolhido ?? corredores[0] ?? null;

    const modulos = useMemo(() => {
        if (!corredorAtivo) return [];
        return agruparEmModulos(armarios.filter((item) => item.corredor === corredorAtivo));
    }, [armarios, corredorAtivo]);

    const paradaSegura = Math.min(parada, Math.max(0, modulos.length - 1));

    // ----------------------------------------------------------------
    // Tamanho do armário
    // ----------------------------------------------------------------
    //
    // O armário é dimensionado pelo MENOR entre o que a largura permite e o que
    // a altura permite. Só a largura não basta: num celular em pé, quatro
    // linhas de armário estouram a altura da cena muito antes de a largura
    // acabar — era esse o motivo de armário aparecer cortado.

    const ajustarEscala = useCallback(() => {
        const cena = cenaRef.current;
        const raiz = raizRef.current;
        if (!cena || !raiz || modulos.length === 0) return;

        // A cena ocupa o que sobra da janela, MEDIDO dos dois lados.
        //
        // Nada de constante de altura de navbar: esta tela vive dentro de um
        // layout com barra superior e menu lateral que ela não controla. O que
        // fica ACIMA sai do próprio topo da cena; o que fica ABAIXO (vão,
        // legenda e os paddings do container e da página) sai da diferença
        // entre o fim da cena e o fim do documento. Somados à mão davam 108px
        // aqui, e eu tinha chutado 74 — a página passou a rolar 34px.
        const caixa = cena.getBoundingClientRect();

        // O que fica abaixo da cena: o vão, a legenda e o padding de baixo do
        // próprio componente cabem todos na diferença até o fim da raiz; falta
        // só o padding do container que a envolve.
        //
        // Tentei antes tirar isso de `scrollHeight`, e estava errado: o
        // scrollHeight nunca é menor que a janela, então num totem de 1920 de
        // altura ele contava o espaço VAZIO como conteúdo e a cena nunca
        // crescia. A diferença entre dois elementos não tem esse problema.
        const paiEstilo = raiz.parentElement ? getComputedStyle(raiz.parentElement) : null;
        const abaixoDaCena = (raiz.getBoundingClientRect().bottom - caixa.bottom)
            + (paiEstilo ? parseFloat(paiEstilo.paddingBottom) || 0 : 0);

        const disponivel = window.innerHeight - caixa.top - abaixoDaCena;
        const alturaCena = Math.max(ALTURA_CENA_MIN, Math.min(ALTURA_CENA_MAX, disponivel));
        if (Math.abs(cena.clientHeight - alturaCena) > 1) {
            cena.style.height = `${alturaCena}px`;
        }

        const colunasMax = Math.max(...modulos.map((m) => m.colunas));
        const linhasMax = Math.min(
            LINHAS_MAX,
            Math.max(...modulos.map((m) => Math.ceil(m.armarios.length / m.colunas)))
        );

        const estilo = getComputedStyle(raiz);
        const vao = parseFloat(estilo.getPropertyValue('--vao')) || 8;

        // Reservas verticais: piso, faixa de vidro, rótulo do módulo e as duas
        // linhas de "parte de cima / parte de baixo".
        //
        // 92 e não o mínimo justo: num notebook 1366x768 a conta apertada
        // deixava 1px de sobra no topo, e 1px some com qualquer diferença de
        // métrica de fonte entre máquinas. Custa alguns pixels de armário e
        // compra a garantia de nunca cortar.
        const piso = cena.clientHeight * 0.11;
        const vidro = cena.clientHeight * 0.07;
        const rotulos = 92;
        const alturaUtil = cena.clientHeight - piso - vidro - rotulos;
        // A margem lateral de cada item é proporcional a --lado, então sobra
        // menos largura do que a cena inteira; 0.82 cobre isso com folga.
        const larguraUtil = cena.clientWidth * 0.82;

        const porLargura = (larguraUtil - (colunasMax - 1) * vao - 2 * vao) / colunasMax;
        const porAltura = (alturaUtil - (linhasMax - 1) * vao - 2 * vao) / (linhasMax * 1.06);

        const lado = Math.max(LADO_MIN, Math.min(LADO_MAX, Math.floor(Math.min(porLargura, porAltura))));
        raiz.style.setProperty('--lado', `${lado}px`);
    }, [modulos]);

    // ----------------------------------------------------------------
    // Posicionamento da fita
    // ----------------------------------------------------------------

    const posicionar = useCallback((instantaneo) => {
        const fita = fitaRef.current;
        if (!fita || !fita.children.length) return;

        const alvo = fita.children[Math.min(paradaSegura, fita.children.length - 1)];
        if (!alvo) return;

        // Ao trocar de corredor a fita ainda guarda o deslocamento do corredor
        // anterior. Sem desligar a transição ela DESLIZA por dentro do conteúdo
        // novo, como se o aluno estivesse andando sem ter pedido.
        if (instantaneo) fita.style.transition = 'none';

        // offsetLeft já contabiliza as margens. Somar larguras à mão errava a
        // margem esquerda do primeiro item e deixava tudo fora de centro.
        fita.style.transform = `translateX(${-(alvo.offsetLeft + alvo.offsetWidth / 2)}px)`;

        if (instantaneo) {
            void fita.offsetWidth; // força o reflow antes de religar a transição
            fita.style.transition = '';
        }
    }, [paradaSegura]);

    // useLayoutEffect e não useEffect: medir antes da pintura evita o quadro em
    // que o módulo aparece fora do lugar e só depois pula para o centro.
    useLayoutEffect(() => {
        ajustarEscala();
        posicionar(true);
    }, [ajustarEscala, posicionar, corredorAtivo]);

    // Quanto a fita precisa subir para a barra não tapar a fileira de baixo.
    //
    // O levantamento é LIMITADO pelo espaço que sobra em cima: numa tela baixa,
    // subir o quanto a barra pede empurraria o rótulo do módulo para trás da
    // faixa de vidro. Melhor cobrir um pedacinho embaixo do que cortar em cima.
    useLayoutEffect(() => {
        const raiz = raizRef.current;
        const barra = barraRef.current;
        const piso = pisoRef.current;
        const fita = fitaRef.current;
        if (!raiz || !barra || !piso) return;

        if (!armarioSelecionado) {
            raiz.style.setProperty('--desvio-barra', '0px');
            return;
        }

        const pedido = Math.max(0, barra.offsetHeight - piso.offsetHeight + 8);
        const alvo = fita && fita.children[Math.min(paradaSegura, fita.children.length - 1)];
        const folgaEmCima = alvo
            ? Math.max(0, alvo.getBoundingClientRect().top - cenaRef.current.getBoundingClientRect().top - 8)
            : 0;

        raiz.style.setProperty('--desvio-barra', `${Math.min(pedido, folgaEmCima)}px`);
    }, [armarioSelecionado, paradaSegura]);

    useEffect(() => {
        const recalcular = () => {
            ajustarEscala();
            posicionar(true);
        };

        window.addEventListener('resize', recalcular);
        window.addEventListener('orientationchange', recalcular);

        // O evento de resize da janela não cobre tudo: a barra lateral abre e
        // fecha, a fonte carrega, e o flex assenta um quadro depois da
        // montagem. Sem observar a CAIXA da cena, o tamanho do armário ficava
        // preso ao valor calculado antes de a cena crescer — foi assim que ele
        // travou no mínimo de 34px numa tela onde cabiam 50px.
        const observador = new ResizeObserver(recalcular);
        if (raizRef.current) observador.observe(raizRef.current);
        // Observar TAMBÉM a raiz do documento: quando só a ALTURA da janela
        // muda — a barra do navegador do celular sumindo, a janela puxada pela
        // borda de baixo — a caixa do componente não muda de tamanho e o
        // observador não dispara. Aí a cena ficava com a altura da medição
        // anterior.
        observador.observe(document.documentElement);

        return () => {
            window.removeEventListener('resize', recalcular);
            window.removeEventListener('orientationchange', recalcular);
            observador.disconnect();
        };
    }, [ajustarEscala, posicionar]);

    // ----------------------------------------------------------------
    // Interação
    // ----------------------------------------------------------------

    const limparSelecao = useCallback(() => {
        setArmarioSelecionado(null);
        setErroDeLimite(null);
    }, []);

    const trocarCorredor = (corredor) => {
        setCorredorEscolhido(corredor);
        setParada(0);
        limparSelecao();
    };

    const andar = (passo) => {
        setParada((atual) => Math.min(modulos.length - 1, Math.max(0, atual + passo)));
    };

    const escolherArmario = (armario) => {
        if (armario.status !== 'disponivel') return;
        // Clicar de novo no mesmo armário desfaz a escolha e limpa a tela.
        if (armarioSelecionado?.id === armario.id) limparSelecao();
        else {
            setArmarioSelecionado(armario);
            setErroDeLimite(null);
        }
    };

    const irParaCheckout = () => {
        if (!armarioSelecionado) return;

        if (atingiuLimite) {
            setErroDeLimite(limiteArmarios === 1
                ? 'Você já possui um armário reservado e não pode alugar outro.'
                : `Você já atingiu o limite de ${limiteArmarios} armários por aluno.`);
            return;
        }

        // Sem concatenar: no subdomínio rotaEscola devolve '/', e juntar à mão
        // produziria '//checkout'.
        navigate(rotaEscola(schoolCode, 'checkout'), {
            state: {
                origemValida: true, // 🔒 Libera o acesso no CheckoutProtectedRoute do router
                armario: armarioSelecionado,
                valorArmario: escolaDados?.valor_armario || 0
            }
        });
    };

    // Arrastar de lado anda de módulo — no totem o dedo é mais natural que a seta.
    const inicioDoArraste = useRef(null);

    const aoSoltar = (evento) => {
        if (inicioDoArraste.current === null) return;
        const deslocamento = evento.clientX - inicioDoArraste.current;
        if (Math.abs(deslocamento) > 50) andar(deslocamento < 0 ? 1 : -1);
        inicioDoArraste.current = null;
    };

    // ----------------------------------------------------------------

    if (loading) return <Carregando tela rotulo="Carregando armários" />;
    if (erro) return <div className="mapa-erro">{erro}</div>;

    const nomeDoCorredor = rotuloCorredor(escolaDados).toLowerCase();

    return (
        <div className="mapa" ref={raizRef}>
            <div className="mapa-cabecalho">
                <div className="mapa-intro">
                    <h2 className="mapa-titulo">Escolha seu armário</h2>
                    <p className="mapa-subtitulo">
                        {`Toque no ${nomeDoCorredor} e depois no armário`}
                    </p>
                </div>

                <div className="mapa-corredores">
                {corredores.map((corredor) => (
                    <button
                        key={corredor}
                        type="button"
                        onClick={() => trocarCorredor(corredor)}
                        className={`mapa-corredor ${corredorAtivo === corredor ? 'ativo' : ''}`}
                    >
                        <div className="mapa-corredor-nome">{nomearCorredor(escolaDados, corredor)}</div>
                        <div className="mapa-corredor-livres">
                            {livresPorCorredor[corredor] || 0} livres
                        </div>
                        </button>
                    ))}
                </div>
            </div>

            <div
                className="mapa-cena"
                ref={cenaRef}
                onPointerDown={(e) => { inicioDoArraste.current = e.clientX; }}
                onPointerUp={aoSoltar}
                onPointerLeave={() => { inicioDoArraste.current = null; }}
            >
                <div className="mapa-vidro" />

                {modulos.length === 0 ? (
                    <div className="mapa-vazio">Nenhum armário cadastrado neste {nomeDoCorredor}.</div>
                ) : (
                    <div className="mapa-fita" ref={fitaRef}>
                        {modulos.map((modulo, indice) => (
                            <div
                                key={modulo.id}
                                className={`mapa-item ${Math.abs(indice - paradaSegura) > 2 ? 'longe' : ''}`}
                            >
                                <div className="mapa-modulo">
                                    {rotuloDoModulo(modulo) && (
                                        <div className="mapa-modulo-rotulo">{rotuloDoModulo(modulo)}</div>
                                    )}
                                    <div className="mapa-caixa">
                                        <div className="mapa-altura topo">▲ parte de cima</div>
                                        <div
                                            className="mapa-grade"
                                            style={{ '--colunas': modulo.colunas }}
                                        >
                                            {modulo.armarios.map((item) => {
                                                const estado = ESTADOS[item.status] || ESTADOS.manutencao;
                                                const escolhido = armarioSelecionado?.id === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => escolherArmario(item)}
                                                        disabled={item.status !== 'disponivel'}
                                                        aria-pressed={escolhido}
                                                        className={`mapa-armario ${escolhido ? 'escolhido' : estado.classe}`}
                                                    >
                                                        <span className="mapa-armario-numero">
                                                            {item.nome ? item.nome.replace('Armário ', '') : item.id}
                                                        </span>
                                                        <span className="mapa-armario-estado">
                                                            {escolhido ? 'O SEU' : estado.texto}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mapa-altura base">▼ parte de baixo</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mapa-piso" ref={pisoRef} />
                <div className="mapa-borda" />

                {modulos.length > 1 && (
                    <div className="mapa-setas">
                        <button
                            type="button"
                            className="mapa-seta"
                            onClick={() => andar(-1)}
                            disabled={paradaSegura === 0}
                            aria-label="Módulo anterior"
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className="mapa-seta"
                            onClick={() => andar(1)}
                            disabled={paradaSegura >= modulos.length - 1}
                            aria-label="Próximo módulo"
                        >
                            ›
                        </button>
                    </div>
                )}

                <div className={`mapa-barra ${armarioSelecionado ? 'aberta' : ''}`} ref={barraRef}>
                    <div className="mapa-barra-quem">
                        <span className="mapa-barra-armario">
                            {armarioSelecionado?.nome || '—'}
                        </span>
                        <span className="mapa-barra-onde">
                            {armarioSelecionado
                                ? nomearCorredor(escolaDados, armarioSelecionado.corredor)
                                : ''}
                        </span>
                    </div>

                    <div className="mapa-barra-valor">{dinheiro(escolaDados?.valor_armario)}</div>

                    <button
                        type="button"
                        className="mapa-barra-seguir"
                        onClick={irParaCheckout}
                        disabled={!armarioSelecionado}
                    >
                        Continuar para o pagamento →
                    </button>

                    {erroDeLimite && <div className="mapa-barra-erro">{erroDeLimite}</div>}
                </div>
            </div>

            <div className="mapa-legenda" ref={legendaRef}>
                <span><i className="cor-livre" /> Verde: pode escolher</span>
                <span><i className="cor-ocupado" /> Vermelho: já alugado</span>
                <span><i className="cor-manutencao" /> Listrado: em conserto</span>
                {/* Sem nome de cor aqui: o destaque usa a cor da ESCOLA, que muda.
                    Chamar de "dourado" ficava errado na Bento Quirino, que é laranja.
                    Verde, vermelho e listrado podem ser nomeados — são fixos. */}
                <span><i className="cor-escolhido" /> O que você escolheu</span>

                {modulos.length > 1 && (
                    <div className="mapa-pontos">
                        {modulos.map((modulo, indice) => (
                            <b key={modulo.id} className={indice === paradaSegura ? 'ativo' : ''} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
