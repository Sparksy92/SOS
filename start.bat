@echo off
title Start Survival OS (J.A.R.V.I.S.)
echo ==========================================================
echo        STARTING SURVIVAL OPERATING SYSTEM (J.A.R.V.I.S.)
echo ==========================================================
echo.

:: 1. Start Express Backend Server
echo [1/2] Starting Backend Server (Port 3001)...
cd /d "%~dp0sos-server"
start /B node index.js

:: 2. Start Frontend UI
echo [2/2] Starting Frontend UI (Port 3000)...
cd /d "%~dp0sos-app"
start /B npm run dev

:: 3. Open Browser
timeout /t 3 >nul
echo Opening web browser at http://localhost:3000...
start http://localhost:3000

echo.
echo ==========================================================
echo  Survival OS is ONLINE. 
echo  Leave this window open to keep the servers running.
echo  Close this window to shut down the servers.
echo ==========================================================
echo.

:: Keep window open so background processes run
cmd /k
