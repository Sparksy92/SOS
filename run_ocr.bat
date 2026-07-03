@echo off
title J.A.R.V.I.S. OCR Processor
echo ==========================================================
echo       J.A.R.V.I.S. LOCAL OCR PIPELINE (llava:7b)
echo ==========================================================
echo.
echo This script will scan all directories for scanned PDFs.
echo It will use your local 'llava:7b' GPU model to transcribe
echo image pages into clean Markdown files for the AI's brain.
echo.
python "%~dp0ocr_library.py"
pause
