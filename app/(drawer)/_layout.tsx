// app/(drawer)/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { auth } from '../../firebaseConfig';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { StyledText } from '../../components/StyledText';

export default function DrawerLayout() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/phone');
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerStyle: { backgroundColor: '#d32f2f' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} onSignOut={handleSignOut} user={user} />}
      >
        <Drawer.Screen name="dashboard" options={{ title: 'Home' }} />
        <Drawer.Screen name="circle" options={{ title: 'My Circle' }} />
        <Drawer.Screen name="sosrecords" options={{ title: 'My Records' }} />
        <Drawer.Screen name="live-location" options={{ title: 'Live Location' }} />
        <Drawer.Screen name="premium" options={{ title: 'Premium' }} />
        <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

// ✅ FIXED CustomDrawerContent
function CustomDrawerContent({
  navigation,
  state,
  onSignOut,
  user
}: any) {
  // Get route names and titles from state.routes
  const routes = state.routes.map((route: any, index: number) => {
    // Get the title from options or use route name
    const routeName = route.name;
    let title = routeName;
    
    // Map route names to display titles
    const titleMap: any = {
      'dashboard': 'Home',
      'circle': 'My Circle',
      'sosrecords': 'My Records',
      'live-location': 'Live Location',
      'premium': 'Premium',
      'settings': 'Settings'
    };
    
    if (titleMap[routeName]) {
      title = titleMap[routeName];
    }

    return {
      key: route.key,
      name: routeName,
      title: title,
      focused: index === state.index,
    };
  });

  return (
    <View style={styles.drawerContainer}>
      {/* User Profile Section */}
      {user && (
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.displayName || user.email?.split('@')[0] || 'User'}
            </Text>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>Premium Account</Text>
            </View>
          </View>
          <Text style={styles.userLocation}>Libala Stage 3, Lusaka</Text>
        </View>
      )}

      {/* Drawer Items */}
      <View style={styles.drawerItems}>
        {routes.map((route) => (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              navigation.navigate(route.name);
            }}
            style={[
              styles.drawerItem,
              route.focused && styles.drawerItemActive
            ]}
          >
            <Text style={[
              styles.drawerItemText,
              route.focused && styles.drawerItemTextActive
            ]}>
              {route.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onSignOut}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
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