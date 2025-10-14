// app/_layout.tsx
import { Stack } from 'expo-router';
import { ProfileProvider } from './contexts/ProfileContext';

export default function RootLayout() {
  return (
    <ProfileProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
        <Stack.Screen name="auth/register" options={{ title: 'Register' }} />
        
        {/* Profile related screens */}
        <Stack.Screen name="components/settings" options={{ headerShown: false }} />
        <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
        <Stack.Screen name="components/sosrecords" options={{ headerShown: false }} />
        <Stack.Screen name="components/premium" options={{ headerShown: false }} />
        <Stack.Screen name="components/notification" options={{ headerShown: false }} />
        <Stack.Screen name="components/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="components/invite" options={{ headerShown: false }} />
        <Stack.Screen name="components/change-picture" options={{ headerShown: false }} />
        
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
    </ProfileProvider>
  );
}