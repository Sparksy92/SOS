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
    ss -tlnp 2>/dev/null | grep -q ":$1 "
}

kill_port_process() {
    local port=$1
    local label=$2
    if check_port "$port"; then
        echo -e "${YELLOW}Warning: Port $port is currently in use.${NC}"
        read -rp "Stop process listening on port $port? (y/n): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
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
    
    echo -e "${WHITE}[1/4] Checking Core Dependencies:${NC}"
    
    if command -v node >/dev/null 2>&1; then
        echo -e "  Node.js:   ${GREEN}Installed ($(node -v))${NC}"
    else
        echo -e "  Node.js:   ${RED}Not Found${NC}"
    fi
    
    if command -v python3 >/dev/null 2>&1; then
        echo -e "  Python:    ${GREEN}Installed ($(python3 --version | cut -d' ' -f2))${NC}"
    else
        echo -e "  Python:    ${RED}Not Found${NC}"
    fi

    if command -v git >/dev/null 2>&1; then
        echo -e "  Git:       ${GREEN}Installed ($(git --version | cut -d' ' -f3))${NC}"
    else
        echo -e "  Git:       ${RED}Not Found${NC}"
    fi

    if command -v ollama >/dev/null 2>&1; then
        echo -e "  Ollama:    ${GREEN}Installed${NC}"
    else
        echo -e "  Ollama:    ${YELLOW}Not Found (Optional but recommended)${NC}"
    fi

    if [ -d "$SERVER_DIR/node_modules" ] && [ -d "$APP_DIR/node_modules" ]; then
        echo -e "  Packages:  ${GREEN}All node_modules are installed.${NC}"
    else
        echo -e "  Packages:  ${YELLOW}Missing dependencies. Run Option 3 to install.${NC}"
    fi

    echo -e "\n${WHITE}[2/4] Analyzing Hardware Specifications:${NC}"
    local cores
    cores=$(nproc 2>/dev/null || echo "Unknown")
    echo -e "  CPU Cores: $cores logical processors"

    if [ -f /proc/meminfo ]; then
        local total_ram
        total_ram=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local ram_gb
        ram_gb=$((total_ram / 1024 / 1024))
        echo -e "  System RAM: ${ram_gb} GB"
    else
        echo -e "  System RAM: Unknown (Defaulting to mid-spec)"
        local ram_gb=8
    fi

    local has_nvidia=false
    local cuda_vram=0
    if command -v nvidia-smi >/dev/null 2>&1; then
        local gpu_name
        gpu_name=$(nvidia-smi --query-gpu=gpu_name --format=csv,noheader | head -n1)
        if [ -n "$gpu_name" ]; then
            has_nvidia=true
            local vram_total
            vram_total=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -n1)
            cuda_vram=$((vram_total / 1024))
            echo -e "  GPU:        ${GREEN}${gpu_name} (CUDA-Enabled) (${cuda_vram}GB VRAM)${NC}"
        fi
    fi

    if [ "$has_nvidia" = false ]; then
        echo -e "  GPU:        No dedicated CUDA graphics card found."
    fi

    echo -e "\n${WHITE}[3/4] Hardware Recommendations:${NC}"
    if [ "$ram_gb" -ge 16 ] && [ "$has_nvidia" = true ] && [ "$cuda_vram" -ge 6 ]; then
        echo -e "  High-end System Detected!"
        echo -e "  - Recommended Local LLM:  ${GREEN}llama3.1:8b or deepseek-r1:8b${NC}"
        echo -e "  - Recommended OCR Model:  ${GREEN}llava:7b (GPU Accelerated)${NC}"
    elif [ "$ram_gb" -ge 8 ] && { [ "$cuda_vram" -ge 3 ] || [ "$cores" -ge 8 ]; }; then
        echo -e "  Mid-range System Detected."
        echo -e "  - Recommended Local LLM:  ${YELLOW}llama3.2:3b (Good balance)${NC}"
        echo -e "  - Recommended Embedding:  ${YELLOW}nomic-embed-text (Required)${NC}"
    else
        echo -e "  Low-spec/CPU System Detected."
        echo -e "  - Recommended Local LLM:  ${RED}llama3.2:1b or qwen2.5:1.5b${NC}"
        echo -e "  - Note: Runs on CPU, queries will have latency."
    fi

    echo -e "\n${WHITE}[4/4] Ollama Model Library:${NC}"
    if check_port "11434"; then
        echo -e "  Ollama Service: ${GREEN}Online & Listening on port 11434${NC}"
        echo -e "  Installed Models:"
        ollama list | tail -n +2 | awk '{print "    - " $1}'
    else
        echo -e "  Ollama Service: ${RED}Offline${NC}"
    fi
    echo -e "${CYAN}==========================================================${NC}"
}

install_dependencies() {
    echo -e "\n${CYAN}--- SETTING UP APPLICATION DEPENDENCIES ---${NC}"
    log_msg "Running dependencies install"
    
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${RED}Error: Node.js is required but not installed. Please install it first.${NC}"
        return 1
    fi
    
    echo -e "Installing server dependencies..."
    cd "$SERVER_DIR" || return
    npm install
    
    echo -e "Installing frontend application dependencies..."
    cd "$APP_DIR" || return
    npm install
    
    echo -e "${GREEN}✔ Dependencies installed successfully!${NC}"
}

start_production() {
    echo -e "\n${CYAN}--- STARTING SURVIVALOS (PRODUCTION MODE) ---${NC}"
    log_msg "Starting production mode"
    
    if [ ! -d "$APP_DIR/dist" ]; then
        echo -e "${YELLOW}Warning: Production build 'sos-app/dist' is missing.${NC}"
        read -rp "Build frontend now? (y/n): " build_now
        if [[ "$build_now" =~ ^[Yy]$ ]]; then
            build_frontend
        else
            echo -e "${RED}Production boot cancelled.${NC}"
            return 1
        fi
    fi
    
    if check_port "3001"; then
        kill_port_process 3001 "SurvivalOS Server"
    fi
    
    echo -e "Launching server daemon on port 3001..."
    cd "$SERVER_DIR" || return
    NODE_ENV=production PORT=3001 node index.js > "$SERVER_LOG" 2>&1 &
    sleep 3
    
    if curl -s http://localhost:3001/api/health | grep -q '"ok":true'; then
        echo -e "${GREEN}✔ Production server started successfully on http://localhost:3001${NC}"
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open http://localhost:3001
        elif command -v open >/dev/null 2>&1; then
            open http://localhost:3001
        fi
    else
        echo -e "${RED}Production launch timed out or failed. Check logs.${NC}"
    fi
}

start_development() {
    echo -e "\n${CYAN}--- STARTING SURVIVALOS (DEVELOPMENT MODE) ---${NC}"
    log_msg "Starting development mode"
    
    if check_port "3001"; then kill_port_process 3001 "SurvivalOS Backend"; fi
    if check_port "3000"; then kill_port_process 3000 "Frontend Dev Server"; fi
    
    echo -e "Launching backend Node server on port 3001..."
    cd "$SERVER_DIR" || return
    NODE_ENV=development PORT=3001 node index.js > "$SERVER_LOG" 2>&1 &
    
    echo -e "Launching Vite dev server on port 3000..."
    cd "$APP_DIR" || return
    npm run dev > "$LOGS_DIR/sos-app-dev.log" 2>&1 &
    
    sleep 4
    if curl -s http://localhost:3001/api/health | grep -q '"ok":true'; then
        echo -e "${GREEN}✔ Backend running on port 3001, Frontend dev server running on port 3000${NC}"
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open http://localhost:3000
        elif command -v open >/dev/null 2>&1; then
            open http://localhost:3000
        fi
    else
        echo -e "${RED}Development launch timed out or failed. Check logs.${NC}"
    fi
}

build_frontend() {
    echo -e "\n${CYAN}--- BUILDING FRONTEND PRODUCTION ASSETS ---${NC}"
    log_msg "Building frontend production assets"
    cd "$APP_DIR" || return
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

cleanup_services() {
    echo -e "\n${YELLOW}Stopping launcher background services...${NC}"
    log_msg "Shutting down launcher background services"
    # Find PIDs on 3000/3001 and kill
    local p3000
    p3000=$(lsof -t -i:3000 2>/dev/null)
    if [ -n "$p3000" ]; then kill -9 "$p3000" 2>/dev/null; fi
    local p3001
    p3001=$(lsof -t -i:3001 2>/dev/null)
    if [ -n "$p3001" ]; then kill -9 "$p3001" 2>/dev/null; fi
}

# --- EXECUTION ---
if [[ "$1" == "--cli" ]]; then
    # Legacy CLI Loop
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
                cleanup_services
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
else
    # Default Web UI Bootstrapper Mode
    echo -e "${CYAN}==========================================================${NC}"
    echo -e "         SURVIVALOS WEB LAUNCHER BOOTSTRAPPER             "
    echo -e "${CYAN}==========================================================${NC}"
    log_msg "Starting Linux Web Launcher"

    if [ ! -d "$SERVER_DIR/node_modules" ]; then
        echo -e "${YELLOW}Installing backend server dependencies...${NC}"
        cd "$SERVER_DIR" || exit 1
        npm install
    fi

    if check_port "3001"; then
        echo -e "${GREEN}Launcher service already running on port 3001.${NC}"
    else
        echo -e "Starting server daemon on port 3001..."
        cd "$SERVER_DIR" || exit 1
        NODE_ENV=production PORT=3001 node index.js > "$SERVER_LOG" 2>&1 &
    fi

    sleep 3

    echo -e "${GREEN}Opening launcher control panel in your browser...${NC}"
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open http://localhost:3001/launcher
    elif command -v open >/dev/null 2>&1; then
        open http://localhost:3001/launcher
    fi

    echo -e "${CYAN}==========================================================${NC}"
    echo -e "${GREEN}       SURVIVALOS WEB LAUNCHER IS ONLINE & STREAMING      ${NC}"
    echo -e "${CYAN}==========================================================${NC}"
    echo -e "  Web Dashboard: http://localhost:3001/launcher"
    echo -e "  Server Log:    $SERVER_LOG"
    echo -e "${CYAN}==========================================================${NC}"
    echo -e "${YELLOW}  Press Ctrl+C to terminate services and exit.${NC}\n"

    # Trap exit to cleanup services
    trap cleanup_services EXIT

    # Tail logs
    tail -f "$SERVER_LOG"
fi
