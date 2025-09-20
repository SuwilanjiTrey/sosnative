// components/PermissionModal.tsx
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export default function PermissionModal({ visible, onGranted }: { visible: boolean; onGranted: () => void }) {
  const requestPermissions = async () => {
    // Location
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      Alert.alert("Location needed", "App needs location to send SOS with your position.");
      return;
    }

    // Optional: Background location (Android only for MVP)
    if (Platform.OS === 'android') {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        Alert.alert("Background location helpful", "For better accuracy during emergencies.");
      }
    }

    // Notifications
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    if (notifStatus !== 'granted') {
      Alert.alert("Notifications needed", "To receive acknowledgements from your Circle.");
    }

    onGranted();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Permissions Required</Text>
          <Text>We need access to:</Text>
          <Text>📍 Location — to attach to your SOS</Text>
          <Text>🔔 Notifications — to receive acknowledgements</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <TouchableOpacity onPress={onGranted} style={{ padding: 10, backgroundColor: '#ccc', borderRadius: 5, flex: 1, marginRight: 5, alignItems: 'center' }}>
              <Text>Skip for Now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={requestPermissions} style={{ padding: 10, backgroundColor: 'green', borderRadius: 5, flex: 1, marginLeft: 5, alignItems: 'center' }}>
              <Text style={{ color: 'white' }}>Allow All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}