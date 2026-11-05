param([ValidateRange(1, 65535)][int]$Port = 44381)

$ErrorActionPreference = 'Stop'
$apiRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../MISReports_Api_new')).Path
# The installed Informix OLE DB provider requires a 32-bit host.
$iisExpress = Join-Path ${env:ProgramFiles(x86)} 'IIS Express/iisexpress.exe'
if (-not (Test-Path -LiteralPath $iisExpress)) {
    throw 'Install 32-bit IIS Express before starting the local MISReports API.'
}
if (-not (Test-Path -LiteralPath (Join-Path $apiRoot 'bin/MISReports_Api.dll'))) {
    throw 'Build MISReports_Api_new/MISReports_Api.sln before starting the API.'
}

Write-Host "Starting 32-bit MISReports API at http://localhost:$Port. Keep this terminal open."
& $iisExpress "/path:$apiRoot" "/port:$Port" '/clr:v4.0' '/systray:false'
exit $LASTEXITCODE
