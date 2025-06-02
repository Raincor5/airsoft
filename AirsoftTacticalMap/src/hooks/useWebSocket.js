import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';

// WebSocket server URL
const WS_URL = process.env.REACT_NATIVE_WS_URL || 'ws://192.168.1.99:8080/ws';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef(null);
  const handlers = useRef(null);

  // Cleanup function
  const cleanup = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (ws.current) {
      ws.current.onclose = null; // Prevent reconnect on intentional close
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);
  
  // Connect to WebSocket
  const connect = (sessionId, sessionName, playerData, messageHandlers) => {
    setLoading(true);
    reconnectAttempts.current = 0;
    handlers.current = messageHandlers;
    
    try {
      console.log('Attempting to connect to:', WS_URL);
      cleanup(); // Cleanup any existing connection
      
      ws.current = new WebSocket(WS_URL);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setLoading(false);
        reconnectAttempts.current = 0;
        
        // Send initial message
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
        
        send(message);
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error details:', error);
        setLoading(false);
        Alert.alert(
          'Connection Error', 
          `Failed to connect to game server at ${WS_URL}.\n\nMake sure:\n1. The server is running\n2. You're using the correct IP address\n3. Both devices are on the same network`,
          [{ text: 'OK' }]
        );
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeout.current = setTimeout(() => {
            if (sessionId) {
              connect(sessionId, null, playerData, handlers.current);
            }
          }, 2000);
        }
      };
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to connect to server');
    }
  };
  
  // Handle incoming messages
  const handleMessage = (data) => {
    if (!handlers.current) return;
    
    switch (data.type) {
      case 'session_created':
      case 'session_joined':
        handlers.current.onSessionUpdate(data.session);
        break;
        
      case 'location_update':
        handlers.current.onLocationUpdate(data.playerId, data.location);
        break;
        
      case 'pin_added':
        handlers.current.onPinAdded(data.pin);
        break;
        
      case 'pin_removed':
        handlers.current.onPinRemoved(data.pinId);
        break;
        
      case 'quick_message':
        handlers.current.onMessageReceived(data);
        break;
        
      case 'team_assignment':
        handlers.current.onTeamAssignment(data);
        break;
        
      case 'player_joined':
        handlers.current.onPlayerJoined(data.player);
        break;
        
      case 'player_left':
        handlers.current.onPlayerLeft(data.playerId);
        break;
        
      case 'player_updated':
        handlers.current.onPlayerUpdated(data.player);
        break;
        
      case 'session_ended':
        Alert.alert('Session Ended', data.message);
        handlers.current.onSessionEnded();
        break;
        
      case 'error':
        Alert.alert('Error', data.message);
        setLoading(false);
        break;
    }
  };
  
  // Send message
  const send = (data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  };
  
  // Disconnect
  const disconnect = () => {
    cleanup();
  };
  
  return {
    connect,
    disconnect,
    send,
    isConnected,
    loading
  };
};