#!/bin/bash

# Airsoft Tactical Map Server with ngrok exposure and automatic QR generation
# This script starts the WebSocket server, exposes it via ngrok, and generates QR codes

echo "🚀 Starting Airsoft Tactical Map Server with ngrok and QR generation..."

# Kill any existing process on port 3001
echo "🔍 Checking for existing processes on port 3001..."
PID=$(lsof -ti :3001)
if [ ! -z "$PID" ]; then
    echo "⚠️  Killing existing process $PID on port 3001"
    kill $PID
    sleep 2
fi

# Start the server in background
echo "🌟 Starting WebSocket server..."
npm start &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to initialize..."
sleep 3

# Check if server started successfully
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Server running on port 3001"
echo "🔗 Starting ngrok tunnel..."

# Start ngrok in background
ngrok http 3001 > /dev/null 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
echo "⏳ Waiting for ngrok tunnel to establish..."
sleep 5

# Check if ngrok started successfully
if ! curl -s http://127.0.0.1:4040/api/tunnels > /dev/null 2>&1; then
    echo "❌ ngrok failed to start"
    echo "💡 Make sure you've added your authtoken: ngrok config add-authtoken YOUR_TOKEN"
    kill $SERVER_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo "✅ ngrok tunnel established!"
echo ""

# Get tunnel URL for display
TUNNEL_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    if tunnels:
        for tunnel in tunnels:
            if tunnel.get('proto') == 'https':
                print(tunnel.get('public_url', ''))
                break
        else:
            print(tunnels[0].get('public_url', ''))
except:
    pass
")

if [ ! -z "$TUNNEL_URL" ]; then
    echo "🌐 Public URL: $TUNNEL_URL"
    echo "📱 WebSocket: wss://$(echo $TUNNEL_URL | sed 's|https://||')"
    echo ""
fi

# Auto-generate QR codes
echo "📱 Auto-generating QR codes..."
./generate-qr.sh

echo ""
echo "🎯 READY FOR TACTICAL OPERATIONS!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Server Status: ONLINE"
echo "🔗 ngrok Tunnel: ACTIVE" 
echo "📱 QR Codes: GENERATED"
echo "🌐 Web Interface: http://127.0.0.1:4040"
echo ""
echo "📋 Next Steps:"
echo "   1. Share qr-server-config.png with team members"
echo "   2. Or tell them to scan the QR code above"
echo "   3. Team members: iOS app → SERVER-BASED → Scan QR"
echo ""
echo "Press Ctrl+C to stop server and tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Keep the script running and monitor
while true; do
    sleep 10
    
    # Check if server is still running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "❌ Server process died, restarting..."
        npm start &
        SERVER_PID=$!
        sleep 3
    fi
    
    # Check if ngrok is still running
    if ! kill -0 $NGROK_PID 2>/dev/null; then
        echo "❌ ngrok process died, restarting..."
        ngrok http 3001 > /dev/null 2>&1 &
        NGROK_PID=$!
        sleep 5
        # Regenerate QR codes with new URL
        ./generate-qr.sh
    fi
done

# Cleanup function (called on Ctrl+C)
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    kill $SERVER_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    echo "👋 Server and tunnel stopped"
    exit 0
}

# Set up cleanup on script exit
trap cleanup INT TERM 