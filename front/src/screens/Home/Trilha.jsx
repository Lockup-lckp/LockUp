import { useEffect, useRef, useState } from 'react';

const ALTURA = 44;

// Posição de cada segmento e quais rótulos cabem sem encostar no anterior.
function segmentosDaTrilha(lay, largura) {
  const escala = (largura - 8) / lay.comprimento;
  const segmentos = [];
  let fimUltimoRotulo = -Infinity;

  lay.paradas.forEach((parada, indice) => {
    const larguraSegmento = Math.max(parada.largura * escala - 4, 6);
    const x = 4 + parada.centro * escala - larguraSegmento / 2;
    const ehPorta = parada.tipo === 'porta';
    const altura = ehPorta ? 12 : 8;
    const meio = x + larguraSegmento / 2;
    const meiaLarguraRotulo = parada.rotulo.length * 3.4;
    const cabeRotulo = ehPorta && parada.rotulo && meio - meiaLarguraRotulo > fimUltimoRotulo + 4;
    if (cabeRotulo) fimUltimoRotulo = meio + meiaLarguraRotulo;

    segmentos.push({
      indice,
      x,
      y: 10 + (12 - altura) / 2,
      largura: larguraSegmento,
      altura,
      meio,
      rotulo: cabeRotulo ? parada.rotulo : null
    });
  });

  return segmentos;
}

export default function Trilha({ lay, parada, aoEscolher }) {
  const ref = useRef(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return undefined;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.round(entrada.contentRect.width)));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const W = Math.max(240, largura);
  const segmentos = segmentosDaTrilha(lay, W);

  return (
    <div ref={ref} className="mapa-trilha">
      <svg width={W} height={ALTURA} viewBox={`0 0 ${W} ${ALTURA}`} role="group" aria-label="Posição no corredor">
        {segmentos.map((s) => (
          <g key={s.indice}>
            {/* alvo invisível da altura inteira da trilha, para acertar com o dedo */}
            <rect className="mapa-trilha__alvo" x={s.x - 2} y={0} width={s.largura + 4} height={ALTURA} onClick={() => aoEscolher(s.indice)} />
            <rect
              className={`mapa-trilha__seg${s.indice === parada ? ' mapa-trilha__seg--atual' : ''}`}
              x={s.x}
              y={s.y}
              width={s.largura}
              height={s.altura}
              rx={s.altura / 2}
            />
            {s.rotulo && (
              <text className="mapa-trilha__rotulo" x={s.meio} y={ALTURA - 6} textAnchor="middle">{s.rotulo}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
