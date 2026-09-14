$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$previewNodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($previewNodeCommand) {
    $previewNodePath = $previewNodeCommand.Source
} else {
    $previewNodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $previewNodePath)) {
        throw 'Please install Node.js 20 or later, then run this script again.'
    }
}
& $previewNodePath (Join-Path $PSScriptRoot 'scripts\serve.mjs')
