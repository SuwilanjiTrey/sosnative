// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { auth } from '@/firebaseConfig';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <-- Import this

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export default function TabsLayout() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets(); // <-- Get the safe area insets

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#d32f2f',
        tabBarInactiveTintColor: '#999',
        tabBarShowLabel: false,
        // --- Update the tabBarStyle ---
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          // Set the height to a base value plus the bottom inset
          height: 60 + insets.bottom, 
          // Add padding to the bottom equal to the safe area inset
          paddingBottom: insets.bottom, 
          // Adjust other padding for a better look
          paddingTop: 10, 
          paddingHorizontal: 5,
        },
      }}
    >
      <Tabs.Screen 
        name="dashboard" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={28} color={color} />
          ),
        }} 
      />
    
      <Tabs.Screen 
        name="circle" 
        options={{ 
          title: 'Circle',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={28} color={color} />
          ),
        }} 
      />

      <Tabs.Screen 
        name="record" 
        options={{ 
          title: 'Records',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "radio-button-on" : "radio-button-off"} size={28} color={color} />
          ),
        }} 
      />
      
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={28} color={color} />
          ),
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  userSection: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  premiumBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  premiumText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '600',
  },
  userLocation: {
    color: '#666',
    fontSize: 14,
  },
  drawerItems: {
    flex: 1,
  },
  drawerItem: {
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  drawerItemActive: {
    backgroundColor: '#ffebee',
  },
  drawerItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  drawerItemTextActive: {
    color: '#d32f2f',
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#d32f2f',
    fontWeight: '600',
    fontSize: 16,
  },
});