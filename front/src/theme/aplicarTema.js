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

// Tokens que o tema por escola sobrescreve. Guardados numa lista só para que
// limpar seja exatamente o inverso de aplicar — esquecer um aqui deixaria a
// cor da escola vazando para a landing.
const TOKENS_DO_TEMA = [
    '--primary-color', '--secondary-color', '--bg-color',
    '--surface-color', '--surface-raised', '--on-primary',
    '--on-bg', '--on-bg-muted', '--border-color'
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
 * Escreve a identidade visual da escola nos tokens de :root.
 *
 * Sem escola (ou sem cores configuradas) não faz nada: os tokens do index.css
 * continuam valendo, e o sistema aparece na marca LCKP — que é o certo para a
 * landing e para o painel da plataforma.
 */
export const aplicarTema = (escola) => {
    if (!escola) return;

    const primaria = escola.primary_color;
    const secundaria = escola.secondary_color;
    const fundo = escola.bg_color;
    if (!hexParaRgb(primaria) || !hexParaRgb(fundo)) return;

    const raiz = document.documentElement.style;

    raiz.setProperty('--primary-color', primaria);
    raiz.setProperty('--secondary-color', hexParaRgb(secundaria) ? secundaria : escurecer(primaria, 0.18));
    raiz.setProperty('--bg-color', fundo);

    // Superfícies derivadas do fundo, não fixas: um cartão cinza sobre fundo
    // bordô denuncia que o tema foi só "trocar a cor do botão".
    raiz.setProperty('--surface-color', clarear(fundo, 0.07));
    raiz.setProperty('--surface-raised', clarear(fundo, 0.14));
    raiz.setProperty('--on-primary', textoSobre(primaria));

    const claro = luminancia(hexParaRgb(fundo)) > 0.45;
    raiz.setProperty('--on-bg', claro ? '#111111' : '#ffffff');
    raiz.setProperty('--on-bg-muted', claro ? 'rgba(0,0,0,0.60)' : 'rgba(255,255,255,0.58)');
    raiz.setProperty('--border-color', claro ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)');

    // Aviso, não bloqueio: a cor já está gravada no banco e travar a tela aqui
    // deixaria a escola sem portal. Quem impede a combinação ruim é a validação
    // na hora de escolher, em Configurações.
    const razao = contraste(primaria, fundo);
    if (razao < CONTRASTE_MINIMO_AA) {
        console.warn(
            `[LCKP tema] Contraste de ${razao.toFixed(2)}:1 entre a cor principal (${primaria}) e o fundo (${fundo}). ` +
            `O mínimo recomendado pela WCAG AA é ${CONTRASTE_MINIMO_AA}:1.`
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

    document.title = `${escola.name} · Sistema LockUp · ${assinatura}`;

    if (escola.logo_url) {
        let icone = document.querySelector("link[rel~='icon']");
        if (!icone) {
            icone = document.createElement('link');
            icone.rel = 'icon';
            document.head.appendChild(icone);
        }
        icone.href = escola.logo_url;
    }
};
