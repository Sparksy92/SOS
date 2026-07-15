# SurvivalOS Seamless Onboarding Installer Script (Windows PowerShell)
# Coordinates dependency setup for Node.js, Python, and local configurations.

Write-Output "================================================"
Write-Output "         SurvivalOS Installation Wizard         "
Write-Output "================================================"

# 1. Verify Node.js version
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (!$nodeCheck) {
    Write-Warning "❌ Error: Node.js is not installed. Please download and install Node.js v22.5.0 or higher from https://nodejs.org"
    return
}

$nodeVersion = node -v
$nodeMajor = [int]($nodeVersion.TrimStart('v').Split('.')[0])

if ($nodeMajor -lt 22) {
    Write-Warning "⚠️ Warning: SurvivalOS uses SQLite synchronous drivers which require Node.js >= 22.5.0."
    Write-Host "Current Version: $nodeVersion"
    Write-Host "Please upgrade Node.js if you experience database errors."
}

# 2. Setup environment files
Write-Output "`n📋 Preparing environment configuration templates..."
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Output "✓ Root .env initialized from .env.example"
} else {
    Write-Output "✓ Root .env already exists. Skipping."
}

if (!(Test-Path sos-server/.env)) {
    Copy-Item sos-server/.env.example sos-server/.env
    Write-Output "✓ Backend sos-server/.env initialized"
} else {
    Write-Output "✓ Backend .env already exists. Skipping."
}

if (!(Test-Path sos-app/.env)) {
    Copy-Item sos-app/.env.example sos-app/.env
    Write-Output "✓ Frontend sos-app/.env initialized"
} else {
    Write-Output "✓ Frontend .env already exists. Skipping."
}

# 3. Install NPM Packages
Write-Output "`n📦 Installing server packages..."
Set-Location sos-server
npm install
Write-Output "✓ Server packages installed."

Write-Output "`n📦 Installing app UI packages..."
Set-Location ../sos-app
npm install
Write-Output "✓ Frontend packages installed."

# 4. Install Python Virtual Environment
Set-Location ..
Write-Output "`n🐍 Preparing Python virtual environment for OCR/TTS..."
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if (!$pythonCheck) {
    $pythonCheck = Get-Command python3 -ErrorAction SilentlyContinue
}

if (!$pythonCheck) {
    Write-Warning "⚠️ Warning: Python was not found on your system PATH. OCR and local TTS services will require Python installation."
} else {
    $skipPython = $false
    if (!(Test-Path venv)) {
        try {
            Start-Process -FilePath $pythonCheck.Source -ArgumentList "-m venv venv" -NoNewWindow -Wait -ErrorAction Stop
            Write-Output "✓ Virtual environment 'venv/' created."
        } catch {
            Write-Warning "⚠️ Warning: Failed to automatically create Python virtual environment."
            Write-Warning "The installation will continue, but Python OCR/TTS sidecars will not be configured."
            $skipPython = $true
        }
    }
    if (!$skipPython) {
        Write-Output "Installing Python requirements..."
        try {
            & .\venv\Scripts\pip.exe install --upgrade pip
            & .\venv\Scripts\pip.exe install -r requirements.txt
            Write-Output "✓ Python dependencies successfully installed."
        } catch {
            Write-Warning "⚠️ Warning: Python dependencies installation failed. Some features might not be available."
        }
    }
}

Write-Output "`n================================================"
Write-Output "🎉 Setup Completed Successfully!"
Write-Output "================================================"
Write-Output "Next Steps:"
Write-Output "1. Run Ollama locally and pull the required models:"
Write-Output "   ollama pull llama3.1:8b"
Write-Output "   ollama pull nomic-embed-text"
Write-Output "2. Provide offline PDF files in your library."
Write-Output "3. Double-click 'launcher.bat' to start all services and access the dashboard!"
Write-Output "================================================"
