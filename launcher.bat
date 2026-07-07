@echo off
title SurvivalOS Operator Launcher
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\launcher.ps1
