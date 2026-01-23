import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { auth } from '../firebaseConfig';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import React from 'react';

const { ShakeModule } = NativeModules;

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  // 🔔 Native → JS bridge (widget + shake events)
  useEffect(() => {
    if (!ShakeModule) {
      console.warn('ShakeModule not available');
      return;
    }

    const emitter = new NativeEventEmitter(ShakeModule);

    const sub = emitter.addListener('ShakeDetected', (event) => {
      console.log('NATIVE:', event?.message);

      if (event?.message?.includes('Widget clicked')) {
        router.replace('/(tabs)/dashboard');
      }
    });

    // Start native shake detection service
    ShakeModule.startService();

    return () => {
      sub.remove();
    };
  }, []);

  // 🔐 Firebase auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, []);

  // ⏳ Loading screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.loadingText}>Loading SafeCircle...</Text>
        </Animated.View>
      </View>
    );
  }

  // 🔐 Not authenticated → go to login
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  // ✅ Authenticated → go to dashboard
  return <Redirect href="/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
  },
  testContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  testText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#d32f2f',
  },
  subText: {
    marginTop: 10,
    fontSize: 16,
    color: '#444',
  },
});
