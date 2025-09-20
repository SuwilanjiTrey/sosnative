// app/(drawer)/profile.tsx
import { Image, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { user, loading } = useAuth();

  if (loading) return <Text style={{ padding: 20, textAlign: 'center' }}>Loading...</Text>;
  if (!user) return <Text style={{ padding: 20, textAlign: 'center' }}>Not signed in</Text>;

  return (
    <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={{ uri: user.photoURL || 'https://via.placeholder.com/100' }}
        style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 20 }}
      />
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        {user.displayName || user.email}
      </Text>
      <Text style={{ marginVertical: 10 }}>{user.email}</Text>
      <Text style={{ color: '#888', fontSize: 12 }}>User ID: {user.uid}</Text>
    </View>
  );
}