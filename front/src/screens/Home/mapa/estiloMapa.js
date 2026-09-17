// Cores do mapa. O admin escolhe um modo; no personalizado, só as cores da
// lista CORES_EDITAVEIS mudam, o resto (cano, batente, piso) vem do escuro.

const BASE = {
    escuro: {
        fundo: '#091528', parede: '#16243D', faixa: '#101B2E', faixaLinha: '#0A1220',
        vidro: '#1D3050', caixilho: '#2C4166', cano: '#B14238', porta: '#4A2C1E', batente: '#2E1B0E',
        piso: '#0F1B2E', pisoJunta: '#1B2940', armario_claro: '#5A6880', armario_escuro: '#3A4759',
        portal: '#B14238', marcaPlaca: '#E2572B', selecao: '#E8B44A',
        carta: '#0C1B36', borda: 'rgba(255, 255, 255, .09)', texto: '#F2F5FA', textoSuave: 'rgba(242, 245, 250, .62)'
    },
    claro: {
        fundo: '#D8DCDE', parede: '#F3F2EE', faixa: '#8D9BA2', faixaLinha: '#7A888F',
        vidro: '#CFDADF', caixilho: '#9AA3A6', cano: '#C7372E', porta: '#6A3A22', batente: '#55301C',
        piso: '#E4E5E1', pisoJunta: '#CFD1CC', armario_claro: '#B7BCC0', armario_escuro: '#6D757B',
        portal: '#C7372E', marcaPlaca: '#E2572B', selecao: '#C8912E',
        carta: '#FFFFFF', borda: 'rgba(10, 31, 68, .12)', texto: '#0A1F44', textoSuave: 'rgba(10, 31, 68, .62)'
    }
};

export const CORES_EDITAVEIS = [
    { campo: 'fundo', titulo: 'Fundo da cena' },
    { campo: 'parede', titulo: 'Parede' },
    { campo: 'faixa', titulo: 'Faixa baixa da parede' },
    { campo: 'vidro', titulo: 'Vidro das salas' },
    { campo: 'porta', titulo: 'Portas' },
    { campo: 'armario_claro', titulo: 'Armário claro' },
    { campo: 'armario_escuro', titulo: 'Armário escuro' },
    { campo: 'selecao', titulo: 'Armário selecionado' }
];

export function paletaDoMapa(estilo) {
    const paleta = { ...BASE[estilo?.modo === 'claro' ? 'claro' : 'escuro'] };
    if (estilo?.modo === 'personalizado') {
        for (const { campo } of CORES_EDITAVEIS) {
            if (estilo[campo]) paleta[campo] = estilo[campo];
        }
    }
    return paleta;
}

export function variaveisCss(paleta) {
    return {
        '--mapa-fundo': paleta.fundo,
        '--mapa-carta': paleta.carta,
        '--mapa-borda': paleta.borda,
        '--mapa-texto': paleta.texto,
        '--mapa-texto-suave': paleta.textoSuave,
        '--mapa-selecao': paleta.selecao
    };
}
