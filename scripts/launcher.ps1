# SurvivalOS Operator Launcher (Windows PowerShell)
param(
    [switch]$cli
)

$root = Split-Path -Parent $PSScriptRoot
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
        $targetPid = $parts[-1]
        try {
            $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if ($proc) {
                $cmdLine = "Unknown"
                try {
                    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid").CommandLine
                } catch {}
                
                return [PSCustomObject]@{
                    PID = $targetPid
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
            
            $procInfo.Process.CloseMainWindow() | Out-Null
            Start-Sleep -Seconds 2
            
            $checkAgain = Get-Process -Id $procInfo.PID -ErrorAction SilentlyContinue
            if ($checkAgain) {
                $force = Read-Host "Process is still running. Force terminate PID $($procInfo.PID)? (y/n)"
                if ($force -eq 'y') {
                    Stop-Process -Id $procInfo.PID -Force -ErrorAction SilentlyContinue
                    Write-Host "Process on port $port force stopped." -ForegroundColor Green
                    Write-Log "Force killed PID $($procInfo.PID) on port $port"
                } else {
                    Write-Host "Keeping process running." -ForegroundColor Yellow
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

function Run-Diagnostics {
    Write-Host ""
    Write-Host '==========================================================' -ForegroundColor Cyan
    Write-Host "             SURVIVALOS SYSTEM DIAGNOSTICS                " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    
    # 1. Dependency Checks
    Write-Host "[1/4] Checking Core Dependencies:" -ForegroundColor White
    
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        Write-Host "  Node.js:   Installed ($($nodeCheck.Version -or (node -v)))" -ForegroundColor Green
    } else {
        Write-Host "  Node.js:   NOT FOUND (Required)" -ForegroundColor Red
    }

    $pythonCheck = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCheck) {
        $pyVer = python --version 2>&1
        Write-Host "  Python:    Installed ($($pyVer -replace 'Python ', ''))" -ForegroundColor Green
    } else {
        Write-Host "  Python:    NOT FOUND (Optional, required for compilers)" -ForegroundColor Yellow
    }

    $gitCheck = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCheck) {
        Write-Host "  Git:       Installed" -ForegroundColor Green
    } else {
        Write-Host "  Git:       NOT FOUND" -ForegroundColor Yellow
    }

    $ollamaCheck = Get-Command ollama -ErrorAction SilentlyContinue
    if ($ollamaCheck) {
        Write-Host "  Ollama:    Installed" -ForegroundColor Green
    } else {
        Write-Host "  Ollama:    NOT FOUND (Optional, required for offline LLM features)" -ForegroundColor Yellow
    }

    if ((Test-Path (Join-Path $serverPath "node_modules")) -and (Test-Path (Join-Path $appPath "node_modules"))) {
        Write-Host "  Packages:  All node_modules are installed." -ForegroundColor Green
    } else {
        Write-Host "  Packages:  MISSING node_modules. Select Option 3 to install." -ForegroundColor Yellow
    }

    # 2. Hardware Capabilities
    Write-Host "`n[2/4] Analyzing Hardware Specifications:" -ForegroundColor White
    
    $cpuCores = $env:NUMBER_OF_PROCESSORS
    Write-Host "  CPU Cores: $cpuCores logical processors"
    
    $ramBytes = (Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue | Measure-Object -Property Capacity -Sum).Sum
    if ($ramBytes) {
        $ramGb = [Math]::Round($ramBytes / 1GB)
        Write-Host "  System RAM: $ramGb GB"
    } else {
        $ramGb = 8
        Write-Host "  System RAM: Unknown (Defaulting recommendations to mid-spec)" -ForegroundColor Yellow
    }

    $gpus = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue
    $gpuCount = 0
    $cudaGpu = $false
    $cudaVram = 0

    if ($gpus) {
        foreach ($gpu in $gpus) {
            $gpuName = $gpu.Name
            $gpuVram = ""
            
            # Fetch VRAM if queryable
            if ($gpu.AdapterRAM) {
                $gpuVram = " (" + [Math]::Round($gpu.AdapterRAM / 1MB) + "MB VRAM)"
            }
            
            # NVIDIA CUDA check
            if ($gpuName -like "*NVIDIA*" -or $gpuName -like "*GeForce*" -or $gpuName -like "*RTX*" -or $gpuName -like "*Quadro*") {
                $cudaGpu = $true
                $nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
                if ($nvidiaSmi) {
                    $smiOut = & nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>&1
                    if ($smiOut -match '^\d+$') {
                        $cudaVram = [Math]::Round([int]$smiOut / 1024)
                        $gpuVram = " (CUDA-Enabled) (${cudaVram}GB VRAM)"
                    }
                }
                Write-Host "  GPU:        $gpuName$gpuVram" -ForegroundColor Green
            } else {
                Write-Host "  GPU:        $gpuName$gpuVram"
            }
            $gpuCount++
        }
    }
    
    if ($gpuCount -eq 0) {
        Write-Host "  GPU:        No dedicated graphics card found." -ForegroundColor Yellow
    }

    # 3. Recommendations
    Write-Host "`n[3/4] Hardware Recommendations:" -ForegroundColor White
    if ($ramGb -ge 16 -and $cudaGpu -and $cudaVram -ge 6) {
        Write-Host "  High-end System Detected!" -ForegroundColor Green
        Write-Host "  - Recommended Local LLM:  llama3.1:8b or deepseek-r1:8b" -ForegroundColor White
        Write-Host "  - Recommended OCR Model:  llava:7b (Fully accelerated on your GPU)" -ForegroundColor White
    } elseif ($ramGb -ge 8 -and ($cudaVram -ge 3 -or $cpuCores -ge 8)) {
        Write-Host "  Mid-range System Detected." -ForegroundColor Yellow
        Write-Host "  - Recommended Local LLM:  llama3.2:3b (Good speed and capability balance)" -ForegroundColor White
        Write-Host "  - Recommended Embedding:  nomic-embed-text (Essential for library search)" -ForegroundColor White
    } else {
        Write-Host "  Low-spec/CPU System Detected." -ForegroundColor Red
        Write-Host "  - Recommended Local LLM:  llama3.2:1b or qwen2.5:1.5b" -ForegroundColor White
        Write-Host "  - Note: Runs on CPU, queries will have noticeable latency." -ForegroundColor White
    }

    # 4. Ollama Models Library
    Write-Host ""
    Write-Host '[4/4] Ollama Model Library:' -ForegroundColor White
    $ollamaPortActive = Get-ProcessByPort 11434
    if ($ollamaPortActive) {
        Write-Host "  Ollama Service: Online AND Listening on port 11434" -ForegroundColor Green
        Write-Host "  Installed Models:"
        if ($ollamaCheck) {
            ollama list | Select-Object -Skip 1 | ForEach-Object {
                $parts = $_.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
                Write-Host "    - $($parts[0])"
            }
        }
    } else {
        Write-Host "  Ollama Service: Offline (Select Option 4 to start it or check installation)" -ForegroundColor Red
    }
    Write-Host "==========================================================" -ForegroundColor Cyan
}

function Install-Dependencies {
    Write-Host ""
    Write-Host '--- SETTING UP APPLICATION DEPENDENCIES ---' -ForegroundColor Cyan
    Write-Log "Running setup dependency check"
    
    # 1. Check & Install Node.js if missing
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Node.js not found. Downloading Node.js v22.11.0 installer..." -ForegroundColor Yellow
        $tempMsi = Join-Path $env:TEMP "node.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi" -OutFile $tempMsi
        Write-Host "Running Node.js installer... Please follow the prompts." -ForegroundColor White
        Start-Process msiexec.exe -ArgumentList "/i `"$tempMsi`"" -Wait
        Write-Host "✔ Node.js installation completed." -ForegroundColor Green
    }
    
    # 2. Check & Install Ollama if missing
    if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
        Write-Host "Ollama not found. Downloading Ollama installer..." -ForegroundColor Yellow
        $tempExe = Join-Path $env:TEMP "OllamaSetup.exe"
        Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $tempExe
        Write-Host "Running Ollama installer... Please follow the prompts." -ForegroundColor White
        Start-Process $tempExe -Wait
        Write-Host "✔ Ollama installation completed." -ForegroundColor Green
    }

    # 3. NPM package installs
    Write-Host "Installing packages for Backend (sos-server)..." -ForegroundColor White
    Start-Process cmd.exe -ArgumentList "/c npm install" -WorkingDirectory $serverPath -NoNewWindow -Wait
    
    Write-Host "Installing packages for Frontend (sos-app)..." -ForegroundColor White
    Start-Process cmd.exe -ArgumentList "/c npm install" -WorkingDirectory $appPath -NoNewWindow -Wait

    Write-Host "✔ Dependencies installed successfully!" -ForegroundColor Green
}

function Start-ProductionMode {
    Write-Host ""
    Write-Host '--- STARTING SURVIVALOS (PRODUCTION MODE) ---' -ForegroundColor Cyan
    Write-Log "Starting production mode"
    
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
    
    $existing = Get-ProcessByPort 3001
    if ($existing) {
        Write-Host "Port 3001 is already in use by PID $($existing.PID)." -ForegroundColor Yellow
        Stop-PortProcess 3001 "SurvivalOS local server"
        if (Get-ProcessByPort 3001) {
            Write-Host "Port 3001 is still blocked. Aborting start." -ForegroundColor Red
            return
        }
    }
    
    Write-Host "Launching backend Node server on port 3001..." -ForegroundColor White
    Write-Log "Spawning backend process in production mode"
    
    $env:NODE_ENV = "production"
    $env:PORT = "3001"
    $serverErrorLog = Join-Path $logsPath "sos-server-error.log"
    Start-Process node -ArgumentList "--max-old-space-size=4096", "index.js" -WorkingDirectory $serverPath -NoNewWindow -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrorLog
    
    Start-Sleep -Seconds 3
    
    $health = try { Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue } catch { $null }
    if ($health -and $health.ok) {
        Write-Host "SurvivalOS backend started successfully." -ForegroundColor Green
        Write-Host "Serving app on http://localhost:3001" -ForegroundColor Green
        Start-Process "http://localhost:3001"
    } else {
        Write-Host "Backend server failed to respond. Check logs/sos-server.log." -ForegroundColor Red
        Write-Log "Health check failed after production boot spawn"
    }
}

function Start-DevelopmentMode {
    Write-Host ""
    Write-Host '--- STARTING SURVIVALOS (DEVELOPMENT MODE) ---' -ForegroundColor Cyan
    Write-Log "Starting development mode"
    
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
    
    Write-Host "Launching backend Node server on port 3001..." -ForegroundColor White
    $env:NODE_ENV = "development"
    $env:PORT = "3001"
    $serverErrorLog = Join-Path $logsPath "sos-server-error.log"
    Start-Process node -ArgumentList "--max-old-space-size=4096", "index.js" -WorkingDirectory $serverPath -NoNewWindow -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrorLog
    
    Write-Host "Launching Vite dev server on port 3000..." -ForegroundColor White
    $appLog = Join-Path $logsPath "sos-app-dev.log"
    $appErrorLog = Join-Path $logsPath "sos-app-dev-error.log"
    Start-Process npm -ArgumentList "run dev" -WorkingDirectory $appPath -NoNewWindow -RedirectStandardOutput $appLog -RedirectStandardError $appErrorLog
    
    Start-Sleep -Seconds 4
    
    $health = try { Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue } catch { $null }
    if ($health -and $health.ok) {
        Write-Host "SurvivalOS backend started successfully on port 3001." -ForegroundColor Green
        Write-Host "Vite dev server running on port 3000." -ForegroundColor Green
        Start-Process "http://localhost:3000"
    } else {
        Write-Host "Startup check timed out or failed. Verify logs/sos-server.log." -ForegroundColor Red
    }
}

function Build-Frontend {
    Write-Host ""
    Write-Host '--- BUILDING FRONTEND PRODUCTION ASSETS ---' -ForegroundColor Cyan
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

function Pull-OllamaModels {
    Write-Host ""
    Write-Host '--- SETUP AND PULL OLLAMA MODELS ---' -ForegroundColor Cyan
    
    $ollamaActive = Get-ProcessByPort 11434
    if (!$ollamaActive) {
        Write-Host "Ollama service is offline. Starting Ollama in the background..." -ForegroundColor Yellow
        Start-Process ollama -ArgumentList "serve" -NoNewWindow
        Start-Sleep -Seconds 4
    }
    
    Write-Host "Pulling text embedding model: nomic-embed-text..." -ForegroundColor White
    ollama pull nomic-embed-text
    
    $pullLlm = Read-Host "Pull recommended 3B chat model (llama3.2:latest)? (y/n)"
    if ($pullLlm -eq 'y') {
        ollama pull llama3.2:latest
    }

    $pullOcr = Read-Host "Pull vision model for OCR (llava:7b)? (y/n)"
    if ($pullOcr -eq 'y') {
        ollama pull llava:7b
    }

    Write-Host "✔ Ollama model pull operations completed." -ForegroundColor Green
}

# --- EXECUTION ROOT ---
if ($cli) {
    # Legacy Console Menu Mode
    do {
        Write-Host ""
        Write-Host '==========================================================' -ForegroundColor Cyan
        Write-Host "             SURVIVALOS UNIFIED OPERATOR MENU             " -ForegroundColor Cyan
        Write-Host "==========================================================" -ForegroundColor Cyan
        Write-Host "  1. Start SurvivalOS (Production Mode)"
        Write-Host "  2. Start SurvivalOS (Development Mode)"
        Write-Host "  3. Install / Verify System Dependencies"
        Write-Host "  4. Setup AND Pull Ollama LLM Models"
        Write-Host "  5. Run Hardware Diagnostics AND Check Health"
        Write-Host "  6. Build / Recompile Frontend Assets"
        Write-Host "  7. Stop Running Services"
        Write-Host "  8. Exit"
        Write-Host "==========================================================" -ForegroundColor Cyan
        
        $choice = Read-Host "Select an option (1-8)"
        switch ($choice) {
            '1' { Start-ProductionMode }
            '2' { Start-DevelopmentMode }
            '3' { Install-Dependencies }
            '4' { Pull-OllamaModels }
            '5' { Run-Diagnostics }
            '6' { Build-Frontend }
            '7' { 
                Stop-PortProcess 3001 "SurvivalOS Backend Server"
                Stop-PortProcess 3000 "Frontend Dev Server"
            }
            '8' { Write-Host "Exiting launcher. Good luck, Operator." -ForegroundColor Yellow }
            Default { Write-Host "Invalid option. Select 1 to 8." -ForegroundColor Red }
        }
    } while ($choice -ne '8')
} else {
    # Default Web UI Bootstrapper Mode
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "         SURVIVALOS WEB LAUNCHER BOOTSTRAPPER             " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Log "Starting Web launcher bootstrapper"

    # 1. Silently verify backend server dependencies exist
    $serverModulesExist = Test-Path (Join-Path $serverPath "node_modules")
    if (!$serverModulesExist) {
        Write-Host "Installing backend server dependencies... (One-time setup)" -ForegroundColor Yellow
        Write-Log "Bootstrapping server node_modules"
        $proc = Start-Process npm -ArgumentList "install" -WorkingDirectory $serverPath -NoNewWindow -PassThru -Wait
        if ($proc.ExitCode -ne 0) {
            Write-Host "Failed to install server dependencies. Exit code: $($proc.ExitCode)" -ForegroundColor Red
            Read-Host "Press Enter to exit..."
            return
        }
    }

    # 2. Ensure a clean boot by terminating any existing port 3000/3001 instances
    Write-Host "Cleaning up stale port 3000/3001 services..." -ForegroundColor White
    $p3000 = Get-ProcessByPort 3000
    if ($p3000) { Stop-Process -Id $p3000.PID -Force -ErrorAction SilentlyContinue }
    $p3001 = Get-ProcessByPort 3001
    if ($p3001) { Stop-Process -Id $p3001.PID -Force -ErrorAction SilentlyContinue }

    # Start the backend node server in the background
    Write-Host "Starting server daemon on port 3001..." -ForegroundColor White
    $env:NODE_ENV = "production"
    $env:PORT = "3001"
    $serverErrorLog = Join-Path $logsPath "sos-server-error.log"
    Start-Process node -ArgumentList "--max-old-space-size=4096", "index.js" -WorkingDirectory $serverPath -NoNewWindow -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrorLog

    # 3. Wait for the server to bind
    Write-Host "Waiting for service to bind..." -ForegroundColor White
    Start-Sleep -Seconds 3

    # 4. Open the browser to http://localhost:3001/launcher
    Write-Host "Opening launcher control panel in your default browser..." -ForegroundColor Green
    Start-Process "http://localhost:3001/launcher"

    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "       SURVIVALOS WEB LAUNCHER IS ONLINE & STREAMING      " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  Web Dashboard: http://localhost:3001/launcher" -ForegroundColor White
    Write-Host "  Server Log:    $serverLog" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  Press Ctrl+C to terminate launcher services and exit." -ForegroundColor Yellow
    Write-Host ""

    try {
        # Stream the server logs to the console window so the user sees progress and errors
        Get-Content -Path $serverLog -Wait -Tail 20
    } finally {
        Write-Host "`nStopping launcher services..." -ForegroundColor Yellow
        Write-Log "Shutting down launcher background services"
        # Gracefully close port 3000 & 3001 processes
        $p3000 = Get-ProcessByPort 3000
        if ($p3000) { Stop-Process -Id $p3000.PID -Force -ErrorAction SilentlyContinue }
        $p3001 = Get-ProcessByPort 3001
        if ($p3001) { Stop-Process -Id $p3001.PID -Force -ErrorAction SilentlyContinue }
    }
}
