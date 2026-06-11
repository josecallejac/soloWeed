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

# Resolve the active DB file from .env DATABASE_URL (file:./X is relative to prisma/)
$dbPath = "prisma\dev.db"
if (Test-Path ".env") {
    $envLine = Select-String -Path ".env" -Pattern '^\s*DATABASE_URL\s*=\s*"?file:\./([^"\s]+)"?' | Select-Object -First 1
    if ($envLine) {
        $dbPath = "prisma\" + $envLine.Matches[0].Groups[1].Value
    }
}

# Check DB exists
if (-not (Test-Path $dbPath)) {
    Write-Error "$dbPath not found. Run scraping first?"
    exit 1
}

# Get current commit
$commit = git rev-parse --short HEAD
if (-not $?) { Write-Error "Failed to get git commit"; exit 1 }

# Copy database
Write-Host "Backing up $dbPath -> backups\$Name.db" -ForegroundColor Cyan
Copy-Item -LiteralPath $dbPath -Destination "backups\$Name.db" -Force
$dbSize = (Get-Item "backups\$Name.db").Length

# Query metrics via Prisma (write temp script, run it, clean up)
$tempScript = "scripts\_snap_metrics_temp.ts"
@"
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const [offers, products, stores, curated] = await Promise.all([
    p.offer.count(), p.product.count(), p.store.count(),
    p.offer.count({ where: { productId: { not: null } } })
  ]);
  console.log(JSON.stringify({ checkpoint: "$Name", commit: "$commit", date: new Date().toISOString(), offers, products, stores, curatedOffers: curated }));
  await p.`$disconnect();
})();
"@ | Set-Content -LiteralPath $tempScript -Encoding UTF8

$metricsJson = npx tsx $tempScript
Remove-Item -LiteralPath $tempScript -ErrorAction SilentlyContinue

if (-not $metricsJson) {
    # Fallback: save minimal metadata without Prisma
    $metricsJson = "{`"checkpoint`":`"$Name`",`"commit`":`"$commit`",`"date`":`"$((Get-Date).ToUniversalTime().ToString('o'))`",`"dbSizeBytes`":$dbSize}"
    Write-Warning "Could not query Prisma metrics; saved minimal metadata"
}

$metricsJson | Set-Content -LiteralPath "backups\$Name.json" -Encoding UTF8

# Create git tag
git tag $Name -m "Checkpoint: $Name"
if (-not $?) { Write-Error "Failed to create git tag"; exit 1 }

Write-Host "Checkpoint '$Name' saved:" -ForegroundColor Green
Write-Host "  Tag:       $Name (commit $commit)" -ForegroundColor Green
Write-Host "  DB backup: backups\$Name.db ($($dbSize.ToString('N0')) bytes)" -ForegroundColor Green
Write-Host "  Metadata:  backups\$Name.json" -ForegroundColor Green
try {
    $meta = Get-Content "backups\$Name.json" -Raw | ConvertFrom-Json
    Write-Host "  Offers: $($meta.offers) | Products: $($meta.products) | Stores: $($meta.stores)" -ForegroundColor Green
} catch {}
Write-Host "Restore with: .\scripts\snapshot-restore.ps1 -Name $Name" -ForegroundColor Cyan
