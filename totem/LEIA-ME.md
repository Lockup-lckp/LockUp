# Totem LCKP — modo quiosque

Trava o computador do totem no portal da escola. O aluno usa o sistema, mas não
consegue sair dele, mexer no computador nem desligá-lo.

**Nada nesta pasta altera o código do sistema LCKP.** É tudo configuração de
navegador e de sistema operacional.

| Você tem | Vá para |
|---|---|
| **Windows** (a maioria dos totens da escola) | [`windows/`](windows) — leia abaixo |
| Linux | [`linux/LEIA-ME.md`](linux/LEIA-ME.md) |

---

# Windows

## Antes de tudo: existe um caminho melhor se a máquina for Pro ou Enterprise

O Windows tem um modo quiosque de fábrica, o **Acesso Atribuído**. Ele é mais
difícil de furar do que qualquer script, porque é o próprio Windows segurando.

Confira a edição em **Configurações → Sistema → Sobre**:

- **Windows 11/10 Pro, Education ou Enterprise** → use o Acesso Atribuído em
  *Configurações → Contas → Outros usuários → Configurar um quiosque*. Depois
  volte aqui e aplique **só** o `politicas/lckp-kiosk.reg`, para prender a
  navegação ao domínio da escola.
- **Windows Home** → o Acesso Atribuído não existe. Use os scripts desta pasta.

Se as máquinas forem Home (o comum em compra de varejo), siga direto.

## As duas camadas

| Arquivo | Precisa de administrador? | O que trava |
|---|---|---|
| `windows/Totem-LCKP.ps1` | Não | Tela cheia sem abas nem menus; reabre sozinho; esquece o login; navegação presa ao site |
| `windows/Endurecer-Totem.ps1` | Sim | Gerenciador de Tarefas, tecla Windows, Win+R, pendrive, desligar, área de trabalho |
| `windows/Remover-Totem.ps1` | Sim | Desfaz tudo o que o Endurecer fez |

Use as duas camadas. A primeira sozinha não segura um aluno com teclado.

---

## Camada 1 — o quiosque

### O que faz

- Abre o portal **em tela cheia**, sem barra de endereço, abas ou menus.
- **Reabre sozinho** se o navegador fechar ou travar.
- **Não guarda login entre alunos:** cada abertura cria um perfil novo numa
  pasta temporária, apagada ao fim. Sem cookie, sem senha salva, sem histórico.
- **Esquece o login por inatividade:** parado por 2 minutos (ajustável), limpa a
  sessão e volta à tela inicial. É isto que impede a conta de um aluno de ficar
  aberta para o próximo.
- Usa o **Microsoft Edge**, que já vem no Windows. Se preferir o Chrome, ele
  também funciona — o script acha sozinho.

### Instalar

1. Crie a pasta `C:\LCKP` e copie o `Totem-LCKP.ps1` para lá.
2. Abra o arquivo no Bloco de Notas e ajuste a seção **CONFIG** no topo:
   - `$URL` — o endereço da sua escola;
   - `$MinutosInatividade` — quanto tempo parado até esquecer a sessão;
   - `$PinDoTecnico` — **troque o valor padrão**, é ele que abre o totem depois.
3. Teste antes de travar a máquina:

```powershell
powershell -ExecutionPolicy Bypass -File C:\LCKP\Totem-LCKP.ps1
```

### Sair do quiosque (técnico)

**Ctrl + Alt + Shift + F12**, depois digite o PIN.

Sem isso o quiosque reabre para sempre — inclusive para você.

---

## Camada 2 — endurecer o Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\Endurecer-Totem.ps1 -UsuarioTotem totem
```

Depois **reinicie**. Ela:

- bloqueia o **Gerenciador de Tarefas**, trocar de usuário, trocar senha e
  bloquear a tela — a tela do Ctrl+Alt+Del fica só com o "Cancelar";
- remove **desligar / reiniciar / suspender** dos menus;
- desativa a **tecla Windows** e o **Win+R**;
- bloqueia **Painel de Controle e Configurações**;
- desliga **pendrive** (mouse e teclado USB continuam funcionando);
- tira o atalho das **Teclas de Aderência** (os 5 toques no Shift, uma fuga
  clássica de totem);
- instala as políticas de navegador no **registro da máquina**, então elas valem
  mesmo se o aluno apagar o perfil;
- faz o quiosque abrir sozinho no logon e **substitui a área de trabalho** por
  ele: sem barra de tarefas, sem menu Iniciar.

A substituição da área de trabalho é **por usuário**. Um administrador que entre
na própria conta continua vendo o Windows normal.

### Antes de rodar, crie a conta do totem

Uma conta **sem privilégio de administrador**, só para o aluno:

```powershell
New-LocalUser -Name totem -NoPassword -AccountNeverExpires
```

Faça **um login** com ela antes de rodar o Endurecer — o Windows só cria o
perfil no disco no primeiro login, e o script precisa dele para substituir a
área de trabalho.

### Login automático ao ligar

Não faço isso por script de propósito: o jeito registrado guarda a senha em
**texto puro** no registro, e qualquer um que chegue ao disco a lê.

Faça pelo Windows: `Win+R` → `netplwiz` → desmarque *"Os usuários devem digitar
um nome e uma senha"* → escolha a conta `totem`. (Faça isso **antes** de rodar o
Endurecer, que desativa o Win+R.)

### Desfazer

```powershell
powershell -ExecutionPolicy Bypass -File .\Remover-Totem.ps1 -UsuarioTotem totem
```

Se o totem já estiver travado e você não conseguir chegar ao PowerShell: ligue
segurando **Shift** para entrar na Recuperação, ou entre em **Modo de
Segurança** — nele a área de trabalho substituída não é usada — e rode o script.

---

## O que NENHUM software impede (é físico)

Seja honesto no planejamento: estas três só o hardware e o local resolvem.

- **Segurar o botão de energia** por alguns segundos desliga pelo hardware,
  abaixo do sistema operacional. Solução: desabilitar no **BIOS/UEFI** ou
  proteger o botão no gabinete.
- **Tirar da tomada, abrir o gabinete, dar boot por pendrive.** Solução:
  gabinete trancado, **senha de BIOS** e boot por USB desabilitado.
- **Danificar tela ou teclado.** Solução: gabinete de totem. Se o totem for só
  toque, não deixe teclado plugado — sem teclado, metade das fugas desta lista
  deixa de existir.

---

## O que ainda não foi testado numa máquina real

Escrevi e revisei tudo isto, mas **não rodei em nenhum totem da escola** — não
tenho acesso a um. As partes que mais merecem um teste seu antes de valer:

1. A **substituição da área de trabalho** varia entre edições do Windows.
2. O `--kiosk-idle-timeout-minutes` do Edge depende da versão instalada; em Edge
   antigo ele é ignorado, e aí quem faz o trabalho é o relógio de inatividade do
   próprio script (que funciona nos dois navegadores).
3. O bloqueio de **pendrive** não afeta discos já conectados até reiniciar.

Rode isto no totem e me mande a saída que eu fecho o que sobrar:

```powershell
Get-ComputerInfo -Property WindowsProductName,WindowsVersion,OsArchitecture | Format-List; (Get-Item 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ErrorAction SilentlyContinue).VersionInfo.ProductVersion
```
