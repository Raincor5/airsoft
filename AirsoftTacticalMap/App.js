import React, { useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import SetupScreen from './src/components/Setup/SetupScreen';
import GameMapView from './src/components/Map/MapView';
import { useGameSession } from './src/hooks/useGameSession';
import { useLocation } from './src/hooks/useLocation';
import gameService from './src/services/gameService';

// Default location (used as fallback when real location is not available)
const DEFAULT_LOCATION = {
  latitude: 37.78825,
  longitude: -122.4324,
};

const AirsoftTacticalMap = () => {
  const { location, locationStatus, heading, error: locationError } = useLocation();
  const { 
    gameSession, 
    currentUser, 
    players, 
    otherPlayers,
    teams, 
    pins, 
    messages,
    playerMessages,
    isHost,
    sessionCode,
    createSession,
    joinSession,
    updatePlayer,
    updatePlayerLocation,
    addPin,
    removePin,
    sendMessage,
    receiveMessage,
    assignTeam,
    resetSession,
    updateFromServer,
    setCurrentUser
  } = useGameSession();
  
  // Ensure we have a location value, fallback to default if not available
  const safeLocation = location || currentUser?.location || DEFAULT_LOCATION;
  
  const isConnected = useRef(false);
  const loading = useRef(false);

  // Setup game service handlers
  useEffect(() => {
    gameService.registerCallbacks({
      onSessionUpdate: (session) => {
        console.log('SERVER DATA RECEIVED:', JSON.stringify(session));
        updateFromServer(session);
      },
      onLocationUpdate: (playerId, location) => {
        if (playerId !== currentUser.id) {
          updatePlayerLocation(playerId, location);
        }
      },
      onPinAdded: (pin) => {
        addPin(pin);
      },
      onPinRemoved: (pinId) => {
        removePin(pinId);
      },
      onMessageReceived: (data) => {
        receiveMessage(data);
      },
      onTeamAssignment: (data) => {
        updateFromServer({ teams: data.teams, players: data.players });
        if (data.playerId === currentUser.id) {
          assignTeam(data.playerId, data.teamId);
        }
      },
      onPlayerJoined: (player) => {
        if (player.id !== currentUser.id) {
          updatePlayer(player.id, player);
        }
      },
      onPlayerLeft: (playerId) => {
        updatePlayer(playerId, null);
      },
      onPlayerUpdated: (player) => {
        if (player.id !== currentUser.id) {
          updatePlayer(player.id, player);
        }
      },
      onSessionEnded: () => {
        resetSession();
        gameService.disconnect();
      },
      onConnectionError: (error) => {
        console.error('Connection error:', error);
        loading.current = false;
      },
      onDisconnect: () => {
        isConnected.current = false;
      }
    });
    
    return () => {
      gameService.disconnect();
    };
  }, [currentUser.id]);
  
  // Send location updates
  useEffect(() => {
    if (isConnected.current && location && gameSession) {
      // Update local user's location directly
      if (currentUser.id && location) {
        // Update the current user's location
        setCurrentUser(prev => ({
          ...prev,
          location: {
            ...location,
            heading
          }
        }));
      }
      
      // Then send to server
      gameService.updateLocation(currentUser.id, {
        ...location,
        heading
      });
    }
  }, [location, heading, gameSession, currentUser.id]);

  const handleCreateSession = (playerData) => {
    const { sessionId, code } = createSession(playerData);
    loading.current = true;
    
    gameService.connect(sessionId, `Game ${code}`, playerData)
      .then(() => {
        isConnected.current = true;
        loading.current = false;
      })
      .catch(error => {
        console.error('Failed to create session:', error);
        loading.current = false;
      });
      
    return { sessionId, code };
  };

  const handleJoinSession = (code, playerData) => {
    const { sessionId } = joinSession(code, playerData);
    loading.current = true;
    
    gameService.connect(sessionId, null, playerData)
      .then(() => {
        isConnected.current = true;
        loading.current = false;
      })
      .catch(error => {
        console.error('Failed to join session:', error);
        loading.current = false;
      });
      
    return { sessionId };
  };

  const handleAddPin = (pin) => {
    const pinWithId = {
      ...pin,
      id: `pin_${Date.now()}`
    };
    gameService.addPin(pinWithId);
  };

  const handleRemovePin = (pinId) => {
    gameService.removePin(pinId);
  };

  const handleSendMessage = (message) => {
    const messageData = sendMessage(message);
    gameService.sendMessage(
      currentUser.id,
      currentUser.name,
      message,
      true
    );
  };

  const handleAssignTeam = (playerId, teamId) => {
    if (isHost) {
      gameService.assignTeam(playerId, teamId);
    }
  };

  const handleUpdatePlayer = (playerId, updates) => {
    gameService.updatePlayer(playerId, updates);
  };

  // Loading state
  if (!location && locationStatus !== 'Location error') {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Waiting for location...</Text>
              <Text style={styles.statusText}>{locationStatus}</Text>
            </View>
      </SafeAreaView>
    );
  }
  
  // Setup screen
  if (!gameSession) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <SetupScreen
          locationStatus={locationStatus}
          userLocation={location}
          onCreateSession={handleCreateSession}
          onJoinSession={handleJoinSession}
          loading={loading.current}
        />
      </SafeAreaView>
    );
  }
  
  // Game map
  return (
    <SafeAreaView style={styles.safeContainer}>
      <GameMapView
        userLocation={safeLocation}
        heading={heading || 0}
        currentUser={currentUser}
        players={players}
        otherPlayers={otherPlayers}
        teams={teams}
        pins={pins}
        messages={messages}
        playerMessages={playerMessages}
        isHost={isHost}
        sessionCode={sessionCode}
        onAddPin={handleAddPin}
        onRemovePin={handleRemovePin}
        onSendMessage={handleSendMessage}
        onAssignTeam={handleAssignTeam}
        onUpdatePlayer={handleUpdatePlayer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  statusText: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
});

export default AirsoftTacticalMap;