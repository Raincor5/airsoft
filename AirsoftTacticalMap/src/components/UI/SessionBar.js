import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Icons } from '../Icons/index';
import { normalize, isSmallScreen, getResponsiveSize } from '../../utils/styles';

const SessionBar = ({ sessionCode, playerCount, onPress }) => {
  if (!sessionCode) return null;
  
  const iconSize = getResponsiveSize(14, 16, 18, 20);
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.sessionCode}>
        {isSmallScreen ? sessionCode : `Session: ${sessionCode}`}
        {playerCount !== undefined ? ` (${playerCount})` : ''}
      </Text>
      <Icons.Share size={iconSize} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' 
      ? getResponsiveSize(normalize(15), normalize(20), normalize(25), normalize(30)) 
      : getResponsiveSize(normalize(30), normalize(40), normalize(45), normalize(50)),
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? normalize(15) : normalize(20),
    paddingVertical: isSmallScreen ? normalize(8) : normalize(10),
    borderRadius: normalize(20),
    zIndex: 1000,
  },
  sessionCode: {
    color: 'white',
    fontSize: getResponsiveSize(normalize(14), normalize(16), normalize(17), normalize(18)),
    fontWeight: 'bold',
    marginRight: isSmallScreen ? normalize(8) : normalize(10),
  },
});

export default SessionBar;
