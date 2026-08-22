<#
    Totem LCKP — desfazer o endurecimento
    =====================================

    Devolve o Windows ao estado normal: barra de tarefas, Gerenciador de
    Tarefas, tecla Windows, pendrive, navegador sem amarras.

    Existe por um motivo pratico: um totem endurecido e um computador que voce
    nao consegue mais usar. Sem este script, consertar a maquina significaria
    formatar.

    PRECISA DE ADMINISTRADOR. Reinicie o computador depois de rodar.

    Uso:
        powershell -ExecutionPolicy Bypass -File .\Remover-Totem.ps1
        powershell -ExecutionPolicy Bypass -File .\Remover-Totem.ps1 -UsuarioTotem totem

    Se o totem ja estiver travado e voce nao conseguir chegar ao PowerShell:
    ligue segurando Shift para entrar na Recuperacao, ou entre em MODO DE
    SEGURANCA (nele o shell substituido nao e usado) e rode este script.
#>

[CmdletBinding()]
param(
    [string]$UsuarioTotem = 'totem'
)

$ErrorActionPreference = 'Stop'

$identidade = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identidade)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host ''
    Write-Host 'Este script precisa ser executado como Administrador.' -ForegroundColor Red
    exit 1
}

$desfeito = New-Object System.Collections.Generic.List[string]

function Remover-Valor([string]$Caminho, [string]$Nome, [string]$Explicacao) {
    if (-not (Test-Path $Caminho)) { return }
    $existe = Get-ItemProperty -Path $Caminho -Name $Nome -ErrorAction SilentlyContinue
    if ($null -eq $existe) { return }
    Remove-ItemProperty -Path $Caminho -Name $Nome -Force -ErrorAction SilentlyContinue
    $desfeito.Add($Explicacao)
}

function Remover-Chave([string]$Caminho, [string]$Explicacao) {
    if (-not (Test-Path $Caminho)) { return }
    Remove-Item -Path $Caminho -Recurse -Force -ErrorAction SilentlyContinue
    $desfeito.Add($Explicacao)
}

Write-Host ''
Write-Host '=== Desfazendo o endurecimento do totem ===' -ForegroundColor Cyan
Write-Host ''

# 1. Politicas do navegador ------------------------------------------------
Remover-Chave 'HKLM:\SOFTWARE\Policies\Microsoft\Edge'  'Politicas do Edge removidas'
Remover-Chave 'HKLM:\SOFTWARE\Policies\Google\Chrome'   'Politicas do Chrome removidas'

# 2. Ctrl+Alt+Del, Gerenciador de Tarefas, menus ---------------------------
$sistema = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
Remover-Valor $sistema 'DisableTaskMgr'         'Gerenciador de Tarefas liberado'
Remover-Valor $sistema 'DisableLockWorkstation' 'Bloquear a estacao liberado'
Remover-Valor $sistema 'DisableChangePassword'  'Trocar senha liberado'
Remover-Valor $sistema 'HideFastUserSwitching'  'Trocar de usuario liberado'
Remover-Valor $sistema 'shutdownwithoutlogon'   'Desligar pela tela de login restaurado'

$explorer = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer'
Remover-Valor $explorer 'NoClose'            'Desligar/reiniciar de volta ao menu'
Remover-Valor $explorer 'NoLogoff'           'Sair da conta de volta'
Remover-Valor $explorer 'NoRun'              'Executar (Win+R) liberado'
Remover-Valor $explorer 'NoControlPanel'     'Painel de Controle liberado'
Remover-Valor $explorer 'NoDriveTypeAutoRun' 'Execucao automatica restaurada'

# 3. Tecla Windows ---------------------------------------------------------
Remover-Valor 'HKLM:\SYSTEM\CurrentControlSet\Control\Keyboard Layout' 'Scancode Map' `
    'Tecla Windows reativada (vale apos reiniciar)'

# 4. Teclas de acessibilidade ---------------------------------------------
# Valores de fabrica do Windows.
$padroesAcess = @{
    'HKCU:\Control Panel\Accessibility\StickyKeys'        = '510'
    'HKCU:\Control Panel\Accessibility\ToggleKeys'        = '62'
    'HKCU:\Control Panel\Accessibility\Keyboard Response' = '126'
}
foreach ($chave in $padroesAcess.Keys) {
    if (Test-Path $chave) {
        New-ItemProperty -Path $chave -Name 'Flags' -Value $padroesAcess[$chave] `
            -PropertyType String -Force | Out-Null
    }
}
$desfeito.Add('Teclas de acessibilidade com os atalhos de fabrica')

# 5. Pendrive --------------------------------------------------------------
$usbstor = 'HKLM:\SYSTEM\CurrentControlSet\Services\USBSTOR'
if (Test-Path $usbstor) {
    New-ItemProperty -Path $usbstor -Name 'Start' -Value 3 -PropertyType DWord -Force | Out-Null
    $desfeito.Add('Pendrive liberado')
}

# 6. Tarefa e shell --------------------------------------------------------
$tarefa = Get-ScheduledTask -TaskName 'LCKP-Totem' -ErrorAction SilentlyContinue
if ($tarefa) {
    Unregister-ScheduledTask -TaskName 'LCKP-Totem' -Confirm:$false
    $desfeito.Add("Tarefa 'LCKP-Totem' removida")
}

try {
    $sid = (Get-LocalUser -Name $UsuarioTotem -ErrorAction Stop).SID.Value
    $chaveLogon = "Registry::HKEY_USERS\$sid\Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
    if (Test-Path $chaveLogon) {
        $shell = Get-ItemProperty -Path $chaveLogon -Name 'Shell' -ErrorAction SilentlyContinue
        if ($null -ne $shell) {
            # Volta ao Explorer em vez de so apagar: apagar tambem funciona,
            # mas deixar explicito evita duvida se a conta abrir sem area de
            # trabalho por outro motivo.
            New-ItemProperty -Path $chaveLogon -Name 'Shell' -Value 'explorer.exe' `
                -PropertyType String -Force | Out-Null
            $desfeito.Add("Area de trabalho de $UsuarioTotem de volta ao Explorer")
        }
    }
} catch {
    Write-Host "Aviso: usuario '$UsuarioTotem' nao encontrado; pulei a restauracao do shell." -ForegroundColor Yellow
}

# 7. Perfis temporarios do quiosque ---------------------------------------
Get-ChildItem -Path $env:TEMP -Directory -Filter 'lckp-totem-*' -ErrorAction SilentlyContinue |
    ForEach-Object { Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue }

# -------------------------------------------------------------------------

Write-Host ''
if ($desfeito.Count -eq 0) {
    Write-Host 'Nada para desfazer — a maquina ja estava limpa.' -ForegroundColor Green
} else {
    Write-Host '=== Desfeito ===' -ForegroundColor Green
    $desfeito | ForEach-Object { Write-Host "  - $_" }
}

Write-Host ''
Write-Host 'REINICIE o computador para tudo voltar ao normal.' -ForegroundColor Cyan
