#!/usr/bin/env bash
# =====================================================================
# Totem LCKP — modo quiosque para Linux (camada 1: sem root)
# =====================================================================
# Abre o portal da escola em tela cheia, travado, e reabre sozinho se
# fechar. Funciona em qualquer Linux com um navegador da família Chromium
# (Chromium, Chrome, Brave ou Edge) — não depende de distro específica.
#
# ESTA CAMADA cobre o que dá para travar SEM ser administrador:
#   - tela cheia sem barra de endereço, abas ou menus;
#   - reabre sozinho se o aluno fechar ou o navegador travar;
#   - NÃO guarda login entre alunos: cada abertura usa um perfil novo e
#     temporário, apagado ao fim (sem cookies, sem senha salva, sem histórico);
#   - reinício por inatividade: parado por um tempo, apaga a sessão e volta
#     à tela inicial — é o que faz o login "ser esquecido" quando ninguém usa;
#   - navegação presa ao domínio da escola (o navegador recusa sair dele).
#
# O que ESTA camada NÃO consegue (precisa do endurecer-totem.sh, com sudo):
#   trocar para o terminal (Ctrl+Alt+F2), o botão de desligar, e atalhos do
#   sistema como Alt+Tab. Rode o endurecer-totem.sh para fechar isso.
#
# COMO USAR
#   1) Edite a seção CONFIG abaixo (URL e, se quiser, o tempo de inatividade).
#   2) chmod +x totem-lckp.sh
#   3) ./totem-lckp.sh
#   4) Para iniciar no boot, veja o LEIA-ME.md.

set -u

# ============================ CONFIG =================================
# Endereço que o totem abre (a tela de entrada/login da escola):
URL="https://lckp.com.br/etec-043"

# Domínio a que a navegação fica presa. O aluno não consegue sair dele nem
# digitando outro endereço. Deixe só o domínio, sem https:// nem caminho.
DOMINIO="lckp.com.br"

# Segundos parado (sem teclado/mouse) até apagar a sessão e voltar ao início.
# Aumente se o aluno costuma ler bastante antes de agir; diminua para esquecer
# o login mais rápido. Precisa do 'xprintidle' instalado (veja o LEIA-ME).
INATIVIDADE_SEG=120
# ====================================================================

# ---------------------------------------------------------------------
# 1. Achar um navegador da família Chromium (o primeiro que existir)
# ---------------------------------------------------------------------
NAVEGADOR=""
for cand in chromium chromium-browser google-chrome google-chrome-stable \
            brave-browser microsoft-edge-stable; do
  if command -v "$cand" >/dev/null 2>&1; then
    NAVEGADOR="$cand"
    break
  fi
done

if [ -z "$NAVEGADOR" ]; then
  echo "[LCKP] Nenhum navegador Chromium encontrado. Instale um:"
  echo "   Debian/Ubuntu:  sudo apt install chromium   (ou: chromium-browser)"
  echo "   Fedora:         sudo dnf install chromium"
  echo "   Arch/Manjaro:   sudo pacman -S chromium"
  exit 1
fi
echo "[LCKP] Navegador: $NAVEGADOR"

# ---------------------------------------------------------------------
# 2. Evitar que a tela apague / o PC suspenda (só faz efeito no X11)
# ---------------------------------------------------------------------
if command -v xset >/dev/null 2>&1; then
  xset s off     2>/dev/null || true
  xset -dpms     2>/dev/null || true
  xset s noblank 2>/dev/null || true
fi
# Esconde o cursor quando parado, se o 'unclutter' existir (opcional).
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 3 >/dev/null 2>&1 &
fi

# Aviso útil, não fatal: sem xprintidle, o reinício por inatividade não roda.
if ! command -v xprintidle >/dev/null 2>&1; then
  echo "[LCKP] AVISO: 'xprintidle' não encontrado — o reinício por inatividade"
  echo "       fica DESLIGADO. Para ligá-lo:  sudo apt install xprintidle"
fi

# ---------------------------------------------------------------------
# 3. Flags de travamento do navegador
# ---------------------------------------------------------------------
# --user-data-dir aponta para um perfil temporário (definido por abertura).
# As demais tiram tudo que atrapalha um quiosque e desligam o "salvar senha".
flags_do_navegador() {
  local perfil="$1"
  printf '%s\n' \
    --kiosk "$URL" \
    --user-data-dir="$perfil" \
    --no-first-run \
    --no-default-browser-check \
    --disable-translate \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI,AutofillServerCommunication \
    --noerrdialogs \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --check-for-update-interval=31536000 \
    --password-store=basic \
    --disable-save-password-bubble \
    --disable-background-networking \
    --disable-component-update
}

# ---------------------------------------------------------------------
# 4. Laço principal: abre, vigia, e reabre limpo
# ---------------------------------------------------------------------
# Uma única volta cobre os três casos que fazem o navegador reabrir do zero:
#   (a) o aluno/uma falha fechou o navegador;
#   (b) ficou parado além de INATIVIDADE_SEG (apaga a sessão do aluno anterior);
#   (c) tentativa de sair travou o processo.
# Em todos, o perfil temporário é destruído e um novo, vazio, é criado.
echo "[LCKP] Abrindo o totem em ${URL} (preso a ${DOMINIO})"
echo "[LCKP] Reabre sozinho; esquece o login após ${INATIVIDADE_SEG}s parado."

encerrar_tudo() {
  [ -n "${NAV_PID:-}" ] && kill "$NAV_PID" 2>/dev/null
  [ -n "${PERFIL:-}" ] && pkill -f -- "$PERFIL" 2>/dev/null
  [ -n "${PERFIL:-}" ] && rm -rf "$PERFIL"
}
trap 'encerrar_tudo; exit 0' INT TERM

while true; do
  PERFIL="$(mktemp -d /tmp/lckp-kiosk.XXXXXX)"

  # A política gravada em <perfil>/Managed Policies age mesmo sem root: prende a
  # navegação ao domínio, bloqueia downloads, DevTools, aba anônima e impressão.
  mkdir -p "$PERFIL/policies/managed"
  cat > "$PERFIL/policies/managed/lckp.json" <<JSON
{
  "URLBlocklist": ["*"],
  "URLAllowlist": ["${DOMINIO}", "https://${DOMINIO}"],
  "PasswordManagerEnabled": false,
  "AutofillAddressEnabled": false,
  "AutofillCreditCardEnabled": false,
  "DeveloperToolsAvailability": 2,
  "IncognitoModeAvailability": 1,
  "BrowserGuestModeEnabled": false,
  "DownloadRestrictions": 3,
  "PrintingEnabled": false,
  "TranslateEnabled": false,
  "BookmarkBarEnabled": false,
  "DefaultPopupsSetting": 2,
  "DefaultNotificationsSetting": 2
}
JSON

  # shellcheck disable=SC2046
  "$NAVEGADOR" $(flags_do_navegador "$PERFIL") >/dev/null 2>&1 &
  NAV_PID=$!
  INICIO=$(date +%s)

  # Vigia enquanto o navegador estiver vivo.
  while kill -0 "$NAV_PID" 2>/dev/null; do
    sleep 2
    # Reinício por inatividade (só se o xprintidle existir e já rodou um tempo).
    if command -v xprintidle >/dev/null 2>&1; then
      parado_ms=$(xprintidle 2>/dev/null || echo 0)
      subiu=$(( $(date +%s) - INICIO ))
      if [ "$parado_ms" -ge $(( INATIVIDADE_SEG * 1000 )) ] && [ "$subiu" -ge 20 ]; then
        break
      fi
    fi
  done

  encerrar_tudo
  sleep 1
done
