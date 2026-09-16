// Mapa do Bento Quirino levantado pelas fotos de 20/08/2026.
// Blocos marcados com EST têm numeração deduzida: a conferência do SQL gerado
// diz quais números não bateram com o banco.
import { grade } from '../gerarSqlMapa.js';

const LARGURA = { estreito: 30, medio: 38, largo: 46 };
const EST = { estimado: true };

const bloco = (tom, largura, colunas, extra = {}) => ({
    tipo: 'bloco',
    tom,
    larguras: Array.isArray(largura) ? largura : colunas.map(() => LARGURA[largura]),
    colunas,
    ...extra
});
const sala = (numero) => ({ tipo: 'porta', numero });
const laboratorio = (rotulo) => ({ tipo: 'porta', variante: 'laboratorio', rotulo });
const marco = (tipo, extra = {}) => ({ tipo, ...extra });

export default {
    codigoEscola: 'etec-043',
    planta: {
        colunas_deitada: 'minmax(0, 1fr) minmax(0, .9fr) minmax(0, 1.25fr)',
        linhas_deitada: 'repeat(6, minmax(0, 1fr))',
        colunas_estreita: 'minmax(0, 1fr) 34px minmax(0, 1.6fr)',
        linhas_estreita: 'repeat(6, minmax(0, 1fr))',
        patio_area_deitada: '1 / 1 / 7 / 3',
        patio_area_estreita: '1 / 1 / 7 / 3',
        patio_recuo_deitada: 'calc((100% - 14px) / 1.9 + 14px)',
        patio_recuo_estreita: 'calc(100% - 34px)'
    },
    corredores: [
        {
            codigo: '1', nome: 'Corredor 1', nome_curto: 'Corredor', sigla: '1', cor: '#F5C542',
            area_deitada: '5 / 3 / 7 / 4', area_estreita: '5 / 3 / 7 / 4',
            itens: [
                marco('portal'),
                sala('01'),
                bloco('claro', 'estreito', grade(1, 4, 5), EST),
                sala('02'),
                bloco('escuro', 'estreito', grade(21, 4, 5), EST),
                bloco('claro', 'estreito', grade(41, 4, 5), EST),
                sala('03'),
                marco('lixeira'),
                bloco('claro', 'estreito', grade(61, 4, 6), EST),
                bloco('claro', 'largo', grade(85, 4, 3)),
                bloco('escuro', 'medio', grade(97, 4, 4), EST),
                sala('04'),
                marco('hidrante'),
                bloco('escuro', 'estreito', grade(113, 6, 5), EST),
                marco('extintor'),
                sala('05'),
                bloco('claro', 'estreito', grade(143, 2, 5), EST),
                bloco('escuro', 'largo', grade(153, 4, 2)),
                bloco('escuro', 'largo', grade(161, 4, 2), EST),
                bloco('claro', 'medio', grade(169, 4, 4)),
                sala('06'),
                bloco('escuro', 'largo', grade(189, 4, 3)),
                sala('07'),
                marco('fundo')
            ]
        },
        {
            codigo: '2', nome: 'Corredor 2', nome_curto: 'Corredor', sigla: '2', cor: '#F28A30',
            area_deitada: '3 / 3 / 5 / 4', area_estreita: '3 / 3 / 5 / 4',
            itens: [
                marco('portal'),
                sala('08'),
                bloco('escuro', 'medio', grade(205, 4, 4)),
                bloco('escuro', 'estreito', grade(221, 4, 5), EST),
                bloco('claro', 'estreito', grade(241, 4, 4), EST),
                bloco('claro', 'estreito', grade(589, 4, 4), EST),
                bloco('claro', 'largo', grade(577, 2, 2)),
                bloco('claro', 'largo', grade(585, 2, 2)),
                sala('09'),
                bloco('escuro', 'estreito', grade(257, 4, 5)),
                bloco('escuro', 'estreito', grade(277, 4, 5), EST),
                bloco('claro', 'estreito', grade(297, 2, 5), EST),
                marco('quadro'),
                sala('10'),
                bloco('claro', 'estreito', grade(307, 4, 5), EST),
                bloco('escuro', 'estreito', grade(327, 4, 5), EST),
                sala('11'),
                marco('hidrante'),
                marco('extintor'),
                bloco('escuro', 'estreito', grade(347, 4, 4), EST),
                bloco('escuro', 'estreito', grade(363, 4, 4), EST),
                marco('lixeira'),
                sala('12'),
                // o Salão Nobre fecha o corredor de frente, não fica na parede das salas
                marco('fundo', { variante: 'vidro', rotulo: 'Salão Nobre' })
            ]
        },
        {
            codigo: '3', nome: 'Corredor 3', nome_curto: 'Corredor', sigla: '3', cor: '#E5484D',
            area_deitada: '1 / 3 / 3 / 4', area_estreita: '1 / 3 / 3 / 4',
            itens: [
                marco('portal'),
                marco('mural'),
                marco('extintor'),
                sala('13'),
                bloco('claro', 'estreito', grade(379, 4, 5), EST),
                bloco('escuro', 'largo', grade(399, 2, 3), EST),
                marco('hidrante'),
                sala('14'),
                marco('lixeira'),
                { tipo: 'porta', variante: 'estoque' },
                bloco('claro', 'largo', grade(569, 2, 3)),
                bloco('escuro', 'medio', grade(405, 4, 4)),
                bloco('escuro', 'estreito', grade(421, 4, 5), EST),
                bloco('claro', 'estreito', grade(441, 4, 5), EST),
                bloco('escuro', 'largo', grade(461, 2, 4), EST),
                bloco('claro', 'medio', grade(469, 4, 4)),
                sala('15'),
                marco('fundo', { numero: '16' })
            ]
        },
        {
            codigo: 'mecanica', nome: 'Mecânica', nome_curto: null, sigla: 'M', cor: '#3DBE6E',
            area_deitada: '1 / 1 / 4 / 2', area_estreita: '1 / 1 / 4 / 2',
            itens: [
                marco('rampa'),
                marco('extintor'),
                laboratorio('Ciências'),
                marco('quadro'),
                bloco('claro', 'estreito', grade(489, 2, 4)),
                bloco('claro', [36, 36, 44, 44], [[497, 499, 501, 503], [498, 500, 502, 504], [505, 507, 509], [506, 508, 510]]),
                sala('18'),
                bloco('claro', 'estreito', grade(513, 4, 5)),
                bloco('claro', [34, 34, 46, 46], [[533, 537, 541, 545], [534, 538, 542, 546], [535, 539, 543], [536, 540, 544]]),
                marco('fim')
            ]
        }
    ]
};
