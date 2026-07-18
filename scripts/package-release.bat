@echo off
REM Windows Release Packaging Script Wrapper for SurvivalOS
echo ==========================================================
echo              SURVIVALOS WINDOWS PACKAGER
echo ==========================================================
echo Building and packaging release...

REM Clean previous release file
if exist survivalos-release.zip del /F /Q survivalos-release.zip

REM Build frontend
cd sos-app
if not exist node_modules (
    echo Installing sos-app dependencies...
    call npm install
)
echo Compiling production assets...
call npm run build
cd ..

REM Staging build directories
if exist dist_staging rmdir /S /Q dist_staging
mkdir dist_staging
mkdir dist_staging\sos-app
mkdir dist_staging\sos-server
mkdir dist_staging\logs
mkdir dist_staging\materials
mkdir dist_staging\models
mkdir dist_staging\import-staging
mkdir dist_staging\import-staging\offline-library
mkdir dist_staging\import-staging\kiwix

REM Copy root files
echo Copying system launcher scripts...
copy README.md dist_staging\
copy logo.jpg dist_staging\
copy requirements.txt dist_staging\
copy docker-compose.yml dist_staging\
copy launcher.sh dist_staging\
copy launcher.bat dist_staging\
copy setup.sh dist_staging\
copy setup.bat dist_staging\
copy setup.ps1 dist_staging\

REM Copy folders
xcopy /E /I /Q docs dist_staging\docs
xcopy /E /I /Q scripts dist_staging\scripts

REM Copy client code
xcopy /E /I /Q sos-app\dist dist_staging\sos-app\dist
copy sos-app\package.json dist_staging\sos-app\
copy sos-app\package-lock.json dist_staging\sos-app\
copy sos-app\vite.config.js dist_staging\sos-app\
copy sos-app\index.html dist_staging\sos-app\
copy sos-app\nginx.conf dist_staging\sos-app\
xcopy /E /I /Q sos-app\src dist_staging\sos-app\src
xcopy /E /I /Q sos-app\public dist_staging\sos-app\public

REM Copy server code
copy sos-server\package.json dist_staging\sos-server\
copy sos-server\package-lock.json dist_staging\sos-server\
copy sos-server\index.js dist_staging\sos-server\
copy sos-server\ai.js dist_staging\sos-server\
copy sos-server\db.js dist_staging\sos-server\
copy sos-server\crawler.js dist_staging\sos-server\
xcopy /E /I /Q sos-server\routes dist_staging\sos-server\routes
xcopy /E /I /Q sos-server\services dist_staging\sos-server\services

REM Zip packaging using PowerShell zip module
echo Creating zip archive...
powershell -Command "Expand-Archive -Path dist_staging -DestinationPath dist_staging -Force" 2>nul
powershell -Command "Compress-Archive -Path dist_staging\* -DestinationPath survivalos-release.zip -Force"

REM Clean up
rmdir /S /Q dist_staging

echo ==========================================================
echo ✔ Package built successfully: survivalos-release.zip
echo ==========================================================
pause
