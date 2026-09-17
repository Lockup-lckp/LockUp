import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desenharParede } from './desenhoParede.js';
import { montarCorredor } from './geometria.js';
import { paletaDoMapa } from './estiloMapa.js';

const corredor = {
    id: 'c2',
    nome: 'Corredor <2>',
    itens: [
        { id: 'p0', tipo: 'portal' },
        { id: 'p12', tipo: 'porta', numero: '12' },
        { id: 'est', tipo: 'porta', variante: 'estoque' },
        { id: 'lab', tipo: 'porta', variante: 'laboratorio', rotulo: 'Ciências' },
        { id: 'b1', tipo: 'bloco', tom: 'escuro', larguras: [30, 30] },
        { id: 'sn', tipo: 'fundo', variante: 'vidro', rotulo: 'Salão Nobre' }
    ]
};

const armarios = [
    { id: 'a1', nome: '347', item_id: 'b1', coluna: 0, linha: 0, estado: 'livre', meu: false },
    { id: 'a2', nome: '348', item_id: 'b1', coluna: 1, linha: 0, estado: 'ocupado', meu: false },
    // linha 1 da coluna 1 fica sem armário de propósito
    { id: 'a3', nome: '351', item_id: 'b1', coluna: 1, linha: 2, estado: 'manutencao', meu: false }
];

const desenhar = () => {
    const lay = montarCorredor(corredor, armarios);
    return { lay, svg: desenharParede(corredor, lay, paletaDoMapa(null)) };
};

test('desenha um svg do tamanho do corredor com margem dos dois lados', () => {
    const { lay, svg } = desenhar();
    assert.match(svg, new RegExp(`^<svg viewBox="-600 0 ${lay.comprimento + 1200} 340"`));
    assert.match(svg, /<\/svg>$/);
});

test('um grupo por armário, com id e estado', () => {
    const { svg } = desenhar();
    assert.equal((svg.match(/class="armario"/g) || []).length, 3);
    assert.match(svg, /data-id="a1" data-estado="livre" role="button" tabindex="0"/);
    assert.match(svg, /data-id="a2" data-estado="ocupado" role="img"/);
    assert.match(svg, /data-id="a3" data-estado="manutencao" role="img"/);
    assert.match(svg, />347<\/text>/);
});

test('célula sem armário vira porta vazia, sem grupo clicável', () => {
    const { svg } = desenhar();
    assert.equal((svg.match(/class="porta-vazia"/g) || []).length, 1);
});

test('estoque não tem placa; sala e laboratório têm', () => {
    const { svg } = desenhar();
    assert.equal((svg.match(/>SALA DE AULA<\/text>/g) || []).length, 1);
    assert.equal((svg.match(/>LABORATÓRIO<\/text>/g) || []).length, 1);
    assert.match(svg, />SALÃO NOBRE<\/text>/);
});

test('escapa texto vindo do banco', () => {
    const { svg } = desenhar();
    assert.match(svg, /CORREDOR &lt;2>/);
    assert.doesNotMatch(svg, /<2>/);
});
