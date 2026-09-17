// Gera o SQL que cadastra os armários que o mapa desenha mas o banco ainda não tem.
//
// Uso: node scripts/gerarSqlArmarios.js scripts/mapas/bentoQuirino.js sql/2026-09-17-armarios-bento-quirino.sql
//
// Rodar DEPOIS da carga do mapa: cada armário novo já nasce ligado à sua porta
// (bloco, coluna e linha). Só insere números que faltam; o que já existe,
// inclusive alugado, fica como está.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { posicoesDoBloco, sqlTexto } from './gerarSqlMapa.js';

// o corredor 1, 2 e 3 já é gravado assim pelo cadastro em lote
const NOME_CORREDOR = { mecanica: 'Mecânica' };

export function gerarSqlArmarios(mapa) {
    const linhas = mapa.corredores.flatMap((corredor) => corredor.itens.flatMap((item, indice) => {
        if (item.tipo !== 'bloco') return [];
        const nome = sqlTexto(NOME_CORREDOR[corredor.codigo] ?? corredor.codigo);
        return posicoesDoBloco(item.colunas).map(({ numero, coluna, linha }) =>
            `(${numero}, ${nome}, ${sqlTexto(corredor.codigo)}, ${indice + 1}, ${coluna}, ${linha})`);
    }));
    const escola = sqlTexto(mapa.codigoEscola);

    return `-- Cadastra os armários do mapa da escola ${mapa.codigoEscola} que ainda não existem no banco.\n`
        + `-- Gerado por Backend/scripts/gerarSqlArmarios.js. Pode ser rodado de novo: só insere o que falta.\n`
        + `-- Rodar DEPOIS de 2026-09-16-mapa-bento-quirino.sql.\n\n`
        + `INSERT INTO lockers (nome, corredor, status, school_id, item_id, coluna, linha)\n`
        + `SELECT lpad(a.numero::text, 3, '0'), a.corredor, 'disponivel', s.id, i.id, a.coluna, a.linha\n`
        + `  FROM (VALUES ${linhas.join(', ')}) AS a(numero, corredor, codigo, ordem, coluna, linha)\n`
        + `  JOIN schools s ON s.codigo = ${escola}\n`
        + `  JOIN corredores c ON c.school_id = s.id AND c.codigo = a.codigo\n`
        + `  JOIN corredor_itens i ON i.corredor_id = c.id AND i.ordem = a.ordem\n`
        + ` WHERE NOT EXISTS (SELECT 1 FROM lockers l WHERE l.school_id = s.id\n`
        + `                     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = a.numero);\n\n`
        + `-- Conferência: armários por corredor e quantos estão na parede.\n`
        + `SELECT l.corredor, count(*) AS total, count(l.item_id) AS na_parede FROM lockers l JOIN schools s ON s.id = l.school_id\n`
        + ` WHERE s.codigo = ${escola} GROUP BY 1 ORDER BY 1;\n`;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
    const [, , entrada, saida] = process.argv;
    const { default: mapa } = await import(pathToFileURL(resolve(entrada)).href);
    writeFileSync(saida, gerarSqlArmarios(mapa));
    console.log(`SQL gravado em ${saida}`);
}
