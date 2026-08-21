// Tema por instituição.
//
// As telas nunca citam cor literal: tudo passa pelos tokens de :root
// (src/index.css). Trocar a identidade visual da escola é, portanto, reescrever
// esses tokens em tempo de execução — sem rebuild, sem condicional por escola
// espalhada pelos componentes.
//
// A escola configura TRÊS cores. As demais são derivadas por cálculo, e é isso
// que impede um tema ilegível: superfícies e cor de texto sobre botão saem da
// luminância da cor escolhida, não de um palpite do administrador.

const hexParaRgb = (hex) => {
    const limpo = String(hex || '').replace('#', '').trim();
    const completo = limpo.length === 3
        ? limpo.split('').map((c) => c + c).join('')
        : limpo;
    if (!/^[0-9a-fA-F]{6}$/.test(completo)) return null;
    return {
        r: parseInt(completo.slice(0, 2), 16),
        g: parseInt(completo.slice(2, 4), 16),
        b: parseInt(completo.slice(4, 6), 16)
    };
};

const paraHex = ({ r, g, b }) =>
    '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

// Luminância relativa da WCAG. Não é média dos canais: o olho humano é muito
// mais sensível ao verde, e ignorar isso faz um azul escuro passar por claro.
const luminancia = (rgb) => {
    const canal = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * canal(rgb.r) + 0.7152 * canal(rgb.g) + 0.0722 * canal(rgb.b);
};

/** Razão de contraste entre duas cores, no formato da WCAG (1 a 21). */
export const contraste = (corA, corB) => {
    const a = hexParaRgb(corA);
    const b = hexParaRgb(corB);
    if (!a || !b) return 0;
    const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (claro + 0.05) / (escuro + 0.05);
};

// Clareia em direção ao branco. Usado para derivar as superfícies elevadas a
// partir do fundo — assim os cartões acompanham a cor da escola em vez de
// ficarem num cinza que destoa dela.
const clarear = (hex, fator) => {
    const rgb = hexParaRgb(hex);
    if (!rgb) return hex;
    return paraHex({
        r: rgb.r + (255 - rgb.r) * fator,
        g: rgb.g + (255 - rgb.g) * fator,
        b: rgb.b + (255 - rgb.b) * fator
    });
};

const escurecer = (hex, fator) => {
    const rgb = hexParaRgb(hex);
    if (!rgb) return hex;
    return paraHex({ r: rgb.r * (1 - fator), g: rgb.g * (1 - fator), b: rgb.b * (1 - fator) });
};

// Texto sobre a cor primária: preto ou branco, o que enxergar melhor. Deixar
// isso configurável seria oferecer ao administrador a chance de tornar o
// próprio botão de comprar ilegível.
const textoSobre = (fundo) =>
    contraste(fundo, '#000000') >= contraste(fundo, '#ffffff') ? '#0b0b0b' : '#ffffff';

const CONTRASTE_MINIMO_AA = 4.5;

// Mistura duas cores. Equivale ao color-mix(in srgb, a X%, b) do CSS.
const misturar = (corA, corB, fracaoDeA) => {
    const a = hexParaRgb(corA), b = hexParaRgb(corB);
    if (!a || !b) return corA;
    return paraHex({
        r: a.r * fracaoDeA + b.r * (1 - fracaoDeA),
        g: a.g * fracaoDeA + b.g * (1 - fracaoDeA),
        b: a.b * fracaoDeA + b.b * (1 - fracaoDeA)
    });
};

// Quanto a cor de estado tinge o fundo do proprio chip.
//
// Chip de estado no sistema inteiro e "cor a 10% sobre o fundo, com a mesma cor
// na letra" -- o armario livre, o "Ativo e pago", o aviso de erro. Calcular a
// legibilidade contra o fundo da PAGINA erra por pouco e sempre para o mesmo
// lado: media contra o branco, mas a letra vive sobre um branco levemente
// esverdeado. Foi assim que o verde parou em 4,33:1 na primeira medicao,
// mirando 4,5.
const TINTA_DO_CHIP = 0.10;

// Contraste alvo do texto secundário. Fica no mínimo da WCAG AA de propósito:
// mais que isso deixaria de ser secundário e competiria com o texto principal.
const CONTRASTE_DO_TEXTO_APAGADO = 4.6;

/**
 * Aproxima a cor do texto do fundo, até o limite do legível.
 *
 * É o que produz hierarquia sem inventar um cinza: a cor secundária é sempre a
 * mesma cor do texto, só que mais perto do fundo — e para exatamente onde
 * pararia de ser lida.
 */
const apagarAteOLimite = (corDoTexto, fundo) => {
    let ultimaBoa = corDoTexto;
    // Passos de 4%: 25 passos chegam ao próprio fundo no limite.
    for (let i = 1; i <= 25; i++) {
        const tentativa = misturar(corDoTexto, fundo, 1 - i * 0.04);
        if (contraste(tentativa, fundo) < CONTRASTE_DO_TEXTO_APAGADO) break;
        ultimaBoa = tentativa;
    }
    return ultimaBoa;
};

// Cores de ESTADO, não de marca. Verde é "deu certo", vermelho é "deu errado" —
// e isso não muda de escola para escola, então elas não entram na
// personalização.
//
// O que muda é o quanto elas precisam escurecer para serem lidas. Estes são os
// matizes de partida, calibrados para fundo escuro; sobre fundo claro cada um
// é escurecido até passar na WCAG, preservando o matiz (ver garantirContraste).
const SEMANTICAS = {
    sucesso: '#3DDC97',
    erro: '#EF4444',
    aviso: '#F1C40F',
    info: '#38BDF8'
};

/**
 * Aproxima a cor do preto (sobre fundo claro) ou do branco (sobre fundo
 * escuro) até alcançar o contraste mínimo.
 *
 * Muda só a luminosidade, nunca o matiz: um verde escurecido continua verde, e
 * é o matiz que carrega o significado. Trocar #3DDC97 por um verde qualquer
 * "que funcione" faria cada tela ter o seu.
 *
 * Existe porque as cores de estado eram FIXAS e calibradas para o navy. Sobre
 * o branco da Bento Quirino, #3DDC97 dá 1,7:1 — o "Ativo e pago" do Meu
 * Armário ficava ilegível, e o alerta de erro também.
 */
const garantirContraste = (cor, fundo, minimo = CONTRASTE_MINIMO_AA) => {
    if (!hexParaRgb(cor) || !hexParaRgb(fundo)) return cor;
    if (contraste(cor, fundo) >= minimo) return cor;

    const fundoClaro = luminancia(hexParaRgb(fundo)) > 0.45;
    let ajustada = cor;

    // Passos de 5%: fino o bastante para não escurecer além do necessário,
    // e 20 passos chegam ao preto/branco puro no pior caso.
    for (let i = 1; i <= 20; i++) {
        ajustada = fundoClaro ? escurecer(cor, i * 0.05) : clarear(cor, i * 0.05);
        if (contraste(ajustada, fundo) >= minimo) return ajustada;
    }
    return ajustada;
};


// Tokens que o tema por escola sobrescreve. Guardados numa lista só para que
// limpar seja exatamente o inverso de aplicar — esquecer um aqui deixaria a
// cor da escola vazando para a landing.
const TOKENS_DO_TEMA = [
    '--primary-color', '--secondary-color', '--bg-color',
    '--surface-color', '--surface-raised', '--on-primary',
    '--on-bg', '--on-bg-muted', '--border-color',
    // Estado: nao sao da marca, mas SAO calculadas a partir do fundo da
    // escola, entao precisam ser desfeitas junto.
    '--success', '--danger', '--warning', '--info',
    '--on-success', '--on-danger', '--on-warning', '--on-info',
    '--secondary-text', '--primary-text'
];

/**
 * Devolve o sistema à marca LCKP.
 *
 * Necessário porque o tema é escrito inline em documentElement e sobrevive à
 * troca de rota: sem isto, sair do portal de uma escola para a landing deixaria
 * a landing com as cores daquela escola.
 */
export const limparTema = () => {
    const raiz = document.documentElement.style;
    TOKENS_DO_TEMA.forEach((token) => raiz.removeProperty(token));
    document.title = 'LCKP — Locação de Armários';
};


/**
 * Todos os tokens que a identidade desta escola produz, SEM aplicar nada.
 *
 * Separado de aplicarTema para a tela de Configurações poder mostrar a prévia
 * do que vai valer. Duplicar a matemática lá faria a prévia e a realidade
 * divergirem no primeiro ajuste -- e o lugar onde isso apareceria seria a
 * escola, depois de salvo.
 *
 * @returns {Object<string,string>|null} null quando não há cor legível para ler
 */
export const calcularTokens = (escola) => {
    if (!escola) return null;

    const primaria = escola.primary_color;
    const secundaria = escola.secondary_color;
    const fundo = escola.bg_color;
    if (!hexParaRgb(primaria) || !hexParaRgb(fundo)) return null;

    const tokens = {};
    const raiz = { setProperty: (chave, valor) => { tokens[chave] = valor; } };

    raiz.setProperty('--primary-color', primaria);
    raiz.setProperty('--secondary-color', hexParaRgb(secundaria) ? secundaria : escurecer(primaria, 0.18));
    raiz.setProperty('--bg-color', fundo);

    // Superfícies derivadas do fundo, não fixas: um cartão cinza sobre fundo
    // bordô denuncia que o tema foi só "trocar a cor do botão".
    //
    // A direção depende do modo. Num tema escuro o cartão é mais CLARO que a
    // página; num tema claro, mais ESCURO. Clarear sempre deixaria o cartão
    // branco sobre página branca — invisível.
    //
    // 'auto' deduz pela luminância, que era a única regra até 2026-08-21. A
    // dedução acerta nos extremos e hesita no meio: um ameixa #623E55 tem
    // luminância 0,09 e é lido como escuro, mas a escola pode querer que ele se
    // comporte como base clara. Quem sabe é a instituição, não a conta.
    const modo = escola.tema_modo || 'auto';
    const claro = modo === 'claro' ? true
        : modo === 'escuro' ? false
        : luminancia(hexParaRgb(fundo)) > 0.45;

    const superficie = claro ? escurecer(fundo, 0.03) : clarear(fundo, 0.07);
    const superficieAlta = claro ? escurecer(fundo, 0.07) : clarear(fundo, 0.14);

    raiz.setProperty('--surface-color', superficie);
    raiz.setProperty('--surface-raised', superficieAlta);
    raiz.setProperty('--on-primary', textoSobre(primaria));

    // ── A referência de contraste ────────────────────────────────────
    //
    // Todo texto abaixo é calculado contra ESTA cor, e não contra o fundo da
    // página. O motivo custou duas medições erradas: o texto quase nunca fica
    // sobre a página nua. Ele fica sobre um cartão, e o cartão é a superfície
    // mais afastada do fundo — mais clara no tema escuro, mais escura no
    // claro. Nos dois casos, o pior lugar para se ler.
    //
    // Mirar no fundo da página produz um valor que passa na régua e reprova na
    // tela: foi assim que o verde parou em 4,33:1 e o rosa da Etec Conselheiro
    // Antônio Prado em 3,89:1, os dois "aprovados" no cálculo.
    const referencia = superficieAlta;

    // Texto secundário: o mais apagado que ainda se lê.
    //
    // Era alfa fixo (58% do branco), calibrado para fundo quase preto. Sobre um
    // ameixa médio isso dá 3,69:1. Agora parte da cor do texto e se aproxima do
    // fundo enquanto o contraste aguentar — apagado é uma INTENÇÃO de
    // hierarquia, não um valor de opacidade escolhido no olho.
    const corDoTexto = claro ? '#111111' : '#ffffff';
    raiz.setProperty('--on-bg', corDoTexto);
    raiz.setProperty('--on-bg-muted', apagarAteOLimite(corDoTexto, referencia));

    // Borda: mesma ideia, mas ela não carrega texto, então basta ser vista.
    raiz.setProperty('--border-color', claro ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)');

    // Cor colorida que vira LETRA.
    //
    // O chip do sistema é sempre "a cor a 10% no fundo, a mesma cor na letra" —
    // o armário livre, o "Ativo e pago", o selo do portal. Então o fundo real
    // da letra é a referência levemente tingida pela própria cor.
    const legivelComoTexto = (cor) =>
        garantirContraste(cor, misturar(cor, referencia, TINTA_DO_CHIP));

    // Cores de estado. Eram fixas em index.css e calibradas para o navy: sobre
    // o branco da Bento Quirino, o verde de "Ativo e pago" dava 1,7:1.
    raiz.setProperty('--success', legivelComoTexto(SEMANTICAS.sucesso));
    raiz.setProperty('--danger', legivelComoTexto(SEMANTICAS.erro));
    raiz.setProperty('--warning', legivelComoTexto(SEMANTICAS.aviso));
    raiz.setProperty('--info', legivelComoTexto(SEMANTICAS.info));

    // Texto SOBRE cada uma delas, para quando a cor é o preenchimento e não a
    // letra (chip sólido, botão de excluir).
    raiz.setProperty('--on-success', textoSobre(SEMANTICAS.sucesso));
    raiz.setProperty('--on-danger', textoSobre(SEMANTICAS.erro));
    raiz.setProperty('--on-warning', textoSobre(SEMANTICAS.aviso));
    raiz.setProperty('--on-info', textoSobre(SEMANTICAS.info));

    // A marca, ajustada para poder carregar texto.
    //
    // --primary-color continua sendo a cor da instituição, usada como
    // preenchimento de botão (onde --on-primary resolve o contraste). Mas ela
    // também colore título, preço e rótulo, e aí vive sobre um cartão: o rosa
    // #ec4899 da Etec Conselheiro Antônio Prado dá 2,08:1 sobre o ameixa dela.
    //
    // Na Bento Quirino as duas são idênticas — o bordô já passa —, então trocar
    // para --primary-text não mexe em nada que já estava certo.
    raiz.setProperty('--primary-text', legivelComoTexto(primaria));

    // A secundária é escolhida por afinidade com a marca, não por contraste: o
    // laranja #F48220 da Bento Quirino dá 2,4:1 sobre branco. Ela continua
    // valendo como preenchimento e filete (--secondary-color); onde houver
    // letra, usa-se esta.
    //
    // É o que conserta o nome da escola na barra de navegação, escrito num
    // gradiente que terminava na secundária e sumia no fim.
    raiz.setProperty(
        '--secondary-text',
        legivelComoTexto(hexParaRgb(secundaria) ? secundaria : primaria)
    );

    return tokens;
};

/**
 * Escreve a identidade visual da escola nos tokens de :root.
 *
 * Sem escola (ou sem cores configuradas) não faz nada: os tokens do index.css
 * continuam valendo, e o sistema aparece na marca LCKP — que é o certo para a
 * landing e para o painel da plataforma.
 */
export const aplicarTema = (escola) => {
    const tokens = calcularTokens(escola);
    if (!tokens) return;

    const raiz = document.documentElement.style;
    for (const [chave, valor] of Object.entries(tokens)) {
        raiz.setProperty(chave, valor);
    }

    // Aviso, não bloqueio: a cor já está gravada no banco e travar a tela aqui
    // deixaria a escola sem portal. Quem impede a combinação ruim é a validação
    // na hora de escolher, em Configurações.
    const razao = contraste(escola.primary_color, escola.bg_color);
    if (razao < CONTRASTE_MINIMO_AA) {
        console.warn(
            `[LCKP tema] Contraste de ${razao.toFixed(2)}:1 entre a cor principal (${escola.primary_color}) e o fundo (${escola.bg_color}). ` +
            `O texto usa a variante ajustada (--primary-text), mas o par escolhido não alcança o mínimo de ${CONTRASTE_MINIMO_AA}:1 da WCAG AA.`
        );
    }
};

/**
 * Título da aba e favicon.
 *
 * A ordem da marca é a mesma em toda superfície do produto:
 * ESCOLA · Sistema LockUp · powered by C.C.O Software Lab.
 * Quem chega no portal precisa reconhecer a escola dele, não a plataforma.
 */
export const aplicarIdentidade = (escola, assinatura = 'powered by C.C.O Software Lab') => {
    if (!escola?.name) return;

    // Só o título. O favicon continua sendo o do LCKP: é o ícone que identifica
    // o produto na aba, e trocá-lo por escola faria duas abas de instituições
    // diferentes ficarem indistinguíveis.
    document.title = `${escola.name} · Sistema LockUp · ${assinatura}`;

};
