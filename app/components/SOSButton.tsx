// components/SOSButton.tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentLocation } from '../utils/location';
import { addSOS } from '../utils/db';
import { auth } from '../../firebaseConfig';
import Toast from 'react-native-toast-message';

export default function SOSButton({ onSOSTriggered }: { onSOSTriggered: () => void }) {
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(3);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (counting && count > 0) {
      timer = setTimeout(() => setCount(count - 1), 1000);
    } else if (count === 0) {
      triggerSOS();
      setCounting(false);
    }
    return () => clearTimeout(timer);
  }, [counting, count]);

  const startCountdown = () => {
    setCounting(true);
    setCount(3);
  };

  const cancelSOS = () => {
    setCounting(false);
    Toast.show({ type: 'info', text1: 'SOS Cancelled' });
  };

  const triggerSOS = async () => {
    Toast.show({ type: 'success', text1: 'Sending SOS...' });

    const rawLocation = await getCurrentLocation();

    // Normalize location object to match SOSPayload
    const location = rawLocation
      ? {
          lat: rawLocation.lat,
          lng: rawLocation.lng,
          accuracy: rawLocation.accuracy, // now allowed to be null per type
        }
      : { lat: 0, lng: 0 };

    if (!rawLocation) {
      Alert.alert("Warning", "Location unavailable. SOS sent without location.");
    }

    const sosPayload = {
      id: uuidv4(),
      userId: auth.currentUser?.uid || 'anonymous',
      createdAt: new Date().toISOString(),
      location,
      status: 'queued' as const,
      retryCount: 0
    };

    await addSOS(sosPayload);
    onSOSTriggered();
    Toast.show({ type: 'success', text1: 'SOS Queued Locally' });
  };

  if (counting) {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
        <Text style={{ fontSize: 64, color: 'white', fontWeight: 'bold' }}>{count}</Text>
        <TouchableOpacity onPress={cancelSOS} style={{ marginTop: 20, padding: 10, backgroundColor: 'red', borderRadius: 5 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={startCountdown}
      style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 40,
        right: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      }}
    >
      <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>SOS</Text>
    </TouchableOpacity>
  );
}