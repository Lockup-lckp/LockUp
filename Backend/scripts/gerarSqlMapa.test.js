import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grade, posicoesDoBloco, gerarSqlMapa, sqlTexto } from './gerarSqlMapa.js';

test('grade numera por linha, da esquerda para a direita', () => {
    assert.deepEqual(grade(85, 4, 3), [[85, 89, 93], [86, 90, 94], [87, 91, 95], [88, 92, 96]]);
});

test('posicoesDoBloco aceita colunas de alturas diferentes', () => {
    assert.deepEqual(posicoesDoBloco([[533, 537], [535]]), [
        { numero: 533, coluna: 0, linha: 0 },
        { numero: 537, coluna: 0, linha: 1 },
        { numero: 535, coluna: 1, linha: 0 }
    ]);
});

test('sqlTexto escapa aspas e trata vazio como NULL', () => {
    assert.equal(sqlTexto("Sala d'água"), "'Sala d''água'");
    assert.equal(sqlTexto(null), 'NULL');
    assert.equal(sqlTexto(undefined), 'NULL');
});

const mapaPequeno = {
    codigoEscola: 'etec-teste',
    planta: {
        colunas_deitada: '1fr', linhas_deitada: '1fr', colunas_estreita: '1fr', linhas_estreita: '1fr',
        patio_area_deitada: '1 / 1 / 2 / 2', patio_area_estreita: '1 / 1 / 2 / 2',
        patio_recuo_deitada: null, patio_recuo_estreita: null
    },
    corredores: [{
        codigo: '1', nome: 'Corredor 1', nome_curto: 'Corredor', sigla: '1', cor: '#F5C542',
        area_deitada: '1 / 2 / 2 / 3', area_estreita: '1 / 2 / 2 / 3',
        itens: [
            { tipo: 'porta', numero: '01' },
            { tipo: 'bloco', tom: 'claro', larguras: [30, 30], colunas: [[1, 3], [2, 4]] }
        ]
    }]
};

test('gerarSqlMapa cria corredor, itens e liga armários por número', () => {
    const sql = gerarSqlMapa(mapaPequeno);
    assert.match(sql, /WHERE codigo = 'etec-teste'/);
    assert.match(sql, /INSERT INTO plantas/);
    assert.match(sql, /INSERT INTO corredores[\s\S]*'Corredor 1'/);
    assert.match(sql, /\(v_corredor, 1, 'porta', '01', NULL, NULL, NULL, NULL\)/);
    assert.match(sql, /\(v_corredor, 2, 'bloco', NULL, NULL, NULL, 'claro', ARRAY\[30, 30\]::smallint\[\]\)/);
    assert.match(sql, /VALUES \(1, 0, 0\), \(3, 0, 1\), \(2, 1, 0\), \(4, 1, 1\)/);
    assert.equal((sql.match(/UPDATE lockers l SET item_id/g) || []).length, 1);
    assert.match(sql, /Conferência 3/);
});
