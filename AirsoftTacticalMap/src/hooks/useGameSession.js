import { useState, useRef, useEffect } from 'react';
import { generateSessionCode } from '../utils/helpers';

export const useGameSession = () => {
  // Core state
  const [isHost, setIsHost] = useState(false);
  const [gameSession, setGameSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [currentUser, setCurrentUser] = useState({
    id: `player_${Date.now()}`,
    name: '',
    color: '#007AFF',
    teamId: null
  });
  
  // Keep current user and other players in separate state objects
  // to completely prevent any possibility of duplicates
  const [otherPlayers, setOtherPlayers] = useState({});
  
  // Combine current user and other players for interfaces that need all players
  const players = {
    [currentUser.id]: currentUser,
    ...otherPlayers
  };
  
  const [teams, setTeams] = useState({});
  const [pins, setPins] = useState([]);
  const [messages, setMessages] = useState([]);
  const [playerMessages, setPlayerMessages] = useState({});

  // Timeouts for player message bubbles
  const messageTimeouts = useRef({});

  // Team colors
  const teamColors = {
    team_red: '#FF4444',
    team_blue: '#4444FF',
    team_green: '#44FF44',
    team_yellow: '#FFFF44'
  };

  // Create a new session
  const createSession = (playerData) => {
    const code = generateSessionCode();
    const sessionId = `session_${code}_${Date.now()}`;
    
    setIsHost(true);
    setSessionCode(code);
    setCurrentUser(prev => ({
      ...prev,
      ...playerData
    }));
    setGameSession({ id: sessionId, code });
    
    return { sessionId, code };
  };

  // Join an existing session
  const joinSession = (code, playerData) => {
    const sessionId = `session_${code.toUpperCase()}_*`;
    
    setIsHost(false);
    setSessionCode(code.toUpperCase());
    setCurrentUser(prev => ({
      ...prev,
      ...playerData
    }));
    
    return { sessionId };
  };

  // Update session data from server
  const updateFromServer = (sessionData) => {
    console.log('Updating from server, current user ID:', currentUser.id);
    console.log('Server players before filtering:', Object.keys(sessionData.players || {}));
    
    setGameSession(prev => ({ 
      ...prev, 
      ...sessionData 
    }));
    
    if (sessionData.code) {
      setSessionCode(sessionData.code);
    }
    
    if (sessionData.teams) {
      setTeams(sessionData.teams);
    }
    
    if (sessionData.players) {
      // Create a clean copy and filter out only the current user
      const serverPlayers = {};
      
      Object.entries(sessionData.players).forEach(([playerId, playerData]) => {
        // Skip ONLY if this is exactly the current user
        if (playerId === currentUser.id) {
          console.log('Skipping current user from server data:', playerId);
          return;
        }
        
        // Skip if player ID is undefined, null, or empty
        if (!playerId || playerId === 'undefined' || playerId === 'null' || playerId.trim() === '') {
          console.log('Skipping invalid player ID:', playerId);
          return;
        }
        
        // Add all other valid players (removed the timestamp filtering that was too aggressive)
        if (playerData && typeof playerData === 'object') {
          console.log('Adding other player:', playerId, playerData.name);
          serverPlayers[playerId] = playerData;
        }
      });
      
      console.log('Final other players after filtering:', Object.keys(serverPlayers));
      
      // Update other players state
      setOtherPlayers(serverPlayers);
      
      // Update current user properties (except location) if server has data for them
      const serverCurrentUserData = sessionData.players[currentUser.id];
      if (serverCurrentUserData) {
        const { location, ...otherPlayerData } = serverCurrentUserData;
        setCurrentUser(prev => ({
          ...prev,
          ...otherPlayerData
          // Keep prev.location to maintain local location control
        }));
        console.log('Updated current user properties from server');
      }
    }
    
    if (sessionData.pins) {
      setPins(sessionData.pins);
    }
  };

  // Update player location
  const updatePlayerLocation = (playerId, location) => {
    // NEVER update current user's location from server
    if (playerId === currentUser.id) {
      console.log('Ignoring server location update for current user');
      return;
    }

    // Validate location data
    if (location && 
        location.latitude && 
        location.longitude &&
        Math.abs(location.latitude) <= 90 &&
        Math.abs(location.longitude) <= 180 &&
        location.latitude !== 0 &&
        location.longitude !== 0) {
      
      console.log('Updating location for player:', playerId);
      // Update location in other players state
      setOtherPlayers(prev => ({
        ...prev,
        [playerId]: {
          ...prev[playerId],
          location
        }
      }));
    } else {
      console.log('Invalid location data for player:', playerId, location);
    }
  };

  // Update player data
  const updatePlayer = (playerId, playerData) => {
    // NEVER update current user from this function
    if (playerId === currentUser.id) {
      console.log('Ignoring server update for current user');
      return;
    }
    
    if (!playerData) {
      // Remove player
      console.log('Removing player:', playerId);
      setOtherPlayers(prev => {
        const newPlayers = { ...prev };
        delete newPlayers[playerId];
        return newPlayers;
      });
      
      // Remove player messages
      setPlayerMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[playerId];
        return newMessages;
      });
      
      return;
    }

    // Update other player
    console.log('Updating other player:', playerId);
    setOtherPlayers(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        ...playerData
      }
    }));
  };

  // Assign team to player
  const assignTeam = (playerId, teamId) => {
    if (playerId === currentUser.id) {
      console.log('Assigning team to current user:', teamId);
      setCurrentUser(prev => ({
        ...prev,
        teamId
      }));
    } else {
      console.log('Assigning team to other player:', playerId, teamId);
      setOtherPlayers(prev => ({
        ...prev,
        [playerId]: {
          ...(prev[playerId] || {}),
          teamId
        }
      }));
    }
  };

  // Reset session
  const resetSession = () => {
    setGameSession(null);
    setOtherPlayers({});
    setTeams({});
    setPins([]);
    setMessages([]);
    setPlayerMessages({});
    setIsHost(false);
    setSessionCode('');
    
    // Clear all message timeouts
    Object.values(messageTimeouts.current).forEach(timeout => clearTimeout(timeout));
    messageTimeouts.current = {};
  };

  // Add map pin
  const addPin = (pin) => {
    setPins(prev => [...prev, pin]);
  };

  // Remove map pin
  const removePin = (pinId) => {
    setPins(prev => prev.filter(pin => pin.id !== pinId));
  };

  // Send a message
  const sendMessage = (message) => {
    const messageData = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      message,
      timestamp: Date.now(),
      teamOnly: true
    };
    
    // Add to local message list
    setMessages(prev => [...prev, messageData]);
    
    // Show message bubble above player
    setPlayerMessages(prev => ({
      ...prev,
      [currentUser.id]: message
    }));
    
    // Clear message after 5 seconds
    if (messageTimeouts.current[currentUser.id]) {
      clearTimeout(messageTimeouts.current[currentUser.id]);
    }
    
    messageTimeouts.current[currentUser.id] = setTimeout(() => {
      setPlayerMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[currentUser.id];
        return newMessages;
      });
    }, 5000);
    
    return messageData;
  };

  // Receive a message
  const receiveMessage = (data) => {
    // Don't add messages from current user (we already handle those locally)
    if (data.senderId === currentUser.id) {
      return;
    }
    
    // Add to message list
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      senderId: data.senderId,
      senderName: data.senderName,
      message: data.message,
      timestamp: data.timestamp || Date.now(),
      teamOnly: data.teamOnly
    }]);
    
    // Show message above player marker
    setPlayerMessages(prev => ({
      ...prev,
      [data.senderId]: data.message
    }));
    
    // Clear message after 5 seconds
    if (messageTimeouts.current[data.senderId]) {
      clearTimeout(messageTimeouts.current[data.senderId]);
    }
    
    messageTimeouts.current[data.senderId] = setTimeout(() => {
      setPlayerMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[data.senderId];
        return newMessages;
      });
    }, 5000);
  };

  return {
    gameSession,
    currentUser,
    players, // Combined current user + other players
    otherPlayers, // Only other players
    teams,
    pins,
    messages,
    playerMessages,
    isHost,
    sessionCode,
    teamColors,
    createSession,
    joinSession,
    updateFromServer,
    updatePlayerLocation,
    updatePlayer,
    assignTeam,
    addPin,
    removePin,
    sendMessage,
    receiveMessage,
    resetSession,
    setCurrentUser // Expose this for direct current user updates
  };
};