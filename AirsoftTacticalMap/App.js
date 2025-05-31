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
  Platform
} from 'react-native';
import { 
  MapView, 
  Marker, 
  Circle 
} from 'react-native-maps';
import { 
  Compass,
  Users,
  MessageCircle,
  Flag,
  AlertTriangle,
  Eye,
  Zap,
  Target,
  Shield,
  Navigation,
  Settings,
  Plus,
  Send,
  MapPin
} from 'lucide-react';

const { width, height } = Dimensions.get('window');

// Mock WebSocket class for demonstration
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen({});
    }, 100);
  }
  
  send(data) {
    console.log('Sending:', data);
    // Simulate receiving messages from other players
    setTimeout(() => {
      if (this.onmessage) {
        const mockMessage = {
          data: JSON.stringify({
            type: 'location_update',
            playerId: 'player_2',
            teamId: 'team_red',
            location: {
              latitude: 37.78835 + (Math.random() - 0.5) * 0.01,
              longitude: -122.4324 + (Math.random() - 0.5) * 0.01,
              heading: Math.random() * 360
            }
          })
        };
        this.onmessage(mockMessage);
      }
    }, 1000);
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({});
  }
}

const AirsoftTacticalMap = () => {
  // Core state
  const [isHost, setIsHost] = useState(false);
  const [gameSession, setGameSession] = useState(null);
  const [currentUser, setCurrentUser] = useState({
    id: 'player_1',
    name: 'Player 1',
    teamId: null
  });
  const [players, setPlayers] = useState({});
  const [teams, setTeams] = useState({});
  const [pins, setPins] = useState([]);
  
  // UI state
  const [showSetup, setShowSetup] = useState(true);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [showPinSelector, setShowPinSelector] = useState(false);
  const [selectedPinType, setSelectedPinType] = useState(null);
  const [pendingPinLocation, setPendingPinLocation] = useState(null);
  
  // Location and sensor state
  const [userLocation, setUserLocation] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    heading: 0
  });
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  // WebSocket
  const ws = useRef(null);
  const mapRef = useRef(null);
  
  // Team colors
  const teamColors = {
    team_red: '#FF4444',
    team_blue: '#4444FF',
    team_green: '#44FF44',
    team_yellow: '#FFFF44'
  };
  
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
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (gameSession) {
      ws.current = new MockWebSocket(`ws://localhost:8080/game/${gameSession.id}`);
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      ws.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
      
      return () => {
        if (ws.current) {
          ws.current.close();
        }
      };
    }
  }, [gameSession]);
  
  // Simulate location updates with heading
  useEffect(() => {
    const interval = setInterval(() => {
      setUserLocation(prev => ({
        ...prev,
        heading: (prev.heading + Math.random() * 10 - 5 + 360) % 360
      }));
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'location_update':
        setPlayers(prev => ({
          ...prev,
          [data.playerId]: {
            ...prev[data.playerId],
            location: data.location
          }
        }));
        break;
      case 'pin_added':
        setPins(prev => [...prev, data.pin]);
        break;
      case 'quick_message':
        Alert.alert(`${data.playerName}`, data.message);
        break;
      case 'team_update':
        setTeams(data.teams);
        setPlayers(data.players);
        break;
    }
  };
  
  const createGame = (sessionName) => {
    const session = {
      id: Date.now().toString(),
      name: sessionName,
      hostId: currentUser.id
    };
    setGameSession(session);
    setIsHost(true);
    setShowSetup(false);
    
    // Initialize default teams
    const defaultTeams = {
      team_red: { id: 'team_red', name: 'Red Team', color: teamColors.team_red, players: [] },
      team_blue: { id: 'team_blue', name: 'Blue Team', color: teamColors.team_blue, players: [] }
    };
    setTeams(defaultTeams);
  };
  
  const joinGame = (sessionId) => {
    const session = {
      id: sessionId,
      name: 'Joined Game',
      hostId: 'other_player'
    };
    setGameSession(session);
    setIsHost(false);
    setShowSetup(false);
  };
  
  const addPlayerToTeam = (playerId, teamId) => {
    if (!isHost) return;
    
    setTeams(prev => {
      const newTeams = { ...prev };
      // Remove player from all teams
      Object.keys(newTeams).forEach(tId => {
        newTeams[tId].players = newTeams[tId].players.filter(pId => pId !== playerId);
      });
      // Add to new team
      if (newTeams[teamId]) {
        newTeams[teamId].players.push(playerId);
      }
      return newTeams;
    });
    
    setPlayers(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], teamId }
    }));
    
    // Send update via WebSocket
    if (ws.current) {
      ws.current.send(JSON.stringify({
        type: 'team_update',
        teams,
        players
      }));
    }
  };
  
  const sendQuickMessage = (message) => {
    if (ws.current) {
      ws.current.send(JSON.stringify({
        type: 'quick_message',
        playerId: currentUser.id,
        playerName: currentUser.name,
        teamId: currentUser.teamId,
        message: message.text
      }));
    }
    setShowQuickMessages(false);
    Alert.alert('Message Sent', `"${message.text}" sent to team`);
  };
  
  const addPin = (type, coordinate) => {
    const pin = {
      id: Date.now().toString(),
      type: type.id,
      name: type.name,
      coordinate,
      playerId: currentUser.id,
      teamId: currentUser.teamId,
      timestamp: new Date().toISOString()
    };
    
    setPins(prev => [...prev, pin]);
    
    if (ws.current) {
      ws.current.send(JSON.stringify({
        type: 'pin_added',
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
    const team = teams[player.teamId];
    const color = team ? team.color : '#666666';
    
    return (
      <Marker
        key={playerId}
        coordinate={player.location}
        title={player.name}
        description={team ? team.name : 'No Team'}
      >
        <View style={[styles.playerMarker, { backgroundColor: color }]}>
          <View style={[
            styles.directionCone,
            { 
              transform: [{ rotate: `${player.location.heading || 0}deg` }],
              borderBottomColor: color
            }
          ]} />
        </View>
      </Marker>
    );
  };
  
  const renderPin = (pin) => {
    const pinType = pinTypes.find(p => p.id === pin.type);
    if (!pinType) return null;
    
    return (
      <Marker
        key={pin.id}
        coordinate={pin.coordinate}
        title={pin.name}
        description={`Added by ${pin.playerId}`}
      >
        <View style={[styles.pinMarker, { backgroundColor: pinType.color }]}>
          <pinType.icon size={16} color="white" />
        </View>
      </Marker>
    );
  };
  
  if (showSetup) {
    return (
      <View style={styles.container}>
        <View style={styles.setupContainer}>
          <Text style={styles.title}>Airsoft Tactical Map</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => createGame('New Game Session')}
          >
            <Users strokeWidth={2} size={20} color="white" />
            <Text style={styles.buttonText}>Create Game Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => joinGame('demo_session')}
          >
            <MapPin strokeWidth={2} size={20} color="white" />
            <Text style={styles.buttonText}>Join Game Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Main Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsCompass={true}
        toolbarEnabled={false}
      >
        {/* User location with direction cone */}
        <Marker
          coordinate={userLocation}
          title="You"
          description={currentUser.name}
        >
          <View style={[
            styles.userMarker,
            { backgroundColor: currentUser.teamId ? teamColors[currentUser.teamId] : '#007AFF' }
          ]}>
            <View style={[
              styles.directionCone,
              { 
                transform: [{ rotate: `${userLocation.heading}deg` }],
                borderBottomColor: currentUser.teamId ? teamColors[currentUser.teamId] : '#007AFF'
              }
            ]} />
          </View>
        </Marker>
        
        {/* Other players */}
        {Object.entries(players).map(([playerId, player]) => 
          player.location ? renderPlayerMarker(playerId, player) : null
        )}
        
        {/* Pins */}
        {pins.map(renderPin)}
      </MapView>
      
      {/* Compass Bar */}
      <View style={styles.compassBar}>
        <Compass strokeWidth={2} size={20} color="white" />
        <Text style={styles.compassText}>
          {Math.round(userLocation.heading)}° {getCardinalDirection(userLocation.heading)}
        </Text>
      </View>
      
      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowQuickMessages(true)}
        >
          <MessageCircle strokeWidth={2} size={20} color="white" />
        </TouchableOpacity>
        
        {isHost && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowTeamManager(true)}
          >
            <Users strokeWidth={2} size={20} color="white" />
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
          <Navigation strokeWidth={2} size={20} color="white" />
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
              {pinTypes.map(pinType => (
                <TouchableOpacity
                  key={pinType.id}
                  style={[styles.pinButton, { backgroundColor: pinType.color }]}
                  onPress={() => {
                    if (pendingPinLocation) {
                      addPin(pinType, pendingPinLocation);
                    }
                  }}
                >
                  <pinType.icon strokeWidth={2} size={20} color="white" />
                  <Text style={styles.pinText}>{pinType.name}</Text>
                </TouchableOpacity>
              ))}
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
                    {/* Team management would go here */}
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
  );
};

// Helper function for compass directions
const getCardinalDirection = (heading) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
};

const styles = StyleSheet.create({
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 200,
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  compassBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  compassText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  teamIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  teamText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  userMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  playerMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  directionCone: {
    position: 'absolute',
    top: -15,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  pinMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderRadius: 15,
    padding: 20,
    width: width * 0.85,
    maxHeight: height * 0.7,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  messagesList: {
    maxHeight: 300,
  },
  messageButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pinsList: {
    maxHeight: 300,
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 5,
  },
  pinText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  teamsList: {
    maxHeight: 300,
  },
  teamSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AirsoftTacticalMap;