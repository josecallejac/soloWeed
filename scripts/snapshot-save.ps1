<#
.SYNOPSIS
Creates a checkpoint snapshot of the current project state.

.DESCRIPTION
Saves the current database to backups/ and creates a git tag.
Run before starting risky changes (scraping, matching, curation).

.PARAMETER Name
Checkpoint name. Defaults to "snap-YYYYMMDD-HHmmss".

.EXAMPLE
.\scripts\snapshot-save.ps1
.\scripts\snapshot-save.ps1 -Name "antes-matching-refactor"
#>

param(
    [string]$Name = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot\..

if (-not $Name) {
    $Name = "snap-" + (Get-Date -Format "yyyyMMdd-HHmmss")
}

# Ensure backups directory
New-Item -ItemType Directory -Path backups -Force | Out-Null

# La BD viva es el Postgres de Railway apuntado por .env; el dump lógico lo
# hace scripts/pg-snapshot.ts vía Prisma (sin pg_dump). El flujo SQLite legado
# (file:./X) se mantiene por si se restaura un checkpoint antiguo.
$isPostgres = $true
$dbPath = ""
if (Test-Path ".env") {
    $envLine = Select-String -Path ".env" -Pattern '^\s*DATABASE_URL\s*=\s*"?file:\./([^"\s]+)"?' | Select-Object -First 1
    if ($envLine) {
        $isPostgres = $false
        $dbPath = "prisma\" + $envLine.Matches[0].Groups[1].Value
    }
}

# Get current commit
$commit = git rev-parse --short HEAD
if (-not $?) { Write-Error "Failed to get git commit"; exit 1 }

if ($isPostgres) {
    Write-Host "Dump logico de Postgres -> backups\$Name.json.gz" -ForegroundColor Cyan
    $metricsJson = npx tsx scripts/pg-snapshot.ts dump $Name
    if (-not $? -or -not $metricsJson) { Write-Error "pg-snapshot dump failed"; exit 1 }
    $backupFile = "backups\$Name.json.gz"
    $metricsJson = $metricsJson -replace '\{', "{`"commit`":`"$commit`","
} else {
    if (-not (Test-Path $dbPath)) {
        Write-Error "$dbPath not found. Run scraping first?"
        exit 1
    }
    Write-Host "Backing up $dbPath -> backups\$Name.db" -ForegroundColor Cyan
    Copy-Item -LiteralPath $dbPath -Destination "backups\$Name.db" -Force
    $backupFile = "backups\$Name.db"
    $dbSize = (Get-Item $backupFile).Length
    $metricsJson = "{`"checkpoint`":`"$Name`",`"commit`":`"$commit`",`"date`":`"$((Get-Date).ToUniversalTime().ToString('o'))`",`"dbSizeBytes`":$dbSize}"
}

$dbSize = (Get-Item $backupFile).Length
$metricsJson | Set-Content -LiteralPath "backups\$Name.json" -Encoding UTF8

# Create git tag
git tag $Name -m "Checkpoint: $Name"
if (-not $?) { Write-Error "Failed to create git tag"; exit 1 }

Write-Host "Checkpoint '$Name' saved:" -ForegroundColor Green
Write-Host "  Tag:       $Name (commit $commit)" -ForegroundColor Green
Write-Host "  DB backup: $backupFile ($($dbSize.ToString('N0')) bytes)" -ForegroundColor Green
Write-Host "  Metadata:  backups\$Name.json" -ForegroundColor Green
try {
    $meta = Get-Content "backups\$Name.json" -Raw | ConvertFrom-Json
    Write-Host "  Offers: $($meta.offers) | Products: $($meta.products) | Stores: $($meta.stores)" -ForegroundColor Green
} catch {}
Write-Host "Restore with: .\scripts\snapshot-restore.ps1 -Name $Name" -ForegroundColor Cyan
Write-Host "(el restore de un .json.gz TRUNCA el Postgres vivo y lo repuebla)" -ForegroundColor Yellow
