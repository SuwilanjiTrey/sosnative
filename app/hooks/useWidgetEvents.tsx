// app/hooks/useWidgetEvents.ts
import { useEffect } from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';

export const useWidgetEvents = (
  onSOSPressed: () => void,
  onCompassPressed: () => void
) => {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Listen for SOS button press from widget
    const sosSubscription = DeviceEventEmitter.addListener(
      'onWidgetSOSPressed',
      () => {
        console.log('[Widget] SOS button pressed from widget');
        onSOSPressed();
      }
    );

    // Listen for compass press from widget
    const compassSubscription = DeviceEventEmitter.addListener(
      'onWidgetCompassPressed',
      () => {
        console.log('[Widget] Compass pressed from widget');
        onCompassPressed();
      }
    );

    return () => {
      sosSubscription.remove();
      compassSubscription.remove();
    };
  }, [onSOSPressed, onCompassPressed]);
};

// Usage example in your main dashboard or root component:
/*
import { useWidgetEvents } from './hooks/useWidgetEvents';
import { useRouter } from 'expo-router';

function YourComponent() {
  const router = useRouter();
  
  useWidgetEvents(
    // Handle SOS press
    () => {
      // Trigger your SOS logic
      // This is the same logic from your SOSButton component
      console.log('SOS triggered from widget!');
      // You can call your sendSOSAlert function here
    },
    // Handle compass press
    () => {
      // Navigate to compass or live location screen
      router.push('/components/live-location');
    }
  );
  
  return (
    // Your component JSX
  );
}
*/