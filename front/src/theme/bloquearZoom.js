// Bloqueio de zoom do sistema, pedido explicitamente pelo usuário para o layout
// não "ficar esquisito" em telas pequenas.
//
// ATENÇÃO: isto viola o critério WCAG 1.4.4 (Resize Text) e prejudica usuários
// com baixa visão — inclusive alunos. A responsividade do checkout e do mapa de
// armários resolve o problema estético por conta própria, então este bloqueio é
// opcional na prática. Está isolado atrás da constante abaixo justamente para
// que desligá-lo seja trocar um booleano, sem tocar em mais nada.
export const BLOQUEAR_ZOOM = true;

const impedir = (evento) => evento.preventDefault();

export function aplicarBloqueioZoom() {
  if (!BLOQUEAR_ZOOM) return;

  // iOS ignora user-scalable=no na meta tag desde o iOS 10; a única forma de
  // impedir o pinça-para-ampliar por lá é cancelar os eventos de gesto.
  document.addEventListener('gesturestart', impedir, { passive: false });
  document.addEventListener('gesturechange', impedir, { passive: false });
  document.addEventListener('gestureend', impedir, { passive: false });

  // Zoom por Ctrl + roda do mouse (desktop). Sem a checagem de ctrlKey isto
  // travaria a rolagem normal da página.
  document.addEventListener(
    'wheel',
    (evento) => {
      if (evento.ctrlKey) evento.preventDefault();
    },
    { passive: false }
  );

  // Duplo-toque para ampliar: dois toques em menos de 300ms.
  let ultimoToque = 0;
  document.addEventListener(
    'touchend',
    (evento) => {
      const agora = Date.now();
      if (agora - ultimoToque <= 300) evento.preventDefault();
      ultimoToque = agora;
    },
    { passive: false }
  );
}
