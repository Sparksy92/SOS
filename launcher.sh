#!/bin/bash
# SurvivalOS Operator Launcher (Linux Bash)

# ANSI Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/sos-server"
APP_DIR="$ROOT_DIR/sos-app"
LOGS_DIR="$ROOT_DIR/logs"
SERVER_LOG="$LOGS_DIR/sos-server.log"
LAUNCHER_LOG="$LOGS_DIR/sos-launcher.log"

mkdir -p "$LOGS_DIR"

log_msg() {
    local timestamp
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" >> "$LAUNCHER_LOG"
}

check_port() {
    # Check if a process is listening on the given port
    ss -tlnp 2>/dev/null | grep -q ":$1 "
}

kill_port_process() {
    local port=$1
    local label=$2
    if check_port "$port"; then
        echo -e "${YELLOW}Warning: Port $port is currently in use.${NC}"
        read -rp "Stop process listening on port $port? (y/n): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            # Find PID using fuser or lsof
            local pid
            pid=$(lsof -t -i:"$port" 2>/dev/null)
            if [ -n "$pid" ]; then
                echo -e "Stopping $label (PID: $pid)..."
                kill "$pid" 2>/dev/null
                sleep 2
                if check_port "$port"; then
                    echo -e "${RED}Process is still running. Force killing...${NC}"
                    kill -9 "$pid" 2>/dev/null
                fi
                echo -e "${GREEN}Port $port is now free.${NC}"
            else
                echo -e "${RED}Could not identify PID. Please free port $port manually.${NC}"
            fi
        fi
    fi
}

run_diagnostics() {
    echo -e "\n${CYAN}==========================================================${NC}"
    echo -e "${CYAN}             SURVIVALOS SYSTEM DIAGNOSTICS                ${NC}"
    echo -e "${CYAN}==========================================================${NC}"
    
    # 1. Check Dependencies
    echo -e "${WHITE}[1/4] Checking Core Dependencies:${NC}"
    
    # Node.js
    if command -v node >/dev/null 2>&1; then
        echo -e "  Node.js:   ${GREEN}Installed ($(node -v))${NC}"
    else
        echo -e "  Node.js:   ${RED}Not Found${NC}"
        echo -e "             Please install Node.js v20+ (e.g. 'sudo apt install nodejs')"
    fi
    
    # Python3
    if command -v python3 >/dev/null 2>&1; then
        echo -e "  Python:    ${GREEN}Installed ($(python3 --version | cut -d' ' -f2))${NC}"
    else
        echo -e "  Python:    ${RED}Not Found${NC}"
    fi

    # Git
    if command -v git >/dev/null 2>&1; then
        echo -e "  Git:       ${GREEN}Installed ($(git --version | cut -d' ' -f3))${NC}"
    else
        echo -e "  Git:       ${RED}Not Found${NC}"
    fi

    # Ollama
    if command -v ollama >/dev/null 2>&1; then
        echo -e "  Ollama:    ${GREEN}Installed${NC}"
    else
        echo -e "  Ollama:    ${YELLOW}Not Found (Optional but recommended for offline LLM features)${NC}"
    fi

    # Node modules check
    if [ -d "$SERVER_DIR/node_modules" ] && [ -d "$APP_DIR/node_modules" ]; then
        echo -e "  Packages:  ${GREEN}All node_modules are installed.${NC}"
    else
        echo -e "  Packages:  ${YELLOW}Missing dependencies. Run Option 3 to install.${NC}"
    fi

    # 2. Hardware Capability Diagnostics
    echo -e "\n${WHITE}[2/4] Analyzing Hardware Specifications:${NC}"
    
    # CPU Cores
    local cpu_cores
    cpu_cores=$(nproc 2>/dev/null || echo "Unknown")
    echo -e "  CPU Cores: $cpu_cores logical processors"

    # RAM
    local ram_kb
    ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local ram_gb=$((ram_kb / 1024 / 1024))
    echo -e "  System RAM: ${ram_gb} GB"

    # GPU
    local gpu_info=""
    if command -v nvidia-smi >/dev/null 2>&1; then
        gpu_info=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null)
    fi
    
    if [ -n "$gpu_info" ]; then
        local gpu_name
        gpu_name=$(echo "$gpu_info" | cut -d',' -f1)
        local gpu_vram_mb
        gpu_vram_mb=$(echo "$gpu_info" | cut -d',' -f2 | tr -d ' ')
        local gpu_vram_gb=$((gpu_vram_mb / 1024))
        echo -e "  GPU:        ${GREEN}$gpu_name (CUDA-Enabled, ${gpu_vram_gb}GB VRAM)${NC}"
    else
        # Generic PCI check
        local generic_gpu
        generic_gpu=$(lspci 2>/dev/null | grep -Ei 'vga|3d' | head -n 1 | cut -d':' -f3 | sed 's/^ //')
        if [ -n "$generic_gpu" ]; then
            echo -e "  GPU:        $generic_gpu (No CUDA acceleration detected)"
        else
            echo -e "  GPU:        None detected"
        fi
    fi

    # 3. Spec-Based LLM Recommendations
    echo -e "\n${WHITE}[3/4] Hardware Recommendations:${NC}"
    if [ -n "$gpu_info" ] && [ "$ram_gb" -ge 16 ]; then
        echo -e "  ${GREEN}High-end System Detected!${NC}"
        echo -e "  - Recommended Local LLM:  ${WHITE}llama3.1:8b${NC} or ${WHITE}deepseek-r1:8b${NC}"
        echo -e "  - Recommended OCR Model:  ${WHITE}llava:7b${NC} (Fully accelerated on your GPU)"
    elif [ "$ram_gb" -ge 8 ]; then
        echo -e "  ${YELLOW}Mid-range System Detected.${NC}"
        echo -e "  - Recommended Local LLM:  ${WHITE}llama3.2:3b${NC} (Good speed and capability balance)"
        echo -e "  - Recommended Embedding:  ${WHITE}nomic-embed-text${NC} (Essential for library search)"
    else
        echo -e "  ${RED}Low-spec/CPU System Detected.${NC}"
        echo -e "  - Recommended Local LLM:  ${WHITE}llama3.2:1b${NC} or ${WHITE}qwen2.5:1.5b${NC}"
        echo -e "  - Note: Runs on CPU, queries will have noticeable latency."
    fi

    # 4. Ollama Status and Pulled Models
    echo -e "\n${WHITE}[4/4] Ollama Model Library:${NC}"
    if check_port "11434"; then
        echo -e "  Ollama Service: ${GREEN}Online & Listening on port 11434${NC}"
        echo -e "  Installed Models:"
        if command -v ollama >/dev/null 2>&1; then
            ollama list | tail -n +2 | awk '{print "    - " $1}'
        fi
    else
        echo -e "  Ollama Service: ${RED}Offline${NC}"
        echo -e "  (Select Option 4 to start it or verify your installation)"
    fi
    echo -e "${CYAN}==========================================================${NC}"
}

install_dependencies() {
    echo -e "\n${CYAN}--- SETTING UP APPLICATION DEPENDENCIES ---${NC}"
    log_msg "Running installer check and dependency installs"
    
    # Check for Node.js
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${YELLOW}Node.js is missing. Please install nodejs via your package manager.${NC}"
        return 1
    fi

    echo -e "Installing backend dependencies (sos-server)..."
    cd "$SERVER_DIR" && npm install
    
    echo -e "Installing frontend dependencies (sos-app)..."
    cd "$APP_DIR" && npm install
    
    echo -e "${GREEN}✔ Dependencies installed successfully!${NC}"
}

start_production() {
    echo -e "\n${CYAN}--- STARTING SURVIVALOS (PRODUCTION MODE) ---${NC}"
    log_msg "Starting production mode"
    
    if [ ! -d "$APP_DIR/dist" ]; then
        echo -e "${YELLOW}Production build folder 'sos-app/dist' is missing!${NC}"
        read -rp "Build frontend assets now? (y/n): " build_now
        if [[ "$build_now" =~ ^[Yy]$ ]]; then
            build_frontend
        else
            echo -e "${RED}Production boot cancelled.${NC}"
            return 1
        fi
    fi

    kill_port_process 3001 "SurvivalOS Production Server"

    echo -e "Launching Node server on port 3001..."
    export NODE_ENV=production
    export PORT=3001
    
    cd "$SERVER_DIR"
    node index.js > "$SERVER_LOG" 2>&1 &
    
    sleep 3
    if check_port 3001; then
        echo -e "${GREEN}✔ SurvivalOS started successfully!${NC}"
        echo -e "${GREEN}Open http://localhost:3001 in your browser.${NC}"
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open "http://localhost:3001" >/dev/null 2>&1 &
        fi
    else
        echo -e "${RED}Failed to boot server. Inspect logs/sos-server.log for details.${NC}"
    fi
}

start_development() {
    echo -e "\n${CYAN}--- STARTING SURVIVALOS (DEVELOPMENT MODE) ---${NC}"
    log_msg "Starting development mode"
    
    kill_port_process 3001 "SurvivalOS Backend Server"
    kill_port_process 3000 "Frontend Dev Server"

    echo -e "Launching backend Node server on port 3001..."
    export NODE_ENV=development
    export PORT=3001
    cd "$SERVER_DIR"
    node index.js > "$SERVER_LOG" 2>&1 &

    echo -e "Launching Vite frontend dev server on port 3000..."
    cd "$APP_DIR"
    npm run dev > "$LOGS_DIR/sos-app-dev.log" 2>&1 &

    sleep 4
    if check_port 3000; then
        echo -e "${GREEN}✔ SurvivalOS Dev Environment is online!${NC}"
        echo -e "${GREEN}Serving UI on http://localhost:3000 (Backend on http://localhost:3001)${NC}"
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open "http://localhost:3000" >/dev/null 2>&1 &
        fi
    else
        echo -e "${RED}Development launch timed out or failed. Check logs directory.${NC}"
    fi
}

build_frontend() {
    echo -e "\n${CYAN}--- BUILDING FRONTEND PRODUCTION ASSETS ---${NC}"
    log_msg "Building frontend production assets"
    cd "$APP_DIR"
    npm run build
}

pull_ollama_models() {
    echo -e "\n${CYAN}--- PULLING RECOMMENDED OLLAMA MODELS ---${NC}"
    if ! check_port "11434"; then
        echo -e "Ollama is offline. Starting Ollama in background..."
        ollama serve >/dev/null 2>&1 &
        sleep 4
    fi

    echo -e "Pulling text embedding model: nomic-embed-text..."
    ollama pull nomic-embed-text
    
    read -rp "Pull recommended 3B chat model (llama3.2:latest)? (y/n): " pull_llm
    if [[ "$pull_llm" =~ ^[Yy]$ ]]; then
        ollama pull llama3.2:latest
    fi

    read -rp "Pull vision model for OCR (llava:7b)? (y/n): " pull_ocr
    if [[ "$pull_ocr" =~ ^[Yy]$ ]]; then
        ollama pull llava:7b
    fi
    echo -e "${GREEN}✔ Models pulled successfully!${NC}"
}

# Menu Loop
while true; do
    echo -e "\n${CYAN}==========================================================${NC}"
    echo -e "${CYAN}             SURVIVALOS UNIFIED OPERATOR MENU             ${NC}"
    echo -e "${CYAN}==========================================================${NC}"
    echo -e "  1. Start SurvivalOS (Production Mode)"
    echo -e "  2. Start SurvivalOS (Development Mode)"
    echo -e "  3. Install / Verify System Dependencies"
    echo -e "  4. Setup & Pull Ollama LLM Models"
    echo -e "  5. Run Hardware Diagnostics & Check Health"
    echo -e "  6. Build / Recompile Frontend Assets"
    echo -e "  7. Stop Running Services"
    echo -e "  8. Exit"
    echo -e "${CYAN}==========================================================${NC}"
    read -rp "Select an option (1-8): " choice

    case $choice in
        1) start_production ;;
        2) start_development ;;
        3) install_dependencies ;;
        4) pull_ollama_models ;;
        5) run_diagnostics ;;
        6) build_frontend ;;
        7)
            kill_port_process 3001 "SurvivalOS Backend Server"
            kill_port_process 3000 "Frontend Dev Server"
            ;;
        8)
            echo -e "${YELLOW}Exiting launcher. Good luck, Operator.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Enter a number between 1 and 8.${NC}"
            ;;
    esac
done
