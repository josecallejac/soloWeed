<#
.SYNOPSIS
Restores the project to a previous checkpoint.

.DESCRIPTION
Checks out the git tag and restores the database from backup.
WARNING: This discards current uncommitted code changes and DB state.

.PARAMETER Name
Checkpoint name to restore (e.g. "base-v1", "snap-20260515-130000").

.PARAMETER Force
Skip confirmation prompt.

.EXAMPLE
.\scripts\snapshot-restore.ps1 -Name base-v1
.\scripts\snapshot-restore.ps1 -Name snap-20260515-130000 -Force
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot\..

# La BD viva es el Postgres de Railway apuntado por .env; el restore lógico lo
# hace scripts/pg-snapshot.ts (TRUNCATE + repoblado). El flujo SQLite legado
# (file:./X + backup .db) se mantiene por si se restaura un checkpoint antiguo.
$isPostgres = $true
$dbPath = ""
if (Test-Path ".env") {
    $envLine = Select-String -Path ".env" -Pattern '^\s*DATABASE_URL\s*=\s*"?file:\./([^"\s]+)"?' | Select-Object -First 1
    if ($envLine) {
        $isPostgres = $false
        $dbPath = "prisma\" + $envLine.Matches[0].Groups[1].Value
    }
}

# Check backup exists
$backupFile = if ($isPostgres) { "backups\$Name.json.gz" } else { "backups\$Name.db" }
if (-not (Test-Path $backupFile)) {
    Write-Error "Backup '$backupFile' not found. Available checkpoints:"
    Get-ChildItem backups\* -Include *.db, *.json.gz | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Yellow }
    exit 1
}

# Check git tag exists
$tagExists = git tag -l $Name
if (-not $tagExists) {
    Write-Error "Git tag '$Name' not found. The backup file exists but the git tag is missing."
    if ($isPostgres) {
        Write-Host "You can still restore the DB manually: npx tsx scripts/pg-snapshot.ts restore $Name" -ForegroundColor Yellow
    } else {
        Write-Host "You can still restore the DB manually: Copy-Item backups\$Name.db $dbPath" -ForegroundColor Yellow
    }
    exit 1
}

# Show metadata if available
if (Test-Path "backups\$Name.json") {
    Write-Host "Checkpoint metadata:" -ForegroundColor Cyan
    try {
        $meta = Get-Content "backups\$Name.json" -Raw | ConvertFrom-Json
        Write-Host "  Date:         $($meta.date)" -ForegroundColor Cyan
        Write-Host "  Commit:       $($meta.commit)" -ForegroundColor Cyan
        if ($meta.offers) { Write-Host "  Offers:       $($meta.offers)" -ForegroundColor Cyan }
        if ($meta.products) { Write-Host "  Products:     $($meta.products)" -ForegroundColor Cyan }
        if ($meta.stores) { Write-Host "  Stores:       $($meta.stores)" -ForegroundColor Cyan }
    } catch {}
}

# Confirmation
if (-not $Force) {
    Write-Host ""
    Write-Warning "This will DISCARD current changes and restore to checkpoint '$Name'."
    Write-Warning "Uncommitted code changes and current database WILL BE LOST."
    $confirm = Read-Host "Type 'yes' to confirm"
    if ($confirm -ne "yes") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

# Checkout the git tag
Write-Host "Checking out git tag '$Name'..." -ForegroundColor Cyan
git checkout $Name
if (-not $?) { Write-Error "Git checkout failed"; exit 1 }

# Restore database
if ($isPostgres) {
    Write-Host "Restoring Postgres from $backupFile (TRUNCATE + repoblado)..." -ForegroundColor Cyan
    npx tsx scripts/pg-snapshot.ts restore $Name
    if (-not $?) { Write-Error "pg-snapshot restore failed"; exit 1 }
} else {
    Write-Host "Restoring database from $backupFile -> $dbPath..." -ForegroundColor Cyan
    Copy-Item -LiteralPath $backupFile -Destination $dbPath -Force
}

# Run Prisma generate to sync client
Write-Host "Regenerating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if (-not $?) { Write-Warning "Prisma generate had issues; you may need 'npm install'" }

Write-Host ""
Write-Host "Restored to checkpoint '$Name'." -ForegroundColor Green
Write-Host "Run 'npm run dev' to start." -ForegroundColor Green
