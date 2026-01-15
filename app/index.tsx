/*

import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { auth } from '../firebaseConfig';
import { View, Text, StyleSheet, Animated, NativeModules } from 'react-native';
import React from 'react';

const { ShakeModule } = NativeModules;

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🔥 Start native shake detection service
    if (ShakeModule?.startService) {
      ShakeModule.startService();
    } else {
      console.warn('ShakeModule not linked correctly');
    }

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

  // return <Redirect href="/(tabs)/dashboard"> redirect to dashboard
  // ✅ Authenticated → show test screen (instead of redirecting for now)
  return (
    <View style={styles.testContainer}>
      <Text style={styles.testText}>Welcome to SafeCircle 🚨</Text>
      <Text style={styles.subText}>Shake your phone to test detection.</Text>
    </View>
  );
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
*/

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, NativeModules, Platform, ScrollView, NativeEventEmitter } from 'react-native';

const { ShakeModule } = NativeModules;

export default function DebugIndex() {
  const [logs, setLogs] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [debugMessage, setDebugMessage] = useState('');


  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [msg, ...prev]); // newest on top
  };

  useEffect(() => {
    addLog(`Platform: ${Platform.OS}`);
    addLog(`NativeModules keys: ${Object.keys(NativeModules).join(', ')}`);

    // Check if ShakeModule exists
    if (ShakeModule?.startService) {
      addLog("✅ ShakeModule is linked!");
      try {
        ShakeModule.startService();
        addLog("✅ Shake service started successfully");
      } catch (err) {
        addLog(`❌ Error starting shake service: ${(err as any).message}`);
      }
    } else {
      addLog("❌ ShakeModule not linked correctly");
    }

    // Fade in debug UI
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);


  useEffect(() => {
    const shakeEmitter = new NativeEventEmitter(ShakeModule);
  
    const subscription = shakeEmitter.addListener('ShakeDetected', (event: { message: any; }) => {
      console.log('🔔 JS Event:', event.message);
      setDebugMessage(event.message); // optional state to show in UI
    });
  
    return () => subscription.remove();
  }, []);
  
  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <Text style={styles.header}>SafeCircle Debug Dashboard</Text>
        <Text style={{ marginTop: 10, color: 'blue' }}>
          {debugMessage || 'Shake logs will appear here...'}
        </Text>
        <Text style={styles.subHeader}>Shake feature status:</Text>
        <ScrollView style={styles.logContainer}>
          {logs.map((log, idx) => (
            <Text key={idx} style={styles.logText}>{log}</Text>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { fontSize: 22, fontWeight: '700', color: '#d32f2f', marginBottom: 10 },
  subHeader: { fontSize: 16, fontWeight: '500', marginBottom: 10 },
  logContainer: { flex: 1, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8 },
  logText: { fontSize: 14, fontFamily: 'monospace', marginBottom: 5 },
});




