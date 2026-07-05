@echo off
title SurvivalOS Operator Launcher
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File .\launcher.ps1
pause
