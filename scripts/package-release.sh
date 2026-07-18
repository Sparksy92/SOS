#!/bin/bash
# SurvivalOS Production Release Packager

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGING_DIR="$ROOT_DIR/dist_staging"
OUTPUT_ZIP="$ROOT_DIR/survivalos-release.zip"

echo -e "${CYAN}==========================================================${NC}"
echo -e "${CYAN}             SURVIVALOS PRODUCTION PACKAGER               ${NC}"
echo -e "${CYAN}==========================================================${NC}"

# Clean up previous staging
if [ -d "$STAGING_DIR" ]; then
    rm -rf "$STAGING_DIR"
fi
if [ -f "$OUTPUT_ZIP" ]; then
    rm -f "$OUTPUT_ZIP"
fi

# Ensure front-end is built for production
echo -e "Pre-building React frontend assets for production..."
cd "$ROOT_DIR/sos-app" || exit 1
if [ -d "node_modules" ]; then
    npm run build
else
    echo -e "${YELLOW}Warning: node_modules missing in sos-app. Running npm install first...${NC}"
    npm install && npm run build
fi

if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Frontend build failed. Cannot package release candidate.${NC}"
    exit 1
fi

echo -e "Creating staging folder structure..."
mkdir -p "$STAGING_DIR"
mkdir -p "$STAGING_DIR/sos-app"
mkdir -p "$STAGING_DIR/sos-server"
mkdir -p "$STAGING_DIR/logs"

# Copy root files
echo -e "Copying launchers and setup scripts..."
cp "$ROOT_DIR/README.md" "$STAGING_DIR/"
cp "$ROOT_DIR/logo.jpg" "$STAGING_DIR/"
cp "$ROOT_DIR/requirements.txt" "$STAGING_DIR/"
cp "$ROOT_DIR/docker-compose.yml" "$STAGING_DIR/"
cp "$ROOT_DIR/launcher.sh" "$STAGING_DIR/"
cp "$ROOT_DIR/launcher.bat" "$STAGING_DIR/"
cp "$ROOT_DIR/setup.sh" "$STAGING_DIR/"
cp "$ROOT_DIR/setup.bat" "$STAGING_DIR/"
cp "$ROOT_DIR/setup.ps1" "$STAGING_DIR/"

# Copy other system guides/folders
cp -r "$ROOT_DIR/docs" "$STAGING_DIR/"
cp -r "$ROOT_DIR/scripts" "$STAGING_DIR/"

# Copy frontend (excluding node_modules and configuration)
echo -e "Copying frontend files (including pre-built production assets)..."
cp -r "$ROOT_DIR/sos-app/dist" "$STAGING_DIR/sos-app/"
cp "$ROOT_DIR/sos-app/package.json" "$STAGING_DIR/sos-app/"
cp "$ROOT_DIR/sos-app/package-lock.json" "$STAGING_DIR/sos-app/"
cp "$ROOT_DIR/sos-app/vite.config.js" "$STAGING_DIR/sos-app/"
cp "$ROOT_DIR/sos-app/index.html" "$STAGING_DIR/sos-app/"
cp "$ROOT_DIR/sos-app/nginx.conf" "$STAGING_DIR/sos-app/"
cp -r "$ROOT_DIR/sos-app/src" "$STAGING_DIR/sos-app/"
cp -r "$ROOT_DIR/sos-app/public" "$STAGING_DIR/sos-app/"

# Copy backend (excluding databases, node_modules, logs, and tests)
echo -e "Copying backend files..."
cp "$ROOT_DIR/sos-server/package.json" "$STAGING_DIR/sos-server/"
cp "$ROOT_DIR/sos-server/package-lock.json" "$STAGING_DIR/sos-server/"
cp "$ROOT_DIR/sos-server/index.js" "$STAGING_DIR/sos-server/"
cp "$ROOT_DIR/sos-server/ai.js" "$STAGING_DIR/sos-server/"
cp "$ROOT_DIR/sos-server/db.js" "$STAGING_DIR/sos-server/"
cp "$ROOT_DIR/sos-server/crawler.js" "$STAGING_DIR/sos-server/"
cp -r "$ROOT_DIR/sos-server/routes" "$STAGING_DIR/sos-server/"
cp -r "$ROOT_DIR/sos-server/services" "$STAGING_DIR/sos-server/"

# Create empty directories
mkdir -p "$STAGING_DIR/materials"
mkdir -p "$STAGING_DIR/import-staging"
mkdir -p "$STAGING_DIR/import-staging/offline-library"
mkdir -p "$STAGING_DIR/import-staging/kiwix"
mkdir -p "$STAGING_DIR/models"
mkdir -p "$STAGING_DIR/venv"

# Create archive
echo -e "Compressing release files into $OUTPUT_ZIP..."
cd "$STAGING_DIR" || exit 1

if command -v zip >/dev/null 2>&1; then
    zip -r "$OUTPUT_ZIP" . >/dev/null
    ARCHIVE_TYPE="ZIP"
else
    echo -e "${YELLOW}Warning: zip command not found. Falling back to tar.gz compression...${NC}"
    tar -czf "$ROOT_DIR/survivalos-release.tar.gz" .
    OUTPUT_ZIP="$ROOT_DIR/survivalos-release.tar.gz"
    ARCHIVE_TYPE="TAR.GZ"
fi

# Clean up staging
cd "$ROOT_DIR" || exit 1
rm -rf "$STAGING_DIR"

echo -e "${GREEN}✔ Release package successfully built! [Type: $ARCHIVE_TYPE]${NC}"
echo -e "Path: $OUTPUT_ZIP"
echo -e "${CYAN}==========================================================${NC}"
