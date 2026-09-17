// Um seletor de cor com leitura de contraste ao lado.
//
// O nativo <input type="color"> abre o seletor do sistema operacional, que o
// administrador ja sabe usar. O campo de texto ao lado existe porque marca de
// escola chega como codigo ("nosso bordo e #741012"), nao como ponto num
// gradiente.
export default function CampoCor({ titulo, ajuda, valor, aoMudar }) {
  const valida = /^#[0-9a-fA-F]{6}$/.test(valor);

  return (
    <div className="perso-field">
      <label className="lckp-label">{titulo}</label>
      <div className="perso-cor">
        <input
          type="color"
          className="perso-cor__amostra"
          value={valida ? valor : '#000000'}
          onChange={(e) => aoMudar(e.target.value.toUpperCase())}
          aria-label={titulo}
        />
        <input
          type="text"
          className="lckp-input perso-cor__hex"
          value={valor}
          onChange={(e) => {
            const bruto = e.target.value.trim();
            aoMudar(bruto.startsWith('#') ? bruto.toUpperCase() : ('#' + bruto).toUpperCase());
          }}
          spellCheck={false}
          maxLength={7}
          aria-label={`${titulo} em hexadecimal`}
        />
      </div>
      {!valida && <p className="perso-ajuda perso-ajuda--alerta">Use o formato #RRGGBB.</p>}
      {ajuda && <p className="perso-ajuda">{ajuda}</p>}
    </div>
  );
}
