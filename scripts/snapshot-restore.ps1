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

# Resolve the active DB file from .env DATABASE_URL (file:./X is relative to prisma/)
$dbPath = "prisma\dev.db"
if (Test-Path ".env") {
    $envLine = Select-String -Path ".env" -Pattern '^\s*DATABASE_URL\s*=\s*"?file:\./([^"\s]+)"?' | Select-Object -First 1
    if ($envLine) {
        $dbPath = "prisma\" + $envLine.Matches[0].Groups[1].Value
    }
}

# Check backup exists
if (-not (Test-Path "backups\$Name.db")) {
    Write-Error "Backup 'backups\$Name.db' not found. Available checkpoints:"
    Get-ChildItem backups\*.db | ForEach-Object { Write-Host "  $($_.BaseName)" -ForegroundColor Yellow }
    exit 1
}

# Check git tag exists
$tagExists = git tag -l $Name
if (-not $tagExists) {
    Write-Error "Git tag '$Name' not found. The backup file exists but the git tag is missing."
    Write-Host "You can still restore the DB manually: Copy-Item backups\$Name.db $dbPath" -ForegroundColor Yellow
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
Write-Host "Restoring database from backups\$Name.db -> $dbPath..." -ForegroundColor Cyan
Copy-Item -LiteralPath "backups\$Name.db" -Destination $dbPath -Force

# Run Prisma generate to sync client
Write-Host "Regenerating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if (-not $?) { Write-Warning "Prisma generate had issues; you may need 'npm install'" }

Write-Host ""
Write-Host "Restored to checkpoint '$Name'." -ForegroundColor Green
Write-Host "Run 'npm run dev' to start." -ForegroundColor Green
