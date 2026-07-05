# SurvivalOS Operator Launcher Script (Windows PowerShell)
$root = $PSScriptRoot
$serverPath = Join-Path $root "sos-server"
$appPath = Join-Path $root "sos-app"
$logsPath = Join-Path $root "logs"
$serverLog = Join-Path $logsPath "sos-server.log"
$launcherLog = Join-Path $logsPath "sos-launcher.log"

# Create logs directory if missing
if (!(Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath -Force | Out-Null
}

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] $msg" | Out-File -FilePath $launcherLog -Append -Encoding utf8
}

function Get-ProcessByPort($port) {
    # netstat is used as it does not require admin elevation
    $netstat = netstat -ano | Select-String "LISTENING" | Select-String ":$port\s"
    if ($netstat) {
        $parts = $netstat[0].ToString().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
        $pid = $parts[-1]
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                # Get CommandLine if supported on this Windows/PS version
                $cmdLine = "Unknown"
                try {
                    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $pid").CommandLine
                } catch {}
                
                return [PSCustomObject]@{
                    PID = $pid
                    Name = $proc.Name
                    CommandLine = $cmdLine
                    Process = $proc
                }
            }
        } catch {}
    }
    return $null
}

function Stop-PortProcess($port, $label) {
    $procInfo = Get-ProcessByPort $port
    if ($procInfo) {
        Write-Host "Found process bound to port $port (PID: $($procInfo.PID), Name: $($procInfo.Name))" -ForegroundColor Yellow
        if ($procInfo.CommandLine -and $procInfo.CommandLine -ne "Unknown") {
            Write-Host "Command Line: $($procInfo.CommandLine)" -ForegroundColor Gray
        }
        
        $confirm = Read-Host "Stop $label on port $port? (y/n)"
        if ($confirm -eq 'y') {
            Write-Host "Sending graceful close request to PID $($procInfo.PID)..."
            Write-Log "Requested stop for $label on port $port (PID: $($procInfo.PID))"
            
            # Graceful stop
            $procInfo.Process.CloseMainWindow() | Out-Null
            Start-Sleep -Seconds 2
            
            # Check if still running
            $checkAgain = Get-Process -Id $procInfo.PID -ErrorAction SilentlyContinue
            if ($checkAgain) {
                $force = Read-Host "Process is still running. Force terminate PID $($procInfo.PID)? (y/n)"
                if ($force -eq 'y') {
                    Stop-Process -Id $procInfo.PID -Force -ErrorAction SilentlyContinue
                    Write-Host "Process on port $port force stopped." -ForegroundColor Green
                    Write-Log "Force killed PID $($procInfo.PID) on port $port"
                } else {
                    Write-Host "Keep process running." -ForegroundColor Yellow
                }
            } else {
                Write-Host "Process on port $port stopped gracefully." -ForegroundColor Green
                Write-Log "PID $($procInfo.PID) on port $port exited gracefully"
            }
        }
    } else {
        Write-Host "No process found listening on port $port." -ForegroundColor Gray
    }
}

function Start-ProductionMode {
    Write-Host "`n--- STARTING SURVIVALOS (PRODUCTION MODE) ---" -ForegroundColor Cyan
    Write-Log "Starting production mode launcher check"
    
    # Check if frontend build exists
    $distPath = Join-Path $appPath "dist"
    if (!(Test-Path $distPath)) {
        Write-Host "Production build folder 'sos-app/dist' is missing!" -ForegroundColor Yellow
        $buildNow = Read-Host "Build frontend now? (y/n)"
        if ($buildNow -eq 'y') {
            Build-Frontend
        } else {
            Write-Host "Production mode launch cancelled." -ForegroundColor Red
            return
        }
    }
    
    # Stop existing port 3001 process if any
    $existing = Get-ProcessByPort 3001
    if ($existing) {
        Write-Host "Port 3001 is already in use by PID $($existing.PID)." -ForegroundColor Yellow
        Stop-PortProcess 3001 "SurvivalOS local server"
        # Check again
        if (Get-ProcessByPort 3001) {
            Write-Host "Port 3001 is still blocked. Aborting start." -ForegroundColor Red
            return
        }
    }
    
    # Start Backend in production mode (will host frontend assets statically)
    Write-Host "Launching backend Node server on port 3001..." -ForegroundColor White
    Write-Log "Spawning backend process in production mode"
    
    $env:NODE_ENV = "production"
    $env:PORT = "3001"
    
    Start-Process node -ArgumentList "index.js" -WorkingDirectory $serverPath -NoNewWindow -RedirectStandardOutput $serverLog -RedirectStandardError $serverLog
    
    # Wait for startup
    Start-Sleep -Seconds 3
    
    # Check health status
    $health = Check-HealthSilent
    if ($health -and $health.ok) {
        Write-Host "SurvivalOS backend started successfully." -ForegroundColor Green
        Write-Host "Serving app on http://localhost:3001" -ForegroundColor Green
        Open-BrowserPort 3001
    } else {
        Write-Host "Backend server failed to respond to health check. Inspect logs/sos-server.log for details." -ForegroundColor Red
        Write-Log "Health check failed after production boot spawn"
    }
}

function Start-DevelopmentMode {
    Write-Host "`n--- STARTING SURVIVALOS (DEVELOPMENT MODE) ---" -ForegroundColor Cyan
    Write-Log "Starting development mode launcher check"
    
    # Stop existing server processes
    $existingServer = Get-ProcessByPort 3001
    if ($existingServer) {
        Write-Host "Port 3001 is in use by PID $($existingServer.PID)." -ForegroundColor Yellow
        Stop-PortProcess 3001 "SurvivalOS local server"
    }
    $existingClient = Get-ProcessByPort 3000
    if ($existingClient) {
        Write-Host "Port 3000 is in use by PID $($existingClient.PID)." -ForegroundColor Yellow
        Stop-PortProcess 3000 "frontend dev server"
    }
    
    if ((Get-ProcessByPort 3001) -or (Get-ProcessByPort 3000)) {
        Write-Host "Ports are still blocked. Aborting start." -ForegroundColor Red
        return
    }
    
    # Start Backend on 3001
    Write-Host "Launching backend Node server on port 3001..." -ForegroundColor White
    $env:NODE_ENV = "development"
    $env:PORT = "3001"
    Start-Process node -ArgumentList "index.js" -WorkingDirectory $serverPath -NoNewWindow -RedirectStandardOutput $serverLog -RedirectStandardError $serverLog
    
    # Start Frontend Dev Server on 3000
    Write-Host "Launching Vite dev server on port 3000..." -ForegroundColor White
    $appLog = Join-Path $logsPath "sos-app-dev.log"
    Start-Process npm -ArgumentList "run dev" -WorkingDirectory $appPath -NoNewWindow -RedirectStandardOutput $appLog -RedirectStandardError $appLog
    
    # Wait for startup
    Start-Sleep -Seconds 4
    
    # Check health status
    $health = Check-HealthSilent
    if ($health -and $health.ok) {
        Write-Host "SurvivalOS backend started successfully on port 3001." -ForegroundColor Green
        Write-Host "Vite dev server running on port 3000." -ForegroundColor Green
        Open-BrowserPort 3000
    } else {
        Write-Host "Startup check timed out or encountered errors. Verify logs/sos-server.log." -ForegroundColor Red
    }
}

function Build-Frontend {
    Write-Host "`n--- BUILDING FRONTEND PRODUCTION ASSETS ---" -ForegroundColor Cyan
    Write-Log "Starting frontend compile build run"
    Write-Host "Executing npm run build inside sos-app..." -ForegroundColor White
    
    $proc = Start-Process npm -ArgumentList "run build" -WorkingDirectory $appPath -NoNewWindow -PassThru -Wait
    if ($proc.ExitCode -eq 0) {
        Write-Host "Frontend build completed successfully." -ForegroundColor Green
        Write-Log "Frontend compile succeeded"
    } else {
        Write-Host "Frontend build failed with exit code $($proc.ExitCode)." -ForegroundColor Red
        Write-Log "Frontend compile failed with code $($proc.ExitCode)"
    }
}

function Check-HealthSilent {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        return $response
    } catch {
        return $null
    }
}

function Check-Status {
    Write-Host "`n--- SURVIVALOS STATUS & DIAGNOSTICS ---" -ForegroundColor Cyan
    $health = Check-HealthSilent
    if ($health) {
        Write-Host "Status: healthy (Local Core is Online)" -ForegroundColor Green
        Write-Host "App Version: v$($health.release.appVersion) ($($health.release.releaseCandidate))" -ForegroundColor Green
        Write-Host "Schema Version: $($health.release.schemaVersion)" -ForegroundColor White
        Write-Host "Backup Schema: $($health.release.backupSchemaVersion)" -ForegroundColor White
        Write-Host "Materials Directory overrides: $(if ($health.materialRootConfigured) { 'Configured' } else { 'Default (Application Root)' })" -ForegroundColor White
        Write-Host "Auto-Crawl Status: $(if ($health.autoCrawlEnabled) { 'Enabled' } else { 'Disabled' })" -ForegroundColor White
        Write-Host "Ollama Connection: $($health.ollama.toUpperCase())" -ForegroundColor White
        Write-Host "Total Indexed Documents: $($health.indexedDocumentCount)" -ForegroundColor White
    } else {
        Write-Host "Status: blocked (Local Core Offline)" -ForegroundColor Red
        Write-Host "Backend Connection: UNREACHABLE" -ForegroundColor Red
        Write-Host "Please start the local server using launcher options." -ForegroundColor Yellow
    }
}

function Open-BrowserPort($port) {
    Write-Host "Opening browser window to http://localhost:$port..." -ForegroundColor Gray
    Start-Process "http://localhost:$port"
}

function View-Logs {
    Write-Host "`n--- RECENT SERVER LOG ENTRIES (logs/sos-server.log) ---" -ForegroundColor Cyan
    if (Test-Path $serverLog) {
        Get-Content $serverLog -Tail 30
    } else {
        Write-Host "No backend server log file found." -ForegroundColor Gray
    }
    
    Write-Host "`n--- RECENT LAUNCHER LOG ENTRIES (logs/sos-launcher.log) ---" -ForegroundColor Cyan
    if (Test-Path $launcherLog) {
        Get-Content $launcherLog -Tail 20
    } else {
        Write-Host "No launcher log file found." -ForegroundColor Gray
    }
}

# Menu Loop
do {
    Write-Host "`n=========================================" -ForegroundColor Cyan
    Write-Host "       SURVIVALOS LOCAL OPERATOR MENU    " -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "1. Start SurvivalOS (Production Mode)"
    Write-Host "2. Start SurvivalOS (Development Mode)"
    Write-Host "3. Stop SurvivalOS Services"
    Write-Host "4. Restart Production Server"
    Write-Host "5. Check System Health & Status"
    Write-Host "6. Open Browser Window"
    Write-Host "7. View Local Server Logs"
    Write-Host "8. Run Frontend Build Compiler"
    Write-Host "9. Exit Launcher"
    Write-Host "=========================================" -ForegroundColor Cyan
    
    $choice = Read-Host "Select an option (1-9)"
    switch ($choice) {
        '1' { Start-ProductionMode }
        '2' { Start-DevelopmentMode }
        '3' { 
            Stop-PortProcess 3001 "SurvivalOS local server"
            Stop-PortProcess 3000 "frontend dev server"
        }
        '4' {
            Stop-PortProcess 3001 "SurvivalOS local server"
            Start-ProductionMode
        }
        '5' { Check-Status }
        '6' {
            $h = Check-HealthSilent
            if (Get-ProcessByPort 3000) { Open-BrowserPort 3000 }
            elseif (Get-ProcessByPort 3001) { Open-BrowserPort 3001 }
            else { Write-Host "No service is running. Start mode first." -ForegroundColor Yellow }
        }
        '7' { View-Logs }
        '8' { Build-Frontend }
        '9' { Write-Host "Exiting launcher. Standby." -ForegroundColor Yellow }
        Default { Write-Host "Invalid option. Select 1 to 9." -ForegroundColor Red }
    }
} while ($choice -ne '9')
