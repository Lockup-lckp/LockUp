// Gera o SQL de carga de um mapa de corredores a partir de um módulo de dados.
//
// Uso: node scripts/gerarSqlMapa.js scripts/mapas/bentoQuirino.js sql/2026-09-16-mapa-bento-quirino.sql
//
// O mapa vive em JS e não direto no SQL porque são centenas de números de
// armário: escrever cada posição à mão num VALUES é onde o erro entra.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// numeração por linha, da esquerda para a direita, igual às etiquetas da APM
export function grade(inicio, colunas, linhas) {
    const saida = Array.from({ length: colunas }, () => []);
    let numero = inicio;
    for (let linha = 0; linha < linhas; linha++) {
        for (let coluna = 0; coluna < colunas; coluna++) saida[coluna].push(numero++);
    }
    return saida;
}

export function posicoesDoBloco(colunas) {
    const saida = [];
    colunas.forEach((numeros, coluna) => {
        numeros.forEach((numero, linha) => saida.push({ numero, coluna, linha }));
    });
    return saida;
}

export const sqlTexto = (valor) =>
    valor === null || valor === undefined ? 'NULL' : `'${String(valor).replace(/'/g, "''")}'`;

const numeroDoNome = (alias) => `NULLIF(regexp_replace(${alias}.nome, '[^0-9]', '', 'g'), '')::int`;

function sqlItem(item, ordem) {
    const larguras = item.larguras ? `ARRAY[${item.larguras.join(', ')}]::smallint[]` : 'NULL';
    const valores = [
        'v_corredor', ordem, sqlTexto(item.tipo), sqlTexto(item.numero), sqlTexto(item.rotulo),
        sqlTexto(item.variante), sqlTexto(item.tom), larguras
    ].join(', ');
    let sql = `  INSERT INTO corredor_itens (corredor_id, ordem, tipo, numero, rotulo, variante, tom, larguras)\n`
        + `  VALUES (${valores}) RETURNING id INTO v_item;\n`;

    if (item.tipo === 'bloco') {
        const posicoes = posicoesDoBloco(item.colunas)
            .map(({ numero, coluna, linha }) => `(${numero}, ${coluna}, ${linha})`)
            .join(', ');
        // Número repetido na escola não é ligado: não há como saber qual dos dois está nesta porta.
        sql += `  UPDATE lockers l SET item_id = v_item, coluna = p.coluna, linha = p.linha\n`
            + `    FROM (VALUES ${posicoes}) AS p(numero, coluna, linha)\n`
            + `   WHERE l.school_id = v_escola\n`
            + `     AND ${numeroDoNome('l')} = p.numero\n`
            + `     AND NOT EXISTS (SELECT 1 FROM lockers d WHERE d.school_id = v_escola AND d.id <> l.id AND ${numeroDoNome('d')} = p.numero);\n`;
    }
    return sql;
}

export function gerarSqlMapa(mapa) {
    const codigo = sqlTexto(mapa.codigoEscola);
    const p = mapa.planta;
    const numeros = mapa.corredores
        .flatMap((c) => c.itens)
        .filter((i) => i.tipo === 'bloco')
        .flatMap((i) => posicoesDoBloco(i.colunas).map((pos) => pos.numero))
        .sort((a, b) => a - b);

    let sql = `-- Carga do mapa de corredores da escola ${mapa.codigoEscola}.\n`
        + `-- Gerado por Backend/scripts/gerarSqlMapa.js. Não edite à mão: mude os dados e gere de novo.\n`
        + `-- Rodar DEPOIS de 2026-09-16-mapa-corredores.sql. Pode ser rodado de novo: recarrega o mapa inteiro.\n\n`
        + `BEGIN;\n\nDO $$\nDECLARE\n  v_escola UUID;\n  v_corredor UUID;\n  v_item UUID;\nBEGIN\n`
        + `  SELECT id INTO v_escola FROM schools WHERE codigo = ${codigo};\n`
        + `  IF v_escola IS NULL THEN RAISE EXCEPTION 'Escola ${mapa.codigoEscola} não encontrada.'; END IF;\n\n`
        + `  UPDATE lockers SET item_id = NULL, coluna = NULL, linha = NULL WHERE school_id = v_escola;\n`
        + `  DELETE FROM corredores WHERE school_id = v_escola;\n\n`
        + `  INSERT INTO plantas (school_id, colunas_deitada, linhas_deitada, colunas_estreita, linhas_estreita,\n`
        + `    patio_area_deitada, patio_area_estreita, patio_recuo_deitada, patio_recuo_estreita)\n`
        + `  VALUES (v_escola, ${[p.colunas_deitada, p.linhas_deitada, p.colunas_estreita, p.linhas_estreita,
            p.patio_area_deitada, p.patio_area_estreita, p.patio_recuo_deitada, p.patio_recuo_estreita].map(sqlTexto).join(', ')})\n`
        + `  ON CONFLICT (school_id) DO UPDATE SET\n`
        + `    colunas_deitada = EXCLUDED.colunas_deitada, linhas_deitada = EXCLUDED.linhas_deitada,\n`
        + `    colunas_estreita = EXCLUDED.colunas_estreita, linhas_estreita = EXCLUDED.linhas_estreita,\n`
        + `    patio_area_deitada = EXCLUDED.patio_area_deitada, patio_area_estreita = EXCLUDED.patio_area_estreita,\n`
        + `    patio_recuo_deitada = EXCLUDED.patio_recuo_deitada, patio_recuo_estreita = EXCLUDED.patio_recuo_estreita;\n`;

    mapa.corredores.forEach((c, i) => {
        sql += `\n  -- ${c.nome}\n`
            + `  INSERT INTO corredores (school_id, codigo, nome, nome_curto, sigla, cor, ordem, area_deitada, area_estreita)\n`
            + `  VALUES (v_escola, ${[c.codigo, c.nome, c.nome_curto, c.sigla, c.cor].map(sqlTexto).join(', ')}, ${i + 1}, `
            + `${sqlTexto(c.area_deitada)}, ${sqlTexto(c.area_estreita)}) RETURNING id INTO v_corredor;\n`;
        c.itens.forEach((item, ordem) => { sql += sqlItem(item, ordem + 1); });
    });

    sql += `END $$;\n\nCOMMIT;\n\n`
        + `-- Conferência 1: armários da escola que ficaram sem lugar na parede.\n`
        + `SELECT l.nome, l.corredor, l.status FROM lockers l JOIN schools s ON s.id = l.school_id\n`
        + ` WHERE s.codigo = ${codigo} AND l.item_id IS NULL ORDER BY ${numeroDoNome('l')} NULLS LAST;\n\n`
        + `-- Conferência 2: portas da parede que não encontraram armário no banco.\n`
        + `SELECT e.numero FROM (VALUES ${numeros.map((n) => `(${n})`).join(', ')}) AS e(numero)\n`
        + ` WHERE NOT EXISTS (SELECT 1 FROM lockers l JOIN schools s ON s.id = l.school_id\n`
        + `                    WHERE s.codigo = ${codigo} AND l.item_id IS NOT NULL AND ${numeroDoNome('l')} = e.numero)\n`
        + ` ORDER BY e.numero;\n\n`
        + `-- Conferência 3: números repetidos na escola (não foram ligados).\n`
        + `SELECT ${numeroDoNome('l')} AS numero, count(*) FROM lockers l JOIN schools s ON s.id = l.school_id\n`
        + ` WHERE s.codigo = ${codigo} GROUP BY 1 HAVING count(*) > 1 ORDER BY 1;\n`;

    return sql;
}

const chamadoDireto = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (chamadoDireto) {
    (async () => {
        const [, , moduloDoMapa, arquivoDeSaida] = process.argv;
        const { default: mapa } = await import(pathToFileURL(resolve(moduloDoMapa)).href);
        writeFileSync(arquivoDeSaida, gerarSqlMapa(mapa));
        console.log(`SQL gerado em ${arquivoDeSaida}`);
    })();
}
