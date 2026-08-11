// Paleta da marca LCKP, extraída da landing page — que é a referência visual
// do produto. Isto é a ÚNICA definição em JavaScript das cores da marca; o
// equivalente em CSS são os tokens de :root em src/index.css.
//
// A estilização é FIXA para todas as escolas: a instituição personaliza apenas
// a(s) logo(s) e onde elas aparecem, não as cores. Antes, a landing declarava as
// cores localmente e nenhuma outra tela conseguia herdá-las, o que produziu
// identidades visuais paralelas no sistema.
export const MARCA = Object.freeze({
  navy: '#0A1F44',
  navyDeep: '#06122B',
  surface: '#0D2A52',
  gold: '#E8B44A',
  goldDeep: '#C8912E',
  goldSoft: 'rgba(232,180,74,0.14)',
  sucesso: '#3DDC97',
  erro: '#EF4444'
});
