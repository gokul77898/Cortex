#!/usr/bin/env bash
# CORTEX Global Installer
# Run via: curl -fsSL https://raw.githubusercontent.com/gokul77898/Cortex/main/install.sh | bash

set -e

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e ""
echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}  ║  ${WHITE}CORTEX${CYAN} — Autonomous AGI Terminal                  ║${NC}"
echo -e "${CYAN}${BOLD}  ║  ${NC}Any LLM · One command · Open source                  ${CYAN}║${NC}"
echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════════════════════╝${NC}"
echo -e ""

echo -e "🚀 Starting CORTEX installation..."

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}✗ Node.js is not installed.${NC}"
    echo -e "Please install Node.js (v18 or higher) from https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}✗ npm is not installed.${NC}"
    echo -e "Please install npm to continue."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
echo -e "${GREEN}✓ Found Node.js v${NODE_VERSION}${NC}"

echo -e "\n📦 Installing @gokulvenkatareddy/cortex globally via npm..."

# Run npm install globally
if npm install -g @gokulvenkatareddy/cortex --loglevel=error; then
    echo -e "\n${GREEN}${BOLD}🎉 CORTEX installed successfully!${NC}\n"
    
    echo -e "To get started, simply run:"
    echo -e "${CYAN}${BOLD}  cortex${NC}\n"
    
    echo -e "The setup wizard will guide you to configure your API keys (NVIDIA, OpenAI, etc.)."
    echo -e "Your configuration will be safely stored locally in ~/.cortex/.env\n"
else
    echo -e "\n${RED}✗ Installation failed.${NC}"
    echo -e "You might need administrator/root permissions to install global npm packages."
    echo -e "Try running: ${BOLD}sudo npm install -g @gokulvenkatareddy/cortex${NC}"
    exit 1
fi
