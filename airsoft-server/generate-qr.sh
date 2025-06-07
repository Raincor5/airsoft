#!/bin/bash

# Airsoft Tactical Map - QR Code Generator for ngrok tunnel
# This script generates QR codes for easy server configuration sharing

echo "🔍 Generating QR code for ngrok tunnel..."

# Check if ngrok is running by querying the API
NGROK_API="http://127.0.0.1:4040/api/tunnels"
if ! curl -s "$NGROK_API" > /dev/null 2>&1; then
    echo "❌ Error: ngrok is not running!"
    echo "💡 Start ngrok first with: ./start-with-ngrok.sh"
    exit 1
fi

# Get tunnel information from ngrok API
TUNNEL_INFO=$(curl -s "$NGROK_API" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    if not tunnels:
        print('ERROR: No active tunnels found')
        sys.exit(1)
    
    # Find HTTPS tunnel
    https_tunnel = None
    for tunnel in tunnels:
        if tunnel.get('proto') == 'https':
            https_tunnel = tunnel
            break
    
    if not https_tunnel:
        # Fallback to first tunnel
        https_tunnel = tunnels[0]
    
    public_url = https_tunnel.get('public_url', '')
    if public_url.startswith('https://'):
        # Remove https:// for our tactical server format
        domain = public_url[8:]
        print(f'tactical-server:{domain}:80')
    elif public_url.startswith('http://'):
        # Remove http:// for our tactical server format  
        domain = public_url[7:]
        print(f'tactical-server:{domain}:80')
    else:
        print('ERROR: Invalid tunnel URL format')
        sys.exit(1)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
")

# Check if we got valid tunnel info
if [[ $TUNNEL_INFO == ERROR:* ]]; then
    echo "❌ $TUNNEL_INFO"
    exit 1
fi

if [ -z "$TUNNEL_INFO" ]; then
    echo "❌ Error: Could not retrieve tunnel information"
    echo "💡 Make sure ngrok is running and try again"
    exit 1
fi

echo "📡 Tunnel configuration: $TUNNEL_INFO"

# Extract just the domain for display
DOMAIN=$(echo "$TUNNEL_INFO" | cut -d':' -f2)
echo "🌐 Public URL: https://$DOMAIN"

# Generate QR codes in different formats
echo ""
echo "📱 Generating QR codes..."

# 1. Terminal QR code (for quick viewing)
echo ""
echo "🖥️  TERMINAL QR CODE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
qrencode -t ANSIUTF8 "$TUNNEL_INFO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 2. PNG file (for sharing)
QR_FILE="qr-server-config.png"
qrencode -o "$QR_FILE" -s 8 -m 2 "$TUNNEL_INFO"
echo ""
echo "💾 Saved QR code image: $QR_FILE"

# 3. SVG file (for printing/scaling)
SVG_FILE="qr-server-config.svg"
qrencode -o "$SVG_FILE" -t SVG -s 8 -m 2 "$TUNNEL_INFO"
echo "🖼️  Saved QR code SVG: $SVG_FILE"

echo ""
echo "📋 SHARING INSTRUCTIONS:"
echo "   • Scan QR code with iOS app (Configure Server → Scan QR)"
echo "   • Or manually enter: $DOMAIN (port 80)"
echo "   • Share $QR_FILE with team members"
echo ""
echo "🎯 Team members can scan this QR code to instantly configure their devices!"

# Optional: Open the QR code image
read -p "🖼️  Open QR code image? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "$QR_FILE"
fi 