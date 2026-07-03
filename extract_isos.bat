@echo off
title Extract CD3WD DVDs
echo ==============================================
echo   Extracting CD3WD DVD manuals to Survival OS
echo ==============================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0extract_isos.ps1"
pause
