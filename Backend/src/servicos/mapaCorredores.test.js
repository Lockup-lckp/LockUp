import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traduzirEstado, validarMapaEstilo, montarRespostaMapa } from './mapaCorredores.js';

test('traduzirEstado junta alugado e funcionario em ocupado', () => {
    assert.equal(traduzirEstado('disponivel'), 'livre');
    assert.equal(traduzirEstado('alugado'), 'ocupado');
    assert.equal(traduzirEstado('funcionario'), 'ocupado');
    assert.equal(traduzirEstado('manutencao'), 'manutencao');
});

test('traduzirEstado trata status desconhecido como ocupado, para não vender', () => {
    assert.equal(traduzirEstado('qualquer'), 'ocupado');
    assert.equal(traduzirEstado(undefined), 'ocupado');
});

test('validarMapaEstilo aceita null para voltar ao padrão', () => {
    assert.deepEqual(validarMapaEstilo(null), { valido: true, valor: null });
});

test('validarMapaEstilo normaliza as cores em maiúsculas', () => {
    const resultado = validarMapaEstilo({ modo: 'personalizado', parede: '#16243d', corredores: { 1: '#f5c542' } });
    assert.deepEqual(resultado, {
        valido: true,
        valor: { modo: 'personalizado', parede: '#16243D', corredores: { 1: '#F5C542' } }
    });
});

test('validarMapaEstilo recusa modo e cor inválidos', () => {
    assert.equal(validarMapaEstilo({ modo: 'neon' }).valido, false);
    assert.equal(validarMapaEstilo({ parede: 'azul' }).valido, false);
    assert.equal(validarMapaEstilo({ corredores: { 1: '#FFF' } }).valido, false);
    assert.equal(validarMapaEstilo([]).valido, false);
});

test('validarMapaEstilo ignora campos que não são do mapa', () => {
    assert.deepEqual(validarMapaEstilo({ modo: 'escuro', script: 'x' }).valor, { modo: 'escuro' });
});

test('montarRespostaMapa devolve só a lista vazia quando não há corredores', () => {
    assert.deepEqual(
        montarRespostaMapa({ planta: null, corredores: [], itens: [], armarios: [], usuarioId: 'u1', estilo: null }),
        { corredores: [] }
    );
});

test('montarRespostaMapa ordena, aplica a cor do admin e esconde o dono dos armários', () => {
    const resposta = montarRespostaMapa({
        planta: { school_id: 'e1', colunas_deitada: '1fr' },
        corredores: [
            { id: 'c2', codigo: '2', nome: 'Corredor 2', nome_curto: null, sigla: '2', cor: '#F28A30', ordem: 2, area_deitada: 'a', area_estreita: 'b' },
            { id: 'c1', codigo: '1', nome: 'Corredor 1', nome_curto: 'Corredor', sigla: '1', cor: '#F5C542', ordem: 1, area_deitada: 'c', area_estreita: 'd' }
        ],
        itens: [
            { id: 'i2', corredor_id: 'c1', ordem: 2, tipo: 'bloco', numero: null, rotulo: null, variante: null, tom: 'claro', larguras: [30, 30] },
            { id: 'i1', corredor_id: 'c1', ordem: 1, tipo: 'porta', numero: '01', rotulo: null, variante: null, tom: null, larguras: null }
        ],
        armarios: [
            { id: 'a1', nome: '001', corredor: '1', status: 'disponivel', usuario_id: null, item_id: 'i2', coluna: 0, linha: 0 },
            { id: 'a2', nome: '002', corredor: '1', status: 'alugado', usuario_id: 'u1', item_id: 'i2', coluna: 1, linha: 0 },
            { id: 'a3', nome: '003', corredor: '1', status: 'alugado', usuario_id: 'u9', item_id: 'i2', coluna: 0, linha: 1 }
        ],
        usuarioId: 'u1',
        estilo: { modo: 'escuro', corredores: { 1: '#111111' } }
    });

    assert.deepEqual(resposta.corredores.map(c => c.id), ['c1', 'c2']);
    assert.equal(resposta.corredores[0].cor, '#111111');
    assert.equal(resposta.corredores[1].cor, '#F28A30');
    assert.deepEqual(resposta.corredores[0].itens.map(i => i.id), ['i1', 'i2']);
    assert.deepEqual(resposta.armarios.map(a => [a.id, a.estado, a.meu]), [
        ['a1', 'livre', false], ['a2', 'ocupado', true], ['a3', 'ocupado', false]
    ]);
    for (const armario of resposta.armarios) {
        assert.equal('usuario_id' in armario, false);
        assert.equal('status' in armario, false);
    }
    assert.equal(resposta.planta.school_id, undefined);
});
