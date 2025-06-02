import { WS_URL } from '../utils/constants';

// Game server connection management
class GameService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.callbacks = {};
    this.sessionId = null;
    this.playerData = null;
  }

  // Register callbacks for different event types
  registerCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    return this;
  }

  // Connect to the game server
  connect(sessionId, sessionName, playerData) {
    this.sessionId = sessionId;
    this.playerData = playerData;
    
    return new Promise((resolve, reject) => {
      try {
        console.log('Connecting to game server:', WS_URL);
        this.cleanup(); // Clean up existing connection if any
        
        this.ws = new WebSocket(WS_URL);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          
          // Send initial message (create or join session)
          const message = sessionName ? {
            type: 'create_session',
            sessionName,
            sessionId,
            player: playerData
          } : {
            type: 'join_session',
            sessionId,
            player: playerData
          };
          
          this.send(message);
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            if (this.callbacks.onError) {
              this.callbacks.onError('Invalid message format');
            }
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.callbacks.onConnectionError) {
            this.callbacks.onConnectionError(error);
          }
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          if (this.callbacks.onDisconnect) {
            this.callbacks.onDisconnect();
          }
          
          // Attempt to reconnect if session is active
          if (this.sessionId && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            this.reconnectTimeout = setTimeout(() => {
              this.connect(this.sessionId, null, this.playerData)
                .catch(err => console.error('Reconnection failed:', err));
            }, 2000);
          }
        };
        
      } catch (error) {
        console.error('WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  // Handle incoming messages
  handleMessage(data) {
    if (!data || !data.type) return;
    
    const handlerMap = {
      'session_created': () => this.callbacks.onSessionUpdate?.(data.session),
      'session_joined': () => this.callbacks.onSessionUpdate?.(data.session),
      'location_update': () => this.callbacks.onLocationUpdate?.(data.playerId, data.location),
      'pin_added': () => this.callbacks.onPinAdded?.(data.pin),
      'pin_removed': () => this.callbacks.onPinRemoved?.(data.pinId),
      'quick_message': () => this.callbacks.onMessageReceived?.(data),
      'team_assignment': () => this.callbacks.onTeamAssignment?.(data),
      'player_joined': () => this.callbacks.onPlayerJoined?.(data.player),
      'player_left': () => this.callbacks.onPlayerLeft?.(data.playerId),
      'player_updated': () => this.callbacks.onPlayerUpdated?.(data.player),
      'session_ended': () => {
        if (this.callbacks.onSessionEnded) {
          this.callbacks.onSessionEnded(data.message);
          this.sessionId = null; // Prevent reconnect attempts
        }
      },
      'error': () => this.callbacks.onError?.(data.message)
    };
    
    const handler = handlerMap[data.type];
    if (handler) handler();
  }

  // Send a message to the server
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  // Send location update
  updateLocation(playerId, location) {
    return this.send({
      type: 'location_update',
      playerId,
      location
    });
  }

  // Add a pin to the map
  addPin(pin) {
    return this.send({
      type: 'add_pin',
      pin
    });
  }

  // Remove a pin from the map
  removePin(pinId) {
    return this.send({
      type: 'remove_pin',
      pinId
    });
  }

  // Send a message to teammates
  sendMessage(senderId, senderName, message, teamOnly = true) {
    return this.send({
      type: 'quick_message',
      senderId,
      senderName,
      message,
      teamOnly
    });
  }

  // Assign player to a team (host only)
  assignTeam(playerId, teamId) {
    return this.send({
      type: 'assign_team',
      playerId,
      teamId
    });
  }

  // Update player data
  updatePlayer(playerId, updates) {
    return this.send({
      type: 'update_player',
      playerId,
      updates
    });
  }

  // Clean up WebSocket connection
  cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }
  }

  // Disconnect from the server
  disconnect() {
    this.sessionId = null; // Prevent reconnect attempts
    this.cleanup();
  }

  // Check if connected
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
const gameService = new GameService();
export default gameService;
