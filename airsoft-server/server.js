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
    // Automatic connection cleanup disabled - only manual leaving allowed
    // Connections will only be removed when explicitly closed or left
    return;
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
    // Automatic session cleanup disabled - only remove empty sessions
    // Sessions persist until manually ended or all players leave
    for (const [sessionId, session] of this.sessions) {
      if (session.players.size === 0) {
        console.log(`🧹 Removing empty session: ${session.code}`);
        this.removeSession(sessionId);
      }
    }
  }
}

// Authoritative Game Server - Tick System
class AuthoritativeGameServer {
  constructor() {
    this.tickRate = 30; // 30 Hz
    this.tickInterval = 1000 / this.tickRate; // 33.33ms
    this.snapshotInterval = 5000; // 5000ms = 5 seconds
    this.locationBroadcastInterval = 200; // 200ms = 5Hz for location updates
    this.lastSnapshotTime = 0;
    this.lastLocationBroadcast = 0;
    this.tickNumber = 0;
    this.isRunning = false;
    
    // Input buffer for batch processing
    this.inputBuffer = new Map(); // sessionId -> Array of inputs
    
    // State tracking for deltas
    this.lastSnapshots = new Map(); // sessionId -> last snapshot
    this.stateDirtyFlags = new Map(); // sessionId -> dirty flags
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.gameLoop();
    console.log(`🎮 Authoritative Game Server started at ${this.tickRate}Hz`);
  }
  
  stop() {
    this.isRunning = false;
    if (this.gameLoopTimeout) {
      clearTimeout(this.gameLoopTimeout);
    }
    console.log(`🛑 Authoritative Game Server stopped`);
  }
  
  gameLoop() {
    if (!this.isRunning) return;
    
    const startTime = Date.now();
    this.tickNumber++;
    
    // Process all pending inputs for all sessions
    this.processInputs();
    
    // Update game state for all sessions
    this.updateGameState();
    
    // Send snapshots/deltas to clients
    this.sendStateUpdates();
    
    // Calculate next tick timing
    const processingTime = Date.now() - startTime;
    const nextTickDelay = Math.max(0, this.tickInterval - processingTime);
    
    this.gameLoopTimeout = setTimeout(() => this.gameLoop(), nextTickDelay);
    
    // Debug logging every second
    if (this.tickNumber % this.tickRate === 0) {
      console.log(`🔄 Server Tick ${this.tickNumber}, Processing: ${processingTime}ms`);
    }
  }
  
  addInput(sessionId, input) {
    if (!this.inputBuffer.has(sessionId)) {
      this.inputBuffer.set(sessionId, []);
    }
    this.inputBuffer.get(sessionId).push(input);
    
    // Mark session as dirty for state updates
    this.markDirty(sessionId, input.type);
  }
  
  processInputs() {
    for (const [sessionId, inputs] of this.inputBuffer) {
      const session = sessionManager.getSession(sessionId);
      if (!session) continue;
      
      // Process inputs in order
      inputs.forEach(input => {
        this.processInput(session, input);
      });
      
      // Clear processed inputs
      inputs.length = 0;
    }
  }
  
  processInput(session, input) {
    const { type, playerId, data, sequence } = input;
    
    switch (type) {
      case 'playerJoined':
        // Mark session as dirty for state update
        this.markDirty(session.id, 'playerStates');
        this.sendAck(session.id, playerId, sequence, 'playerJoined');
        break;
        
      case 'locationUpdate':
        const { location } = data;
        if (session.updatePlayerLocation(playerId, location)) {
          this.markDirty(session.id, 'playerPositions');
          this.sendAck(session.id, playerId, sequence, 'locationUpdate');
        }
        break;
        
      case 'addPin':
        const pin = {
          id: data.id || require('uuid').v4(),
          type: data.type,
          name: data.name || data.type,
          coordinate: data.position,
          playerId: playerId,
          teamId: session.players.get(playerId)?.teamId,
          timestamp: new Date().toISOString()
        };
        session.addPin(pin);
        this.markDirty(session.id, 'pins');
        console.log(`🎯 Server processed pin: ${pin.type} at ${pin.coordinate?.latitude}, ${pin.coordinate?.longitude}`);
        // Send acknowledgment and broadcast
        this.sendAck(session.id, playerId, sequence, 'addPin');
        this.broadcastPinAdded(session.id, pin);
        break;
        
      case 'removePin':
        if (session.removePin(data.pinId)) {
          this.markDirty(session.id, 'pins');
          this.sendAck(session.id, playerId, sequence, 'removePin');
          this.broadcastPinRemoved(session.id, data.pinId);
        }
        break;
        
      case 'sendMessage':
        const message = {
          id: require('uuid').v4(),
          text: data.text,
          playerId: playerId,
          playerName: session.players.get(playerId)?.name,
          teamId: session.players.get(playerId)?.teamId,
          timestamp: new Date().toISOString()
        };
        session.addMessage(message);
        this.markDirty(session.id, 'messages');
        this.sendAck(session.id, playerId, sequence, 'sendMessage');
        this.broadcastMessage(session.id, message);
        break;
        
      case 'assignTeam':
        // Only allow host to assign teams
        if (session.hostPlayerId === playerId) {
          const { targetPlayerId, teamId } = data;
          if (session.assignPlayerToTeam(targetPlayerId, teamId)) {
            const player = session.players.get(targetPlayerId);
            this.markDirty(session.id, 'playerStates');
            this.markDirty(session.id, 'teams');
            this.sendAck(session.id, playerId, sequence, 'assignTeam');
            this.broadcastTeamAssignment(session.id, targetPlayerId, teamId, player?.name);
            console.log(`🔵 Team assignment processed: ${player?.name} assigned to ${teamId}`);
          }
        }
        break;
    }
  }
  
  updateGameState() {
    // Update any time-based game logic here
    // Player activity tracking disabled - players remain active until manually leaving
    // No automatic state changes based on inactivity
  }
  
  sendStateUpdates() {
    const now = Date.now();
    const shouldSendSnapshot = (now - this.lastSnapshotTime) >= this.snapshotInterval;
    
    for (const session of sessionManager.sessions.values()) {
      const hasDirtyData = this.stateDirtyFlags.has(session.id) && 
                          this.stateDirtyFlags.get(session.id).size > 0;
      
      if (shouldSendSnapshot || !this.lastSnapshots.has(session.id)) {
        this.sendSnapshot(session);
      } else if (hasDirtyData) {
        this.sendDelta(session);
      }
      // Don't send anything if no changes
    }
    
    if (shouldSendSnapshot) {
      this.lastSnapshotTime = now;
    }
  }
  
  sendSnapshot(session) {
    const snapshot = {
      type: 'gameSnapshot',
      tick: this.tickNumber,
      timestamp: Date.now(),
      isFullSnapshot: true,
      session: {
        code: session.code,
        name: session.name,
        hostPlayerId: session.hostPlayerId,
        players: Array.from(session.players.values()),
        pins: Array.from(session.pins.values()),
        messages: session.messages,
        teams: Array.from(session.teams.values()),
        gamePhase: session.gamePhase,
        scores: session.scores
      }
    };
    
    // Store for future delta generation
    this.lastSnapshots.set(session.id, snapshot);
    
    // Send to all clients in session
    connectionManager.broadcastToSession(session.id, snapshot);
    
    // Clear dirty flags after snapshot
    this.stateDirtyFlags.delete(session.id);
    
    console.log(`📸 Sent full snapshot for session ${session.code} (${session.players.size} players)`);
  }
  
  sendDelta(session) {
    const dirtyFlags = this.stateDirtyFlags.get(session.id);
    if (!dirtyFlags || dirtyFlags.size === 0) return;
    
    const delta = {
      type: 'gameDelta',
      tick: this.tickNumber,
      timestamp: Date.now(),
      changes: {}
    };
    
    // Build delta based on dirty flags
    if (dirtyFlags.has('playerStates')) {
      delta.changes.playerStates = Object.fromEntries(
        Array.from(session.players.entries()).map(([id, player]) => [
          id,
          {
            id: player.id,
            name: player.name,
            isHost: player.isHost,
            teamId: player.teamId,
            location: player.location
          }
        ])
      );
    }
    
    if (dirtyFlags.has('playerPositions')) {
      delta.changes.playerPositions = Object.fromEntries(
        Array.from(session.players.entries()).map(([id, player]) => [
          id,
          player.location
        ])
      );
    }
    
    if (dirtyFlags.has('pins')) {
      delta.changes.pins = Array.from(session.pins.values());
    }
    
    if (dirtyFlags.has('messages')) {
      delta.changes.messages = session.messages.slice(-10); // Last 10 messages
    }
    
    if (dirtyFlags.has('teams')) {
      delta.changes.teams = Array.from(session.teams.values());
    }
    
    // Send to all clients in session
    connectionManager.broadcastToSession(session.id, delta);
    
    // Clear processed dirty flags
    dirtyFlags.clear();
    
    console.log(`🔄 Sent delta for session ${session.code} with changes: ${Array.from(dirtyFlags).join(', ')}`);
  }
  
  markDirty(sessionId, component) {
    if (!this.stateDirtyFlags.has(sessionId)) {
      this.stateDirtyFlags.set(sessionId, new Set());
    }
    this.stateDirtyFlags.get(sessionId).add(component);
  }
  
  sendAck(sessionId, playerId, sequence, actionType) {
    const ack = {
      type: 'inputAck',
      sequence: sequence,
      actionType: actionType,
      tick: this.tickNumber,
      timestamp: Date.now()
    };
    
    connectionManager.sendToPlayer(playerId, ack);
  }
  
  broadcastPinAdded(sessionId, pin) {
    const message = {
      type: 'pinAdded',
      pin: pin,
      tick: this.tickNumber
    };
    connectionManager.broadcastToSession(sessionId, message);
  }
  
  broadcastPinRemoved(sessionId, pinId) {
    const message = {
      type: 'pinRemoved',
      pinId: pinId,
      tick: this.tickNumber
    };
    connectionManager.broadcastToSession(sessionId, message);
  }
  
  broadcastMessage(sessionId, message) {
    const broadcastMsg = {
      type: 'messageReceived',
      message: message,
      tick: this.tickNumber
    };
    connectionManager.broadcastToSession(sessionId, broadcastMsg);
  }
  
  broadcastTeamAssignment(sessionId, targetPlayerId, teamId, playerName) {
    const message = {
      type: 'teamAssigned',
      playerId: targetPlayerId,
      playerName: playerName || 'Unknown',
      teamId: teamId,
      tick: this.tickNumber,
      timestamp: new Date().toISOString()
    };
    connectionManager.broadcastToSession(sessionId, message);
  }
  
  broadcastLocationUpdate(sessionId, playerId, locationData) {
    const session = sessionManager.getSession(sessionId);
    if (!session) return;
    
    const player = session.players.get(playerId);
    const locationMessage = {
      type: 'locationUpdate',
      playerId: playerId,
      playerName: player?.name || 'Unknown',
      location: locationData,
      teamId: player?.teamId || null,
      tick: this.tickNumber
    };
    
    connectionManager.broadcastToSession(sessionId, locationMessage);
  }
}

// Initialize managers
const connectionManager = new ConnectionManager();
const sessionManager = new SessionManager();
const gameServer = new AuthoritativeGameServer();

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

  // Heartbeat disabled - connections only close manually
  // const heartbeatInterval = null; // No automatic timeouts
  
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
    // No heartbeat interval to clear
    
    const connection = connectionManager.getConnection(connectionId);
    if (connection && connection.playerId && connection.sessionId) {
      // Remove player from session
      const session = sessionManager.getSession(connection.sessionId);
      if (session) {
        const player = session.players.get(connection.playerId);
        session.removePlayer(connection.playerId);
        
        // Player disconnect will be handled via authoritative server snapshots
        // No direct broadcasts needed
        
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
  
  console.log(`🎮 Creating session for player ${playerName} (${playerId})`);
  
  if (!playerId || !playerName) {
    console.log(`❌ Invalid create session request - missing player info`);
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

  console.log(`✅ Session ${session.code} created with host ${playerName}`);

  // Send success response with full session data
  connectionManager.sendToConnection(connectionId, {
    type: 'sessionCreated',
    sessionCode: session.code,
    session: session.getFullSyncData(),
    playerId: playerId
  });
  
  console.log(`📤 Sent session created response to host ${playerName}`);
}

function handleJoinSession(connectionId, data) {
  const { sessionCode, playerId, playerName } = data;
  
  console.log(`🎮 Join session request: ${sessionCode} by ${playerName} (${playerId})`);
  
  if (!sessionCode || !playerId || !playerName) {
    console.log(`❌ Invalid join session request - missing required fields`);
    connectionManager.sendToConnection(connectionId, {
      type: 'error',
      message: 'Session code, player ID, and name are required'
    });
    return;
  }

  const session = sessionManager.getSessionByCode(sessionCode);
  if (!session) {
    console.log(`❌ Session ${sessionCode} not found`);
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

  // Update connection mapping BEFORE broadcasting
  connectionManager.updateConnection(connectionId, {
    playerId: playerId,
    sessionId: session.id
  });

  console.log(`✅ Player ${playerName} connected to session ${sessionCode}`);

  // Send confirmation with session state
  connectionManager.sendToConnection(connectionId, {
    type: 'sessionJoined',
    sessionCode: sessionCode,
    session: session.getFullSyncData(),
    playerId: playerId,
    isReconnection: isReconnection
  });

  console.log(`📤 Sent session joined response to ${playerName}`);
  
  // Instead of direct notification, add a join input to the game server
  gameServer.addInput(session.id, {
    type: 'playerJoined',
    playerId: playerId,
    data: {
      player: {
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        teamId: player.teamId,
        location: player.location
      }
    },
    sequence: Date.now(),
    timestamp: Date.now()
  });
}

function handleLeaveSession(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId || !connection.playerId) return;

  const session = sessionManager.getSession(connection.sessionId);
  if (!session) return;
  
  // Remove player
  const player = session.removePlayer(connection.playerId);
  
  // Player leave will be notified via authoritative server snapshots
  // No direct broadcasts needed
      
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
  
  const { location, sequence } = data;
  const messageSequence = sequence || 0;
  
  console.log(`📍 Location input from ${connection.playerId}: ${location.latitude}, ${location.longitude}`);

  // Route through authoritative game server
  gameServer.addInput(connection.sessionId, {
    type: 'locationUpdate',
    playerId: connection.playerId,
    data: {
      location: location
    },
    sequence: messageSequence,
    timestamp: Date.now()
  });

  // Broadcast to all players in session
  const session = sessionManager.getSession(connection.sessionId);
  if (session) {
    const message = {
      type: 'locationUpdate',
      playerId: connection.playerId,
      location: location
    };
    connectionManager.broadcastToSession(connection.sessionId, message);
  }
}

function handleAddPin(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId || !connection.playerId) return;
  
  // Extract pin data - could be nested in 'pin' object
  let pinData = data.pin || data;
  const { type, coordinate, name, id, sequence } = pinData;
  const messageSequence = data.sequence || 0;
  
  console.log(`📍 Pin input from ${connection.playerId}: ${type} at ${coordinate?.latitude}, ${coordinate?.longitude}`);

  // Route through authoritative game server
  gameServer.addInput(connection.sessionId, {
    type: 'addPin',
    playerId: connection.playerId,
    data: {
      id: id || require('uuid').v4(),
      type,
      position: coordinate,
      name: name || type
    },
    sequence: messageSequence,
    timestamp: Date.now()
  });
}

function handleRemovePin(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId || !connection.playerId) return;
  
  const { pinId, sequence } = data;
  const messageSequence = sequence || 0;
  
  console.log(`🗑️ Pin removal from ${connection.playerId}: ${pinId}`);

  // Route through authoritative game server
  gameServer.addInput(connection.sessionId, {
    type: 'removePin',
    playerId: connection.playerId,
    data: {
      pinId: pinId
    },
    sequence: messageSequence,
    timestamp: Date.now()
  });
}

function handleSendMessage(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId || !connection.playerId) return;
  
  // Extract message data - could be nested in 'message' object
  let messageData = data.message || data;
  const { text, teamId } = messageData;
  const sequence = data.sequence || 0;
  
  console.log(`�� Message input from ${connection.playerId}: ${text}`);

  // Route through authoritative game server
  gameServer.addInput(connection.sessionId, {
    type: 'sendMessage',
    playerId: connection.playerId,
    data: {
      text,
      teamId
    },
    sequence: sequence,
    timestamp: Date.now()
  });
}

function handleAssignTeam(connectionId, data) {
  const connection = connectionManager.getConnection(connectionId);
  if (!connection || !connection.sessionId) return;
    
  const session = sessionManager.getSession(connection.sessionId);
  if (!session || session.hostPlayerId !== connection.playerId) return;
  
  const { playerId, teamId, sequence } = data;
  const messageSequence = sequence || 0;
  
  console.log(`🔵 Team assignment from ${connection.playerId}: assign ${playerId} to ${teamId}`);

  // Route through authoritative game server
  gameServer.addInput(connection.sessionId, {
    type: 'assignTeam',
    playerId: connection.playerId,
    data: {
      targetPlayerId: playerId,
      teamId: teamId
    },
    sequence: messageSequence,
    timestamp: Date.now()
  });
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

// Legacy real-time sync removed - now handled by AuthoritativeGameServer
// The game server provides proper snapshots (every 5s) and deltas (as needed)

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
  
  // Start authoritative game server
  gameServer.start();
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