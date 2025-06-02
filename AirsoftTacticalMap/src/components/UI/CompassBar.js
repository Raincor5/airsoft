import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Icons } from '../Icons/index';
import { getCardinalDirection } from '../../utils/helpers';
import { normalize, isSmallScreen, getResponsiveSize } from '../../utils/styles';

const CompassBar = ({ heading }) => {
  // Ensure heading is a number and within 0-360 range
  const safeHeading = (typeof heading === 'number') 
    ? ((heading % 360) + 360) % 360 
    : 0;
  
  // Get cardinal direction (N, NE, E, etc.)
  const direction = getCardinalDirection(safeHeading);
  
  // Determine icon size based on screen size
  const iconSize = getResponsiveSize(16, 20, 22, 24);
  
  return (
    <View style={styles.container}>
      <Icons.Compass size={iconSize} color="white" />
      <Text style={styles.compassText}>
        {Math.round(safeHeading)}° {direction}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' 
      ? getResponsiveSize(normalize(60), normalize(80), normalize(85), normalize(90)) 
      : getResponsiveSize(normalize(80), normalize(100), normalize(105), normalize(110)),
    left: normalize(20),
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? normalize(10) : normalize(15),
    paddingVertical: isSmallScreen ? normalize(6) : normalize(8),
    borderRadius: normalize(20),
  },
  compassText: {
    color: 'white',
    fontSize: getResponsiveSize(normalize(12), normalize(14), normalize(15), normalize(16)),
    fontWeight: '600',
    marginLeft: isSmallScreen ? normalize(6) : normalize(8),
  },
});

export default CompassBar;
