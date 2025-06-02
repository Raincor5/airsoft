import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  FlatList,
  Dimensions
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling
const scale = width / 375;
const normalize = (size) => Math.round(scale * size);

const ChatModal = ({ visible, messages, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: height * 0.8 }]}>
          <Text style={styles.modalTitle}>Team Chat</Text>
          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.chatMessage}>
                <Text style={styles.chatSender}>{item.senderName}:</Text>
                <Text style={styles.chatText}>{item.message}</Text>
                <Text style={styles.chatTime}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}
            style={styles.chatList}
            inverted
          />
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
  chatList: {
    maxHeight: normalize(300),
    marginBottom: normalize(10),
  },
  chatMessage: {
    backgroundColor: '#333',
    padding: normalize(10),
    borderRadius: normalize(10),
    marginVertical: normalize(5),
  },
  chatSender: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: normalize(2),
    fontSize: normalize(14),
  },
  chatText: {
    color: 'white',
    fontSize: normalize(14),
  },
  chatTime: {
    color: '#666',
    fontSize: normalize(11),
    marginTop: normalize(2),
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

export default ChatModal; 