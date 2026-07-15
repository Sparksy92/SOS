@echo off
title SurvivalOS Setup Wizard
cd /d "%~dp0"
echo ================================================
echo        Starting SurvivalOS Windows Setup        
echo ================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
echo.
echo ================================================
echo  Setup script completed.
echo  If no errors occurred, you can now close this
echo  window and double-click launcher.bat.
echo ================================================
pause
