<#
.SYNOPSIS
  Stops all three servers started by start.ps1 (ports 8000, 5000, 5173).
#>
$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'Stopping servers...' -ForegroundColor Cyan
foreach ($port in 8000, 5000, 5173) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  if ($pids) {
    $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Write-Host "  OK stopped :$port" -ForegroundColor Green
  } else {
    Write-Host "  - :$port was not running" -ForegroundColor DarkGray
  }
}
Write-Host 'Done.' -ForegroundColor Cyan
