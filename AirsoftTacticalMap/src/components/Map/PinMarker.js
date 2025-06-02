import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Icons } from '../Icons/index';
import { PIN_TYPES } from '../../utils/constants';
import { normalize } from '../../utils/helpers';

// Map pin icons based on type
const getPinIcon = (type) => {
  switch (type) {
    case 'enemy':
      return Icons.Target;
    case 'trap':
      return Icons.AlertTriangle;
    case 'suspect':
      return Icons.Eye;
    case 'flag':
      return Icons.Flag;
    case 'cover':
      return Icons.Shield;
    case 'sniper':
      return Icons.Zap;
    default:
      return Icons.MapPin;
  }
};

const PinMarker = ({ pin, onPress }) => {
  if (!pin || !pin.coordinate) return null;
  
  // Find pin type details
  const pinType = PIN_TYPES.find(p => p.id === pin.type) || {
    id: 'default',
    name: 'Map Pin',
    color: '#FFFFFF'
  };
  
  // Get icon component
  const IconComponent = getPinIcon(pin.type);
  
  return (
    <Marker
      coordinate={pin.coordinate}
      title={pin.name || pinType.name}
      description={pin.description || `Added by ${pin.playerId}`}
      onPress={onPress}
    >
      <View style={[styles.pinMarker, { backgroundColor: pinType.color }]}>
        <IconComponent size={16} color="white" />
      </View>
      {pin.label && (
        <View style={styles.pinLabelContainer}>
          <Text style={styles.pinLabel}>{pin.label}</Text>
        </View>
      )}
    </Marker>
  );
};

const styles = StyleSheet.create({
  pinMarker: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  pinLabelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: normalize(6),
    paddingVertical: normalize(2),
    borderRadius: normalize(10),
    marginTop: normalize(5),
  },
  pinLabel: {
    color: 'white',
    fontSize: normalize(12),
    fontWeight: '500',
  },
});

export default PinMarker;
