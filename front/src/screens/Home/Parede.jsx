import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { desenharParede } from './mapa/desenhoParede.js';
import { enquadrar, ALTURA, MARGEM } from './mapa/geometria.js';

const f = (n) => Math.round(n * 100) / 100;

// Leva a cena até a parada. O svg é redimensionado na escala final, para texto
// e etiqueta ficarem nítidos; a animação parte do quadro anterior convertido
// para essa escala nova.
function posicionarCena({ cena, trilho, focoEsq, focoDir }, lay, parada, celular, quadroAnterior, animar) {
  const svg = trilho?.firstElementChild;
  const alvo = lay.paradas[parada];
  if (!cena || !svg || !alvo) return quadroAnterior;

  const largura = cena.clientWidth;
  const quadro = enquadrar(lay, largura, cena.clientHeight, celular)[parada];

  svg.setAttribute('width', f((lay.comprimento + MARGEM * 2) * quadro.escala));
  svg.setAttribute('height', f(ALTURA * quadro.escala));

  trilho.style.transition = 'none';
  if (animar && quadroAnterior) {
    trilho.style.transform = `translate3d(${f(quadroAnterior.tx)}px, ${f(quadroAnterior.ty)}px, 0) scale(${quadroAnterior.escala / quadro.escala})`;
  }
  void trilho.offsetWidth;
  if (animar) trilho.style.transition = '';
  trilho.style.transform = `translate3d(${f(quadro.tx)}px, ${f(quadro.ty)}px, 0) scale(1)`;

  // no celular o que está fora da parada atual fica escurecido
  const inicio = quadro.tx + (alvo.centro - alvo.largura / 2 + MARGEM) * quadro.escala;
  const fim = quadro.tx + (alvo.centro + alvo.largura / 2 + MARGEM) * quadro.escala;
  focoEsq.style.transition = animar ? '' : 'none';
  focoDir.style.transition = animar ? '' : 'none';
  focoEsq.style.transform = `translateX(${f(inicio - 6 - largura)}px)`;
  focoDir.style.transform = `translateX(${f(fim + 6)}px)`;

  return quadro;
}

const Seta = ({ direcao }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={direcao === 'esq' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Parede({ corredor, lay, paleta, celular, parada, aoMudarParada, selecionadoId, aoTocarArmario }) {
  const cenaRef = useRef(null);
  const trilhoRef = useRef(null);
  const focoEsqRef = useRef(null);
  const focoDirRef = useRef(null);
  const quadroRef = useRef(null);
  const ultimoRef = useRef(null);
  const arrastoRef = useRef(null);
  const ignorarCliqueRef = useRef(false);

  const svg = useMemo(() => desenharParede(corredor, lay, paleta), [corredor, lay, paleta]);
  const ultima = lay.paradas.length - 1;
  const irPara = (indice) => aoMudarParada(Math.max(0, Math.min(ultima, indice)));

  // Anima só quando é a mesma parede e mudou a parada. Trocar de corredor,
  // de paleta ou entre celular e computador reposiciona sem deslizar.
  useLayoutEffect(() => {
    const ultimo = ultimoRef.current;
    const animar = Boolean(ultimo && ultimo.svg === svg && ultimo.celular === celular && ultimo.parada !== parada);
    const elementos = { cena: cenaRef.current, trilho: trilhoRef.current, focoEsq: focoEsqRef.current, focoDir: focoDirRef.current };
    quadroRef.current = posicionarCena(elementos, lay, parada, celular, animar ? quadroRef.current : null, animar);
    ultimoRef.current = { svg, celular, parada };
  }, [svg, lay, celular, parada]);

  // Observa a cena e a raiz: mudar só a altura da janela não redimensiona a cena.
  // O observer dispara ao começar a observar; comparar o tamanho evita que esse
  // disparo corte a animação da troca de parada.
  useEffect(() => {
    const cena = cenaRef.current;
    if (!cena) return undefined;
    let tamanho = `${cena.clientWidth}x${cena.clientHeight}`;

    const reposicionar = () => {
      const agora = `${cena.clientWidth}x${cena.clientHeight}`;
      if (agora === tamanho) return;
      tamanho = agora;
      const elementos = { cena, trilho: trilhoRef.current, focoEsq: focoEsqRef.current, focoDir: focoDirRef.current };
      quadroRef.current = posicionarCena(elementos, lay, parada, celular, null, false);
    };

    const observador = new ResizeObserver(reposicionar);
    observador.observe(cena);
    observador.observe(document.documentElement);
    window.addEventListener('resize', reposicionar);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', reposicionar);
    };
  }, [lay, parada, celular]);

  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    for (const g of trilho.querySelectorAll('.armario--selecionado')) {
      g.classList.remove('armario--selecionado');
      g.setAttribute('aria-pressed', 'false');
    }
    if (!selecionadoId) return;
    const g = trilho.querySelector(`.armario[data-id="${CSS.escape(selecionadoId)}"]`);
    if (g) {
      g.classList.add('armario--selecionado');
      g.setAttribute('aria-pressed', 'true');
    }
  }, [selecionadoId, svg]);

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === 'ArrowRight') aoMudarParada(Math.min(parada + 1, ultima));
      else if (e.key === 'ArrowLeft') aoMudarParada(Math.max(parada - 1, 0));
      else if (e.key === 'Escape' && selecionadoId) aoTocarArmario(selecionadoId);
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [parada, ultima, selecionadoId, aoMudarParada, aoTocarArmario]);

  const aoApertar = (e) => {
    arrastoRef.current = { x: e.clientX, moveu: false };
  };

  const aoMover = (e) => {
    const arrasto = arrastoRef.current;
    if (arrasto && Math.abs(e.clientX - arrasto.x) > 12) arrasto.moveu = true;
  };

  const aoSoltar = (e) => {
    const arrasto = arrastoRef.current;
    arrastoRef.current = null;
    if (!arrasto?.moveu) return;
    const deslocamento = e.clientX - arrasto.x;
    if (Math.abs(deslocamento) <= 45) return;
    irPara(parada + (deslocamento < 0 ? 1 : -1));
    // o click que vem depois do arrasto não pode selecionar armário
    ignorarCliqueRef.current = true;
    setTimeout(() => { ignorarCliqueRef.current = false; }, 0);
  };

  const armarioDoEvento = (e) => {
    const g = e.target.closest('.armario');
    return g?.dataset.estado === 'livre' ? g.dataset.id : null;
  };

  const aoClicar = (e) => {
    if (ignorarCliqueRef.current) return;
    const id = armarioDoEvento(e);
    if (id) aoTocarArmario(id);
  };

  const aoTeclarArmario = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const id = armarioDoEvento(e);
    if (!id) return;
    e.preventDefault();
    aoTocarArmario(id);
  };

  return (
    <div
      ref={cenaRef}
      className={`mapa-cena${celular ? ' mapa-cena--celular' : ''}`}
      onPointerDown={aoApertar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={() => { arrastoRef.current = null; }}
    >
      <div
        ref={trilhoRef}
        className="mapa-trilho"
        onClick={aoClicar}
        onKeyDown={aoTeclarArmario}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="mapa-vinheta" />
      <div ref={focoEsqRef} className="mapa-foco" onClick={() => irPara(parada - 1)} />
      <div ref={focoDirRef} className="mapa-foco" onClick={() => irPara(parada + 1)} />
      <span className="mapa-local">{lay.paradas[parada]?.local}</span>
      <button type="button" className="mapa-seta mapa-seta--esq" onClick={() => irPara(parada - 1)} disabled={parada === 0} aria-label="Bloco anterior">
        <Seta direcao="esq" />
      </button>
      <button type="button" className="mapa-seta mapa-seta--dir" onClick={() => irPara(parada + 1)} disabled={parada === ultima} aria-label="Próximo bloco">
        <Seta direcao="dir" />
      </button>
    </div>
  );
}
