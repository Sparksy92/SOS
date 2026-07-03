# Script to extract PDFs from the 6 CD3WD ISO files natively on Windows.
# Copies all technical manuals to a folder so they appear and are indexed in the OS UI.

$dest = "$PSScriptRoot\CD3WD Extracted Manuals"
if (-not (Test-Path -Path $dest)) {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}

$isos = Get-ChildItem -Path "$PSScriptRoot\2012_cdw3d_dvd_set" -Filter "*.iso"
$total = $isos.Count
$current = 0

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       CD3WD DVD MANUAL EXTRACTION PROTOCOL               " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Destination: $dest" -ForegroundColor Yellow

foreach ($iso in $isos) {
    $current++
    Write-Host "`n[$current/$total] Processing $($iso.Name)..." -ForegroundColor Yellow
    
    # 1. Mount the ISO
    Write-Host "Mounting disc image..." -ForegroundColor Gray
    $mount = Mount-DiskImage -ImagePath $iso.FullName -PassThru -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # 2. Locate Drive Letter
    $volume = Get-Volume -DiskImage $mount -ErrorAction SilentlyContinue
    if (-not $volume) {
        Write-Host "Error: Could not retrieve drive letter for $($iso.Name)" -ForegroundColor Red
        Dismount-DiskImage -ImagePath $iso.FullName | Out-Null
        continue
    }
    
    $driveLetter = $volume.DriveLetter + ":"
    Write-Host "Disc mounted on drive $driveLetter" -ForegroundColor Green
    
    # 3. Extract PDFs
    Write-Host "Copying all PDF manuals to destination (this may take a moment)..." -ForegroundColor Gray
    Copy-Item -Path "$driveLetter\*.pdf" -Destination $dest -Recurse -Force -ErrorAction SilentlyContinue
    
    # 4. Dismount the ISO
    Write-Host "Dismounting disc image..." -ForegroundColor Gray
    Dismount-DiskImage -ImagePath $iso.FullName | Out-Null
    Start-Sleep -Seconds 1
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  EXTRACTION COMPLETE!" -ForegroundColor Green
Write-Host "  All PDF manuals have been extracted to CD3WD Extracted Manuals." -ForegroundColor Green
Write-Host "  The background crawler will automatically index them on next startup!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Start-Sleep -Seconds 5
