#!/bin/bash

echo "🚀 Starting osiPelican Electron App..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    # Kill all child processes
    pkill -P $$
    exit
}

# Trap ctrl-c and call cleanup
trap cleanup INT TERM

# Check if renderer dependencies are installed
if [ ! -d "renderer/node_modules" ]; then
    echo -e "${YELLOW}Installing renderer dependencies...${NC}"
    cd renderer && npm install && cd ..
fi

# Check if main dependencies are installed  
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing main dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}Starting Vite dev server...${NC}"
cd renderer && npm run dev &
VITE_PID=$!

# Wait for Vite to be ready
echo -e "${YELLOW}Waiting for Vite to start...${NC}"
while ! curl -s http://localhost:5173 > /dev/null; do
    sleep 1
done
echo -e "${GREEN}✓ Vite is ready!${NC}"

# Start Electron
echo -e "${GREEN}Starting Electron...${NC}"
cd .. && NODE_ENV=development electron . &
ELECTRON_PID=$!

echo -e "${GREEN}✓ App is running!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Wait for any process to exit
wait
