<#
.SYNOPSIS
  Starts all three servers for the AI Interview & Career Readiness app:
    - Whisper STT (Python)  -> http://localhost:8000
    - Express backend       -> http://localhost:5000
    - Vite frontend         -> http://localhost:5173
  Then verifies each port and opens the app in Chrome.

.USAGE
  From the project root (ai-interview-career-readiness):
      .\start.ps1
  Stop everything later with:
      .\stop.ps1
#>

$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot
$serverDir = Join-Path $root 'server'
$clientDir = Join-Path $root 'client'

function Test-PortFree([int]$Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return ($null -eq $conn)
}

function Stop-Port([int]$Port) {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

Write-Host ''
Write-Host '=== AI Interview App - starting all servers ===' -ForegroundColor Cyan

# --- 1. Whisper STT (Python, port 8000) ---
if (Test-PortFree 8000) {
  Write-Host '[1/3] Starting Whisper STT on :8000 (model: small - first run downloads ~460MB)...' -ForegroundColor Yellow
  $env:WHISPER_LOCAL_MODEL = 'small'
  Start-Process -FilePath 'python' -ArgumentList 'whisper_server.py' `
    -WorkingDirectory $serverDir `
    -RedirectStandardOutput (Join-Path $root 'whisper-run.log') `
    -RedirectStandardError (Join-Path $root 'whisper-err.log') `
    -WindowStyle Hidden
} else {
  Write-Host '[1/3] Whisper already running on :8000 - skipping.' -ForegroundColor DarkGray
}

# --- 2. Express backend (port 5000) ---
if (Test-PortFree 5000) {
  Write-Host '[2/3] Starting Express backend on :5000 ...' -ForegroundColor Yellow
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev > ..\server-run.log 2>&1' `
    -WorkingDirectory $serverDir -WindowStyle Hidden
} else {
  Write-Host '[2/3] Express already running on :5000 - skipping.' -ForegroundColor DarkGray
}

# --- 3. Vite frontend (port 5173) ---
if (Test-PortFree 5173) {
  Write-Host '[3/3] Starting Vite frontend on :5173 ...' -ForegroundColor Yellow
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run dev > ..\client-run.log 2>&1' `
    -WorkingDirectory $clientDir -WindowStyle Hidden
} else {
  Write-Host '[3/3] Vite already running on :5173 - skipping.' -ForegroundColor DarkGray
}

# --- Wait & verify ---
Write-Host ''
Write-Host 'Waiting for servers to come up (Whisper model may take ~30s on first run)...' -ForegroundColor Cyan

$deadline = (Get-Date).AddSeconds(60)
$ports = @{ 8000 = 'Whisper '; 5000 = 'Express '; 5173 = 'Vite    ' }
$pending = @(8000, 5000, 5173)

while ((Get-Date) -lt $deadline -and $pending.Count -gt 0) {
  Start-Sleep -Seconds 3
  $pending = @($pending | Where-Object { Test-PortFree $_ })
}

Write-Host ''
$allUp = $true
foreach ($p in ($ports.Keys | Sort-Object)) {
  if (Test-PortFree $p) {
    Write-Host "  X $($ports[$p]) :$p - NOT responding (check logs)" -ForegroundColor Red
    $allUp = $false
  } else {
    Write-Host "  OK $($ports[$p]) :$p - running" -ForegroundColor Green
  }
}
Write-Host ''

if ($allUp) {
  Write-Host 'All servers up! Opening app in Chrome...' -ForegroundColor Green
  $chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
  )
  $chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($chrome) {
    Start-Process $chrome 'http://localhost:5173'
  } else {
    Start-Process 'http://localhost:5173'
  }
} else {
  Write-Host 'Some servers failed. Check these logs:' -ForegroundColor Red
  Write-Host "  - $root\whisper-err.log" -ForegroundColor Red
  Write-Host "  - $root\server-run.log" -ForegroundColor Red
  Write-Host "  - $root\client-run.log" -ForegroundColor Red
}
