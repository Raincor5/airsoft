import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { 
  colors, 
  components, 
  normalize, 
  spacing, 
  isSmallScreen,
  getResponsiveSize 
} from '../../utils/styles';

const PlayerMarker = ({ 
  player, 
  isCurrentUser = false, 
  coordinate, 
  heading, 
  message = null,
  tracksViewChanges = true,
  onPress
}) => {
  // Safeguard: Do not render if required data is missing
  if (!coordinate || !coordinate.latitude || !coordinate.longitude) {
    console.log('Skipping marker render due to missing coordinates');
    return null;
  }
  
  // Safeguard: Check for valid player data
  if (!player || typeof player !== 'object') {
    console.log('Skipping marker render due to invalid player data');
    return null;
  }
  
  // Safeguard: Never render a server copy of the current user
  // This should never happen with our new state management, but just in case
  if (player && player.id && player.id.includes('player_') && !isCurrentUser) {
    console.log('Prevented rendering of duplicate current user:', player.id);
    return null;
  }

  const markerSize = isCurrentUser 
    ? getResponsiveSize(normalize(30), normalize(36), normalize(40), normalize(44))
    : getResponsiveSize(normalize(24), normalize(30), normalize(34), normalize(38));
    
  const iconSize = isCurrentUser
    ? getResponsiveSize(normalize(16), normalize(20), normalize(22), normalize(24))
    : getResponsiveSize(normalize(14), normalize(16), normalize(18), normalize(20));
  
  // Apply heading rotation to direction indicator
  const directionStyle = heading !== undefined && heading !== null
    ? { transform: [{ rotate: `${heading}deg` }] }
    : {};
  
  const markerColor = player?.color || colors.primary;
  
  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={tracksViewChanges}
      onPress={onPress}
    >
      <View style={styles.markerContainer}>
        {/* Message bubble */}
        {message && (
          <View style={styles.messageBubble}>
            <Text style={styles.messageBubbleText}>{message}</Text>
          </View>
        )}
        
        <View 
          style={[
            isCurrentUser ? styles.userMarker : styles.playerMarker,
            { backgroundColor: markerColor },
            { width: markerSize, height: markerSize, borderRadius: markerSize / 2 }
          ]}
        >
          <Ionicons 
            name={isCurrentUser ? "person" : "person-outline"} 
            size={iconSize} 
            color="white" 
            style={directionStyle}
          />
        </View>
        
        <View style={styles.nameContainer}>
          <Text style={styles.nameText}>
            {isCurrentUser ? "You" : (player?.name || "Unknown")}
          </Text>
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    ...components.markerContainer,
  },
  userMarker: {
    ...components.userMarker,
  },
  playerMarker: {
    ...components.playerMarker,
  },
  nameContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: isSmallScreen ? normalize(6) : normalize(8),
    paddingVertical: isSmallScreen ? normalize(2) : normalize(4),
    borderRadius: normalize(10),
    marginTop: isSmallScreen ? normalize(2) : normalize(4),
  },
  nameText: {
    color: colors.text.primary,
    fontSize: getResponsiveSize(normalize(10), normalize(12), normalize(13), normalize(14)),
    fontWeight: '600',
    textAlign: 'center',
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
    fontSize: getResponsiveSize(normalize(12), normalize(14), normalize(14), normalize(16)),
  }
});

export default PlayerMarker;