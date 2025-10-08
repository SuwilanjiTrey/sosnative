// components/SOSButton.tsx
import { View, Text, TouchableOpacity, Alert, Animated, Easing, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { getCurrentLocation } from '../utils/location';
import { addSOS } from '../utils/db';
import { auth } from '../../firebaseConfig';
import Toast from 'react-native-toast-message';

function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function SOSButton({ onSOSTriggered }: { onSOSTriggered: () => void }) {
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(3);
  const [ripples, setRipples] = useState<{id: number, progress: Animated.Value}[]>([]);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rippleId = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (counting && count > 0) {
      timer = setTimeout(() => setCount(count - 1), 1000);
    } else if (count === 0) {
      triggerSOS();
      setCounting(false);
    }
    return () => clearTimeout(timer);
  }, [counting, count]);

  // Setup infinite pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  // Create ripples continuously
  useEffect(() => {
    if (!counting) {
      const rippleInterval = setInterval(() => {
        createRipple();
      }, 2000);
      
      return () => clearInterval(rippleInterval);
    }
  }, [counting]);

  const startCountdown = () => {
    setCounting(true);
    setCount(3);
  };

  const createRipple = () => {
    const id = rippleId.current++;
    const progress = new Animated.Value(0);
    
    setRipples(prev => [...prev, { id, progress }]);
    
    // Animate the ripple
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Remove ripple when animation completes
      setRipples(prev => prev.filter(r => r.id !== id));
    });
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
          accuracy: rawLocation.accuracy ?? undefined, // Convert null to undefined
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
      <View style={styles.countdownOverlay as StyleProp<ViewStyle>}>
        <Text style={styles.countdownText as StyleProp<TextStyle>}>{count}</Text>
        <TouchableOpacity onPress={cancelSOS} style={styles.cancelButton as StyleProp<ViewStyle>}>
          <Text style={styles.cancelButtonText as StyleProp<TextStyle>}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.buttonContainer as StyleProp<ViewStyle>}>
      {/* Continuous ripples */}
      {ripples.map(ripple => (
        <Animated.View
          key={ripple.id}
          style={[
            styles.ripple as StyleProp<ViewStyle>,
            {
              transform: [
                {
                  scale: ripple.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 2.5],
                  }),
                },
              ],
              opacity: ripple.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 0],
              }),
            },
          ]}
        />
      ))}
      
      {/* Pulsing SOS button */}
      <Animated.View
        style={[
          styles.pulseRing as StyleProp<ViewStyle>,
          {
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.2],
                }),
              },
            ],
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.7, 0],
            }),
          },
        ]}
      />
      
      <TouchableOpacity
        onPress={startCountdown}
        style={styles.button as StyleProp<ViewStyle>}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText as StyleProp<TextStyle>}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  buttonContainer: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Position 3/4 below the Emergency Circle section
    top: '45%', // Adjust this value as needed
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  ripple: {
    position: 'absolute' as const,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 1,
  },
  pulseRing: {
    position: 'absolute' as const,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 0,
  },
  countdownOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  countdownText: {
    fontSize: 64,
    color: 'white',
    fontWeight: 'bold' as const,
  },
  cancelButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'red',
    borderRadius: 5,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold' as const,
  },
};