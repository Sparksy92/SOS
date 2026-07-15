#!/usr/bin/env bash
set -e

# SurvivalOS Seamless Onboarding Installer Script
# Coordinates dependency setup for Node.js, Python, and local configurations.

echo "================================================"
echo "         SurvivalOS Installation Wizard         "
echo "================================================"

# 1. Verify Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed."
    echo "SurvivalOS requires Node.js v22.5.0 or higher."
    echo ""
    echo "To install on Debian/Ubuntu-based systems (Ubuntu, Mint, Debian):"
    echo "   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    echo ""
    echo "To install on RHEL/Fedora-based systems:"
    echo "   sudo dnf install -y nodejs"
    echo ""
    echo "To install on Arch Linux:"
    echo "   sudo pacman -S nodejs npm"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 22 ]; then
    echo "⚠️ Warning: SurvivalOS uses SQLite synchronous drivers which require Node.js >= 22.5.0."
    echo "Current Version: v$NODE_VERSION"
    echo "Please upgrade Node.js if you experience database errors."
fi

# 2. Setup environment files
echo -e "\n📋 Preparing environment configuration templates..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Root .env initialized from .env.example"
else
    echo "✓ Root .env already exists. Skipping."
fi

if [ ! -f sos-server/.env ]; then
    cp sos-server/.env.example sos-server/.env
    echo "✓ Backend sos-server/.env initialized"
else
    echo "✓ Backend .env already exists. Skipping."
fi

if [ ! -f sos-app/.env ]; then
    cp sos-app/.env.example sos-app/.env
    echo "✓ Frontend sos-app/.env initialized"
else
    echo "✓ Frontend .env already exists. Skipping."
fi

# 3. Install NPM Packages
echo -e "\n📦 Installing server packages..."
cd sos-server
npm install
echo "✓ Server packages installed."

echo -e "\n📦 Installing app UI packages..."
cd ../sos-app
npm install
echo "✓ Frontend packages installed."

# 4. Install Python Virtual Environment
cd ..
echo -e "\n🐍 Preparing Python virtual environment for OCR/TTS..."
if ! command -v python3 &> /dev/null; then
    echo "⚠️ Warning: python3 not found. OCR and local TTS services will require Python installation."
else
    SKIP_PYTHON_VENV=false
    if [ ! -d venv ]; then
        if python3 -m venv venv 2>/dev/null; then
            echo "✓ Virtual environment 'venv/' created."
        else
            echo "⚠️ Warning: Failed to automatically create Python virtual environment."
            echo "On Debian/Ubuntu-based systems, you may need to install the python3-venv module first:"
            echo "   sudo apt install -y python3-venv"
            echo "The installation will continue, but Python OCR/TTS sidecars will not be configured."
            SKIP_PYTHON_VENV=true
        fi
    fi

    if [ "$SKIP_PYTHON_VENV" != "true" ]; then
        echo "Installing Python requirements..."
        if source venv/bin/activate 2>/dev/null; then
            pip install --upgrade pip || echo "⚠️ Warning: Failed to upgrade pip. Proceeding..."
            if pip install -r requirements.txt; then
                echo "✓ Python dependencies successfully installed."
            else
                echo "⚠️ Warning: Python requirements installation failed."
                echo "Some local sidecar features (such as OCR and local voice TTS) may be unavailable until dependencies are resolved manually."
            fi
        else
            echo "⚠️ Warning: Failed to activate Python virtual environment."
        fi
    fi
fi

echo -e "\n================================================"
echo "🎉 Setup Completed Successfully!"
echo "================================================"
echo "Next Steps:"
echo "1. Run Ollama locally and pull the required models:"
echo "   ollama pull llama3.1:8b"
echo "   ollama pull nomic-embed-text"
echo "2. Provide offline PDF files in your staged directory."
echo "3. Run './launcher.sh' to start all services and access the dashboard!"
echo "================================================"
