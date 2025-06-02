import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, radius, spacing, normalize, isSmallScreen, getResponsiveSize } from '../../utils/styles';

const TeamIndicator = ({ team, onPress, style }) => {
  if (!team) return null;
  
  const containerStyle = {
    backgroundColor: team.color || colors.primary,
    ...(style || {})
  };
  
  if (onPress) {
    return (
      <TouchableOpacity 
        style={[styles.container, containerStyle]}
        onPress={onPress}
      >
        <Text style={styles.teamText}>
          {team.name || 'Team'}
        </Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.teamText}>
        {team.name || 'Team'}
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
    right: normalize(20),
    paddingHorizontal: isSmallScreen ? spacing.small.md : spacing.md,
    paddingVertical: isSmallScreen ? spacing.small.sm : spacing.sm,
    borderRadius: isSmallScreen ? radius.small.lg : radius.lg,
    alignSelf: 'flex-start',
    zIndex: 1000,
  },
  teamText: {
    color: colors.text.primary,
    fontSize: getResponsiveSize(normalize(12), normalize(14), normalize(15), normalize(16)),
    fontWeight: '600',
  },
});

export default TeamIndicator;
