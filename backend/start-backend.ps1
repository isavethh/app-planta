Set-Location $PSScriptRoot
Write-Host "Iniciando backend desde: $(Get-Location)"
node src/index.js
