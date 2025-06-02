import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

const PlayerMarker = ({ 
  player, 
  isCurrentUser = false, 
  coordinate, 
  heading, 
  message = null,
  onPress
}) => {
  // Safeguard: Do not render if required data is missing
  if (!coordinate || !coordinate.latitude || !coordinate.longitude) {
    return null;
  }
  
  if (!player || typeof player !== 'object') {
    return null;
  }

  // CRITICAL: Memoize the entire marker content to prevent re-renders
  const markerContent = useMemo(() => {
    const currentHeading = heading || 0;
    
    return (
      <View style={styles.container}>
        {/* Direction cone */}
        <View 
          style={[
            styles.cone,
            { transform: [{ rotate: `${currentHeading}deg` }] }
          ]}
        >
          <View style={styles.coneTriangle} />
        </View>
        
        {/* Main dot */}
        <View style={isCurrentUser ? styles.currentUserDot : styles.otherPlayerDot} />
        
        {/* Player name */}
        <Text style={styles.nameText}>
          {isCurrentUser ? "You" : (player?.name || "?")}
        </Text>
        
        {/* Message bubble */}
        {message && (
          <View style={styles.messageBubble}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}
      </View>
    );
  }, [heading, isCurrentUser, player?.name, message]);

  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={false}
      onPress={onPress}
    >
      <View style={styles.markerWrapper}>
        {markerContent}
      </View>
    </Marker>
  );
};

// COMPLETELY STATIC STYLES - NO VARIABLES OR CALCULATIONS
const styles = StyleSheet.create({
  markerWrapper: {
    // Wrapper to isolate marker content - fixes teleporting bug
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cone: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  coneTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(0, 122, 255, 0.4)',
  },
  currentUserDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  otherPlayerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4444', // Default red color
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  nameText: {
    position: 'absolute',
    top: 45,
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  messageBubble: {
    position: 'absolute',
    bottom: 45,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: 100,
  },
  messageText: {
    color: 'white',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default PlayerMarker;