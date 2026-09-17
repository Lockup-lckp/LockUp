// Onde cada coisa fica na parede, em centímetros da parede real, e como a
// câmera enquadra cada parada. Sem React e sem DOM: dá para testar com node.

export const ALTURA = 340;
export const MARGEM = 600;

const JANELA_TOPO = 12;
const JANELA_ALTURA = ALTURA - JANELA_TOPO;
const FAIXA_CONTROLES = 82;

const LARGURA_ITEM = {
    portal: 180, porta: 110, fundo: 150, fim: 90,
    hidrante: 70, extintor: 26, lixeira: 42, mural: 110, quadro: 44, rampa: 210
};

const temNome = (item) => Boolean(item.numero || item.rotulo || item.variante === 'estoque');

export function nomePorta(item) {
    if (item.variante === 'laboratorio') return `Lab. de ${item.rotulo}`;
    if (item.variante === 'estoque') return 'Estoque';
    if (item.rotulo) return item.rotulo;
    return `Sala ${item.numero}`;
}

export function descreverLocal(porta) {
    if (!porta) return 'Entrada do corredor';
    const masculino = porta.variante === 'laboratorio' || porta.variante === 'estoque' || Boolean(porta.rotulo);
    return `${masculino ? 'Perto do' : 'Perto da'} ${nomePorta(porta)}`;
}

function rotuloCurto(item) {
    if (item.variante === 'laboratorio') return 'Lab';
    if (item.rotulo) return item.rotulo.split(' ')[0];
    return item.numero ?? '';
}

export function montarColunas(larguras, armariosDoBloco) {
    return larguras.map((_, coluna) => {
        const daColuna = armariosDoBloco.filter((a) => a.coluna === coluna);
        const linhas = daColuna.reduce((maior, a) => Math.max(maior, a.linha + 1), 0);
        const celulas = Array.from({ length: linhas }, () => null);
        for (const armario of daColuna) celulas[armario.linha] = armario;
        return celulas;
    });
}

export function montarCorredor(corredor, armarios) {
    const idsDoCorredor = new Set(corredor.itens.map((i) => i.id));
    const doCorredor = armarios.filter((a) => idsDoCorredor.has(a.item_id));
    const porItem = new Map();
    for (const armario of doCorredor) {
        if (!porItem.has(armario.item_id)) porItem.set(armario.item_id, []);
        porItem.get(armario.item_id).push(armario);
    }

    const itens = [];
    let x = 40;
    let anterior = null;
    let ultimaPorta = null;

    for (const original of corredor.itens) {
        const item = { ...original };
        if (anterior) x += anterior.tipo === 'bloco' && item.tipo === 'bloco' ? 5 : 28;
        item.x = x;

        if (item.tipo === 'bloco') {
            item.largura = item.larguras.reduce((soma, l) => soma + l, 0) + 8;
            item.colunas = montarColunas(item.larguras, porItem.get(item.id) ?? []);
            item.local = descreverLocal(ultimaPorta);
        } else {
            item.largura = LARGURA_ITEM[item.tipo];
        }

        if ((item.tipo === 'porta' || item.tipo === 'fundo') && temNome(item)) ultimaPorta = item;
        itens.push(item);
        x += item.largura;
        anterior = item;
    }

    const fechado = anterior && (anterior.tipo === 'fundo' || anterior.tipo === 'fim');
    const comprimento = x + (fechado ? 0 : 60);

    const paradas = [];
    let portaAtual = null;
    for (const item of itens) {
        if ((item.tipo === 'porta' || item.tipo === 'fundo') && temNome(item)) portaAtual = item;
        // o fim do corredor e o estoque não têm armário: não vale parar neles
        const ehParada = item.tipo === 'bloco' || (item.tipo === 'porta' && item.variante !== 'estoque');
        if (!ehParada) continue;
        paradas.push({
            centro: item.x + item.largura / 2,
            largura: item.largura,
            topo: item.tipo === 'bloco' ? 90 : 16,
            base: 308,
            tipo: item.tipo,
            rotulo: item.tipo === 'bloco' ? '' : rotuloCurto(item),
            local: descreverLocal(portaAtual)
        });
    }

    const numeros = itens.filter((i) => (i.tipo === 'porta' || i.tipo === 'fundo') && i.numero).map((i) => i.numero);
    let salas = numeros.length > 1
        ? `Salas ${numeros[0]} a ${numeros[numeros.length - 1]}`
        : numeros.length === 1 ? `Sala ${numeros[0]}` : '';
    if (itens.some((i) => i.variante === 'laboratorio')) salas = salas ? `${salas} e laboratório` : 'Laboratório';

    return {
        itens,
        comprimento,
        paradas,
        salas,
        livres: doCorredor.filter((a) => a.estado === 'livre').length
    };
}

// Computador e totem: uma escala só para o corredor todo.
// Celular: cada parada ocupa a largura da tela, acima da faixa das setas.
export function enquadrar(lay, largura, altura, celular) {
    if (celular) {
        const areaAltura = altura - FAIXA_CONTROLES;
        return lay.paradas.map((p) => {
            const alturaParada = p.base - p.topo;
            const escala = Math.min((largura - 20) / p.largura, areaAltura / alturaParada, 6);
            return {
                escala,
                tx: largura / 2 - (p.centro + MARGEM) * escala,
                ty: (areaAltura - alturaParada * escala) / 2 - p.topo * escala + 4
            };
        });
    }

    const maior = Math.max(...lay.paradas.map((p) => p.largura));
    const escala = Math.max(0.5, Math.min(altura / JANELA_ALTURA, largura / (maior + 4), 6));
    const ty = (altura - JANELA_ALTURA * escala) / 2 - JANELA_TOPO * escala;
    return lay.paradas.map((p) => ({ escala, tx: largura / 2 - (p.centro + MARGEM) * escala, ty }));
}
