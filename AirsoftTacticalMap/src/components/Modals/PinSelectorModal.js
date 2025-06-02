import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  ScrollView,
  Dimensions
} from 'react-native';
import { Icons } from '../Icons/index';

const { width } = Dimensions.get('window');

// Responsive scaling
const scale = width / 375;
const normalize = (size) => Math.round(scale * size);

// Map pin icons based on type
const getPinIcon = (type) => {
  switch (type) {
    case 'enemy':
      return <Icons.Target size={20} color="white" />;
    case 'trap':
      return <Icons.AlertTriangle size={20} color="white" />;
    case 'suspect':
      return <Icons.Eye size={20} color="white" />;
    case 'flag':
      return <Icons.Flag size={20} color="white" />;
    case 'cover':
      return <Icons.Shield size={20} color="white" />;
    case 'sniper':
      return <Icons.Zap size={20} color="white" />;
    default:
      return <Icons.MapPin size={20} color="white" />;
  }
};

const PinSelectorModal = ({ visible, pinTypes, onSelectPin, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Pin</Text>
          <ScrollView style={styles.pinsList}>
            {pinTypes.map(pinType => (
              <TouchableOpacity
                key={pinType.id}
                style={[styles.pinButton, { backgroundColor: pinType.color }]}
                onPress={() => onSelectPin(pinType)}
              >
                {getPinIcon(pinType.id)}
                <Text style={styles.pinText}>{pinType.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: normalize(15),
    padding: normalize(20),
    width: Math.min(width * 0.85, normalize(400)),
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  modalTitle: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  pinsList: {
    maxHeight: normalize(300),
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(15),
    paddingHorizontal: normalize(20),
    borderRadius: normalize(10),
    marginVertical: normalize(5),
  },
  pinText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
    marginLeft: normalize(12),
  },
  closeButton: {
    backgroundColor: '#666',
    paddingVertical: normalize(12),
    borderRadius: normalize(10),
    alignItems: 'center',
    marginTop: normalize(20),
  },
  closeButtonText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
  },
});

export default PinSelectorModal;
