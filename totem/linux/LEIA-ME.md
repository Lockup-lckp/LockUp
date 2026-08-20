# Totem LCKP — modo quiosque (Linux)

Trava o computador do totem no portal da escola. O aluno usa o sistema, mas
não consegue sair dele, mexer no computador nem desligá-lo.

Não é um `.exe`: `.exe` é do Windows. Em Linux, "travar num programa só" é isto
— um navegador em modo quiosque, mais um endurecimento do sistema.

São **duas camadas**. Use as duas para a proteção completa.

| Arquivo | Precisa de sudo? | O que trava |
|---|---|---|
| `totem-lckp.sh` | Não | Tela cheia, sem abas/menus; reabre sozinho; esquece o login; navegação presa ao site da escola |
| `endurecer-totem.sh` | Sim | Terminal (Ctrl+Alt+F*), botão de desligar, matar a interface, desligar/reiniciar pelo aluno |

---

## Camada 1 — o quiosque (`totem-lckp.sh`)

### O que faz
- Abre o portal **em tela cheia**, sem barra de endereço, sem abas, sem menus.
- **Reabre sozinho** se o navegador fechar ou travar.
- **Não guarda login entre alunos:** cada abertura usa um perfil novo e
  temporário, apagado ao fim — sem cookies, sem senha salva, sem histórico.
- **Esquece o login por inatividade:** parado por um tempo (padrão 120 s), apaga
  a sessão e volta à tela inicial. É o que garante que a conta de um aluno não
  fique aberta para o próximo.
- **Prende a navegação ao site da escola:** mesmo se aparecer um endereço, o
  navegador recusa sair de `lckp.com.br`. Downloads, aba anônima, ferramentas de
  desenvolvedor e impressão ficam desligados.

### Instalar
1. Copie `totem-lckp.sh` para o totem (ex.: `/home/totem/`).
2. Abra o arquivo e ajuste a seção **CONFIG** no topo: a `URL` da sua escola
   (e, se quiser, o tempo de inatividade).
3. No terminal do totem:
   ```bash
   chmod +x totem-lckp.sh
   ./totem-lckp.sh
   ```
4. Para o "esquecer login por inatividade" funcionar, instale o xprintidle:
   ```bash
   sudo apt install xprintidle    # Debian/Ubuntu
   ```

### Iniciar sozinho quando o totem liga
```bash
mkdir -p ~/.config/autostart
cp lckp-totem.desktop ~/.config/autostart/
```
Ajuste o caminho do `Exec=` dentro do `.desktop` para onde está o script.
Funciona em GNOME, KDE, XFCE, LXDE e Cinnamon.

---

## Camada 2 — endurecer o sistema (`endurecer-totem.sh`)

O quiosque sozinho não segura tudo: com um teclado, o aluno ainda poderia trocar
para um terminal (`Ctrl+Alt+F2`) ou apertar o botão de desligar. Esta camada
fecha isso. É feita para o caso comum: **systemd + sessão X11**.

```bash
sudo ./endurecer-totem.sh
```
Depois **reinicie o totem**. Ela:
- desliga `Ctrl+Alt+F1..F7` (terminais de texto) e `Ctrl+Alt+Backspace`;
- faz o botão de energia **ignorar** um toque (desligar/suspender);
- impede o usuário do totem de desligar/reiniciar/suspender por menu ou comando;
- instala a trava de navegação também no nível do sistema (à prova de o aluno
  apagar o perfil do navegador).

O script é idempotente e mostra no fim **como desfazer** cada mudança.

> Ajuste o `KIOSK_USER` no topo do script para o nome do usuário que roda o
> totem (o padrão é `totem`).

---

## O que NENHUM software impede (é físico)

Seja honesto no planejamento: estas três só o hardware/local resolve.

- **Segurar o botão de energia** por vários segundos força o desligamento pelo
  hardware. Solução: desabilitar isso no **BIOS/UEFI**, ou proteger o botão no
  gabinete.
- **Tirar da tomada / abrir o gabinete / botar um pendrive de boot.** Solução:
  gabinete trancado + **senha de BIOS** + desabilitar boot por USB no BIOS.
- **Danificar a tela/teclado.** Solução: gabinete de totem.

---

## Me ajude a afinar: rode isto no totem e me mande a saída

```bash
cat /etc/os-release | grep -E '^(NAME|VERSION)='; \
echo "sessao: ${XDG_SESSION_TYPE:-desconhecida}"; \
echo "desktop: ${XDG_CURRENT_DESKTOP:-desconhecido}"; \
for b in chromium chromium-browser google-chrome brave-browser microsoft-edge-stable; do \
  command -v "$b" && echo "  ^ navegador encontrado"; done
```

Com a distro, se é X11 ou Wayland, o ambiente gráfico e o navegador, eu fecho os
últimos furos sob medida — principalmente se for Wayland, onde a trava de
teclado é diferente.
