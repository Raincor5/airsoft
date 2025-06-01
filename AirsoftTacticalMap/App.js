import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  TextInput, 
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';

const { width, height } = Dimensions.get('window');

// Responsive scaling
const scale = width / 375; // Base on iPhone X width
const normalize = (size) => Math.round(scale * size);
const isSmallScreen = width < 375;
const isLargeScreen = width > 768;

// Configuration
// IMPORTANT: Replace with your computer's IP address!
// To find your IP:
// - Mac: Run 'ifconfig | grep inet' in terminal
// - Windows: Run 'ipconfig' in command prompt
// - Look for IPv4 address (usually starts with 192.168...)
const WS_URL = process.env.REACT_NATIVE_WS_URL || 'ws://192.168.1.99:8080/ws'; // UPDATE THIS!
const DEBUG_MODE = true; // Set to false in production

// Simple icon components as replacements for Lucide icons
const IconWrapper = ({ children, style }) => (
  <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
    {children}
  </View>
);

const Compass = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <View style={[styles.iconCircle, { width: normalize(size), height: normalize(size), borderColor: color }]}>
      <Text style={[styles.iconText, { color, fontSize: normalize(size * 0.6) }]}>N</Text>
    </View>
  </IconWrapper>
);

const Users = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <View style={[styles.iconRect, { width: normalize(size), height: normalize(size * 0.8), borderColor: color }]}>
      <Text style={[styles.iconText, { color, fontSize: normalize(size * 0.5) }]}>👥</Text>
    </View>
  </IconWrapper>
);

const MessageCircle = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <View style={[styles.iconCircle, { width: normalize(size), height: normalize(size), borderColor: color }]}>
      <Text style={[styles.iconText, { color, fontSize: normalize(size * 0.5) }]}>💬</Text>
    </View>
  </IconWrapper>
);

const Flag = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>🚩</Text>
  </IconWrapper>
);

const AlertTriangle = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>⚠️</Text>
  </IconWrapper>
);

const Eye = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>👁️</Text>
  </IconWrapper>
);

const Zap = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>⚡</Text>
  </IconWrapper>
);

const Target = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>🎯</Text>
  </IconWrapper>
);

const Shield = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>🛡️</Text>
  </IconWrapper>
);

const Navigation = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>🧭</Text>
  </IconWrapper>
);

const MapPin = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>📍</Text>
  </IconWrapper>
);

const Share = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>📤</Text>
  </IconWrapper>
);

const Copy = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>📋</Text>
  </IconWrapper>
);

const Chat = ({ size = 20, color = 'white' }) => (
  <IconWrapper>
    <Text style={[styles.iconText, { color, fontSize: normalize(size) }]}>💬</Text>
  </IconWrapper>
);

const AirsoftTacticalMap = () => {
  // Core state
  const [isHost, setIsHost] = useState(false);
  const [gameSession, setGameSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [inputSessionCode, setInputSessionCode] = useState('');
  const [currentUser, setCurrentUser] = useState({
    id: `player_${Date.now()}`,
    name: '',
    color: '#007AFF',
    teamId: null
  });
  const [players, setPlayers] = useState({});
  const [teams, setTeams] = useState({});
  const [pins, setPins] = useState([]);
  const [messages, setMessages] = useState([]);
  const [playerMessages, setPlayerMessages] = useState({});
  
  // UI state
  const [showSetup, setShowSetup] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [showChatLog, setShowChatLog] = useState(false);
  const [showPinSelector, setShowPinSelector] = useState(false);
  const [selectedPinType, setSelectedPinType] = useState(null);
  const [pendingPinLocation, setPendingPinLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Requesting permissions...');
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  // Location and sensor state
  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  // Refs
  const ws = useRef(null);
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  const messageTimeouts = useRef({});
  
  // Team colors
  const teamColors = {
    team_red: '#FF4444',
    team_blue: '#4444FF',
    team_green: '#44FF44',
    team_yellow: '#FFFF44'
  };
  
  // Player colors
  const playerColors = [
    '#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', 
    '#FF2D55', '#5856D6', '#00C7BE', '#FF6482', '#FFB340'
  ];
  
  // Pin types for airsoft games
  const pinTypes = [
    { id: 'enemy', name: 'Enemy Spotted', icon: Target, color: '#FF4444' },
    { id: 'trap', name: 'Trap/Hazard', icon: AlertTriangle, color: '#FF8800' },
    { id: 'suspect', name: 'Suspicious Area', icon: Eye, color: '#FFAA00' },
    { id: 'flag', name: 'Objective/Flag', icon: Flag, color: '#00AA00' },
    { id: 'cover', name: 'Good Cover', icon: Shield, color: '#0066AA' },
    { id: 'sniper', name: 'Sniper Position', icon: Zap, color: '#AA0066' }
  ];
  
  // Quick messages
  const quickMessages = [
    { id: 'help', text: 'Need Help!', color: '#FF4444' },
    { id: 'danger', text: 'Danger!', color: '#FF8800' },
    { id: 'retreating', text: 'Retreating', color: '#FFAA00' },
    { id: 'advancing', text: 'Advancing', color: '#00AA00' },
    { id: 'clear', text: 'Area Clear', color: '#0066AA' },
    { id: 'contact', text: 'Enemy Contact', color: '#AA0066' }
  ];
  
  // Debug: Log players state changes
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log('Current players state:', players);
      console.log('Current user:', currentUser);
    }
  }, [players, currentUser]);
  
  // Initialize location services
  useEffect(() => {
    (async () => {
      try {
        setLocationStatus('Requesting location permissions...');
        
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('Location permission denied');
          Alert.alert(
            'Permission Required',
            'Location permission is required for this app to work properly.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        setLocationStatus('Getting your location...');
        
        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation
        });
        
        // Validate initial location
        if (location.coords.latitude && 
            location.coords.longitude &&
            Math.abs(location.coords.latitude) <= 90 &&
            Math.abs(location.coords.longitude) <= 180) {
          const initialLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading || 0
          };
          
          setUserLocation(initialLocation);
          setMapRegion({
            ...initialLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          });
        } else {
          throw new Error('Invalid initial location');
        }
        
        // Start watching location
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1
          },
          (location) => {
            // Validate location before using
            if (location.coords.latitude && 
                location.coords.longitude &&
                Math.abs(location.coords.latitude) <= 90 &&
                Math.abs(location.coords.longitude) <= 180) {
              const newLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                heading: heading // Use magnetometer heading
              };
              setUserLocation(newLocation);
              
              // Send location update if connected
              if (ws.current && ws.current.readyState === WebSocket.OPEN && gameSession) {
                ws.current.send(JSON.stringify({
                  type: 'location_update',
                  playerId: currentUser.id,
                  location: newLocation
                }));
              }
            }
          }
        );
        
        setLocationStatus('Location active');
        
        // Initialize magnetometer for compass
        if (await Magnetometer.isAvailableAsync()) {
          // Request permissions on iOS
          if (Platform.OS === 'ios') {
            await Magnetometer.requestPermissionsAsync();
          }
          
          magnetometerSubscription.current = Magnetometer.addListener((data) => {
            let angle = Math.atan2(data.y, data.x);
            angle = angle * (180 / Math.PI);
            angle = angle + 90;
            angle = (angle + 360) % 360;
            setHeading(Math.round(angle));
          });
          
          Magnetometer.setUpdateInterval(100);
        }
        
      } catch (error) {
        console.error('Location setup error:', error);
        setLocationStatus('Location error');
        Alert.alert('Error', 'Failed to setup location services: ' + error.message);
      }
    })();
    
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
      // Clear all message timeouts
      Object.values(messageTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);
  
  // Generate session code
  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };
  
  // WebSocket connection
  const connectWebSocket = (sessionId, sessionName = null) => {
    try {
      console.log('Attempting to connect to:', WS_URL);
      ws.current = new WebSocket(WS_URL);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected successfully');
        
        // Include current location in player data
        const playerData = {
          ...currentUser,
          name: playerName || currentUser.name,
          color: selectedColor,
          teamId: selectedTeam,
          location: userLocation // Include current location
        };
        
        const message = sessionName ? {
          type: 'create_session',
          sessionName,
          sessionId, // Include sessionId for code extraction
          player: playerData
        } : {
          type: 'join_session',
          sessionId,
          player: playerData
        };
        
        ws.current.send(JSON.stringify(message));
      };
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error details:', error);
        Alert.alert(
          'Connection Error', 
          `Failed to connect to game server at ${WS_URL}\n\nMake sure:\n1. The server is running\n2. You're using the correct IP address\n3. Both devices are on the same network`,
          [{ text: 'OK', onPress: () => setLoading(false) }]
        );
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Only attempt to reconnect if session is active and wasn't a connection failure
        if (gameSession && ws.current.readyState !== WebSocket.CONNECTING) {
          setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket(gameSession.id);
          }, 2000);
        }
      };
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    }
  };
  
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'session_created':
      case 'session_joined':
        if (DEBUG_MODE) console.log('Session data received:', data.session);
        setGameSession(data.session);
        setSessionCode(data.session.code); // Use the code from server
        setTeams(data.session.teams || {});
        setPlayers(data.session.players || {});
        setPins(data.session.pins || []);
        setShowSetup(false);
        setShowPlayerSetup(false);
        setLoading(false);
        // Update current user with server data
        if (data.session.players[currentUser.id]) {
          setCurrentUser(prev => ({
            ...prev,
            ...data.session.players[currentUser.id]
          }));
        }
        if (DEBUG_MODE) console.log('Players after session join:', data.session.players);
        break;
        
      case 'location_update':
        if (data.playerId !== currentUser.id) {
          // Validate location data before updating
          if (data.location && 
              data.location.latitude && 
              data.location.longitude &&
              Math.abs(data.location.latitude) <= 90 &&
              Math.abs(data.location.longitude) <= 180 &&
              data.location.latitude !== 0 &&
              data.location.longitude !== 0) {
            setPlayers(prev => ({
              ...prev,
              [data.playerId]: {
                ...prev[data.playerId],
                location: data.location
              }
            }));
          }
        }
        break;
        
      case 'pin_added':
        setPins(prev => [...prev, data.pin]);
        break;
        
      case 'pin_removed':
        setPins(prev => prev.filter(pin => pin.id !== data.pinId));
        break;
        
      case 'quick_message':
        handleIncomingMessage(data);
        break;
        
      case 'team_assignment':
        if (DEBUG_MODE) console.log('Team assignment received:', data);
        setTeams(data.teams);
        setPlayers(data.players);
        if (data.playerId === currentUser.id) {
          setCurrentUser(prev => ({ ...prev, teamId: data.teamId }));
        }
        break;
        
      case 'player_joined':
        if (DEBUG_MODE) console.log('Player joined:', data.player);
        setPlayers(prev => {
          // Make sure we don't lose existing player data
          const existingPlayer = prev[data.player.id] || {};
          return {
            ...prev,
            [data.player.id]: {
              ...existingPlayer,
              ...data.player
            }
          };
        });
        break;
        
      case 'player_left':
        setPlayers(prev => {
          const newPlayers = { ...prev };
          delete newPlayers[data.playerId];
          return newPlayers;
        });
        // Remove their messages
        setPlayerMessages(prev => {
          const newMessages = { ...prev };
          delete newMessages[data.playerId];
          return newMessages;
        });
        break;
        
      case 'player_updated':
        setPlayers(prev => ({
          ...prev,
          [data.player.id]: data.player
        }));
        break;
        
      case 'session_ended':
        Alert.alert('Session Ended', data.message);
        resetToSetup();
        break;
        
      case 'error':
        Alert.alert('Error', data.message);
        setLoading(false);
        break;
    }
  };
  
  const handleIncomingMessage = (data) => {
    // Add to chat log
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      senderId: data.senderId,
      senderName: data.senderName,
      message: data.message,
      timestamp: data.timestamp,
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
  
  const setupPlayerAndCreate = () => {
    setIsCreatingGame(true);
    setShowPlayerSetup(true);
  };
  
  const setupPlayerAndJoin = () => {
    setIsCreatingGame(false);
    setShowJoinModal(false);
    setShowPlayerSetup(true);
  };
  
  const proceedWithGame = () => {
    if (!playerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name');
      return;
    }
    
    setCurrentUser(prev => ({
      ...prev,
      name: playerName.trim(),
      color: selectedColor,
      teamId: selectedTeam
    }));
    
    if (isCreatingGame) {
      createGame();
    } else {
      joinGame();
    }
  };
  
  const createGame = () => {
    setLoading(true);
    const code = generateSessionCode();
    setSessionCode(code);
    setIsHost(true);
    
    // Create a session ID from the code
    const sessionId = `session_${code}_${Date.now()}`;
    setGameSession({ id: sessionId, code });
    
    connectWebSocket(sessionId, `Game ${code}`);
  };
  
  const joinGame = () => {
    if (!inputSessionCode || inputSessionCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character session code');
      return;
    }
    
    setLoading(true);
    
    // For now, we'll use the session code as part of the session ID
    // In production, you'd query the server to find the session by code
    const sessionId = `session_${inputSessionCode.toUpperCase()}_*`;
    setSessionCode(inputSessionCode.toUpperCase());
    
    connectWebSocket(sessionId);
  };
  
  const resetToSetup = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setGameSession(null);
    setPlayers({});
    setTeams({});
    setPins([]);
    setMessages([]);
    setPlayerMessages({});
    setShowSetup(true);
    setIsHost(false);
    setSessionCode('');
    setInputSessionCode('');
    setSelectedTeam(null);
  };
  
  const shareSessionCode = () => {
    // In a real app, you'd use the Share API
    Alert.alert(
      'Session Code',
      `Share this code with other players: ${sessionCode}`,
      [
        { text: 'Copy', onPress: () => console.log('Copy to clipboard: ' + sessionCode) },
        { text: 'OK' }
      ]
    );
  };
  
  const addPlayerToTeam = (playerId, teamId) => {
    if (!isHost || !ws.current) return;
    
    ws.current.send(JSON.stringify({
      type: 'assign_team',
      playerId,
      teamId
    }));
    
    // If assigning self, update player profile
    if (playerId === currentUser.id && ws.current) {
      ws.current.send(JSON.stringify({
        type: 'update_player',
        playerId: currentUser.id,
        updates: {
          teamId: teamId
        }
      }));
    }
  };
  
  const sendQuickMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'quick_message',
        senderId: currentUser.id,
        message: message.text,
        teamOnly: true
      }));
      
      // Add to own chat log
      handleIncomingMessage({
        senderId: currentUser.id,
        senderName: currentUser.name,
        message: message.text,
        timestamp: Date.now(),
        teamOnly: true
      });
    }
    setShowQuickMessages(false);
  };
  
  const addPin = (type, coordinate) => {
    const pin = {
      type: type.id,
      name: type.name,
      coordinate,
      playerId: currentUser.id,
      teamId: currentUser.teamId
    };
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'add_pin',
        pin
      }));
    }
    
    setShowPinSelector(false);
    setPendingPinLocation(null);
  };
  
  const handleMapPress = (event) => {
    if (selectedPinType) {
      addPin(selectedPinType, event.nativeEvent.coordinate);
      setSelectedPinType(null);
    } else {
      setPendingPinLocation(event.nativeEvent.coordinate);
      setShowPinSelector(true);
    }
  };
  
  const renderPlayerMarker = (playerId, player) => {
    // Skip if no valid location
    if (!player || !player.location || 
        !player.location.latitude || 
        !player.location.longitude ||
        player.location.latitude === 0 ||
        player.location.longitude === 0) {
      return null;
    }
    
    // Validate coordinates are within valid ranges
    if (Math.abs(player.location.latitude) > 90 || 
        Math.abs(player.location.longitude) > 180) {
      return null;
    }
    
    const team = teams[player.teamId];
    const markerColor = player.color || '#666666';
    const teamColor = team ? team.color : null;
    
    return (
      <Marker
        key={playerId}
        coordinate={{
          latitude: player.location.latitude,
          longitude: player.location.longitude
        }}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
      >
        <View style={styles.markerContainer}>
          {/* Player message bubble */}
          {playerMessages[playerId] && (
            <View style={styles.messageBubble}>
              <Text style={styles.messageBubbleText}>{playerMessages[playerId]}</Text>
            </View>
          )}
          
          {/* Player marker with direction */}
          <View style={[styles.playerMarker, { backgroundColor: markerColor, borderColor: teamColor || 'white' }]}>
            {/* Direction indicator container */}
            <View style={[
              styles.directionContainer,
              { transform: [{ rotate: `${player.location.heading || 0}deg` }] }
            ]}>
              <View style={[styles.directionBeam, { backgroundColor: markerColor }]} />
            </View>
            <Text style={styles.playerInitial}>{player.name ? player.name[0].toUpperCase() : '?'}</Text>
          </View>
          
          {/* Player name */}
          <Text style={styles.playerName}>{player.name || 'Unknown'}</Text>
        </View>
      </Marker>
    );
  };
  
  const renderPin = (pin) => {
    const pinType = pinTypes.find(p => p.id === pin.type);
    if (!pinType) return null;
    
    const IconComponent = pinType.icon;
    
    return (
      <Marker
        key={pin.id}
        coordinate={pin.coordinate}
        title={pin.name}
        description={`Added by ${pin.playerId}`}
      >
        <View style={[styles.pinMarker, { backgroundColor: pinType.color }]}>
          <IconComponent size={16} color="white" />
        </View>
      </Marker>
    );
  };
  
  if (showSetup) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.setupContainer}>
          <Text style={styles.title}>Airsoft Tactical Map</Text>
          
          {locationStatus !== 'Location active' && (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.statusText}>{locationStatus}</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.button, { opacity: userLocation ? 1 : 0.5 }]}
            onPress={setupPlayerAndCreate}
            disabled={!userLocation || loading}
          >
            <Users size={20} color="white" />
            <Text style={styles.buttonText}>Create Game Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { opacity: userLocation ? 1 : 0.5 }]}
            onPress={() => setShowJoinModal(true)}
            disabled={!userLocation || loading}
          >
            <MapPin size={20} color="white" />
            <Text style={styles.buttonText}>Join Game Session</Text>
          </TouchableOpacity>
          
          {loading && (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
          )}
        </View>
        
        {/* Join Session Modal */}
        <Modal visible={showJoinModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Join Game Session</Text>
              <Text style={styles.modalSubtitle}>Enter 6-character session code</Text>
              
              <TextInput
                style={styles.codeInput}
                value={inputSessionCode}
                onChangeText={setInputSessionCode}
                placeholder="ABC123"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                maxLength={6}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowJoinModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.joinButton]}
                  onPress={setupPlayerAndJoin}
                >
                  <Text style={styles.joinButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Player Setup Modal */}
        <Modal visible={showPlayerSetup} transparent animationType="slide">
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Player Setup</Text>
              
              <TextInput
                style={styles.nameInput}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Your Name"
                placeholderTextColor="#666"
                maxLength={20}
              />
              
              <Text style={styles.sectionTitle}>Choose Your Color</Text>
              <View style={styles.colorGrid}>
                {playerColors.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColor
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
              
              <Text style={styles.sectionTitle}>Choose Team (Optional)</Text>
              <View style={styles.teamGrid}>
                {Object.entries(teamColors).map(([teamId, color]) => (
                  <TouchableOpacity
                    key={teamId}
                    style={[
                      styles.teamOption,
                      { backgroundColor: color },
                      selectedTeam === teamId && styles.selectedTeam
                    ]}
                    onPress={() => setSelectedTeam(selectedTeam === teamId ? null : teamId)}
                  >
                    <Text style={styles.teamOptionText}>
                      {teamId.replace('team_', '').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowPlayerSetup(false);
                    setShowJoinModal(isCreatingGame ? false : true);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.joinButton]}
                  onPress={proceedWithGame}
                >
                  <Text style={styles.joinButtonText}>
                    {isCreatingGame ? 'Create' : 'Join'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }
  
  if (!userLocation) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Waiting for location...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        {/* Main Map */}
        <MapView
        ref={mapRef}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        onPress={handleMapPress}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {/* User location with direction */}
        <Marker
          coordinate={userLocation}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.markerContainer}>
            {/* Current player message bubble */}
            {playerMessages[currentUser.id] && (
              <View style={styles.messageBubble}>
                <Text style={styles.messageBubbleText}>{playerMessages[currentUser.id]}</Text>
              </View>
            )}
            
            <View style={[
              styles.userMarker,
              { 
                backgroundColor: currentUser.color || '#007AFF',
                borderColor: currentUser.teamId ? teamColors[currentUser.teamId] : 'white'
              }
            ]}>
              {/* Direction indicator container */}
              <View style={[
                styles.directionContainer,
                { transform: [{ rotate: `${heading}deg` }] }
              ]}>
                <View style={[styles.directionBeam, { backgroundColor: currentUser.color || '#007AFF' }]} />
              </View>
              <Text style={styles.playerInitial}>
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'ME'}
              </Text>
            </View>
            <Text style={styles.playerName}>You</Text>
          </View>
        </Marker>
        
        {/* Other players - render ALL players except current user */}
        {Object.entries(players).map(([playerId, player]) => {
          if (playerId === currentUser.id) return null;
          if (DEBUG_MODE) console.log(`Rendering player ${playerId}:`, player);
          return renderPlayerMarker(playerId, player);
        })}
        
        {/* Pins */}
        {pins.map(renderPin)}
      </MapView>
      
      {/* Session Info Bar */}
      {sessionCode && (
        <TouchableOpacity 
          style={styles.sessionBar}
          onPress={() => setShowSessionInfo(true)}
        >
          <Text style={styles.sessionCode}>
            Session: {sessionCode} 
            {DEBUG_MODE && ` (${Object.keys(players).length} players)`}
          </Text>
          <Share size={16} color="white" />
        </TouchableOpacity>
      )}
      
      {/* Compass Bar */}
      <View style={styles.compassBar}>
        <Compass size={20} color="white" />
        <Text style={styles.compassText}>
          {Math.round(heading)}° {getCardinalDirection(heading)}
        </Text>
      </View>
      
      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowChatLog(true)}
        >
          <Chat size={20} color="white" />
          {messages.length > 0 && (
            <View style={styles.messageBadge}>
              <Text style={styles.messageBadgeText}>{messages.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowQuickMessages(true)}
        >
          <MessageCircle size={20} color="white" />
        </TouchableOpacity>
        
        {isHost && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowTeamManager(true)}
          >
            <Users size={20} color="white" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            mapRef.current?.animateToRegion({
              ...userLocation,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01
            });
          }}
        >
          <Navigation size={20} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Team indicator */}
      {currentUser.teamId && (
        <View style={[
          styles.teamIndicator,
          { backgroundColor: teamColors[currentUser.teamId] }
        ]}>
          <Text style={styles.teamText}>
            {teams[currentUser.teamId]?.name || 'Team'}
          </Text>
        </View>
      )}
      
      {/* Session Info Modal */}
      <Modal visible={showSessionInfo} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Session Info</Text>
            <View style={styles.sessionInfoBox}>
              <Text style={styles.sessionInfoLabel}>Session Code:</Text>
              <Text style={styles.sessionInfoCode}>{sessionCode}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={shareSessionCode}
              >
                <Copy size={20} color="white" />
                <Text style={styles.copyButtonText}>Share Code</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sessionInfoPlayers}>
              Players: {Object.keys(players).length}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSessionInfo(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Chat Log Modal */}
      <Modal visible={showChatLog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: height * 0.8 }]}>
            <Text style={styles.modalTitle}>Team Chat</Text>
            <FlatList
              data={messages}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.chatMessage}>
                  <Text style={styles.chatSender}>{item.senderName}:</Text>
                  <Text style={styles.chatText}>{item.message}</Text>
                  <Text style={styles.chatTime}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              )}
              style={styles.chatList}
              inverted
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowChatLog(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Quick Messages Modal */}
      <Modal visible={showQuickMessages} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Quick Messages</Text>
            <ScrollView style={styles.messagesList}>
              {quickMessages.map(message => (
                <TouchableOpacity
                  key={message.id}
                  style={[styles.messageButton, { backgroundColor: message.color }]}
                  onPress={() => sendQuickMessage(message)}
                >
                  <Text style={styles.messageText}>{message.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQuickMessages(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Pin Selector Modal */}
      <Modal visible={showPinSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Pin</Text>
            <ScrollView style={styles.pinsList}>
              {pinTypes.map(pinType => {
                const IconComponent = pinType.icon;
                return (
                  <TouchableOpacity
                    key={pinType.id}
                    style={[styles.pinButton, { backgroundColor: pinType.color }]}
                    onPress={() => {
                      if (pendingPinLocation) {
                        addPin(pinType, pendingPinLocation);
                      }
                    }}
                  >
                    <IconComponent size={20} color="white" />
                    <Text style={styles.pinText}>{pinType.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowPinSelector(false);
                setPendingPinLocation(null);
              }}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Team Manager Modal (Host only) */}
      {isHost && (
        <Modal visible={showTeamManager} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Team Management</Text>
              <ScrollView style={styles.teamsList}>
                {Object.entries(teams).map(([teamId, team]) => (
                  <View key={teamId} style={styles.teamSection}>
                    <Text style={[styles.teamName, { color: team.color }]}>
                      {team.name} ({team.players.length})
                    </Text>
                    <View style={styles.teamPlayers}>
                      {Object.entries(players).map(([playerId, player]) => (
                        <TouchableOpacity
                          key={playerId}
                          style={[
                            styles.playerItem,
                            player.teamId === teamId && styles.playerInTeam
                          ]}
                          onPress={() => addPlayerToTeam(playerId, teamId)}
                        >
                          <View 
                            style={[styles.playerDot, { backgroundColor: player.color }]} 
                          />
                          <Text style={styles.playerItemText}>{player.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowTeamManager(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      </View>
    </SafeAreaView>
  );
};

// Helper function for compass directions
const getCardinalDirection = (heading) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: normalize(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: normalize(16),
    marginTop: normalize(10),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  statusText: {
    color: '#999',
    fontSize: normalize(14),
    marginLeft: normalize(10),
  },
  title: {
    fontSize: normalize(24),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: normalize(40),
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: normalize(20),
    paddingVertical: normalize(15),
    borderRadius: normalize(10),
    marginVertical: normalize(10),
    minWidth: normalize(200),
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
    marginLeft: normalize(10),
  },
  sessionBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? normalize(20) : normalize(40),
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(20),
    paddingVertical: normalize(10),
    borderRadius: normalize(20),
  },
  sessionCode: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: 'bold',
    marginRight: normalize(10),
  },
  compassBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? normalize(80) : normalize(100),
    left: normalize(20),
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(15),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
  },
  compassText: {
    color: 'white',
    fontSize: normalize(14),
    fontWeight: '600',
    marginLeft: normalize(8),
  },
  controlPanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? normalize(20) : normalize(40),
    right: normalize(20),
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: normalize(5),
  },
  messageBadge: {
    position: 'absolute',
    top: normalize(-5),
    right: normalize(-5),
    backgroundColor: '#FF3B30',
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBadgeText: {
    color: 'white',
    fontSize: normalize(12),
    fontWeight: 'bold',
  },
  teamIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? normalize(80) : normalize(100),
    right: normalize(20),
    paddingHorizontal: normalize(15),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
  },
  teamText: {
    color: 'white',
    fontSize: normalize(14),
    fontWeight: '600',
  },
  markerContainer: {
    alignItems: 'center',
  },
  userMarker: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'visible',
  },
  playerMarker: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(15),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'visible',
  },
  directionContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionBeam: {
    position: 'absolute',
    width: normalize(4),
    height: normalize(20),
    borderRadius: normalize(2),
    bottom: '50%',
    marginBottom: normalize(15),
  },
  playerInitial: {
    color: 'white',
    fontSize: normalize(14),
    fontWeight: 'bold',
    zIndex: 1,
  },
  playerName: {
    color: 'white',
    fontSize: normalize(12),
    marginTop: normalize(5),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: normalize(6),
    paddingVertical: normalize(2),
    borderRadius: normalize(10),
  },
  messageBubble: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(5),
    borderRadius: normalize(15),
    marginBottom: normalize(5),
    maxWidth: normalize(150),
  },
  messageBubbleText: {
    color: 'white',
    fontSize: normalize(14),
  },
  pinMarker: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: normalize(15),
    padding: normalize(20),
    width: Math.min(width * 0.85, normalize(400)),
    maxHeight: height * 0.7,
  },
  modalTitle: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  modalSubtitle: {
    fontSize: normalize(14),
    color: '#999',
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  sectionTitle: {
    fontSize: normalize(16),
    color: '#999',
    marginTop: normalize(20),
    marginBottom: normalize(10),
  },
  codeInput: {
    backgroundColor: '#333',
    color: 'white',
    fontSize: normalize(24),
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: normalize(15),
    paddingHorizontal: normalize(20),
    borderRadius: normalize(10),
    marginBottom: normalize(20),
    letterSpacing: 5,
  },
  nameInput: {
    backgroundColor: '#333',
    color: 'white',
    fontSize: normalize(18),
    paddingVertical: normalize(12),
    paddingHorizontal: normalize(15),
    borderRadius: normalize(10),
    marginBottom: normalize(10),
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    margin: normalize(5),
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: 'white',
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  teamOption: {
    paddingHorizontal: normalize(20),
    paddingVertical: normalize(10),
    borderRadius: normalize(20),
    margin: normalize(5),
  },
  selectedTeam: {
    borderWidth: 3,
    borderColor: 'white',
  },
  teamOptionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: normalize(14),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: normalize(20),
  },
  modalButton: {
    flex: 1,
    paddingVertical: normalize(12),
    borderRadius: normalize(10),
    alignItems: 'center',
    marginHorizontal: normalize(5),
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  joinButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  joinButtonText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  sessionInfoBox: {
    backgroundColor: '#333',
    borderRadius: normalize(10),
    padding: normalize(20),
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  sessionInfoLabel: {
    color: '#999',
    fontSize: normalize(14),
    marginBottom: normalize(10),
  },
  sessionInfoCode: {
    color: 'white',
    fontSize: normalize(32),
    fontWeight: 'bold',
    letterSpacing: 5,
    marginBottom: normalize(15),
  },
  sessionInfoPlayers: {
    color: '#999',
    fontSize: normalize(16),
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  copyButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(20),
    borderRadius: normalize(10),
  },
  copyButtonText: {
    color: 'white',
    fontSize: normalize(14),
    fontWeight: '600',
    marginLeft: normalize(8),
  },
  chatList: {
    maxHeight: normalize(300),
    marginBottom: normalize(10),
  },
  chatMessage: {
    backgroundColor: '#333',
    padding: normalize(10),
    borderRadius: normalize(10),
    marginVertical: normalize(5),
  },
  chatSender: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: normalize(2),
    fontSize: normalize(14),
  },
  chatText: {
    color: 'white',
    fontSize: normalize(14),
  },
  chatTime: {
    color: '#666',
    fontSize: normalize(11),
    marginTop: normalize(2),
  },
  messagesList: {
    maxHeight: normalize(300),
  },
  messageButton: {
    paddingVertical: normalize(15),
    paddingHorizontal: normalize(20),
    borderRadius: normalize(10),
    marginVertical: normalize(5),
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  pinsList: {
    maxHeight: normalize(300),
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(15),
    paddingHorizontal: normalize(20),
    borderRadius: normalize(10),
    marginVertical: normalize(5),
  },
  pinText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
    marginLeft: normalize(12),
  },
  teamsList: {
    maxHeight: normalize(400),
  },
  teamSection: {
    paddingVertical: normalize(10),
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  teamName: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    marginBottom: normalize(10),
  },
  teamPlayers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  playerItem: {
    backgroundColor: '#333',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(6),
    borderRadius: normalize(15),
    margin: normalize(4),
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerInTeam: {
    backgroundColor: '#007AFF',
  },
  playerDot: {
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
    marginRight: normalize(6),
  },
  playerItemText: {
    color: 'white',
    fontSize: normalize(12),
  },
  closeButton: {
    backgroundColor: '#666',
    paddingVertical: normalize(12),
    borderRadius: normalize(10),
    alignItems: 'center',
    marginTop: normalize(20),
  },
  closeButtonText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  // Icon styles
  iconCircle: {
    borderWidth: 2,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRect: {
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AirsoftTacticalMap;