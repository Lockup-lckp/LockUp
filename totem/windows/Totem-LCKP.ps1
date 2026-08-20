<#
    Totem LCKP — quiosque (Windows)
    ===============================

    Prende o computador do totem no portal da escola. O aluno usa o sistema,
    mas nao consegue sair dele.

    Esta e a CAMADA 1: nao precisa de administrador e nao altera o Windows.
    Sozinha ela ja resolve tela cheia, reabrir sozinho e nao guardar login.
    O que ela NAO segura (Alt+Tab, Gerenciador de Tarefas, desligar) e trabalho
    do Endurecer-Totem.ps1, que precisa de administrador.

    Nada aqui toca no codigo do sistema LCKP — e so navegador e Windows.

    Uso:
        powershell -ExecutionPolicy Bypass -File .\Totem-LCKP.ps1

    Para sair (tecnico): Ctrl + Alt + Shift + F12, e informe o PIN.
#>

# ---------------------------------------------------------------------------
# CONFIG — ajuste esta secao e mais nada
# ---------------------------------------------------------------------------

# Endereco do portal da escola.
$URL = 'https://lckp.com.br'

# Minutos parado ate esquecer a sessao e voltar para a tela inicial.
# E isto que impede a conta de um aluno de ficar aberta para o proximo.
$MinutosInatividade = 2

# PIN que o tecnico digita para sair do quiosque.
# TROQUE ESTE VALOR antes de instalar. Nao use o padrao.
$PinDoTecnico = '246810'

# Navegador. 'auto' procura o Edge e depois o Chrome.
# O Edge vem com o Windows, entao 'auto' quase sempre acha o Edge.
$Navegador = 'auto'

# ---------------------------------------------------------------------------
# Daqui para baixo nao precisa mexer
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'

# Win32: ler ha quanto tempo o teclado/mouse estao parados, e ler o estado de
# uma tecla. GetLastInputInfo e a unica forma confiavel de medir ociosidade no
# Windows — contar tempo no PowerShell nao enxerga o aluno mexendo no mouse.
$assinaturas = @'
using System;
using System.Runtime.InteropServices;

public class TotemWin32 {
    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    [DllImport("kernel32.dll")]
    public static extern uint GetTickCount();

    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);

    public static uint SegundosParado() {
        LASTINPUTINFO info = new LASTINPUTINFO();
        info.cbSize = (uint)Marshal.SizeOf(info);
        if (!GetLastInputInfo(ref info)) return 0;
        return (GetTickCount() - info.dwTime) / 1000;
    }

    public static bool TeclaPressionada(int vKey) {
        return (GetAsyncKeyState(vKey) & 0x8000) != 0;
    }
}
'@

if (-not ('TotemWin32' -as [type])) {
    Add-Type -TypeDefinition $assinaturas -Language CSharp
}

# Codigos de tecla virtuais do Windows.
$VK_CONTROL = 0x11
$VK_MENU    = 0x12   # Alt
$VK_SHIFT   = 0x10
$VK_F12     = 0x7B

function Escrever([string]$texto) {
    Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $texto)
}

function Achar-Navegador {
    $edge = @(
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )
    $chrome = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )

    $procurar = @()
    if ($Navegador -eq 'edge')   { $procurar = $edge }
    elseif ($Navegador -eq 'chrome') { $procurar = $chrome }
    else { $procurar = $edge + $chrome }

    foreach ($caminho in $procurar) {
        if (Test-Path $caminho) { return $caminho }
    }
    return $null
}

# O perfil vive numa pasta temporaria NOVA a cada abertura e e apagado depois.
# E isto que garante "nao guarda login": sem perfil, nao ha cookie, senha
# salva nem historico para o proximo aluno encontrar.
function Novo-PerfilLimpo {
    $pasta = Join-Path $env:TEMP ("lckp-totem-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $pasta -Force | Out-Null
    return $pasta
}

function Apagar-Perfil([string]$pasta) {
    if (-not $pasta) { return }
    if (-not (Test-Path $pasta)) { return }
    try {
        Remove-Item -Recurse -Force -Path $pasta -ErrorAction Stop
    } catch {
        # O navegador pode ainda estar soltando arquivo. Tenta de novo uma vez.
        Start-Sleep -Milliseconds 700
        try { Remove-Item -Recurse -Force -Path $pasta -ErrorAction Stop } catch {
            Escrever "Aviso: nao consegui apagar $pasta agora (o Windows limpa o TEMP depois)."
        }
    }
}

# Restos de perfis de sessoes anteriores (queda de energia, por exemplo).
function Limpar-PerfisAntigos {
    Get-ChildItem -Path $env:TEMP -Directory -Filter 'lckp-totem-*' -ErrorAction SilentlyContinue |
        ForEach-Object { Apagar-Perfil $_.FullName }
}

function Montar-Argumentos([string]$exe, [string]$perfil) {
    $ehEdge = $exe -match 'msedge\.exe$'

    $parametros = @(
        "--kiosk", $URL,
        "--user-data-dir=$perfil",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-features=Translate,EdgeCollections",
        "--disable-pinch",
        "--overscroll-history-navigation=0",
        "--disable-session-crashed-bubble",
        "--noerrdialogs",
        "--disable-infobars",
        "--fast",
        "--fast-start"
    )

    if ($ehEdge) {
        # O Edge tem quiosque proprio e um timeout de ociosidade EMBUTIDO, que
        # limpa os dados de navegacao e volta para a URL inicial sozinho.
        $parametros += "--edge-kiosk-type=fullscreen"
        $parametros += "--kiosk-idle-timeout-minutes=$MinutosInatividade"
    }

    return $parametros
}

function Tecnico-PediuSaida {
    if (-not [TotemWin32]::TeclaPressionada($VK_CONTROL)) { return $false }
    if (-not [TotemWin32]::TeclaPressionada($VK_MENU))    { return $false }
    if (-not [TotemWin32]::TeclaPressionada($VK_SHIFT))   { return $false }
    if (-not [TotemWin32]::TeclaPressionada($VK_F12))     { return $false }
    return $true
}

function Pin-Confere {
    Add-Type -AssemblyName Microsoft.VisualBasic
    $digitado = [Microsoft.VisualBasic.Interaction]::InputBox(
        'PIN do tecnico para sair do modo totem:', 'Totem LCKP', '')
    return ($digitado -eq $PinDoTecnico)
}

# ---------------------------------------------------------------------------
# Laco principal
# ---------------------------------------------------------------------------

$exe = Achar-Navegador
if (-not $exe) {
    Write-Host ''
    Write-Host 'Nao encontrei o Microsoft Edge nem o Google Chrome neste computador.' -ForegroundColor Red
    Write-Host 'O Edge vem com o Windows 10/11 — se ele nao esta ai, instale um dos dois'
    Write-Host 'e rode este script de novo.'
    exit 1
}

Escrever "Navegador: $exe"
Escrever "Portal: $URL"
Escrever "Esquece a sessao apos $MinutosInatividade min parado."
Escrever "Saida do tecnico: Ctrl+Alt+Shift+F12"

if ($PinDoTecnico -eq '246810') {
    Write-Host ''
    Write-Host 'ATENCAO: o PIN do tecnico ainda e o padrao de fabrica.' -ForegroundColor Yellow
    Write-Host 'Abra este arquivo e troque $PinDoTecnico antes de por o totem em uso.' -ForegroundColor Yellow
    Write-Host ''
}

Limpar-PerfisAntigos

$sair = $false

while (-not $sair) {
    $perfil = Novo-PerfilLimpo
    $argumentos = Montar-Argumentos -exe $exe -perfil $perfil

    Escrever "Abrindo o portal..."
    $processo = Start-Process -FilePath $exe -ArgumentList $argumentos -PassThru

    # Vigia enquanto o navegador estiver de pe.
    while (-not $processo.HasExited) {

        if (Tecnico-PediuSaida) {
            if (Pin-Confere) {
                Escrever "PIN correto. Encerrando o modo totem."
                $sair = $true
                break
            } else {
                Escrever "PIN incorreto. Continuando."
                # Espera soltar as teclas para nao pedir o PIN em rajada.
                while (Tecnico-PediuSaida) { Start-Sleep -Milliseconds 200 }
            }
        }

        # No Chrome o timeout de ociosidade e por nossa conta: ele nao tem o
        # --kiosk-idle-timeout-minutes do Edge.
        if ($exe -notmatch 'msedge\.exe$') {
            if ([TotemWin32]::SegundosParado() -ge ($MinutosInatividade * 60)) {
                Escrever "Parado ha $MinutosInatividade min — esquecendo a sessao."
                break
            }
        }

        Start-Sleep -Milliseconds 400
    }

    if (-not $processo.HasExited) {
        try { $processo.CloseMainWindow() | Out-Null } catch { }
        Start-Sleep -Milliseconds 800
        if (-not $processo.HasExited) {
            try { Stop-Process -Id $processo.Id -Force -ErrorAction Stop } catch { }
        }
    }

    # Filhos do navegador (abas, GPU) as vezes sobrevivem ao pai e seguram o
    # perfil aberto — sem matar, a pasta nao apaga e o login sobreviveria.
    $nomeProc = [System.IO.Path]::GetFileNameWithoutExtension($exe)
    Get-Process -Name $nomeProc -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -eq $exe } |
        ForEach-Object {
            try { Stop-Process -Id $_.Id -Force -ErrorAction Stop } catch { }
        }

    Start-Sleep -Milliseconds 500
    Apagar-Perfil $perfil

    if (-not $sair) {
        Escrever "Reabrindo em 1 segundo..."
        Start-Sleep -Seconds 1
    }
}

Limpar-PerfisAntigos
Escrever "Modo totem encerrado."
