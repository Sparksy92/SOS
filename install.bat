@echo off
title Survival OS Installer (J.A.R.V.I.S.)
echo ==========================================================
echo       SURVIVAL OPERATING SYSTEM (J.A.R.V.I.S.) INSTALLER 
echo ==========================================================

:: 1. Check for Node.js
echo.
echo [1/4] Checking for Node.js...
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo ✔ Node.js is already installed.
) else (
    echo ⚠ Node.js not found. Downloading Node.js installer...
    curl -L -o "%TEMP%\node.msi" "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
    echo Running Node.js installer... Please follow the prompts.
    msiexec /i "%TEMP%\node.msi"
    echo ✔ Node.js installation finished.
)

:: 2. Check for Ollama
echo.
echo [2/4] Checking for Ollama...
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo ✔ Ollama is already installed.
) else (
    echo ⚠ Ollama not found. Downloading Ollama installer...
    curl -L -o "%TEMP%\OllamaSetup.exe" "https://ollama.com/download/OllamaSetup.exe"
    echo Running Ollama installer... Please follow the prompts.
    "%TEMP%\OllamaSetup.exe"
    echo ✔ Ollama installation finished.
)

:: 3. Pull Ollama Models
echo.
echo [3/4] Pulling Ollama Models (this may take several minutes)...
start /B ollama serve >nul 2>&1
timeout /t 5 >nul

echo Pulling text embedding model: nomic-embed-text...
ollama pull nomic-embed-text

echo Pulling local LLM model: llama3.1:8b...
ollama pull llama3.1:8b
echo ✔ Ollama models pulled successfully!

:: 4. Install Project Dependencies
echo.
echo [4/4] Installing application dependencies...
echo Setting up backend (sos-server)...
cd /d "%~dp0sos-server"
call npm install

echo Setting up frontend (sos-app)...
cd /d "%~dp0sos-app"
call npm install

echo.
echo ==========================================================
echo        INSTALLATION COMPLETED SUCCESSFULLY!
echo  You can now start the OS by double-clicking start.bat
echo ==========================================================
pause
