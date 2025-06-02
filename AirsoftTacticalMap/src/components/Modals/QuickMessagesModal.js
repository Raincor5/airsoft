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

const { width } = Dimensions.get('window');

// Responsive scaling
const scale = width / 375;
const normalize = (size) => Math.round(scale * size);

const QuickMessagesModal = ({ visible, messages, onSendMessage, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Quick Messages</Text>
          <ScrollView style={styles.messagesList}>
            {messages.map(message => (
              <TouchableOpacity
                key={message.id}
                style={[styles.messageButton, { backgroundColor: message.color }]}
                onPress={() => onSendMessage(message)}
              >
                <Text style={styles.messageText}>{message.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  modalTitle: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  messagesList: {
    maxHeight: normalize(300),
  },
  messageButton: {
    paddingVertical: normalize(15),
    paddingHorizontal: normalize(20),
    borderRadius: normalize(10),
    marginVertical: normalize(5),
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: normalize(16),
    fontWeight: '600',
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

export default QuickMessagesModal;