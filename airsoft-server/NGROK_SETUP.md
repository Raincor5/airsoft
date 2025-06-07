# 🌐 Ngrok Setup for Airsoft Tactical Map

This guide helps you expose your WebSocket server to the internet using ngrok's free tier.

## 🚀 Quick Start

### 1. Sign up for ngrok (Free)
1. Go to [ngrok.com/signup](https://ngrok.com/signup)
2. Sign up with email or GitHub
3. Verify your email

### 2. Get Your Auth Token
1. Go to [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
2. Copy your authtoken
3. Run: `ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE`

### 3. Start the Server with ngrok
```bash
cd /Users/raincor/dev/Airsoft\ Tactical\ Map\ Expo/airsoft/airsoft-server

# Option 1: Start with automatic QR generation (RECOMMENDED)
./start-with-ngrok-qr.sh

# Option 2: Basic start (manual QR generation)
./start-with-ngrok.sh
```

## 📱 Using the Public URL

When ngrok starts, you'll see something like:
```
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3001
```

### Configure iOS App:
1. Open your iOS app
2. Select "SERVER-BASED" mode
3. Tap "CONFIGURE SERVER"
4. Enter the ngrok URL **without https://** and **without the port**
   - ✅ Good: `abc123.ngrok-free.app`
   - ❌ Bad: `https://abc123.ngrok-free.app:3001`
5. Port: `80` (not 3001)
6. Test the connection

### Share with Team:
**Automatic QR Generation (when using start-with-ngrok-qr.sh):**
- QR codes are automatically generated and displayed in terminal
- PNG and SVG files are saved for easy sharing
- Just share the `qr-server-config.png` file

**Manual QR Generation:**
```bash
# Generate QR codes anytime (when ngrok is running)
./generate-qr.sh

# Quick command
./qr
```

**In iOS App:**
1. Generate QR code in server configuration  
2. Share the QR code with team members
3. They can scan it to auto-configure their devices

## 🔄 Free Tier Limitations

- **Session Length**: 2 hours max (then URL changes)
- **Concurrent Sessions**: 1 tunnel at a time
- **Bandwidth**: 1GB/month transfer limit

## 🎯 Tactical Usage Tips

### For Training/Events:
1. Start ngrok tunnel before the event
2. Share the QR code with all participants
3. Monitor the ngrok web interface at `http://127.0.0.1:4040`

### URL Management:
- The ngrok URL changes every time you restart
- Always regenerate and share new QR codes after restart
- Consider upgrading to ngrok Pro for static URLs

### Connection Testing:
- Use the "TEST" button in server configuration
- Check the health endpoint: `https://your-ngrok-url.ngrok-free.app/health`
- Monitor active sessions: `https://your-ngrok-url.ngrok-free.app/api/sessions`

## 🛠 Troubleshooting

### Common Issues:
1. **"Failed to connect"**: Check if ngrok tunnel is running
2. **"Invalid URL"**: Make sure you're using the ngrok domain without `https://`
3. **"Connection timeout"**: Check internet connection and firewall

### Debug Commands:
```bash
# Check if server is running
curl http://localhost:3001/health

# Check ngrok status
curl http://127.0.0.1:4040/api/tunnels

# Kill all node processes (if stuck)
killall node
```

## 🎮 Game Session Management

### Starting a Game:
1. Host creates session in iOS app
2. 6-character session code is generated
3. Players join using the same ngrok URL + session code

### Session Persistence:
- Sessions persist even if players disconnect temporarily
- Host can see all players and their status
- Messages and pins are synchronized across all devices

## 🔐 Security Notes

- ngrok URLs are public but session codes provide access control
- Only players with valid session codes can join games
- Consider team-based messaging for sensitive communications

---

**Need help?** Check the ngrok web interface at `http://127.0.0.1:4040` for tunnel status and logs. 