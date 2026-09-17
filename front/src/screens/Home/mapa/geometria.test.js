import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarCorredor, enquadrar, MARGEM } from './geometria.js';

const corredor = {
    id: 'c3',
    itens: [
        { id: 'p0', tipo: 'portal' },
        { id: 'p13', tipo: 'porta', numero: '13' },
        { id: 'b1', tipo: 'bloco', tom: 'claro', larguras: [30, 30] },
        { id: 'est', tipo: 'porta', variante: 'estoque' },
        { id: 'b2', tipo: 'bloco', tom: 'escuro', larguras: [46] },
        { id: 'p15', tipo: 'porta', numero: '15' },
        { id: 'f16', tipo: 'fundo', numero: '16' }
    ]
};

const armarios = [
    { id: 'a1', nome: '379', item_id: 'b1', coluna: 0, linha: 0, estado: 'livre', meu: false },
    { id: 'a2', nome: '381', item_id: 'b1', coluna: 0, linha: 1, estado: 'ocupado', meu: false },
    { id: 'a3', nome: '380', item_id: 'b1', coluna: 1, linha: 0, estado: 'livre', meu: false },
    { id: 'a4', nome: '569', item_id: 'b2', coluna: 0, linha: 2, estado: 'manutencao', meu: false },
    { id: 'fora', nome: '001', item_id: 'outro', coluna: 0, linha: 0, estado: 'livre', meu: false }
];

test('posiciona os itens com o espaço menor entre blocos vizinhos', () => {
    const lay = montarCorredor(corredor, armarios);
    const [portal, porta13, bloco1] = lay.itens;
    assert.equal(portal.x, 40);
    assert.equal(porta13.x, portal.x + portal.largura + 28);
    assert.equal(bloco1.x, porta13.x + porta13.largura + 28);
    assert.equal(bloco1.largura, 30 + 30 + 8);
    assert.equal(lay.comprimento, lay.itens.at(-1).x + lay.itens.at(-1).largura);
});

test('monta as colunas do bloco pela coluna e linha de cada armário', () => {
    const lay = montarCorredor(corredor, armarios);
    const bloco1 = lay.itens.find((i) => i.id === 'b1');
    assert.deepEqual(bloco1.colunas.map((col) => col.map((a) => a?.id ?? null)), [['a1', 'a2'], ['a3']]);
    const bloco2 = lay.itens.find((i) => i.id === 'b2');
    assert.deepEqual(bloco2.colunas[0].map((a) => a?.id ?? null), [null, null, 'a4']);
});

test('fim do corredor e estoque não viram parada', () => {
    const lay = montarCorredor(corredor, armarios);
    assert.deepEqual(lay.paradas.map((p) => [p.tipo, p.rotulo]), [
        ['porta', '13'], ['bloco', ''], ['bloco', ''], ['porta', '15']
    ]);
});

test('descreve o local pela última porta com placa e ignora o estoque na contagem de paradas', () => {
    const lay = montarCorredor(corredor, armarios);
    assert.equal(lay.paradas[1].local, 'Perto da Sala 13');
    assert.equal(lay.paradas[2].local, 'Perto do Estoque');
    assert.equal(lay.itens.find((i) => i.id === 'b1').local, 'Perto da Sala 13');
});

test('conta livres só dos armários deste corredor e resume as salas', () => {
    const lay = montarCorredor(corredor, armarios);
    assert.equal(lay.livres, 2);
    assert.equal(lay.salas, 'Salas 13 a 16');
});

test('no celular cada parada cabe inteira na largura, acima da faixa das setas', () => {
    const lay = montarCorredor(corredor, armarios);
    const quadros = enquadrar(lay, 370, 560, true);
    lay.paradas.forEach((p, i) => {
        const { escala, tx } = quadros[i];
        const inicio = tx + (p.centro - p.largura / 2 + MARGEM) * escala;
        const fim = tx + (p.centro + p.largura / 2 + MARGEM) * escala;
        assert.ok(inicio >= 9.9 && fim <= 360.1, `parada ${i} saiu da tela: ${inicio}..${fim}`);
        assert.ok((p.base - p.topo) * escala <= 560 - 82 + 0.1);
    });
});

test('no computador a escala é a mesma para o corredor todo', () => {
    const lay = montarCorredor(corredor, armarios);
    const escalas = new Set(enquadrar(lay, 1300, 520, false).map((q) => q.escala));
    assert.equal(escalas.size, 1);
});
