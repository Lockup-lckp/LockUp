import { useEffect } from 'react';

// Trava a rolagem do fundo enquanto um diálogo está aberto.
//
// Sem isso a roda do mouse e o gesto de arrastar atravessam o diálogo e movem a
// página atrás. Em tela pequena é pior: o dedo sai do diálogo, o fundo rola, e
// quando o diálogo fecha a pessoa está em outro ponto da tela sem entender por
// quê.
//
// `overflow: hidden` no body resolve no desktop, mas o Safari do iPhone ignora
// e continua rolando. Por isso o body vai para `position: fixed` com o
// deslocamento da rolagem atual — o fundo congela de verdade, e a posição é
// devolvida ao fechar.

// Contador, e não booleano: com dois diálogos abertos ao mesmo tempo (o
// contrato por cima do checkout, por exemplo), fechar um só destravaria a
// rolagem enquanto o outro ainda está na tela.
let travas = 0;
let posicaoSalva = 0;

const travar = () => {
  travas += 1;
  if (travas > 1) return;

  posicaoSalva = window.scrollY;

  // A barra de rolagem some junto com o overflow. Sem compensar a largura, todo
  // o conteúdo salta alguns pixels para o lado no instante em que o diálogo
  // abre — e salta de volta ao fechar.
  const larguraBarra = window.innerWidth - document.documentElement.clientWidth;

  const corpo = document.body.style;
  corpo.position = 'fixed';
  corpo.top = `-${posicaoSalva}px`;
  corpo.left = '0';
  corpo.right = '0';
  corpo.width = '100%';
  corpo.overflowY = 'scroll';
  if (larguraBarra > 0) corpo.paddingRight = `${larguraBarra}px`;
};

const destravar = () => {
  travas = Math.max(0, travas - 1);
  if (travas > 0) return;

  const corpo = document.body.style;
  corpo.position = '';
  corpo.top = '';
  corpo.left = '';
  corpo.right = '';
  corpo.width = '';
  corpo.overflowY = '';
  corpo.paddingRight = '';

  // `position: fixed` zera a rolagem: sem devolver a posição, a pessoa volta ao
  // topo da página toda vez que fecha um diálogo.
  window.scrollTo(0, posicaoSalva);
};

/**
 * Congela o fundo enquanto `ativo` for true.
 * @param {boolean} ativo
 */
export function useTravarScroll(ativo = true) {
  useEffect(() => {
    if (!ativo) return undefined;
    travar();
    return destravar;
  }, [ativo]);
}
