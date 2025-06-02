import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Icons } from '../Icons/index';
import { normalize, isSmallScreen, getResponsiveSize } from '../../utils/styles';

const ControlPanel = ({
  messageCount,
  isHost,
  onChatPress,
  onMessagePress,
  onTeamPress,
  onCenterPress
}) => {
  // Determine icon size based on screen size
  const iconSize = getResponsiveSize(16, 20, 22, 24);
  
  return (
    <View style={styles.controlPanel}>
      <TouchableOpacity style={styles.controlButton} onPress={onChatPress}>
        <Icons.Chat size={iconSize} color="white" />
        {messageCount > 0 && (
          <View style={styles.messageBadge}>
            <Text style={styles.messageBadgeText}>{messageCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.controlButton} onPress={onMessagePress}>
        <Icons.MessageCircle size={iconSize} color="white" />
      </TouchableOpacity>
      
      {isHost && (
        <TouchableOpacity style={styles.controlButton} onPress={onTeamPress}>
          <Icons.Users size={iconSize} color="white" />
        </TouchableOpacity>
      )}
      
      <TouchableOpacity style={styles.controlButton} onPress={onCenterPress}>
        <Icons.Navigation size={iconSize} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  controlPanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? normalize(20) : normalize(40),
    right: normalize(20),
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    width: getResponsiveSize(normalize(40), normalize(50), normalize(55), normalize(60)),
    height: getResponsiveSize(normalize(40), normalize(50), normalize(55), normalize(60)),
    borderRadius: getResponsiveSize(normalize(20), normalize(25), normalize(27.5), normalize(30)),
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: isSmallScreen ? normalize(4) : normalize(5),
  },
  messageBadge: {
    position: 'absolute',
    top: isSmallScreen ? normalize(-3) : normalize(-5),
    right: isSmallScreen ? normalize(-3) : normalize(-5),
    backgroundColor: '#FF3B30',
    width: getResponsiveSize(normalize(16), normalize(20), normalize(22), normalize(24)),
    height: getResponsiveSize(normalize(16), normalize(20), normalize(22), normalize(24)),
    borderRadius: getResponsiveSize(normalize(8), normalize(10), normalize(11), normalize(12)),
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBadgeText: {
    color: 'white',
    fontSize: getResponsiveSize(normalize(10), normalize(12), normalize(13), normalize(14)),
    fontWeight: 'bold',
  },
});

export default ControlPanel;