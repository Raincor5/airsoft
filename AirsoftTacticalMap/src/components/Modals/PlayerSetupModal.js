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
} from 'react-native';
import { 
  colors, 
  components, 
  typography, 
  normalize, 
  spacing, 
  radius,
  isSmallScreen,
  getResponsiveSize
} from '../../utils/styles';

const teamColors = [
  { name: 'Red', value: colors.teams.red },
  { name: 'Blue', value: colors.teams.blue },
  { name: 'Green', value: colors.teams.green },
  { name: 'Yellow', value: colors.teams.yellow },
];

const PlayerSetupModal = ({ visible, onSubmit, onCancel, initialData = {} }) => {
  const [playerName, setPlayerName] = useState(initialData.name || '');
  const [selectedColor, setSelectedColor] = useState(initialData.color || teamColors[0].value);
  
  const handleSubmit = () => {
    if (!playerName.trim()) return;
    
    onSubmit({
      name: playerName.trim(),
      color: selectedColor,
    });
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
          <View style={[components.modalContainer, styles.modalContainer]}>
            <Text style={components.modalTitle}>Player Setup</Text>
            
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={[components.input, styles.input]}
              placeholder="Enter your name"
              placeholderTextColor={colors.text.muted}
              value={playerName}
              onChangeText={setPlayerName}
              autoCapitalize="words"
              maxLength={15}
            />
            
            <Text style={styles.label}>Your Team Color</Text>
            <View style={styles.colorContainer}>
              {teamColors.map((team) => (
                <TouchableOpacity
                  key={team.name}
                  style={[
                    styles.colorOption,
                    { backgroundColor: team.value },
                    selectedColor === team.value && styles.selectedColor
                  ]}
                  onPress={() => setSelectedColor(team.value)}
                />
              ))}
            </View>
            
            <View style={styles.buttonRow}>
              {onCancel && (
                <TouchableOpacity 
                  style={[components.button, styles.cancelButton]} 
                  onPress={onCancel}
                >
                  <Text style={components.buttonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[
                  components.button, 
                  styles.submitButton,
                  onCancel && { marginLeft: isSmallScreen ? spacing.small.xs : spacing.xs }
                ]} 
                onPress={handleSubmit}
              >
                <Text style={components.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    width: '85%',
    maxWidth: normalize(350),
  },
  label: {
    ...typography.body,
    marginBottom: isSmallScreen ? spacing.small.xs : spacing.xs,
  },
  input: {
    marginBottom: isSmallScreen ? spacing.small.md : spacing.md,
  },
  colorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: isSmallScreen ? spacing.small.lg : spacing.lg,
  },
  colorOption: {
    width: getResponsiveSize(normalize(35), normalize(40), normalize(45), normalize(50)),
    height: getResponsiveSize(normalize(35), normalize(40), normalize(45), normalize(50)),
    borderRadius: getResponsiveSize(normalize(20), normalize(20), normalize(22.5), normalize(25)),
    margin: isSmallScreen ? spacing.small.xs : spacing.xs,
  },
  selectedColor: {
    borderWidth: isSmallScreen ? 2 : 3,
    borderColor: colors.text.primary,
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
  submitButton: {
    flex: 1,
    marginLeft: 0,
  },
});

export default PlayerSetupModal;
