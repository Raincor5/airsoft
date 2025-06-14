import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Dimensions,
  Platform,
  FlatList
} from 'react-native';
import MapView from 'react-native-maps';
import SessionInfoModal from '../Modals/SessionInfoModal';
import ChatModal from '../Modals/ChatModal';
import QuickMessagesModal from '../Modals/QuickMessagesModal';
import TeamManagerModal from '../Modals/TeamManagerModal';
import PinSelectorModal from '../Modals/PinSelectorModal';
import PinMarker from './PinMarker';
import PlayerMarker from './PlayerMarker';
import SessionBar from '../UI/SessionBar';
import CompassBar from '../UI/CompassBar';
import TeamIndicator from '../UI/TeamIndicator';
import ControlPanel from '../UI/ControlPanel';
import { PIN_TYPES, QUICK_MESSAGES } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

// Responsive scaling
const scale = width / 375;
const normalize = (size) => Math.round(scale * size);

// Default location (used when real location is not available)
const DEFAULT_LOCATION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const GameMapView = ({
  userLocation,
  heading,
  currentUser,
  players,
  otherPlayers,
  teams,
  pins,
  messages,
  playerMessages,
  isHost,
  sessionCode,
  onAddPin,
  onRemovePin,
  onSendMessage,
  onAssignTeam,
  onUpdatePlayer
}) => {
  // Ensure userLocation is defined with fallback values
  const safeUserLocation = userLocation || (currentUser?.location || DEFAULT_LOCATION);
  
  // UI state
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [showChatLog, setShowChatLog] = useState(false);
  const [showPinSelector, setShowPinSelector] = useState(false);
  const [pendingPinLocation, setPendingPinLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: safeUserLocation.latitude,
    longitude: safeUserLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  // Refs
  const mapRef = useRef(null);

  // Calculate player count: current user + other players
  const totalPlayerCount = 1 + (otherPlayers ? Object.keys(otherPlayers).length : 0);

  // Handle map press
  const handleMapPress = (event) => {
    setPendingPinLocation(event.nativeEvent.coordinate);
    setShowPinSelector(true);
  };

  // Handle adding a pin
  const handleAddPin = (type) => {
    if (!pendingPinLocation) return;
    
    const pin = {
      type: type.id,
      name: type.name,
      coordinate: pendingPinLocation,
      playerId: currentUser.id,
      teamId: currentUser.teamId
    };
    
    onAddPin(pin);
    setShowPinSelector(false);
    setPendingPinLocation(null);
  };

  // Handle sending a quick message
  const handleSendQuickMessage = (message) => {
    onSendMessage(message.text);
    setShowQuickMessages(false);
  };

  // Center map on user location
  const centerOnUser = () => {
    if (!safeUserLocation) return;
    
    mapRef.current?.animateToRegion({
      latitude: safeUserLocation.latitude,
      longitude: safeUserLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
  };

  console.log('MapView render - Current user:', currentUser.id);
  console.log('MapView render - Other players:', Object.keys(otherPlayers || {}));
  console.log('MapView render - Total players:', totalPlayerCount);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        onRegionChangeComplete={setMapRegion}
        onPress={handleMapPress}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {/* Current user marker - ONLY render if we have a valid location */}
        {safeUserLocation && currentUser && (
          <PlayerMarker
            player={currentUser}
            isCurrentUser={true}
            coordinate={{
              latitude: safeUserLocation.latitude,
              longitude: safeUserLocation.longitude
            }}
            heading={heading}
            message={playerMessages[currentUser.id]}
            tracksViewChanges={false}
          />
        )}
        
        {/* Other players - Only render from otherPlayers list */}
        {otherPlayers && Object.entries(otherPlayers).map(([playerId, player]) => {
          // Skip if no location data
          if (!player?.location) {
            console.log('Skipping player marker for', playerId, 'no location');
            return null;
          }
          
          // Skip if this is somehow the current user (shouldn't happen)
          if (playerId === currentUser.id) {
            console.log('Prevented rendering current user as other player:', playerId);
            return null;
          }
          
          console.log('Rendering other player marker:', playerId, player.name);
          
          return (
            <PlayerMarker
              key={playerId}
              player={player}
              isCurrentUser={false}
              coordinate={{
                latitude: player.location.latitude,
                longitude: player.location.longitude
              }}
              heading={player.location.heading || 0}
              message={playerMessages[playerId]}
              tracksViewChanges={false}
            />
          );
        })}
        
        {/* Pins */}
        {(pins || []).map(pin => (
          <PinMarker 
            key={pin.id} 
            pin={pin} 
            onPress={() => onRemovePin(pin.id)}
          />
        ))}
      </MapView>

      {/* Session Bar */}
      {sessionCode && (
        <SessionBar
          sessionCode={sessionCode}
          playerCount={totalPlayerCount}
          onPress={() => setShowSessionInfo(true)}
        />
      )}
      
      {/* Compass Bar */}
      <CompassBar heading={heading} />
      
      {/* Control Panel */}
      <ControlPanel
        messageCount={messages ? messages.length : 0}
        isHost={isHost}
        onChatPress={() => setShowChatLog(true)}
        onMessagePress={() => setShowQuickMessages(true)}
        onTeamPress={() => setShowTeamManager(true)}
        onCenterPress={centerOnUser}
      />
      
      {/* Team indicator */}
      {currentUser?.teamId && teams?.[currentUser.teamId] && (
        <TeamIndicator team={teams[currentUser.teamId]} />
      )}

      {/* Session Info Modal */}
      <SessionInfoModal
        visible={showSessionInfo}
        sessionCode={sessionCode}
        playerCount={totalPlayerCount}
        onClose={() => setShowSessionInfo(false)}
      />
      
      {/* Chat Log Modal */}
      <ChatModal
        visible={showChatLog}
        messages={messages || []}
        onClose={() => setShowChatLog(false)}
      />
      
      {/* Quick Messages Modal */}
      <QuickMessagesModal
        visible={showQuickMessages}
        messages={QUICK_MESSAGES}
        onSendMessage={handleSendQuickMessage}
        onClose={() => setShowQuickMessages(false)}
      />
      
      {/* Pin Selector Modal */}
      <PinSelectorModal
        visible={showPinSelector}
        pinTypes={PIN_TYPES}
        onSelectPin={handleAddPin}
        onClose={() => {
          setShowPinSelector(false);
          setPendingPinLocation(null);
        }}
      />
      
      {/* Team Manager Modal (Host only) */}
      {isHost && (
        <TeamManagerModal
          visible={showTeamManager}
          teams={teams || {}}
          players={{
            [currentUser.id]: currentUser, // Add current user
            ...(otherPlayers || {}) // Add other players
          }}
          onAssignTeam={onAssignTeam}
          onClose={() => setShowTeamManager(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  }
});

export default GameMapView;