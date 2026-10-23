param([switch]$Stop)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$tunnelLog = Join-Path $env:TEMP 'adb-tunnel.log'
$serveLog = Join-Path $env:TEMP 'adb-ngserve.log'
$urlPattern = 'https://[a-z0-9-]+\.trycloudflare\.com'

function Get-Tunnel {
  Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" |
    Where-Object { $_.CommandLine -like '*--url http://localhost:4200*' }
}

function Test-Port([int]$port) {
  [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

function Start-Detached([string]$commandLine) {
  $result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine      = $commandLine
    CurrentDirectory = $root
  }
  if ($result.ReturnValue -ne 0) { throw "Could not start: $commandLine" }
  $result.ProcessId
}

if ($Stop) {
  Get-Tunnel | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Write-Output 'Tunnel stopped.'
  return
}

if (-not (Test-Port 5190)) {
  Write-Warning 'The API is not listening on port 5190. Start it first, or the site will load without data.'
}

if (-not (Test-Port 4200)) {
  Start-Detached "cmd.exe /d /c npx ng serve > `"$serveLog`" 2>&1" | Out-Null
  $deadline = (Get-Date).AddMinutes(2)
  while (-not (Test-Port 4200)) {
    if ((Get-Date) -gt $deadline) { throw "ng serve did not start. See $serveLog" }
    Start-Sleep -Seconds 2
  }
}

$existing = Get-Tunnel | Select-Object -First 1
if ($existing) {
  $url = Select-String -Path $tunnelLog -Pattern $urlPattern -ErrorAction SilentlyContinue |
    Select-Object -Last 1 | ForEach-Object { $_.Matches[0].Value }
  Write-Output "Tunnel already running (process $($existing.ProcessId)): $url"
  return
}

$exe = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $exe) { $exe = Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe' }
if (-not (Test-Path $exe)) { throw 'cloudflared is not installed. Run: winget install --id Cloudflare.cloudflared' }

Remove-Item $tunnelLog -ErrorAction SilentlyContinue
$tunnelId = Start-Detached "`"$exe`" tunnel --no-autoupdate --url http://localhost:4200 --logfile `"$tunnelLog`""

$deadline = (Get-Date).AddMinutes(1)
$url = $null
while (-not $url) {
  if ((Get-Date) -gt $deadline) { throw "No tunnel URL yet. See $tunnelLog" }
  Start-Sleep -Seconds 2
  $url = Select-String -Path $tunnelLog -Pattern $urlPattern -ErrorAction SilentlyContinue |
    Select-Object -First 1 | ForEach-Object { $_.Matches[0].Value }
}

Write-Output "Public URL: $url"
Write-Output "cloudflared process: $tunnelId"
Write-Output 'Stop it with: .\start-share.ps1 -Stop'