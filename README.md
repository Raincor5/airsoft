# Airsoft Tactical Map

A real-time tactical map application for airsoft teams with location sharing, team management, and tactical markers.

## Features

- **Real-time Location Sharing**: See your teammates' positions and directions on the map
- **Session Management**: Create/join games using 6-character session codes
- **Team Organization**: Assign players to teams (Red/Blue by default)
- **Tactical Markers**: Place various pins on the map (enemy positions, objectives, hazards, etc.)
- **Quick Messages**: Send predefined tactical messages to your team
- **Compass Navigation**: See your heading direction with the built-in compass

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Expo CLI (`npm install -g expo-cli`)
- iOS/Android device or emulator
- Expo Go app on your mobile device

### Server Setup

1. Navigate to the server directory:
```bash
cd airsoft-server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:8080`

### Mobile App Setup

1. Navigate to the app directory:
```bash
cd AirsoftTacticalMap
```

2. Install dependencies:
```bash
npm install
```

3. Start the Expo development server:
```bash
npx expo start
```

4. Scan the QR code with Expo Go app on your phone

### Configuration

#### For Local Development

If running on a physical device, you'll need to update the WebSocket URL in `App.js`:

```javascript
// Replace localhost with your computer's IP address
const WS_URL = 'ws://YOUR_COMPUTER_IP:8080/ws';
```

To find your computer's IP:
- Mac: `ifconfig | grep inet`
- Windows: `ipconfig`
- Linux: `ip addr show`

#### For Production

Update the WebSocket URL to point to your production server:

```javascript
const WS_URL = 'wss://your-server-domain.com/ws';
```

## Usage

### Creating a Game Session

1. Launch the app
2. Wait for location permissions
3. Tap "Create Game Session"
4. Share the 6-character code with other players

### Joining a Game Session

1. Launch the app
2. Wait for location permissions
3. Tap "Join Game Session"
4. Enter the 6-character code
5. Tap "Join"

### Using the Map

- **Your position**: Blue dot with direction cone
- **Team members**: Colored dots based on team assignment
- **Add markers**: Tap anywhere on the map
- **Quick messages**: Use the message button in the control panel
- **Center on location**: Use the navigation button

### Team Management (Host Only)

1. Tap the team management button
2. Tap on players to assign them to teams
3. Players already in a team will be highlighted

## Troubleshooting

### Location Issues

- **iOS**: Make sure to allow location "While Using App"
- **Android**: Grant precise location permission
- Check that location services are enabled on your device

### Compass Not Working

- **iOS**: The app needs motion permissions. Go to Settings > Privacy > Motion & Fitness
- **Android**: Should work automatically with location permissions

### Connection Issues

- Verify the server is running
- Check that your device can reach the server (same network or proper port forwarding)
- Ensure the WebSocket URL is correct

### Ghost Players

This was a bug from the MockWebSocket - now fixed. If you see ghost players, restart the session.

## Known Limitations

- Session codes are case-insensitive 6-character codes
- Maximum recommended players per session: ~20-30 for optimal performance
- Location updates are sent every second
- Compass heading updates every 100ms

## Security Considerations

For production use:
- Use WSS (WebSocket Secure) instead of WS
- Implement authentication
- Add rate limiting
- Validate all inputs
- Consider using a proper database for session persistence

## Future Enhancements

- Voice chat integration
- Custom team colors
- Persistent sessions
- Game replay functionality
- Heat maps of player movement
- Integration with game scoring systems