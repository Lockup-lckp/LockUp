import { useSyncExternalStore } from 'react';

// Celular = tela estreita, ou tela de toque até o tamanho de um tablet.
// Totem e computador ficam de fora e usam a cena com escala única.
const CONSULTA = '(max-width: 640px), (pointer: coarse) and (max-width: 1024px)';

function assinar(avisar) {
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener('change', avisar);
  return () => consulta.removeEventListener('change', avisar);
}

export function useCelular() {
  return useSyncExternalStore(assinar, () => window.matchMedia(CONSULTA).matches, () => false);
}
