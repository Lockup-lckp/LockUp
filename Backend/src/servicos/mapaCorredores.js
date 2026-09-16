// Regras do mapa de corredores que não dependem do banco: o que o aluno pode
// ver de cada armário, e o que o admin pode gravar como estilo.

const ESTADO_POR_STATUS = {
    disponivel: 'livre',
    alugado: 'ocupado',
    funcionario: 'ocupado',
    manutencao: 'manutencao'
};

// Status que o mapa não conhece vira ocupado: na dúvida, o armário não é vendido.
export const traduzirEstado = (status) => ESTADO_POR_STATUS[status] ?? 'ocupado';

const FORMATO_HEX = /^#[0-9a-fA-F]{6}$/;
export const MODOS_DO_MAPA = ['escuro', 'claro', 'personalizado'];
export const CORES_DO_MAPA = ['fundo', 'parede', 'faixa', 'vidro', 'porta', 'armario_claro', 'armario_escuro', 'selecao'];

const corValida = (cor) => typeof cor === 'string' && FORMATO_HEX.test(cor.trim());

export const validarMapaEstilo = (estilo) => {
    if (estilo === null) return { valido: true, valor: null };
    if (!estilo || typeof estilo !== 'object' || Array.isArray(estilo)) {
        return { valido: false, erro: 'O estilo do mapa precisa ser um objeto.' };
    }

    const valor = {};

    if ('modo' in estilo) {
        if (!MODOS_DO_MAPA.includes(estilo.modo)) {
            return { valido: false, erro: `O modo do mapa precisa ser um de: ${MODOS_DO_MAPA.join(', ')}.` };
        }
        valor.modo = estilo.modo;
    }

    for (const campo of CORES_DO_MAPA) {
        if (!(campo in estilo)) continue;
        if (!corValida(estilo[campo])) {
            return { valido: false, erro: `A cor ${campo} do mapa precisa estar no formato #RRGGBB.` };
        }
        valor[campo] = estilo[campo].trim().toUpperCase();
    }

    if ('corredores' in estilo) {
        const cores = estilo.corredores;
        if (!cores || typeof cores !== 'object' || Array.isArray(cores)) {
            return { valido: false, erro: 'As cores dos corredores precisam ser um objeto.' };
        }
        valor.corredores = {};
        for (const [codigo, cor] of Object.entries(cores)) {
            if (!corValida(cor)) {
                return { valido: false, erro: `A cor do corredor ${codigo} precisa estar no formato #RRGGBB.` };
            }
            valor.corredores[codigo] = cor.trim().toUpperCase();
        }
    }

    return { valido: true, valor };
};

const porOrdem = (a, b) => a.ordem - b.ordem;

export const montarRespostaMapa = ({ planta, corredores, itens, armarios, usuarioId, estilo }) => {
    if (!corredores.length) return { corredores: [] };

    const coresDoAdmin = estilo?.corredores ?? {};
    const itensPorCorredor = new Map();

    for (const item of [...itens].sort(porOrdem)) {
        if (!itensPorCorredor.has(item.corredor_id)) itensPorCorredor.set(item.corredor_id, []);
        itensPorCorredor.get(item.corredor_id).push({
            id: item.id,
            tipo: item.tipo,
            numero: item.numero,
            rotulo: item.rotulo,
            variante: item.variante,
            tom: item.tom,
            larguras: item.larguras
        });
    }

    const { school_id: _escola, ...plantaPublica } = planta ?? {};

    return {
        planta: plantaPublica,
        estilo: estilo ?? null,
        corredores: [...corredores].sort(porOrdem).map((c) => ({
            id: c.id,
            codigo: c.codigo,
            nome: c.nome,
            nome_curto: c.nome_curto,
            sigla: c.sigla,
            cor: coresDoAdmin[c.codigo] ?? c.cor,
            area_deitada: c.area_deitada,
            area_estreita: c.area_estreita,
            itens: itensPorCorredor.get(c.id) ?? []
        })),
        // O aluno sabe qual armário é o dele, nunca de quem são os outros.
        armarios: armarios
            .filter((a) => a.item_id)
            .map((a) => ({
                id: a.id,
                nome: a.nome,
                corredor: a.corredor,
                item_id: a.item_id,
                coluna: a.coluna,
                linha: a.linha,
                estado: traduzirEstado(a.status),
                meu: Boolean(usuarioId) && a.usuario_id === usuarioId
            }))
    };
};
