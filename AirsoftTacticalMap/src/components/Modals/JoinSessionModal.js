import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator 
} from 'react-native';
import { 
  colors, 
  components, 
  typography, 
  normalize, 
  spacing,
  isSmallScreen 
} from '../../utils/styles';

const JoinSessionModal = ({ 
  visible, 
  onJoin, 
  onCancel, 
  isLoading = false, 
  error = null 
}) => {
  const [sessionCode, setSessionCode] = useState('');
  
  const handleJoin = () => {
    if (sessionCode.trim().length < 4) return;
    onJoin(sessionCode.trim().toUpperCase());
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={components.modalOverlay}
        >
          <View style={[components.modalContainer, styles.container]}>
            <Text style={components.modalTitle}>Join Session</Text>
            
            <Text style={styles.label}>Enter Session Code</Text>
            <TextInput
              style={[components.input, styles.input]}
              placeholder="Enter 6-digit code"
              placeholderTextColor={colors.text.muted}
              value={sessionCode}
              onChangeText={(text) => setSessionCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[components.button, styles.cancelButton]} 
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={components.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[components.button, styles.joinButton]} 
                onPress={handleJoin}
                disabled={isLoading || sessionCode.trim().length < 4}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} size="small" />
                ) : (
                  <Text style={components.buttonText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '85%',
    maxWidth: normalize(350),
  },
  label: {
    ...typography.body,
    marginBottom: isSmallScreen ? spacing.small.xs : spacing.xs,
  },
  input: {
    textAlign: 'center',
    letterSpacing: normalize(2),
    fontSize: isSmallScreen ? normalize(18) : normalize(24),
    marginBottom: isSmallScreen ? spacing.small.md : spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: normalize(14),
    marginBottom: isSmallScreen ? spacing.small.md : spacing.md,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: isSmallScreen ? spacing.small.md : spacing.md,
  },
  cancelButton: {
    flex: 1,
    marginRight: isSmallScreen ? spacing.small.xs : spacing.xs,
    backgroundColor: 'rgba(100, 100, 100, 0.8)',
  },
  joinButton: {
    flex: 1,
    marginLeft: isSmallScreen ? spacing.small.xs : spacing.xs,
  },
});

export default JoinSessionModal;
