<#
.SYNOPSIS
  Sets up the FormGrid monorepo at D:\Work\ZKY-JT\main\form-wapper\schema-form-platform.

.DESCRIPTION
  1. Copies schema-form into packages/web (excludes node_modules, dist, .git, .claude, .playwright-mcp)
  2. Replaces packages/web/package.json with the updated @schema-form/web version
  3. Places monorepo root config files (package.json, pnpm-workspace.yaml, tsconfig.base.json)
  4. Places the backend server files into packages/server

.PARAMETER MonorepoRoot
  Target monorepo root path. Defaults to the sibling directory schema-form-platform.
#>

param(
  [string]$MonorepoRoot = "D:\Work\ZKY-JT\main\form-wapper\schema-form-platform"
)

$ErrorActionPreference = "Stop"
$SourceRoot = "D:\Work\ZKY-JT\main\form-wapper\schema-form"
$ScaffoldDir = Join-Path $SourceRoot "_scaffold"
$WebTarget = Join-Path $MonorepoRoot "packages\web"
$ServerTarget = Join-Path $MonorepoRoot "packages\server"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " FormGrid Monorepo Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Step 1: Copy schema-form to packages/web ----------
Write-Host "[1/4] Copying schema-form -> packages/web..." -ForegroundColor Yellow

# Ensure target dirs exist
New-Item -ItemType Directory -Force -Path $WebTarget | Out-Null
New-Item -ItemType Directory -Force -Path $ServerTarget | Out-Null

# Use robocopy with exclusions; robocopy exit codes 0-7 are non-fatal
$excludeDirs = @("node_modules", "dist", ".git", ".claude", ".playwright-mcp")
$xd = ($excludeDirs | ForEach-Object { "/XD `"$_`"" }) -join " "
$xf = "/XF pnpm-lock.yaml"

$robocopyArgs = "`"$SourceRoot`" `"$WebTarget`" /E /NFL /NDL /NJH /NJS $xd $xf"
$result = Invoke-Expression "robocopy $robocopyArgs"
$exitCode = $LASTEXITCODE
if ($exitCode -ge 8) {
  Write-Error "robocopy failed with exit code $exitCode"
  exit $exitCode
}
Write-Host "  -> Source files copied." -ForegroundColor Green

# ---------- Step 2: Replace web package.json ----------
Write-Host "[2/4] Updating packages/web/package.json -> @schema-form/web..." -ForegroundColor Yellow

$webPkgSrc = Join-Path $ScaffoldDir "web\package.json"
$webPkgDst = Join-Path $WebTarget "package.json"
Copy-Item -Force $webPkgSrc $webPkgDst
Write-Host "  -> package.json updated." -ForegroundColor Green

# ---------- Step 3: Copy monorepo root config ----------
Write-Host "[3/4] Placing monorepo root config..." -ForegroundColor Yellow

$rootFiles = @("package.json", "pnpm-workspace.yaml", "tsconfig.base.json")
foreach ($f in $rootFiles) {
  Copy-Item -Force (Join-Path $ScaffoldDir "root\$f") (Join-Path $MonorepoRoot $f)
}
Write-Host "  -> Root config placed." -ForegroundColor Green

# ---------- Step 4: Copy server files ----------
Write-Host "[4/4] Placing server files -> packages/server..." -ForegroundColor Yellow

$serverSrc = Join-Path $ScaffoldDir "server"
Get-ChildItem -Path $serverSrc -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($serverSrc.Length + 1)
  $dst = Join-Path $ServerTarget $relative
  $dstDir = Split-Path $dst -Parent
  if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  }
  Copy-Item -Force $_.FullName $dst
}
Write-Host "  -> Server files placed." -ForegroundColor Green

# ---------- Cleanup scaffold ----------
Write-Host ""
Write-Host "Cleaning up scaffold directory..." -ForegroundColor DarkGray
Remove-Item -Recurse -Force $ScaffoldDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Monorepo setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. cd $MonorepoRoot" -ForegroundColor White
Write-Host "  2. pnpm install" -ForegroundColor White
Write-Host "  3. cd packages/server && docker compose up -d" -ForegroundColor White
Write-Host "  4. pnpm dev  (starts both web and server)" -ForegroundColor White
Write-Host ""
