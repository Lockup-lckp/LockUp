import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paletaDoMapa, variaveisCss, CORES_EDITAVEIS } from './estiloMapa.js';

test('sem estilo, a paleta é a escura padrão', () => {
    const paleta = paletaDoMapa(null);
    assert.equal(paleta.parede, '#16243D');
    assert.equal(paleta.texto, '#F2F5FA');
});

test('modo claro troca a base inteira', () => {
    const paleta = paletaDoMapa({ modo: 'claro', parede: '#000000' });
    assert.equal(paleta.parede, '#F3F2EE');
    assert.equal(paleta.texto, '#0A1F44');
});

test('personalizado aplica só as cores editáveis por cima do escuro', () => {
    const paleta = paletaDoMapa({ modo: 'personalizado', parede: '#123456', cano: '#FFFFFF' });
    assert.equal(paleta.parede, '#123456');
    assert.equal(paleta.cano, '#B14238');
});

test('as cores editáveis existem todas na paleta', () => {
    const paleta = paletaDoMapa(null);
    for (const { campo } of CORES_EDITAVEIS) assert.ok(paleta[campo], campo);
});

test('variaveisCss expõe o que os componentes usam', () => {
    const variaveis = variaveisCss(paletaDoMapa(null));
    assert.deepEqual(Object.keys(variaveis).sort(), [
        '--mapa-borda', '--mapa-carta', '--mapa-fundo', '--mapa-selecao', '--mapa-texto', '--mapa-texto-suave'
    ]);
});
