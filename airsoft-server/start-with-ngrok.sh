#!/bin/bash

# Airsoft Tactical Map - Start Server with ngrok
# This script starts the WebSocket server and creates an ngrok tunnel for external access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default port
PORT=${PORT:-3001}

echo -e "${BLUE}🚀 Starting Airsoft Tactical Map Server with ngrok...${NC}"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok is not installed!${NC}"
    echo -e "${YELLOW}Please install ngrok:${NC}"
    echo "  1. Go to https://ngrok.com/download"
    echo "  2. Download and install ngrok for macOS"
    echo "  3. Sign up for a free account and get your auth token"
    echo "  4. Run: ngrok config add-authtoken YOUR_TOKEN"
    exit 1
fi

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the WebSocket server in the background
echo -e "${GREEN}🌐 Starting WebSocket server on port $PORT...${NC}"
node server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Start ngrok tunnel
echo -e "${GREEN}🔗 Creating ngrok tunnel...${NC}"
ngrok http $PORT --log stdout &
NGROK_PID=$!

# Wait for ngrok to initialize and get the public URL
sleep 5

# Get the ngrok tunnel URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep https | head -1 | cut -d'"' -f4)

if [ ! -z "$NGROK_URL" ]; then
    # Convert HTTP URL to WebSocket URL
    WS_URL=$(echo $NGROK_URL | sed 's/https:/wss:/')
    
    echo -e "\n${GREEN}✅ Server is running with ngrok tunnel!${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo -e "${YELLOW}📱 Use these URLs in your iOS app:${NC}"
    echo -e "  WebSocket: ${GREEN}$WS_URL${NC}"
    echo -e "  REST API:  ${GREEN}$NGROK_URL/api${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo -e "${YELLOW}🔧 Local access:${NC}"
    echo -e "  WebSocket: ws://localhost:$PORT"
    echo -e "  REST API:  http://localhost:$PORT/api"
    echo -e "  ngrok UI:  http://localhost:4040"
    echo -e "${BLUE}======================================${NC}"
    
    # Save the WebSocket URL to a file for easy access
    echo "$WS_URL" > ngrok-websocket-url.txt
    echo -e "${GREEN}💾 WebSocket URL saved to ngrok-websocket-url.txt${NC}"
    
else
    echo -e "${RED}❌ Failed to get ngrok tunnel URL${NC}"
    echo -e "${YELLOW}Check ngrok status at: http://localhost:4040${NC}"
fi

echo -e "\n${YELLOW}Press Ctrl+C to stop both server and ngrok${NC}"

# Wait for processes
wait $SERVER_PID $NGROK_PID 