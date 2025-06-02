import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  Alert,
  Dimensions,
  Clipboard
} from 'react-native';
import { Icons } from '../Icons/index';

const { width } = Dimensions.get('window');

// Responsive scaling
const scale = width / 375;
const normalize = (size) => Math.round(scale * size);

const SessionInfoModal = ({ visible, sessionCode, playerCount, onClose }) => {
  
  const shareSessionCode = () => {
    Clipboard.setString(sessionCode);
    Alert.alert('Code Copied', `Share this code with other players: ${sessionCode}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Session Info</Text>
          <View style={styles.sessionInfoBox}>
            <Text style={styles.sessionInfoLabel}>Session Code:</Text>
            <Text style={styles.sessionInfoCode}>{sessionCode}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={shareSessionCode}
            >
              <Icons.Copy size={20} color="white" />
              <Text style={styles.copyButtonText}>Share Code</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sessionInfoPlayers}>
            Players: {playerCount}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
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
  },
  modalTitle: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  sessionInfoBox: {
    backgroundColor: '#333',
    borderRadius: normalize(10),
    padding: normalize(20),
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  sessionInfoLabel: {
    color: '#999',
    fontSize: normalize(14),
    marginBottom: normalize(10),
  },
  sessionInfoCode: {
    color: 'white',
    fontSize: normalize(32),
    fontWeight: 'bold',
    letterSpacing: 5,
    marginBottom: normalize(15),
  },
  sessionInfoPlayers: {
    color: '#999',
    fontSize: normalize(16),
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  copyButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(20),
    borderRadius: normalize(10),
  },
  copyButtonText: {
    color: 'white',
    fontSize: normalize(14),
    fontWeight: '600',
    marginLeft: normalize(8),
  },
  closeButton: {
    backgroundColor: '#666',
    paddingVertical: normalize(12),
    borderRadius: normalize(10),
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
  },
});

export default SessionInfoModal;
