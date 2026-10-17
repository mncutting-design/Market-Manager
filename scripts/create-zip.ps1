$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$workspaceRoot = "d:\RENT PRO"
$zipOutput = Join-Path $workspaceRoot "market-manager.zip"
$publicZip = Join-Path $workspaceRoot "public\market-manager.zip"

if (Test-Path $zipOutput) { Remove-Item $zipOutput -Force }
if (Test-Path $publicZip) { Remove-Item $publicZip -Force }

$itemsToInclude = @(
    (Join-Path $workspaceRoot "app"),
    (Join-Path $workspaceRoot "components"),
    (Join-Path $workspaceRoot "lib"),
    (Join-Path $workspaceRoot "messages"),
    (Join-Path $workspaceRoot "prisma"),
    (Join-Path $workspaceRoot "public"),
    (Join-Path $workspaceRoot "scripts"),
    (Join-Path $workspaceRoot "package.json"),
    (Join-Path $workspaceRoot "tsconfig.json"),
    (Join-Path $workspaceRoot "next.config.ts"),
    (Join-Path $workspaceRoot "postcss.config.mjs"),
    (Join-Path $workspaceRoot "eslint.config.mjs"),
    (Join-Path $workspaceRoot ".env.example"),
    (Join-Path $workspaceRoot "README.md"),
    (Join-Path $workspaceRoot "AGENTS.md")
)

Write-Host "Creating ZIP archive from source files..."
Compress-Archive -Path $itemsToInclude -DestinationPath $zipOutput -CompressionLevel Optimal

Write-Host "Copying to public directory for browser download..."
Copy-Item -Path $zipOutput -Destination $publicZip -Force

$fileInfo = Get-Item $zipOutput
$sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
Write-Host "SUCCESS: Created $zipOutput ($sizeMB MB)"
