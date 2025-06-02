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

const TeamManagerModal = ({ visible, teams, players, onAssignTeam, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Team Management</Text>
          <ScrollView style={styles.teamsList}>
            {Object.entries(teams).map(([teamId, team]) => (
              <View key={teamId} style={styles.teamSection}>
                <Text style={[styles.teamName, { color: team.color }]}>
                  {team.name || teamId.replace('team_', '').toUpperCase()} 
                  ({Object.values(players).filter(p => p.teamId === teamId).length})
                </Text>
                <View style={styles.teamPlayers}>
                  {Object.entries(players).map(([playerId, player]) => (
                    <TouchableOpacity
                      key={playerId}
                      style={[
                        styles.playerItem,
                        player.teamId === teamId && styles.playerInTeam
                      ]}
                      onPress={() => onAssignTeam(playerId, teamId)}
                    >
                      <View 
                        style={[styles.playerDot, { backgroundColor: player.color }]} 
                      />
                      <Text style={styles.playerItemText}>{player.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  modalTitle: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  teamsList: {
    maxHeight: normalize(400),
  },
  teamSection: {
    paddingVertical: normalize(10),
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  teamName: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    marginBottom: normalize(10),
  },
  teamPlayers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  playerItem: {
    backgroundColor: '#333',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(6),
    borderRadius: normalize(15),
    margin: normalize(4),
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerInTeam: {
    backgroundColor: '#007AFF',
  },
  playerDot: {
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
    marginRight: normalize(6),
  },
  playerItemText: {
    color: 'white',
    fontSize: normalize(12),
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

export default TeamManagerModal;
