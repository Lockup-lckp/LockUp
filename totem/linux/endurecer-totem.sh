#!/usr/bin/env bash
# =====================================================================
# Totem LCKP — endurecimento do sistema (camada 2: com sudo)
# =====================================================================
# Fecha o que o modo quiosque do navegador NÃO consegue sozinho: troca para
# o terminal de texto, o botão de desligar, o "matar o X" e o encerramento
# pelo aluno. Feito para o caso comum: Linux com systemd e sessão gráfica X11.
#
# RODE COM:  sudo ./endurecer-totem.sh
#
# É idempotente (pode rodar de novo sem problema) e cada mudança é um arquivo
# separado, fácil de remover. A seção final mostra como DESFAZER tudo.
#
# ATENÇÃO: se a sua sessão for Wayland (e não X11), a parte de teclado/terminal
# não se aplica do mesmo jeito — rode o diagnóstico do LEIA-ME e me mande a
# saída para eu adaptar.

set -eu

# ============================ CONFIG =================================
# Usuário sob o qual o totem roda (o dono da sessão gráfica do quiosque).
KIOSK_USER="totem"
# ====================================================================

if [ "$(id -u)" -ne 0 ]; then
  echo "[LCKP] Rode com sudo:  sudo ./endurecer-totem.sh"
  exit 1
fi

echo "[LCKP] Endurecendo o sistema para o usuário do totem: ${KIOSK_USER}"

# Aviso se a sessão parece ser Wayland (a parte de X11 não terá efeito).
if [ "${XDG_SESSION_TYPE:-}" = "wayland" ]; then
  echo "[LCKP] AVISO: sessão Wayland detectada. A trava de terminal/teclado"
  echo "       abaixo é para X11 e pode não valer aqui. Continuo o resto."
fi

# ---------------------------------------------------------------------
# 1. X11: bloquear troca para terminal e o "matar o X"
# ---------------------------------------------------------------------
# DontVTSwitch = desliga Ctrl+Alt+F1..F7 (as telas pretas de terminal).
# DontZap      = desliga Ctrl+Alt+Backspace (que derruba a interface).
mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/10-lckp-kiosk.conf <<'CONF'
Section "ServerFlags"
    Option "DontVTSwitch" "true"
    Option "DontZap"      "true"
EndSection
CONF
echo "  [ok] Ctrl+Alt+F* e Ctrl+Alt+Backspace bloqueados (efeito após reiniciar a sessão)."

# ---------------------------------------------------------------------
# 2. Botões de energia: ignorar desligar/suspender/tampa
# ---------------------------------------------------------------------
# Um toque no botão de energia deixa de desligar. (Segurar o botão por vários
# segundos ainda força desligamento pelo HARDWARE — isso só o BIOS/gabinete
# resolve; veja o LEIA-ME.)
mkdir -p /etc/systemd/logind.conf.d
cat > /etc/systemd/logind.conf.d/10-lckp-kiosk.conf <<'CONF'
[Login]
HandlePowerKey=ignore
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
CONF
echo "  [ok] Botão de energia/suspender ignorado."

# ---------------------------------------------------------------------
# 3. Impedir que o usuário do totem desligue/reinicie/suspenda
# ---------------------------------------------------------------------
# Mesmo por menu ou comando, o usuário do quiosque não consegue mais
# desligar/reiniciar/suspender. O administrador (por sudo) continua podendo.
mkdir -p /etc/polkit-1/rules.d
cat > /etc/polkit-1/rules.d/50-lckp-kiosk.rules <<RULES
// Bloqueia desligar/reiniciar/suspender para o usuário do totem.
polkit.addRule(function(action, subject) {
    if (subject.user == "${KIOSK_USER}" &&
        /^org\.freedesktop\.(login1|systemd1)\.(power-off|reboot|suspend|hibernate)/.test(action.id)) {
        return polkit.Result.NO;
    }
});
RULES
echo "  [ok] Desligar/reiniciar/suspender bloqueado para ${KIOSK_USER}."

# ---------------------------------------------------------------------
# 4. Política do navegador no nível do sistema
# ---------------------------------------------------------------------
# Prende a navegação ao domínio da escola e desliga senha salva, downloads,
# DevTools, aba anônima e impressão — valendo para QUALQUER perfil, à prova
# do aluno apagar o perfil temporário.
POLITICA='{
  "URLBlocklist": ["*"],
  "URLAllowlist": ["lckp.com.br", "https://lckp.com.br"],
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
  "DefaultNotificationsSetting": 2,
  "FullscreenAllowed": true
}'
# Cada navegador lê a política de um caminho próprio; grava em todos que couberem.
for destino in \
  /etc/chromium/policies/managed \
  /etc/chromium-browser/policies/managed \
  /etc/opt/chrome/policies/managed \
  /etc/opt/edge/policies/managed \
  /etc/brave/policies/managed; do
  mkdir -p "$destino"
  printf '%s\n' "$POLITICA" > "$destino/lckp-kiosk.json"
done
echo "  [ok] Política do navegador instalada (navegação presa a lckp.com.br)."

# ---------------------------------------------------------------------
# 5. Aplicar o que dá sem reiniciar
# ---------------------------------------------------------------------
systemctl restart systemd-logind 2>/dev/null || true

echo ""
echo "[LCKP] Pronto. REINICIE o totem para tudo entrar em vigor (a parte de"
echo "       teclado/terminal só vale numa sessão gráfica nova)."
echo ""
echo "PARA DESFAZER (se precisar), rode como root:"
echo "  rm -f /etc/X11/xorg.conf.d/10-lckp-kiosk.conf"
echo "  rm -f /etc/systemd/logind.conf.d/10-lckp-kiosk.conf"
echo "  rm -f /etc/polkit-1/rules.d/50-lckp-kiosk.rules"
echo "  rm -f /etc/chromium*/policies/managed/lckp-kiosk.json \\"
echo "        /etc/opt/chrome/policies/managed/lckp-kiosk.json \\"
echo "        /etc/opt/edge/policies/managed/lckp-kiosk.json \\"
echo "        /etc/brave/policies/managed/lckp-kiosk.json"
echo "  systemctl restart systemd-logind   # e reinicie o totem"
