// app/_layout.tsx
import { Stack } from 'expo-router';
import { ProfileProvider } from './contexts/ProfileContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSubscriptionChecker } from '../hooks/useSubscriptionChecker';
import React from 'react';


function AppContent() {
  // Auto-check and expire subscriptions
  useSubscriptionChecker();

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/phone" options={{ headerShown: false }} />
      <Stack.Screen name="auth/otp" options={{ headerShown: false }} />
      <Stack.Screen name="responder/dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="responder/r-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register-responder" options={{ title: 'Register Responder' }} />

      {/* Profile related screens */}
      <Stack.Screen name="components/settings" options={{ headerShown: false }} />
      <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
      <Stack.Screen name="components/sosrecords" options={{ headerShown: false }} />
      <Stack.Screen name="components/premium" options={{ headerShown: false }} />
      <Stack.Screen name="components/notification" options={{ headerShown: false }} />
      <Stack.Screen name="components/privacy" options={{ headerShown: false }} />
      <Stack.Screen name="components/invite" options={{ headerShown: false }} />
      <Stack.Screen name="components/change-picture" options={{ headerShown: false }} />
      

      <Stack.Screen name="responder/map/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="responder/map" options={{ headerShown: false }} />
      <Stack.Screen name="responder/circle" options={{ headerShown: false }} />
      
      {/* Payment screen */}
      <Stack.Screen name="components/PaymentGateway" options={{ headerShown: false }} />
      
      {/* Location screen */}
      <Stack.Screen name="components/live-location" options={{ headerShown: false }} />
      
      {/* Recording screen */}
      <Stack.Screen 
        name="(tabs)/record" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal' 
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    
    <SafeAreaProvider>
      <ProfileProvider>
        <AppContent />
      </ProfileProvider>
    </SafeAreaProvider>
    
  );
}