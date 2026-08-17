import { createContext, useContext } from 'react';

// Contexto da escola da URL, separado do componente que o provê.
//
// Por que em arquivo próprio: o Fast Refresh do Vite só preserva o estado da
// tela quando o módulo exporta APENAS componentes. Com o hook morando junto do
// EscolaProvider, cada salvamento durante o desenvolvimento recarregava a
// aplicação inteira e derrubava o estado — inclusive o formulário que estava
// sendo testado no momento.
export const EscolaContext = createContext(null);

/**
 * Acesso à escola da URL (identidade visual, valor do armário, calendário).
 *
 * Lança em vez de devolver null: uma tela usada fora do provedor é erro de
 * montagem da rota, e falhar aqui aponta a causa. Devolvendo null, o erro
 * apareceria bem longe, como "não consigo ler propriedade de null".
 */
export const useEscola = () => {
  const ctx = useContext(EscolaContext);
  if (!ctx) {
    throw new Error('useEscola precisa ser usado dentro de <EscolaProvider>.');
  }
  return ctx;
};
