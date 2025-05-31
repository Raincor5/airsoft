// server.js - WebSocket Server for Airsoft Tactical Map
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

// Store active game sessions
const gameSessions = new Map();
const playerConnections = new Map(); // Map WebSocket connections to player IDs

// WebSocket Server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

// Game Session Class
class GameSession {
  constructor(id, name, hostId) {
    this.id = id;
    this.name = name;
    this.hostId = hostId;
    this.players = new Map();
    this.teams = new Map();
    this.pins = [];
    this.isActive = true;
    this.createdAt = new Date();
    
    // Initialize default teams
    this.teams.set('team_red', {
      id: 'team_red',
      name: 'Red Team',
      color: '#FF4444',
      players: []
    });
    this.teams.set('team_blue', {
      id: 'team_blue',
      name: 'Blue Team',
      color: '#4444FF',
      players: []
    });
  }

  addPlayer(player) {
    this.players.set(player.id, player);
    this.broadcastToSession({
      type: 'player_joined',
      player: this.sanitizePlayer(player),
      totalPlayers: this.players.size
    });
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      // Remove from team
      for (const [teamId, team] of this.teams) {
        team.players = team.players.filter(id => id !== playerId);
      }
      
      this.players.delete(playerId);
      this.broadcastToSession({
        type: 'player_left',
        playerId,
        totalPlayers: this.players.size
      });
    }
  }

  updatePlayerLocation(playerId, location) {
    const player = this.players.get(playerId);
    if (player) {
      player.location = {
        ...location,
        timestamp: Date.now()
      };
      
      this.broadcastToSession({
        type: 'location_update',
        playerId,
        location: player.location,
        teamId: player.teamId
      });
    }
  }

  addPin(pin) {
    pin.id = uuidv4();
    pin.timestamp = new Date().toISOString();
    this.pins.push(pin);
    
    this.broadcastToSession({
      type: 'pin_added',
      pin
    });
  }

  removePin(pinId) {
    this.pins = this.pins.filter(pin => pin.id !== pinId);
    this.broadcastToSession({
      type: 'pin_removed',
      pinId
    });
  }

  assignPlayerToTeam(playerId, teamId) {
    const player = this.players.get(playerId);
    const team = this.teams.get(teamId);
    
    if (player && team) {
      // Remove from current team
      if (player.teamId) {
        const currentTeam = this.teams.get(player.teamId);
        if (currentTeam) {
          currentTeam.players = currentTeam.players.filter(id => id !== playerId);
        }
      }
      
      // Add to new team
      player.teamId = teamId;
      team.players.push(playerId);
      
      this.broadcastToSession({
        type: 'team_assignment',
        playerId,
        teamId,
        teams: this.getTeamsData(),
        players: this.getPlayersData()
      });
    }
  }

  sendQuickMessage(senderId, message, teamOnly = true) {
    const sender = this.players.get(senderId);
    if (!sender) return;

    const messageData = {
      type: 'quick_message',
      senderId,
      senderName: sender.name,
      teamId: sender.teamId,
      message,
      timestamp: Date.now(),
      teamOnly
    };

    if (teamOnly && sender.teamId) {
      // Send only to team members
      this.broadcastToTeam(sender.teamId, messageData);
    } else {
      // Send to all players in session
      this.broadcastToSession(messageData);
    }
  }

  broadcastToSession(data) {
    for (const [playerId, player] of this.players) {
      const ws = playerConnections.get(playerId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }
  }

  broadcastToTeam(teamId, data) {
    const team = this.teams.get(teamId);
    if (team) {
      team.players.forEach(playerId => {
        const ws = playerConnections.get(playerId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      });
    }
  }

  getSessionData() {
    return {
      id: this.id,
      name: this.name,
      hostId: this.hostId,
      players: this.getPlayersData(),
      teams: this.getTeamsData(),
      pins: this.pins,
      isActive: this.isActive,
      totalPlayers: this.players.size,
      createdAt: this.createdAt
    };
  }

  getPlayersData() {
    const playersData = {};
    for (const [id, player] of this.players) {
      playersData[id] = this.sanitizePlayer(player);
    }
    return playersData;
  }

  getTeamsData() {
    const teamsData = {};
    for (const [id, team] of this.teams) {
      teamsData[id] = { ...team };
    }
    return teamsData;
  }

  sanitizePlayer(player) {
    return {
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      location: player.location,
      isOnline: true,
      lastSeen: Date.now()
    };
  }
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  let playerId = null;
  let sessionId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type, data);

      switch (data.type) {
        case 'join_session':
          handleJoinSession(ws, data);
          break;
        
        case 'create_session':
          handleCreateSession(ws, data);
          break;
        
        case 'location_update':
          handleLocationUpdate(data);
          break;
        
        case 'add_pin':
          handleAddPin(data);
          break;
        
        case 'remove_pin':
          handleRemovePin(data);
          break;
        
        case 'quick_message':
          handleQuickMessage(data);
          break;
        
        case 'assign_team':
          handleAssignTeam(data);
          break;
        
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    if (playerId && sessionId) {
      const session = gameSessions.get(sessionId);
      if (session) {
        session.removePlayer(playerId);
        
        // Clean up empty sessions
        if (session.players.size === 0) {
          gameSessions.delete(sessionId);
          console.log(`Session ${sessionId} removed (empty)`);
        }
      }
      playerConnections.delete(playerId);
    }
  });

  // Message handlers
  function handleJoinSession(ws, data) {
    const { sessionId: sid, player } = data;
    const session = gameSessions.get(sid);
    
    if (!session) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Session not found' 
      }));
      return;
    }

    playerId = player.id;
    sessionId = sid;
    playerConnections.set(playerId, ws);
    session.addPlayer(player);

    ws.send(JSON.stringify({
      type: 'session_joined',
      session: session.getSessionData()
    }));
  }

  function handleCreateSession(ws, data) {
    const { sessionName, player } = data;
    const newSessionId = uuidv4();
    const session = new GameSession(newSessionId, sessionName, player.id);
    
    gameSessions.set(newSessionId, session);
    playerId = player.id;
    sessionId = newSessionId;
    playerConnections.set(playerId, ws);
    session.addPlayer(player);

    ws.send(JSON.stringify({
      type: 'session_created',
      session: session.getSessionData()
    }));
  }

  function handleLocationUpdate(data) {
    if (!sessionId) return;
    const session = gameSessions.get(sessionId);
    if (session) {
      session.updatePlayerLocation(data.playerId, data.location);
    }
  }

  function handleAddPin(data) {
    if (!sessionId) return;
    const session = gameSessions.get(sessionId);
    if (session) {
      session.addPin(data.pin);
    }
  }

  function handleRemovePin(data) {
    if (!sessionId) return;
    const session = gameSessions.get(sessionId);
    if (session) {
      session.removePin(data.pinId);
    }
  }

  function handleQuickMessage(data) {
    if (!sessionId) return;
    const session = gameSessions.get(sessionId);
    if (session) {
      session.sendQuickMessage(data.senderId, data.message, data.teamOnly);
    }
  }

  function handleAssignTeam(data) {
    if (!sessionId) return;
    const session = gameSessions.get(sessionId);
    if (session && session.hostId === playerId) {
      session.assignPlayerToTeam(data.playerId, data.teamId);
    }
  }
});

// REST API Endpoints
app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(gameSessions.values()).map(session => ({
    id: session.id,
    name: session.name,
    totalPlayers: session.players.size,
    isActive: session.isActive,
    createdAt: session.createdAt
  }));
  res.json(sessions);
});

app.get('/api/sessions/:id', (req, res) => {
  const session = gameSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session.getSessionData());
});

app.post('/api/sessions', (req, res) => {
  const { name, hostId } = req.body;
  if (!name || !hostId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const sessionId = uuidv4();
  const session = new GameSession(sessionId, name, hostId);
  gameSessions.set(sessionId, session);
  
  res.status(201).json({
    id: sessionId,
    name,
    hostId,
    totalPlayers: 0
  });
});

app.delete('/api/sessions/:id', (req, res) => {
  const sessionId = req.params.id;
  const session = gameSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Notify all players that session is ending
  session.broadcastToSession({
    type: 'session_ended',
    message: 'Game session has been terminated by the host'
  });
  
  // Close all connections
  for (const [playerId, player] of session.players) {
    const ws = playerConnections.get(playerId);
    if (ws) {
      ws.close();
      playerConnections.delete(playerId);
    }
  }
  
  gameSessions.delete(sessionId);
  res.json({ message: 'Session deleted successfully' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    activeSessions: gameSessions.size,
    activeConnections: playerConnections.size,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Airsoft Tactical Map Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🌐 REST API: http://localhost:${PORT}/api`);
});

// Cleanup function for graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  
  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close();
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, wss };