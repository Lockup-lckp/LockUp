// Gera o SQL que cadastra os armários que o mapa desenha mas o banco ainda não tem.
//
// Uso: node scripts/gerarSqlArmarios.js scripts/mapas/bentoQuirino.js sql/2026-09-17-armarios-bento-quirino.sql
//
// Só insere números que faltam (o que já existe, inclusive alugado, fica como está).
// Depois rode de novo o SQL de carga do mapa para ligar cada armário à sua porta.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { posicoesDoBloco, sqlTexto } from './gerarSqlMapa.js';

// mesmo nome que o cadastro em lote grava: 001, 002...
const NOME_CORREDOR = { mecanica: 'Mecânica' };

export function gerarSqlArmarios(mapa) {
    const linhas = mapa.corredores.flatMap((corredor) => corredor.itens
        .filter((item) => item.tipo === 'bloco')
        .flatMap((item) => posicoesDoBloco(item.colunas))
        .map(({ numero }) => `(${numero}, ${sqlTexto(NOME_CORREDOR[corredor.codigo] ?? corredor.codigo)})`));

    return `-- Cadastra os armários do mapa da escola ${mapa.codigoEscola} que ainda não existem no banco.\n`
        + `-- Gerado por Backend/scripts/gerarSqlArmarios.js. Pode ser rodado de novo: só insere o que falta.\n`
        + `-- Depois rode de novo 2026-09-16-mapa-bento-quirino.sql para posicionar os novos na parede.\n\n`
        + `INSERT INTO lockers (nome, corredor, status, school_id)\n`
        + `SELECT lpad(a.numero::text, 3, '0'), a.corredor, 'disponivel', s.id\n`
        + `  FROM (VALUES ${linhas.join(', ')}) AS a(numero, corredor)\n`
        + `  JOIN schools s ON s.codigo = ${sqlTexto(mapa.codigoEscola)}\n`
        + ` WHERE NOT EXISTS (SELECT 1 FROM lockers l WHERE l.school_id = s.id\n`
        + `                     AND NULLIF(regexp_replace(l.nome, '[^0-9]', '', 'g'), '')::int = a.numero);\n\n`
        + `-- Conferência: armários por corredor.\n`
        + `SELECT l.corredor, count(*) FROM lockers l JOIN schools s ON s.id = l.school_id\n`
        + ` WHERE s.codigo = ${sqlTexto(mapa.codigoEscola)} GROUP BY 1 ORDER BY 1;\n`;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
    const [, , entrada, saida] = process.argv;
    const { default: mapa } = await import(pathToFileURL(resolve(entrada)).href);
    writeFileSync(saida, gerarSqlArmarios(mapa));
    console.log(`SQL gravado em ${saida}`);
}
