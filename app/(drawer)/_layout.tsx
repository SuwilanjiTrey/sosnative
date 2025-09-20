// app/(drawer)/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text } from 'react-native';
import { auth } from '../../firebaseConfig';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function DrawerLayout() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/auth/login');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: '#d32f2f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="circle" options={{ title: 'My Circle' }} />
      <Drawer.Screen name="sosrecords" options={{ title: 'SOS History' }} />
      <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
      <Drawer.Screen name="premium" options={{ title: 'Premium' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  </GestureHandlerRootView>
  );
}