// WebSocket server URL
export const WS_URL = process.env.REACT_NATIVE_WS_URL || 'ws://192.168.1.99:8080/ws';

// Default map region (San Francisco)
export const DEFAULT_MAP_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Team colors
export const TEAM_COLORS = {
  team_red: {
    id: 'team_red',
    name: 'RED',
    color: '#FF4444',
  },
  team_blue: {
    id: 'team_blue',
    name: 'BLUE',
    color: '#4444FF',
  },
  team_green: {
    id: 'team_green',
    name: 'GREEN',
    color: '#44FF44',
  },
  team_yellow: {
    id: 'team_yellow',
    name: 'YELLOW',
    color: '#FFFF44',
  }
};

// Player colors
export const PLAYER_COLORS = [
  '#007AFF', 
  '#FF3B30', 
  '#34C759', 
  '#FF9500', 
  '#AF52DE', 
  '#FF2D55', 
  '#5856D6', 
  '#00C7BE', 
  '#FF6482', 
  '#FFB340'
];

// Pin types for airsoft games
export const PIN_TYPES = [
  { id: 'enemy', name: 'Enemy Spotted', color: '#FF4444' },
  { id: 'trap', name: 'Trap/Hazard', color: '#FF8800' },
  { id: 'suspect', name: 'Suspicious Area', color: '#FFAA00' },
  { id: 'flag', name: 'Objective/Flag', color: '#00AA00' },
  { id: 'cover', name: 'Good Cover', color: '#0066AA' },
  { id: 'sniper', name: 'Sniper Position', color: '#AA0066' }
];

// Quick messages
export const QUICK_MESSAGES = [
  { id: 'help', text: 'Need Help!', color: '#FF4444' },
  { id: 'danger', text: 'Danger!', color: '#FF8800' },
  { id: 'retreating', text: 'Retreating', color: '#FFAA00' },
  { id: 'advancing', text: 'Advancing', color: '#00AA00' },
  { id: 'clear', text: 'Area Clear', color: '#0066AA' },
  { id: 'contact', text: 'Enemy Contact', color: '#AA0066' }
];

// App configuration
export const APP_CONFIG = {
  messageTimeout: 5000, // Time in ms to display player messages
  locationUpdateInterval: 1000, // Time in ms between location updates
  reconnectAttempts: 5, // Number of reconnect attempts
  reconnectInterval: 2000, // Time in ms between reconnect attempts
};