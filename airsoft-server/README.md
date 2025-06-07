# 🎯 Airsoft Tactical Map Server

WebSocket server with ngrok integration and QR code generation for global tactical coordination.

## 🚀 Quick Start Commands

```bash
# 1. One-time setup: Add your ngrok authtoken
ngrok config add-authtoken YOUR_TOKEN_HERE

# 2. Start server with automatic QR generation (RECOMMENDED)
./start-with-ngrok-qr.sh

# 3. Generate QR codes anytime (when server is running)
./qr
```

## 📁 Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `start-with-ngrok-qr.sh` | Start server + ngrok + auto QR | `./start-with-ngrok-qr.sh` |
| `start-with-ngrok.sh` | Start server + ngrok (basic) | `./start-with-ngrok.sh` |
| `generate-qr.sh` | Generate QR codes for current tunnel | `./generate-qr.sh` |
| `qr` | Quick QR generation | `./qr` |

## 🎯 What You Get

✅ **Global WebSocket server** exposed via ngrok  
✅ **Automatic QR code generation** in terminal, PNG, and SVG formats  
✅ **Team sharing** - send `qr-server-config.png` to team members  
✅ **Auto-monitoring** - server and tunnel auto-restart if they crash  
✅ **iOS app integration** - scan QR codes to auto-configure devices  

## 📱 Team Member Setup

1. **Host runs:** `./start-with-ngrok-qr.sh`
2. **Host shares:** The generated `qr-server-config.png` file
3. **Team members:** 
   - Open iOS app → "SERVER-BASED" → "CONFIGURE SERVER" → "SCAN QR"
   - Scan the QR code → auto-configured!

## 🔧 Manual Configuration

If QR scanning doesn't work, team members can manually enter:
- **Server:** `your-ngrok-url.ngrok-free.app` (without https://)
- **Port:** `80`

## 📊 Monitoring

- **Server health:** http://localhost:3001/health
- **ngrok interface:** http://127.0.0.1:4040
- **Active sessions:** `https://your-ngrok-url.ngrok-free.app/api/sessions`

## 🛠 Troubleshooting

```bash
# Check what's running on port 3001
lsof -ti :3001

# Kill stuck processes
killall node

# Test local server
curl http://localhost:3001/health

# Test ngrok tunnel
curl http://127.0.0.1:4040/api/tunnels
```

## 🎮 Game Flow

1. **Host starts server:** `./start-with-ngrok-qr.sh`
2. **Host creates game session** in iOS app
3. **Host shares QR code** with team
4. **Team members scan QR** and join using session code
5. **Real-time tactical coordination** across any distance!

## 🔒 Security

- ngrok URLs are public but session codes provide access control
- Only players with valid session codes can join games
- Free tier: 2-hour sessions, 1GB/month data transfer

---

**Need help?** See `NGROK_SETUP.md` for detailed setup instructions. 