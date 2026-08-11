// Como a escola chama a divisão física dos armários.
//
// A palavra "Bloco" estava escrita fixa em sete telas — mapa, modal de
// escolha, checkout, Meu Armário, gerenciamento, histórico e o relatório em
// PDF. Escola que fala "corredor" via "Bloco 3" em todo lugar.
//
// O dado continua em `lockers.corredor`: aqui só se decide a palavra.

const ROTULOS = {
  bloco: { singular: 'Bloco', plural: 'blocos' },
  corredor: { singular: 'Corredor', plural: 'corredores' }
};

const escolher = (escola) => ROTULOS[escola?.rotulo_corredor] || ROTULOS.bloco;

// "Bloco" / "Corredor" — para cabeçalho de coluna e rótulo de campo.
export const rotuloCorredor = (escola) => escolher(escola).singular;

// "blocos" / "corredores" — para "Todos os blocos".
export const rotuloCorredorPlural = (escola) => escolher(escola).plural;

// "Bloco 3" / "Corredor 3". Devolve traço quando não há corredor, para a tela
// não exibir "Bloco undefined".
export const nomearCorredor = (escola, corredor) => {
  if (corredor === null || corredor === undefined || corredor === '') return '—';
  return `${escolher(escola).singular} ${corredor}`;
};
