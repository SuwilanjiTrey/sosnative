// app/index.tsx
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.loadingText}>Loading SafeCircle...</Text>
        </Animated.View>
      </View>
    );
  }

  // If not authenticated, redirect to phone auth
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  // If authenticated, redirect to dashboard
  return <Redirect href="/(drawer)/dashboard" />;
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
});