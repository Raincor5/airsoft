// server.js - Fixed WebSocket Server for Airsoft Tactical Map
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Enhanced Connection Manager with better state tracking
class ConnectionManager {
  constructor() {
    this.connections = new Map(); // connectionId -> connection object
    this.sessionConnections = new Map(); // sessionId -> Set of connectionIds
    this.playerConnections = new Map(); // playerId -> connectionId
  }

  addConnection(connectionId, ws, playerId = null, sessionId = null) {
    const connection = {
      id: connectionId,
      ws: ws,
      playerId: playerId,
      sessionId: sessionId,
      isAlive: true,
      lastSeen: Date.now(),
      lastHeartbeat: Date.now(),
      messageQueue: [],
      missedHeartbeats: 0,
      reconnectAttempts: 0,
      state: 'active' // active, background, disconnected
    };

    this.connections.set(connectionId, connection);
    
    if (sessionId) {
      if (!this.sessionConnections.has(sessionId)) {
        this.sessionConnections.set(sessionId, new Set());
      }
      this.sessionConnections.get(sessionId).add(connectionId);
    }
    
    if (playerId) {
      // Handle reconnection - clean up old connection for this player
      const oldConnectionId = this.playerConnections.get(playerId);
      if (oldConnectionId && oldConnectionId !== connectionId) {
        this.removeConnection(oldConnectionId);
      }
      this.playerConnections.set(playerId, connectionId);
    }
    
    console.log(`➕ Connection added: ${connectionId} (player: ${playerId}, session: ${sessionId})`);
    return connection;
  }

  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Remove from session connections
    if (connection.sessionId) {
      const sessionConnections = this.sessionConnections.get(connection.sessionId);
      if (sessionConnections) {
        sessionConnections.delete(connectionId);
        if (sessionConnections.size === 0) {
          this.sessionConnections.delete(connection.sessionId);
        }
      }
    }

    // Remove from player connections
    if (connection.playerId) {
      this.playerConnections.delete(connection.playerId);
    }

    this.connections.delete(connectionId);
    console.log(`➖ Connection removed: ${connectionId}`);
    return true;
  }

  updateConnection(connectionId, updates) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    console.log(`🔧 Updating connection ${connectionId}: ${JSON.stringify(updates)}`);

    // Handle session changes
    if (updates.sessionId && updates.sessionId !== connection.sessionId) {
      // Remove from old session
      if (connection.sessionId) {
        const oldSessionConnections = this.sessionConnections.get(connection.sessionId);
        if (oldSessionConnections) {
          oldSessionConnections.delete(connectionId);
        }
      }

      // Add to new session
      if (!this.sessionConnections.has(updates.sessionId)) {
        this.sessionConnections.set(updates.sessionId, new Set());
      }
      this.sessionConnections.get(updates.sessionId).add(connectionId);
    }

    // Handle player changes
    if (updates.playerId !== undefined && updates.playerId !== connection.playerId) {
      // Remove old player mapping if it exists
      if (connection.playerId) {
        this.playerConnections.delete(connection.playerId);
        console.log(`🔧 Removed old player mapping: ${connection.playerId}`);
      }
      
      // Add new player mapping
      if (updates.playerId) {
        this.playerConnections.set(updates.playerId, connectionId);
        console.log(`🔧 Added new player mapping: ${updates.playerId} -> ${connectionId}`);
      }
    }

    Object.assign(connection, updates);
    console.log(`✅ Connection ${connectionId} updated. PlayerId: ${connection.playerId}, SessionId: ${connection.sessionId}`);
    return true;
  }

  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  getConnectionByPlayer(playerId) {
    const connectionId = this.playerConnections.get(playerId);
    return connectionId ? this.connections.get(connectionId) : null;
  }

  getSessionConnections(sessionId) {
    const sessionConnections = [];
    for (const [connectionId, connection] of this.connections) {
      if (connection.sessionId === sessionId && this.isConnectionUsable(connection)) {
        sessionConnections.push({
          id: connectionId,
          playerId: connection.playerId,
          ws: connection.ws
        });
      }
    }
    return sessionConnections;
  }

  isConnectionOpen(connection) {
    return connection.ws.readyState === 1; // WebSocket.OPEN
  }

  isConnectionConnecting(connection) {
    return connection.ws.readyState === 0; // WebSocket.CONNECTING
  }

  isConnectionUsable(connection) {
    return this.isConnectionOpen(connection) || this.isConnectionConnecting(connection);
  }

  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    try {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
        connection.lastSeen = Date.now();
        return true;
      } else if (connection.state === 'background') {
        // Queue message for background connections
        connection.messageQueue.push(message);
        console.log(`📮 Queued message for background connection: ${connectionId}`);
        return true;
      }
    } catch (error) {
      console.error(`Error sending to connection ${connectionId}:`, error);
    }
    return false;
  }

  sendToPlayer(playerId, message) {
    const connectionId = this.playerConnections.get(playerId);
    return connectionId ? this.sendToConnection(connectionId, message) : false;
  }

  broadcastToSession(sessionId, message, excludeConnectionId = null) {
    const connections = this.getSessionConnections(sessionId);
    
    console.log(`🔍 Broadcasting to session ${sessionId}: found ${connections.length} total connections, excluding ${excludeConnectionId}`);
    
    let sentCount = 0;
    connections.forEach(conn => {
      console.log(`  - Connection ${conn.id} (player: ${conn.playerId})`);
      if (conn.id === excludeConnectionId) {
        console.log(`    ⏭️ Excluded sender ${conn.id}`);
        return;
      }
      
      if (this.sendToConnection(conn.id, message)) {
        console.log(`    ✅ Sent to ${conn.id}`);
        sentCount++;
      } else {
        console.log(`    ❌ Failed to send to ${conn.id}`);
      }
    });
    
    console.log(`📡 Broadcast to session ${sessionId}: ${sentCount} recipients`);
    return sentCount;
  }

  broadcastToTeam(sessionId, teamId, message, excludeConnectionId = null) {
    const session = sessionManager.getSession(sessionId);
    if (!session) return 0;

    const connections = this.getSessionConnections(sessionId);
    let sentCount = 0;

    connections.forEach(conn => {
      if (conn.id === excludeConnectionId) return;
      
      const player = session.players.get(conn.playerId);
      if (player && player.teamId === teamId) {
        if (this.sendToConnection(conn.id, message)) {
          sentCount++;
        }
      }
    });
    
    console.log(`📡 Team broadcast to ${teamId} in session ${sessionId}: ${sentCount} recipients`);
    return sentCount;
  }

  // Flush queued messages when connection comes back from background
  flushMessageQueue(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.messageQueue.length === 0) return;

    console.log(`📬 Flushing ${connection.messageQueue.length} queued messages for ${connectionId}`);
    const messages = [...connection.messageQueue];
    connection.messageQueue = [];

    messages.forEach(message => {
      this.sendToConnection(connectionId, message);
    });
  }

  cleanup() {
    const now = Date.now();
    const staleTimeout = 1800000; // 30 minutes (much more forgiving)
    
    for (const [connectionId, connection] of this.connections) {
      // Only clean up if connection is truly stale and not just in background
      if (connection.state !== 'background' && 
          !connection.isAlive && 
          (now - connection.lastSeen) > staleTimeout) {
        console.log(`🧹 Cleaning up stale connection: ${connectionId} (last seen ${Math.round((now - connection.lastSeen) / 1000)}s ago)`);
        this.removeConnection(connectionId);
      }
    }
  }
}

// Enhanced GameSession with comprehensive sync data
class GameSession {
  constructor(id, hostPlayerId, code) {
    this.id = id;
    this.hostPlayerId = hostPlayerId;
    this.code = code.toUpperCase();
    this.name = `Game ${this.code}`;
    this.players = new Map(); // playerId -> Player
    this.pins = new Map(); // pinId -> Pin
    this.messages = []; // Array of messages
    this.teams = new Map(); // teamId -> team object
    this.createdAt = new Date();
    this.lastActivity = Date.now();
    
    // Real-time sync data
    this.syncData = {
      playerPositions: new Map(), // playerId -> {lat, lng, heading, timestamp}
      playerStates: new Map(),    // playerId -> {health, ammo, status, etc}
      gameState: 'waiting',       // waiting, active, paused, ended
      objectives: new Map(),      // objectiveId -> objective
      events: []                  // Array of game events
    };

    // Initialize default teams
    this.teams.set('red', { 
      id: 'red', 
      name: 'Red Team', 
      color: '#FF0000', 
      players: new Set(),
      objectives: new Set()
    });
    this.teams.set('blue', { 
      id: 'blue', 
      name: 'Blue Team', 
      color: '#0000FF', 
      players: new Set(),
      objectives: new Set()
    });
  }
  
  addPlayer(player) {
    this.players.set(player.id, player);
    this.lastActivity = Date.now();
    
    // Initialize sync data for player
    this.syncData.playerPositions.set(player.id, {
      latitude: null,
      longitude: null,
      heading: null,
      timestamp: null
    });
    this.syncData.playerStates.set(player.id, {
      isActive: true,
      lastSeen: Date.now(),
      health: 100,
      ammo: 100,
      status: 'active'
    });
    
    console.log(`👤 Player ${player.name} added to session ${this.code}`);
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      this.syncData.playerPositions.delete(playerId);
      this.syncData.playerStates.delete(playerId);
      
      // Remove from team
      if (player.teamId && this.teams.has(player.teamId)) {
        this.teams.get(player.teamId).players.delete(playerId);
      }
      
      this.lastActivity = Date.now();
      console.log(`👤 Player ${player.name} removed from session ${this.code}`);
      return player;
    }
    return null;
  }

  updatePlayerLocation(playerId, location) {
    const player = this.players.get(playerId);
    if (player && this.isValidLocation(location)) {
      // Update player location
      player.location = {
        ...location,
        timestamp: new Date().toISOString()
      };
      
      // Update sync data with comprehensive location info
      this.syncData.playerPositions.set(playerId, {
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading || null,
        altitude: location.altitude || null,
        accuracy: location.accuracy || null,
        speed: location.speed || null,
        timestamp: location.timestamp || new Date().toISOString()
      });
      
      // Update player state
      const playerState = this.syncData.playerStates.get(playerId);
      if (playerState) {
        playerState.lastSeen = Date.now();
        playerState.isActive = true;
      }
      
      this.lastActivity = Date.now();
      return true;
    }
    return false;
  }

  assignPlayerToTeam(playerId, teamId) {
    const player = this.players.get(playerId);
    if (player && this.teams.has(teamId)) {
      // Remove from old team
      if (player.teamId && this.teams.has(player.teamId)) {
        this.teams.get(player.teamId).players.delete(playerId);
      }
      
      // Add to new team
      player.teamId = teamId;
      this.teams.get(teamId).players.add(playerId);
      
      this.lastActivity = Date.now();
      return true;
    }
    return false;
  }
  
  addPin(pin) {
    this.pins.set(pin.id, pin);
    this.lastActivity = Date.now();
  }
  
  removePin(pinId) {
    this.lastActivity = Date.now();
    return this.pins.delete(pinId);
  }
  
  addMessage(message) {
    this.messages.push(message);
    this.lastActivity = Date.now();
    
    // Keep only last 100 messages
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
  }
  
  isValidLocation(location) {
    return location && 
           typeof location.latitude === 'number' &&
           typeof location.longitude === 'number' &&
           Math.abs(location.latitude) <= 90 &&
           Math.abs(location.longitude) <= 180;
  }

  getTeamData(teamId) {
    const team = this.teams.get(teamId);
    if (!team) return null;

    const teamPlayers = Array.from(team.players).map(playerId => {
      const player = this.players.get(playerId);
      const position = this.syncData.playerPositions.get(playerId);
      const state = this.syncData.playerStates.get(playerId);
      
      return {
        ...player,
        position,
        state
      };
    });

    return {
      ...team,
      players: teamPlayers
    };
  }

  getFullSyncData() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      hostPlayerId: this.hostPlayerId,
      gameState: this.syncData.gameState,
      teams: Array.from(this.teams.values()),
      players: Array.from(this.players.values()),
      pins: Array.from(this.pins.values()),
      messages: this.messages,
      playerPositions: Object.fromEntries(this.syncData.playerPositions),
      playerStates: Object.fromEntries(this.syncData.playerStates),
      objectives: Object.fromEntries(this.syncData.objectives),
      events: this.syncData.events,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }

  getSessionData() {
    return this.getFullSyncData();
  }
}

// Session Manager
class SessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> GameSession
    this.sessionCodes = new Map(); // code -> sessionId
  }
  
  createSession(hostPlayerId) {
    const sessionId = uuidv4();
    const code = this.generateSessionCode();
    const session = new GameSession(sessionId, hostPlayerId, code);
    
    this.sessions.set(sessionId, session);
    this.sessionCodes.set(code, sessionId);
    
    console.log(`🎮 Session created: ${code} (${sessionId})`);
    return session;
  }
  
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
  
  getSessionByCode(code) {
    const sessionId = this.sessionCodes.get(code.toUpperCase());
    return sessionId ? this.sessions.get(sessionId) : null;
  }
  
  removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.sessionCodes.delete(session.code);
      console.log(`🗑️ Session removed: ${session.code} (${sessionId})`);
      return true;
    }
    return false;
  }
  
  generateSessionCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.sessionCodes.has(code));
    return code;
  }
  
  cleanup() {
    const now = Date.now();
    const staleTimeout = 7200000; // 2 hours (more forgiving)
    
    for (const [sessionId, session] of this.sessions) {
      if ((now - session.lastActivity) > staleTimeout || session.players.size === 0) {
        console.log(`🧹 Cleaning up inactive session: ${session.code}`);
        this.removeSession(sessionId);
      }
    }
  }
}

// Initialize managers
const connectionManager = new ConnectionManager();
const sessionManager = new SessionManager();

// WebSocket Server with enhanced configuration
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false,
  maxPayload: 1024 * 1024, // 1MB max message size
  clientTracking: true,
  handleProtocols: (protocols, request) => {
    // Support various protocols for better compatibility
    return protocols.includes('airsoft-tactical') ? 'airsoft-tactical' : protocols[0];
  }
});

wss.on('connection', (ws, req) => {
  const connectionId = uuidv4();
  connectionManager.addConnection(connectionId, ws);
  
  console.log(`🔌 New WebSocket connection: ${connectionId}`);

  // Enhanced heartbeat system - much more forgiving for mobile
  const heartbeatInterval = setInterval(() => {
    const connection = connectionManager.getConnection(connectionId);
    if (!connection) {
      clearInterval(heartbeatInterval);
      return;
    }
    
    // Be very forgiving with background apps - iOS can suspend connections
    const maxMissedHeartbeats = connection.state === 'background' ? 10 : 8;
    
    if (!connection.isAlive && connection.missedHeartbeats >= maxMissedHeartbeats) {
      console.log(`💔 Connection timeout after ${connection.missedHeartbeats} missed heartbeats: ${connectionId}`);
      ws.terminate();
      return;
    }
    
    if (!connection.isAlive) {
      connection.missedHeartbeats = (connection.missedHeartbeats || 0) + 1;
      console.log(`⚠️ Missed heartbeat ${connection.missedHeartbeats}/${maxMissedHeartbeats} for connection: ${connectionId}`);
    } else {
      connection.missedHeartbeats = 0;
    }
    
    connection.isAlive = false;
    connection.lastHeartbeat = Date.now();
    
    // Send heartbeat with current timestamp
    try {
      ws.ping(JSON.stringify({ timestamp: Date.now(), connectionId }));
    } catch (error) {
      console.error(`Error sending ping to ${connectionId}:`, error);
    }
  }, 45000); // Increased to 45 seconds for mobile compatibility
  
  ws.on('pong', (data) => {
    const connection = connectionManager.getConnection(connectionId);
    if (connection) {
      connection.isAlive = true;
      connection.lastSeen = Date.now();
      connection.missedHeartbeats = 0;
      
      // If coming back from background, flush queued messages
      if (connection.state === 'background') {
        connection.state = 'active';
        connectionManager.flushMessageQueue(connectionId);
      }
    }
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Update connection activity
      const connection = connectionManager.getConnection(connectionId);
      if (connection) {
        connection.lastSeen = Date.now();
        connection.isAlive = true;
      }
      
      handleMessage(connectionId, data);
    } catch (error) {
      console.error(`Invalid JSON from ${connectionId}:`, error);
      connectionManager.sendToConnection(connectionId, {
        type: 'error', 
        message: 'Invalid JSON format'
      });
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed: ${connectionId} (${code})`);
    clearInterval(heartbeatInterval);
    
    const connection = connectionManager.getConnection(connectionId);
    if (connection && connection.playerId && connection.sessionId) {
      // Remove player from session
      const session = sessionManager.getSession(connection.sessionId);
      if (session) {
        const player = session.players.get(connection.playerId);
        session.removePlayer(connection.playerId);
        
        // Notify other players
        connectionManager.broadcastToSession(connection.sessionId, {
          type: 'playerLeft',
          playerId: connection.playerId,
          playerName: player?.name || 'Unknown',
          timestamp: new Date().toISOString()
        }, connectionId);
        
        // Clean up empty session
        if (session.players.size === 0) {
          sessionManager.removeSession(connection.sessionId);
        }
      }
    }
    
    connectionManager.removeConnection(connectionId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error on ${connectionId}:`, error);
  });
});

// Enhanced Message Handlers
function handleMessage(connectionId, data) {
  // Skip ping messages from cluttering the logs
  if (data.type !== 'ping') {
    console.log(`📨 Raw message from ${connectionId}:`, JSON.stringify(data, null, 2));
    console.log(`📨 Received ${data.type} from ${connectionId}`);
  }
  
  const { type } = data;
  
  switch (type) {
    case 'createSession':
      handleCreateSession(connectionId, data);
      break;
    case 'joinSession':
      handleJoinSession(connectionId, data);
      break;
    case 'leaveSession':
      handleLeaveSession(connectionId, data);
      break;
    case 'locationUpdate':
      handleLocationUpdate(connectionId, data);
      break;
    case 'addPin':
      handleAddPin(connectionId, data);
      break;
    case 'removePin':
      handleRemovePin(connectionId, data);
      break;
    case 'sendMessage':
      handleSendMessage(connectionId, data);
      break;
    case 'assignTeam':
      handleAssignTeam(connectionId, data);
      break;
    case 'syncRequest':
      handleSyncRequest(connectionId, data);
      break;
    case 'appStateChange':
      handleAppStateChange(connectionId, data);
      break;
    case 'ping':
      connectionManager.sendToConnection(connectionId, {
        type: 'pong',
        timestamp: Date.now()
      });
      break;
    default:
      console.log(`⚠️ Unknown message type: ${type}`);
  }
}

function handleCreateSession(connectionId, data) {
  const { playerId, playerName } = data;
  
  if (!playerId || !playerName) {
    connectionManager.sendToConnection(connectionId, {
      type: 'error',
      message: 'Player ID and name are required'
    });
    return;
  }

  const session = sessionManager.createSession(playerId);
  
  // Create host player
  const hostPlayer = {
    id: playerId,
    name: playerName,
    isHost: true,
    teamId: null,
    location: null,
    joinedAt: new Date().toISOString()
  };

  session.addPlayer(hostPlayer);
  
  // Update connection
  connectionManager.updateConnection(connectionId, {
    playerId: playerId,
    sessionId: session.id
  });

  // Send success response with full session data
  connectionManager.sendToConnection(connectionId, {
    type: 'sessionCreated',
    sessionCode: session.code,
    session: session.getFullSyncData(),
    playerId: playerId
  });
  
  console.log(`🎯 Session ${session.code} created by ${playerName}`);
}

function handleJoinSession(connectionId, data) {
  const { sessionCode, playerId, playerName } = data;
  
  if (!sessionCode || !playerId || !playerName) {
    connectionManager.sendToConnection(connectionId, {
      type: 'error',
      message: 'Session code, player ID, and name are required'
    });
    return;
  }

  const session = sessionManager.getSessionByCode(sessionCode);
  if (!session) {
    connectionManager.sendToConnection(connectionId, {
      type: 'error',
      message: 'Session not found'
    });
    return;
  }

  // Check if player is reconnecting
  const existingPlayer = session.players.get(playerId);
  const isReconnection = !!existingPlayer;
  
  let player;
  if (isReconnection) {
    player = existingPlayer;
    console.log(`🔄 Player ${playerName} reconnecting to session ${sessionCode}`);
  } else {
    player = {
      id: playerId,
      name: playerName,
      teamId: null,
      location: null,
      isHost: false,
      joinedAt: new Date().toISOString()
    };
    session.addPlayer(player);
    console.log(`➕ New player ${playerName} joining session ${sessionCode}`);
  }

  // Update connection mapping BEFORE broadcasting (critical for proper recipient lookup)
  connectionManager.updateConnection(connectionId, {
    playerId: playerId,
    sessionId: session.id
  });

  // Send confirmation with session state
  connectionManager.sendToConnection(connectionId, {
    type: 'sessionJoined',
    sessionCode: sessionCode,
    session: session.getFullSyncData(),
    playerId: playerId,
    isReconnection: isReconnection
  });

  // CRITICAL FIX: Notify all existing players about the new/reconnected player
  const playerJoinedMessage = {
    type: isReconnection ? 'playerReconnected' : 'playerJoined',
    player: {
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      isHost: player.isHost,
      location: player.location // Include location if available
    },
    timestamp: new Date().toISOString()
  };
  
  // Broadcast to all OTHER players in session
  const broadcastCount = connectionManager.broadcastToSession(session.id, playerJoinedMessage, connectionId);
  console.log(`📢 ${isReconnection ? 'Reconnection' : 'Join'} notification sent to ${broadcastCount} other players`);
  
  // ADDITIONAL FIX: If the new player has a location, send a location update immediately
  if (player.location) {
    const locationMessage = {
      type: 'locationUpdate',
      playerId: player.id,
      playerName: player.name,
      location: player.location,
      teamId: player.teamId
    };
    connectionManager.broadcastToSession(session.id, locationMessage, connectionId);
  }
  
  console.log(`🎯 Player ${playerName} ${isReconnection ? 'reconnected to' : 'joined'} session ${sessionCode}`);
}

function handleLeaveSession(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId || !connection.playerId) return;

  const session = sessionManager.getSession(connection.sessionId);
  if (!session) return;
  
  // Remove player
  const player = session.removePlayer(connection.playerId);
  
  // Notify others
  connectionManager.broadcastToSession(connection.sessionId, {
    type: 'playerLeft',
    playerId: connection.playerId,
    playerName: player?.name || 'Unknown',
    timestamp: new Date().toISOString()
  }, connectionId);
      
  // Clean up empty session
  if (session.players.size === 0) {
    sessionManager.removeSession(connection.sessionId);
  }
  
  // Update connection
  connectionManager.updateConnection(connectionId, {
    playerId: null,
    sessionId: null
  });

  // Confirm to player
  connectionManager.sendToConnection(connectionId, {
    type: 'sessionLeft',
    timestamp: new Date().toISOString()
  });
}

function handleLocationUpdate(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId || !connection.playerId) return;
  
  const session = sessionManager.getSession(connection.sessionId);
  if (!session) return;
  
  const { location } = data;
  if (session.updatePlayerLocation(connection.playerId, location)) {
    // Get player's team for team-specific broadcasting
    const player = session.players.get(connection.playerId);
    
    // Broadcast comprehensive location data to other players in session
    const locationMessage = {
      type: 'locationUpdate',
      playerId: connection.playerId,
      playerName: player?.name || 'Unknown',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading || null,
        altitude: location.altitude || null,
        accuracy: location.accuracy || null,
        speed: location.speed || null,
        timestamp: location.timestamp || new Date().toISOString()
      },
      teamId: player?.teamId || null
    };
    
    connectionManager.broadcastToSession(connection.sessionId, locationMessage, connectionId);
    
    console.log(`📍 Location update: ${connection.playerId} -> (${location.latitude}, ${location.longitude}) heading: ${location.heading}`);
  }
}

function handleAddPin(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId) return;
    
  const session = sessionManager.getSession(connection.sessionId);
  if (!session) return;
  
  const { pin } = data;
  const newPin = {
    id: pin.id || uuidv4(),
    type: pin.type,
    name: pin.name,
    coordinate: pin.coordinate,
    playerId: connection.playerId,
    teamId: pin.teamId || null,
    timestamp: new Date().toISOString()
  };
  
  session.addPin(newPin);
  
  // Broadcast to appropriate audience
  const message = {
    type: 'pinAdded',
    pin: newPin
  };
  
  if (newPin.teamId) {
    connectionManager.broadcastToTeam(connection.sessionId, newPin.teamId, message);
  } else {
    connectionManager.broadcastToSession(connection.sessionId, message);
  }
}

function handleRemovePin(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId) return;
    
  const session = sessionManager.getSession(connection.sessionId);
  if (!session) return;
  
  const { pinId } = data;
  if (session.removePin(pinId)) {
    connectionManager.broadcastToSession(connection.sessionId, {
      type: 'pinRemoved',
      pinId: pinId,
      timestamp: new Date().toISOString()
    });
  }
}

function handleSendMessage(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId) return;
    
  const session = sessionManager.getSession(connection.sessionId);
  if (!session) return;
  
  const player = session.players.get(connection.playerId);
  if (!player) return;
  
  const { message } = data;
  const newMessage = {
    id: uuidv4(),
    text: message.text,
    playerId: connection.playerId,
    playerName: player.name,
    teamId: message.teamId || null,
    timestamp: new Date().toISOString()
  };
  
  session.addMessage(newMessage);
  
  // Broadcast to appropriate audience
  const broadcastMessage = {
    type: 'messageReceived',
    message: newMessage
  };
  
  if (newMessage.teamId) {
    connectionManager.broadcastToTeam(connection.sessionId, newMessage.teamId, broadcastMessage);
  } else {
    connectionManager.broadcastToSession(connection.sessionId, broadcastMessage);
  }
}

function handleAssignTeam(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId) return;
    
  const session = sessionManager.getSession(connection.sessionId);
  if (!session || session.hostPlayerId !== connection.playerId) return;
  
  const { playerId, teamId } = data;
  if (session.assignPlayerToTeam(playerId, teamId)) {
    const player = session.players.get(playerId);
    
    connectionManager.broadcastToSession(connection.sessionId, {
      type: 'teamAssigned',
      playerId: playerId,
      playerName: player?.name || 'Unknown',
      teamId: teamId,
      timestamp: new Date().toISOString()
    });
  }
}

function handleSyncRequest(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId) return;
    
  const session = sessionManager.getSession(connection.sessionId);
  if (!session) return;
  
  // Send full sync data
  connectionManager.sendToConnection(connectionId, {
    type: 'fullSync',
    session: session.getFullSyncData(),
    timestamp: new Date().toISOString()
  });
}

function handleAppStateChange(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection) return;
  
  const { state } = data; // 'active', 'background', 'inactive'
  
  console.log(`📱 App state change for ${connectionId}: ${connection.state} -> ${state}`);
  connection.state = state;
  
  if (state === 'background') {
    // Prepare for potential disconnection
    connection.lastActiveTime = Date.now();
  } else if (state === 'active' && connection.state === 'background') {
    // Coming back from background - flush queued messages
    connectionManager.flushMessageQueue(connectionId);
  }
}

// Real-time sync broadcast (every 5 seconds)
setInterval(() => {
  for (const [sessionId, session] of sessionManager.sessions) {
    const connections = connectionManager.getSessionConnections(sessionId);
    if (connections.length > 1) {
      // Broadcast lightweight sync data
      const syncData = {
        type: 'realtimeSync',
        playerPositions: Object.fromEntries(session.syncData.playerPositions),
        playerStates: Object.fromEntries(session.syncData.playerStates),
        timestamp: new Date().toISOString()
      };
      
      connectionManager.broadcastToSession(sessionId, syncData);
    }
  }
}, 5000);

// REST API Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeSessions: sessionManager.sessions.size,
    activeConnections: connectionManager.connections.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeSessions: sessionManager.sessions.size,
    activeConnections: connectionManager.connections.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(sessionManager.sessions.values()).map(session => ({
    id: session.id,
    code: session.code,
    name: session.name,
    playerCount: session.players.size,
    createdAt: session.createdAt
  }));
  res.json(sessions);
});

// Cleanup intervals - more forgiving timing
setInterval(() => {
  connectionManager.cleanup();
  sessionManager.cleanup();
}, 600000); // Every 10 minutes

// Error handling
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Airsoft Tactical Map Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🌐 REST API: http://localhost:${PORT}/api`);
  console.log(`💡 Ready for real-time tactical synchronization!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  wss.clients.forEach(ws => ws.close());
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, wss };