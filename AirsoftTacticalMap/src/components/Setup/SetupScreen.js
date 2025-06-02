import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Icons } from '../Icons/index';
import JoinSessionModal from '../Modals/JoinSessionModal';
import PlayerSetupModal from '../Modals/PlayerSetupModal';
import { PLAYER_COLORS } from '../../utils/constants';
import { normalize } from '../../utils/styles';

const SetupScreen = ({ 
  locationStatus, 
  userLocation, 
  onCreateSession, 
  onJoinSession,
  loading 
}) => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [sessionCode, setSessionCode] = useState('');

  const setupPlayerAndCreate = () => {
    setIsCreatingGame(true);
    setShowPlayerSetup(true);
  };

  const handleJoinSession = (code) => {
    setSessionCode(code);
    setIsCreatingGame(false);
    setShowJoinModal(false);
    setShowPlayerSetup(true);
  };

  const handlePlayerSetup = (playerData) => {
    if (isCreatingGame) {
      onCreateSession({
        ...playerData,
        location: userLocation
      });
    } else {
      onJoinSession(sessionCode, {
        ...playerData,
        location: userLocation
      });
    }
    setShowPlayerSetup(false);
  };

  return (
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
        <Icons.Users size={20} color="white" />
        <Text style={styles.buttonText}>Create Game Session</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton, { opacity: userLocation ? 1 : 0.5 }]}
        onPress={() => setShowJoinModal(true)}
        disabled={!userLocation || loading}
      >
        <Icons.MapPin size={20} color="white" />
        <Text style={styles.buttonText}>Join Game Session</Text>
      </TouchableOpacity>
      
      {loading && (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      )}

      {/* Join Session Modal */}
      <JoinSessionModal 
        visible={showJoinModal} 
        onJoin={handleJoinSession}
        onCancel={() => setShowJoinModal(false)}
      />
      
      {/* Player Setup Modal */}
      <PlayerSetupModal
        visible={showPlayerSetup}
        initialData={{ 
          name: '', 
          color: PLAYER_COLORS[0] 
        }}
        onSubmit={handlePlayerSetup}
        onCancel={() => {
          setShowPlayerSetup(false);
          if (!isCreatingGame) {
            setShowJoinModal(true);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: normalize(20),
  },
  title: {
    fontSize: normalize(24),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: normalize(40),
    textAlign: 'center',
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
  }
});

export default SetupScreen;