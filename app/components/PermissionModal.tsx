// components/PermissionModal.tsx
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export default function PermissionModal({ visible, onGranted }: { visible: boolean; onGranted: () => void }) {
  const requestPermissions = async () => {
    // Location
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      alert('Location needed for SOS alerts');
    }

    // Notifications
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    if (notifStatus !== 'granted') {
      alert('Notifications needed for acknowledgements');
    }

    onGranted();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Image
            source={require('../../assets/images/react-logo.png')} // 👈 Optional: add permission icon
            style={styles.permissionIcon}
          />
          <Text style={styles.title}>Permissions Required</Text>
          <Text style={styles.message}>
            Allow SafeCircle to access your location and send notifications for emergency alerts.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onGranted} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={requestPermissions} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  permissionIcon: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});