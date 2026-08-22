<#
    Totem LCKP — endurecer o Windows (CAMADA 2)
    ===========================================

    O quiosque sozinho nao segura tudo: com um teclado o aluno ainda abriria o
    Gerenciador de Tarefas, daria Alt+Tab, plugaria um pendrive ou desligaria a
    maquina pelo menu. Este script fecha isso.

    PRECISA DE ADMINISTRADOR. Reinicie o totem depois de rodar.

    E idempotente: rodar duas vezes nao quebra nada.
    Para desfazer TUDO, rode o Remover-Totem.ps1 que esta nesta mesma pasta.

    Nada aqui toca no codigo do sistema LCKP.

    Uso:
        powershell -ExecutionPolicy Bypass -File .\Endurecer-Totem.ps1
        powershell -ExecutionPolicy Bypass -File .\Endurecer-Totem.ps1 -UsuarioTotem totem
#>

[CmdletBinding()]
param(
    # Conta que roda o totem. Usada para criar a tarefa que abre o quiosque no
    # logon. Se nao existir, o script avisa e pula so essa parte.
    [string]$UsuarioTotem = 'totem',

    # Onde o Totem-LCKP.ps1 vai ficar no totem.
    [string]$CaminhoDoQuiosque = 'C:\LCKP\Totem-LCKP.ps1',

    # Dominio ao qual a navegacao fica presa.
    [string]$Dominio = 'lckp.com.br'
)

$ErrorActionPreference = 'Stop'

# --- precisa ser administrador -------------------------------------------
$identidade = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identidade)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host ''
    Write-Host 'Este script precisa ser executado como Administrador.' -ForegroundColor Red
    Write-Host 'Clique com o botao direito no PowerShell e escolha'
    Write-Host '"Executar como administrador", depois rode de novo.'
    exit 1
}

$feito = New-Object System.Collections.Generic.List[string]

function Definir-Valor {
    param(
        [string]$Caminho,
        [string]$Nome,
        $Valor,
        [string]$Tipo = 'DWord',
        [string]$Explicacao
    )
    if (-not (Test-Path $Caminho)) { New-Item -Path $Caminho -Force | Out-Null }
    New-ItemProperty -Path $Caminho -Name $Nome -Value $Valor -PropertyType $Tipo -Force | Out-Null
    $feito.Add("$Explicacao")
}

Write-Host ''
Write-Host '=== Endurecendo o totem ===' -ForegroundColor Cyan
Write-Host ''

# -------------------------------------------------------------------------
# 1. Politicas do navegador
# -------------------------------------------------------------------------
# Esta e a trava mais importante e a mais dificil de furar: ela vive no
# registro da MAQUINA, entao continua valendo mesmo se o aluno apagar o perfil
# do navegador. E o equivalente ao /etc/chromium/policies/managed/ do Linux.

$navegadores = @{
    'Edge'   = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge'
    'Chrome' = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
}

foreach ($nome in $navegadores.Keys) {
    $base = $navegadores[$nome]

    # 1 = bloquear tudo, e so o dominio da escola entra pela lista de permissao.
    Definir-Valor -Caminho "$base" -Nome 'PasswordManagerEnabled'      -Valor 0 -Explicacao "$nome : gerenciador de senhas desligado"
    Definir-Valor -Caminho "$base" -Nome 'AutofillAddressEnabled'      -Valor 0 -Explicacao "$nome : preenchimento de endereco desligado"
    Definir-Valor -Caminho "$base" -Nome 'AutofillCreditCardEnabled'   -Valor 0 -Explicacao "$nome : preenchimento de cartao desligado"
    Definir-Valor -Caminho "$base" -Nome 'DeveloperToolsAvailability'  -Valor 2 -Explicacao "$nome : ferramentas de desenvolvedor bloqueadas"
    Definir-Valor -Caminho "$base" -Nome 'IncognitoModeAvailability'   -Valor 1 -Explicacao "$nome : aba anonima desligada"
    Definir-Valor -Caminho "$base" -Nome 'BrowserGuestModeEnabled'     -Valor 0 -Explicacao "$nome : modo convidado desligado"
    Definir-Valor -Caminho "$base" -Nome 'DownloadRestrictions'        -Valor 3 -Explicacao "$nome : downloads bloqueados"
    Definir-Valor -Caminho "$base" -Nome 'PrintingEnabled'             -Valor 0 -Explicacao "$nome : impressao desligada"
    Definir-Valor -Caminho "$base" -Nome 'TranslateEnabled'            -Valor 0 -Explicacao "$nome : tradutor desligado"
    Definir-Valor -Caminho "$base" -Nome 'BookmarkBarEnabled'          -Valor 0 -Explicacao "$nome : barra de favoritos escondida"
    Definir-Valor -Caminho "$base" -Nome 'DefaultPopupsSetting'        -Valor 2 -Explicacao "$nome : pop-ups bloqueados"
    Definir-Valor -Caminho "$base" -Nome 'DefaultNotificationsSetting' -Valor 2 -Explicacao "$nome : notificacoes bloqueadas"

    # Limpar ao fechar e o cinto de seguranca do "nao guardar login": mesmo que
    # o perfil temporario sobreviva a uma queda de energia, os dados somem.
    Definir-Valor -Caminho "$base" -Nome 'ClearBrowsingDataOnExit'     -Valor 1 -Explicacao "$nome : limpa os dados ao fechar"

    # As listas de bloqueio/permissao sao chaves com valores numerados.
    $bloqueio = "$base\URLBlocklist"
    $permissao = "$base\URLAllowlist"
    if (-not (Test-Path $bloqueio))  { New-Item -Path $bloqueio -Force | Out-Null }
    if (-not (Test-Path $permissao)) { New-Item -Path $permissao -Force | Out-Null }

    New-ItemProperty -Path $bloqueio -Name '1' -Value '*' -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $permissao -Name '1' -Value $Dominio -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $permissao -Name '2' -Value "https://$Dominio" -PropertyType String -Force | Out-Null
    $feito.Add("$nome : navegacao presa a $Dominio")
}

# -------------------------------------------------------------------------
# 2. Ctrl+Alt+Del, Gerenciador de Tarefas, trocar de usuario
# -------------------------------------------------------------------------
# O Ctrl+Alt+Del em si NAO pode ser bloqueado — e uma garantia do Windows, de
# proposito. O que da para fazer e esvaziar aquela tela: sem Gerenciador de
# Tarefas, sem bloquear, sem trocar usuario, sem sair. Sobra o "Cancelar".

$sistema = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
Definir-Valor -Caminho $sistema -Nome 'DisableTaskMgr'          -Valor 1 -Explicacao 'Gerenciador de Tarefas bloqueado'
Definir-Valor -Caminho $sistema -Nome 'DisableLockWorkstation'  -Valor 1 -Explicacao 'Bloquear a estacao (Win+L) desligado'
Definir-Valor -Caminho $sistema -Nome 'DisableChangePassword'   -Valor 1 -Explicacao 'Trocar senha bloqueado'
Definir-Valor -Caminho $sistema -Nome 'HideFastUserSwitching'   -Valor 1 -Explicacao 'Trocar de usuario escondido'
Definir-Valor -Caminho $sistema -Nome 'shutdownwithoutlogon'    -Valor 0 -Explicacao 'Desligar pela tela de login bloqueado'

$explorer = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer'
Definir-Valor -Caminho $explorer -Nome 'NoClose'         -Valor 1 -Explicacao 'Desligar/reiniciar/suspender removidos do menu'
Definir-Valor -Caminho $explorer -Nome 'NoLogoff'        -Valor 1 -Explicacao 'Sair da conta removido'
Definir-Valor -Caminho $explorer -Nome 'NoRun'           -Valor 1 -Explicacao 'Executar (Win+R) bloqueado'
Definir-Valor -Caminho $explorer -Nome 'NoControlPanel'  -Valor 1 -Explicacao 'Painel de Controle e Configuracoes bloqueados'
Definir-Valor -Caminho $explorer -Nome 'NoDriveTypeAutoRun' -Valor 255 -Explicacao 'Execucao automatica de pendrive/CD desligada'

# -------------------------------------------------------------------------
# 3. Tecla Windows
# -------------------------------------------------------------------------
# Nao existe politica para "desligar a tecla Windows". O jeito que funciona e
# remapear a tecla no driver de teclado, via Scancode Map. Vale para a maquina
# inteira e so entra em vigor depois de REINICIAR.
#
# O mapa abaixo diz: 3 entradas (a ultima e o terminador), a tecla E0 5B
# (Win esquerda) vira nada, a tecla E0 5C (Win direita) vira nada.

$teclado = 'HKLM:\SYSTEM\CurrentControlSet\Control\Keyboard Layout'
$mapa = [byte[]](
    0,0,0,0,
    0,0,0,0,
    3,0,0,0,
    0,0,0x5B,0xE0,
    0,0,0x5C,0xE0,
    0,0,0,0
)
if (-not (Test-Path $teclado)) { New-Item -Path $teclado -Force | Out-Null }
New-ItemProperty -Path $teclado -Name 'Scancode Map' -Value $mapa -PropertyType Binary -Force | Out-Null
$feito.Add('Tecla Windows desativada (vale apos reiniciar)')

# -------------------------------------------------------------------------
# 4. Teclas de acessibilidade
# -------------------------------------------------------------------------
# Cinco toques no Shift abrem a janela das Teclas de Aderencia, e daquela janela
# se chega as Configuracoes — e uma porta de fuga classica de totem.
# 506 = recurso disponivel, mas sem atalho de teclado e sem aviso.

$chavesAcess = @{
    'HKCU:\Control Panel\Accessibility\StickyKeys'  = '506'
    'HKCU:\Control Panel\Accessibility\ToggleKeys'  = '58'
    'HKCU:\Control Panel\Accessibility\Keyboard Response' = '122'
}
foreach ($chave in $chavesAcess.Keys) {
    if (-not (Test-Path $chave)) { New-Item -Path $chave -Force | Out-Null }
    New-ItemProperty -Path $chave -Name 'Flags' -Value $chavesAcess[$chave] -PropertyType String -Force | Out-Null
}
$feito.Add('Teclas de aderencia/alternancia/filtro sem atalho (usuario atual)')

# -------------------------------------------------------------------------
# 5. Pendrive
# -------------------------------------------------------------------------
# Start = 4 desliga o servico de armazenamento USB. Mouse e teclado USB
# continuam funcionando — isto e so armazenamento.

$usbstor = 'HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR'
if (Test-Path $usbstor) {
    Definir-Valor -Caminho $usbstor -Nome 'Start' -Valor 4 -Explicacao 'Pendrive (armazenamento USB) desligado'
} else {
    Write-Host 'Aviso: servico USBSTOR nao encontrado; pulei o bloqueio de pendrive.' -ForegroundColor Yellow
}

# -------------------------------------------------------------------------
# 6. Abrir o quiosque sozinho no logon
# -------------------------------------------------------------------------

$existeUsuario = $false
try {
    Get-LocalUser -Name $UsuarioTotem -ErrorAction Stop | Out-Null
    $existeUsuario = $true
} catch {
    $existeUsuario = $false
}

if (-not $existeUsuario) {
    Write-Host ''
    Write-Host "Aviso: o usuario '$UsuarioTotem' nao existe nesta maquina." -ForegroundColor Yellow
    Write-Host 'Pulei a tarefa de abrir o quiosque no logon. Crie a conta (sem'
    Write-Host 'privilegio de administrador) e rode este script de novo com'
    Write-Host "  -UsuarioTotem <nome>"
} elseif (-not (Test-Path $CaminhoDoQuiosque)) {
    Write-Host ''
    Write-Host "Aviso: nao achei o quiosque em $CaminhoDoQuiosque." -ForegroundColor Yellow
    Write-Host 'Copie o Totem-LCKP.ps1 para la e rode este script de novo, ou'
    Write-Host 'passe -CaminhoDoQuiosque com o caminho certo.'
} else {
    $acao = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$CaminhoDoQuiosque`""
    $gatilho = New-ScheduledTaskTrigger -AtLogOn -User $UsuarioTotem
    $config = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
    $principalTarefa = New-ScheduledTaskPrincipal -UserId $UsuarioTotem -LogonType Interactive

    Register-ScheduledTask -TaskName 'LCKP-Totem' -Action $acao -Trigger $gatilho `
        -Settings $config -Principal $principalTarefa -Force | Out-Null
    $feito.Add("Tarefa 'LCKP-Totem' abre o quiosque no logon de $UsuarioTotem")

    # Substituir o shell troca o Explorer pelo quiosque: sem barra de tarefas,
    # sem menu Iniciar, sem area de trabalho. E POR USUARIO — um administrador
    # que entrar na propria conta continua vendo o Windows normal.
    $sid = (Get-LocalUser -Name $UsuarioTotem).SID.Value
    $hiveCarregado = $false
    $chaveLogon = "Registry::HKEY_USERS\$sid\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"

    if (-not (Test-Path "Registry::HKEY_USERS\$sid")) {
        Write-Host ''
        Write-Host "Aviso: o perfil de '$UsuarioTotem' ainda nao foi criado no disco." -ForegroundColor Yellow
        Write-Host 'Faca UM login com essa conta e rode este script de novo para'
        Write-Host 'substituir a area de trabalho pelo quiosque.'
    } else {
        if (-not (Test-Path $chaveLogon)) { New-Item -Path $chaveLogon -Force | Out-Null }
        New-ItemProperty -Path $chaveLogon -Name 'Shell' `
            -Value "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$CaminhoDoQuiosque`"" `
            -PropertyType String -Force | Out-Null
        $feito.Add("Area de trabalho de $UsuarioTotem substituida pelo quiosque")
    }
}

# -------------------------------------------------------------------------

Write-Host ''
Write-Host '=== Aplicado ===' -ForegroundColor Green
$feito | ForEach-Object { Write-Host "  - $_" }

Write-Host ''
Write-Host 'REINICIE O TOTEM para a tecla Windows e o shell entrarem em vigor.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Para desfazer tudo:' -ForegroundColor Cyan
Write-Host '  powershell -ExecutionPolicy Bypass -File .\Remover-Totem.ps1'
Write-Host ''
Write-Host 'Leia a secao "O que NENHUM software impede" no LEIA-ME.md:' -ForegroundColor Yellow
Write-Host 'botao de energia, tomada e boot por pendrive so o BIOS e o gabinete resolvem.'
