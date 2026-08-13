// Animações de entrada da landing sem biblioteca.
//
// Substitui o gsap + ScrollTrigger: todas as animações da landing eram do mesmo
// tipo — "aparecer deslizando/escalando quando entra na tela, uma vez só" — que
// é exatamente o que IntersectionObserver + transição CSS fazem nativamente.
//
// Progressive enhancement de propósito: o estado inicial escondido mora sob a
// classe `.anim-ativo`, adicionada aqui. Se este script não rodar, nada fica
// invisível — o conteúdo simplesmente aparece sem animação. Com o gsap, uma
// falha no carregamento deixava a landing em branco.

const PASSO_STAGGER = {
  '[data-reveal-group]': { alvo: '[data-reveal-item]', passo: 120 },
  '[data-passos]': { alvo: '[data-passo]', passo: 150 }
};

const ALVOS_SIMPLES = ['[data-reveal]', '[data-metrica]', '[data-cta]'];

// Marca como revelado, opcionalmente com atraso (para o efeito escalonado).
const revelar = (el, atrasoMs = 0) => {
  if (atrasoMs > 0) {
    el.style.transitionDelay = `${atrasoMs}ms`;
  }
  el.classList.add('revelado');
};

// Liga as animações num container (a raiz da landing).
// Devolve a função de limpeza, para usar no return do useEffect.
export function ligarAnimacoes(raiz) {
  if (!raiz) return () => {};

  const semMovimento =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Sem IntersectionObserver ou com movimento reduzido: mostra tudo de uma vez.
  // Não adiciona `.anim-ativo`, então o estado escondido nunca entra em cena.
  if (semMovimento || typeof IntersectionObserver === 'undefined') {
    return () => {};
  }

  raiz.classList.add('anim-ativo');

  // 1. Hero: entra na carga da página, sem depender de scroll.
  const hero = Array.from(raiz.querySelectorAll('[data-hero]'));
  const timerHero = setTimeout(() => {
    hero.forEach((el, i) => revelar(el, i * 120));
  }, 150);

  // 2. Um único observer para tudo que depende de scroll.
  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const el = entrada.target;
        observer.unobserve(el); // once: true

        const grupo = Object.entries(PASSO_STAGGER).find(([sel]) => el.matches(sel));
        if (grupo) {
          const [, { alvo, passo }] = grupo;
          el.querySelectorAll(alvo).forEach((filho, i) => revelar(filho, i * passo));
        } else {
          revelar(el);
        }
      });
    },
    // Equivale ao start 'top ~85%' que o ScrollTrigger usava.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
  );

  [...ALVOS_SIMPLES, ...Object.keys(PASSO_STAGGER)].forEach((sel) => {
    raiz.querySelectorAll(sel).forEach((el) => observer.observe(el));
  });

  return () => {
    clearTimeout(timerHero);
    observer.disconnect();
  };
}
