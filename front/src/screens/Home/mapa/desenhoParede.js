// A parede do corredor em SVG, como texto. Todo texto que vem do banco passa
// por `texto()` antes de entrar no desenho.
import { ALTURA, MARGEM } from './geometria.js';

const COR_ESTADO = { livre: '#3D7BEA', ocupado: '#DC4438', manutencao: 'url(#listras)' };
const NOME_ESTADO = { livre: 'livre', ocupado: 'ocupado', manutencao: 'em manutenção' };

const f = (n) => Math.round(n * 100) / 100;
const texto = (valor) => String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ret = (x, y, w, h, extra = '') =>
    `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" ${extra}/>`;

function placa(x, y, largura, linha1, linha2, tamanho2, P) {
    const meio = x + largura / 2;
    let s = ret(x, y + 1, largura, 50, 'rx="3" fill="#000000" fill-opacity=".35"')
        + ret(x, y, largura, 50, 'rx="3" fill="#F4F6F8"')
        + ret(x + 6, y + 6, 8, 8, `rx="1" fill="${P.marcaPlaca}"`)
        + `<text class="mapa-t-placa" x="${f(meio + 5)}" y="${f(y + 13.5)}" font-size="6.2" text-anchor="middle">${texto(linha1)}</text>`;
    if (linha2) {
        s += `<text class="mapa-t-placa" x="${f(meio)}" y="${f(y + 42)}" font-size="${tamanho2}" text-anchor="middle">${texto(linha2)}</text>`;
    }
    return s;
}

function desenharBloco(item, P) {
    const topo = 100;
    const corpoAltura = 192;
    const w = item.largura;
    const corpo = item.tom === 'claro' ? P.armario_claro : P.armario_escuro;
    let s = '';

    // reflexo no piso, cortado por um véu da cor do chão
    s += ret(item.x + 3, 300, w - 6, 34, `fill="${corpo}" fill-opacity=".22"`);
    s += ret(item.x + 3, 300, w - 6, 34, 'fill="url(#pisoVeu)"');

    s += ret(item.x, topo, w, corpoAltura, `rx="3" fill="${corpo}"`);
    s += ret(item.x, topo, w, corpoAltura, 'rx="3" fill="url(#corpoBrilho)"');
    s += ret(item.x + 2, topo, w - 4, 3, 'rx="1.5" fill="#FFFFFF" fill-opacity=".14"');
    s += ret(item.x + 5, topo + corpoAltura, 7, 8, 'rx="1" fill="#05090F" fill-opacity=".8"');
    s += ret(item.x + w - 12, topo + corpoAltura, 7, 8, 'rx="1" fill="#05090F" fill-opacity=".8"');

    const areaTopo = topo + 9;
    const areaAltura = corpoAltura - 13;
    let cx = item.x + 4;

    item.colunas.forEach((celulas, c) => {
        const cw = item.larguras[c];
        s += ret(cx + cw * 0.22, topo + 5.5, cw * 0.56, 2.4, 'rx="1.2" fill="#000000" fill-opacity=".38"');
        const celula = celulas.length ? areaAltura / celulas.length : areaAltura;

        celulas.forEach((armario, linha) => {
            const y = areaTopo + linha * celula;

            if (!armario) {
                s += ret(cx + 1.5, y + 1.5, cw - 3, celula - 3, 'class="porta-vazia" rx="2" fill="#000000" fill-opacity=".22"');
                return;
            }

            const estado = armario.estado;
            const larguraEtiqueta = Math.min(cw - 7, 24);
            const papel = estado === 'livre' ? 'role="button" tabindex="0"' : 'role="img"';

            s += `<g class="armario" data-id="${texto(armario.id)}" data-estado="${estado}" ${papel} aria-label="Armário ${texto(armario.nome)}, ${NOME_ESTADO[estado]}">`;
            s += ret(cx + 1.5, y + 1.5, cw - 3, celula - 3, `class="porta-armario" rx="2" fill="${COR_ESTADO[estado]}"`);
            s += ret(cx + 1.5, y + 1.5, cw - 3, celula - 3, 'rx="2" fill="url(#portaBrilho)" pointer-events="none"');

            if (celula >= 32) {
                for (let i = 0; i < 4; i++) {
                    s += ret(cx + cw * 0.44, y + celula * 0.36 + i * 4.6, cw * 0.38, 1.8, 'rx=".9" fill="#04080F" fill-opacity=".26"');
                }
            }

            s += ret(cx + 4, y + 5.6, larguraEtiqueta, 12, 'rx="1.5" fill="#000000" fill-opacity=".3"');
            s += ret(cx + 4, y + 5, larguraEtiqueta, 12, 'rx="1.5" fill="#F7F9FB"');
            s += `<text class="mapa-t-num" x="${f(cx + 4 + larguraEtiqueta / 2)}" y="${f(y + 14.3)}" font-size="8.6" text-anchor="middle">${texto(armario.nome)}</text>`;

            if (estado === 'ocupado') {
                s += `<path d="M${f(cx + cw - 6)} ${f(y + celula * 0.46)} v-2.4 a2.1 2.1 0 0 0-4.2 0 v2.4" fill="none" stroke="#E7E9EC" stroke-opacity=".75" stroke-width="1.1"/>`;
                s += ret(cx + cw - 9.2, y + celula * 0.46, 6.5, 6.5, 'rx="1.4" fill="#E0BC63"');
            } else {
                s += ret(cx + cw - 7, y + celula * 0.42, 2.6, 8, 'rx="1.3" fill="#04080F" fill-opacity=".34"');
            }

            s += ret(cx + 0.3, y + 0.3, cw - 0.6, celula - 0.6, 'class="anel" rx="2.5" pointer-events="none"');
            s += '</g>';
        });

        cx += cw;
    });

    return s;
}

function desenharPorta(item, P) {
    const x = item.x;
    let s = '';

    s += ret(x + 6, 300, 98, 30, `fill="${P.porta}" fill-opacity=".3"`);
    s += ret(x + 6, 300, 98, 30, 'fill="url(#pisoVeu)"');
    s += ret(x, 84, 110, 216, `rx="2" fill="${P.batente}"`);
    s += ret(x + 9, 92, 92, 208, `rx="1.5" fill="${P.porta}"`);
    s += ret(x + 9, 92, 92, 208, 'rx="1.5" fill="url(#portaMadeira)"');
    s += ret(x + 20, 112, 70, 78, 'rx="3" fill="#000000" fill-opacity=".14"');
    s += ret(x + 20, 204, 70, 78, 'rx="3" fill="#000000" fill-opacity=".14"');
    s += ret(x + 86, 196, 5, 26, 'rx="2.5" fill="#C9CCCD"');

    // estoque não tem placa na escola, então aqui também não
    if (item.variante === 'laboratorio') {
        s += placa(x + 11, 24, 88, 'LABORATÓRIO', item.rotulo.toUpperCase(), item.rotulo.length > 10 ? 9 : 12, P);
    } else if (item.variante !== 'estoque' && item.numero) {
        s += placa(x + 22, 24, 66, 'SALA DE AULA', item.numero, 24, P);
    }
    return s;
}

function desenharFundo(item, P) {
    const x = item.x;
    let s = ret(x, 0, 150, 340, `fill="${P.parede}"`)
        + ret(x, 0, 150, 340, 'fill="#000000" fill-opacity=".22"')
        + ret(x, 200, 150, 100, `fill="${P.faixa}"`)
        + ret(x, 200, 150, 100, 'fill="#000000" fill-opacity=".2"')
        + ret(x, 0, 4, 340, 'fill="#000000" fill-opacity=".4"');

    if (item.variante === 'vidro') {
        s += ret(x + 18, 92, 114, 208, 'rx="2" fill="#2A3444"')
            + ret(x + 24, 98, 49, 202, 'fill="#8DB4E6" fill-opacity=".2"')
            + ret(x + 77, 98, 49, 202, 'fill="#8DB4E6" fill-opacity=".2"')
            + `<path d="M${x + 30} 104 L${x + 50} 104 L${x + 30} 150 Z" fill="#FFFFFF" fill-opacity=".12"/>`
            + `<path d="M${x + 83} 104 L${x + 103} 104 L${x + 83} 150 Z" fill="#FFFFFF" fill-opacity=".12"/>`
            + ret(x + 65, 180, 3, 44, 'rx="1.5" fill="#C9CCCD"')
            + ret(x + 82, 180, 3, 44, 'rx="1.5" fill="#C9CCCD"')
            + ret(x + 20, 40, 110, 42, 'rx="3" fill="#000000" fill-opacity=".35"')
            + ret(x + 20, 39, 110, 42, 'rx="3" fill="#F4F6F8"')
            + `<text class="mapa-t-placa" x="${x + 75}" y="66" font-size="13" text-anchor="middle">${texto(item.rotulo.toUpperCase())}</text>`;
        return s;
    }

    s += ret(x + 30, 96, 90, 204, `rx="2" fill="${P.batente}"`)
        + ret(x + 38, 103, 74, 197, `rx="1.5" fill="${P.porta}"`)
        + ret(x + 38, 103, 74, 197, 'rx="1.5" fill="url(#portaMadeira)"')
        + ret(x + 100, 200, 4, 22, 'rx="2" fill="#C9CCCD"');

    if (item.numero) s += placa(x + 42, 36, 66, 'SALA DE AULA', item.numero, 24, P);
    return s;
}

function desenharItem(item, P, corredor, lay) {
    const x = item.x;

    switch (item.tipo) {
        case 'bloco': return desenharBloco(item, P);
        case 'porta': return desenharPorta(item, P);
        case 'fundo': return desenharFundo(item, P);

        case 'portal': {
            const linha2 = lay.salas ? `(${lay.salas.toUpperCase()})` : '';
            return ret(x, 0, 36, 300, `fill="${P.portal}"`)
                + ret(x, 0, 36, 300, 'fill="url(#corpoBrilho)"')
                + ret(x + 36, 0, 5, 300, 'fill="#000000" fill-opacity=".3"')
                + ret(x + 50, 111, 128, 44, 'rx="3" fill="#000000" fill-opacity=".35"')
                + ret(x + 50, 110, 128, 44, 'rx="3" fill="#F4F6F8"')
                + `<text class="mapa-t-placa" x="${x + 114}" y="129" font-size="12.5" text-anchor="middle">${texto(corredor.nome.toUpperCase())}</text>`
                + `<text class="mapa-t-placa" x="${x + 114}" y="145" font-size="6.4" text-anchor="middle">${texto(linha2)}</text>`;
        }

        case 'fim':
            return ret(x, 0, 90, 340, `fill="${P.parede}"`)
                + ret(x, 0, 90, 340, 'fill="#000000" fill-opacity=".22"')
                + ret(x, 200, 90, 100, `fill="${P.faixa}"`)
                + ret(x, 0, 4, 340, 'fill="#000000" fill-opacity=".4"');

        case 'hidrante':
            return ret(x + 31, 11, 8, 132, 'fill="#A83A31"')
                + ret(x - 14, 196, 12, 16, 'rx="2" fill="#C4552F"')
                + ret(x, 140, 70, 112, 'rx="4" fill="#C0362B"')
                + ret(x, 140, 70, 112, 'rx="4" fill="url(#corpoBrilho)"')
                + `<circle cx="${x + 35}" cy="176" r="13" fill="#12161C" stroke="#DFE3E8" stroke-opacity=".7" stroke-width="3"/>`
                + ret(x + 22, 228, 26, 3, 'rx="1.5" fill="#000000" fill-opacity=".3"')
                + ret(x + 22, 235, 26, 3, 'rx="1.5" fill="#000000" fill-opacity=".3"')
                + ret(x + 56, 252, 8, 48, 'fill="#A83A31"');

        case 'extintor':
            return ret(x + 2, 250, 22, 3, 'rx="1.5" fill="#4A4F57"')
                + ret(x + 9, 236, 8, 10, 'rx="2" fill="#2B3038"')
                + ret(x + 4, 244, 18, 54, 'rx="8" fill="#C0362B"')
                + ret(x + 4, 244, 18, 54, 'rx="8" fill="url(#corpoBrilho)"')
                + ret(x + 7, 264, 12, 14, 'rx="2" fill="#F4F6F8" fill-opacity=".8"');

        case 'lixeira':
            return `<path d="M${x + 3} 262 L${x + 39} 262 L${x + 36} 300 L${x + 6} 300 Z" fill="#9AA3AF" fill-opacity=".55"/>`
                + ret(x, 255, 42, 9, 'rx="4" fill="#B6BEC9" fill-opacity=".6"');

        case 'mural':
            return ret(x, 112, 110, 78, 'rx="3" fill="#1D5B41" stroke="#8E97A3" stroke-opacity=".5" stroke-width="4"')
                + ret(x + 62, 122, 30, 38, `rx="1" fill="#E8E4D6" fill-opacity=".85" transform="rotate(-8 ${x + 77} 141)"`);

        case 'quadro':
            return ret(x, 118, 40, 62, 'rx="3" fill="#39414D" stroke="#7E8794" stroke-opacity=".4" stroke-width="1.5"')
                + ret(x + 6, 128, 28, 8, 'rx="2" fill="#20262F"');

        case 'rampa': {
            let s = '';
            for (const d of [0, 24]) {
                s += `<path d="M${x} ${226 + d} L${x + 210} ${250 + d}" stroke="#3C63B0" stroke-width="4" fill="none" stroke-linecap="round"/>`;
            }
            for (const dx of [10, 105, 200]) {
                const y = 226 + (dx * 24) / 210;
                s += ret(x + dx, y, 4, 300 - y, 'rx="2" fill="#3C63B0"');
            }
            return s;
        }

        default:
            return '';
    }
}

export function desenharParede(corredor, lay, paleta) {
    const P = paleta;
    const inicio = -MARGEM;
    const fim = lay.comprimento;
    const W = fim - inicio;

    let s = `<svg viewBox="${inicio} 0 ${lay.comprimento + MARGEM * 2} ${ALTURA}" role="group" aria-label="Parede do ${texto(corredor.nome)}">`;

    s += '<defs>'
        + '<linearGradient id="corpoBrilho" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".13"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".2"/></linearGradient>'
        + '<linearGradient id="portaBrilho" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".17"/><stop offset=".55" stop-color="#FFFFFF" stop-opacity=".02"/><stop offset="1" stop-color="#000000" stop-opacity=".16"/></linearGradient>'
        + '<linearGradient id="portaMadeira" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".12"/><stop offset=".3" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".22"/></linearGradient>'
        + '<linearGradient id="paredeLuz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".09"/><stop offset=".6" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
        + `<linearGradient id="pisoVeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.piso}" stop-opacity=".5"/><stop offset="1" stop-color="${P.piso}" stop-opacity="1"/></linearGradient>`
        + '<linearGradient id="vidroLuz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".02"/></linearGradient>'
        + '<radialGradient id="luz"><stop offset="0" stop-color="#DCE8FF" stop-opacity=".22"/><stop offset="1" stop-color="#DCE8FF" stop-opacity="0"/></radialGradient>'
        + '<pattern id="listras" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#F0BE2C"/><rect width="3.6" height="9" fill="#181818" fill-opacity=".58"/></pattern>'
        + '</defs>';

    s += ret(inicio, 0, W, 300, `fill="${P.parede}"`);
    s += ret(inicio, 0, W, 300, 'fill="url(#paredeLuz)"');
    s += ret(inicio, 0, W, 7, `fill="${P.faixaLinha}"`);
    s += ret(inicio, 7, W, 4, `fill="${P.cano}"`);

    s += ret(inicio, 16, W, 68, `fill="${P.vidro}"`);
    s += ret(inicio, 16, W, 68, 'fill="url(#vidroLuz)"');
    for (let m = inicio; m < fim; m += 240) {
        s += `<path d="M${m + 30} 19 L${m + 62} 19 L${m + 22} 81 L${m - 10} 81 Z" fill="#FFFFFF" fill-opacity=".07"/>`;
    }
    for (let m = inicio; m < fim; m += 80) s += ret(m, 16, 3, 68, `fill="${P.caixilho}"`);
    s += ret(inicio, 16, W, 3, `fill="${P.caixilho}"`);
    s += ret(inicio, 81, W, 3, `fill="${P.caixilho}"`);

    s += ret(inicio, 200, W, 100, `fill="${P.faixa}"`);
    s += ret(inicio, 200, W, 2, 'fill="#FFFFFF" fill-opacity=".08"');

    s += ret(inicio, 300, W, 40, `fill="${P.piso}"`);
    for (let m = inicio; m < fim; m += 60) s += ret(m, 300, 1.2, 40, `fill="${P.pisoJunta}"`);
    s += ret(inicio, 319, W, 1.2, `fill="${P.pisoJunta}"`);
    s += ret(inicio, 297, W, 3, 'fill="#000000" fill-opacity=".25"');

    // lâmpadas do forro e as poças de luz que elas jogam na parede e no chão
    for (let m = inicio + 120; m < fim; m += 380) {
        s += `<ellipse cx="${m + 60}" cy="40" rx="210" ry="120" fill="url(#luz)"/>`;
        s += `<ellipse cx="${m + 60}" cy="316" rx="150" ry="18" fill="url(#luz)"/>`;
        s += ret(m, 1, 120, 5, 'rx="2.5" fill="#E6EEFF" fill-opacity=".8"');
    }

    for (const item of lay.itens) s += desenharItem(item, P, corredor, lay);

    return `${s}</svg>`;
}
